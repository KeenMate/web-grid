# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc07] - Unreleased

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

### Fixed
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

## [Unreleased]

### Changed
- **Monorepo Structure** - Restructured project to use npm workspaces
  - Library moved to `packages/web-grid/` with its own package.json, tsconfig, and vite config
  - Documentation/examples moved to `docs/` as a separate Vite app
  - Root package.json now defines workspaces: `["packages/*", "docs"]`
  - Examples now import from `@keenmate/web-grid` instead of relative paths
  - Vite alias in docs enables HMR during development

- **Makefile** - Updated for workspace commands
  - `make setup` - Install all workspace dependencies
  - `make dev` - Start docs dev server with HMR
  - `make build` - Build library and docs
  - `make package` - Build library for publishing
  - `make create-link` / `make unlink` - npm link management
  - `make publish` / `make publish-dry` - Publishing to npm
  - `make clean` - Clean build artifacts

- **CLAUDE.md** - Updated to reflect new monorepo structure and commands

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
