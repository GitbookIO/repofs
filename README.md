# repofs

[![NPM version](https://badge.fury.io/js/repofs.svg)](http://badge.fury.io/js/repofs)
[![Build Status](https://travis-ci.org/GitbookIO/repofs.png?branch=master)](https://travis-ci.org/GitbookIO/repofs)

This module provides a simple and unified API to manipulate Git repositories on GitHub. This module can be use in Node.JS and in the browser.

It allows more complex operations than the [Contents API](https://developer.github.com/v3/repos/contents/) using the [Git Data API](https://developer.github.com/v3/git/).

The API provided by this module is Promise-based.

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

#### Reading the repository

Fetch the tree:

```js
repofs.WorkingUtil.fetchTree(workingState, 'master')
.then(function(newWorkingState) {
    ...
})
```

Fetch a specific file:

```js
repofs.WorkingUtil.fetchFile(workingState, driver, 'README.md')
.then(function(newWorkingState) {
    ...
})
```

#### Working with files

Create a new file:

```js
var newWorkingState = repofs.FileUtils.create(workingState, 'API.md');
```

Write/Update the file

```js
var newWorkingState = repofs.FileUtils.write(workingState, 'API.md');
```

Remove the file

```js
var newWorkingState = repofs.FileUtils.remove(workingState, 'API.md');
```

Rename/Move the file

```js
var newWorkingState = repofs.FileUtils.move(workingState, 'API.md', 'API2.md');
```

#### Working with directories

Remove the directory

```js
var newWorkingState = repofs.DirUtils.remove(workingState, 'myfolder');
```

Rename/Move the directory

```js
var newWorkingState = repofs.DirUtils.move(workingState, 'myfolder', 'myfolder2');
```

