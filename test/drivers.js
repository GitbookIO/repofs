var Q = require('q');
var _ = require('lodash');
var immutable = require('immutable');

var Octocat = require('octocat');
var repofs = require('../');
var GitHubDriver = repofs.GitHubDriver;

// Defined API values
var DRIVERS = {
    // Only one for now
    GITHUB: 'github',
    UHUB: 'uhub'
};
var DRIVER = process.env.REPOFS_DRIVER || DRIVERS.UHUB;

var REPO = process.env.REPOFS_REPO;
var HOST = process.env.REPOFS_HOST;
var TOKEN = process.env.REPOFS_TOKEN;

describe('Driver', function() {

    var shouldSkip = process.env.REPOFS_SKIP_API_TEST;
    if(shouldSkip) {
        it('WAS SKIPPED', function () {
        });
        return;
    }
    if (!DRIVER) throw new Error('Testing requires to select a DRIVER');
    if (!REPO || !HOST) throw new Error('Testing requires a REPO and HOST configuration');

    var octocat;
    var octoRepo;
    var driver;

    // Setup base repo
    before(function() {
        driver = createDriver(DRIVER, REPO, TOKEN, HOST);

        if (DRIVER === DRIVERS.GITHUB) {
            // Init repo
            octocat = new Octocat({
                token: TOKEN
            });
            octoRepo = octocat.repo(REPO);
            // Clear any existing repo
            return octoRepo.destroy()
            .fin(function() {
                return octocat.createRepo({
                    name: _.last(REPO.split('/')),
                    auto_init: true
                });
            });
        }
    });

    // Destroy repository after tests
    after(function() {
        if(DRIVER === DRIVERS.GITHUB) {
            return octoRepo.destroy();
        }
    });

    describe('.fetchBranches', function() {
        it('should list existing branches', function() {
            return driver.fetchBranches()
            .then(function (branches) {
                (branches instanceof immutable.List).should.be.true();
                branches.count().should.eql(1);
                var branch = branches.first();
                branch.getFullName().should.eql('master');
            });
        });
    });
    describe('.createBranch', function() {
        it('should clone a branch', function() {
            return findBranch(driver, 'master')
            .then(function (master) {
                return driver.createBranch(master, 'master-clone')
                .then(function () {
                    return findBranch(driver, 'master-clone');
                })
                .then(function (clone) {
                    clone.getSha().should.eql(master.getSha());
                });
            });
        });
    });
    describe('.fetchBlob', function() {
    });
});

// Utilities
function createDriver(type, repo, token, host) {
    switch (type) {
    case DRIVERS.GITHUB:
    case DRIVERS.UHUB:
        return new GitHubDriver({
            repository: repo,
            host: host,
            token: token
        });
    default:
        throw new Error('Unknown API: '+DRIVERS);
    }
}

function findBranch(driver, fullname) {
    return driver.fetchBranches()
    .then(function find(branches) {
        return branches.find(function (br) {
            return br.getFullName() === fullname;
        });
    });
}
