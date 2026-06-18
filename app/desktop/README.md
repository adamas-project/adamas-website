# ADAMAS desktop app (macOS)

Turn ADAMAS into a real Mac app with the ADAMAS logo icon — launchable from the
Dock, Launchpad, or Spotlight.

## One-time setup

In Finder, open `app/desktop/` and **double-click `make-app.command`**.
(If macOS blocks it: right-click → Open, or run `bash make-app.command` in Terminal.)

It builds **`ADAMAS.app`** on your Desktop. Double-click it to:
1. start Docker if it isn't running,
2. start the ADAMAS container, and
3. open ADAMAS at http://localhost:8787 in your browser.

Drag `ADAMAS.app` to your Dock or `/Applications` to keep it handy.

## Notes

- The app is a thin launcher; the actual ADAMAS service runs in Docker from this
  repo, so keep this folder where it is (the repo path is baked into the app).
  Re-run `make-app.command` if you move the repo.
- The icon source is `icon-1024.png` (rendered from `adamas-icon.svg`). Replace
  it and re-run `make-app.command` to change the icon.
- No admin rights needed; nothing is installed system-wide.
