import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';
import { ReactiveVar } from 'meteor/reactive-var';
import { GridStack } from 'meteor/dupontbertrand:gridstack';
import './gridstack-tests.html';

// Runs in a real browser: meteortesting:mocha with TEST_BROWSER_DRIVER=playwright (see test.sh).

function assertEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`);
}

const flush = () => new Promise((resolve) => {
  Tracker.flush();
  setTimeout(resolve, 0);
});

let destroyedItems = 0;
Template.gridStackTestItem.onDestroyed(() => { destroyedItems += 1; });

let itemClicks = [];
Template.gridStackTestItem.events({
  'click .test-item'() {
    itemClicks.push(this.id);
  },
});

let hostClicks = [];
Template.gridStackTestHost.events({
  'click .grid-stack-item'(event) {
    hostClicks.push(event.currentTarget.gridstackNode.id);
  },
});

// Blaze 3.0 always uses jQuery; Blaze 3.1 uses it only when the app has it.
const blazeUsesJquery = () => Blaze._DOMBackend._hasJQuery ?? true;

describe('gridStack environment', function () {
  it('lets Blaze use jQuery exactly when the jquery package is present', function () {
    const jqueryPresent = Boolean(Package.jquery);
    console.log(`    (jquery package ${jqueryPresent ? 'present' : 'absent'}, Blaze ${blazeUsesJquery() ? 'with' : 'without'} jQuery)`);
    assertEqual(blazeUsesJquery(), jqueryPresent, 'Blaze DOM backend');
  });
});

describe('gridStack', function () {
  let container;
  let view;
  let items;
  let changes;
  let grid;

  async function render(initialItems) {
    items = new ReactiveVar(initialItems);
    changes = [];
    grid = null;
    container = document.createElement('div');
    container.style.width = '400px';
    document.body.appendChild(container);
    view = Blaze.renderWithData(Template.gridStack, () => ({
      items: items.get(),
      itemTemplate: 'gridStackTestItem',
      options: { column: 4, cellHeight: 50, margin: 0, animate: false, mode: 'float' },
      onChange: (layout) => changes.push(layout),
      onReady: (instance) => { grid = instance; },
    }), container);
    await flush();
  }

  const elements = () => [...container.querySelectorAll('.grid-stack-item')];
  const positions = () => elements()
    .map(({ gridstackNode: { id, x, y, w, h } }) => ({ id, x, y, w, h }))
    .sort((first, second) => first.id.localeCompare(second.id));

  afterEach(function () {
    if (view) Blaze.remove(view);
    container?.remove();
    view = null;
  });

  it('renders one item per entry, at its position, with the item template', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 2, h: 1, label: 'A' }, { id: 'b', x: 2, y: 1, w: 1, h: 2, label: 'B' }]);
    assertEqual(positions(), [{ id: 'a', x: 0, y: 0, w: 2, h: 1 }, { id: 'b', x: 2, y: 1, w: 1, h: 2 }], 'positions');
    assertEqual([...container.querySelectorAll('.grid-stack-item-content .test-item')].map((element) => element.textContent).sort(), ['A', 'B'], 'labels');
  });

  it('passes the GridStack instance to onReady', async function () {
    await render([]);
    if (!(grid instanceof GridStack)) throw new Error('onReady did not receive a GridStack instance');
  });

  it('adds, removes and moves items when the items change', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1, label: 'A' }, { id: 'b', x: 1, y: 0, w: 1, h: 1, label: 'B' }]);
    destroyedItems = 0;
    items.set([{ id: 'b', x: 3, y: 2, w: 1, h: 1, label: 'B' }, { id: 'c', x: 0, y: 1, w: 2, h: 1, label: 'C' }]);
    await flush();
    assertEqual(positions(), [{ id: 'b', x: 3, y: 2, w: 1, h: 1 }, { id: 'c', x: 0, y: 1, w: 2, h: 1 }], 'positions');
    assertEqual(destroyedItems, 1, 'views destroyed with their removed item');
  });

  it('keeps the item data reactive', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1, label: 'before' }]);
    items.set([{ id: 'a', x: 0, y: 0, w: 1, h: 1, label: 'after' }]);
    await flush();
    assertEqual(container.querySelector('.test-item').textContent, 'after', 'label');
    assertEqual(elements().length, 1, 'element count');
  });

  it('does not call onChange for changes that come from the items', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }]);
    items.set([{ id: 'a', x: 2, y: 3, w: 2, h: 1 }, { id: 'b', x: 0, y: 0, w: 1, h: 1 }]);
    await flush();
    assertEqual(changes, [], 'onChange calls');
  });

  it('calls onChange with the whole layout when the grid changes', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }, { id: 'b', x: 1, y: 0, w: 1, h: 1 }]);
    const element = elements().find((candidate) => candidate.gridstackNode.id === 'a');
    grid.update(element, { x: 3, y: 2 });
    await flush();
    assertEqual(changes.length, 1, 'onChange calls');
    assertEqual(changes[0].sort((first, second) => first.id.localeCompare(second.id)),
      [{ id: 'a', x: 3, y: 2, w: 1, h: 1 }, { id: 'b', x: 1, y: 0, w: 1, h: 1 }], 'layout');
  });

  it('runs the event maps of the item template', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1, label: 'A' }, { id: 'b', x: 1, y: 0, w: 1, h: 1, label: 'B' }]);
    itemClicks = [];
    [...container.querySelectorAll('.test-item')].find((element) => element.textContent === 'B').click();
    await flush();
    assertEqual(itemClicks, ['b'], 'item clicks');
  });

  it('lets the enclosing template handle events on the grid items', async function () {
    const hostItems = new ReactiveVar([{ id: 'a', x: 0, y: 0, w: 1, h: 1, label: 'A' }, { id: 'b', x: 1, y: 0, w: 1, h: 1, label: 'B' }]);
    container = document.createElement('div');
    container.style.width = '400px';
    document.body.appendChild(container);
    view = Blaze.renderWithData(Template.gridStackTestHost, () => ({
      items: hostItems.get(),
      options: { column: 4, cellHeight: 50, margin: 0, animate: false, mode: 'float' },
    }), container);
    await flush();
    hostClicks = [];
    [...container.querySelectorAll('.test-item')].find((element) => element.textContent === 'A').click();
    hostItems.set([...hostItems.get(), { id: 'c', x: 2, y: 0, w: 1, h: 1, label: 'C' }]);
    await flush();
    [...container.querySelectorAll('.test-item')].find((element) => element.textContent === 'C').click();
    await flush();
    assertEqual(hostClicks, ['a', 'c'], 'host clicks, including on an item added later');
  });

  it('removes the item views when the component is destroyed', async function () {
    await render([{ id: 'a', x: 0, y: 0, w: 1, h: 1 }, { id: 'b', x: 1, y: 0, w: 1, h: 1 }]);
    destroyedItems = 0;
    Blaze.remove(view);
    view = null;
    await flush();
    assertEqual(destroyedItems, 2, 'destroyed item views');
  });
});
