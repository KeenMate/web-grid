# @keenmate/web-grid

A feature-rich, zero-dependency data grid web component with sorting, filtering, pagination, inline editing, row toolbar, and context menu support.

## Installation

```bash
npm install @keenmate/web-grid
```

## Usage

### ES Module (recommended)

```html
<script type="module">
  import '@keenmate/web-grid'
</script>

<web-grid id="grid"></web-grid>

<script type="module">
  const grid = document.getElementById('grid')
  grid.items = [
    { id: 1, name: 'Alice', age: 28 },
    { id: 2, name: 'Bob', age: 34 }
  ]
  grid.columns = [
    { field: 'id', title: 'ID', width: '60px' },
    { field: 'name', title: 'Name', sortable: true },
    { field: 'age', title: 'Age', sortable: true }
  ]
</script>
```

### UMD (Script Tag)

```html
<script src="dist/web-grid.umd.js"></script>
<web-grid id="grid"></web-grid>
```

## Features

- **Sorting** - Click column headers to sort ascending/descending
- **Filtering** - Per-column text input filters
- **Pagination** - Configurable page size with navigation
- **Inline Editing** - 7 editor types with validation support
- **Navigate Mode** - Spreadsheet-like keyboard navigation
- **Row Toolbar** - Floating action buttons on hover
- **Context Menu** - Right-click menu with dynamic options
- **Dark Mode** - Built-in dark theme support
- **Zero Dependencies** - Pure JavaScript web component
- **Shadow DOM** - Encapsulated styles

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `Array` | `[]` | Data array to display |
| `columns` | `Array<Column>` | `[]` | Column definitions |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `filterable` | `boolean` | `false` | Enable column filtering |
| `pageable` | `boolean` | `false` | Enable pagination |
| `pageSize` | `number` | `10` | Rows per page |
| `editable` | `boolean` | `false` | Enable cell editing |
| `editTrigger` | `string` | `'dblclick'` | Edit trigger: `'click'`, `'dblclick'`, `'navigate'` |
| `striped` | `boolean` | `false` | Alternate row colors |
| `hoverable` | `boolean` | `false` | Highlight row on hover |
| `showRowToolbar` | `boolean` | `false` | Show row action toolbar |
| `rowToolbar` | `Array` | `[]` | Toolbar items configuration |
| `toolbarTrigger` | `string` | `'hover'` | Toolbar trigger: `'hover'`, `'button'` |
| `contextMenu` | `Array` | `[]` | Context menu items |
| `checkboxAlwaysEditable` | `boolean` | `true` | Checkboxes toggle without entering edit mode |

## Column Definition

```javascript
{
  field: 'fieldName',           // Data field name (required)
  title: 'Column Title',        // Display title
  width: '100px',               // Column width
  minWidth: '50px',             // Minimum width
  maxWidth: '300px',            // Maximum width
  align: 'left',                // 'left', 'center', 'right'
  textOverflow: 'wrap',         // 'wrap' or 'ellipsis'
  sortable: true,               // Enable sorting
  filterable: true,             // Enable filtering
  editable: true,               // Enable editing
  editor: 'text',               // Editor type
  editorOptions: {},            // Editor options
  format: (value, row) => '',   // Value formatter
  template: (value, row, col) => '', // Custom cell template
  onbeforecommit: (ctx) => true,     // Validation
  beforeCopyCallback: (value, row) => value,  // Transform before copy
  beforePasteCallback: (value, row) => value  // Process pasted value
}
```

## Editor Types

| Type | Description | Options |
|------|-------------|---------|
| `text` | Text input | `placeholder`, `maxLength`, `inputMode` |
| `number` | Number input | `min`, `max`, `step` |
| `checkbox` | Boolean toggle | - |
| `select` | Dropdown list | `options`, `allowEmpty`, `emptyLabel`, `showOnFocus` |
| `combobox` | Filterable dropdown | `options`, `placeholder`, `showOnFocus` |
| `autocomplete` | Async search | `onSearch(query)`, `placeholder`, `minSearchLength`, `showOnFocus` |
| `date` | Date picker | `min`, `max` |

### Editor Options

```javascript
// Select/Combobox options
editorOptions: {
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ],
  valueMember: 'value',    // Property for value (default: 'value')
  displayMember: 'label',  // Property for display (default: 'label')
  allowEmpty: true,        // Allow empty selection (select only)
  emptyLabel: '-- Select --',
  showOnFocus: true        // Auto-open when navigating with arrows
}

// Autocomplete
editorOptions: {
  placeholder: 'Search...',
  minSearchLength: 1,
  onSearch: async (query) => {
    // Return array of { value, label } objects
    return await fetchResults(query)
  }
}
```

## Row Toolbar

Predefined items: `'add'`, `'delete'`, `'duplicate'`, `'moveUp'`, `'moveDown'`

```javascript
grid.showRowToolbar = true
grid.rowToolbar = ['add', 'delete', 'duplicate', 'moveUp', 'moveDown']

// Custom items
grid.rowToolbar = [
  'add',
  {
    id: 'custom',
    icon: '🔧',
    title: 'Custom Action',
    danger: false,
    onclick: ({ row, rowIndex }) => { /* ... */ }
  }
]
```

## Context Menu

```javascript
grid.contextMenu = [
  {
    id: 'view',
    label: 'View Details',           // String or (ctx) => string
    icon: '👁️',
    visible: (ctx) => true,          // Show/hide
    disabled: (ctx) => false,        // Enable/disable
    danger: false,                   // Red styling
    dividerBefore: false,            // Separator line
    onclick: (ctx) => {}
  }
]
```

Context object (`ctx`): `row`, `rowIndex`, `column`, `field`, `cellValue`

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `rowchange` | `{ rowIndex, field, oldValue, newValue, row, isValid, validationError }` | Cell changed |
| `roweditstart` | `{ rowIndex, field, row }` | Edit started |
| `roweditend` | `{ rowIndex, field, row, committed }` | Edit ended |
| `rowaction` | `{ action, rowIndex, row }` | Toolbar action |
| `contextmenuopen` | `{ row, rowIndex, column, cellValue }` | Menu opened |
| `sort` | `{ field, direction }` | Column sorted |
| `filter` | `{ filters }` | Filter applied |
| `pagechange` | `{ page, pageSize }` | Page changed |

## Validation

```javascript
{
  field: 'email',
  editable: true,
  editor: 'text',
  onbeforecommit: async ({ value, oldValue, row, field }) => {
    if (!value || !value.includes('@')) {
      return 'Please enter a valid email'  // Return error message
    }
    return true  // Valid
  }
}
```

## Styling

WebGrid uses CSS custom properties with a 3-tier inheritance system:

```css
web-grid {
  /* Override component variables directly */
  --wg-accent-color: #10b981;
  --wg-border-radius: 8px;
}

/* Or set base variables for all KeenMate components */
:root {
  --base-accent-color: #10b981;
  --base-border-radius: 8px;
}
```

### Key Variables

| Variable | Description |
|----------|-------------|
| `--wg-accent-color` | Primary accent color |
| `--wg-text-color-1` | Primary text color |
| `--wg-text-color-2` | Secondary text color |
| `--wg-layer-1` | Background color |
| `--wg-layer-2` | Alternate row/header background |
| `--wg-border-color` | Border color |
| `--wg-border-radius` | Border radius |

### Dark Mode

```html
<!-- Using attribute -->
<web-grid theme="dark"></web-grid>

<!-- Or via parent context -->
<div data-theme="dark">
  <web-grid></web-grid>
</div>
```

## Examples

See the `examples/` directory:
- `basic.html` - Sorting, filtering, pagination
- `editable.html` - All editor types and validation
- `context-menu.html` - Right-click context menu
- `row-toolbar.html` - Floating row actions

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (port 12500)
npm run build      # Build to dist/
npm run package    # Build and create tarball
```

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

## License

MIT
