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
  api.mainModule('gridstack.js', 'client');
});
