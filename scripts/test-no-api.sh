#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Skip API tests
export REPOFS_SKIP_API_TEST=true

# mocha --debug-brk
mocha --reporter spec --compilers js:babel-register --bail --timeout 15000
