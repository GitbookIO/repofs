#!/usr/bin/env bash

set -e
set -o pipefail

if [[ -z "$GITHUB_TOKEN" ]] || [[ -z "$GITHUB_REPO"  &&  -z  "$GITHUB_USER"  ]]; then
    cat <<EOF
The github test script requires the following env:
 - GITHUB_TOKEN
 - GITHUB_REPO, or GITHUB_USER and the repo is generated from a timestamp
EOF
    exit 1
fi;

# Random repository name
if [ -z ${GITHUB_REPO+x} ]; then
    TIMESTAMP=$(date +%s)
    GITHUB_REPO=repofs-test-$TIMESTAMP
fi

function createRepo(){
    curl --silent --user "$GITHUB_USER:$GITHUB_TOKEN" --request POST --data @- https://api.github.com/user/repos >/dev/null <<EOF
{
  "name": "$GITHUB_REPO",
  "auto_init": true,
  "private": false,
  "has_issues": false,
  "has_wiki": false,
  "has_downloads": false
}
EOF
}

function deleteRepo() {
    curl --silent --user "$GITHUB_USER:$GITHUB_TOKEN" --request DELETE https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPO
}

# Create repo on GitHub
createRepo
trap "deleteRepo" EXIT

# Run tests on GitHub
echo "Run tests with GitHub, using $GITHUB_REPO"
export REPOFS_DRIVER=github
export REPOFS_HOST=https://api.github.com
export REPOFS_REPO=$GITHUB_USER/$GITHUB_REPO
export REPOFS_TOKEN=$GITHUB_TOKEN

mocha --reporter spec --compilers js:babel-register --bail --timeout 15000
