#!/usr/bin/env bash

# Only run tests local/internal tests

TESTS=$(find test/ -iname "*.js" | grep -v 'github.js')

mocha --reporter spec $TESTS
