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

Package.onTest(function (api) {
  // Tests run on Blaze 3.1, which drops the jQuery requirement of Blaze 3.0.
  api.use('blaze-html-templates@3.1.0-alpha.0', 'client');
  // Loads mocha before the tests, so that describe/it exist when they run.
  api.use(['meteortesting:mocha', 'ecmascript', 'templating', 'blaze', 'tracker', 'reactive-var', 'dupontbertrand:gridstack'], 'client');
  api.addFiles('gridstack-tests.html', 'client', { lazy: true });
  api.mainModule('gridstack-tests.js', 'client');
});
