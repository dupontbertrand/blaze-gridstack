Package.describe({
  name: 'dupontbertrand:gridstack',
  version: '0.1.0',
  summary: 'Blaze component for gridstack.js: declarative, reactive drag-and-drop grid layouts',
  git: 'https://github.com/dupontbertrand/blaze-gridstack',
  documentation: 'README.md',
});

Npm.depends({ gridstack: '14.0.0' });

Package.onUse(function (api) {
  api.versionsFrom('3.0');
  api.use(['ecmascript', 'templating', 'blaze', 'tracker', 'reactive-var'], 'client');
  api.addFiles('gridstack.html', 'client', { lazy: true });
  api.mainModule('gridstack.js', 'client');
});

// Test matrix, set by test.sh: TEST_BLAZE=3.1 (default) or 3.0, TEST_JQUERY=1 to add
// jQuery. Blaze 3.1 works with or without jQuery; Blaze 3.0 requires it.
const testBlaze = process.env.TEST_BLAZE || '3.1';
const testJquery = process.env.TEST_JQUERY === '1' || testBlaze === '3.0';

Package.onTest(function (api) {
  api.use(testBlaze === '3.0' ? 'blaze-html-templates@3.0.0' : 'blaze-html-templates@3.1.0-alpha.0', 'client');
  if (testJquery) api.use('jquery', 'client');
  // Loads mocha before the tests, so that describe/it exist when they run.
  api.use(['meteortesting:mocha', 'ecmascript', 'templating', 'blaze', 'tracker', 'reactive-var', 'dupontbertrand:gridstack'], 'client');
  api.addFiles('gridstack-tests.html', 'client', { lazy: true });
  api.mainModule('gridstack-tests.js', 'client');
});
