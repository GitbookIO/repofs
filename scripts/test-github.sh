#!/usr/bin/env bash

set -e
set -o pipefail

# This script requires the following env:
#     - GITHUB_TOKEN
#     - GITHUB_REPO

# Run tests on GitHub
echo "Run tests with GitHub, using $GITHUB_REPO"
export REPOFS_MODE=github
export REPOFS_HOST=https://api.github.com
export REPOFS_REPO=$GITHUB_REPO
export REPOFS_TOKEN=$GITHUB_TOKEN
mocha -b --reporter spec --bail --timeout 15000
