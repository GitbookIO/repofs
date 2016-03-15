var util = require('util');
var Driver = require('../models/driver');

function GitHubDriver() {

}
util.inherits(GitHubDriver, Driver);


module.exports = GitHubDriver;
