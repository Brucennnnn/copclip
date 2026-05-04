# Settings UI Follow-up Plan

The refactored settings window includes disabled controls for visual parity with the target UI. These controls should stay disabled until their backing behavior exists.

## General

- Run in background: define whether this means hide Dock icon, keep menu bar active, or both; then connect it to existing Dock/menu bar behavior.
- iCloud sync: choose a persistence and conflict model before adding account or sync state UI.
- Always paste as Plain Text: add a persisted setting and apply it in the restore/paste pipeline.

## Privacy

- Screen sharing visibility: detect active capture sessions where possible and decide whether hiding the popup/settings window is required.
- Link previews: add preview fetching only after defining network privacy rules and cache behavior.
- Confidential/transient filtering: add detectors in clipboard capture before persisted history writes.
- Ignore applications: capture source application metadata and add add/remove controls backed by persisted bundle identifiers.

## Shortcuts

- Shortcut clearing: support nullable shortcuts in validation and unregister behavior.
- Pinboard navigation and Paste Stack: define pinboard data model first, then enable shortcut registration.
- Reset defaults: expose a settings reset IPC that preserves unsupported future settings safely.

## Subscription

- Management: replace the placeholder with the chosen licensing or purchase provider once product packaging requires it.
