#!/usr/bin/env bash

set -e
set -o pipefail

# This script requires the following env:
#     - GITHUB_TOKEN
#     - GITHUB_REPO

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
