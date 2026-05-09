# macOS Packaging

CopClip uses electron-builder to produce unsigned local macOS artifacts.

## Commands

Build the Electron bundles and package macOS DMG/ZIP artifacts:

```sh
npm run pack:mac
```

Build an unpacked `.app` for faster local smoke testing:

```sh
npm run pack:mac:dir
```

Artifacts are written to `dist/`.

## Smoke Verification

After `npm run pack:mac:dir`, launch `dist/mac-arm64/CopClip.app` on Apple Silicon or `dist/mac/CopClip.app` on Intel.

Verify:

- The desktop shell opens on launch.
- The menu bar item appears.
- The configured global shortcut opens the clipboard popup.
- Copying text adds it to history.
- Selecting a history item restores it to the system clipboard.
- Settings changes persist after quitting and relaunching the packaged app.
- Clipboard history persists after quitting and relaunching the packaged app.

## Signing

The local MVP package is intentionally unsigned with `mac.identity: null`. Signed and notarized distribution should be added before public release.
