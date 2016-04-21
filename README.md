# repofs

[![NPM version](https://badge.fury.io/js/repofs.svg)](http://badge.fury.io/js/repofs)
[![Build Status](https://travis-ci.org/GitbookIO/repofs.png?branch=master)](https://travis-ci.org/GitbookIO/repofs)

This module provides a simple and unified API to manipulate Git repositories on GitHub. This module can be use in Node.JS and in the browser.

It allows more complex operations than the [Contents API](https://developer.github.com/v3/repos/contents/) using the [Git Data API](https://developer.github.com/v3/git/).

It is powered by an immutable model. Async operations are Promise-based.

### Installation

```
$ npm install repofs
```

### How to use it?

To use `repofs` in the browser, include it using browserify/webpack.

```js
var repofs = require('repofs');
```

Initialize a driver instance, a driver represents the communication layer between repofs and the real git repository.

```js
var driver = repofs.GitHubDriver({
    repository: 'MyUsername/myrepository',
    username: 'MyUsername',
    token: 'MyPasswordOrMyApiToken'
});
```

#### Start with an empty RepositoryState

The first step is to create an instance of `RepositoryState`:

```js
var repoState = repofs.RepositoryState.createEmpty();
```

#### Fetch the list of branches

After creating a `RepositoryState`, the next step is to fetch the list of existing branches.

``` js
repofs.RepoUtils.fetchBranches(repoState, driver)
.then(function (newRepoState) {
    var branches = newRepoState.getBranches(); // List<Branch>
    ...
})
```

#### Checkout a branch

Once the branches are fetched, you can checkout one. **This requires to fetch it first** using `repofs.RepoUtils.fetchTree`. This overrides any existing working tree for this branch. The `repofs.RepoUtils.checkout` operation is always sync.

```js
var branch = repoState.getBranch('master');

repofs.RepoUtils.fetchTree(repoState, driver, branch)
.then(function (repoState) {
    var checkoutState = repofs.RepoUtils.checkout(repoState, driver, branch);
    ...
})
```

#### Quick initialization

There is a short way to initialize a `RepositoryState` from a driver, that will fetch the list of the branches, then fetch and checkout *master* or the first available branch.

``` js
repofs.RepoUtils.initialize(driver)
.then(function (repoState) {
    // repoState checked out on master
    ...
});
```

#### Reading files

Reading a file requires to fetch the content from the remote repository inside the `RepositoryState` (See [Caching](#caching)):

```js
repofs.WorkingUtil.fetchFile(repoState, driver, 'README.md')
.then(function(newRepoState) {
    ...
})
```

Then the content can be accessed using sync methods:

```js
// Read as a blob
var blob = repofs.FileUtils.read(repoState, 'README.md');

// Read as a String
var content = repofs.FileUtils.readAsString(repoState, 'README.md');
```

#### Listing files

repofs keeps the whole trees in the different `WorkingStates`, you can access the whole tree as a flat list...

```js
var workingState = repoState.getCurrentState();
var treeEntries = workingState.getTreeEntries();
```

... or as an immutable tree structure (a `TreeNode<File>`):

```js
var dir = '.' // root
var rootTree = repofs.TreeUtils.get(repoState, dir);
```

#### Working with files

Create a new file:

```js
var newRepoState = repofs.FileUtils.create(repoState, 'API.md');
```

Write/Update the file

```js
var newRepoState = repofs.FileUtils.write(repoState, 'API.md', 'content');
```

Remove the file

```js
var newRepoState = repofs.FileUtils.remove(repoState, 'API.md');
```

Rename/Move the file

```js
var newRepoState = repofs.FileUtils.move(repoState, 'API.md', 'API2.md');
```

#### Working with directories

List files in the directory

```js
var pathList = repofs.DirUtils.read(repoState, 'myfolder');
```

Remove the directory

```js
var newRepoState = repofs.DirUtils.remove(repoState, 'myfolder');
```

Rename/Move the directory

```js
var newRepoState = repofs.DirUtils.move(repoState, 'myfolder', 'myfolder2');
```

#### Changes

Until being commited, repofs keeps a record of changes per files.

Revert all non-commited changes using:

```js
var newRepoState = repofs.ChangeUtils.revertAll(repoState);
```

Or revert changes for a specific file or directory:

```js
// Revert change on a specific file
var newRepoState = repofs.ChangeUtils.revertForFile(repoState, 'README.md');

// Revert change on a directory
var newRepoState = repofs.ChangeUtils.revertForDir(repoState, 'src');
```

#### Commiting changes

```js
// Create an author / committer
var john = repofs.Author.create('John Doe', 'john.doe@gmail.com');

// Create a CommitBuilder to define the commit
var commitBuilder = repofs.CommitUtils.prepare(repoState, {
    author: john,
    message: 'Initial commit'
});

// Flush commit using the driver
repofs.CommitUtils.flush(repoState, driver, commitBuilder)
.then(function(newRepoState) {
    // newRepoState updated with new working tree
    ...
});
```

#### Manipulating branches

``` js
 // Create a branch from current branch
 repofs.BranchUtils.create(repoState, driver, 'develop')
 .then(function (newRepoState) {
    var develop = newRepoState.getBranch('develop');
});
```

``` js
 // Remove a branch
 repofs.BranchUtils.remove(repoState, driver, branch)
 .then(function (newRepoState) {
    ...
});
```

#### Non fast forward commits

Flushing a commit can fail with an `ERRORS.NOT_FAST_FORWARD` code.

```js
// Flush commit using the driver
repofs.CommitUtils.flush(repoState, driver, commitBuilder)
.then(function success(newRepoState) {
    ...
}, function failure(err) {
    // Catch non fast forward errors
    if(err.code !== repofs.ERRORS.NOT_FAST_FORWARD) {
        throw err;
    }
    ...
});
```

Non fast forward errors contains the created commit (that is currently not linked to any branch). This allows you to attempt to merge this commit back into the current branch:

```js
... function fail(err) {
    // Catch non fast forward errors
    if(err.code !== repofs.ERRORS.NOT_FAST_FORWARD) {
        throw err;
    }
    // The created commit
    var commit = err.commit;
    // Attempt automatic merge
    var from = commit.getSha();
    var into = repoState.getCurrentBranch();
    return repofs.BranchUtils.merge(repoState, driver, from, into)
    .then(function success(repoState) {
        ...
    });
}
```

#### Merging

`repofs.BranchUtils.merge` allows to automatically merge a commit or a branch, into another branch.

``` js
// from is either a Branch or a commit SHA string
repofs.BranchUtils.merge(repoState, driver, from, into)
.then(function success(repoState) {
    ...
});
```

#### Merge conflicts

But conflicts can happen when the automatic merge failed. For example, after merging two branches, or after merging a non fast forward commit. It is possible then to solve the conflicts manually:

```js
repofs.BranchUtils.merge(repoState, driver, from, into)
.then(function success(repoState) {
    ...
}, function failure(err) {
    // Catch merge conflict errors
    if(err.code !== repofs.ERRORS.CONFLICT) {
        throw err;
    }
    solveConflicts(repoState, driver, from, into)
});
```

The function `solveConflicts` would compute the `TreeConflict` representing all the conflicts between `from` and `into` references, solve it in some ways, and make a merge commit. Here is an example of such function:

``` js
function solveConflicts(repoState, driver, from, into) {
    return repofs.ConflictUtils.compareRefs(driver, base, head)
    .then(function (treeConflict) {
        // Solve the list of conflicts in some way, for example by
        // asking a user to do it manually.
        var solvedConflicts // Map<Path, Conflict>
            = solve(treeConflict.getConflicts());

        // Create a solved conflict tree
        var solvedTreeConflict // TreeConflict
            = repofs.ConflictUtils.solveTree(treeConflict, solvedConflicts);

        // The SHAs of the parent commits
        var parentShas = [from.getSha(), into.getSha()];
        // Create the merge commit
        var commitBuilder = repofs.ConflictUtils.mergeCommit(solvedTreeConflict, parents);

        // Flush it on the target branch
        return repofs.CommitUtils.flush(repoState, driver, commitBuilder, {
            branch: into
        });
    });
}
```

#### Remotes operations

When using a compatible API, you can also deal with remotes on the repository.

##### List remotes

``` js
repofs.RemoteUtils.list(driver)
.then(function (remotes) {
    // remotes is an Array of remote:
    // {
    //   name,
    //   url
    // }
});
```

##### Edit remotes

``` js
repofs.RemoteUtils.edit(driver, name, url)
.then(function () {
    // Remote edited
});
```

##### Pulling

You can update a branch to the state of the same branch on a remote, and get an updated `RepositoryState` with:

``` js
var master = repoState.getBranch('master');
var remote = {
    name: 'origin'
};

repofs.RemoteUtils.pull(repoState, driver, {
    branch: master,
    remote: remote,
    auth: {
        username: Shakespeare,
        password: 'f00lish wit'
    }
})
.then(function (newRepoState) {
    ...
})
```

##### Pushing

You can push a branch to a remote:

```js
var master = repoState.getBranch('master');
var remote = {
    name: 'origin'
};

repofs.RemoteUtils.push(repoState, driver, {
    branch: master,
    remote: remote,
    auth: {
        username: Shakespeare,
        password: 'f00lish wit'
    }
})
.then(function () {
    // Pushed
})
```
