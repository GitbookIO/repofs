#!/usr/bin/env bash
set -eo pipefail
IFS=$'\n\t'

if [[ -z "$GITHUB_TOKEN" ]]; then
    cat <<EOF
The uhub test script requires the following env:
 - GITHUB_TOKEN
EOF
    exit 1
fi;

./scripts/download-uhub.sh

echo "Prepare tests for uhub"

# Create temporary repository for uhub
REPO_PATH=$(pwd)/.tmp/repo/
rm -rf $REPO_PATH
mkdir -p $REPO_PATH
# Initialize the repo like GitHub
cd $REPO_PATH
git init .
echo "# $GITHUB_REPO\n" > README.md
git add README.md
git commit -m "Initial commit"
cd -

# Start uhub
./uhub --mode=single --root=$REPO_PATH --port=127.0.0.1:6666 > /dev/null  &
UHUBPID=$!
function cleanUp() {
    kill -s 9 $UHUBPID
    rm -rf $REPO_PATH
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

mocha --reporter spec --bail --timeout 15000
