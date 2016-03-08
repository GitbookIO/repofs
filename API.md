This document describes the refactored API of `repofs`. We will eventually export it in a proper doc using gitbook.

# Overview

## RepoFs

Exposes a set of methods, mostly working on a provided RepoState instance, to do high-level operations on the git repository. Most functions returns Promises.

## RepoState

The full state of a working directory is stored in this object. This object is immutable, but remains efficient because of reuse of unchanged values between instances.

It contains the following data:

- `RepoConfig` instance
- Current branch name
- `Trees` for every branch (cached)
- The list of pending changes for trees
- `Store` instance

## Tree
TODO

## Entry
TODO

## RepoConfig

Immutable structure, holding the following state:

- Repository name (`"owner/repo"`)
- Hostname
- Committer (name and email)
- Access token

## Store

Gives access to persistent storage, used for caching (in memory, local storage, etc.)

TODO How to guarantee the validity of cached values, across multiple instance ?
Maybe we will need to keep a virtual store index (immutable) to keep track of each cached value, and salt the keys with unique ids ?

# API details

## Types

In addition to Immutable types, these are types references used in this doc

```js
Ref = Record<{
    type: String, // such as 'remote', 'tag', 'head'
    name: String // such as 'master'
}>

// A SHA hash
Sha = String

// A file path like 'folder/README.md'
Path = String

// A file and its info
File = Record<{
    name: String,
    path: Path,
    type: String, // "file", etc?
    isDirectory: Boolean,
    size: Number, // Characters count
    sha: Sha, // Sha of the file's blob
    content: String,
    mime: String, // like "application/octet-stream"
    url: String // "protocol://..."
}>
```
With protocol being `http(s)` (for GitHub), or `data` (for Memory and LocalStore).

## Errors

The RepoFs API defines a list of errors that you might want to handle. All errors inherit `Error` and have at least a `message` and a `code` attribute that you can check against these constants:

``` js
RepoFs.ERR_CONFLICTS
RepoFs.ERR_FILE_NOT_FOUND
```


## `Store`
An object that must implement the following instance methods:

```js
// Returns the namespace being used or ''
// () -> String
store.getNamespace = function ()

// Get the data stored for this key
// String -> x
store.get = function(key)

// Set the data store for this key
// String, x -> ()
store.set = function(key, val)

// Invalidates the current stored value for this key
// String -> ()
store.del = function(key)
```

A new `Store` instance can be created with the following function:

```js
// Create a new store, with an optional namespace for stored keys
// (String) -> Store
createStore(namespace)
```

## RepoState

### Static methods

```js
TODO
```

### Instance methods

```js
// () -> RepoConfig
state.getConfig()

// Get the current ref, most methods default to using this ref
// () -> Ref
state.getCurrentRef()

// List all known refs, local and remote.
// TODO Should return a Immutable.Iterable instead ?
// () -> [Ref]
state.listRefs()

// optional ref param
// (Ref) -> Tree
state.getTree(ref)

// optional ref param
// (Ref) -> Tree // TODO return a Tree ?
state.getPendingChanges(ref)

// () -> Store
state._getStore()
```

## RepoFs

### Initialization

#### `createFromConfig`

```js
// RepoConfig -> RepoState
RepoFs.createFromConfig(repoConfig)
```

### Refs

#### `checkout`

```js
// RepoState, Ref -> Promise(RepoState)
RepoFs.checkout(repoState, ref)
```

#### `createRef`

```js
// Creates a new local ref, pointing on the current ref.
// Optionnaly provides a base ref
// RepoState, String, (Ref) -> Promise(RepoState)
RepoFs.createBranch(repoState, name, baseRef)
```

#### `removeBranch`

```js
// Deletes a local ref
// RepoState, Ref -> Promise(RepoState)
RepoFs.removeBranch(repoState, localRef)
```

#### `mergeBranches`
```js
// Merge a ref into another one
// Options object:
// - message: String. Specify the commit message
// Can fail with code `RepoFs.ERR_CONFLICTS`
// RepoState, Ref, Ref, (Object) -> Promise(RepoState, Error)
RepoFs.mergeBranches(repoState, refFrom, refInto, options)
```

See [handling conflicts](#handling-conflicts) to learn how to handle ERR_CONFLICTS.

##### Handling conflicts

When a merge conflict occurs (after commiting or merging two branches), `RepoFs` fails with a `RepoFs.ERR_CONFLICTS` error. This error inherits `Error` and has some additional attributes to allow conflict resolution:

```js
conflictError = {
    code: RepoFs.ERR_CONFLICTS,
    message: String,
    conflicts: Conflict
    resolve: Function // see below
}
```

The `conflicts` contains all the info about the conflict that happened:

```js
Conflict = {
    status: 'identical' | 'diverged',
    base: Ref | Sha,
    head: Ref | Sha, // Can be a Sha after committing in non fast forward
    conflicts: {
        <path>: {
            path: <path>,
            status: 'both-modified' | 'absent-on-base' | 'absent-on-head',
            base: Sha | null, // Sha of the corresponding blob, or null if inexistant
            head: Sha | null
        },
        ...
    }
}
```

Lastly, the `resolve` callback allows to provide a conflict resolution, and returns a Promise of the resulting RepoState:

```js
// (Object), Resolved -> Promise(RepoState)
conflictErr.resolve = function (err, resolved)

// Where `resolved` contains the revoled content for all conflicting files
resolved = {
    <path>: {
        path: <path>,
        buffer: 'Merged content'
    },
    ...
}
```

### Files

#### `stat`

```js
// Get information about a file, on current ref
// RepoState, Path -> Promise(File)
RepoFs.stat(repoState, path)
```

#### `read`

```js
// Get file's content, on current ref
// Options:
// - encoding: String. Default to utf8, provide null to receive an ArrayBuffer
// RepoState, Path -> Promise(String | ArrayBuffer)
RepoFs.read(repoState, path)
```

By default content is returned as an utf8 string, to read file's content as an `ArrayBuffer`, use the `encoding` option.


#### `write`

```js
// Set a file's content, on current ref. Fails if the file doesn't exist
// Can fail with code `RepoFs.ERR_FILE_NOT_FOUND`
// RepoState, Path, String -> Promise(RepoState, Error)
RepoFs.write(repoState, path, newContent)
```

This method will fail if the file doesnt't exist. You can first create the file with  `RepoFs.create`. You can also use `RepoFs.update` to force creation if the file doesn't exist.

### `writeBuffer`

```js
// Same as `write` with a binary array buffer
// Can fail with code `RepoFs.ERR_FILE_NOT_FOUND`
// RepoState, Path, ArrayBuffer -> Promise(RepoState, Error)
RepoFs.writeBuffer(repoState, path, contentBuffer)
```

### `exists`

```js
// Indicates if a file exists on current ref.
// RepoState, Path -> Promise(Boolean)
RepoFs.exists(repoState, path)
```

### `readdir`

```js
// List files in a folder from the current ref
// RepoState, Path -> Promise(Map<Path, File>)
RepoFs.readdir(repoState, folderPath)
```

### `unlink`

```js
// Remove a file from the current ref
// RepoState, Path -> Promise(RepoState)
RepoFs.remove(repoState, 'README.txt')
```

### `rmdir`

```js
// Remove a directory recursively
// RepoState, Path -> Promise(RepoState)
RepoFs.rmdir(repoState, dirPath)
```

### `move`

```js
// Move, or rename a file from the current ref.
// RepoState, Path, Path -> Promise(RepoState)
RepoFs.move(repoState, path, newPath)
```

Alias `rename`.

### `mvdir`

```js
// Move/rename a directory
// RepoState, Path, Path -> Promise(RepoState)
RepoFs.mvdir(repoState, path, newPath)
```
