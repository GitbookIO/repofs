// These tests are backed by real repositories and make use of API
// calls. They are grouped for optimisation.

// We typically want to run these after all the local test pass, so enforce order
['./decoding.js',
 './dir.js',
 './file.js',
 './filestree.js',
 './conflict.js',
 './repository.js',
 './workingState.js']
.map(require);

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

// Assumes that a repository was created with one commit on 'master':
// Commit "Initial commit\n"
// 1 addition README.md:
// "# <name of the repo>"
describe('API tests', function() {

    var shouldSkip = process.env.REPOFS_SKIP_API_TEST;
    if(shouldSkip) {
        it('WAS SKIPPED', function () {
        });
        return;
    }
    if (!DRIVER) throw new Error('Testing requires to select a DRIVER');
    if (!REPO || !HOST) throw new Error('Testing requires a REPO and HOST configuration');

    var driver;

    driver = createDriver(DRIVER, REPO, TOKEN, HOST);

    require('./api/driver')(driver);

    require('./api/commit')(driver);
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
