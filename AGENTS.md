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

# [copclip] recent context, 2026-05-08 6:42pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (11,721t read) | 4,821,139t work | 100% savings

### May 2, 2026
S907 Verify project understanding by running test suite (May 2 at 3:55 AM)
S904 Fix clipboard popup to capture current clipboard content when opened with Cmd+Shift+V (May 2 at 3:55 AM)
S905 Fix popup history not updating when user copies text externally (May 2 at 3:34 PM)
S906 Understand CopClip project architecture before proceeding with development (May 2 at 3:34 PM)
S908 Understand CopClip project and debug clipboard history display issue (May 2 at 3:35 PM)
6510 3:46p 🔵 Clipboard polling continues, waiting for popup open test
6515 " 🔵 Popup opening watch repeated - no hotkey pressed
6514 3:48p 🔵 Fourth item captured, history now contains 4 items
S909 Understand CopClip project and debug clipboard history display issue (May 2 at 3:49 PM)
6516 3:50p 🔵 Confirmed: popup never opened during entire session
6517 " 🔵 Clipboard content changed to legend text, polling continues
6518 " ✅ Hotkey registration debug logging added
6519 3:51p ✅ App restarted with hotkey registration debug logging
6520 " 🔵 Hotkey registration confirmed successful
6521 " 🔵 Clipboard polling detected test text, already captured
6522 " 🔵 Test clipboard text captured successfully
6523 3:52p 🔵 History accumulating correctly: 3 items captured in current session
6524 " 🔵 Popup still not opened - repeated test pattern
S910 Overflow scroll for Recent Text Clips section in clipboard popup UI (May 2 at 3:52 PM)
6525 " 🔵 User suspects macOS clipboard permission issue
6526 3:53p 🔵 Clipboard permissions confirmed working, debug logs show successful reads
6527 " 🔴 Popup opened event payload fixed, debug instrumentation removed
6528 3:54p 🔴 Clipboard history bugfix complete with all fixes verified
6529 " 🔵 Copclip clipboard history fix verification complete
6530 4:05p 🔵 Issue #5 verification confirms hotkey implementation complete
6531 4:06p 🔵 Core MVP issues verified complete with tests passing
6532 4:08p 🔴 Test regression: ArrowDown selection state not updating
6533 4:11p 🔴 ArrowDown selection test fixed with act() flush
6534 " 🔵 Issue verification complete: project state matches closed issues
6538 " 🟣 Overflow scroll for Recent Text Clips
S911 Add overflow scroll to Recent Text Clips section in popup UI (May 2 at 7:58 PM)
6539 7:58p 🟣 Limit Recent Text Clips display to 3 items
6540 7:59p 🟣 Recent Text Clips limited to 3 items with passing tests
6541 " 🟣 Recent Text Clips 3-item limit verified and ready for commit
6542 10:51p 🔵 User inquiry about configurable main shell issue
6543 10:53p 🔵 Uncommitted changes from 3-item limit implementation
6544 " 🟣 Commit pending 3-item clip limit changes
6545 " 🟣 3-item clip limit committed and pushed
6546 10:54p 🔵 Codebase explored for menu bar implementation requirements
6547 10:55p 🟣 Adding clear method to ClipboardHistory interface
6548 " 🟣 ClipboardHistory clear interface updated successfully
6549 " 🟣 Clear history implementation for menu bar controls
6550 " 🟣 ClearClipboardHistory export added to clipboard-capture
6551 " 🟣 Adding clear history test to clipboard-history.test.ts
6552 10:56p 🟣 Clear history tests added to both test files
6554 " 🔵 Duplicate patch execution detected
6553 " 🟣 SQLite clear history test successfully applied
6555 10:57p 🟣 Menu bar template created for issue #7
6557 10:58p 🟣 Menu bar template tests created
6587 " 🟣 CopClip configurable settings with validation and persistence
6559 " 🟣 Menu bar test file successfully created
6588 11:26p 🟣 Issue #8 closed - configurable app settings shipped
6597 11:31p 🔵 Settings UX issue diagnosed - numeric inputs not smooth during editing
6598 11:56p 🔴 Settings UX bug confirmed - numeric inputs convert empty to 0 during typing
6599 " 🔴 Settings UX fixed - draft state now preserves raw input strings
6600 11:57p 🔴 Settings UX fix verified - all tests pass including new editing test
6601 " 🔴 Settings UX fix complete - 55 tests pass, ready for commit
6602 11:58p 🔴 Settings UX fix shipped - smooth numeric input editing now works

Access 4821k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
