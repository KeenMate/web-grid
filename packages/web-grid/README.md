# @keenmate/web-grid

A feature-rich, framework-agnostic data grid web component with sorting, filtering, pagination, inline editing, row toolbar, and context menu support.

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
    { field: 'name', title: 'Name' },
    { field: 'age', title: 'Age' }
  ]
  grid.sortMode = 'multi'  // Enable multi-column sorting
</script>
```

### UMD (Script Tag)

```html
<script src="https://unpkg.com/@keenmate/web-grid"></script>
<web-grid id="grid"></web-grid>
```

## Features

- **Sorting** - Single or multi-column sorting with `sortMode` property
- **Filtering** - Per-column text input filters
- **Pagination** - Configurable page size with navigation
- **Inline Editing** - 7 editor types with validation support
- **Navigate Mode** - Spreadsheet-like keyboard navigation
- **Row Toolbar** - Floating action buttons on hover
- **Context Menu** - Right-click menu with dynamic options
- **Dark Mode** - Built-in dark theme support via CSS variables
- **Shadow DOM** - Encapsulated styles with CSS variable customization
- **TypeScript** - Full type definitions included

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `Array` | `[]` | Data array to display |
| `columns` | `Array<Column>` | `[]` | Column definitions |
| `sortMode` | `string` | `'none'` | Sort mode: `'none'`, `'single'`, `'multi'` |
| `filterable` | `boolean` | `false` | Enable column filtering |
| `pageable` | `boolean` | `false` | Enable pagination |
| `pageSize` | `number` | `10` | Rows per page |
| `editable` | `boolean` | `false` | Enable cell editing |
| `editTrigger` | `string` | `'dblclick'` | Edit trigger: `'click'`, `'dblclick'`, `'navigate'` |
| `editStartSelection` | `string` | `'mousePosition'` | Cursor position when entering edit: `'mousePosition'`, `'selectAll'`, `'cursorAtStart'`, `'cursorAtEnd'` |
| `striped` | `boolean` | `false` | Alternate row colors |
| `hoverable` | `boolean` | `false` | Highlight row on hover |
| `showRowToolbar` | `boolean` | `false` | Show row action toolbar |
| `rowToolbar` | `Array` | `[]` | Toolbar items configuration |
| `toolbarTrigger` | `string` | `'hover'` | Toolbar trigger: `'hover'`, `'click'`, `'button'` |
| `toolbarPosition` | `string` | `'auto'` | Toolbar position: `'auto'`, `'left'`, `'right'`, `'top'` |
| `toolbarAlign` | `string` | `'center'` | Vertical alignment for left/right: `'center'`, `'top'` |
| `toolbarTopPosition` | `string` | `'center'` | Horizontal position for top: `'start'`, `'center'`, `'end'`, `'cursor'` |
| `contextMenu` | `Array` | `[]` | Context menu items |
| `validationTooltipCallback` | `Function` | `undefined` | Custom HTML tooltip for validation errors: `({ field, error, value, row, rowIndex }) => htmlString` |

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
  sortable: false,              // Disable sorting for this column (when grid has sortMode enabled)
  filterable: true,             // Enable filtering
  editable: true,               // Enable editing
  editor: 'text',               // Editor type
  editorOptions: {},            // Editor configuration
  formatCallback: (value, row) => '',        // Value formatter
  templateCallback: (row, column) => '',     // Custom cell HTML
  cellClassCallback: (value, row) => '',     // Dynamic CSS class
  beforeCommitCallback: (ctx) => true,       // Validation
  validationTooltipCallback: (ctx) => ''     // Custom HTML for validation error tooltip
}
```

## Editor Types

| Type | Description | Options |
|------|-------------|---------|
| `text` | Text input | `placeholder`, `maxLength`, `inputMode` |
| `number` | Number input | `min`, `max`, `step` |
| `checkbox` | Boolean toggle | - |
| `select` | Dropdown list | `options`, `allowEmpty`, `emptyLabel` |
| `combobox` | Filterable dropdown | `options`, `placeholder` |
| `autocomplete` | Async search | `onSearchCallback(query)`, `placeholder`, `minSearchLength` |
| `date` | Date picker | `min`, `max` |

## Row Toolbar

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

// Positioning
grid.toolbarPosition = 'left'     // Prefer left side (falls back if no space)
grid.toolbarAlign = 'top'         // Align to top of row (for left/right position)
grid.toolbarTopPosition = 'cursor' // Position at cursor (for top position)
```

## Context Menu

```javascript
grid.contextMenu = [
  {
    id: 'view',
    label: 'View Details',
    icon: '👁️',
    visible: (ctx) => true,
    disabled: (ctx) => false,
    danger: false,
    onclick: (ctx) => {}
  }
]
```

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `rowchange` | `{ rowIndex, field, oldValue, newValue, row }` | Cell value changed |
| `roweditstart` | `{ rowIndex, field, row }` | Edit started |
| `roweditend` | `{ rowIndex, field, row, committed }` | Edit ended |
| `rowaction` | `{ action, rowIndex, row }` | Toolbar action |

## Styling

WebGrid uses CSS custom properties with a fallback chain:

```css
web-grid {
  /* Override component variables directly */
  --wg-accent-color: #10b981;
  --wg-header-bg: #f5f5f5;
}

/* Or set base variables for all KeenMate components */
:root {
  --base-accent-color: #10b981;
  --base-surface-1: #ffffff;
}
```

### Key Variables

| Variable | Description |
|----------|-------------|
| `--wg-accent-color` | Primary accent color |
| `--wg-text-color-1` | Primary text color |
| `--wg-surface-1` | Background color |
| `--wg-surface-2` | Alternate row/header background |
| `--wg-border-color` | Border color |

### Component Variables Manifest

A machine-readable manifest documenting all CSS variables is included in the package:

```javascript
import manifest from '@keenmate/web-grid/manifest'

console.log(manifest.prefix)              // "wg"
console.log(manifest.baseVariables)       // 34 --base-* variables consumed
console.log(manifest.componentVariables)  // 121 --wg-* variables exposed
```

The manifest follows the [component-variables schema](https://raw.githubusercontent.com/keenmate/schemas/main/component-variables.schema.json) and contains:

- **baseVariables** - Theme variables (`--base-*`) the component consumes from `@keenmate/theme-designer`
- **componentVariables** - Component-specific variables (`--wg-*`) with category and usage descriptions

Example entry:
```json
{
  "name": "wg-header-bg",
  "category": "header",
  "usage": "Header row background color"
}
```

### Dark Mode

Dark mode is triggered automatically by:
- OS preference: `@media (prefers-color-scheme: dark)`
- Attribute: `data-theme="dark"` on ancestor
- Bootstrap: `data-bs-theme="dark"` on ancestor
- Class: `.dark` on ancestor (Tailwind CSS)

## Dynamic Cell Styling

```javascript
// Per-cell styling via column callback
grid.columns = [{
  field: 'salary',
  cellClassCallback: (value, row) => value > 90000 ? 'high-value' : null
}]

// Per-row styling
grid.rowClassCallback = (row, index) => row.status === 'inactive' ? 'row-inactive' : null

// Inject custom CSS into shadow DOM
grid.customStylesCallback = () => `
  .high-value { background: #d1fae5 !important; }
  .row-inactive { opacity: 0.5; }
`
```

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

## License

MIT
