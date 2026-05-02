# CopClip

CopClip is a lightweight Electron clipboard manager for macOS. The current implementation includes the Electron, TypeScript, preload, and renderer foundation plus text clipboard history capture, restore, global hotkey popup access, and a separate desktop shell for configuration-oriented workflows.

## Development

Install dependencies:

```sh
npm install
```

Run the app in development mode:

```sh
npm run dev
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

## Current Scope

The scaffold includes:

- Electron main process lifecycle for a development window.
- A secure preload bridge that exposes app info and typed clipboard-history read/subscribe APIs.
- Main-process text clipboard polling while the app is running.
- `Command+Shift+V` global shortcut registration for opening the popup while CopClip is running in the background.
- SQLite-backed text history with empty-item filtering, deduplication, most-recent ordering, truncated previews, search filtering, and pruning.
- A main desktop shell with History, Settings, Privacy, and Advanced sections for configuration and future management workflows.
- A compact React clipboard popup with live history search, mouse selection, and keyboard selection.
- Restore-to-clipboard actions for clicked items, arrow/Enter selection, number shortcuts, and Escape dismissal.
- Cursor-aware popup positioning constrained to the active display work area, with the popup above other windows while visible.
- Styling based on `docs/design/initial-app-shell.html`.
- Vitest coverage for the desktop shell, quick popup, exposed preload API contract, text history, deduplication, search behavior, restore selection, dismissal, search focus, and deterministic popup positioning.

The app intentionally does not include menu bar controls or packaging yet. Those are tracked by follow-up issues.
