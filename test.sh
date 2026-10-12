#!/bin/bash
# Runs the package tests in a real Chromium (meteortesting:mocha + Playwright),
# against every supported setup: Blaze 3.1 without jQuery, Blaze 3.1 with jQuery and
# Blaze 3.0 (which requires jQuery) on the latest gridstack, then the older gridstack
# majors on Blaze 3.1.
#
#   ./test.sh                 all setups, exits non-zero if any of them fails
#   ./test.sh --port 3300     any extra option is passed to meteor test-packages
#
# Playwright, jQuery and gridstack live outside the package on purpose: Meteor
# treats a node_modules directory inside a package as part of the package. They
# are the npm dependencies of a small runner app, and the tests run from it.
set -uo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER_APP="${XDG_CACHE_HOME:-$HOME/.cache}/blaze-gridstack-test-runner/app"
RUN_TIMEOUT="${RUN_TIMEOUT:-300}"

# The runner is a minimal Meteor app: run from inside an app, test-packages builds
# against that app's node_modules, which is where gridstack comes from in real apps.
# static-html is removed because it would also claim the .html files.
if [ ! -d "$RUNNER_APP/.meteor" ]; then
  meteor create --bare "$RUNNER_APP" >/dev/null || exit 1
  (cd "$RUNNER_APP" && meteor remove static-html >/dev/null) || exit 1
fi
cd "$RUNNER_APP" || exit 1
[ -d node_modules/playwright ] || meteor npm install --no-audit --no-fund --save-dev playwright || exit 1
[ -d node_modules/jquery ] || meteor npm install --no-audit --no-fund --save-dev jquery || exit 1
meteor npx playwright install chromium || exit 1

failed=()
for setup in "3.1 0 14.0.0" "3.1 1 14.0.0" "3.0 1 14.0.0" "3.1 0 13.3.0" "3.1 0 12.6.0"; do
  read -r blaze jquery gridstack <<< "$setup"
  label="Blaze $blaze $([ "$jquery" = 1 ] && echo with || echo without) jQuery, gridstack $gridstack"
  echo "=== $label"
  meteor npm install --save-dev --no-audit --no-fund --loglevel=error "gridstack@$gridstack" || { failed+=("$label (install)"); continue; }
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
