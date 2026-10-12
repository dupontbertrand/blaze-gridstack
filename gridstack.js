import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';
import { ReactiveVar } from 'meteor/reactive-var';
import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
import './gridstack.html';

// gridstack comes from the app (`meteor npm install gridstack`), so that security
// updates come straight from npm. The version is checked before gridstack is loaded,
// hence require() rather than import, which would be hoisted above the check.
checkNpmVersions({ gridstack: '12.x || 13.x || 14.x' }, 'dupontbertrand:gridstack');
const { GridStack } = require('gridstack');
require('gridstack/dist/gridstack.min.css');

export { GridStack };

// {{> gridStack items=items itemTemplate="card" options=options onChange=onChange onReady=onReady}}
//
// gridstack owns the grid DOM (it creates, moves and removes the item elements);
// Blaze only renders `itemTemplate` inside each item's content element. That is
// why items are never rendered with {{#each}}.
//
// - items: [{ id, x, y, w, h, ...anything }] — reactive. Items are added, removed
//   and moved to match; each item is also the data context of its itemTemplate.
//   gridstack fields such as minW/maxH/noResize are passed through.
// - itemTemplate: name of the template rendered in each item.
// - options: GridStack options, read once at init.
// - onChange(layout): called after the user moves or resizes items, with
//   [{ id, x, y, w, h }] for every item. Not called for changes coming from `items`.
// - onReady(grid): receives the GridStack instance (willItFit, engine…).

const POSITION_KEYS = ['x', 'y', 'w', 'h'];

function layoutOf(grid) {
  return grid.engine.nodes.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));
}

function addItem(instance, item) {
  const { id, ...widget } = item;
  const element = instance.grid.addWidget({ ...widget, id: String(id) });
  const content = element.querySelector('.grid-stack-item-content');
  const template = Template[instance.data.itemTemplate];
  // Reactive data: the item template follows the latest version of its item.
  const data = () => instance.items.get().find((candidate) => String(candidate.id) === String(id)) ?? item;
  instance.views.set(String(id), Blaze.renderWithData(template, data, content));
}

function removeElement(instance, element) {
  const id = element.gridstackNode.id;
  Blaze.remove(instance.views.get(id));
  instance.views.delete(id);
  instance.grid.removeWidget(element, true, false);
}

// Brings the grid in line with `items` without reporting it through onChange.
function sync(instance, items) {
  const { grid } = instance;
  const wanted = new Map(items.map((item) => [String(item.id), item]));
  instance.syncing = true;
  grid.batchUpdate();
  try {
    for (const element of grid.getGridItems()) {
      const item = wanted.get(element.gridstackNode.id);
      if (!item) {
        removeElement(instance, element);
        continue;
      }
      wanted.delete(element.gridstackNode.id);
      const moved = POSITION_KEYS.some((key) => item[key] !== undefined && item[key] !== element.gridstackNode[key]);
      if (moved) grid.update(element, { x: item.x, y: item.y, w: item.w, h: item.h });
    }
    wanted.forEach((item) => addItem(instance, item));
  } finally {
    grid.batchUpdate(false);
    instance.syncing = false;
  }
}

Template.gridStack.onRendered(function () {
  const instance = this;
  instance.views = new Map();
  instance.items = new ReactiveVar([]);
  instance.grid = GridStack.init(instance.data.options ?? {}, instance.find('.grid-stack'));
  instance.grid.on('change', () => {
    if (!instance.syncing) instance.data.onChange?.(layoutOf(instance.grid));
  });

  instance.autorun(() => {
    const items = Template.currentData().items ?? [];
    instance.items.set(items);
    Tracker.nonreactive(() => sync(instance, items));
  });

  instance.data.onReady?.(instance.grid);
});

Template.gridStack.onDestroyed(function () {
  this.views.forEach((view) => Blaze.remove(view));
  this.grid.destroy(false);
});
