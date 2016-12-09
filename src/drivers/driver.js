class Driver {

    /**
     * Fetch a blob by its sha
     * @param {SHA} sha
     * @return {Promise<Blob>}
     */
    fetchBlob(sha) {}

    /**
     * Fetch a tree from a reference
     * @param {Ref} ref
     * @return {Promise<WorkingState>}
     */
    fetchWorkingState(ref) {}

    /**
     * Fetch branches listing
     * @return {Promise<List<Branch>>}
     */
    fetchBranches() {}

    /**
     * Flush a commit
     * @param {CommitBuilder} commitBuilder
     * @return {Promise<Commit>}
     */
    flushCommit(commitBuilder) {}

    /**
     * @param {Ref} [options.ref=master]
     * @param {Path} [options.path] Filter containing the file
     * @param {String} [options.author] Filter by author name
     * @param {Number} [options.per_page] Limite number of result
     * @return {Promise<List<Commit>>} Commits without files patch
     */
    listCommits(options) {}

    /**
     * Get a single commit, with files patch
     * @param {SHA} sha
     * @return {Promise<Commit>}
     */
    fetchCommit(sha) {}

    /**
     * Find the closest parent of two commits
     * @param {Ref} ref1
     * @param {Ref} ref2
     * @return {Promise<Commit | Null>}
     */
    findParentCommit(ref1, ref2) {}

    /**
     * List all the commits reachable from head, but not from base. Most
     * recent first.
     * @param {Branch | SHA} base
     * @param {Branch | SHA} head
     * @return {Promise<List<Commit>>}
     */
    fetchOwnCommits(base, head) {}

    /**
     * Update a branch forward to a given commit
     * @param {Branch} branch
     * @param {SHA} sha Commit sha
     * @return {Promise<Undefined, ERRORS.NOT_FAST_FORWARD>}
     */
    forwardBranch(branch, sha) {}

    /**
     * Create a reference
     * @param {String} ref name of the ref
     * @param {SHA} sha
     * @return {Promise}
     */
    createRef(ref, sha) {}

    /**
     * Create a branch based on another one
     * @param {Branch} base
     * @param {String} name
     * @return {Promise<Branch>}
     */
    createBranch(base, name) {}

    /**
     * Delete a branch
     * @param {Branch} branch
     * @return {Promise}
     */
    deleteBranch(branch) {}

    /**
     * Attempts an automatic merging through the API.
     * @param {Branch | SHA} from A branch, or a commit SHA
     * @param {Branch} into Branch to merge into
     * @param {String} [options.message] Merge commit message
     * @return {Promise<Commit || Null, ERRORS.CONFLICT>} Returns the merge commit,
     * or null if `into` already hase `from` as parent
     */
    merge(from, into, options) {}

    // ---- Remotes (Not implemented by all APIs) ----

    /**
     * Checkout a branch, by syncing the filesystem
     * @param {Branch} branch
     * @return {Promise<Undefined>}
     */
    checkout(branch) {}

    /**
     * List remotes on the repository.
     * @return {Promise<Array<{name, url}>>}
     */
    listRemotes() {}

    /**
     * Edit a remote.
     * @param {String} [name] Name of the remote
     * @param {String} [url] New URL of the remote
     */
    editRemotes(name, url) {}

    /**
     * Pull changes for local branch, from remote repository
     * @param {Branch} opts.branch Branch to pull. Default to current
     * @param {String} opts.remote.name Name of the remote
     * @param {String} [opts.remote.url] URL if the remote needs to be created
     * @param {Boolean} [opts.force=false] Ignore non fast forward
     * @param {String} [opts.auth.username] Authentication username
     * @param {String} [opts.auth.password] Authentication password
     * @return {Promise<Undefined>}
     * @throws {Promise<ERROR.NOT_FAST_FORWARD>}
     * @throws {Promise<ERROR.AUTHENTICATION_FAILED>}
     * @throws {Promise<ERROR.UNKNOWN_REMOTE>}
     */
    pull(opts) {}


    /**
     * Push a local branch to a remote repository
     * @param {Branch} opts.branch Branch to push. Default to current
     * @param {String} opts.remote.name Name of the remote
     * @param {String} [opts.remote.url] URL if the remote needs to be created
     * @param {Boolean} [opts.force=false] Ignore non fast forward
     * @param {String} [opts.auth.username] Authentication username
     * @param {String} [opts.auth.password] Authentication password
     * @return {Promise<Undefined>}
     * @throws {Promise<ERROR.NOT_FAST_FORWARD>}
     * @throws {Promise<ERROR.AUTHENTICATION_FAILED>}
     * @throws {Promise<ERROR.UNKNOWN_REMOTE>}
     */
    push(opts) {}

    /**
     * Fetch status information from a remote repository
     * @return {Promise<{ files: <LocalFile>, head: Reference }>}
     */
    status() {}

    /**
     * Track local files into a git repository. Performs a post request to /track
     * endpoint with a JSON payload in the form of:
     *
     *
     *          {
     *            "message": "Commit message",
     *            "files": [{
     *                "name": "README.md",
     *                "status": "modified"
     *            }, {
     *                "name": "foobar.md",
     *                "status": "untracked"
     *            }],
     *
     *            "author": {
     *                "name": "John Doe",
     *                "email": "johndoe@example.com",
     *                "date": "Mon Nov 07 2016 16:40:35 GMT+0100 (CET)"
     *            },
     *
     *            "committer": {
     *                "name": "John Doe",
     *                "email": "johndoe@example.com",
     *                "date": "Mon Nov 07 2016 16:40:35 GMT+0100 (CET)"
     *            }
     *        }
     *
     * Status and expected behaviour:
     *
     * added -> File will be added and committed
     * copied -> not supported
     * removed -> File will be removed
     * modified -> Modification will be committed
     * renamed -> not supported
     * unmodified -> Nothing
     * untracked -> File will be added and committed
     *
     * @param {String} opts.message commit message.
     * @param {Array<LocalFile>} opts.files List of files with name and status.
     * @param {Author} opts.author Optional author information with name, email and
     * date.
     * @param {Author} opts.committer Optional committer information with name,
     * email and date.
     * @return {Promise<Undefined>}
     */
    track(opts) {}
}

module.exports = Driver;
