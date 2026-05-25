# CopClip

<p align="center">
  <strong>A lightweight clipboard manager for macOS.</strong>
</p>

<p align="center">
  Capture text, links, HTML, and images. Search recent clips. Restore or auto-paste from a compact keyboard-friendly popup.
</p>

<p align="center">
  <a href="https://github.com/Brucennnnn/copclip/releases/tag/v0.1.0">Download macOS build</a>
  ·
  <a href="#development">Development</a>
  ·
  <a href="#packaging">Packaging</a>
</p>

## Highlights

- Fast clipboard history for text, links, HTML, and images.
- Compact popup opened with `Command+Shift+V`.
- Search, keyboard navigation, number shortcuts, and Escape dismissal.
- Restore clipboard items or auto-paste into the active app.
- Pin, unpin, delete, and clear history actions.
- SQLite-backed local history with deduplication and most-recent ordering.
- Menu bar controls for popup access, capture pause/resume, settings, and quit.
- Desktop settings shell for shortcuts, history limits, popup sizing, privacy, and theme.

## Download

The latest packaged Apple Silicon build is available on GitHub Releases:

```text
https://github.com/Brucennnnn/copclip/releases/tag/v0.1.0
```

Available artifacts:

- `CopClip-0.1.0-arm64.dmg`
- `CopClip-0.1.0-arm64.zip`

The current macOS build is unsigned and not notarized, so macOS may show a Gatekeeper warning on first launch.

## Development

Install dependencies:

```sh
npm install
```

Run the app in development mode:

```sh
npm run dev
```

Run tests:

```sh
npm test
```

Typecheck and build the Electron bundles:

```sh
npm run build
```

The development and test scripts rebuild the native SQLite binding for the runtime they are about to use. If you need to do that manually:

```sh
npm run rebuild:sqlite:electron
npm run rebuild:sqlite:node
```

## Popup Access

On macOS, CopClip opens the compact clipboard popup with `Command+Shift+V` while the app is running in the background. The normal app window opens to the desktop History view; the compact popup is a separate window opened by the global shortcut or by the menu bar `Open Popup` command.

On Linux Wayland, CopClip enables Electron's global-shortcut portal so `Ctrl+Shift+V` can open the popup. If the shortcut is already owned by your compositor or another app, change it in Settings.

If your Wayland compositor does not deliver Electron global shortcuts, bind the compositor shortcut to CopClip's popup command instead:

```sh
cd /home/inwpuun/project/copclip && npm run open:popup --silent
```

## Packaging

Package the macOS app locally:

```sh
npm run pack:mac
```

For faster packaged-app smoke testing, build only the unpacked app:

```sh
npm run pack:mac:dir
```

Packaging outputs are written to `dist/`. See `docs/packaging/macos.md` for the smoke checklist and signing notes.

## Current Scope

CopClip currently includes:

- Electron main process lifecycle for desktop and popup windows.
- Secure preload bridge exposing app info, settings, and typed clipboard-history APIs.
- Main-process clipboard polling while the app is running.
- SQLite-backed history with empty-item filtering, deduplication, pin-aware pruning, image thumbnails, and search filtering.
- React desktop shell with History controls, Settings, Privacy, and Advanced sections.
- React clipboard popup with draggable top bar, live search, item labels, thumbnails, mouse selection, keyboard selection, and history actions.
- Restore and auto-paste actions for text, links, HTML, and images.
- Menu bar item with Open Popup, Open Desktop Shell, Pause or Resume Capture, Clear History, Settings, About & Privacy, Hide Dock Icon, and Quit commands.
- Local settings for global hotkey, history limit, popup size, and theme.
- Cursor-aware popup positioning constrained to the active display work area.
- Tailwind CSS renderer styling with Phosphor React icons.
- Vitest coverage for the app shell, popup behavior, preload API contract, clipboard history, image persistence, search, restore selection, dismissal, and popup positioning.
- Unsigned local macOS packaging with electron-builder DMG/ZIP targets.
