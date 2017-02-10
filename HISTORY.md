# Release notes
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

### 8.1.0

- Add options `clean` and `cleanBase` on `BranchUtils.create` to transfer changes to the new branch

### 8.0.1

- Fix corruption of files when using `FileUtils.move` on a modified/created file

### 8.0.0

- **Breaking Change:** Signature of `Author.create` changed from `Author.create(name, email)` to `Author.create({ name, email })`
- Branches have a `commit` property

### 7.9.0

- Added `CommitUtils.fetchComparison` method
- Added models for `FileDiff` and `Comparison`

### 7.8.0

- Added `RepoUtils.isClean` method
