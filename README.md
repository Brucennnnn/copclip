# CopClip

CopClip is a lightweight Electron clipboard manager for macOS. The current implementation includes the Electron, TypeScript, preload, and renderer foundation plus the first text clipboard-history slice.

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

## Current Scope

The scaffold includes:

- Electron main process lifecycle for a development window.
- A secure preload bridge that exposes app info and typed clipboard-history read/subscribe APIs.
- Main-process text clipboard polling while the app is running.
- In-memory text history with empty-item filtering, deduplication, most-recent ordering, truncated previews, and search filtering.
- A React renderer shell with live clipboard history search and settings placeholder surfaces.
- Styling based on `docs/design/initial-app-shell.html`.
- Vitest coverage for the public app shell, exposed preload API contract, text history, deduplication, and search behavior.

The app intentionally does not include SQLite history, restore-to-clipboard selection, global hotkeys, cursor-positioned popup behavior, menu bar controls, or packaging yet. Those are tracked by follow-up issues.
