# Zen Folder Grid

A [Zen Browser](https://zen-browser.app) script. It shows chosen tabs of a folder
as an icon grid at the top of the folder, like Essentials. The normal tabs of
the folder stay below the grid.

- Right-click a tab in a folder: **Show as Icon** / **Show as Tab**.
- Drag a tab onto the grid to add it. Drag inside the grid to change the order.
  Drag an icon out of the grid to make it a normal tab again.
- The marks stay after a restart. The script never closes or removes a tab.

Tested on Zen 1.23b.

## Install

The script needs [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).

1. Copy `program/config.js` and `program/defaults/` of fx-autoconfig into the
   Zen install folder (for example `/opt/zen-browser-bin`).
2. Copy `profile/chrome/utils/` of fx-autoconfig into `<profile>/chrome/utils/`.
3. Copy `folder-grid.uc.mjs` into `<profile>/chrome/JS/`.
4. Restart Zen. If the script does not load, open `about:support`, click
   "Clear startup cache", and restart again.
