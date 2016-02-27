#!/usr/bin/env bash

set -e
set -o pipefail

if [ -z "$GITHUB_TOKEN" ] || [ [ -z "$GITHUB_REPO" ]  && [ -z  "$GITHUB_USER"] ]; then
    cat <<EOF
The github test script requires the following env:
 - GITHUB_TOKEN
 - GITHUB_REPO, or GITHUB_USER and the repo is generated randomly
EOF
    exit 1
fi;

# Random repository name
if [ -z ${GITHUB_REPO+x} ]; then
    GITHUB_REPO=$GITHUB_USER/repofs-test-$(( ( RANDOM % 10 )  + 1 ))
fi

# Run tests on GitHub
echo "Run tests with GitHub, using $GITHUB_REPO"
export REPOFS_MODE=github
export REPOFS_HOST=https://api.github.com
export REPOFS_REPO=$GITHUB_REPO
export REPOFS_TOKEN=$GITHUB_TOKEN
mocha -b --reporter spec --bail --timeout 15000
