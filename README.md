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
- **Context Menu** - Right-click menus with custom actions
- **Keyboard Shortcuts** - Custom grid-level shortcuts with help overlay
- **Virtual Scrolling** - Efficient rendering for large datasets (10,000+ rows)
- **Infinite Scroll** - Load more data as user scrolls
- **Custom Styling** - Cell and row styling via callbacks
- **Dark Mode** - Automatic dark mode support via CSS variables
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

<web-grid id="grid" striped hoverable></web-grid>
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
  { field: 'salary', title: 'Salary', align: 'right', editor: 'number',
    formatCallback: (val) => `$${val.toLocaleString()}`
  }
]

// Set data
grid.items = [
  { name: 'John', email: 'john@example.com', department: 'eng', salary: 85000 },
  { name: 'Jane', email: 'jane@example.com', department: 'sales', salary: 72000 }
]

// Configure behavior
grid.editable = true
grid.editTrigger = 'navigate'
grid.sortMode = 'multi'
grid.pageable = true
grid.pageSize = 25

// Listen for changes
grid.onrowchange = (detail) => {
  console.log('Changed:', detail.field, detail.oldValue, '→', detail.newValue)
}
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `striped` | boolean | `false` | Alternating row colors |
| `hoverable` | boolean | `false` | Highlight row on hover |
| `sortable` | boolean | `false` | Enable sorting (deprecated, use `sort-mode`) |
| `sort-mode` | `'none' \| 'single' \| 'multi'` | `'none'` | Sorting mode |
| `filterable` | boolean | `false` | Show column filters |
| `pageable` | boolean | `false` | Enable pagination |
| `page-size` | number | `10` | Rows per page |
| `editable` | boolean | `false` | Enable inline editing |
| `edit-trigger` | `'click' \| 'dblclick' \| 'navigate'` | `'dblclick'` | How to start editing |
| `show-row-numbers` | boolean | `false` | Show row number column |
| `virtual-scroll` | boolean | `false` | Enable virtual scrolling |
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
grid.pageable = true;
grid.pageSize = 25;
grid.currentPage = 1;
grid.totalItems = 1000;       // For server-side pagination
grid.pageSizes = [10, 25, 50, 100];

// Editing
grid.editable = true;
grid.editTrigger = 'navigate';
grid.dropdownToggleVisibility = 'on-focus';  // 'always' | 'on-focus'

// Row toolbar
grid.showRowToolbar = true;
grid.rowToolbar = ['add', 'delete', 'duplicate', 'moveUp', 'moveDown'];
grid.toolbarPosition = 'right';  // 'auto' | 'left' | 'right' | 'top'
grid.toolbarTrigger = 'hover';   // 'hover' | 'click' | 'button'

// Context menu
grid.contextMenu = [...];

// Keyboard shortcuts
grid.rowShortcuts = [...];
grid.showShortcutsHelp = true;

// Virtual scroll
grid.virtualScroll = true;
grid.virtualScrollRowHeight = 38;
grid.virtualScrollBuffer = 10;

// Infinite scroll
grid.infiniteScroll = true;
grid.hasMoreItems = true;
```

## Column Definition

```typescript
{
  field: 'name',              // Property name in row data (required)
  title: 'Full Name',         // Header text (required)
  width: '150px',             // Fixed width
  minWidth: '100px',          // Minimum width
  align: 'left',              // 'left' | 'center' | 'right'
  textOverflow: 'ellipsis',   // 'wrap' | 'ellipsis'

  // Sorting & filtering
  sortable: true,
  filterable: true,

  // Display
  headerInfo: 'Tooltip text', // Info icon in header
  formatCallback: (value, row) => value.toUpperCase(),
  tooltipCallback: (value, row) => `Details: ${value}`,
  cellClass: 'custom-class',
  cellClassCallback: (value, row) => value > 100 ? 'high' : null,

  // Editing
  editable: true,
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

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `onrowchange` | `{ row, field, oldValue, newValue, isValid }` | Value changed |
| `ondatarequest` | `{ sort, page, pageSize, skip, trigger }` | Sort/page changed |
| `onroweditstart` | `{ row, rowIndex, field }` | Edit started |
| `onroweditcancel` | `{ row, rowIndex, field }` | Edit cancelled |
| `onvalidationerror` | `{ row, rowIndex, field, error }` | Validation failed |
| `onrowdelete` | `{ row, rowIndex }` | Ctrl+Delete pressed |
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
grid.showRowToolbar = true
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

grid.showShortcutsHelp = true
```

### Virtual Scrolling

```javascript
grid.virtualScroll = true
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
