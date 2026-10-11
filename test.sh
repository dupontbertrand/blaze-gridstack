#!/bin/bash
# Runs the package tests in a real Chromium (meteortesting:mocha + Playwright),
# against every supported setup:
#   Blaze 3.1 without jQuery, Blaze 3.1 with jQuery, Blaze 3.0 (which requires jQuery).
#
#   ./test.sh                 all setups, exits non-zero if any of them fails
#   ./test.sh --port 3300     any extra option is passed to meteor test-packages
#
# Playwright and jQuery live outside the package on purpose: Meteor treats a
# node_modules directory inside a package as part of the package. The browser
# driver and the jquery package load them from the working directory, so the
# tests run from that runner directory.
set -uo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/blaze-gridstack-test-runner"
RUN_TIMEOUT="${RUN_TIMEOUT:-300}"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR" || exit 1
[ -f package.json ] || echo '{ "private": true }' > package.json
[ -d node_modules/playwright ] || meteor npm install --no-audit --no-fund --save-dev playwright jquery || exit 1
[ -d node_modules/jquery ] || meteor npm install --no-audit --no-fund --save-dev jquery || exit 1
meteor npx playwright install chromium || exit 1

failed=()
for setup in "3.1 0" "3.1 1" "3.0 1"; do
  read -r blaze jquery <<< "$setup"
  label="Blaze $blaze $([ "$jquery" = 1 ] && echo with || echo without) jQuery"
  echo "=== $label"
  # meteortesting does not always stop when the client fails to boot: cap each run.
  if ! TEST_BLAZE="$blaze" TEST_JQUERY="$jquery" TEST_BROWSER_DRIVER=playwright \
    timeout "$RUN_TIMEOUT" meteor test-packages "$PACKAGE_DIR" --once --driver-package meteortesting:mocha "$@"; then
    failed+=("$label")
  fi
done

if [ ${#failed[@]} -gt 0 ]; then
  printf 'FAILED: %s\n' "${failed[@]}"
  exit 1
fi
echo "All setups passed."
