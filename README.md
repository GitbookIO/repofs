# repofs

`fs` like api to work with Git repositories, both locally and on GitHub. This library can work in the browser using the GitHub API.

The API provided by this module is Pronise-based.

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

The first step is to create an fs instance,

For example to connect to a local git repository:

```js
var fs = repofs(DriverLocal, {
    root: './mygitrepo',
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
    sha: "....",
    "content": "...."
}
```

##### fs.read: Read file's content

```js
/// On default branch
fs.read('README.txt').then(function(content) { ... });

/// On a specific branch
fs.read('README.txt', { ref: "dev" })
```

##### fs.write: Update file content

This method will fail if the file doesnt't exist. If the file doesn't exists, you should use `fs.create`.

```js
/// On default branch
fs.write('README.txt', 'My new content')

/// On a specific branch
fs.write('README.txt', 'My new content', { ref: "dev" })

// With a specific commit message
// By default, the message will be "Update <path>"
fs.write('README.txt', 'My new content', { message: "My super commit" })
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

##### Working with commits

```js
// List commits
fs.listCommits({ ref: "dev" }).then(function(commits) { ... });

```

### Drivers

| Driver | Browser | Node.js |
| ---- | ------- | ------- | ---- |
| `var DriverLocal = require('repofs/drivers/local');` | no | **yes** | `repofs.local()` |
| `var DriverGitHub = require('repofs/drivers/github');` | **yes** | **yes**  |

