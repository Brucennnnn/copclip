---
title: Electron macOS Clipboard Manager
labels:
  - needs-triage
---

## Problem Statement

macOS users need a lightweight clipboard manager that behaves like a quick command palette for recent clipboard content. The app should stay out of the way while continuously preserving useful clipboard history, then open near the cursor on demand so the user can search, select, and reuse copied content without context switching.

Users also need the app to respect privacy-sensitive workflows. Clipboard history should be stored locally, ignored applications should be configurable, and the product should make it clear that sensitive content is not transmitted elsewhere.

## Solution

Build a lightweight Electron clipboard manager for macOS. The app runs in the background, watches for clipboard changes, stores supported clipboard items locally, and opens a compact popup near the current cursor position when the user presses a global shortcut such as Command+Shift+V.

The popup behaves like a Maccy-style history picker. Search input is focused immediately, results filter as the user types, pinned clips stay at the top, and the user can select an item with the mouse, Enter, arrow keys, or number shortcuts. Selecting an item writes that clip back to the system clipboard. The MVP may stop there and rely on the user pressing Command+V manually. Automatic paste into the previously focused application is a follow-up because it may require native macOS helpers.

Use Electron with TypeScript, a renderer UI built with React or Vue, a secure preload bridge for IPC, SQLite for clipboard history, electron-store for settings, and electron-builder for packaging.

## User Stories

1. As a macOS user, I want copied text to be saved automatically, so that I can reuse text I copied earlier.
2. As a macOS user, I want copied links to be saved automatically, so that I can quickly reopen or paste URLs.
3. As a macOS user, I want copied HTML to be saved with useful metadata, so that rich clipboard content can be reused where supported.
4. As a macOS user, I want copied images to be saved automatically, so that screenshots and visual snippets remain available.
5. As a macOS user, I want duplicate clipboard entries to be handled cleanly, so that my history is not filled with repeated items.
6. As a macOS user, I want the most recently copied items to appear first, so that the most relevant clips are easiest to reach.
7. As a macOS user, I want pinned clips to stay at the top, so that frequently used snippets remain available even as history changes.
8. As a macOS user, I want to unpin a pinned clip, so that it returns to normal history behavior.
9. As a macOS user, I want to delete one clipboard item, so that I can remove content I no longer need.
10. As a macOS user, I want to clear all clipboard history, so that I can reset the app's stored content.
11. As a macOS user, I want local-only storage, so that my clipboard data does not leave my computer.
12. As a macOS user, I want a clear privacy explanation, so that I understand what the app stores and where it stores it.
13. As a macOS user, I want the app to run in the menu bar, so that it is available without occupying normal app space.
14. As a macOS user, I want the option to hide the dock icon, so that the app feels like a background utility.
15. As a macOS user, I want to open the clipboard popup with Command+Shift+V, so that I can access history from anywhere.
16. As a macOS user, I want to customize the global hotkey, so that it does not conflict with my other apps.
17. As a macOS user, I want the app to register the global shortcut even when it is not focused, so that clipboard history is always accessible.
18. As a macOS user, I want clear feedback if a hotkey cannot be registered, so that I can choose a different shortcut.
19. As a macOS user, I want the popup to open near my cursor, so that selection happens where my attention already is.
20. As a macOS user with multiple displays, I want the popup to stay within the visible display bounds, so that it never opens off-screen.
21. As a macOS user, I want the popup to stay above other windows while open, so that I can select a clip without losing it behind another app.
22. As a macOS user, I want the popup to close when I press Escape, so that I can dismiss it quickly.
23. As a macOS user, I want the popup to close after choosing an item, so that I can return to my previous workflow.
24. As a macOS user, I want search input to be focused immediately, so that I can type to filter without an extra click.
25. As a macOS user, I want search results to update instantly, so that I can narrow history quickly.
26. As a macOS user, I want text, links, HTML, and images to have recognizable list previews, so that I can identify the right item before selecting it.
27. As a macOS user, I want long text clips to be truncated in the list, so that the popup stays scannable.
28. As a macOS user, I want enough detail in each preview to distinguish similar clips, so that I avoid selecting the wrong item.
29. As a keyboard-focused user, I want arrow keys to move through results, so that I can select without using the mouse.
30. As a keyboard-focused user, I want Enter to choose the selected result, so that pasting a clip is fast.
31. As a keyboard-focused user, I want number shortcuts for visible results, so that I can jump directly to a clip.
32. As a mouse-focused user, I want to click an item to choose it, so that the picker works naturally.
33. As a macOS user, I want choosing an item to write it to the system clipboard, so that I can paste it into the target app.
34. As a macOS user, I want the app to refocus the previous application when possible, so that manual paste is convenient after choosing an item.
35. As a macOS user, I want optional automatic paste in a later version, so that choosing a clip can complete the paste action in one step.
36. As a macOS user, I want the app to pause clipboard recording from the menu bar, so that I can temporarily avoid saving sensitive data.
37. As a macOS user, I want ignored apps to be configurable, so that password managers and other sensitive tools do not have their clipboard contents saved.
38. As a macOS user, I want common password managers ignored by default where feasible, so that the first-run experience is safer.
39. As a macOS user, I want a history size limit setting, so that storage stays bounded.
40. As a macOS user, I want old unpinned items to be pruned when the limit is reached, so that pinned clips are preserved.
41. As a macOS user, I want popup size settings, so that the picker fits my screen and workflow.
42. As a macOS user, I want theme settings, so that the app can match my visual preference.
43. As a macOS user, I want the app to respect system appearance where possible, so that it feels native.
44. As a macOS user, I want a settings screen, so that I can configure hotkey, history limit, ignored apps, popup size, and theme.
45. As a macOS user, I want a menu bar menu with Open, Pause, Clear History, Settings, About, and Quit, so that common actions are always reachable.
46. As a macOS user, I want the app to persist settings across restarts, so that configuration work is not lost.
47. As a macOS user, I want the app to persist clipboard history across restarts, so that history remains useful after rebooting.
48. As a macOS user, I want clipboard polling or change detection to avoid saving unchanged content repeatedly, so that history remains clean.
49. As a macOS user, I want the app to handle unsupported clipboard formats gracefully, so that unusual clipboard content does not break the app.
50. As a developer, I want clipboard access to live in the Electron main process behind a secure preload bridge, so that deprecated renderer clipboard usage is avoided.
51. As a developer, I want a typed IPC contract between renderer and main process, so that UI features can call privileged clipboard and window operations safely.
52. As a developer, I want clipboard history logic isolated from Electron UI code, so that it can be tested without launching the app.
53. As a developer, I want search and ranking logic isolated from rendering, so that filtering behavior can be tested deterministically.
54. As a developer, I want storage access behind a repository interface, so that SQLite details do not leak into UI or clipboard watcher code.
55. As a developer, I want settings access behind a settings service, so that hotkey, ignored apps, and popup configuration are consistently validated.
56. As a developer, I want popup positioning logic isolated from the BrowserWindow creation code, so that multi-monitor bounds behavior can be unit tested.

## Implementation Decisions

- Build the product as an Electron and TypeScript macOS desktop app.
- Use a renderer UI framework such as React or Vue for the clipboard popup, settings, about/privacy screen, and menu-driven views.
- Use Electron `clipboard` only from privileged application code, exposed to the renderer through `preload` and `contextBridge`.
- Use Electron `globalShortcut` to register the configurable open shortcut, with Command+Shift+V as the default.
- Use Electron `screen.getCursorScreenPoint()` to open the popup near the cursor.
- Use `BrowserWindow` for the popup and configure it as always-on-top while visible.
- Keep the popup focused on instant search when opened.
- Store clipboard history locally in SQLite because clipboard history is structured, queryable, and may include binary image metadata.
- Store user settings in electron-store because settings are small, user-specific, and key-value oriented.
- Introduce a clipboard capture module that detects clipboard changes, normalizes supported formats, deduplicates entries, and sends valid items to persistence.
- Introduce a clipboard item model that represents text, link, HTML, and image clips with stable metadata such as type, preview text, created time, last used time, pinned state, and source app when available.
- Introduce a history repository module that owns SQLite schema, migrations, CRUD operations, pruning, pinning, deletion, and clear-history behavior.
- Introduce a settings module that owns hotkey, history limit, ignored apps, popup dimensions, theme, menu bar mode, dock icon behavior, and pause state.
- Introduce a search module that accepts clipboard items and a query, then returns filtered and ranked results with pinned items prioritized.
- Introduce a popup window controller that owns show, hide, focus, always-on-top behavior, and cursor-aware positioning within display bounds.
- Introduce a paste coordinator that writes a chosen item back to the system clipboard and then closes the popup. For MVP, the user manually presses Command+V after selection.
- Introduce a menu bar controller that exposes Open, Pause or Resume, Clear History, Settings, About or Privacy, and Quit.
- Introduce an ignored-app policy module that decides whether clipboard captures should be skipped based on configured application identifiers and known sensitive apps.
- Frontmost application detection is useful for ignored-app policy and refocusing the previous app, but may require native macOS support; implement the simplest reliable version first and keep native helper work isolated.
- Automatic paste is not required for MVP because reliable paste simulation and previous-app focus may require native macOS helpers and accessibility permissions.
- Renderer-to-main communication must use typed IPC channels and avoid exposing arbitrary Electron APIs to the renderer.
- Pinned items must be protected from history-limit pruning unless the user explicitly deletes or clears them.
- Clearing history should make the scope clear: either clear all items including pinned items after confirmation, or provide separate behavior for unpinned history if the product chooses that interaction during design.
- The menu bar app should be able to run without a normal dock icon, but this should remain configurable for development and user preference.

## Testing Decisions

- Good tests should verify externally visible behavior: saved clipboard item outcomes, search results, storage state, setting validation, popup positioning, IPC contracts, and menu actions. Tests should avoid asserting private implementation details such as internal helper calls.
- Test the clipboard item normalization module with representative text, URL, HTML, image, duplicate, empty, and unsupported clipboard payloads.
- Test the history repository with SQLite-backed integration tests covering insert, deduplicate, list order, pin, unpin, delete, clear, migration, and history-limit pruning.
- Test the search module with deterministic unit tests covering case-insensitive matching, URL matching, HTML preview matching, pinned ordering, recency ordering, and empty-query behavior.
- Test the settings module with unit tests covering default values, hotkey changes, history-limit validation, ignored-app updates, popup-size validation, theme selection, and pause state.
- Test popup positioning with unit tests covering cursor points near each display edge, multiple displays, and configured popup dimensions.
- Test ignored-app policy with unit tests covering exact app matches, default sensitive apps, configured app additions, configured app removals, and unknown apps.
- Test paste coordinator behavior with integration tests or Electron tests that verify selecting an item writes the expected payload to the clipboard and hides the popup.
- Test IPC behavior with contract tests that verify renderer-accessible APIs expose only intended commands and return typed responses.
- Test menu bar behavior with Electron-level tests where practical, covering Open, Pause or Resume, Clear History, Settings, About or Privacy, and Quit wiring.
- Add end-to-end coverage for the main MVP flow once the app shell exists: copy content, open popup with hotkey, search, select an item, and verify clipboard contents changed.
- No prior test patterns exist in this repository yet, so the first implementation should establish the testing stack and keep deep modules testable without launching Electron where possible.

## Out of Scope

- Automatic paste into the previous application is out of scope for MVP.
- Native macOS helper implementation for accessibility permissions, keystroke simulation, or robust frontmost-app detection is out of scope for MVP.
- Cloud sync is out of scope.
- Cross-device clipboard history is out of scope.
- Windows and Linux support are out of scope for the initial macOS-focused implementation.
- Team sharing, account login, and remote backup are out of scope.
- Rich HTML paste fidelity beyond storing and restoring available clipboard HTML is out of scope for MVP.
- OCR or image text extraction is out of scope.
- Advanced fuzzy ranking beyond practical instant search is out of scope unless needed after usability testing.

## Further Notes

- Electron supports clipboard access, global shortcuts, cursor position lookup, always-on-top windows, and secure preload bridges needed for this app.
- Renderer clipboard usage should be avoided because Electron renderer clipboard access is deprecated; expose only intentional clipboard operations through the preload bridge.
- The default MVP paste behavior is: select item, write item to clipboard, close popup, user manually presses Command+V.
- The product should be explicit that history is local-only and should provide controls for pausing capture, ignoring sensitive apps, deleting individual clips, and clearing history.
- Packaging should use electron-builder after the app shell and MVP flow are stable.
