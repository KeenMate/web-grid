# QuickGrid Web Component Conversion Plan

This document outlines the step-by-step plan to convert the Svelte 5 QuickGrid component to a pure vanilla JavaScript Web Component.

## Source Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `QuickGrid.svelte` | ~2,400 | Main grid component |
| `GridCellEditor.svelte` | ~1,016 | Cell editor (text, number, checkbox, select, combobox, autocomplete, date) |
| `PositioningRegion.svelte` | ~169 | Dropdown/tooltip positioning |
| `Icon.svelte` | ~231 | FluentUI icon loader (optional) |
| `types/index.ts` | ~15 | Type definitions |

## Target Output Structure

```
web-grid-3/
├── dist/
│   ├── quick-grid.js          # Main component (ES module)
│   ├── quick-grid.min.js      # Minified bundle
│   └── quick-grid.css         # Optional external styles (for non-Shadow DOM use)
├── src/
│   ├── quick-grid.js          # Main QuickGrid web component
│   ├── grid-cell-editor.js    # Cell editor component (internal)
│   ├── positioning-region.js  # Positioning utility (internal)
│   ├── utils.js               # Shared utilities
│   └── styles.js              # CSS as JS template literal
└── examples/
    ├── basic.html
    ├── editable.html
    └── context-menu.html
```

---

## Phase 1: Foundation & Utilities

### 1.1 Create Base Web Component Class
**File:** `src/base-component.js`

A minimal base class with:
- Shadow DOM setup
- Basic reactive property system (setters that trigger render)
- `scheduleRender()` using requestAnimationFrame for batched updates
- CSS injection helper

```js
// Pseudocode structure
class BaseComponent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._renderScheduled = false
    this._state = {}
  }

  // Reactive state helper
  setState(key, value) {
    if (this._state[key] !== value) {
      this._state[key] = value
      this.scheduleRender()
    }
  }

  scheduleRender() {
    if (!this._renderScheduled) {
      this._renderScheduled = true
      requestAnimationFrame(() => {
        this._renderScheduled = false
        this.render()
      })
    }
  }

  render() { /* override in subclass */ }
}
```

### 1.2 Create Utility Functions
**File:** `src/utils.js`

- `html` tagged template literal for safe HTML generation
- `escapeHtml()` for XSS prevention
- `debounce()` for search
- `clamp()` for number constraints
- Event delegation helpers

### 1.3 Create Styles Module
**File:** `src/styles.js`

Extract all CSS from:
- QuickGrid.svelte (lines 1840-2427)
- GridCellEditor.svelte (lines 795-1015)
- PositioningRegion.svelte (lines 164-168)

Convert to template literal with CSS custom properties for theming.

**Deliverables:**
- [ ] `src/base-component.js`
- [ ] `src/utils.js`
- [ ] `src/styles.js`

---

## Phase 2: Positioning Region Component

### 2.1 Convert PositioningRegion
**File:** `src/positioning-region.js`

This is the simplest component - good starting point.

**Svelte source:** `PositioningRegion.svelte` (169 lines)

**Features to implement:**
- Fixed positioning relative to anchor element
- Position options: bottom, left, right, top
- Alignment: center, top
- Automatic fallback when off-screen
- Visibility toggle

**API Design:**
```js
// Internal component, used by QuickGrid
class PositioningRegion extends BaseComponent {
  static get observedAttributes() {
    return ['visible', 'position', 'align']
  }

  // Properties
  anchor = null      // HTMLElement reference
  visible = false
  position = 'bottom'
  align = 'center'
}
```

**Deliverables:**
- [ ] `src/positioning-region.js`

---

## Phase 3: Grid Cell Editor Component

### 3.1 Convert GridCellEditor
**File:** `src/grid-cell-editor.js`

**Svelte source:** `GridCellEditor.svelte` (1,016 lines)

This is an internal component used by QuickGrid for inline editing.

**Editor Types to Implement:**

| Type | Complexity | Notes |
|------|------------|-------|
| text | Low | Basic input |
| number | Low | Input with min/max/step |
| checkbox | Low | Checkbox with custom true/false values |
| date | Medium | Date input with format conversion |
| select | Medium | Custom dropdown (not native select) |
| combobox | High | Filterable dropdown |
| autocomplete | High | Async search with debounce + AbortController |

**Implementation Order:**
1. Text editor (simplest)
2. Number editor
3. Checkbox editor
4. Date editor
5. Select dropdown
6. Combobox (builds on select)
7. Autocomplete (builds on combobox)

**Key Features:**
- Dropdown positioning (uses PositioningRegion)
- Keyboard navigation (Arrow keys, Enter, Escape, Tab)
- Scroll blocking when dropdown open
- Focus management
- Value commit/cancel callbacks

**API Design:**
```js
class GridCellEditor extends BaseComponent {
  // Properties (set by parent QuickGrid)
  type = 'text'           // Editor type
  value = null            // Current value
  options = {}            // Editor options (min, max, options array, etc.)
  skipBlurCommit = false
  skipKeyboardCommit = false
  initialSearchQuery = ''

  // Callbacks
  oncommit = null         // (newValue) => void
  oncancel = null         // () => void
}
```

**Deliverables:**
- [ ] `src/grid-cell-editor.js` with all 7 editor types

---

## Phase 4: QuickGrid Core (Read-Only)

### 4.1 Basic Table Rendering
**File:** `src/quick-grid.js`

Start with read-only grid features.

**Features:**
- Table structure (thead, tbody)
- Column rendering with alignment
- Cell value formatting (`column.format`)
- Empty state message
- Striped rows
- Hover highlighting

**API Design (Initial):**
```js
class QuickGrid extends BaseComponent {
  static get observedAttributes() {
    return ['striped', 'hoverable']
  }

  // Properties
  items = []              // Array of row data
  columns = []            // Column definitions
  striped = true
  hoverable = true
}
```

### 4.2 Sorting
Add sorting capability.

**Features:**
- Click column header to sort
- Ascending/descending toggle
- Sort indicator (▲/▼)
- String, number, and mixed type comparison

**New State:**
- `sortColumn` - Current sort field
- `sortDirection` - 'asc' | 'desc'

### 4.3 Filtering
Add filtering capability.

**Features:**
- Filter row with text inputs
- Case-insensitive search
- Per-column enable/disable

**New State:**
- `filters` - Object mapping field to filter value

### 4.4 Pagination
Add pagination capability.

**Features:**
- Page size configuration
- Previous/Next buttons
- Page indicator ("Page 1 of 5")
- Item count display

**New State:**
- `currentPage`
- Computed: `totalPages`, `paginatedItems`

**Deliverables:**
- [ ] `src/quick-grid.js` with sorting, filtering, pagination

---

## Phase 5: QuickGrid Editing

### 5.1 Basic Editing Infrastructure

**Features:**
- Track editing cell (`editingCell` state)
- Clone rows for draft editing (`draftRows` Map)
- Cell click/double-click handlers
- Integration with GridCellEditor

**New State:**
- `editingCell` - { rowIndex, field, initialSearchQuery }
- `draftRows` - Map<rowIndex, draftRowData>
- `editable` - boolean
- `editTrigger` - 'click' | 'dblclick' | 'button' | 'always' | 'navigate'

### 5.2 Edit Triggers

Implement all edit trigger modes:

| Trigger | Behavior |
|---------|----------|
| `click` | Single click enters edit |
| `dblclick` | Double click enters edit |
| `button` | Edit button in cell |
| `always` | Cell always shows editor |
| `navigate` | Spreadsheet-like keyboard navigation |

### 5.3 Navigate Mode

Excel-like editing experience.

**Features:**
- Arrow key navigation between editable cells
- Tab/Shift+Tab navigation
- Enter/F2 to enter edit mode
- Escape to cancel
- Type to start editing
- Focus ring on current cell

**New State:**
- `focusedCell` - { rowIndex, colIndex }

### 5.4 Validation

**Features:**
- `onbeforecommit` callback for validation + transformation
- `invalidCells` tracking
- Visual error indicators
- Error messages
- Async validation support

**New State:**
- `invalidCells` - Array<{ rowIndex, field, error }>

**Deliverables:**
- [ ] Editing infrastructure
- [ ] All edit triggers
- [ ] Navigate mode
- [ ] Validation system

---

## Phase 6: Row Toolbar

### 6.1 Row Toolbar Popup

**Features:**
- Floating toolbar on row hover
- Predefined actions: add, delete, duplicate, moveUp, moveDown
- Custom actions with onclick handlers
- Multi-row layout with groups
- Dividers between groups
- Dynamic disabled state

**New State:**
- `showRowToolbar`
- `rowToolbar` - Array of toolbar items
- `toolbarAlign` - 'center' | 'top'
- `toolbarTrigger` - 'hover' | 'click' | 'button'
- `hoveredRowIndex`
- `hoveredRowElement`

### 6.2 SVG Connector Lines

When row moves (via moveUp/moveDown), draw bracket-shaped connector from toolbar to current row position.

**New State:**
- `connectorPath` - SVG path string
- `connectorArrowPos` - { x, y }

**Deliverables:**
- [ ] Row toolbar popup
- [ ] All predefined actions
- [ ] Custom actions
- [ ] SVG connector

---

## Phase 7: Context Menu

### 7.1 Context Menu Implementation

**Features:**
- Right-click to open
- Dynamic labels based on cell/row
- Conditional visibility
- Conditional disabled state
- Danger styling
- Dividers
- Click outside to close
- Escape to close

**Options:**
1. Use native `<menu>` element (limited styling)
2. Build custom dropdown (consistent styling)
3. Use FluentUI web components (original approach)

**Recommendation:** Build custom dropdown for zero dependencies.

**New State:**
- `contextMenu` - Array of menu items
- `contextMenuVisible`
- `contextMenuPosition` - { x, y }
- `contextMenuContext` - { row, rowIndex, colIndex, column, cellValue }

**Deliverables:**
- [ ] Custom context menu component
- [ ] Integration with QuickGrid

---

## Phase 8: Advanced Features

### 8.1 Custom Cell Templates

Support custom cell rendering via:
- Slot-based templates
- Render callback functions

```html
<!-- Slot approach -->
<quick-grid>
  <template slot="cell-status">
    <span class="badge">${value}</span>
  </template>
</quick-grid>

<!-- Or callback approach -->
<script>
grid.columns = [
  {
    field: 'status',
    template: (value, row) => `<span class="badge">${value}</span>`
  }
]
</script>
```

### 8.2 Header Info Tooltips

Icon (ⓘ) next to column header with tooltip on hover.

### 8.3 Touch Device Support

- Touch detection
- Click-based toolbar trigger on touch devices
- Touch-friendly hit targets

### 8.4 Dark Mode

CSS custom properties already support this via `[data-theme="dark"]` selectors.

**Deliverables:**
- [ ] Custom cell templates
- [ ] Header info tooltips
- [ ] Touch support
- [ ] Dark mode verification

---

## Phase 9: Testing & Documentation

### 9.1 Example Pages

Create HTML examples demonstrating:
- Basic read-only grid
- Sorting, filtering, pagination
- Editable grid with all editor types
- Navigate mode
- Validation
- Row toolbar
- Context menu
- Custom templates
- Dark mode

### 9.2 API Documentation

Document all:
- Custom element tag name
- Attributes
- Properties
- Events
- CSS custom properties for theming

**Deliverables:**
- [ ] `examples/basic.html`
- [ ] `examples/editable.html`
- [ ] `examples/context-menu.html`
- [ ] `examples/advanced.html`
- [ ] `README.md` with API docs

---

## Phase 10: Build & Bundle

### 10.1 Build Configuration

- ESM module output
- Minified bundle
- Optional: TypeScript declarations (via JSDoc)

### 10.2 Package Setup

```json
{
  "name": "quick-grid-wc",
  "type": "module",
  "main": "dist/quick-grid.js",
  "exports": {
    ".": "./dist/quick-grid.js"
  }
}
```

**Deliverables:**
- [ ] Build script
- [ ] `package.json`
- [ ] Minified bundle

---

## Events API Design

The web component will emit these custom events:

| Event | Detail | When |
|-------|--------|------|
| `rowchange` | `{ row, draftRow, rowIndex, field, oldValue, newValue, isValid, validationError }` | Cell value committed |
| `roweditstart` | `{ row, rowIndex, field }` | Cell enters edit mode |
| `roweditcancel` | `{ row, rowIndex, field }` | Edit cancelled |
| `validationerror` | `{ row, rowIndex, field, error }` | Validation fails |
| `toolbarclick` | `{ item, rowIndex, row }` | Toolbar button clicked |
| `contextmenuopen` | `{ row, rowIndex, colIndex, column, cellValue }` | Context menu opens |
| `sort` | `{ column, direction }` | Sort changes |
| `filter` | `{ filters }` | Filter changes |
| `pagechange` | `{ page, pageSize }` | Page changes |

---

## CSS Custom Properties

For theming without Shadow DOM piercing:

```css
quick-grid {
  /* Layout */
  --qg-border-radius: 4px;
  --qg-row-height: 40px;

  /* Colors - Light */
  --qg-bg: #ffffff;
  --qg-bg-header: #f5f5f5;
  --qg-bg-stripe: #fafafa;
  --qg-bg-hover: #f0f0f0;
  --qg-text: #242424;
  --qg-text-muted: #707070;
  --qg-border: #e0e0e0;
  --qg-accent: #0078d4;
  --qg-error: #d13438;
  --qg-success: #107c10;

  /* Can override for dark mode */
}

[data-theme="dark"] quick-grid {
  --qg-bg: #1f1f1f;
  --qg-bg-header: #2b2b2b;
  /* ... etc */
}
```

---

## Estimated Timeline

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Foundation & Utilities | Low |
| 2 | Positioning Region | Low |
| 3 | Grid Cell Editor | High |
| 4 | QuickGrid Core (Read-Only) | Medium |
| 5 | QuickGrid Editing | High |
| 6 | Row Toolbar | Medium |
| 7 | Context Menu | Medium |
| 8 | Advanced Features | Medium |
| 9 | Testing & Documentation | Low |
| 10 | Build & Bundle | Low |

---

## Getting Started

To begin Phase 1, ask Claude to:

```
Start Phase 1 of the web component conversion:
1. Create src/base-component.js with reactive state system
2. Create src/utils.js with helper functions
3. Create src/styles.js extracting all CSS from Svelte components
```
