#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Skip API tests
export REPOFS_SKIP_API_TEST=true

mocha --reporter spec --bail --timeout 15000
