# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Filler column cells now fire `cellClick` events with correct `rowIndex` (and `colIndex: -1`)
- **Datepicker keyboard navigation**: Arrow keys, Page Up/Down, Home/End, Enter, Escape, and Tab now work correctly when the calendar is open (previously intercepted by grid's table listener)
  - Fixed pipeline `Object.create` pattern shadowing property mutations - changed to `Proxy` so `ctx.datepicker` is set on the original context
  - Fixed async dispatch not working in callbacks - `ctx.dispatch()` now triggers new dispatch cycles for async scenarios like datepicker's `onSelect`
  - Added keyboard bypass in both adapter and table listener when datepicker is open
  - Focus now restored to cell after closing datepicker with Escape
- **Read-only cells**: Dropdown/date toggles no longer appear on non-editable cells (column `isEditable: false` or locked rows)
  - Toggle visibility now respects both column editability and row locking via `canEditCell()`
  - Clicking where toggle would be on read-only cells no longer opens editors
- **Dropdown Escape key behavior**: Improved two-phase Escape handling for all dropdown editors
  - **Select**: First Escape clears type-to-filter and shows all options; second Escape exits edit mode
  - **Autocomplete/Combobox**: First Escape restores original value and shows all options; second Escape exits edit mode
  - Implemented via new `escapeEdit` action in event pipeline
- **Row selection focus cleanup**: Clicking row numbers now clears cell focus visual
- **Navigation keys when dropdown open**: Navigation keys no longer move between cells when a dropdown is open
  - ArrowLeft/ArrowRight: For autocomplete, fall through to browser for cursor movement; for select/combobox, consumed via `noop`
  - Home/End: For autocomplete, cursor movement; for select/combobox, jump to first/last option
  - PageUp/PageDown: Jump through dropdown options by 10 items (all dropdown editors)

---

## [1.0.0-rc12] - 2026-01-26

### Added

- **Table Border Only Mode**: New `tableBorderOnly` property for cleaner card integration
  - `tableBorderOnly: boolean` - When `true`, border only wraps the table, pagination/toolbar float outside (default: `false`)
  - Eliminates double-border issue when grid is inside a card component
  - Table wrapped in `.wg__table-container` with border; outer `.wg` container is borderless
  - Pagination and toolbar remain in outer container, visually separate from table

- **Scroll behavior properties**: New `isScrollable` and `scrollMaxHeight` properties for grids without a height-constrained container
  - `isScrollable: boolean` - When `true`, constrains grid to viewport height (default: `false`)
  - `scrollMaxHeight: string` - Custom max-height when scrollable (default: `'100vh'`)
  - Use when grid is not inside a container with explicit `max-height` but still needs to scroll

- **Paste from clipboard**: Multi-cell paste from Excel/TSV clipboard data
  - Automatically detects TSV format (tabs, newlines) from clipboard
  - **Header detection**: If first row matches column titles/fields (>50%), maps data by column name
  - **Position-based paste**: Without headers, pastes starting from focused cell position
  - **New row creation**: Automatically creates rows when pasting beyond existing data
  - `createRowCallback` - Custom row factory for new rows (default: plain object with pasted values)
  - `pasteMode` property - How to handle non-editable columns:
    - `'skip-non-editable'` (default) - Skip non-editable cells
    - `'all-columns'` - Paste into all columns regardless of editable flag
    - `'editable-only'` - Only paste if all target columns are editable
  - `shouldValidateOnPaste` property - Run validation on pasted values (default: true)
  - `onbeforepaste` event - Cancel or modify paste operation before it executes
  - `onpaste` event - Summary after paste completes with success/failure counts
  - Respects column `beforePasteCallback` for value transformation
  - Respects row locking - locked rows are skipped

- **Row Focus (Master/Detail)**: `onrowfocus` event fires when a different row is focused via cell click/focus — ideal for master/detail layouts
  - `onrowfocus` callback: `{ rowIndex, row, previousRowIndex }`
  - `focusedRowIndex` getter/setter for programmatic control (set to `null` to clear)
  - `isRowFocused(rowIndex)` method to check focus state
  - Visual: focused row gets `--wg-row-focus-bg` background, row number gets `--wg-row-focus-row-number-bg` (30% accent tint)
  - Row number clicks do **not** trigger focus (they handle row selection)
  - Clicking outside the grid clears row focus
  - Surgical DOM updates preserve cell focus (no full re-render)

- **🧪 New Row (Inline Data Entry) [Experimental]**: Always-visible empty row for adding data directly in the grid
  - `isNewRowEnabled: boolean` - Enable the empty row (default: `false`, requires navigate mode)
  - `newRowPosition: 'top' | 'bottom'` - Where to show the empty row (default: `'bottom'`)
  - `newRowIndicator: string` - Indicator in row number column (default: `'+'`)
  - `createEmptyRowCallback: () => T | Promise<T>` - Factory for new row objects (supports async)
  - Tab moves between cells within the empty row (saves to draft, doesn't commit)
  - Tab on last editable cell commits the row (if it has data) and starts a fresh empty row
  - Enter commits the row if it has any data
  - Lenient validation: tracks errors but doesn't block input (rows can be committed with invalid cells)
  - Paste support: pasting into the empty row creates new rows
  - **Note:** This feature is experimental and may change in future releases

- **Select All**: Click the `#` row number header to select all cells in the grid
  - `selectAll()` method for programmatic selection
  - Visual feedback: cursor changes to pointer, hover highlight on header

- **Column Selection**: Click column headers to select entire columns (like row selection)
  - `selectColumn(colIndex, mode)` method - modes: 'replace', 'toggle', 'range'
  - `isColumnSelected(colIndex)` method to check selection state
  - `selectedColumns` getter returns sorted array of selected column indices
  - `clearColumnSelection()` method
  - `copySelectedColumnsToClipboard()` method - copy all rows for selected columns
  - Click header = select single column (replaces previous)
  - Ctrl+Click = toggle individual columns (non-contiguous selection)
  - Shift+Click = select range from last clicked column
  - Escape = clear column selection
  - Ctrl+C = copy selected columns to clipboard
  - Visual: selected headers get accent background (like row numbers), cells get selection background
  - No border (matches row selection visual style)
  - Sort moved to sort indicator only (▲/▼/⬍) - clicking header body selects column
  - Mutual exclusivity: row, column, and cell range selections clear each other

- **Row/Column Selection Borders**: Visual borders around selected rows and columns for better visibility
  - Border appears around selected row/column range (similar to cell range selection)
  - Handles non-contiguous selections: separate borders for each contiguous segment (e.g., rows 1-2 and 5-7 show two borders)
  - Row border starts from first data column (excludes row number column)
  - Column border spans from header to last data row
  - Borders update on scroll to stay positioned correctly
  - CSS variables: `--wg-selection-border-width`, `--wg-selection-border-color`

- **Column Drag Selection**: When column reorder is disabled, drag on headers to select column ranges
  - Same UX as row drag selection on row numbers
  - Click + drag = select range of columns
  - 5px drag threshold before activating (prevents accidental selection)
  - Ctrl+click = toggle individual columns
  - Shift+click = range from last selected
  - `selectColumnRange(fromIndex, toIndex)` method for programmatic range selection
  - Cursor changes to `col-resize` during drag
  - Only active when `isColumnReorderAllowed = false` (doesn't conflict with column reordering)

### Changed

- **Click Event Manager**: Introduced `ClickEventManager` (pub/sub pattern) for centralized click handling, following the same pattern as `ScrollEventManager` and `FocusEventManager`. Outside-click detection for selection clearing now uses this unified system.
- **Sort Event Pipeline**: Sort indicator clicks now use the `ClickEventManager` pub/sub pattern (`sortClick` event type). This allows modules to subscribe to sort events and follows the same architecture as other event pipelines.

### Fixed

- **Date picker two-click with selection active**: Fixed date picker requiring two clicks when a row/column/cell selection was active. Moved selection clearing before cell edit transition to prevent render from interfering with date picker opening.
- **Dropdown/editor not closing on outside click**: Fixed dropdowns (select, combobox, autocomplete) and editors staying open/focused when clicking outside the grid. Outside-click handler now explicitly closes dropdowns, cancels edits, clears focused cell state and visual class.
- **Column selection with modifier keys when reorder enabled**: Fixed Ctrl+click and Shift+click not working for column selection when `isColumnReorderAllowed = true`. Reorder now skips when modifier keys are held, allowing column toggle/range selection.
- **Column selection after reorder**: Fixed issue where clicking a column header after reordering required two clicks. The `dragJustCompleted` flag now auto-clears after the current frame.
- **Selected header hover state**: Fixed unreadable text when hovering over selected column headers (gray background + white text). Selected headers now maintain accent styling on hover.
- **Selection clearing on click**: Row and column selections now clear when clicking on data cells or clicking outside the grid. Clicking row numbers preserves row selection, clicking headers preserves column selection.
- **Selected row number styling in navigate mode**: Fixed selected row numbers not showing correct colors (white text on accent background) when using `editTrigger: 'navigate'`. Increased CSS specificity to ensure selection styles win.
- **Shift+drag cell selection**: Fixed shift+drag cell selection not working when `editTrigger: 'click'` combined with `cellSelectionMode: 'shift'`. Simplified selection logic to handle all editTrigger combinations.
- **Frozen cell selection visibility**: Fixed row, column, and cell range selections not showing on frozen columns. Added CSS rules with `!important` to ensure selection backgrounds override frozen cell styling.
- **Frozen row number selection color**: Fixed selected row number cells showing wrong background color (light blue instead of accent) when row numbers are sticky/frozen.
- **Frozen header selection**: Fixed selected column headers not showing accent color when frozen.
- **Selection clearing with cell selection mode**: Fixed row/column selections not clearing when clicking on cells in grids with `cellSelectionMode: 'click'` (the default). The early return in cell selection handling now clears row/column selections first.
- **Dropdown toggle click with cell selection**: Fixed dropdown/date toggles not responding to clicks when `cellSelectionMode: 'click'`. Toggle clicks are now excluded from cell selection logic so they properly trigger their own handlers.
- **Dropdown not closing on cell selection**: Fixed dropdown staying open when clicking another cell to start cell selection. Active edit is now properly canceled (dropdown closed, cell re-rendered to display mode) before starting selection.
- **Cell selection cleared on any click**: Fixed cell selection being incorrectly cleared on any click due to shadow DOM detection issue in `outsideClick` handler. Now correctly checks if host element is in event's composed path.
- **Cell selection cleared on sort click**: Fixed cell selection being cleared when clicking sort indicator. The `render()` call after sorting was rebuilding the DOM, causing the document click handler to misdetect the click as outside the grid. Click event manager now tracks inside-grid clicks via a flag set on mousedown, and the listener is attached to the host element (not container) so it survives re-renders.
- **Shadow DOM event target retargeting**: Fixed click event manager not detecting clicked elements correctly. When events cross the shadow DOM boundary to the host element listener, `event.target` gets retargeted to the host. Now uses `composedPath()[0]` to get the actual clicked element inside the shadow DOM.
- **Click event subscription accumulation**: Fixed endless loop when clicking sort indicator. `attachEventListeners()` is called on every `render()`, causing subscriptions to accumulate. Added `clickEventsSubscribed` flag to ensure click event subscriptions are only registered once.
- **Sort handler shadow DOM compatibility**: Fixed sort clicks not working due to `handleSortClick` using `event.target` which is retargeted when crossing shadow DOM. Now passes the field directly from the click context instead of extracting it from the event.
- **Cell selection not cleared on sort**: Fixed cell selection remaining visible after clicking sort indicator. Now clears cell selection before sorting, matching behavior of other header interactions like column selection.
- **Selection not cleared on date picker open**: Fixed row/column/cell selections remaining visible when opening a date picker. All selections and borders are now cleared when the date picker opens.
- **Selection not cleared on resize/reorder**: Fixed row/column/cell selections remaining visible when starting column resize or reorder operations. Added `clearAllSelections()` helper method that clears all selection types and their visual borders.
- **Selection not clearing on first outside click after drag**: Fixed cell/row/column selections requiring two clicks outside the grid to clear after drag-selecting. The `insideGridClickInProgress` flag was set on mousedown but only cleared on click - drag operations (mousedown → mousemove → mouseup) don't produce a click event, leaving the flag stuck. Added mouseup handler with 10ms timeout to clear the flag after drags.
- **Blur and outsideClick handlers conflicting**: Fixed race condition where blur handlers and outsideClick handler both tried to handle cleanup when clicking outside the grid, causing inconsistent state. Blur handler now checks if focus is leaving the grid entirely (`relatedTarget` is null or outside shadow DOM) and defers all cleanup to the outsideClick handler in that case.

---

## [1.0.0-rc11] - 2026-01-16

### Added

- **Copy to clipboard**: Cell range and row selections can now be copied to clipboard in TSV format (Excel-compatible)
  - `copyCellSelectionToClipboard()` - Copy selected cell range
  - `copySelectedRowsToClipboard()` - Copy selected rows
  - `shouldCopyWithHeaders` property - Include column headers when copying (default: false)
  - Works with Ctrl+C keyboard shortcut via `rangeShortcuts`

### Fixed

- **Cell range selection border alignment**: Fixed 1px offset caused by container border (getBoundingClientRect measures from border edge, position:absolute from padding edge)
- **Focus border during drag**: Focus outline now properly hides when starting a cell range drag selection
- **Selection focus timing**: Improved focus reliability when multiple grids are on the same page using double requestAnimationFrame

## [1.0.0-rc10] - 2026-01-13 (Published)

### BREAKING CHANGES

This release contains significant API changes to align property naming with sibling components (web-multiselect, web-daterangepicker) and follow consistent naming conventions. Since this is a new library, no backwards compatibility layer is provided.

#### Grid-Level Property Renames

All boolean properties now use `is*` prefix for state properties and `should*` prefix for behavior configuration:

| Old Property | New Property | Description |
|--------------|--------------|-------------|
| `filterable` | `isFilterable` | Enable column filtering UI |
| `pageable` | `isPageable` | Enable pagination |
| `striped` | `isStriped` | Alternate row background colors |
| `hoverable` | `isHoverable` | Highlight row on hover |
| `editable` | `isEditable` | Enable cell editing |
| `showRowNumbers` | `isRowNumbersVisible` | Show row number column |
| `stickyRowNumbers` | `isStickyRowNumbers` | Pin row numbers when scrolling horizontally |
| `showRowToolbar` | `isRowToolbarVisible` | Show row toolbar on hover |
| `showShortcutsHelp` | `isShortcutsHelpVisible` | Show keyboard shortcuts info icon |
| `virtualScroll` | `isVirtualScrollEnabled` | Enable virtual scrolling for large datasets |
| `infiniteScroll` | `isInfiniteScrollEnabled` | Enable infinite scroll loading |
| `persistColumnWidths` | `shouldPersistColumnWidths` | Save column widths to localStorage |
| `persistColumnOrder` | `shouldPersistColumnOrder` | Save column order to localStorage |
| `allowColumnReorder` | `isColumnReorderAllowed` | Allow drag-to-reorder columns |
| `checkboxAlwaysEditable` | `isCheckboxAlwaysEditable` | Checkboxes toggle without entering edit mode |
| `dropdownShowOnFocus` | `shouldShowDropdownOnFocus` | Open dropdown when cell receives focus |
| `openDropdownOnEnter` | `shouldOpenDropdownOnEnter` | Open dropdown on Enter key |
| `summaryInline` | `isSummaryInline` | Show summary row inline vs footer |

**Migration example:**
```javascript
// Before
grid.editable = true
grid.showRowNumbers = true
grid.virtualScroll = true

// After
grid.isEditable = true
grid.isRowNumbersVisible = true
grid.isVirtualScrollEnabled = true
```

#### Column-Level Property Renames

| Old Property | New Property | Description |
|--------------|--------------|-------------|
| `sortable` | `isSortable` | Column can be sorted |
| `filterable` | `isFilterable` | Column can be filtered |
| `editable` | `isEditable` | Column cells can be edited |
| `frozen` | `isFrozen` | Column stays fixed when scrolling |
| `resizable` | `isResizable` | Column width can be resized |
| `hidden` | `isHidden` | Column is hidden from view |
| `showEditButton` | `isEditButtonVisible` | Show edit button in cell |
| `openDropdownOnEnter` | `shouldOpenDropdownOnEnter` | Open dropdown on Enter key |

**Migration example:**
```javascript
// Before
const columns = [
  { field: 'id', title: 'ID', editable: false, frozen: true },
  { field: 'name', title: 'Name', sortable: true },
  { field: 'status', title: 'Status', hidden: true }
]

// After
const columns = [
  { field: 'id', title: 'ID', isEditable: false, isFrozen: true },
  { field: 'name', title: 'Name', isSortable: true },
  { field: 'status', title: 'Status', isHidden: true }
]
```

#### Callback Renames

Per naming convention: Events (`on*`) = fire-and-forget, Callbacks (`*Callback`) = return value affects behavior.

| Old Name | New Name | Reason |
|----------|----------|--------|
| `onfilldrag` | `fillDragCallback` | Returns `false` to cancel fill operation |
| `onSearchCallback` (in editorOptions) | `searchCallback` | Returns search results array |

**Migration example:**
```javascript
// Before
grid.onfilldrag = (detail) => {
  if (detail.targetCells.length > 10) return false
}

// After
grid.fillDragCallback = (detail) => {
  if (detail.targetCells.length > 10) return false
}

// Before (in column editorOptions)
editorOptions: {
  onSearchCallback: async (query) => searchAPI(query)
}

// After
editorOptions: {
  searchCallback: async (query) => searchAPI(query)
}
```

### Added

- **Column `maxLines` Property** - Limit visible text lines with CSS line-clamp. When `textOverflow: 'wrap'` is set, use `maxLines: 3` to show at most 3 lines with ellipsis for overflow.

- **`horizontalAlign: 'justify'`** - New alignment option for justified text in cells and headers.

- **Header Vertical Alignment** - Header text now properly respects `verticalAlign` column property (`top`, `middle`, `bottom`) via flexbox alignment classes.

- **`--wg-header-min-height` CSS Variable** - Control minimum header row height.

- **Escape Key Cancels Fill Drag** - Press Escape while dragging the fill handle to cancel the operation without applying values to cells.

- **Component-Specific CSS Variables** - New granular CSS variables following the pattern `--wg-{component}-{property}`:

  **Dropdown Menu:**
  - `--wg-dropdown-option-gap` - Gap between option icon and text
  - `--wg-dropdown-option-padding` - Padding inside dropdown options
  - `--wg-dropdown-empty-padding` - Padding for "No options" message

  **Inline Actions:**
  - `--wg-inline-actions-padding` - Padding around inline action buttons
  - `--wg-inline-actions-gap` - Gap between action buttons

  **Toolbar:**
  - `--wg-toolbar-row-gap` - Gap between toolbar rows
  - `--wg-toolbar-row-padding` - Padding inside toolbar rows
  - `--wg-toolbar-label-font-size` - Font size for toolbar button labels
  - `--wg-toolbar-btn-gap` - Gap between toolbar buttons

  **Tooltip:**
  - `--wg-tooltip-padding` - Padding inside tooltips
  - `--wg-tooltip-shadow` - Box shadow for tooltip popups

### Changed

- **CSS Variable References** - Internal CSS now uses component-specific variables instead of generic spacing variables, making customization more targeted and predictable
- **Internal Method Names** - Grid class internal methods renamed to match new property names (e.g., `getEffectiveOpenDropdownOnEnter` → `getEffectiveShouldOpenDropdownOnEnter`)

### Fixed

- **Frozen Column Text Overflow** - Resizing frozen columns to narrow widths now properly shows ellipsis instead of text spilling out. The shadow scroll indicator still appears correctly when scrolling horizontally.

- **Fill Handle Focus State** - Fill handle now properly removed when clicking outside the grid. Fixed issue where multiple cells could appear focused when rapidly clicking between cells.

- **Consistent API Surface** - All boolean properties now follow consistent `is*`/`should*` naming pattern across grid and column levels
- **TypeScript Types** - All type definitions updated to reflect new property names
- **Example Files** - Fixed incorrect property names in example HTML files (`persistColumnWidths` → `shouldPersistColumnWidths`, `allowColumnReorder` → `isColumnReorderAllowed`, `showRowToolbar` → `isRowToolbarVisible`, etc.)

---

## [1.0.0-rc09] - 2026-01-11 (Published)

### Changed
- **Non-Resizable Column Cursor** - Columns with `resizable: false` now show `not-allowed` cursor instead of hiding the resize handle entirely. This provides visual feedback that the column exists but cannot be resized.

### Fixed
- **Column Reorder Header Transparency** - Dragging a column header no longer shows body cell content through the header when scrolled down. Changed from `opacity: 0.5` to opaque background with dashed outline indicator.
- **Column Reorder Drop Indicator Position** - The blue drop indicator line now correctly positions based on scroll offset, staying visible in the viewport when scrolled down.
- **Filler Header Sticky Positioning** - The filler `<th>` element now has proper `position: sticky` and `z-index` to match other header cells when scrolling.
- **Frozen Column Border Bleed** - Freezing columns no longer adds vertical separators to all frozen cells. Only the last frozen column now has the separator border.
- **Context Menu Divider Items** - Standalone `{ dividerBefore: true }` markers now correctly apply dividers to the next item instead of rendering as "undefined" menu items.
- **Hide Column Synced with Column Visibility** - The `'hideColumn'` action now sets `column.hidden = true` instead of removing the column from the array, keeping it synced with the Column Visibility submenu.

### Added
- **Header Context Menu** - Right-click context menu for column headers
  - `headerContextMenu` property accepts array of predefined strings or custom items
  - Predefined actions: `'sortAsc'`, `'sortDesc'`, `'clearSort'`, `'hideColumn'`, `'freezeColumn'`, `'unfreezeColumn'`, `'columnVisibility'`
  - String shorthand for predefined actions (same pattern as row toolbar)
  - Custom items with `id`, `label`, `icon`, `onclick`, `disabled`, `visible`, `dividerBefore`
  - `HeaderMenuContext` provides `column`, `field`, `columnIndex`, `sortDirection`, `isFrozen`, `allColumns`, `labels`
  - `onheadercontextmenuopen` callback fired before menu opens
  - Auto-visibility: sort options hidden if column not sortable, freeze/unfreeze shown based on state
- **Context Menu Submenus** - Menu items can now have nested submenus
  - `children` property for static submenu items
  - `submenu` callback for dynamic submenu generation
  - Submenus appear on hover with arrow indicator
- **Column Visibility Submenu** - New `'columnVisibility'` predefined action
  - Shows submenu with all columns and "Show all" option at top
  - Toggle column visibility with checkboxes (☑ visible, ☐ hidden)
  - "Show all" checkbox reflects whether all columns are visible
  - Menu stays open for multiple toggles with reactive checkbox updates
  - All labels translatable via `labels.contextMenu.*`
- **Header Filler Context Menu** - Right-clicking the empty header filler cell shows column-agnostic menu items (e.g., Column Visibility)
- **Context Menu Close on Scroll** - Context menus automatically close when page is scrolled
- **Translatable Context Menu Labels** - All predefined header context menu labels are now translatable via `labels.contextMenu.*` (`sortAsc`, `sortDesc`, `clearSort`, `hideColumn`, `freezeColumn`, `unfreezeColumn`, `columnVisibility`, `showAll`)
- **Multi-Sort via Context Menu** - Ctrl+clicking Sort Ascending/Descending in the header context menu adds to existing sort (when `sortMode === 'multi'`) instead of replacing it, matching Ctrl+click behavior on header cells
- **Column Hidden Property** - `column.hidden` property to show/hide columns
  - Hidden columns are excluded from rendering but kept in columns array
  - Allows toggling visibility without losing column configuration
- **Virtual Scroll + Reorder + Resize Demo** - New example combining virtual scrolling (10,000 rows), column reordering, and column resizing in `examples-resizable-columns.html`.

## [1.0.0-rc08] - 2026-01-09 (Published)

### Added
- **Row Keyboard Shortcuts** - Grid-level keyboard shortcuts for row operations
  - `rowShortcuts` property accepts array of shortcut definitions
  - Each shortcut has `key` (e.g., "Delete", "Ctrl+D", "F2"), `id`, `label`, and `action` callback
  - `disabled` property supports boolean or callback for conditional shortcuts
  - `ShortcutContext` provides `row`, `rowIndex`, `colIndex`, `column`, `cellValue`
- **Toolbar-Activated Shortcuts** - Keyboard shortcuts work on hovered row when toolbar is visible
  - No cell focus required - just hover over a row and press shortcut key
  - Matches `rowShortcuts` by ID (e.g., toolbar item `id: 'delete'` pairs with shortcut `id: 'delete'`)
  - Document-level listener activated when toolbar opens, cleaned up when closed
- **Rich Toolbar Tooltips** - Enhanced tooltips for toolbar buttons
  - `tooltip: { description, shortcut }` property on toolbar items
  - `tooltipCallback: (row, rowIndex) => htmlString` for dynamic HTML content
  - Auto-detects keyboard shortcut from matching `rowShortcuts` (by ID)
  - Uses Floating UI positioned tooltip with title, description, and shortcut display
- **Shortcuts Help Overlay** - Info icon showing available shortcuts
  - `showShortcutsHelp` property enables the info icon
  - `shortcutsHelpPosition` controls placement ('top-right' or 'top-left')
  - `shortcutsHelpContentCallback` for custom HTML in overlay
- **Context Menu Shortcuts** - Keyboard shortcuts for context menu items
  - `shortcut` property on `ContextMenuItem` displays shortcut hint
  - Pressing shortcut key while menu is open triggers the action
- **Context Menu Position Offset** - Control context menu position relative to click
  - `contextMenuXOffset` - Horizontal offset in pixels (default: 8)
  - `contextMenuYOffset` - Vertical offset in pixels (default: 0)
  - Matches svelte-treeview positioning behavior
- **Public Focus API** - New `focusCell(rowIndex, colIndex)` method for programmatic focus
- **Public Edit API** - New `startEditing(rowIndex, colIndex)` method for programmatic editing
- **Toolbar Position Property** - New `toolbarPosition` property to control toolbar placement
  - `toolbarPosition="auto"` - Auto-detect best position (default)
  - `toolbarPosition="left"` - Prefer left side
  - `toolbarPosition="right"` - Prefer right side
  - `toolbarPosition="top"` - Prefer above the row
  - `toolbarPosition="inline"` - Render as fixed column instead of floating popup
  - Uses floating-ui for intelligent fallback when preferred position has no space
- **Inline Actions Column** - Render toolbar buttons as a table column
  - Set `toolbarPosition="inline"` to enable
  - `inlineActionsTitle` property sets the column header text
  - Supports `disabled` and `hidden` callbacks per row
  - Multi-row button layout via `row` property on toolbar items
  - Keyboard shortcuts (`rowShortcuts`) work on hovered row
- **Labels/i18n Support** - Centralized labels object for translations
  - `grid.labels` property accepts `Partial<GridLabels>` (merged with defaults)
  - Translatable strings: `rowActions`, `inlineActionsHeader`, `keyboardShortcuts`
  - Pagination labels: `paginationFirst`, `paginationPrevious`, `paginationNext`, `paginationLast`, `paginationPageInfo`, `paginationItemCount`, `paginationPerPage`
  - Placeholder syntax for dynamic values: `{current}`, `{total}`, `{count}`
- **Row Locking** - Lock rows to prevent editing (for collaborative scenarios)
  - Three lock sources: property-based, callback-based, external API
  - Property-based: `rowLocking.lockedMember` or `rowLocking.lockInfoMember`
  - Callback-based: `rowLocking.isLockedCallback` or `rowLocking.getLockInfoCallback`
  - External API: `lockRowById(id, info)`, `unlockRowById(id)` for WebSocket scenarios
  - Visual indicator: lock icon replaces row number, muted row styling
  - Configurable edit behavior: `lockedEditBehavior` ('block' | 'allow' | 'callback')
  - Row identification: `idValueMember` or `idValueCallback` for ID-based operations
  - Row update methods: `updateRowById(id, data)`, `replaceRowById(id, row)`
  - Automatic edit cancellation when row is locked while editing
  - Lock tooltips use Floating UI (consistent with other tooltips)
  - New labels: `dropdownNoOptions`, `dropdownSearching`
- **Column-Level Dropdown Text Overrides** - `editorOptions.noOptionsText` and `editorOptions.searchingText`
  - Override "No options" and "Searching..." messages per column
  - Falls back to `grid.labels.dropdownNoOptions` / `dropdownSearching` if not specified
  - Reactive: updates when column definition changes (useful for i18n)
- **Resizable Columns** - Drag column header edges to resize columns (Excel-style)
  - Drag the resize handle between column headers to adjust width
  - Per-column opt-out via `column.resizable = false`
  - Respects `column.minWidth` and `column.maxWidth` constraints
  - `oncolumnresize` callback fired after resize with `{ field, oldWidth, newWidth, allWidths }`
  - Optional localStorage persistence via `gridName` + `persistColumnWidths` properties
  - Programmatic API: `setColumnWidth(field, width)`, `setColumnWidths(widths)`, `getColumnWidthsState()`
  - Visual column separators between headers (`--wg-header-separator` CSS variable)
- **Reorderable Columns** - Drag column headers to rearrange columns
  - `allowColumnReorder` property enables drag-to-reorder (default: false)
  - Drag threshold (5px) prevents accidental reorder when clicking to sort
  - Frozen columns cannot be reordered
  - `oncolumnreorder` callback fired after reorder with `{ field, fromIndex, toIndex, allOrder }`
  - Optional localStorage persistence via `gridName` + `persistColumnOrder` properties
  - Programmatic API: `setColumnOrder(order)`, `getColumnOrderState()`, `moveColumn(field, toIndex)`
  - Grab cursor only shown when `allowColumnReorder` is enabled
- **Fill Handle (Autofill)** - Excel-like drag-to-fill for copying values
  - Small handle appears at bottom-right corner of focused cell
  - Drag to fill cells with source cell value
  - `fillDirection` property controls allowed directions:
    - `'vertical'` (default) - fill only within same column
    - `'all'` - fill in any direction (up, down, left, right)
  - Per-column override via `column.fillDirection`
  - **Type-based validation** - incompatible values are automatically skipped:
    - Number columns: only accept numeric values
    - Select/Combobox columns: only accept values that exist in options
    - Date columns: only accept valid date strings/objects/timestamps
    - Text/Autocomplete columns: accept any value (use `onfilldrag` callback for custom validation)
  - `onfilldrag` callback with `{ sourceCell, targetCells, direction }` - return `false` to cancel
  - Non-editable cells are automatically skipped
  - Fires `onrowchange` for each modified cell after fill completes
  - Drag threshold (5px) prevents accidental fill on click
  - Correctly uses draft row values (recently edited cells)
- **Row Selection** - Multi-row selection via row number cells
  - Click row number to select row (clears other selections)
  - Ctrl+Click to toggle row in selection
  - Shift+Click to select range from last selected row
  - Click+Drag on row numbers to select range while dragging
  - `selectedRows` getter returns array of selected row indices (sorted ascending)
  - `selectRow(index, mode)` method - mode: 'replace', 'toggle', 'range'
  - `selectRowRange(from, to)` method for programmatic range selection
  - `clearSelection()` method to clear all selections
  - `isRowSelected(index)` method to check selection state
  - `getSelectedRowsData()` method to get data objects for selected rows
  - Escape key clears selection
  - Visual highlighting with `--wg-selection-bg` and `--wg-selection-row-number-bg` CSS variables
- **Range Shortcuts** - Keyboard shortcuts that operate on selected rows
  - `rangeShortcuts` property accepts array of shortcut definitions
  - Each shortcut has `key` (e.g., "Delete", "Ctrl+Alt+E"), `id`, `label`, and `action` callback
  - `action` callback receives `{ rows, rowIndices }` context
  - `disabled` property supports boolean or callback for conditional shortcuts
  - Shortcuts work when rows are selected (no cell focus required)
  - Example: Delete selected rows, export selected rows to CSV
- **Showcase: Row Locking Feature Page** - New `/features/row-locking` page with live demos
  - Property-based locking (lockedMember, lockInfoMember)
  - Callback-based locking (getLockInfoCallback)
  - External API locking (lockRowById, unlockRowById) with interactive controls
- **Showcase: Row Selection Example Page** - New `examples-row-selection.html` demo
  - Basic selection demo with selection log
  - Range shortcuts demo with Delete and Ctrl+Alt+E actions

### Changed
- **Centralized Interaction State** - Refactored hover/focus/edit state tracking
  - All interaction state now managed in `WebGrid` class (single source of truth)
  - `grid.hoveredRowIndex` getter for reading hovered row
  - `grid.setHoveredRow()` method for updating hover state
  - Internal `_onInteractionChange` callback for state change notifications
  - Enables future features like "shortcuts on focused row when no hover"
- **Readonly Cell Background** - `--wg-cell-readonly-bg` now uses `var(--base-disabled-bg, var(--wg-surface-2))` instead of `var(--wg-surface-2)`, providing visual distinction from striped rows when theme-designer's `--base-disabled-bg` is set
- **Toolbar Positioning** - Refactored to use floating-ui library for better space detection and automatic fallback positioning
- **Font Inheritance** - Changed default font-family fallback from `system-ui, sans-serif` to `inherit`, allowing grid to inherit font from parent context (Bootstrap, Tailwind, etc.)
- **Form Element Fonts** - Added `font-family: inherit` to all form elements (buttons, inputs, selects) that don't inherit by default
- **Line Height** - Changed `--wg-line-height-base` from absolute value (`2 * --wg-rem` = 20px) to unitless multiplier (`1.5`), matching web-multiselect and standard CSS best practices
- **Font Size Alignment** - Aligned font size scale with web-multiselect and web-daterangepicker: `--wg-font-size-base` now uses `--base-font-size-sm` (14px) instead of `--base-font-size-base` (16px), ensuring consistent text size across all KeenMate components

### Removed
- **Deprecated `sortable` Property** - The grid-level `sortable` boolean property has been removed
  - Use `sortMode` instead: `'none'` (disabled), `'single'` (one column), `'multi'` (multi-column with Ctrl+click)
  - Migration: `grid.sortable = true` → `grid.sortMode = 'multi'`
  - Column-level `sortable` property (to disable sorting per column) is unchanged

### Fixed
- **Cross-Column Dropdown Bug** - Rapidly clicking between dropdown cells in different columns no longer opens dropdown on wrong cell. Fixed generic selectors to use specific `data-row`/`data-field` attributes.
- **Dropdown Toggle Stays Visible After Scroll** - Scrolling while dropdown is open now properly re-renders the cell to remove editor HTML (toggle button)
- **Datepicker Stays Open When Switching Cells** - Datepicker now auto-closes silently when its anchor becomes disconnected (e.g., clicking another cell)
- **Focus Border Not Cleared** - Clicking a dropdown toggle while another cell is focused now clears the focus border from the old cell
- **Autocomplete Stuck at "Searching..."** - Empty search results now correctly show "No options" instead of staying at "Searching..."
- **Virtual Scroll Flickering on Keyboard Navigation** - Pressing Ctrl+PageDown, Ctrl+Home, PageUp/Down no longer causes grid to flicker/redraw multiple times. Keyboard navigation now pre-renders target row range once before scrolling, with flag to skip redundant scroll event handlers.
- **Edit Mode Full Re-render** - Entering and exiting edit mode (click, F2, Enter, Tab, Escape) no longer causes full grid re-render. Uses surgical DOM updates to replace only the cell content, preserving any DevTools modifications to other cells.
- **Focus Following Row on Move** - `focusCell()` now updates state synchronously before render, fixing focus not following row when using keyboard shortcuts to move rows up/down
- **Enter Key Blocked After Date Picker** - Fixed `this.datepicker` not being set to null after date selection, which caused Enter key to be blocked in other editors
- **Connector Arrow Clipping** - Connector arrow now clips at grid container boundaries instead of drawing outside the container
- **Connector Scroll Updates** - Connector arrow updates in real-time when scrolling, pointing to container edge when row scrolls out of view
- **Connector Right Position** - When toolbar is on right side, connector now correctly points to the right side of the row (not always left)
- **Connector Scrollbar Overlap** - Connector uses container bounds instead of table bounds, avoiding overlap with scrollbar
- **Connector Visibility Check** - Row is only considered "not visible" when completely outside container (not just when center is outside)
- **Cursor Anchor Bug** - Cursor-based positioning only applies when `toolbarPosition="top"`, not for left/right positions

## [1.0.0-rc04] - 2026-01-02

### Added
- **Validation Error Tooltips** - Invalid cells now show validation error message as tooltip on hover
- **Rich Validation Tooltips** - New `validationTooltipCallback` for custom HTML error tooltips
  - Grid-level: `grid.validationTooltipCallback = ({ field, error, value, row, rowIndex }) => htmlString`
  - Column-level: `column.validationTooltipCallback = (ctx) => htmlString` (overrides grid-level)
  - Context object provides `field`, `error`, `value`, `row`, `rowIndex`
  - Return HTML string for rich formatting (you must escape user values for XSS safety)

### Changed
- **CSS Base Variables** - Updated to align with Pure Admin theme system
  - `--base-main-bg` instead of `--base-surface-1`
  - `--base-elevated-bg` instead of `--base-surface-2`
  - `--base-hover-bg` instead of `--base-surface-3`
  - `--base-dropdown-bg` for floating surfaces
  - `--base-input-*` variables for form inputs
  - `--base-danger-*` variables for error states

## [1.0.0-rc03] - 2026-01-02

### Added
- **Edit Start Selection** - New `editStartSelection` property controls cursor/selection behavior when entering edit mode
  - `editStartSelection="mousePosition"` - Cursor placed at click position (default)
  - `editStartSelection="selectAll"` - Select all text
  - `editStartSelection="cursorAtStart"` - Cursor at beginning
  - `editStartSelection="cursorAtEnd"` - Cursor at end
  - Can be set at grid level or per-column via `editorOptions.editStartSelection`

### Changed
- **Sort Mode** - New `sortMode` property replaces `sortable` boolean
  - `sortMode="none"` - Sorting disabled (default)
  - `sortMode="single"` - Single column sorting only
  - `sortMode="multi"` - Multi-column sorting with Ctrl+Click
  - `sortable` property is now deprecated but still works as an alias

### Fixed
- **Edit Trigger Click** - `editTrigger="click"` now works correctly
  - Single click starts editing immediately
  - Clicking another cell while editing transitions directly to the new cell (no double-click needed)

## [1.0.0-rc02] - 2025-01-02

### Added
- **Component Variables Manifest** - Machine-readable manifest documenting all CSS variables
  - `component-variables.manifest.json` included in package
  - 34 base variables (`--base-*`) the component consumes
  - 121 component variables (`--wg-*`) with categories and usage descriptions
  - Import via `@keenmate/web-grid/manifest`
  - Schema: `https://raw.githubusercontent.com/keenmate/schemas/main/component-variables.schema.json`

### Changed
- **Dark Mode** - Added support for `.dark` class (Tailwind CSS convention)

## [1.0.0-rc01] - 2025-01-02

### Added
- **First Release Candidate** - Initial RC for npm publishing
- **TypeScript Declarations** - Full `.d.ts` files included in package
- **CSS Variable Architecture** - 121 customizable `--wg-*` variables
- **Base Theme Integration** - Falls back to `--base-*` variables from `@keenmate/theme-designer`

### Changed
- **CSS Naming Convention** - Aligned with web-multiselect/daterangepicker
  - Renamed `-background` suffix to `-bg` throughout
  - Renamed `--base-layer-*` to `--base-surface-*`
  - Renamed `--base-stroke-*` to `--base-border-*`

## [0.1.0] - 2024-12-XX

### Added
- Initial TypeScript implementation of WebGrid component
- Core features: sorting, filtering, editing, keyboard navigation
- Editor types: text, number, date, select, combobox, autocomplete
- Virtual scrolling for large datasets
- Row toolbar with predefined and custom actions
- Context menu support
- Custom cell/row styling via callbacks
- CSS variable theming with `--base-*` integration
