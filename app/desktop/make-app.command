#!/bin/bash
# Build "ADAMAS.app" on your Desktop with the ADAMAS logo icon. Double-click this
# file once. It needs no admin rights and installs nothing — it uses macOS's
# built-in sips + iconutil to turn the bundled logo into an app icon, then writes
# a small launcher app that starts ADAMAS (via Docker) and opens it in your
# browser. Re-run any time to rebuild.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"        # .../app/desktop
APP_DIR="$(cd "$DIR/.." && pwd)"            # .../app  (has docker-compose.yml)
SRC_PNG="$DIR/icon-1024.png"
DEST="$HOME/Desktop/ADAMAS.app"

if [ ! -f "$SRC_PNG" ]; then
  echo "Logo not found at $SRC_PNG"; exit 1
fi
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  echo "docker-compose.yml not found next to this script ($APP_DIR)."; exit 1
fi

echo "==> Building app icon from the ADAMAS logo…"
WORK="$(mktemp -d)"
ICONSET="$WORK/ADAMAS.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  d=$((s * 2))
  sips -z "$s" "$s" "$SRC_PNG" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z "$d" "$d" "$SRC_PNG" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
cp "$SRC_PNG" "$ICONSET/icon_512x512@2x.png"
iconutil -c icns "$ICONSET" -o "$WORK/ADAMAS.icns"

echo "==> Assembling ADAMAS.app on your Desktop…"
rm -rf "$DEST"
mkdir -p "$DEST/Contents/MacOS" "$DEST/Contents/Resources"
cp "$WORK/ADAMAS.icns" "$DEST/Contents/Resources/ADAMAS.icns"

cat > "$DEST/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>ADAMAS</string>
  <key>CFBundleDisplayName</key><string>ADAMAS</string>
  <key>CFBundleIdentifier</key><string>local.adamas.launcher</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>ADAMAS</string>
  <key>CFBundleIconFile</key><string>ADAMAS</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

# Launcher: starts Docker + the ADAMAS container, then opens the browser.
# The repo path is baked in so the app works from /Applications or the Dock.
cat > "$DEST/Contents/MacOS/ADAMAS" <<LAUNCHER
#!/bin/bash
APP_DIR="$APP_DIR"
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:\$PATH"

if ! docker info >/dev/null 2>&1; then
  open -a Docker || true
  for _ in \$(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
fi

cd "\$APP_DIR" || exit 1
docker compose up -d >/dev/null 2>&1 || true

for _ in \$(seq 1 40); do
  curl -fsS http://localhost:8787/api/health >/dev/null 2>&1 && break
  sleep 1
done
open "http://localhost:8787"
LAUNCHER
chmod +x "$DEST/Contents/MacOS/ADAMAS"

# Nudge Finder to pick up the new icon.
touch "$DEST"
rm -rf "$WORK"

echo ""
echo "Done. 'ADAMAS.app' is on your Desktop."
echo "Double-click it to launch ADAMAS; drag it to your Dock or /Applications to keep it handy."
