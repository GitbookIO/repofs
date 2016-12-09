#!/usr/bin/env bash
set -eo pipefail
IFS=$'\n\t'

./scripts/download-uhub.sh

echo "Prepare tests for uhub"

# Create temporary repository for uhub
REPO_PATH=$(pwd)/.tmp/repo/
REMOTE_PATH=$(pwd)/.tmp/repo-remote.git/
rm -rf $REPO_PATH
mkdir -p $REPO_PATH
rm -rf $REMOTE_PATH
mkdir -p $REMOTE_PATH

# Initialize the remote
function initRemote() {
    cd $REMOTE_PATH
    git --bare init .
    cd -
}
initRemote >/dev/null

# Initialize the repo like GitHub
function initRepo() {
    cd $REPO_PATH
    git init .
    echo "# Uhub test repository\n" > README.md
    git add README.md
    git commit -m "Initial commit"
    git remote add origin $REMOTE_PATH
    git remote add test $REMOTE_PATH
    cd -
}
initRepo >/dev/null

# Start uhub
./uhub --mode=single --root=$REPO_PATH --port=127.0.0.1:6666 > /dev/null  &
UHUBPID=$!
function cleanUp() {
    kill -s 9 $UHUBPID
    rm -rf $REPO_PATH
    rm -rf $REMOTE_PATH
}
# Cleanup on exit
trap cleanUp EXIT

# Wait for uhub to be ready
sleep 2

# Run tests on uHub
echo "Run tests for uhub"
export REPOFS_DRIVER=uhub
export REPOFS_HOST=http://localhost:6666
export REPOFS_REPO=user/repo

mocha --reporter spec --compilers js:babel-register --bail --timeout 15000
