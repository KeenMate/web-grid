# @keenmate/web-grid

A framework-agnostic data grid web component with sorting, filtering, inline editing, and keyboard navigation.

## Installation

```bash
npm install @keenmate/web-grid
```

## Quick Start

```html
<script type="module">
  import '@keenmate/web-grid'

  const grid = document.querySelector('web-grid')

  // Define columns
  grid.columns = [
    { field: 'name', title: 'Name' },
    { field: 'email', title: 'Email' },
    { field: 'age', title: 'Age', align: 'right' }
  ]

  // Set data
  grid.items = [
    { name: 'John', email: 'john@example.com', age: 30 },
    { name: 'Jane', email: 'jane@example.com', age: 25 }
  ]
</script>

<web-grid></web-grid>
```

## Column Configuration

Columns define how data is displayed and edited. Each column maps to a field in your data:

```javascript
grid.columns = [
  {
    field: 'name',           // Property name in data objects
    title: 'Full Name',      // Header text
    width: '150px',          // Fixed width (optional)
    minWidth: '100px',       // Minimum width
    align: 'left',           // 'left' | 'center' | 'right'

    // Sorting & filtering
    sortable: true,          // Allow sorting by this column
    filterable: true,        // Show filter input in header

    // Display formatting
    formatCallback: (value, row) => value.toUpperCase(),
    tooltipCallback: (value, row) => `Full name: ${value}`,

    // Editing (see Editor Types section)
    editable: true,
    editor: 'text',
    editorOptions: { /* editor-specific options */ }
  }
]
```

### Column Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `field` | string | Property name in row data (required) |
| `title` | string | Column header text (required) |
| `width` | string | Fixed column width (e.g., `'150px'`) |
| `minWidth` | string | Minimum column width |
| `maxWidth` | string | Maximum column width |
| `align` | string | Text alignment: `'left'`, `'center'`, `'right'` |
| `textOverflow` | string | `'wrap'` or `'ellipsis'` for long text |
| `sortable` | boolean | Enable sorting for this column |
| `filterable` | boolean | Show filter input in header |
| `editable` | boolean | Enable inline editing |
| `editor` | string | Editor type (see below) |
| `editorOptions` | object | Editor-specific configuration |
| `headerInfo` | string | Info tooltip next to header (shows icon) |
| `cellClass` | string | CSS class(es) for all cells in column |
| `cellClassCallback` | function | Dynamic CSS class based on value/row |
| `formatCallback` | function | Transform value for display |
| `tooltipCallback` | function | Dynamic cell tooltip |
| `validateCallback` | function | Validate before commit |
| `beforeCommitCallback` | function | Validate and transform value |

## Editor Types

The grid supports multiple editor types for inline editing:

### Text Editor
```javascript
{
  field: 'name',
  editor: 'text',
  editorOptions: {
    placeholder: 'Enter name...',
    maxLength: 100,
    pattern: '[A-Za-z ]+',
    inputMode: 'text'  // 'text' | 'numeric' | 'email' | 'tel' | 'url'
  }
}
```

### Number Editor
```javascript
{
  field: 'salary',
  editor: 'number',
  formatCallback: (val) => `$${val.toLocaleString()}`,
  editorOptions: {
    min: 0,
    max: 1000000,
    step: 1000,
    decimalPlaces: 2,
    allowNegative: false
  }
}
```

### Date Editor
```javascript
{
  field: 'startDate',
  editor: 'date',
  editorOptions: {
    dateFormat: 'DD.MM.YYYY',     // Display format
    outputFormat: 'iso',          // 'date' | 'iso' | 'timestamp'
    minDate: '2020-01-01',
    maxDate: '2030-12-31'
  }
}
```

### Select Editor (Dropdown)
```javascript
{
  field: 'department',
  editor: 'select',
  editorOptions: {
    options: [
      { value: 'eng', label: 'Engineering', icon: '⚙️', subtitle: 'Tech team' },
      { value: 'sales', label: 'Sales', icon: '💼' },
      { value: 'hr', label: 'HR', disabled: true }
    ],
    allowEmpty: true,
    emptyLabel: '-- Select --',
    iconMember: 'icon',           // Property for icon
    subtitleMember: 'subtitle',   // Property for subtitle
    disabledMember: 'disabled'    // Property for disabled state
  }
}
```

### Combobox Editor (Editable Dropdown)
```javascript
{
  field: 'location',
  editor: 'combobox',
  editorOptions: {
    options: [
      { value: 'NYC', label: 'New York' },
      { value: 'LA', label: 'Los Angeles' }
    ]
    // User can type custom values not in the list
  }
}
```

### Autocomplete Editor (Search-based)
```javascript
{
  field: 'manager',
  editor: 'autocomplete',
  editorOptions: {
    initialOptions: [
      { value: 'john', label: 'John Doe' },
      { value: 'jane', label: 'Jane Smith' }
    ],
    placeholder: 'Search managers...',
    minSearchLength: 2,
    debounceMs: 300,
    onSearchCallback: async (query, row, signal) => {
      const response = await fetch(`/api/managers?q=${query}`, { signal })
      return response.json()  // Returns [{ value, label }, ...]
    }
  }
}
```

### Checkbox Editor
```javascript
{
  field: 'active',
  editor: 'checkbox',
  editorOptions: {
    trueValue: 'yes',    // Value when checked (default: true)
    falseValue: 'no'     // Value when unchecked (default: false)
  }
}
```

### Custom Editor
```javascript
{
  field: 'notes',
  editor: 'custom',
  cellEditCallback: (context) => {
    // context.value - current value
    // context.row - full row data
    // context.rowIndex - row index
    // context.field - column field name
    // context.commit(newValue) - save and close
    // context.cancel() - discard and close

    const newValue = prompt('Edit:', context.value)
    if (newValue !== null) {
      context.commit(newValue)
    } else {
      context.cancel()
    }
  }
}
```

## Grid Properties

Configure grid behavior via attributes or properties:

```html
<!-- Via attributes -->
<web-grid
  striped
  hoverable
  sortable
  pageable
  page-size="25"
></web-grid>
```

```javascript
// Via JavaScript
grid.striped = true
grid.hoverable = true
grid.sortMode = 'multi'        // 'none' | 'single' | 'multi'
grid.pageable = true
grid.pageSize = 25
grid.editable = true
grid.editTrigger = 'navigate'  // 'click' | 'dblclick' | 'navigate'
grid.showRowNumbers = true
```

### Grid Properties Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | array | `[]` | Data array |
| `columns` | array | `[]` | Column definitions |
| `striped` | boolean | `false` | Alternating row colors |
| `hoverable` | boolean | `false` | Highlight row on hover |
| `sortMode` | string | `'none'` | `'none'`, `'single'`, or `'multi'` |
| `filterable` | boolean | `false` | Show column filters |
| `pageable` | boolean | `false` | Enable pagination |
| `pageSize` | number | `10` | Rows per page |
| `pageSizes` | array | `[10,25,50,100]` | Page size options |
| `currentPage` | number | `1` | Current page (1-based) |
| `editable` | boolean | `false` | Enable inline editing |
| `editTrigger` | string | `'dblclick'` | How to start editing |
| `showRowNumbers` | boolean | `false` | Show row number column |
| `virtualScroll` | boolean | `false` | Enable virtual scrolling |
| `virtualScrollThreshold` | number | `100` | Auto-enable virtual scroll |

## Events

Listen for grid events:

```javascript
// Row value changed
grid.onrowchange = (detail) => {
  console.log('Changed:', detail.field, detail.oldValue, '→', detail.newValue)
  console.log('Row:', detail.row)
  console.log('Is valid:', detail.isValid)
}

// Data request (sort/page changed)
grid.ondatarequest = (detail) => {
  console.log('Sort:', detail.sort)        // [{ column, direction }]
  console.log('Page:', detail.page)
  console.log('PageSize:', detail.pageSize)
  console.log('Skip:', detail.skip)        // For server-side offset

  // Fetch new data from server
  fetchData(detail).then(data => {
    grid.items = data.items
    grid.totalItems = data.total
  })
}

// Edit started
grid.onroweditstart = ({ row, rowIndex, field }) => {
  console.log('Started editing:', field)
}

// Edit cancelled
grid.onroweditcancel = ({ row, rowIndex, field }) => {
  console.log('Cancelled editing:', field)
}

// Validation error
grid.onvalidationerror = ({ row, rowIndex, field, error }) => {
  console.log('Validation failed:', error)
}

// Row delete (Ctrl+Delete pressed)
grid.onrowdelete = ({ row, rowIndex }) => {
  if (confirm(`Delete ${row.name}?`)) {
    grid.items = grid.items.filter((_, i) => i !== rowIndex)
  }
}
```

## Row Toolbar

Add a floating toolbar with action buttons:

```javascript
grid.showRowToolbar = true
grid.toolbarPosition = 'right'     // 'auto' | 'left' | 'right' | 'top'
grid.toolbarTrigger = 'hover'      // 'hover' | 'click' | 'button'

// Predefined actions
grid.rowToolbar = ['add', 'delete', 'duplicate', 'moveUp', 'moveDown']

// Custom actions
grid.rowToolbar = [
  'delete',
  {
    id: 'edit',
    icon: '✏️',
    title: 'Edit',
    onclick: ({ row, rowIndex }) => openEditDialog(row)
  },
  {
    id: 'archive',
    icon: '📦',
    title: 'Archive',
    danger: true,
    disabled: (row, rowIndex) => row.status === 'archived',
    onclick: ({ row }) => archiveRow(row)
  }
]

// Handle toolbar clicks
grid.ontoolbarclick = ({ item, row, rowIndex }) => {
  console.log('Toolbar clicked:', item.id)
}
```

## Context Menu

Add a right-click context menu:

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
    id: 'edit',
    label: (ctx) => `Edit ${ctx.column.title}`,
    icon: '✏️',
    onclick: (ctx) => grid.startEdit(ctx.rowIndex, ctx.colIndex)
  },
  {
    id: 'delete',
    label: 'Delete row',
    icon: '🗑️',
    danger: true,
    dividerBefore: true,
    disabled: (ctx) => ctx.row.protected,
    visible: (ctx) => ctx.row.canDelete,
    onclick: (ctx) => deleteRow(ctx.rowIndex)
  }
]
```

## Keyboard Shortcuts

Define custom shortcuts for the grid:

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
  },
  {
    key: 'F3',
    id: 'open-detail',
    label: 'Open detail',
    disabled: (ctx) => !ctx.row.id,
    action: (ctx) => openDetail(ctx.row)
  }
]

grid.showShortcutsHelp = true              // Show ? icon
grid.shortcutsHelpPosition = 'top-right'   // Icon position
```

### Built-in Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Navigate cells |
| Tab / Shift+Tab | Next/previous editable cell |
| Enter / F2 | Start editing |
| Escape | Cancel edit / clear focus |
| Space | Toggle checkbox / open dropdown |
| Home / End | First/last cell in row |
| Ctrl+Home / Ctrl+End | First/last cell in grid |
| PageUp / PageDown | Move by ~10 rows |
| Ctrl+Up / Ctrl+Down | Move row up/down |
| Ctrl+Delete | Delete row (fires `onrowdelete`) |

## Virtual Scrolling

For large datasets (1000+ rows), enable virtual scrolling:

```javascript
grid.virtualScroll = true
grid.virtualScrollRowHeight = 38    // Row height in pixels
grid.virtualScrollBuffer = 10       // Extra rows rendered above/below

// Or auto-enable based on item count
grid.virtualScrollThreshold = 100   // Enable when items >= 100
```

## Infinite Scroll

Load more data as user scrolls:

```javascript
grid.infiniteScroll = true
grid.hasMoreItems = true
grid.infiniteScrollThreshold = 100  // Distance from bottom in px

grid.ondatarequest = async (detail) => {
  if (detail.trigger === 'loadMore') {
    const moreData = await fetchMore(detail.skip, detail.pageSize)
    grid.items = [...grid.items, ...moreData.items]
    grid.hasMoreItems = moreData.hasMore
  }
}
```

## Custom Styling

### Cell & Row Styling

```javascript
// Static cell class
{ field: 'status', cellClass: 'status-cell' }

// Dynamic cell class
{
  field: 'salary',
  cellClassCallback: (value, row) => value > 100000 ? 'high-salary' : null
}

// Dynamic row class
grid.rowClassCallback = (row, index) => {
  if (row.status === 'inactive') return 'row-inactive'
  return null
}

// Inject custom CSS into shadow DOM
grid.customStylesCallback = () => `
  .high-salary { background-color: #d1fae5 !important; }
  .row-inactive { opacity: 0.6; }
`
```

### CSS Variables

Override CSS custom properties for theming:

```css
web-grid {
  /* Colors */
  --wg-accent-color: #0078d4;
  --wg-text-color: #1a1a1a;
  --wg-header-background: #f8fafc;
  --wg-row-hover-background: #f1f5f9;
  --wg-row-stripe-background: #fafafa;

  /* Typography */
  --wg-font-family: system-ui, sans-serif;
  --wg-font-size-base: 14px;

  /* Spacing */
  --wg-cell-padding: 8px 12px;
  --wg-border-radius: 4px;
}
```

The grid integrates with [@keenmate/theme-designer](https://github.com/keenmate/theme-designer) via `--base-*` CSS variables for consistent theming across KeenMate components.

## Server-Side Operations

For server-side sorting, filtering, and pagination:

```javascript
grid.ondatarequest = async (detail) => {
  // detail contains: sort, page, pageSize, skip, trigger
  const response = await fetch('/api/data?' + new URLSearchParams({
    sort: JSON.stringify(detail.sort),
    skip: detail.skip,
    take: detail.pageSize
  }))

  const data = await response.json()
  grid.items = data.items
  grid.totalItems = data.total  // For pagination
}
```

## Features

- **Sorting** - Single and multi-column sorting with visual indicators
- **Filtering** - Column-based filtering
- **Pagination** - Built-in pagination with customizable page sizes
- **Inline Editing** - Multiple editor types (text, number, date, select, combobox, autocomplete, checkbox, custom)
- **Keyboard Navigation** - Excel-like navigation with Enter, Tab, Arrow keys
- **Row Toolbar** - Floating action buttons (add, delete, duplicate, move)
- **Context Menu** - Right-click menus with custom actions
- **Keyboard Shortcuts** - Custom grid-level shortcuts with help overlay
- **Virtual Scrolling** - Efficient rendering for large datasets (10,000+ rows)
- **Infinite Scroll** - Load more data as user scrolls
- **Custom Styling** - Cell and row styling via callbacks
- **Dark Mode** - Automatic dark mode support via CSS variables
- **Shadow DOM** - Encapsulated styles that don't leak

## Documentation

See the [live showcase](https://web-grid.keenmate.com) for interactive examples and full API documentation.

## Development

This is a monorepo using npm workspaces:

```
web-grid/
├── packages/web-grid/   # The library
└── docs/                # Documentation site
```

### Commands

```bash
make setup     # Install dependencies
make dev       # Start dev server with HMR
make build     # Build library and docs
make package   # Build library for publishing
make publish   # Publish to npm
```

## Browser Support

Modern browsers with Custom Elements v1 support:
- Chrome 67+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## License

MIT

## Related

- [@keenmate/web-multiselect](https://github.com/keenmate/web-multiselect) - Multiselect dropdown component
- [@keenmate/web-daterangepicker](https://github.com/keenmate/web-daterangepicker) - Date range picker component
- [@keenmate/theme-designer](https://github.com/keenmate/theme-designer) - CSS variable theming system
