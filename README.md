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

#### Initialize a Repository

The first step is to initialize a repository state:

```js
var repoState = repofs.RepositoryState.createEmpty();
```

#### Checkout a branch

After creating an empty `RepositoryState`, the next step is to checkout a specific branch

```js
repofs.RepoUtils.checkout(repoState, driver, 'master')
.then(function(newRepoState) {
    ...
})
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

Since repofs keeps the whole tree in its `RepositoryState`, you can access the all tree at once:

```js
// From a RepositoryState
var tree = repoState.getCurrentTree();

// From a WorkingState
var tree = repoState.getTree();
```


#### Working with files

Create a new file:

```js
var newRepoState = repofs.FileUtils.create(repoState, 'API.md');
```

Write/Update the file

```js
var newRepoState = repofs.FileUtils.write(repoState, 'API.md');
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

Remove the directory

```js
var newRepoState = repofs.DirUtils.remove(repoState, 'myfolder');
```

Rename/Move the directory

```js
var newRepoState = repofs.DirUtils.move(repoState, 'myfolder', 'myfolder2');
```

#### Changes

Until being commited, repofs keep a record of changes per files.

Revert all non-commited changes using:

```js
var newRepoState = repofs.ChangeUtils.revertAll(repoState);
```

Or revert changes for a specific file or directory:

```js
// Revert change on a specific file
var newRepoState = repofs.ChangeUtils.revertForFile(repoState, 'README.md');

// Revert change on a directory
var newRepoState = repofs.ChangeUtils.revertForDir(repoState, 'lib');
```

#### Commiting changes

```js
// Create an author / committer
var john = repofs.Author.create('John Doe', 'john.doe@gmail.com');

// Create a CommitBuilder to define the commit
var commit = repofs.CommitUtils.prepare(repoState, {
    author: john
});

// Flush commit using the driver
repofs.CommitUtils.flush(commit)
.then(function() {
    ...
});
```

