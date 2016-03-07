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
- Pending changes for trees
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

```js
// As in Git. Has a name and type: remote, tag, head...
Ref = String

// A SHA hash
Sha = String

// A file path like 'folder/README.md'
Path = String

// A file and its info
File = {
    name: String,
    path: Path,
    type: String, // "file", etc?
    isDirectory: Boolean,
    size: Number, // Characters count
    sha: Sha,
    content: String,
    mime: String, // like "application/octet-stream"
    url: String // "protocol://..."

}
```

with protocol being The `url` can be an `http(s)` url (for GitHub), or a `data` url (for Memory and LocalStore).

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

```js
// RepoConfig -> RepoState
RepoFs.createFromConfig = function (repoConfig)
```

```js
// RepoState, Ref -> RepoState
RepoFs.checkout = function (repoState, ref)
```

```js
// Get information about a file
// RepoState, Path -> Promise(File)
RepoFs.stat(repoState, path)
```
