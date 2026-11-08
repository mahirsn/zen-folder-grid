/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// ==UserScript==
// @name           Zen Folder Grid
// @description    Shows chosen tabs of a Zen folder as an icon grid above its normal tabs.
// @version        0.2.0
// ==/UserScript==

// The script only sets a mark and changes tab order. It never closes or
// removes a tab. Without the Zen folder API it does nothing.

const ATTR = "zen-folder-grid-icon";
const KEY = "zen-folder-grid-icon";
const PLACEHOLDER = "zen-folder-grid-placeholder";
const DRAGGING_ATTR = "zen-folder-grid-dragging";
const DRAG_TILE_ATTR = "zen-folder-grid-drag-tile";
const ZONE = "zen-folder-grid-zone";
/** Tile height: Zen's 46px --tab-min-height of Essentials plus 2 * 2px margin. */
const TILE_HEIGHT = 50;
const FAVICON_BG_PREF = "zen.theme.essentials-favicon-bg";
const FAVICON_BG_ATTR = "zen-folder-grid-favicon-bg";

const STRINGS = {
  en: { toIcon: "Show as Icon", toTab: "Show as Tab", zone: "Drop to add as icon" },
  tr: { toIcon: "İkon Yap", toTab: "Normal Sekme Yap", zone: "İkon olarak eklemek için bırak" },
};

let TEXT = STRINGS.en;

const CSS = `
:root[zen-sidebar-expanded] #tabbrowser-tabs zen-folder > .tab-group-container:has(> tab[${ATTR}]) {
  display: grid;
  /* Zen sets --tab-min-height: 46px on #zen-essentials; only the tiles get it here. */
  grid-template-columns: repeat(auto-fit, minmax(max(23.7%, calc(46px + 4px)), 1fr));
  column-gap: 4px;
  padding-inline-start: 14px;
  & > :not(tab[${ATTR}], .${PLACEHOLDER}) {
    grid-column: 1 / -1;
    margin-inline-start: calc(var(--zen-folder-indent) - 14px) !important;
  }
  /* A collapsed folder shows only its active tab: put an active icon first. */
  zen-folder[collapsed] > & > tab[${ATTR}][folder-active] {
    order: -1;
  }
  & > tab[${ATTR}] {
    margin-inline-start: 0 !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
  }
  &[${DRAGGING_ATTR}] > :is(tab[${ATTR}], .${PLACEHOLDER}) {
    transition: var(--tab-dragover-transition);
  }
}

/* The drop area of a folder without icons, as Zen's zen-essentials-promo. */
:root[zen-sidebar-expanded] #tabbrowser-tabs .${ZONE} {
  background: color-mix(in srgb, var(--zen-primary-color) 60%, transparent);
  outline: 1px dashed currentColor;
  border: 1px solid var(--zen-primary-color);
  border-radius: var(--border-radius-medium);
  justify-content: center;
  align-items: center;
  padding: 6px 0;
  margin-block: 2px;
  font-size: smaller;
  font-weight: 600;
  transition: background 0.1s;
  &[dragover] {
    background: color-mix(in srgb, var(--zen-primary-color) 40%, transparent);
    outline: none;
  }
  & > * {
    pointer-events: none;
  }
}

/* The tile look, the same as Zen's .tabbrowser-tab[zen-essential="true"].
   It is also the look of the drag image over a grid. */
:root[zen-sidebar-expanded] #tabbrowser-tabs :is(zen-folder > .tab-group-container > tab[${ATTR}], tab[drag-image][${DRAG_TILE_ATTR}]) {
  --tab-min-height: 46px;
  --toolbarbutton-padding-inner: 0;
  --tab-background-color-selected: light-dark(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.2));

  & .tab-background {
    border-radius: var(--border-radius-medium) !important;
  }
  &:not([visuallyselected], [multiselected="true"]) .tab-background {
    background: var(--zen-toolbar-element-bg);
    border: none;
  }
  & .tab-content {
    display: flex;
    justify-content: center;
  }
  & .tab-label-container,
  & .tab-close-button,
  & .tab-reset-button,
  & .tab-reset-pin-button {
    display: none !important;
  }
  & .tab-icon-image,
  & .tab-icon-overlay {
    margin-inline-end: 0 !important;
  }
  &:hover .tab-background {
    background: light-dark(rgba(0, 0, 0, 0.1), var(--tab-background-color-selected));
  }

  /* Zen uses @media -moz-pref() here, but that works only in browser style
     sheets. The script copies the pref to an attribute instead. */
  :root[${FAVICON_BG_ATTR}] & {
    &[visuallyselected] > .tab-stack > .tab-background {
      &::after {
        content: "";
        inset: -50%;
        filter: blur(20px);
        position: absolute;
        background-size: contain;
        background-clip: padding-box;
        background-image: var(--zen-essential-tab-icon);
        z-index: -1;
        background-position: center;
        fill: currentColor;
        -moz-context-properties: fill, fill-opacity;
        corner-shape: superellipse(var(--zen-squircle-value));
      }

      background: transparent;
      overflow: hidden;
      position: relative;
      --zen-essential-bg-margin: 2px;
      --zen-essential-tab-selected-bg: light-dark(rgba(255, 255, 255, 0.85), color-mix(in srgb, var(--zen-primary-color), rgba(132, 132, 132, 0.85) 40%));
      --zen-essential-tab-selected-bg-hover: light-dark(rgba(255, 255, 255, 0.8), color-mix(in srgb, var(--zen-primary-color), rgba(132, 132, 132, 0.85) 30%));

      :root[zen-default-theme="true"] & {
        --zen-essential-tab-selected-bg: light-dark(rgba(255, 255, 255, 0.85), rgba(68, 64, 64, 0.85));
        --zen-essential-tab-selected-bg-hover: light-dark(rgba(255, 255, 255, 0.8), rgba(68, 64, 64, 0.75));
      }

      &::before {
        background: var(--zen-essential-tab-selected-bg);
        margin: var(--zen-essential-bg-margin);
        border-radius: calc(var(--border-radius-medium) - var(--zen-essential-bg-margin));
        position: absolute;
        inset: 0;
        z-index: 0;
        content: "";
        transition: background 0.1s ease-in-out;
        corner-shape: superellipse(var(--zen-squircle-value));
      }
    }

    &[visuallyselected]:hover .tab-background::before {
      background: var(--zen-essential-tab-selected-bg-hover);
    }
  }

  /* A Glance tab opened from a tile floats on its corner, as on Essentials. */
  & .tabbrowser-tab {
    position: absolute;
    top: 0;
    right: 0;
    --tab-collapsed-width: 34px;
    --tab-min-height: 16px;
    width: var(--tab-collapsed-width) !important;
    z-index: 1;
    pointer-events: none;

    & .tab-background {
      background: light-dark(rgb(249, 249, 249), rgb(63, 63, 63)) !important;
      border: 2px solid light-dark(rgba(0, 0, 0, 0.4), rgba(255, 255, 255, 0.4));
    }
  }
}
`;

const isIcon = tab => tab.hasAttribute(ATTR);

/** The folder a tab may become an icon in, or null. */
function folderOf(tab) {
  const group = tab?.group;
  if (!gBrowser.isTab(tab) || !group?.isZenFolder || group.isLiveFolder) {
    return null;
  }
  if (tab.hasAttribute("zen-empty-tab") || tab.hasAttribute("zen-essential")) {
    return null;
  }
  return group;
}

/** Visible items of a folder in DOM order (tabs, subfolders, split views). */
const itemsOf = folder =>
  folder.allItems.filter(
    item =>
      !item.hasAttribute("zen-empty-tab") &&
      !item.classList.contains(PLACEHOLDER) &&
      !item.classList.contains(ZONE)
  );

/** The leading run of icon tabs of a folder: this is the grid. */
function gridOf(folder) {
  const grid = [];
  for (const item of itemsOf(folder)) {
    if (!gBrowser.isTab(item) || !isIcon(item)) {
      break;
    }
    grid.push(item);
  }
  return grid;
}

/** The favicon behind a selected tile, as Zen's setEssentialTabIcon does. */
function setTileIcon(tab) {
  tab.style.setProperty(
    "--zen-essential-tab-icon",
    `url(${tab.getAttribute("image") ?? ""})`
  );
}

function setIconAttr(tab) {
  tab.setAttribute(ATTR, "true");
  setTileIcon(tab);
}

function mark(tab) {
  setIconAttr(tab);
  SessionStore.setCustomTabValue(tab, KEY, "1");
}

function unmark(tab) {
  tab.removeAttribute(ATTR);
  if (!tab.hasAttribute("zen-essential")) {
    tab.style.removeProperty("--zen-essential-tab-icon");
  }
  if (SessionStore.getCustomTabValue(tab, KEY)) {
    SessionStore.deleteCustomTabValue(tab, KEY);
  }
}

/**
 * Keeps the rule "icons are the first items of their folder".
 * An icon that left the grid (moved below a normal item, out of the folder,
 * into Essentials) becomes a normal tab. A normal tab that landed inside the
 * grid moves to just below it.
 */
function check(tab) {
  if (!tab?.isConnected) {
    return;
  }
  const folder = folderOf(tab);
  if (isIcon(tab)) {
    if (!folder || !gridOf(folder).includes(tab)) {
      unmark(tab);
    }
    return;
  }
  if (!folder) {
    return;
  }
  const items = itemsOf(folder);
  const lastIcon = items.findLast(item => gBrowser.isTab(item) && isIcon(item));
  if (lastIcon && items.indexOf(tab) < items.indexOf(lastIcon)) {
    gBrowser.moveTabAfter(tab, lastIcon);
  }
}

function toIcon(tabs) {
  for (const tab of tabs) {
    const folder = folderOf(tab);
    if (!folder || isIcon(tab)) {
      continue;
    }
    const grid = gridOf(folder);
    mark(tab);
    if (grid.length) {
      gBrowser.moveTabAfter(tab, grid.at(-1));
    } else {
      const first = itemsOf(folder)[0];
      if (first !== tab) {
        gBrowser.moveTabBefore(tab, first);
      }
    }
  }
}

function toTab(tabs) {
  for (const tab of [...tabs].reverse()) {
    const folder = folderOf(tab);
    if (!folder || !isIcon(tab)) {
      continue;
    }
    const last = gridOf(folder).findLast(icon => icon !== tab);
    unmark(tab);
    if (last) {
      gBrowser.moveTabAfter(tab, last);
    }
  }
}

function contextTabs() {
  const tab = TabContextMenu.contextTab;
  return tab?.multiselected ? gBrowser.selectedTabs : [tab];
}

function initMenu() {
  const text = TEXT;
  const menu = document.getElementById("tabContextMenu");
  const make = (id, label, run) => {
    const item = document.createXULElement("menuitem");
    item.id = id;
    item.setAttribute("label", label);
    item.addEventListener("command", () => run(contextTabs()));
    return item;
  };
  const iconItem = make("context_zenFolderGridIcon", text.toIcon, toIcon);
  const tabItem = make("context_zenFolderGridTab", text.toTab, toTab);
  const anchor = document.getElementById("context_zenMoveToFolder");
  if (anchor?.parentElement === menu) {
    anchor.after(iconItem, tabItem);
  } else {
    menu.append(iconItem, tabItem);
  }
  menu.addEventListener("popupshowing", event => {
    if (event.target !== menu) {
      return;
    }
    const tabs = contextTabs().filter(folderOf);
    iconItem.hidden = !tabs.some(tab => !isIcon(tab));
    tabItem.hidden = !tabs.some(isIcon);
  });
}

// Drag and drop. Zen's own code lays out tabs in one column and finds the drop
// place from the vertical position only, so it can not drop into a grid. While
// the pointer is over a grid, this code handles the drag the way Zen handles
// Essentials (ZenDragAndDrop.js, #animateVerticalPinnedGridDragOver): the
// tiles move aside to open a gap, and the drag image becomes a tile.
// Everywhere else Zen does the drag. Dragging an icon out of the grid is
// Zen's drop plus check().

const TAB_DROP_TYPE = "application/x-moz-tabbrowser-tab";

/** The drag over one grid, or null. */
let over = null;
/** The drag image state: the size and look it had before it became a tile. */
let image = null;

/** The tab being dragged in this window, or null. */
function draggedTab(event) {
  const tab = event.dataTransfer?.mozGetDataAt(TAB_DROP_TYPE, 0);
  return tab && tab.ownerDocument === document && gBrowser.isTab(tab)
    ? tab
    : null;
}

/** The tabs of a same-window tab drag that can go into a grid, or null. */
function draggedTabs(event) {
  const dragged = draggedTab(event);
  if (!dragged) {
    return null;
  }
  const tabs = dragged._dragData?.movingTabs ?? [dragged];
  const ok = tabs.every(
    tab =>
      gBrowser.isTab(tab) &&
      !tab.group?.hasAttribute("split-view-group") &&
      !tab.hasAttribute("zen-empty-tab") &&
      !tab.hasAttribute("zen-glance-tab")
  );
  return ok ? tabs : null;
}

/** The layout box of an element without its transform, relative to box. */
function slotOf(element, box) {
  const r = element.getBoundingClientRect();
  const m = new DOMMatrix(getComputedStyle(element).transform);
  return { x: r.left - m.m41 - box.left, y: r.top - m.m42 - box.top, w: r.width, h: r.height };
}

/** The index of the slot nearest to a point: the same row first. */
function nearestSlot(slots, x, y) {
  let best = 0;
  let bestScore = Infinity;
  slots.forEach((r, i) => {
    const dy = y < r.y ? r.y - y : y > r.y + r.h ? y - r.y - r.h : 0;
    const dx = x < r.x ? r.x - x : x > r.x + r.w ? x - r.x - r.w : 0;
    const score = dy * 10000 + dx;
    if (score < bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/** True if the point (relative to the folder container) is over the slots. */
function overSlots(slots, box, x, y) {
  const top = Math.min(...slots.map(r => r.y));
  const bottom = Math.max(...slots.map(r => r.y + r.h));
  return y >= top && y < bottom && x >= 0 && x < box.width;
}

/** The folder whose grid is under the pointer, or null. */
function gridFolder(event) {
  const folder = event.target.closest?.("zen-folder");
  if (!folder || folder.collapsed || folder.isLiveFolder) {
    return null;
  }
  const box = folder.groupContainer.getBoundingClientRect();
  const x = event.clientX - box.left;
  const y = event.clientY - box.top;
  if (over?.folder === folder) {
    return overSlots(over.slots, box, x, y) ? folder : null;
  }
  const grid = gridOf(folder).filter(tab => tab.visible);
  if (!grid.length) {
    return null;
  }
  return overSlots(grid.map(tab => slotOf(tab, box)), box, x, y) ? folder : null;
}

/** Starts the drag over the grid of a folder. */
function enterGrid(folder, dragged) {
  const container = folder.groupContainer;
  const grid = gridOf(folder).filter(tab => tab.visible);
  let moving = dragged;
  let placeholder = null;
  if (!grid.includes(dragged)) {
    // A tab from outside needs a free cell, as Zen's _fakeEssentialTab.
    placeholder = document.createXULElement("vbox");
    placeholder.className = PLACEHOLDER;
    placeholder.style.height = grid[0].getBoundingClientRect().height + "px";
    grid.at(-1).after(placeholder);
    moving = placeholder;
  }
  const tiles = placeholder ? [...grid, placeholder] : grid;
  for (const tile of tiles) {
    tile.style.transform = "";
  }
  container.setAttribute(DRAGGING_ATTR, "true");
  const box = container.getBoundingClientRect();
  const slots = tiles.map(tile => slotOf(tile, box));
  const index = tiles.indexOf(moving);
  over = { folder, tiles, slots, moving, placeholder, origin: index, index };
}

/** Moves the tiles so the gap is at the slot under the pointer. */
function updateGrid(event) {
  const box = over.folder.groupContainer.getBoundingClientRect();
  const index = nearestSlot(
    over.slots,
    event.clientX - box.left,
    event.clientY - box.top
  );
  if (index === over.index) {
    return;
  }
  over.index = index;
  const order = over.tiles.filter(tile => tile !== over.moving);
  order.splice(index, 0, over.moving);
  order.forEach((tile, i) => {
    const from = over.slots[over.tiles.indexOf(tile)];
    const to = over.slots[i];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    tile.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
  });
}

/** Ends the drag over a grid. animate: let the tiles slide back. */
function leaveGrid({ animate = true } = {}) {
  if (!over) {
    return;
  }
  const container = over.folder.groupContainer;
  if (!animate) {
    container.removeAttribute(DRAGGING_ATTR);
  }
  for (const tile of over.tiles) {
    tile.style.transform = "";
  }
  over.placeholder?.remove();
  over = null;
}

/** Shows the drag image as a tile (on) or as a tab row (off), as Zen does. */
function setDragImageTile(event, on, tile = null) {
  const dnd = gBrowser.tabContainer.tabDragAndDrop;
  const args = dnd?.originalDragImageArgs;
  const wrapper = args?.[0];
  if (!wrapper || on === !!image?.tile) {
    return;
  }
  const clones = [...wrapper.children].filter(child => gBrowser.isTab(child));
  if (on) {
    image ??= { width: wrapper.style.width, height: wrapper.style.height };
    image.tile = true;
    wrapper.style.width = tile.w + "px";
    wrapper.style.height = tile.h + "px";
    for (const clone of clones) {
      clone.setAttribute(DRAG_TILE_ATTR, "true");
      clone.style.minWidth = clone.style.maxWidth = tile.w + "px";
      clone.style.minHeight = clone.style.maxHeight = tile.h + "px";
    }
    event.dataTransfer.updateDragImage(wrapper, tile.w / 2, tile.h / 2);
    return;
  }
  image.tile = false;
  // A tile dragged out takes the size of a tab row, as an Essential does.
  const dragged = draggedTab(event);
  let { width, height } = image;
  if (isIcon(dragged)) {
    const row = gBrowser.tabs.find(
      tab => tab.visible && !isIcon(tab) && !tab.hasAttribute("zen-essential")
    );
    if (row) {
      const r = row.getBoundingClientRect();
      width = r.width + "px";
      height = r.height + "px";
    }
  }
  wrapper.style.width = width;
  wrapper.style.height = height;
  for (const clone of clones) {
    clone.removeAttribute(DRAG_TILE_ATTR);
    clone.style.minWidth = clone.style.maxWidth = "";
    clone.style.minHeight = clone.style.maxHeight = "";
  }
  event.dataTransfer.updateDragImage(...args);
}

/** The drop area shown in a folder without icons while a tab is dragged. */
let zone = null;

function removeZone() {
  zone?.element.remove();
  zone = null;
}

/** The folder without icons under the pointer that can take the drag. */
function zoneFolder(event) {
  const folder = event.target.closest?.("zen-folder");
  if (
    !folder ||
    folder.collapsed ||
    folder.isLiveFolder ||
    gridOf(folder).length ||
    !draggedTabs(event)
  ) {
    return null;
  }
  return folder;
}

function showZone(folder) {
  if (zone?.folder === folder) {
    return;
  }
  removeZone();
  const element = document.createXULElement("hbox");
  element.className = ZONE;
  const label = document.createXULElement("label");
  label.setAttribute("value", TEXT.zone);
  element.append(label);
  const first = itemsOf(folder)[0];
  if (first) {
    first.before(element);
  } else {
    folder.groupContainer.append(element);
  }
  zone = { folder, element };
}

/** True if the pointer is over the drop area. */
function overZone(event) {
  if (!zone) {
    return false;
  }
  const r = zone.element.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
}

/** The size of a new tile in a folder, as Zen's #essentialTileRect. */
function newTileSize(folder) {
  const width = folder.groupContainer.getBoundingClientRect().width;
  return { w: Math.max(width * 0.237, TILE_HEIGHT), h: TILE_HEIGHT };
}

/** Pins a tab and takes it out of Essentials, as Zen's folder drop does. */
function prepareForFolder(tab) {
  if (tab.hasAttribute("zen-essential")) {
    gZenPinnedTabManager.removeEssentials(tab, false);
  }
  if (!tab.pinned) {
    gBrowser.pinTab(tab);
  }
  setIconAttr(tab);
}

/**
 * Zen's drop landing: on macOS the OS slides the drag image onto the new
 * place of the tab (ZenDragAndDrop.js, #landDragImage). Call before the move.
 * @returns {Function} Call it after the move.
 */
function prepareLanding(event) {
  const dnd = gBrowser.tabContainer.tabDragAndDrop;
  if (window.gReduceMotion || !dnd?._landDragImageOnElements) {
    return () => {};
  }
  const elements = dnd._dragImageTabs ?? [draggedTab(event)];
  const placesBefore = new Map(elements.map(e => [e, dnd._placeOf(e)]));
  return () => dnd._landDragImageOnElements(elements, placesBefore);
}

/** Marks the dropped tabs that are now in the folder; check() does the rest. */
function finishDrop(tabs, folder) {
  for (const tab of tabs) {
    // A move that Zen did not do (for example from another space) leaves the
    // tab outside the grid; check() then removes the mark again.
    if (folderOf(tab) === folder) {
      mark(tab);
    }
    check(tab);
  }
}

function quietZen() {
  const dnd = gBrowser.tabContainer.tabDragAndDrop;
  dnd?.finishAnimateTabMove?.();
  dnd?.clearDragOverVisuals?.();
  if (dnd?._tabDropIndicator) {
    dnd._tabDropIndicator.hidden = true;
  }
  gZenFolders.highlightGroupOnDragOver?.(null);
}

function onDragStart(event) {
  const tab = event.target.closest?.("tab");
  if (tab && isIcon(tab) && folderOf(tab)) {
    // The tile stays hidden while it is dragged, as an Essential does. Zen
    // shows it again on dragend.
    tab.style.visibility = "hidden";
  }
}

function onDragOver(event) {
  const emptyFolder = zoneFolder(event);
  if (emptyFolder) {
    showZone(emptyFolder);
  } else {
    removeZone();
  }
  if (overZone(event)) {
    leaveGrid();
    event.preventDefault();
    event.stopImmediatePropagation();
    event.dataTransfer.dropEffect = "move";
    quietZen();
    zone.element.setAttribute("dragover", "true");
    setDragImageTile(event, true, newTileSize(zone.folder));
    return;
  }
  zone?.element.removeAttribute("dragover");

  const folder = gridFolder(event);
  const tabs = folder && draggedTabs(event);
  if (!tabs) {
    leaveGrid();
    setDragImageTile(event, false);
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  event.dataTransfer.dropEffect = "move";
  quietZen();
  if (over?.folder !== folder) {
    leaveGrid();
    enterGrid(folder, draggedTab(event));
  }
  setDragImageTile(event, true, over.slots[0]);
  updateGrid(event);
}

function onDrop(event) {
  if (overZone(event) && draggedTabs(event)) {
    const tabs = draggedTabs(event);
    const { folder } = zone;
    event.preventDefault();
    event.stopImmediatePropagation();
    quietZen();
    removeZone();
    const land = prepareLanding(event);
    tabs.forEach(prepareForFolder);
    const first = itemsOf(folder)[0];
    if (!first) {
      folder.addTabs(tabs);
    } else if (first !== tabs[0] || tabs.length > 1) {
      gBrowser.moveTabsBefore(tabs, first);
    }
    finishDrop(tabs, folder);
    land();
    return;
  }
  removeZone();
  const folder = gridFolder(event);
  const tabs = folder && draggedTabs(event);
  if (!tabs || over?.folder !== folder) {
    leaveGrid({ animate: false });
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  quietZen();
  const { index, origin, moving, tiles } = over;
  const others = tiles.filter(
    tile => tile !== moving && gBrowser.isTab(tile) && !tabs.includes(tile)
  );
  // The tiles are already where the drop puts them: end the drag without a
  // transition, so nothing jumps when the DOM changes.
  leaveGrid({ animate: false });
  if (index === origin && tabs.length === 1) {
    return;
  }
  const land = prepareLanding(event);
  tabs.forEach(prepareForFolder);
  if (others.length) {
    if (index < others.length) {
      gBrowser.moveTabsBefore(tabs, others[index]);
    } else {
      gBrowser.moveTabsAfter(tabs, others.at(-1));
    }
  }
  finishDrop(tabs, folder);
  land();
}

function onDragEnd() {
  removeZone();
  leaveGrid({ animate: false });
  // Grids left with animate keep the transition until the drag ends.
  for (const container of document.querySelectorAll(`[${DRAGGING_ATTR}]`)) {
    container.removeAttribute(DRAGGING_ATTR);
  }
  image = null;
}

function restoreMark(tab) {
  if (SessionStore.getCustomTabValue(tab, KEY)) {
    setIconAttr(tab);
  }
}

async function init() {
  await gZenStartup.promiseInitialized;
  TEXT = STRINGS[Services.locale.appLocaleAsBCP47.split("-")[0]] ?? STRINGS.en;
  windowUtils.loadSheetUsingURIString(
    "data:text/css," + encodeURIComponent(CSS),
    windowUtils.AUTHOR_SHEET
  );
  const syncFaviconBg = () =>
    document.documentElement.toggleAttribute(
      FAVICON_BG_ATTR,
      Services.prefs.getBoolPref(FAVICON_BG_PREF, false)
    );
  syncFaviconBg();
  Services.prefs.addObserver(FAVICON_BG_PREF, syncFaviconBg);
  window.addEventListener("unload", () =>
    Services.prefs.removeObserver(FAVICON_BG_PREF, syncFaviconBg)
  );
  for (const tab of gBrowser.tabs) {
    restoreMark(tab);
  }
  // Only remove marks that are out of place here; never move tabs at startup.
  for (const tab of gBrowser.tabs) {
    if (isIcon(tab)) {
      check(tab);
    }
  }
  initMenu();

  const container = gBrowser.tabContainer;
  container.addEventListener("dragstart", onDragStart);
  container.addEventListener("dragover", onDragOver, true);
  container.addEventListener("drop", onDrop, true);
  container.addEventListener("dragend", onDragEnd, true);
  container.addEventListener("dragleave", event => {
    if (!container.contains(event.relatedTarget)) {
      leaveGrid();
      removeZone();
    }
  });

  container.addEventListener("SSTabRestoring", e => restoreMark(e.target));
  container.addEventListener("TabAttrModified", e => {
    if (isIcon(e.target) && e.detail.changed.includes("image")) {
      setTileIcon(e.target);
    }
  });
  // Check after the running move ends, so Zen's own move code is never
  // changed in the middle.
  const later = tab => queueMicrotask(() => check(tab));
  container.addEventListener("TabMove", e => later(e.target));
  container.addEventListener("TabUnpinned", e => later(e.target));
  container.addEventListener("TabGrouped", e => later(e.detail));
  container.addEventListener("TabUngrouped", e => later(e.detail));
}

if (window.gBrowser && window.gZenFolders && window.gZenStartup) {
  init().catch(console.error);
}
