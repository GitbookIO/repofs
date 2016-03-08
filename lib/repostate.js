'use strict';

var Immutable = require('immutable');
var Record = Immutable.Record;

var defaultState = {
    currentBranch: null // string
};

var RepoStateRecord = Record(defaultState);

/**
 * Constructor not for public consumption.
 * RepoStateRecord -> RepoState
 */
var RepoState = function (immutable) {
    this._immutable = immutable;
};

// Static methods //

/**
 * Creates a new RepoState with initialised current branch
 * String -> RepoState
 */
RepoState.createWithCurrentBranch = function (currentBranch) {
    return new RepoState(new RepoStateRecord({
        currentBranch: currentBranch
    }));
};

/**
 * Set properties of the repoState to new values
 * RepoState, Object -> RepoState
 */
RepoState.set = function (repoState, put) {
    // TODO use Map.withMutations()
    var map = repoState.getImmutable().merge(put);
    return new RepoState(map);
};

RepoState.prototype.setCurrentBranch = function (repoState, branch) {
    return RepoState.set(repoState, { currentBranch: branch });
};

// Instance methods

/**
 * Not for public consumption.
 * This -> RepoStateRecord
 */
RepoState.prototype.getImmutable = function() {
    return this._immutable;
};



RepoState.prototype.getCurrentBranch = function () {
    return this.getImmutable().get('currentBranch');
};


module.exports = RepoState;
