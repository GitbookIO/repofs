# repofs

[![NPM version](https://badge.fury.io/js/repofs.svg)](http://badge.fury.io/js/repofs)
[![Build Status](https://travis-ci.org/GitbookIO/repofs.png?branch=master)](https://travis-ci.org/GitbookIO/repofs)

This module provides a simple and unified API to manipulate Git repositories, locally or using GitHub API. This module can be use in Node.JS and in the browser.

The API provided by this module is Promise-based.

### Installation

```
$ npm install repofs
```

### How to use it?

To use `repofs` in the browser, include it using browserify.

```js
var repofs = require('repofs');

// Require drivers
var DriverLocal = require('repofs/drivers/local');
var DriverGitHub = require('repofs/drivers/github');
```

The first step is to create an fs instance, for example to connect to a local git repository:

```js
var fs = repofs(DriverLocal, {
    root: './mygitrepo',
    commiter: {
        name: "John Doe",
        email: "johndoe@gmail.com"
    }
});
```

or a remote GitHub repository:

```js
var fs = repofs(DriverGitHub, {
    repository: 'MyUsername/myrepository',
    username: 'MyUsername',
    token: 'MyPasswordOrMyApiToken',
    commiter: {
        name: "John Doe",
        email: "johndoe@gmail.com"
    }
});
```

##### fs.stat: Get informations about a file

```js
/// On default branch
fs.stat('README.txt').then(function(file) { ... });

/// On a specific branch
fs.stat('README.txt', { ref: "dev" })
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
    content: "...."
}
```

##### fs.read: Read file's content

```js
/// On default branch
fs.read('README.txt').then(function(content) { ... });

/// On a specific branch
fs.read('README.txt', { ref: "dev" })
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

/// On a specific branch
fs.write('README.txt', 'My new content', { ref: "dev" })

// With a specific commit message
// By default, the message will be "Update <path>"
fs.write('README.txt', 'My new content', { message: "My super commit" })

// With an binary array buffer
fs.write('image.png', new ArrayBuffer(10));
```

##### fs.exists: Check if a file exists

```js
/// On default branch
fs.exists('README.txt').then(function(exist) { ... });

/// On a specific branch
fs.exists('README.txt', { ref: "dev" })
```

##### fs.readdir: List directory content

```js
/// On default branch
fs.readdir('myfolder').then(function(files) { ... });

/// On a specific branch
fs.readdir('myfolder', { ref: "dev" })
```

`files` is a map fo `fileName => fileInfos`.

##### fs.unlink: Delete a file

```js
/// On default branch
fs.unlink('README.txt').then(function() { ... });

/// On a specific branch
fs.unlink('README.txt', { ref: "dev" })
```

##### fs.move: Rename a file

(`fs.rename` is an alias of this method).

```js
/// On default branch
fs.move('README.txt', 'README2.txt').then(function() { ... });

/// On a specific branch
fs.move('README.txt', 'README2.txt', { ref: "dev" })
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
    commit: "..."
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
fs.getCommit("sha", { ref: "dev" }).then(function(commit) { ... });
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

##### Events

```js
// File watcher
// Path of the file is accessible using e.path
fs.on('watch.add', function(e) {  });
fs.on('watch.unlink', function(e) {  })
fs.on('watch.change', function(e) {  })
```


### Drivers

| Driver | Browser | Node.js |
| ---- | ------- | ------- | ---- |
| `var DriverLocal = require('repofs/drivers/local');` | no | **yes** | `repofs.local()` |
| `var DriverGitHub = require('repofs/drivers/github');` | **yes** | **yes**  |
| `var DriverMemory = require('repofs/drivers/memory');` | **yes** | **yes**  |
| `var DriverLocalStorage = require('repofs/drivers/localstorage');` | **yes** | no  |
