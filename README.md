# QuickGrid Web Component

A feature-rich, high-performance data grid web component with sorting, filtering, pagination, inline editing, row toolbar, and context menu support.

## Installation

```bash
npm install quick-grid-wc
```

## Usage

### ES Module (recommended)

```html
<script type="module">
  import 'quick-grid-wc'
</script>

<quick-grid id="grid"></quick-grid>

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

### Script Tag (IIFE)

```html
<script src="dist/quick-grid.iife.js"></script>
<quick-grid id="grid"></quick-grid>
```

## API Reference

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `Array` | `[]` | Data array to display |
| `columns` | `Array<Column>` | `[]` | Column definitions |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `filterable` | `boolean` | `false` | Enable column filtering |
| `paginate` | `boolean` | `false` | Enable pagination |
| `pageSize` | `number` | `10` | Rows per page |
| `editable` | `boolean` | `false` | Enable cell editing |
| `editTrigger` | `string` | `'dblclick'` | Edit trigger: `'click'`, `'dblclick'`, `'navigate'` |
| `striped` | `boolean` | `false` | Alternate row colors |
| `hoverable` | `boolean` | `false` | Highlight row on hover |
| `showRowToolbar` | `boolean` | `false` | Show row action toolbar |
| `rowToolbar` | `Array` | `[]` | Toolbar items configuration |
| `toolbarTrigger` | `string` | `'hover'` | Toolbar trigger: `'hover'`, `'button'` |
| `contextMenu` | `Array` | `[]` | Context menu items |

### Column Definition

```javascript
{
  field: 'fieldName',           // Data field name (required)
  title: 'Column Title',        // Display title
  width: '100px',               // Column width (CSS value)
  minWidth: '50px',             // Minimum width
  maxWidth: '300px',            // Maximum width
  align: 'left',                // Text alignment: 'left', 'center', 'right'
  sortable: true,               // Enable sorting for this column
  filterable: true,             // Enable filtering for this column
  editable: true,               // Enable editing for this column
  editor: 'text',               // Editor type (see Editor Types)
  editorOptions: {},            // Editor-specific options
  format: (value, row) => '',   // Value formatter function
  onbeforecommit: (ctx) => true // Validation function
}
```

### Editor Types

| Type | Description | Options |
|------|-------------|---------|
| `text` | Text input | `placeholder`, `maxLength`, `inputMode` |
| `number` | Number input | `min`, `max`, `step` |
| `checkbox` | Boolean toggle | - |
| `select` | Dropdown list | `options`, `allowEmpty`, `emptyLabel` |
| `combobox` | Filterable dropdown | `options`, `placeholder` |
| `autocomplete` | Async search dropdown | `search(query)`, `placeholder`, `minLength` |
| `date` | Date picker | `min`, `max` |

### Row Toolbar Items

Predefined items: `'add'`, `'delete'`, `'duplicate'`, `'moveUp'`, `'moveDown'`

Custom items:
```javascript
{
  id: 'custom',
  icon: '🔧',
  title: 'Custom Action',
  danger: false   // Red styling for destructive actions
}
```

### Context Menu Items

```javascript
{
  id: 'view',
  label: 'View Details',           // String or function: (ctx) => string
  icon: '👁️',
  visible: (ctx) => true,          // Show/hide based on context
  disabled: (ctx) => false,        // Enable/disable based on context
  danger: false,                   // Red styling for destructive actions
  dividerBefore: false,            // Add separator line above
  onclick: (ctx) => {}             // Click handler
}
```

Context object (`ctx`):
- `row` - The row data object
- `rowIndex` - Row index in filtered data
- `column` - Column definition
- `field` - Field name
- `cellValue` - Current cell value

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `rowchange` | `{ rowIndex, field, oldValue, newValue, row, isValid, validationError }` | Cell value changed |
| `roweditstart` | `{ rowIndex, field, row }` | Cell editing started |
| `roweditend` | `{ rowIndex, field, row, committed }` | Cell editing ended |
| `rowaction` | `{ action, rowIndex, row }` | Row toolbar action clicked |
| `contextmenuopen` | `{ row, rowIndex, column, cellValue }` | Context menu opened |
| `sort` | `{ field, direction }` | Column sorted |
| `filter` | `{ filters }` | Filter applied |
| `page` | `{ page, pageSize }` | Page changed |

### Methods

| Method | Description |
|--------|-------------|
| `scheduleRender()` | Request a re-render |
| `startEdit(rowIndex, field)` | Start editing a cell |
| `commitEdit()` | Commit current edit |
| `cancelEdit()` | Cancel current edit |

## Examples

### Basic Grid

```javascript
grid.items = data
grid.columns = [
  { field: 'id', title: 'ID' },
  { field: 'name', title: 'Name', sortable: true }
]
grid.sortable = true
```

### Editable Grid

```javascript
grid.editable = true
grid.columns = [
  { field: 'name', title: 'Name', editable: true, editor: 'text' },
  {
    field: 'status',
    title: 'Status',
    editable: true,
    editor: 'select',
    editorOptions: {
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  }
]

grid.addEventListener('rowchange', (e) => {
  const { rowIndex, field, newValue } = e.detail
  // Update your data store
})
```

### Row Toolbar

```javascript
grid.showRowToolbar = true
grid.rowToolbar = ['add', 'delete', 'duplicate', 'moveUp', 'moveDown']

grid.addEventListener('rowaction', (e) => {
  const { action, rowIndex, row } = e.detail
  switch (action) {
    case 'add':
      // Add new row
      break
    case 'delete':
      // Delete row
      break
  }
})
```

### Context Menu

```javascript
grid.contextMenu = [
  {
    id: 'view',
    label: 'View Details',
    icon: '👁️',
    onclick: (ctx) => console.log('View:', ctx.row)
  },
  {
    id: 'copy',
    label: (ctx) => `Copy "${ctx.column.title}"`,
    icon: '📋',
    onclick: (ctx) => navigator.clipboard.writeText(String(ctx.cellValue))
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: '🗑️',
    danger: true,
    dividerBefore: true,
    disabled: (ctx) => ctx.row.protected,
    onclick: (ctx) => deleteRow(ctx.rowIndex)
  }
]
```

### Validation

```javascript
{
  field: 'email',
  title: 'Email',
  editable: true,
  editor: 'text',
  onbeforecommit: ({ value }) => {
    if (!value || !value.includes('@')) {
      return 'Please enter a valid email'
    }
    return true
  }
}
```

## Styling

QuickGrid uses CSS custom properties for theming. Override these to customize appearance:

```css
quick-grid {
  --neutral-stroke-rest: #e0e0e0;
  --neutral-fill-rest: #f5f5f5;
  --neutral-fill-hover: #ebebeb;
  --neutral-foreground-rest: #333;
  --accent-fill-rest: #0078d4;
  --accent-foreground-rest: white;
}
```

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT
