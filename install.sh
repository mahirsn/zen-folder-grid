#!/usr/bin/env bash
# Installs Zen Folder Grid with fx-autoconfig on Linux.
# Usage: ./install.sh [zen install folder]
set -euo pipefail

FXAC_URL="https://codeload.github.com/MrOtherGuy/fx-autoconfig/tar.gz/refs/heads/master"
SCRIPT_URL="https://raw.githubusercontent.com/mahirsn/zen-folder-grid/main/folder-grid.uc.mjs"
SINE_URL="https://github.com/CosmoCreeper/Sine"

die() { echo "Error: $*" >&2; exit 1; }

if pgrep -x zen-bin >/dev/null || pgrep -x zen >/dev/null; then
  die "Zen is running. Close Zen, then run this script again."
fi

# 1. The Zen install folder.
zen_dir="${1:-}"
if [[ -z "$zen_dir" ]]; then
  for bin in zen-browser zen; do
    if command -v "$bin" >/dev/null; then
      d=$(dirname "$(readlink -f "$(command -v "$bin")")")
      [[ -f "$d/application.ini" ]] && zen_dir="$d" && break
    fi
  done
fi
if [[ -z "$zen_dir" ]]; then
  for d in /opt/zen-browser-bin /opt/zen-browser /opt/zen /usr/lib/zen-browser /usr/lib64/zen-browser; do
    [[ -f "$d/application.ini" ]] && zen_dir="$d" && break
  done
fi
if [[ -z "$zen_dir" ]]; then
  if command -v flatpak >/dev/null && flatpak info app.zen_browser.zen >/dev/null 2>&1; then
    die "Zen is a Flatpak. Flatpak and AppImage installs cannot load fx-autoconfig."
  fi
  die "Zen not found. Give its install folder: ./install.sh /path/to/zen"
fi
[[ -f "$zen_dir/application.ini" ]] || die "$zen_dir is not a Zen install folder."
echo "Zen: $zen_dir"

# 2. The Zen profile.
root=""
for d in "$HOME/.zen" "${XDG_CONFIG_HOME:-$HOME/.config}/zen"; do
  [[ -f "$d/profiles.ini" ]] && root="$d" && break
done
[[ -n "$root" ]] || die "No Zen profile found. Open Zen once, then run this script again."
mapfile -t profiles < <(sed -n 's/^Path=//p' "$root/profiles.ini")
[[ ${#profiles[@]} -gt 0 ]] || die "No profile in $root/profiles.ini."
if [[ ${#profiles[@]} -eq 1 ]]; then
  profile="${profiles[0]}"
else
  echo "Profiles:"
  for i in "${!profiles[@]}"; do echo "  $((i + 1))) ${profiles[$i]}"; done
  read -rp "Choose a profile [1-${#profiles[@]}]: " n
  [[ "$n" =~ ^[0-9]+$ ]] && ((n >= 1 && n <= ${#profiles[@]})) || die "No such profile."
  profile="${profiles[$((n - 1))]}"
fi
[[ "$profile" == /* ]] || profile="$root/$profile"
chrome="$profile/chrome"
echo "Profile: $profile"

if [[ -e "$chrome/sine-mods" || -e "$chrome/JS/sine.sys.mjs" ]]; then
  echo "This profile uses Sine. fx-autoconfig would break it."
  echo "Install the mod in Sine instead: Sine settings > add mod > mahirsn/zen-folder-grid"
  echo "See $SINE_URL"
  exit 1
fi

# 3. Get the files.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$FXAC_URL" | tar xz -C "$tmp"
fxac="$tmp/fx-autoconfig-master"
here=$(dirname "$(readlink -f "$0")")
if [[ -f "$here/folder-grid.uc.mjs" ]]; then
  cp "$here/folder-grid.uc.mjs" "$tmp/"
else
  curl -fsSL "$SCRIPT_URL" -o "$tmp/folder-grid.uc.mjs"
fi

# Copies a file; an old, different file is kept as <name>.bak.
put() {
  local src=$1 dst=$2 sudo=$3
  if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
    return
  fi
  if [[ -f "$dst" ]]; then
    $sudo cp "$dst" "$dst.bak"
    echo "Backup: $dst.bak"
  fi
  $sudo install -D -m 644 "$src" "$dst"
}

# 4. The program files.
sudo=""
if [[ ! -w "$zen_dir" || ! -w "$zen_dir/defaults/pref" ]]; then
  sudo="sudo"
  echo "Writing to $zen_dir needs sudo."
fi
if [[ -f "$zen_dir/config.js" ]] && grep -qi sine "$zen_dir/config.js"; then
  die "$zen_dir/config.js loads Sine. Install the mod in Sine instead ($SINE_URL)."
fi
put "$fxac/program/config.js" "$zen_dir/config.js" "$sudo"
put "$fxac/program/defaults/pref/config-prefs.js" "$zen_dir/defaults/pref/config-prefs.js" "$sudo"

# 5. The profile files.
for f in "$fxac"/profile/chrome/utils/*; do
  put "$f" "$chrome/utils/$(basename "$f")" ""
done
put "$tmp/folder-grid.uc.mjs" "$chrome/JS/folder-grid.uc.mjs" ""

echo
echo "Done. Open Zen."
echo "If the grid menu does not show, open about:support, click \"Clear startup cache\" and restart Zen."
