#!/bin/bash
# Runs the package tests in a real Chromium (meteortesting:mocha + Playwright).
#
#   ./test.sh                 one run, exits with the number of failures
#   ./test.sh --port 3300     any extra option is passed to meteor test-packages
#
# Playwright lives outside the package on purpose: Meteor treats a node_modules
# directory inside a package as part of the package. The browser driver loads
# it from the working directory, so the tests run from that runner directory.
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/blaze-gridstack-test-runner"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
[ -f package.json ] || echo '{ "private": true }' > package.json
[ -d node_modules/playwright ] || meteor npm install --no-audit --no-fund --save-dev playwright
meteor npx playwright install chromium

TEST_BROWSER_DRIVER=playwright exec meteor test-packages "$PACKAGE_DIR" --once --driver-package meteortesting:mocha "$@"
