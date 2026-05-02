# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<claude-mem-context>
# Memory Context

# [copclip] recent context, 2026-05-02 4:07pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (12,085t read) | 4,663,193t work | 100% savings

### May 2, 2026
S907 Verify project understanding by running test suite (May 2 at 3:55 AM)
S904 Fix clipboard popup to capture current clipboard content when opened with Cmd+Shift+V (May 2 at 3:55 AM)
6482 3:33p 🔄 IPC send helper extracted for reusability
6483 " 🟣 Popup opened IPC event now emitted
6484 " 🔴 Clipboard history IPC notification bugfix complete and verified
6485 3:34p 🔵 Greenfield project initialized
6486 " 🔵 CopClip - Electron clipboard manager for macOS
6487 " 🔵 CopClip architecture: Electron main/preload/renderer layers
S905 Fix popup history not updating when user copies text externally (May 2 at 3:34 PM)
S906 Understand CopClip project architecture before proceeding with development (May 2 at 3:34 PM)
S908 Understand CopClip project and debug clipboard history display issue (May 2 at 3:35 PM)
6488 3:37p ✅ Electron dev server started in background
6489 " 🔵 Dev server running on port 5174
6490 " 🔵 Clipboard history module: in-memory deduplication logic
6491 " 🔵 Preload API type contract defined
6493 " 🔵 Clipboard history module reviewed again
6495 " 🔵 Clipboard history module - duplicate read
6492 3:38p 🔵 Multiple Electron instances running from repeated dev launches
6494 3:40p ✅ Duplicate Electron instances terminated
6496 " ✅ Debug logging added to clipboard capture flow
6498 " 🔵 Debug output unchanged - no new clipboard activity
6497 3:41p 🔵 Debug logs reveal clipboard polling active and functional
6499 3:42p 🔵 Clipboard capture and IPC broadcast confirmed working
6500 " ✅ Electron killed for fresh restart - investigating renderer-side issue
6501 3:43p ✅ Enhanced IPC broadcast debug logging added
6502 " ✅ Dev server restarted with enhanced window state logging
6503 " 🔵 Root cause identified: popup window hidden when clipboard changes
6504 3:44p ✅ Electron killed to test popup opening behavior
6505 " ✅ Debug logging added to popup opening flow
6506 " ✅ Renderer popup opened logging - duplicate edit
6507 " ✅ Dev server started to test popup opening with full logging
6509 " ✅ Renderer popup opened logging - repeated edit (skip)
6511 " ✅ Dev server command repeated - already running
6512 3:45p 🔵 Popup opening logs not captured - user didn't press hotkey
6508 " 🔵 Three clipboard items captured successfully while window hidden
6513 " 🔵 Fourth clipboard item captured - polling continues
6510 3:46p 🔵 Clipboard polling continues, waiting for popup open test
6515 " 🔵 Popup opening watch repeated - no hotkey pressed
6514 3:48p 🔵 Fourth item captured, history now contains 4 items
6516 3:50p 🔵 Confirmed: popup never opened during entire session
6517 " 🔵 Clipboard content changed to legend text, polling continues
6518 " ✅ Hotkey registration debug logging added
6519 3:51p ✅ App restarted with hotkey registration debug logging
6520 " 🔵 Hotkey registration confirmed successful
6521 " 🔵 Clipboard polling detected test text, already captured
6522 " 🔵 Test clipboard text captured successfully
6523 3:52p 🔵 History accumulating correctly: 3 items captured in current session
6524 " 🔵 Popup still not opened - repeated test pattern
S909 Understand CopClip project and debug clipboard history display issue (May 2 at 3:52 PM)
6525 " 🔵 User suspects macOS clipboard permission issue
6526 3:53p 🔵 Clipboard permissions confirmed working, debug logs show successful reads
6527 " 🔴 Popup opened event payload fixed, debug instrumentation removed
6528 3:54p 🔴 Clipboard history bugfix complete with all fixes verified
6529 " 🔵 Copclip clipboard history fix verification complete
6530 4:05p 🔵 Issue #5 verification confirms hotkey implementation complete
6531 4:06p 🔵 Core MVP issues verified complete with tests passing

Access 4663k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
