// ==UserScript==
// @name           Zen Folder Grid
// @description    Shows chosen tabs of a Zen folder as an icon grid above its normal tabs.
// @version        0.1.0
// ==/UserScript==

// The script only sets a mark and changes tab order. It never closes or
// removes a tab. Without the Zen folder API it does nothing.

const ATTR = "zen-folder-grid-icon";
const KEY = "zen-folder-grid-icon";
const DROP_ATTR = "zen-folder-grid-drop";

const STRINGS = {
  en: { toIcon: "Show as Icon", toTab: "Show as Tab" },
  tr: { toIcon: "İkon Yap", toTab: "Normal Sekme Yap" },
};

const CSS = `
:root[zen-sidebar-expanded] #tabbrowser-tabs zen-folder > .tab-group-container:has(> tab[${ATTR}]) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(max(23.7%, calc(var(--tab-min-height) + 4px)), 1fr));
  column-gap: 4px;
  padding-inline-start: 14px;
  & > :not(tab[${ATTR}]) {
    grid-column: 1 / -1;
    margin-inline-start: calc(var(--zen-folder-indent) - 14px) !important;
  }
  & > tab[${ATTR}] {
    margin-inline-start: 0 !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    --toolbarbutton-padding-inner: 0;
    & .tab-content { justify-content: center; }
    & .tab-label-container, & .tab-close-button { display: none !important; }
    & .tab-icon-image, & .tab-icon-overlay { margin-inline-end: 0 !important; }
    & .tab-background { border-radius: var(--border-radius-medium) !important; }
    &:not([visuallyselected], [multiselected="true"]) .tab-background {
      background: var(--zen-toolbar-element-bg);
    }
    &[${DROP_ATTR}="before"] .tab-background { box-shadow: inset 2px 0 0 var(--zen-primary-color); }
    &[${DROP_ATTR}="after"] .tab-background { box-shadow: inset -2px 0 0 var(--zen-primary-color); }
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
  folder.allItems.filter(item => !item.hasAttribute("zen-empty-tab"));

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

function mark(tab) {
  tab.setAttribute(ATTR, "true");
  SessionStore.setCustomTabValue(tab, KEY, "1");
}

function unmark(tab) {
  tab.removeAttribute(ATTR);
  tab.removeAttribute(DROP_ATTR);
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
  const lang = Services.locale.appLocaleAsBCP47.split("-")[0];
  const text = STRINGS[lang] ?? STRINGS.en;
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
// the pointer is over a grid, this code handles the drag; everywhere else Zen
// does. Dragging an icon out of the grid is Zen's drop plus check().

let dropTarget = null;

function clearDrop() {
  dropTarget?.tab.removeAttribute(DROP_ATTR);
  dropTarget = null;
}

/** The grid icon and side under the pointer, or null if not over a grid. */
function gridDropTarget(event) {
  const folder = event.target.closest?.("zen-folder");
  if (!folder || folder.collapsed || folder.isLiveFolder) {
    return null;
  }
  const grid = gridOf(folder).filter(tab => tab.visible);
  if (!grid.length) {
    return null;
  }
  const rects = grid.map(tab => tab.getBoundingClientRect());
  const box = folder.groupContainer.getBoundingClientRect();
  const top = Math.min(...rects.map(r => r.top));
  const bottom = Math.max(...rects.map(r => r.bottom));
  const { clientX: x, clientY: y } = event;
  if (y < top || y >= bottom || x < box.left || x >= box.right) {
    return null;
  }
  // The nearest icon: the same row first, then the horizontal distance.
  let best = 0;
  let bestScore = Infinity;
  rects.forEach((r, i) => {
    const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    const score = dy * 10000 + dx;
    if (score < bestScore) {
      best = i;
      bestScore = score;
    }
  });
  const r = rects[best];
  const after = (x > r.left + r.width / 2) !== window.RTL_UI;
  return { folder, tab: grid[best], after };
}

/** The tabs of a same-window tab drag that can go into a grid, or null. */
function draggedTabs(event) {
  const dt = event.dataTransfer;
  const dragged = dt?.mozGetDataAt("application/x-moz-tabbrowser-tab", 0);
  if (!dragged || dragged.ownerDocument !== document || !gBrowser.isTab(dragged)) {
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

function quietZen() {
  const dnd = gBrowser.tabContainer.tabDragAndDrop;
  dnd?.finishAnimateTabMove?.();
  dnd?.clearDragOverVisuals?.();
  if (dnd?._tabDropIndicator) {
    dnd._tabDropIndicator.hidden = true;
  }
  gZenFolders.highlightGroupOnDragOver?.(null);
}

function onDragOver(event) {
  const target = gridDropTarget(event);
  const tabs = target && draggedTabs(event);
  if (!tabs) {
    clearDrop();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  event.dataTransfer.dropEffect = "move";
  quietZen();
  if (dropTarget?.tab !== target.tab || dropTarget.after !== target.after) {
    clearDrop();
    dropTarget = target;
    if (!tabs.includes(target.tab)) {
      target.tab.setAttribute(DROP_ATTR, target.after ? "after" : "before");
    }
  }
}

function onDrop(event) {
  const target = gridDropTarget(event);
  const tabs = target && draggedTabs(event);
  clearDrop();
  if (!tabs) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  quietZen();
  if (tabs.includes(target.tab)) {
    return;
  }
  for (const tab of tabs) {
    // Folder tabs are pinned and not in Essentials; Zen's own folder drop
    // does the same.
    if (tab.hasAttribute("zen-essential")) {
      gZenPinnedTabManager.removeEssentials(tab, false);
    }
    if (!tab.pinned) {
      gBrowser.pinTab(tab);
    }
    tab.setAttribute(ATTR, "true");
  }
  if (target.after) {
    gBrowser.moveTabsAfter(tabs, target.tab);
  } else {
    gBrowser.moveTabsBefore(tabs, target.tab);
  }
  for (const tab of tabs) {
    // A move that Zen did not do (for example from another space) leaves the
    // tab outside the grid; check() then removes the mark again.
    if (folderOf(tab) === target.folder) {
      mark(tab);
    }
    check(tab);
  }
}

function restoreMark(tab) {
  if (SessionStore.getCustomTabValue(tab, KEY)) {
    tab.setAttribute(ATTR, "true");
  }
}

async function init() {
  await gZenStartup.promiseInitialized;
  windowUtils.loadSheetUsingURIString(
    "data:text/css," + encodeURIComponent(CSS),
    windowUtils.AUTHOR_SHEET
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
  container.addEventListener("dragover", onDragOver, true);
  container.addEventListener("drop", onDrop, true);
  container.addEventListener("dragend", clearDrop, true);
  container.addEventListener("dragleave", event => {
    if (!container.contains(event.relatedTarget)) {
      clearDrop();
    }
  });

  container.addEventListener("SSTabRestoring", e => restoreMark(e.target));
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
