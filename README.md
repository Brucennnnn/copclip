# CopClip

CopClip is a lightweight Electron clipboard manager for macOS. The current implementation includes the Electron, TypeScript, preload, and renderer foundation plus clipboard history capture for text, links, HTML, and images, restore, global hotkey popup access, and a separate desktop shell for configuration-oriented workflows.

## Development

Install dependencies:

```sh
npm install
```

Run the app in development mode:

```sh
npm run dev
```

On Linux Wayland, CopClip enables Electron's global-shortcut portal so `Ctrl+Shift+V` can open the clipboard popup. The normal app window opens to the desktop History view; the compact "Clipboard history" popup is the separate window opened by the global hotkey or by the tray/menu-bar "Open Popup" command. If the shortcut is already owned by your compositor or another app, change it in Settings.

If your Wayland compositor does not deliver Electron global shortcuts, bind the compositor shortcut to CopClip's popup command instead:

```sh
cd /home/inwpuun/project/copclip && npm run open:popup --silent
```

The development and test scripts rebuild the native SQLite binding for the runtime they are about to use. If you need to do that manually:

```sh
npm run rebuild:sqlite:electron
npm run rebuild:sqlite:node
```

Run tests:

```sh
npm test
```

Typecheck and build the Electron bundles:

```sh
npm run build
```

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

The scaffold includes:

- Electron main process lifecycle for a development window.
- A secure preload bridge that exposes app info, settings, and typed clipboard-history read/subscribe APIs.
- Main-process clipboard polling for text, links, HTML, and images while the app is running.
- `Command+Shift+V` global shortcut registration for opening the popup while CopClip is running in the background.
- SQLite-backed clipboard history with empty-item filtering, deduplication, most-recent ordering, pin-aware pruning, truncated previews, HTML plain-text previews, image thumbnail data, search filtering, and clear/delete/pin/unpin actions.
- A main desktop shell with History controls, Settings, Privacy, and Advanced sections for configuration and management workflows.
- A compact React clipboard popup with draggable top bar, live history search, text/link/HTML labels, image thumbnails, mouse selection, keyboard selection, and history action controls.
- Restore and auto-paste actions for clicked text, link, HTML, and image items, arrow/Enter selection, number shortcuts, and Escape dismissal.
- A menu bar item with Open Popup, Open Desktop Shell, Pause or Resume Capture, Clear History, Settings, About & Privacy, Hide Dock Icon, and Quit commands.
- Local settings for global hotkey, history limit, popup size, and theme, with validation and runtime behavior updates.
- Cursor-aware popup positioning constrained to the active display work area, with the popup above other windows while visible.
- Tailwind CSS renderer styling with Phosphor React icons, based on `docs/design/initial-app-shell.html`.
- Vitest coverage for the desktop shell, quick popup, exposed preload API contract, typed clipboard history, image persistence, deduplication, search behavior, restore selection, dismissal, search focus, and deterministic popup positioning.
- Unsigned local macOS packaging with electron-builder DMG/ZIP targets and an unpacked-app smoke test path.
