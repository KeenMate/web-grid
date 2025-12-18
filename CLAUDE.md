WebGrid - Data Grid Web Component

Package: @keenmate/web-grid
Element: <web-grid>
Class: WebGrid

Build & Dev
- npm run dev - starts Vite dev server on port 12500
- npm run build - builds to dist/
- npm run package - builds and creates tarball
- Output: dist/web-grid.js (ES), dist/web-grid.umd.js (UMD), dist/style.css

Project Structure
- src/web-grid.js - main component class (WebGrid extends BaseComponent)
- src/base-component.js - base web component class with Shadow DOM
- src/positioning-region.js - dropdown/popup positioning utility component
- src/grid-edit-behavior.js - shared editing behavior mixin
- src/utils.js - template helpers (html, when, map, escapeHtml, etc.)
- src/index.js - main entry point, exports and registers components
- src/css/ - CSS files imported via Vite ?inline for Shadow DOM

CSS Architecture
- Variables use --wg- prefix (e.g., --wg-accent-color)
- 3-tier inheritance: --wg-* -> --base-* -> hardcoded fallback
- Allows parent projects to set --base-accent-color etc. to theme the grid
- Files: _variables.css, _base.css, _table.css, _cells.css, _editors.css, _dropdown.css, _context-menu.css, _row-toolbar.css

Features Implemented
- Sorting (click headers, ascending/descending toggle)
- Filtering (per-column text input filters)
- Pagination (configurable page size)
- Striped rows, hoverable rows
- Dark mode support (theme="dark" attribute or data-theme="dark" on parent)

Editing Features
- Edit triggers: click, dblclick, navigate (spreadsheet mode)
- Editor types: text, number, checkbox, select, combobox, autocomplete, date
- Validation via onbeforecommit callback (sync or async)
- Navigate mode: arrow keys move between cells, type to edit, Enter/Tab to commit
- Checkbox: always toggleable in navigate mode (no edit mode entry)
- showOnFocus option for dropdowns: controls auto-open when navigating with arrows

Row Toolbar
- Floating toolbar appears on row hover or button click
- Predefined actions: add, delete, duplicate, moveUp, moveDown
- Custom actions supported with icon/title/onclick
- Toolbar trigger modes: hover, button

Context Menu
- Right-click to open
- Dynamic labels (function returning string)
- Conditional visibility and disabled states
- Danger styling for destructive actions
- Keyboard navigation (arrows, Enter, Escape)

Clipboard
- Copy/paste with Ctrl+C/Ctrl+V in navigate mode
- beforeCopyCallback - transform value before copying
- beforePasteCallback - process/clean pasted value

Events
- rowchange - cell value changed (includes validation result)
- roweditstart / roweditend - edit lifecycle
- rowaction - toolbar action clicked
- contextmenuopen - context menu opened
- sort, filter, pagechange - grid state changes

Key Implementation Details
- Shadow DOM for style encapsulation
- Custom element registered as 'web-grid'
- Uses positioning-region for dropdown placement
- Inline CSS via Vite ?inline import
- No external dependencies (zero dependencies)

Examples
- examples/basic.html - sorting, filtering, pagination
- examples/editable.html - all 7 editor types
- examples/context-menu.html - right-click menu
- examples/row-toolbar.html - floating action buttons
