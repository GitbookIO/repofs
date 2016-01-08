# repofs

[![NPM version](https://badge.fury.io/js/repofs.svg)](http://badge.fury.io/js/repofs)
[![Build Status](https://travis-ci.org/GitbookIO/repofs.png?branch=master)](https://travis-ci.org/GitbookIO/repofs)

This module provides a simple and unified API to manipulate Git repositories, locally or using GitHub API. This module can be use in Node.JS and in the browser.

The API provided by this module is Promise-based.

### Features

- :sparkles: Promise-based API
- :sparkles: Easy to use API
- :sparkles: Supports ArrayBuffer for reading/writing files without encoding issues
- :sparkles: Parse patches
- :sparkles: Bundle multiple changes in one commit

### Installation

```
$ npm install repofs
```

### How to use it?

To use `repofs` in the browser, include it using browserify.

```js
var repofs = require('repofs');
```

The first step is to create an fs instance, for example to connect to a remote GitHub repository:

```js
var fs = repofs({
    repository: 'MyUsername/myrepository',
    username: 'MyUsername',
    token: 'MyPasswordOrMyApiToken',
    committer: {
        name: "John Doe",
        email: "johndoe@gmail.com"
    }
});
```

##### fs.checkout: Select a branch

The first step is to select a branch to use:

```js
fs.checkout('master').then(function() { ... })
```

##### fs.stat: Get informations about a file

```js
fs.stat('README.txt').then(function(file) { ... });
```

`file` will look like:

```js
{
    name: "README.md",
    path: "folder/README.md",
    type: "file",
    isDirectory: false,
    size: 546,
    sha: "....",
    content: "....",
    mime: "application/octet-stream",
    url: "file://..."
}
```

The `url` can be an `http(s)` url (for GitHub), or a `data` url (for Memory and LocalStore).

##### fs.read: Read file's content

```js
fs.read('README.txt').then(function(content) { ... });
```

By default content is returned as an utf8 string, to read file's content as an `ArrayBuffer`, you can use the `encoding` option:

```js
// Get content as an ArrayBuffer
fs.read('README.txt', { encoding: null })
```

##### fs.write: Update file content

This method will fail if the file doesnt't exist. If the file doesn't exists, you should use `fs.create`. You can also use `fs.update` to orce creation if file doesn't exist.

```js
/// On default branch
fs.write('README.txt', 'My new content')

// With a specific commit message
// By default, the message will be "Update <path>"
fs.write('README.txt', 'My new content', { message: "My super commit" })

// With an binary array buffer
fs.write('image.png', new ArrayBuffer(10));
```

##### fs.commit: Commit changes

Commit all changes to the driver.

```js
// Commit changes on a specific branch
// Commit message will be the last change's message
fs.commit()

// Commit with a different message
fs.commit({ message: 'My Commit' })
```

##### fs.exists: Check if a file exists

```js
fs.exists('README.txt').then(function(exist) { ... });
```

##### fs.readdir: List directory content

```js
fs.readdir('myfolder').then(function(files) { ... });
```

`files` is a map fo `fileName => fileInfos`.

##### fs.unlink: Delete a file

```js
fs.unlink('README.txt').then(function() { ... });
```

##### fs.rmdir: Delete a folder

```js
fs.rmdir('lib').then(function() { ... });
```

##### fs.move: Move/Rename a file

(`fs.rename` is an alias of this method).

```js
fs.move('README.txt', 'README2.txt').then(function() { ... });
```

##### fs.mvdir: Move/Rename a directory

```js
fs.mvdir('lib', 'lib2').then(function() { ... });
```

##### Working with branches

```js
// List branches
fs.listBranches().then(function(branches) { ... });

// Create a new branch from master
fs.createBranch('dev')

// or create a new branch from another branch
fs.createBranch('fix/2', 'dev')

// Delete a branch
fs.removeBranch('dev')

// Merge a branch into another one
fs.mergeBranches("dev", "master", {
    message: "Shipped cool_feature!"
})
```

A branch is defined by:

```js
{
    name: "master",
    commit: { ... }
}
```

##### List commits on the repository

```js
// List commits
fs.listCommits({ ref: "dev" }).then(function(commits) { ... });
```

`commits` will be a list like of object like:

```js
{
    "sha": "...",
    "author": {
        "name": "Samy Pesse",
        "email": "samypesse@gmail.com"
    },
    "message": "Create file hello.js",
    "date": [Date Object]
}
```

##### Get a single commit

```js
fs.getCommit("sha").then(function(commit) { ... });
```

`commit` will also include a `files` attribute, example:

```js
{
    "sha": "415ab40ae9b7cc4e66d6769cb2c08106e8293b48",
    "author": {
        "name": "John Doe",
        "email": "johndoe@gmail.com"
    },
    "message": "Initial commit",
    "date": "2015-06-09T08:10:38.260Z",
    "files": [
        {
            "filename": "README.md",
            "patch": "@@ -0,0 +1,11 @@\n+Hello world\n"
        }
    ]
}
```

##### Compare two commits

```js
fs.compareCommits("hubot:branchname", "octocat:branchname").then(function(result) { ... });
```

`result` will also include `files` and `commits` attribute.


##### Working with remotes

```js
// Push a branch to origin
fs.push({
    branch: "dev"
})

// Push to a specific remote
fs.push({
    remote: {
        name: "myremote",
        url: "https://github.com/GitbookIO/repofs.git"
    }
})

// Fetch a specific remote with authentication
fs.fetch({
    remote: {
        name: "myremote",
        url: "https://github.com/GitbookIO/repofs.git"
    },
    auth: {
        username: "John",
        password: "mysecret"
    }
})

// Force push
fs.push({
    force: true
})
```

`fs.pull` uses the same options as `fs.push`. You can also use `fs.sync` whic is equivalent to pushing then pulling changes.

##### Uncommited changes

Uncommited changes can be listed:

```js
var changes = fs.listChanges({ ref: 'master' });
// changes will be a map: filanem -> {type, buffer}
```

And revert:

```js
// Revert change on a file
fs.revertChange('README.md', { ref: 'master' });

// Revert all pending changes
fs.revertAllChanges({ ref: 'master' });
```

##### Operations

Repofs has a concept of "operations stack", to easily group changes:

```js
fs.operation('First commit', function() {
    return Q.all([
        fs.write('package.json', '{ ... }'),
        fs.write('index.js', '...'),
        fs.write('README.md', '...')
    ]);
});
```

We can also automatically commit once the stack is empty:

```js
fs.on('operations.allcompleted', function() {
    fs.commit();
});
```

##### Events

File watcher (Path of the file is accessible using `e.path`):

```js
fs.on('watcher.create', function(e) {  })
fs.on('watcher.remove', function(e) {  })
fs.on('watcher.update', function(e) {  })

// Or watch all changes (create, remove and update):
// e.type is the type of change
fs.on('watcher', function(e) {  })
```

Branches:

```js
fs.on('branches.add', function(e) {  })
fs.on('branches.remove', function(e) {  })

// e.type is the type of change
fs.on('branches')
```

Operations:

```js
fs.on('operations.started', function(e) { })
fs.on('operations.completed', function(e) { })
fs.on('operations.allcompleted', function(e) { })
```

