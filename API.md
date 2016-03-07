# repofs API

New API after refactor


## RepoState

The state of the full working directory is stored in this object. This object is immutable, but remains efficient because of reuse of unchanged values between instances.

It contains the following data:

- `RepoConfig` instance
- Current branch name
- Trees for every branch (cached)
- Pending changes for trees
- `Store`, to access persistent storage, used for caching (in memory, local storage, etc.)

## RepoConfig

Immutable structure, holding:

- Repository name (`"owner/repo"`)
- Hostname
- Committer (name and email)
- Access token

## Store

TODO How to guarantee the validity of cached values, across multiple instance ?
Maybe we will need to keep a virtual store index (immutable) to keep track of each cached value, and salt the keys with unique ids ?

An object that must implement the following instance methods:

``` js
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

``` js
// Create a new store, with an optional namespace for stored keys
// (String) -> Store
createStore(namespace)
```

