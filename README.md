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

##### Read files

```js
/// On default branch
fs.read('README.txt').then(function(content) { ... });

/// On a specific branch
fs.read('README.txt', { ref: "dev" })
```

##### Write files

```js
/// On default branch
fs.write('README.txt', 'My new content')

/// On a specific branch
fs.write('README.txt', 'My new content', { ref: "dev" })

// With a specific commit message
// By default, the message will be "Update <path>"
fs.write('README.txt', 'My new content', { message: "My super commit" })
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


### Drivers

| Name | Browser | Node.js | Init |
| ---- | ------- | ------- | ---- |
| Local | no | **yes** | `repofs.local()` |
| GitHub | **yes** | **yes** | `repofs.github()` |

