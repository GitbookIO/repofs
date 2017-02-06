require('should');

const path = require('path');

const repofs = require('../src/');
const { RemoteUtils, BranchUtils, GitHubDriver } = repofs;

const REPO = process.env.REPOFS_REPO;
const HOST = process.env.REPOFS_HOST;
const TOKEN = process.env.REPOFS_TOKEN;
const REMOTE_PATH = path.resolve('.tmp/repo-remote.git') + '/';

const mock = require('./mock');

describe('RemoteUtils', () => {
    if (process.env.REPOFS_DRIVER !== 'uhub') return;

    const DEFAULT_BOOK = mock.DEFAULT_BOOK;

    const driver = new GitHubDriver({
        repository: REPO,
        host: HOST,
        token: TOKEN
    });

    describe('.push', () => {
        it('should be a function', () => {
            RemoteUtils.push.should.be.a.Function();
        });

        it('should push remote repository', (done) => {
            RemoteUtils.edit(driver, 'origin', REMOTE_PATH)
                .then(() => {
                    return RemoteUtils.push(DEFAULT_BOOK, driver);
                })
                .then((repoState) => {
                    done();
                })
                .catch(done);
        });
    });

    describe('.pull', () => {
        it('should be a function', () => {
            RemoteUtils.pull.should.be.a.Function();
        });

        it('should pull remote repository', (done) => {
            RemoteUtils.pull(DEFAULT_BOOK, driver)
                .then(() => {
                    done();
                });
        });
    });

    describe('.list', () => {
        it('should be a function', () => {
            RemoteUtils.list.should.be.a.Function();
        });

        it('should list remotes', (done) => {
            RemoteUtils.list(driver)
                .then((remotes) => {
                    remotes.should.be.an.instanceOf(Array);
                    remotes[0].should.have.property('name');
                    remotes[0].should.have.property('url');
                    remotes[0].name.should.equal('origin');
                    remotes[0].url.should.equal(REMOTE_PATH);
                    done();
                })
                .catch(done);
        });
    });

    describe('.edit', () => {
        it('should be a function', () => {
            RemoteUtils.edit.should.be.a.Function();
        });

        it('should edit remotes', (done) => {
            RemoteUtils.edit(driver, 'origin', 'foobar')
                .then(() => {
                    return RemoteUtils.list(driver);
                })
                .then((remotes) => {
                    remotes[0].name.should.equal('origin');
                    remotes[0].url.should.equal('foobar');
                })
                // reset remote to its original path
                .then(() => {
                    return RemoteUtils.edit(driver, 'origin', REMOTE_PATH);
                })
                .then(() => {
                    return RemoteUtils.list(driver);
                })
                .then((remotes) => {
                    remotes[0].name.should.equal('origin');
                    remotes[0].url.should.equal(REMOTE_PATH);
                })
                .then(done)
                .catch(done);
        });
    });

    describe('.sync', () => {
        let repoState;

        before(() => {
            return repofs.RepoUtils.initialize(driver)
            .then((initRepo) => {
                repoState = initRepo;
            });
        });

        it('should be a function', () => {
            RemoteUtils.sync.should.be.a.Function();
        });

        it('should sync to remote test-remote branch name', () => {
            return BranchUtils.create(repoState, driver, 'test-remote', {})
                .then((newRepoState) => {
                    newRepoState = newRepoState.set('currentBranchName', 'test-remote');
                    return RemoteUtils.sync(newRepoState, driver);
                })
                .then((newRepoState) => {
                    newRepoState.currentBranchName.should.equal('test-remote');
                });
        });

        it('should sync to remote master branch name which exists', () => {
            return RemoteUtils.sync(repoState, driver)
                .then((newRepoState) => {
                    newRepoState.currentBranchName.should.equal('master');
                });
        });
    });

});
