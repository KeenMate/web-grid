# Web Grid Component

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@keenmate/web-grid.svg)](https://www.npmjs.com/package/@keenmate/web-grid)

A lightweight, accessible data grid web component with sorting, filtering, inline editing, and excellent keyboard navigation.

## Features

- **Sorting** - Single and multi-column sorting with visual indicators
- **Filtering** - Column-based filtering with customizable inputs
- **Pagination** - Built-in pagination with customizable page sizes
- **Inline Editing** - Text, number, date, select, combobox, autocomplete, checkbox, custom editors
- **Keyboard Navigation** - Excel-like navigation with Enter, Tab, Arrow keys
- **Row Toolbar** - Floating action buttons (add, delete, duplicate, move)
- **Inline Actions Column** - Render toolbar buttons as a fixed table column
- **Context Menu** - Right-click menus with custom actions for rows and headers
- **Keyboard Shortcuts** - Custom grid-level shortcuts with help overlay
- **Row Selection** - Multi-row selection via row numbers with range shortcuts
- **Row Focus** - Track which row the user is interacting with (master/detail patterns)
- **Cell Range Selection** - Excel-like click+drag cell selection with copy to clipboard
- **Virtual Scrolling** - Efficient rendering for large datasets (10,000+ rows)
- **Infinite Scroll** - Load more data as user scrolls
- **Custom Styling** - Cell and row styling via callbacks
- **Row Locking** - Lock rows for collaborative editing (property, callback, or external API)
- **Dark Mode** - Automatic dark mode support via CSS variables
- **i18n/Labels** - Centralized labels object for translations
- **Shadow DOM** - Encapsulated styles that don't leak
- **Framework Agnostic** - Works with any framework or vanilla JS

## Installation

```bash
npm install @keenmate/web-grid
```

## Usage

### Basic HTML

```html
<script type="module">
  import '@keenmate/web-grid'
</script>

<web-grid id="grid"></web-grid>
```

### With JavaScript/TypeScript

```typescript
import '@keenmate/web-grid'

const grid = document.querySelector('web-grid')

// Define columns
grid.columns = [
  { field: 'name', title: 'Name', editor: 'text' },
  { field: 'email', title: 'Email', editor: 'text' },
  { field: 'department', title: 'Department', editor: 'select',
    editorOptions: {
      options: [
        { value: 'eng', label: 'Engineering' },
        { value: 'sales', label: 'Sales' }
      ]
    }
  },
  { field: 'salary', title: 'Salary', horizontalAlign: 'right', editor: 'number',
    formatCallback: (val) => `$${val.toLocaleString()}`
  }
]

// Set data
grid.items = [
  { name: 'John', email: 'john@example.com', department: 'eng', salary: 85000 },
  { name: 'Jane', email: 'jane@example.com', department: 'sales', salary: 72000 }
]

// Configure behavior
grid.isEditable = true
grid.editTrigger = 'navigate'
grid.sortMode = 'multi'
grid.isPageable = true
grid.pageSize = 25

// Listen for changes
grid.onrowchange = (detail) => {
  console.log('Changed:', detail.field, detail.oldValue, '→', detail.newValue)
}
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `is-striped` | boolean | `false` | Alternating row colors |
| `is-hoverable` | boolean | `false` | Highlight row on hover |
| `sort-mode` | `'none' \| 'single' \| 'multi'` | `'none'` | Sorting mode |
| `is-filterable` | boolean | `false` | Show column filters |
| `is-pageable` | boolean | `false` | Enable pagination |
| `page-size` | number | `10` | Rows per page |
| `is-editable` | boolean | `false` | Enable inline editing |
| `edit-trigger` | `'click' \| 'dblclick' \| 'navigate'` | `'dblclick'` | How to start editing |
| `is-row-numbers-visible` | boolean | `false` | Show row number column |
| `is-virtual-scroll-enabled` | boolean | `false` | Enable virtual scrolling |
| `virtual-scroll-threshold` | number | `100` | Auto-enable when items >= threshold |

## Properties

```typescript
// Data
grid.items = [...];           // Array of row objects
grid.columns = [...];         // Column definitions

// Sorting & filtering
grid.sortMode = 'multi';      // 'none' | 'single' | 'multi'
grid.sort = [{ column: 'name', direction: 'asc' }];  // Current sort state

// Pagination
grid.isPageable = true;
grid.pageSize = 25;
grid.currentPage = 1;
grid.totalItems = 1000;       // For server-side pagination
grid.pageSizes = [10, 25, 50, 100];

// Editing
grid.isEditable = true;
grid.editTrigger = 'navigate';
grid.dropdownToggleVisibility = 'on-focus';  // 'always' | 'on-focus'

// Row toolbar
grid.isRowToolbarVisible = true;
grid.rowToolbar = ['add', 'delete', 'duplicate', 'moveUp', 'moveDown'];
grid.toolbarPosition = 'right';  // 'auto' | 'left' | 'right' | 'top' | 'inline'
grid.toolbarTrigger = 'hover';   // 'hover' | 'click' | 'button'
grid.inlineActionsTitle = 'Actions';  // Header for inline mode

// Context menus
grid.contextMenu = [...];        // Right-click on cells/rows
grid.headerContextMenu = [...];  // Right-click on column headers

// Keyboard shortcuts
grid.rowShortcuts = [...];
grid.rangeShortcuts = [...];  // Shortcuts for selected rows
grid.isShortcutsHelpVisible = true;

// Row selection
grid.selectedRows;            // Array of selected row indices (read-only)
grid.selectRow(index, mode);  // mode: 'replace' | 'toggle' | 'range'
grid.selectRowRange(from, to);
grid.clearSelection();
grid.isRowSelected(index);
grid.getSelectedRowsData();

// Row focus (master/detail)
grid.focusedRowIndex;             // Current focused row (null if none)
grid.focusedRowIndex = 3;         // Focus row 3 programmatically
grid.focusedRowIndex = null;      // Clear focus
grid.onrowfocus = ({ rowIndex, row, previousRowIndex }) => { ... };

// Cell range selection
grid.cellSelectionMode = 'click';  // 'disabled' | 'click' | 'shift'
grid.selectedCellRange;            // Current range (read-only)
grid.selectCellRange(range);
grid.clearCellSelection();
grid.getSelectedCells();

// Copy to clipboard
grid.shouldCopyWithHeaders = false;  // Include headers when copying
grid.copyCellSelectionToClipboard(); // Copy cell range as TSV
grid.copySelectedRowsToClipboard();  // Copy selected rows as TSV

// Virtual scroll
grid.isVirtualScrollEnabled = true;
grid.virtualScrollRowHeight = 38;
grid.virtualScrollBuffer = 10;

// Infinite scroll
grid.isInfiniteScrollEnabled = true;
grid.hasMoreItems = true;

// Labels/i18n
grid.labels = {
  rowActions: 'Row actions',
  keyboardShortcuts: 'Keyboard shortcuts',
  paginationPageInfo: 'Page {current} of {total}'
};

// Row identification (for locking & updates)
grid.idValueMember = 'id';           // Property name for row ID
grid.idValueCallback = (row) => row.id;  // Or callback for complex IDs

// Row locking
grid.rowLocking = {
  lockedMember: 'isLocked',          // Property-based
  lockInfoMember: 'lockInfo',        // Or full lock info object
  lockedEditBehavior: 'block'        // 'block' | 'allow' | 'callback'
};
```

## Column Definition

```typescript
{
  field: 'name',              // Property name in row data (required)
  title: 'Full Name',         // Header text (required)
  width: '150px',             // Fixed width
  minWidth: '100px',          // Minimum width
  horizontalAlign: 'left',    // 'left' | 'center' | 'right' | 'justify'
  textOverflow: 'ellipsis',   // 'wrap' | 'ellipsis'

  // Sorting & filtering
  isSortable: true,
  isFilterable: true,

  // Display
  headerInfo: 'Tooltip text', // Info icon in header
  formatCallback: (value, row) => value.toUpperCase(),
  tooltipCallback: (value, row) => `Details: ${value}`,
  cellClass: 'custom-class',
  cellClassCallback: (value, row) => value > 100 ? 'high' : null,

  // Editing
  isEditable: true,
  editor: 'text',             // 'text' | 'number' | 'date' | 'select' | 'combobox' | 'autocomplete' | 'checkbox' | 'custom'
  editorOptions: { ... },
  validateCallback: (value, row) => value ? null : 'Required',
  beforeCommitCallback: (ctx) => ({ valid: true, transformedValue: ctx.value.trim() })
}
```

## Editor Types

### Text Editor
```javascript
{ editor: 'text', editorOptions: { placeholder: 'Enter...', maxLength: 100 } }
```

### Number Editor
```javascript
{ editor: 'number', editorOptions: { min: 0, max: 1000, step: 10, decimalPlaces: 2 } }
```

### Date Editor
```javascript
{ editor: 'date', editorOptions: { dateFormat: 'DD.MM.YYYY', outputFormat: 'iso' } }
```

### Select Editor
```javascript
{
  editor: 'select',
  editorOptions: {
    options: [
      { value: 'eng', label: 'Engineering', icon: '⚙️', subtitle: 'Tech team' },
      { value: 'sales', label: 'Sales', disabled: true }
    ],
    iconMember: 'icon',
    subtitleMember: 'subtitle',
    disabledMember: 'disabled'
  }
}
```

### Combobox Editor
```javascript
{ editor: 'combobox', editorOptions: { options: [...] } }  // User can type custom values
```

### Autocomplete Editor
```javascript
{
  editor: 'autocomplete',
  editorOptions: {
    initialOptions: [...],
    placeholder: 'Search...',
    minSearchLength: 2,
    debounceMs: 300,
    onSearchCallback: async (query, row, signal) => {
      const response = await fetch(`/api/search?q=${query}`, { signal })
      return response.json()
    }
  }
}
```

### Checkbox Editor
```javascript
{ editor: 'checkbox', editorOptions: { trueValue: 'yes', falseValue: 'no' } }
```

### Custom Editor
```javascript
{
  editor: 'custom',
  cellEditCallback: (ctx) => {
    const value = prompt('Edit:', ctx.value)
    value !== null ? ctx.commit(value) : ctx.cancel()
  }
}
```

## Methods

| Method | Description |
|--------|-------------|
| `focusCell(rowIndex, colIndex)` | Focus a specific cell |
| `startEdit(rowIndex, colIndex)` | Start editing a cell |
| `commitEdit()` | Commit current edit |
| `cancelEdit()` | Cancel current edit |
| `moveRow(fromIndex, toIndex)` | Move a row |
| `deleteRow(index)` | Delete a row |
| `getRowId(row)` | Get row's ID value |
| `findRowById(id)` | Find row and index by ID |
| `isRowLocked(rowOrId)` | Check if row is locked |
| `getRowLockInfo(rowOrId)` | Get lock info for row |
| `lockRowById(id, info?)` | Lock row externally |
| `unlockRowById(id)` | Unlock row externally |
| `updateRowById(id, data)` | Partial update row by ID |
| `replaceRowById(id, row)` | Replace entire row by ID |
| `isRowFocused(index)` | Check if row is focused |
| `selectRow(index, mode)` | Select row ('replace', 'toggle', 'range') |
| `selectRowRange(from, to)` | Select range of rows |
| `clearSelection()` | Clear all selected rows |
| `isRowSelected(index)` | Check if row is selected |
| `getSelectedRowsData()` | Get data for selected rows |
| `selectCellRange(range)` | Select cell range programmatically |
| `clearCellSelection()` | Clear cell range selection |
| `getSelectedCells()` | Get array of selected cell info |
| `copyCellSelectionToClipboard()` | Copy cell range as TSV (Excel-compatible) |
| `copySelectedRowsToClipboard()` | Copy selected rows as TSV (Excel-compatible) |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `onrowchange` | `{ row, field, oldValue, newValue, isValid }` | Value changed |
| `ondatarequest` | `{ sort, page, pageSize, skip, trigger }` | Sort/page changed |
| `onroweditstart` | `{ row, rowIndex, field }` | Edit started |
| `onroweditcancel` | `{ row, rowIndex, field }` | Edit cancelled |
| `onvalidationerror` | `{ row, rowIndex, field, error }` | Validation failed |
| `onrowdelete` | `{ row, rowIndex }` | Ctrl+Delete pressed |
| `onrowfocus` | `{ rowIndex, row, previousRowIndex }` | Different row focused via cell click |
| `ontoolbarclick` | `{ item, row, rowIndex }` | Toolbar button clicked |

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| Arrow keys | Navigate cells |
| Tab / Shift+Tab | Next/previous editable cell |
| Home / End | First/last cell in row |
| Ctrl+Home / Ctrl+End | First/last cell in grid |
| PageUp / PageDown | Move by ~10 rows |

### Editing
| Key | Action |
|-----|--------|
| Enter / F2 | Start editing |
| Escape | Cancel edit / clear focus |
| Space | Toggle checkbox / open dropdown |
| Type any character | Start editing with that character |

### Row Operations
| Key | Action |
|-----|--------|
| Ctrl+Up / Ctrl+Down | Move row up/down |
| Ctrl+Delete | Delete row (fires `onrowdelete`) |

## Advanced Features

### Row Toolbar

```javascript
grid.isRowToolbarVisible = true
grid.toolbarPosition = 'right'
grid.toolbarTrigger = 'hover'

grid.rowToolbar = [
  'delete',  // Predefined action
  {
    id: 'edit',
    icon: '✏️',
    title: 'Edit',
    onclick: ({ row, rowIndex }) => openDialog(row)
  },
  {
    id: 'archive',
    icon: '📦',
    title: 'Archive',
    danger: true,
    disabled: (row) => row.archived,
    onclick: ({ row }) => archive(row)
  }
]
```

### Inline Actions Column

Render toolbar buttons as a fixed table column instead of floating popup:

```javascript
grid.isRowToolbarVisible = true
grid.toolbarPosition = 'inline'
grid.inlineActionsTitle = 'Actions'

grid.rowToolbar = [
  {
    id: 'edit',
    icon: '✏️',
    title: 'Edit',
    disabled: (row) => row.status === 'Done'
  },
  {
    id: 'delete',
    icon: '🗑️',
    title: 'Delete',
    danger: true,
    hidden: (row) => row.protected
  }
]
```

### Context Menu

```javascript
grid.contextMenu = [
  {
    id: 'copy',
    label: 'Copy value',
    icon: '📋',
    shortcut: 'Ctrl+C',
    onclick: (ctx) => navigator.clipboard.writeText(ctx.cellValue)
  },
  {
    id: 'delete',
    label: 'Delete row',
    icon: '🗑️',
    danger: true,
    dividerBefore: true,
    disabled: (ctx) => ctx.row.protected,
    onclick: (ctx) => deleteRow(ctx.rowIndex)
  }
]
```

### Header Context Menu

Right-click context menu for column headers with predefined actions:

```javascript
grid.headerContextMenu = [
  'sortAsc',           // Sort ascending
  'sortDesc',          // Sort descending
  'clearSort',         // Clear sort (visible only if sorted)
  { dividerBefore: true },
  'freezeColumn',      // Freeze up to this column
  'unfreezeColumn',    // Unfreeze this column
  { dividerBefore: true },
  'columnVisibility',  // Submenu to show/hide columns
  'hideColumn',        // Hide this column
  {
    id: 'custom',
    label: 'Custom Action',
    icon: '⚡',
    onclick: (ctx) => console.log('Column:', ctx.column.field)
  }
]

// Labels are translatable via grid.labels.contextMenu.*
```

### Custom Keyboard Shortcuts

```javascript
grid.rowShortcuts = [
  {
    key: 'Delete',
    id: 'delete-row',
    label: 'Delete row',
    action: (ctx) => deleteRow(ctx.rowIndex)
  },
  {
    key: 'Ctrl+D',
    id: 'duplicate',
    label: 'Duplicate row',
    action: (ctx) => duplicateRow(ctx.row)
  }
]

grid.isShortcutsHelpVisible = true
```

### Row Selection

Select multiple rows by clicking row numbers, then perform batch operations:

```javascript
// Enable row numbers (required for selection)
grid.isRowNumbersVisible = true

// Selection interactions:
// - Click row number → select (clears others)
// - Ctrl+Click → toggle in selection
// - Shift+Click → select range
// - Click+Drag → select range while dragging
// - Escape → clear selection

// Define shortcuts for selected rows
grid.rangeShortcuts = [
  {
    key: 'Ctrl+C',
    id: 'copy-rows',
    label: 'Copy to clipboard',
    action: async ({ rows }) => {
      await grid.copySelectedRowsToClipboard()
    }
  },
  {
    key: 'Delete',
    id: 'delete-selected',
    label: 'Delete selected rows',
    action: ({ rows, rowIndices }) => {
      // Delete from end to preserve indices
      for (const idx of [...rowIndices].reverse()) {
        grid.items.splice(idx, 1)
      }
      grid.items = [...grid.items]
      grid.clearSelection()
    }
  }
]

// Programmatic selection
grid.selectRow(5, 'replace')      // Select row 5
grid.selectRow(7, 'toggle')       // Toggle row 7
grid.selectRowRange(0, 4)         // Select rows 0-4
console.log(grid.selectedRows)    // [0, 1, 2, 3, 4, 5, 7]
console.log(grid.getSelectedRowsData())  // Array of row objects
grid.clearSelection()
```

### Row Focus (Master/Detail)

Track which row the user is interacting with — click any data cell to focus its row:

```javascript
// Listen for row focus changes
grid.onrowfocus = ({ rowIndex, row, previousRowIndex }) => {
  detailPanel.innerHTML = renderDetail(row)
  console.log(`Row ${rowIndex} focused (was: ${previousRowIndex})`)
}

// Programmatic control
grid.focusedRowIndex = 3     // Focus row 3
grid.focusedRowIndex = null  // Clear focus

// Check focus state
grid.isRowFocused(3)  // true/false
```

**Behavior:**
- Click a data cell → focuses that row, fires `onrowfocus`
- Click row number → selects row (does **not** trigger focus)
- Click outside grid → clears row focus
- CSS variables: `--wg-row-focus-bg`, `--wg-row-focus-row-number-bg`

### Cell Range Selection

Select rectangular cell ranges with click+drag, then copy to clipboard:

```javascript
// Enable cell selection (default is 'click')
grid.cellSelectionMode = 'click'  // 'disabled' | 'click' | 'shift'

// Selection interactions:
// - Click+Drag → select rectangular range
// - Shift+Click → extend range to clicked cell
// - Escape → clear selection

// Copy settings
grid.shouldCopyWithHeaders = true  // Include column headers when copying

// Define shortcuts for cell ranges
grid.rangeShortcuts = [
  {
    key: 'Ctrl+C',
    id: 'copy-cells',
    label: 'Copy to clipboard',
    action: async ({ cells, cellRange }) => {
      if (cellRange) {
        await grid.copyCellSelectionToClipboard()
      }
    }
  },
  {
    key: 'Delete',
    id: 'clear-cells',
    label: 'Clear selected cells',
    action: ({ cells, cellRange }) => {
      if (!cellRange) return
      cells.forEach(({ row, field }) => {
        row[field] = null
      })
      grid.items = [...grid.items]
      grid.clearCellSelection()
    }
  }
]

// Programmatic selection
grid.selectCellRange({
  startRowIndex: 0, endRowIndex: 2,
  startColIndex: 1, endColIndex: 3,
  startField: 'name', endField: 'salary'
})
console.log(grid.getSelectedCells())  // Array of { row, rowIndex, colIndex, field, value }
```

**Copy format:** Tab-separated values (TSV) compatible with Excel, Google Sheets, etc.

### Labels/i18n

Customize or translate UI strings:

```javascript
grid.labels = {
  // Toolbar
  rowActions: 'Akce řádku',
  inlineActionsHeader: 'Akce',

  // Shortcuts help
  keyboardShortcuts: 'Klávesové zkratky',

  // Pagination (use {placeholders} for dynamic values)
  paginationFirst: '⏮',
  paginationPrevious: '◀',
  paginationNext: '▶',
  paginationLast: '⏭',
  paginationPageInfo: 'Stránka {current} z {total}',
  paginationItemCount: '{count} položek',
  paginationPerPage: 'na stránku'
}
```

### Virtual Scrolling

```javascript
grid.isVirtualScrollEnabled = true
grid.virtualScrollRowHeight = 38
grid.virtualScrollBuffer = 10
grid.virtualScrollThreshold = 100  // Auto-enable when items >= 100
```

### Server-Side Data

```javascript
grid.ondatarequest = async (detail) => {
  const response = await fetch('/api/data?' + new URLSearchParams({
    sort: JSON.stringify(detail.sort),
    skip: detail.skip,
    take: detail.pageSize
  }))

  const data = await response.json()
  grid.items = data.items
  grid.totalItems = data.total
}
```

### Custom Cell & Row Styling

```javascript
// Static cell class
{ field: 'status', cellClass: 'status-cell' }

// Dynamic cell class
{ field: 'salary', cellClassCallback: (val, row) => val > 100000 ? 'high' : null }

// Dynamic row class
grid.rowClassCallback = (row, index) => row.status === 'inactive' ? 'row-inactive' : null

// Inject CSS into shadow DOM
grid.customStylesCallback = () => `
  .high { background-color: #d1fae5 !important; }
  .row-inactive { opacity: 0.6; }
`
```

### Row Locking

Lock rows for collaborative editing scenarios. Three sources: property-based, callback-based, or external API.

**Property-based** - Lock status from row data:
```javascript
grid.idValueMember = 'id'
grid.rowLocking = {
  lockedMember: 'isLocked',    // boolean field
  // Or with full lock info:
  lockInfoMember: 'lockInfo'   // { isLocked, lockedBy, lockedAt, reason }
}
```

**Callback-based** - Compute lock status:
```javascript
grid.rowLocking = {
  getLockInfoCallback: (row) => row.status === 'editing'
    ? { isLocked: true, lockedBy: row.editingUser }
    : null
}
```

**External API** - Lock via JavaScript (WebSocket scenario):
```javascript
// Lock row when server notifies
socket.on('row-locked', ({ id, user }) => {
  grid.lockRowById(id, { lockedBy: user })
})

// Unlock when released
socket.on('row-unlocked', ({ id }) => {
  grid.unlockRowById(id)
})

// Update row data from server
socket.on('row-updated', ({ id, data }) => {
  grid.updateRowById(id, data)  // Partial update
  // or
  grid.replaceRowById(id, newRow)  // Full replacement
})
```

**Visual indicators:**
- Row shows muted styling with `--wg-row-locked-bg` background
- Lock icon (🔒) replaces row number when `isRowNumbersVisible` is enabled
- Tooltip shows who locked the row (via Floating UI)

**Edit behavior** - Control what happens when editing locked rows:
```javascript
grid.rowLocking = {
  lockedEditBehavior: 'block',  // Cannot edit (default)
  // or 'allow' - can edit, just visual indicator
  // or 'callback' - use canEditLockedCallback to decide
  canEditLockedCallback: (row, lockInfo) => lockInfo.lockedBy === currentUser
}
```

## Theming

### Theme Designer

The easiest way to customize the appearance is using the **KeenMate Theme Designer**:

**[theme-designer.keenmate.dev](https://theme-designer.keenmate.dev)**

1. Choose 3 base colors - background, text, and accent
2. Preview changes live
3. Export your theme as CSS, JSON, or SCSS

### CSS Variable Layers

KeenMate components support a **two-layer theming architecture**:

**Standalone Mode** - Override component-specific variables:

```css
:root {
  --wg-accent-color: #your-brand-color;
  --wg-header-background: #your-background;
  --wg-text-color: #your-text-color;
}
```

**Cascading Mode** - Share a base layer across all KeenMate components:

```css
:root {
  /* Base layer - single source of truth */
  --base-accent-color: #3b82f6;
  --base-layer-1: #ffffff;
  --base-text-color-1: #111827;

  /* Components reference base layer automatically */
}
```

Change `--base-accent-color` once → web-grid, web-multiselect, and web-daterangepicker all update.

### CSS Custom Properties

```css
web-grid {
  /* Colors */
  --wg-accent-color: #0078d4;
  --wg-text-color: #1a1a1a;
  --wg-header-background: #f8fafc;
  --wg-row-hover-background: #f1f5f9;
  --wg-row-stripe-background: #fafafa;
  --wg-border-color: #e2e8f0;

  /* Typography */
  --wg-font-family: system-ui, sans-serif;
  --wg-font-size-base: 14px;

  /* Spacing */
  --wg-cell-padding: 8px 12px;
  --wg-border-radius: 4px;

  /* Editor */
  --wg-input-focus-border-color: var(--wg-accent-color);
  --wg-dropdown-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
```

### Unified Variable Naming

All KeenMate components follow consistent naming:

| Purpose | web-grid | web-multiselect | web-daterangepicker |
|---------|----------|-----------------|---------------------|
| Brand color | `--wg-accent-color` | `--ms-accent-color` | `--drp-accent-color` |
| Background | `--wg-header-background` | `--ms-primary-bg` | `--drp-primary-bg` |
| Text color | `--wg-text-color` | `--ms-text-primary` | `--drp-text-primary` |
| Border | `--wg-border-color` | `--ms-border-color` | `--drp-border-color` |

## Development

```bash
# Install dependencies
make setup

# Start dev server with HMR
make dev

# Build library and docs
make build

# Build library for publishing
make package

# Publish to npm
make publish
```

## Browser Support

Modern browsers with Custom Elements v1 support:
- Chrome 67+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## Documentation

See the [live showcase](https://web-grid.keenmate.com) for interactive examples and full API documentation.

## License

MIT

## Credits

Created by [Keenmate](https://github.com/keenmate) as part of the Pure Admin design system.

## Related

- [@keenmate/web-multiselect](https://github.com/keenmate/web-multiselect) - Multiselect dropdown component
- [@keenmate/web-daterangepicker](https://github.com/keenmate/web-daterangepicker) - Date range picker component
- [@keenmate/theme-designer](https://github.com/keenmate/theme-designer) - CSS variable theming system
