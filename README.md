# dupontbertrand:gridstack

A Blaze component for [gridstack.js](https://gridstackjs.com): drag-and-drop, resizable grid layouts driven by reactive data.

```html
{{> gridStack items=widgets itemTemplate="card" options=gridOptions onChange=onLayoutChange}}
```

You pass the items, the component keeps the grid in line with them: items that appear are added, items that disappear are removed, items whose position changes are moved. When the user drags or resizes, `onChange` gets the new layout. Changes made by another client (another tab, another user) show up live.

Meteor 3, Blaze 3, gridstack 14 (bundled, no npm install needed). The component itself does not use jQuery: Blaze 3.0 apps still need the `jquery` package because Blaze 3.0 requires it, Blaze 3.1 apps do not.

## Install

```bash
meteor add dupontbertrand:gridstack
```

## Usage

```html
<template name="dashboard">
  {{> gridStack items=widgets itemTemplate="card" options=gridOptions onChange=onLayoutChange}}
</template>

<template name="card">
  <div class="card">{{title}}</div>
</template>
```

```js
import 'meteor/dupontbertrand:gridstack';

Template.dashboard.helpers({
  widgets: () => Widgets.find().map(({ _id, ...widget }) => ({ id: _id, ...widget })),
  gridOptions: () => ({ column: 12, cellHeight: 80, margin: 8 }),
  onLayoutChange() {
    return (layout) => Meteor.callAsync('widgets.saveLayout', layout);
  },
});
```

## Parameters

| Parameter | Description |
|---|---|
| `items` | Array of `{ id, x, y, w, h, ... }`. Reactive. Any [GridStackWidget](https://github.com/gridstack/gridstack.js/tree/master/doc) field (`minW`, `maxH`, `noResize`, `locked`...) is passed through. Each item is also the data context of its `itemTemplate`, and that data stays reactive. |
| `itemTemplate` | Name of the template rendered inside each item. |
| `options` | [GridStackOptions](https://github.com/gridstack/gridstack.js/tree/master/doc), read once when the grid is created. |
| `onChange(layout)` | Called after the user moves or resizes items, with `[{ id, x, y, w, h }]` for every item. Not called for changes that come from `items`, so saving the layout does not loop. |
| `onReady(grid)` | Receives the `GridStack` instance, for anything the component does not cover (`grid.willItFit()`, `grid.engine.findEmptyPosition()`...). |

`GridStack` is also exported: `import { GridStack } from 'meteor/dupontbertrand:gridstack'`.

## How it works

gridstack creates, moves and removes the item elements itself, so the component never renders them with `{{#each}}`: Blaze and gridstack would fight over the same DOM nodes. The component adds items through the gridstack API and renders `itemTemplate` inside each item's content element with `Blaze.renderWithData`. Views are removed when their item goes away and when the component is destroyed.

## Tests

```bash
./test.sh
```

Runs the tests in a headless Chromium with `meteortesting:mocha` and Playwright, on Blaze 3.1. Playwright is installed once in `~/.cache/blaze-gridstack-test-runner`, outside the package, because Meteor treats a `node_modules` directory inside a package as part of the package.

## License

MIT
