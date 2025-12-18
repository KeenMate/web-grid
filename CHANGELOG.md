# Changelog

## [Unreleased]

### Fixed

- **Edit mode exit bug**: Fixed issue where Enter/Tab/Escape would stop working after editing a few cells. Root cause was event listener accumulation - each edit added a new keydown listener to the cell without removing the previous one. After 3 edits, pressing Enter would fire 3 handlers, with the second crashing because `#editingCell` was already null.

- **Tab navigation**: Tab now properly commits the edit AND moves to the next cell in one keypress. Previously required two Tab presses because `#handleNavigateKeyDown` fired before `#handleEditorKeyDown` and returned early while editing.

- **Click-outside detection**: Clicking outside the editing cell now cancels the edit. Uses `composedPath()` to properly detect clicks across Shadow DOM boundaries.

- **Column width jumping**: Fixed column width changing when entering/exiting edit mode. Root cause was CSS conflict - `.grid-cell-editor` had `position: relative` which overrode `.editor-wrapper`'s `position: absolute`, causing the editor to be in normal document flow and affect layout. Also added a hidden spacer to preserve original content width.

- **Text ellipsis lost after edit**: Fixed `text-ellipsis` class being stripped from cell content when exiting edit mode. Both `#cancelEdit` and `#commitEdit` now preserve the `textOverflow` class and `maxWidth` style when restoring cell content.

- **Paste permission prompts**: Fixed Ctrl+V requiring clipboard permission prompt for every paste. Changed from `navigator.clipboard.readText()` (which requires explicit permission) to native `paste` event with `clipboardData` (browser handles automatically).

- **Checkbox Space toggle**: Fixed Space key not toggling checkbox in navigate mode. `#editingCell` was not set before calling `#commitEdit()`.

- **Checkbox row height jump**: Fixed row height changing when entering edit mode on checkbox. Solution: removed edit mode for checkboxes entirely - they now toggle directly without entering/exiting edit state.

### Added

- **Column width constraints**: New column properties `width`, `minWidth`, `maxWidth` for controlling column sizing. Applied to both header and cell elements.

- **Text overflow handling**: New column property `textOverflow` with values `'wrap'` (default) or `'ellipsis'`. When set to `'ellipsis'`, long text is truncated with `...` instead of wrapping.

- **Cursor position on edit**: When clicking or double-clicking to edit a text cell, the cursor is now positioned at the clicked character instead of selecting all text. Uses binary search with Range API to detect character position within Shadow DOM.

- **GridEditBehavior class**: New extensible behavior class that controls how edit mode is entered. Configures cursor positioning and value handling based on trigger type (click, dblclick, f2, enter, typing). Users can extend `GridEditBehavior` for custom behavior via `grid.editBehavior = new CustomBehavior()`.

- **Copy/Paste support**: Ctrl+C copies focused cell value, Ctrl+V pastes into focused cell (in navigate mode). New column properties `beforeCopyCallback` and `beforePasteCallback` allow transforming/cleaning data during clipboard operations.

- **Editor alignment**: Editor input now respects column `align` property. Centered columns (like Age) show centered text in edit mode. Number input spinners are hidden for consistent alignment.

- **Dropdown auto-open control**: New `editorOptions.showOnFocus` property (default: `true`) controls whether select/combobox/autocomplete dropdowns auto-open when navigating to the cell with arrow keys. Set to `false` to require Enter/F2/typing to open.

### Changed

- F2/Enter key now positions cursor at end of text (instead of selecting all)
- Typing a character to enter edit mode now replaces the value with the typed character (instead of appending)
- `#startEdit()` signature changed to use trigger type and context object

- Added `#editorKeydownHandler` field to store handler reference for proper cleanup
- `#setupInlineEditor` now removes old keydown listener before adding new one
- `#cancelEdit` and `#commitEdit` now clean up the keydown handler
- `#handleEditorKeyDown` handles Tab navigation directly instead of relying on event bubbling
- `#handleEditorDropdownKeyDown` handles Tab with proper commit and navigation
- `#handleDocumentClick` now cancels edit when clicking outside the editing cell
- `#startEdit` preserves original cell content as hidden spacer to maintain column width
- Removed `position: relative` from `.grid-cell-editor` CSS to allow `.editor-wrapper`'s `position: absolute` to work
- Added `padding: 12px` and `box-sizing: border-box` to `.grid-cell-editor`
- Paste now uses native `paste` event listener instead of Ctrl+V keydown handler
- Renamed `copyCallback` → `beforeCopyCallback` and `pasteCallback` → `beforePasteCallback` for clarity
- Number inputs now use `GridEditBehavior` for initial value (typing replaces value), but always select all since `<input type="number">` doesn't support cursor positioning
- **Checkbox toggle behavior**: Checkboxes no longer enter edit mode. Space, Enter, F2, and clicking the checkbox all toggle directly. This eliminates height jumping, focus issues, and provides consistent spreadsheet-like UX.
