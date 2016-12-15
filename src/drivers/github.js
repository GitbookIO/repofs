const Q = require('q');
const { Record, List, Map } = require('immutable');
const axios = require('axios');
const urlJoin = require('urljoin.js');

const gravatar = require('../utils/gravatar');
const base64 = require('../utils/base64');
const Driver = require('./driver');
const ERRORS = require('../constants/errors');

const Blob = require('../models/blob');
const Branch = require('../models/branch');
const Commit = require('../models/commit');
const Author = require('../models/author');
const TreeEntry = require('../models/treeEntry');
const WorkingState = require('../models/workingState');
const LocalFile = require('../models/localFile');
const Reference = require('../models/reference');

/**
 * Options for the GitHub Driver
 */
const DEFAULTS = {
    // String: ID of the GitHub repository (ex: me/myrepo")
    repository: null,

    // API endpoint
    host: 'https://api.github.com',

    // Endpoint for RAW content
    rawhost: 'https://raw.githubusercontent.com',

    // Authentication for the API
    username: null,
    token: null,

    // Include auth token in raw url?
    includeTokenInRaw: false
};

class GitHubOptions extends Record(DEFAULTS) {}

// Driver for GitHub APIs and uHub
class GitHubDriver extends Driver {
    constructor(options) {
        super();
        this.options = new GitHubOptions(options);
    }

    // ---- Fetching ----

    fetchBlob(sha) {
        return this.get('git/blobs/' + sha)
        .then(function(r) {
            return Blob.createFromBase64(r.content);
        });
    }

    // https://developer.github.com/v3/git/trees/
    fetchWorkingState(ref) {
        return this.get('git/trees/' + ref, {
            recursive: 1
        })
        .then(function(tree) {
            const treeEntries = new Map().withMutations(
                function addEntries(map) {
                    tree.tree.map((entry) => {
                        if (entry.type === 'tree') return;
                        const treeEntry = new TreeEntry({
                            sha: entry.sha,
                            blobSize: entry.size,
                            mode: entry.mode
                        });
                        map.set(entry.path, treeEntry);
                    });
                }
            );
            return WorkingState.createWithTree(tree.sha, treeEntries);
        });
    }

    fetchBranches() {
        return this.get('branches')
        .then(function(branches) {
            branches = branches.map((branch) => {
                // TODO properly detect remote
                return new Branch({
                    name: branch.name,
                    sha: branch.commit.sha,
                    // branch.is_local is undefined for GitHub
                    remote: branch.is_local === false ? 'origin' : ''
                });
            });

            return new List(branches);
        });
    }

    // ------ Flushing -----

    flushCommit(commitBuilder) {
        const that = this;

        // Create blobs required
        const blobPromises = commitBuilder.getBlobs().map(function(blob, filePath) {
            return that.post('git/blobs', {
                content: blob.getAsBase64(),
                encoding: 'base64'
            })
            .then(function(ghBlob) {
                return [filePath, ghBlob.sha];
            });
        });

        // Wait for all request to finish
        return Q.all(blobPromises.toArray())
        .then(function(result) {
            // Recreate an object map from the list of [path, sha]
            return result.reduce((res, [key, value]) => {
                res[key] = value;
                return res;
            }, {});
        })
        // Create new tree
        .then(function(blobSHAs) {
            const entries = commitBuilder.getTreeEntries().map(function(treeEntry, filePath) {
                return {
                    path: filePath,
                    mode: treeEntry.getMode(),
                    type: 'blob',
                    sha: blobSHAs[filePath] || treeEntry.getSha()
                };
            }).toArray();
            return that.post('git/trees', {
                tree: entries
            });
        })

        // Create the new commit
        .then(function(ghTree) {
            const committer = commitBuilder.getCommitter();
            const author = commitBuilder.getAuthor();
            const payload = {
                committer: {
                    name: committer.getName(),
                    email: committer.getEmail()
                },
                author: {
                    name: author.getName(),
                    email: author.getEmail()
                },
                message: commitBuilder.getMessage(),
                parents: commitBuilder.getParents().toArray(),
                tree: ghTree.sha
            };
            return that.post('git/commits', payload);
        })
        .then(normCreatedCommit);
    }

    // https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
    listCommits(opts) {
        opts = opts || {};
        const apiOpts = {
            sha: opts.ref,
            path: opts.path,
            author: opts.author,
            per_page: opts.per_page
        };

        return this.get('commits', apiOpts)
        .then(function(commits) {
            return new List(commits).map(normListedCommit);
        });
    }

    // https://developer.github.com/v3/repos/commits/#get-a-single-commit
    fetchCommit(sha) {
        return this.get('commits/' + sha)
        .then(normListedCommit);
    }

    // https://developer.github.com/v3/repos/commits/#compare-two-commits
    findParentCommit(ref1, ref2) {
        return this.get('compare/' + ref1 + '...' + ref2)
        .then(function(res) {
            const commit = res.merge_base_commit;
            if (!commit || !commit.sha) {
                return null;
            } else {
                return normListedCommit(commit);
            }
        });
    }

    // https://developer.github.com/v3/repos/commits/#compare-two-commits
    fetchOwnCommits(base, head) {
        const refs = [base, head].map(function(x) {
            return (x instanceof Branch) ? x.getFullName() : x;
        });

        return this.get('compare/' + refs[0] + '...' + refs[1])
        .then(function(res) {
            return new List(res.commits).map(normListedCommit);
        });
    }

    createRef(ref, sha) {
        return this.post('git/refs', {
            'ref': 'refs/heads/' + ref,
            sha
        });
    }

    forwardBranch(branch, sha) {
        return this.patch('git/refs/heads/' + branch.getFullName(), {
            sha
        })
        // Normalize cannot fast forward errors
        .fail(normNotFF);
    }

    createBranch(base, name) {
        return this.createRef(name, base.getSha())
        .thenResolve(new Branch({
            name,
            sha: base.getSha()
        }));
    }

    deleteBranch(branch) {
        return this.delete('git/refs/heads/' + branch.getName());
    }

    // https://developer.github.com/v3/repos/merging/
    merge(from, into, options) {
        const opts = options;
        const head = from instanceof Branch ? from.getFullName() : from;
        return this.post('merges', {
            base: into.getFullName(),
            head,
            commit_message: opts.message
        })
        .then(function(ghCommit) {
            if (!ghCommit) {
                // No commit was needed
                return null;
            }
            // The format the same as in commit listing, without files
            ghCommit.files = [];
            return normListedCommit(ghCommit);
        })
        // Normalize merge conflict errors
        .fail(normConflict);
    }

    // ---- Only supported by uhub ----
    checkout(branch) {
        return this.post('local/checkout', {
            branch: branch ? branch.getFullName() : 'HEAD'
        });
    }

    listRemotes() {
        return this.get('local/remotes');
    }

    editRemotes(name, url) {
        return this.post('local/remotes', {
            name,
            url
        });
    }

    pull(opts = {}) {
        opts = Object.assign({
            force: false
        }, opts);

        // Convert to ref
        opts.branch = opts.branch.getName();

        return this.post('local/pull', opts)
        .fail(normNotFF)
        .fail(normAuth)
        .fail(normUnknownRemote)
        .fail(normRefNotFound);
    }

    push(opts = {}) {
        opts = Object.assign({
            force: false
        }, opts);

        // Convert to ref
        opts.branch = opts.branch.getName();

        return this.post('local/push', opts)
        .fail(normNotFF)
        .fail(normAuth)
        .fail(normUnknownRemote);
    }

    status(opts) {
        return this.get('local/status')
            .then(function(status) {
                return {
                    files: new List(status.files).map(function(file) {
                        return LocalFile.create(file);
                    }),

                    head: new Reference({
                        ref: status.head.ref,
                        sha: status.head.object.sha
                    })
                };
            });
    }

    track(opts) {
        const params = {
            message: opts.message,
            files: opts.files.map(function(file) {
                return {
                    name: file.getFilename(),
                    status: file.getStatus()
                };
            }).toJS()
        };

        if (opts.author) {
            params.author = {
                name: opts.author.getName(),
                email: opts.author.getEmail(),
                date: opts.author.getDate()
            };
        }

        if (opts.committer) {
            params.committer = {
                name: opts.author.getName(),
                email: opts.author.getEmail(),
                date: opts.author.getDate()
            };
        }

        return this.post('local/track', params);
    }

    // API utilities

    /**
     * Execute an GitHub HTTP API request
     * @param {String} httpMethod 'get', 'post', etc.
     * @param {String} method name of the method
     * @param {Object} args Req. parameters for get, or json data for others
     */
    request(httpMethod, method, args) {
        const axiosOpts = {
            method: httpMethod,
            url: urlJoin(
                this.options.get('host'),
                '/repos/' + this.options.get('repository') + '/' + method
            ) + '?t=' + Date.now(),
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Content-type': 'application/json;charset=UTF-8'
            }
        };

        const username = this.options.get('username');
        const token = this.options.get('token');

        if (username && token) {
            axiosOpts.headers['Authorization'] = 'Basic ' + base64.encode(username + ':' + token);
        } else if (token) {
            axiosOpts.headers['Authorization'] = 'Token ' + token;
        }

        if (httpMethod == 'get') axiosOpts.params = args;
        else axiosOpts.data = args;

        // console.log('API', httpMethod.toUpperCase(), method);
        return Q(axios(axiosOpts))
        .get('data')
        .fail(function(response) {
            if (response instanceof Error) throw response;

            const e = new Error(response.data.message || 'Error ' + response.status + ': ' + response.data);
            e.statusCode = response.status;

            throw e;
        });
    }

    // Shortcuts for API requests
    get(method, args) {
        return this.request('get', method, args);
    }

    post(method, args) {
        return this.request('post', method, args);
    }

    patch(method, args) {
        return this.request('patch', method, args);
    }

    delete(method, args) {
        return this.request('delete', method, args);
    }

    put(method, args) {
        return this.request('put', method, args);
    }
}

function normNotFF(err) {
    const msg = err.message;
    if (/fast forward/.test(msg)) {
        err.code = ERRORS.NOT_FAST_FORWARD;
    }
    return Q.reject(err);
}

function normConflict(err) {
    const msg = err.message;
    if (/merge conflict/i.test(msg)) {
        err.code = ERRORS.CONFLICT;
    }
    return Q.reject(err);
}

function normAuth(err) {
    const msg = err.message;
    if (/Failed to authenticate/.test(msg)
        || /401/.test(msg)
        || /auth schemes/.test(msg)) {
        err.code = ERRORS.AUTHENTICATION_FAILED;
    }

    return Q.reject(err);
}

function normUnknownRemote(err) {
    const msg = err.message;
    if (/specify a URL/.test(msg)
        || /specify a remote/.test(msg)) {
        err.code = ERRORS.UNKNOWN_REMOTE;
    }

    return Q.reject(err);
}

function normRefNotFound(err) {
    const msg = err.message;
    if (/^Reference/.test(msg) && /not found$/.test(msg)) {
        err.code = ERRORS.REF_NOT_FOUND;
    }

    return Q.reject(err);
}

/**
 * Normalize a commit coming from the GitHub commit creation API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normCreatedCommit(ghCommit) {
    const commit = Commit.create({
        sha: ghCommit.sha,
        message: ghCommit.message,
        author: getSimpleAuthor(ghCommit.author),
        date: ghCommit.author.date,
        parents: ghCommit.parents.map(function getSha(o) { return o.sha; })
    });

    return commit;
}

/**
 * Normalize a commit coming from the GitHub commit listing API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normListedCommit(ghCommit) {
    const commit = Commit.create({
        sha: ghCommit.sha,
        message: ghCommit.commit.message,
        author: getCompleteAuthor(ghCommit),
        date: ghCommit.commit.author.date,
        files: ghCommit.files,
        parents: ghCommit.parents.map(function getSha(o) { return o.sha; })
    });

    return commit;
}

// Get author from created commit (no avatar)
function getSimpleAuthor(author) {
    return Author.create(
        author.name,
        author.email,
        new Date(author.date)
    );
}

// Get author from a listed commit (with avatar)
function getCompleteAuthor(commit) {
    const author = getSimpleAuthor(commit.commit.author);
    const avatar = commit.author ?
            commit.author.avatar_url
            : gravatar.url(author.getEmail());
    return author.set('avatar', avatar);
}

module.exports = GitHubDriver;
