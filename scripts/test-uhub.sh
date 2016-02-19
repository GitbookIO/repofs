#!/usr/bin/env bash

set -e
set -o pipefail

# This script requires the following env:
#     - GITHUB_TOKEN
#     - GITHUB_REPO

UHUB_VERSION=2.2.3

# Download Uhub
if [ "$(uname)" == "Darwin" ]; then
    UHUB_NAME=uhub_darwin_amd64
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    UHUB_NAME=uhub_linux_amd64
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    UHUB_NAME=uhub_windows_amd64.exe
fi

if [ -f uhub ];
then
    echo "uhub already exist."
else
    echo "Downloading uhub"
    github-releases --tag $UHUB_VERSION --filename $UHUB_NAME --token $GITHUB_TOKEN download GitbookIO/uhub
    mv $UHUB_NAME uhub
    chmod +x uhub
fi

echo "Prepare tests for uhub"

# Create temporaty repository for uhub
rm -rf .tmp/repo
mkdir -p .tmp/repo

# Initialize it as a Git repos
git init .tmp/repo
cd .tmp/repo
touch README.md
git add README.md
git commit -m "Initial commit"
cd ../..

REPO_PATH=$(pwd)/.tmp/repo/

# Start uhub
./uhub --mode=single --root=$REPO_PATH --port=127.0.0.1:6666 > /dev/null  &
UHUBPID=$!
trap 'kill -s 9 $UHUBPID' EXIT

# Wait for uhub to be ready
sleep 2

# Run tests on uHub
echo "Run tests for uhub"
export REPOFS_MODE=uhub
export REPOFS_HOST=http://localhost:6666
export REPOFS_REPO=user/repo
export REPOFS_TOKEN=

mocha -b --reporter spec --bail --timeout 15000
