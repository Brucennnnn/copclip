# CopClip

CopClip is a lightweight Electron clipboard manager for macOS. The current implementation is the initial app shell for issue #2: it establishes the Electron, TypeScript, preload, and renderer foundation that later clipboard-history slices will extend.

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
- A secure preload bridge that exposes only the `copclip.getAppInfo()` renderer API.
- A React renderer shell with placeholder clipboard history and settings surfaces.
- Styling based on `docs/design/initial-app-shell.html`.
- Vitest coverage for the public app shell and exposed preload API contract.

The scaffold intentionally does not include clipboard capture, SQLite history, global hotkeys, cursor-positioned popup behavior, menu bar controls, or packaging yet. Those are tracked by follow-up issues.
