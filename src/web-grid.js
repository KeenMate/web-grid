/**
 * WebGrid - A feature-rich data grid web component
 *
 * Features:
 * - Sorting (click column headers)
 * - Filtering (per-column text filters)
 * - Pagination
 * - Inline editing with multiple editor types
 * - Navigate mode (spreadsheet-like keyboard navigation)
 * - Row toolbar (floating action popup)
 * - Context menu (right-click)
 * - Validation with visual feedback
 * - Dark mode support
 */

import { BaseComponent, defineElement } from './base-component.js'
import { html, raw, when, map, escapeHtml, deepClone, compare, debounce } from './utils.js'
import styles from './css/main.css?inline'
import { GridEditBehavior } from './grid-edit-behavior.js'
import './positioning-region.js'

/**
 * @typedef {Object} Column
 * @property {string} field - Field name from data
 * @property {string} title - Column header text
 * @property {string} [width] - Column width (e.g., "200px")
 * @property {string} [minWidth] - Minimum column width (e.g., "100px")
 * @property {string} [maxWidth] - Maximum column width (e.g., "300px")
 * @property {'left'|'center'|'right'} [align] - Text alignment
 * @property {'wrap'|'ellipsis'} [textOverflow] - Text overflow: 'wrap' (default) or 'ellipsis'
 * @property {boolean} [sortable] - Enable sorting
 * @property {boolean} [filterable] - Enable filtering
 * @property {(value: any, row: any) => string} [format] - Value formatter
 * @property {boolean} [editable] - Enable editing
 * @property {'text'|'number'|'checkbox'|'select'|'combobox'|'autocomplete'|'date'|'custom'} [editor]
 * @property {'click'|'dblclick'|'button'|'always'|'navigate'} [editTrigger]
 * @property {Object} [editorOptions] - Editor configuration
 * @property {Array} [editorOptions.options] - Options for select/combobox/autocomplete
 * @property {string} [editorOptions.valueMember='value'] - Property name for option value
 * @property {string} [editorOptions.displayMember='label'] - Property name for option label
 * @property {boolean} [editorOptions.allowEmpty] - Allow empty selection (select only)
 * @property {string} [editorOptions.emptyLabel='-- Select --'] - Label for empty option
 * @property {string} [editorOptions.placeholder] - Placeholder text
 * @property {boolean} [editorOptions.showOnFocus=true] - Auto-open dropdown when cell receives focus via arrow keys (select/combobox/autocomplete)
 * @property {(ctx: Object) => boolean|string|Object|Promise} [onbeforecommit] - Validation
 * @property {(ctx: Object) => void} [oncelledit] - Custom editor callback
 * @property {boolean} [showEditButton] - Show edit button in cell
 * @property {string} [headerInfo] - Tooltip text for header
 * @property {(value: any, row: any, column: Column) => string} [template] - Custom cell template
 * @property {(value: any, row: any) => string} [beforeCopyCallback] - Transform value before copying to clipboard
 * @property {(value: string, row: any) => any} [beforePasteCallback] - Process/clean pasted value before applying
 */

/**
 * @typedef {Object} ContextMenuItem
 * @property {string} id
 * @property {string|((ctx: Object) => string)} label
 * @property {string} [icon]
 * @property {boolean|((ctx: Object) => boolean)} [disabled]
 * @property {boolean|((ctx: Object) => boolean)} [visible]
 * @property {boolean} [danger]
 * @property {boolean} [dividerBefore]
 * @property {(ctx: Object) => void} onclick
 */

/**
 * @typedef {Object} ToolbarItem
 * @property {string} id
 * @property {string} icon
 * @property {string} title
 * @property {string} [label]
 * @property {number} [row]
 * @property {number} [group]
 * @property {'add'|'delete'|'duplicate'|'moveUp'|'moveDown'} [type]
 * @property {boolean} [danger]
 * @property {boolean|((row: any, index: number) => boolean)} [disabled]
 * @property {(detail: Object) => void|Promise} [onclick]
 */

// Predefined toolbar items
const PREDEFINED_TOOLBAR_ITEMS = {
  add: { icon: '+', title: 'Add row below' },
  delete: { icon: '−', title: 'Delete row', danger: true },
  duplicate: { icon: '⧉', title: 'Duplicate row' },
  moveUp: { icon: '↑', title: 'Move row up' },
  moveDown: { icon: '↓', title: 'Move row down' }
}

/**
 * Normalize toolbar config item
 * @param {string|ToolbarItem} config
 * @returns {ToolbarItem}
 */
function normalizeToolbarItem(config) {
  if (typeof config === 'string') {
    const predefined = PREDEFINED_TOOLBAR_ITEMS[config]
    return {
      id: config,
      icon: predefined?.icon || '?',
      title: predefined?.title || config,
      row: 1,
      group: 1,
      type: config,
      danger: predefined?.danger
    }
  }
  return {
    id: config.id,
    icon: config.icon,
    title: config.title,
    label: config.label,
    row: config.row ?? 1,
    group: config.group ?? 1,
    type: config.type,
    danger: config.danger ?? (config.type === 'delete'),
    disabled: config.disabled,
    onclick: config.onclick
  }
}

/**
 * Group toolbar items by row and group
 * @param {(string|ToolbarItem)[]} configs
 * @returns {Array<{rowNum: number, groups: Array<{groupNum: number, items: ToolbarItem[]}>}>}
 */
function groupToolbarItems(configs) {
  const normalized = configs.map(c => normalizeToolbarItem(c))

  // Group by row number
  const rowMap = new Map()
  for (const item of normalized) {
    const row = item.row
    if (!rowMap.has(row)) rowMap.set(row, [])
    rowMap.get(row).push(item)
  }

  // Convert to array and group within each row
  const rows = []
  for (const [rowNum, items] of rowMap) {
    const groupMap = new Map()
    for (const item of items) {
      const group = item.group
      if (!groupMap.has(group)) groupMap.set(group, [])
      groupMap.get(group).push(item)
    }

    const groups = Array.from(groupMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([groupNum, groupItems]) => ({ groupNum, items: groupItems }))

    rows.push({ rowNum, groups })
  }

  // Sort rows: higher row numbers first
  rows.sort((a, b) => b.rowNum - a.rowNum)

  return rows
}

export class WebGrid extends BaseComponent {
  // ============ Static ============

  static get observedAttributes() {
    return ['striped', 'hoverable', 'sortable', 'filterable', 'pageable', 'page-size', 'editable', 'edit-trigger']
  }

  // ============ Private State ============

  /** @type {any[]} */
  #items = []

  /** @type {Column[]} */
  #columns = []

  // Sorting
  /** @type {string|null} */
  #sortColumn = null

  /** @type {'asc'|'desc'} */
  #sortDirection = 'asc'

  // Filtering
  /** @type {Record<string, string>} */
  #filters = {}

  // Pagination
  /** @type {number} */
  #currentPage = 1

  /** @type {number} */
  #pageSize = 10

  // Editing
  /** @type {{rowIndex: number, field: string, trigger?: string, cursorPosition?: number, typedChar?: string}|null} */
  #editingCell = null

  /** @type {{rowIndex: number, colIndex: number}|null} */
  #focusedCell = null

  /** @type {Map<number, any>} */
  #draftRows = new Map()

  /** @type {Array<{rowIndex: number, field: string, error: string}>} */
  #invalidCells = []

  /** @type {boolean} */
  #isValidating = false

  // Editor state (inline editor - no separate component)
  /** @type {*} */
  #editorInternalValue = null

  /** @type {boolean} */
  #editorDropdownOpen = false

  /** @type {Array<{value: any, label: string}>} */
  #editorDropdownOptions = []

  /** @type {Array<{value: any, label: string}>} */
  #editorLoadedOptions = []

  /** @type {number} */
  #editorHighlightedIndex = -1

  /** @type {string} */
  #editorFilterText = ''

  /** @type {boolean} */
  #editorIsSearching = false

  /** @type {boolean} */
  #editorIsUserFiltering = false

  /** @type {boolean} */
  #editorJustSelected = false

  /** @type {AbortController|null} */
  #editorSearchAbortController = null

  /** @type {ReturnType<typeof import('./utils.js').debounce>|null} */
  #editorDebouncedSearch = null

  /** @type {Function|null} */
  #editorKeydownHandler = null

  /** @type {boolean} - Prevents dropdown from reopening after selection */
  #skipNextDropdownAutoEdit = false

  /** @type {GridEditBehavior} */
  #editBehavior = new GridEditBehavior()

  // Row toolbar
  /** @type {number|null} */
  #hoveredRowIndex = null

  /** @type {HTMLElement|null} */
  #hoveredRowElement = null

  /** @type {any|null} */
  #hoveredRowItem = null

  /** @type {boolean} */
  #toolbarHovered = false

  /** @type {ReturnType<typeof setTimeout>|null} */
  #toolbarHideTimeout = null

  /** @type {'left'|'right'|'top'} */
  #toolbarPosition = 'left'

  /** @type {number|null} */
  #toolbarActiveRow = null

  // Context menu
  /** @type {boolean} */
  #contextMenuVisible = false

  /** @type {{x: number, y: number}} */
  #contextMenuPosition = { x: 0, y: 0 }

  /** @type {Object|null} */
  #contextMenuContext = null

  /** @type {number} */
  #contextMenuHighlightedIndex = -1

  /** @type {ContextMenuItem[]} */
  #contextMenuVisibleItems = []

  // ============ Public Properties ============

  /** @type {boolean} */
  striped = true

  /** @type {boolean} */
  hoverable = true

  /** @type {boolean} */
  sortable = false

  /** @type {boolean} */
  filterable = false

  /** @type {boolean} */
  pageable = false

  /** @type {boolean} */
  editable = false

  /** @type {'click'|'dblclick'|'button'|'always'|'navigate'} */
  editTrigger = 'dblclick'

  /** @type {GridEditBehavior} */
  get editBehavior() {
    return this.#editBehavior
  }

  set editBehavior(value) {
    this.#editBehavior = value
  }

  /** @type {boolean} */
  showRowToolbar = false

  /** @type {(string|ToolbarItem)[]} */
  rowToolbar = ['add', 'delete', 'duplicate']

  /** @type {'center'|'top'} */
  toolbarAlign = 'center'

  /** @type {'hover'|'click'|'button'} */
  toolbarTrigger = 'hover'

  /** @type {boolean} */
  showRowActions = false

  /** @type {string[]} */
  rowActions = ['add', 'delete', 'duplicate']

  /** @type {ContextMenuItem[]} */
  contextMenu = []

  /** @type {boolean} */
  checkboxAlwaysEditable = false

  // ============ Callbacks ============

  /** @type {((detail: Object) => void)|null} */
  onrowchange = null

  /** @type {((detail: Object) => void)|null} */
  onroweditstart = null

  /** @type {((detail: Object) => void)|null} */
  onroweditcancel = null

  /** @type {((detail: Object) => void)|null} */
  onvalidationerror = null

  /** @type {((detail: Object) => void)|null} */
  onrowaction = null

  /** @type {((detail: Object) => void)|null} */
  ontoolbarclick = null

  /** @type {((detail: Object) => void)|null} */
  oncontextmenuopen = null

  // ============ Getters/Setters ============

  get items() {
    return this.#items
  }

  set items(value) {
    this.#items = value || []
    this.#draftRows.clear()
    this.#invalidCells = []
    this.#currentPage = 1
    this.scheduleRender()
  }

  get columns() {
    return this.#columns
  }

  set columns(value) {
    this.#columns = value || []
    this.scheduleRender()
  }

  get pageSize() {
    return this.#pageSize
  }

  set pageSize(value) {
    this.#pageSize = value
    this.#currentPage = 1
    this.scheduleRender()
  }

  get invalidCells() {
    return this.#invalidCells
  }

  set invalidCells(value) {
    this.#invalidCells = value || []
    this.scheduleRender()
  }

  // ============ Computed Properties ============

  get #processedItems() {
    let result = [...this.#items]

    // Apply filters
    if (this.filterable) {
      for (const [field, filterValue] of Object.entries(this.#filters)) {
        if (filterValue) {
          const searchLower = filterValue.toLowerCase()
          result = result.filter(item => {
            const value = item[field]
            return value != null && String(value).toLowerCase().includes(searchLower)
          })
        }
      }
    }

    // Apply sorting
    if (this.#sortColumn) {
      result.sort((a, b) => {
        const aVal = a[this.#sortColumn]
        const bVal = b[this.#sortColumn]
        const cmp = compare(aVal, bVal)
        return this.#sortDirection === 'asc' ? cmp : -cmp
      })
    }

    return result
  }

  get #paginatedItems() {
    if (!this.pageable) {
      return this.#processedItems
    }

    const start = (this.#currentPage - 1) * this.#pageSize
    return this.#processedItems.slice(start, start + this.#pageSize)
  }

  get #totalPages() {
    if (!this.pageable) return 1
    return Math.max(1, Math.ceil(this.#processedItems.length / this.#pageSize))
  }

  get #editableColumns() {
    return this.#columns
      .map((col, index) => ({ index, column: col }))
      .filter(({ column }) => column.editable)
  }

  get #isNavigateMode() {
    return this.editTrigger === 'navigate'
  }

  // ============ Lifecycle ============

  init() {
    // Click outside to close context menu
    document.addEventListener('click', this.#handleDocumentClick)
    document.addEventListener('contextmenu', this.#handleDocumentContextMenu)
    // Paste handler for navigate mode
    this.addEventListener('paste', this.#handlePaste)
  }

  disconnected() {
    document.removeEventListener('click', this.#handleDocumentClick)
    document.removeEventListener('contextmenu', this.#handleDocumentContextMenu)
    this.removeEventListener('paste', this.#handlePaste)
  }

  attributeChanged(name, oldValue, newValue) {
    switch (name) {
      case 'striped':
        this.striped = newValue !== null
        break
      case 'hoverable':
        this.hoverable = newValue !== null
        break
      case 'sortable':
        this.sortable = newValue !== null
        break
      case 'filterable':
        this.filterable = newValue !== null
        break
      case 'pageable':
        this.pageable = newValue !== null
        break
      case 'page-size':
        this.pageSize = parseInt(newValue) || 10
        break
      case 'editable':
        this.editable = newValue !== null
        break
      case 'edit-trigger':
        this.editTrigger = newValue || 'dblclick'
        break
    }
  }

  // ============ Sorting ============

  #handleSort(field) {
    if (this.#sortColumn === field) {
      this.#sortDirection = this.#sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      this.#sortColumn = field
      this.#sortDirection = 'asc'
    }

    this.emit('sort', { column: field, direction: this.#sortDirection })
    this.scheduleRender()
  }

  // ============ Filtering ============

  #handleFilterChange(field, value) {
    this.#filters[field] = value
    this.#currentPage = 1

    this.emit('filter', { filters: { ...this.#filters } })
    this.scheduleRender()
  }

  // ============ Pagination ============

  #handlePageChange(delta) {
    const newPage = this.#currentPage + delta
    if (newPage >= 1 && newPage <= this.#totalPages) {
      this.#currentPage = newPage
      this.emit('pagechange', { page: this.#currentPage, pageSize: this.#pageSize })
      this.scheduleRender()
    }
  }

  // ============ Editing ============

  #getDraftRow(rowIndex) {
    if (!this.#draftRows.has(rowIndex)) {
      this.#draftRows.set(rowIndex, deepClone(this.#items[rowIndex]))
    }
    return this.#draftRows.get(rowIndex)
  }

  /**
   * Calculate cursor position from click event using caretRangeFromPoint
   * @param {MouseEvent} event - The click/dblclick event
   * @param {HTMLElement} cell - The cell element
   * @returns {number|null} - Character offset or null to select all
   */
  #getCursorPositionFromClick(event, cell) {
    // Find the text span inside the cell
    const textSpan = cell.querySelector('.cell-content > span')
    if (!textSpan) return null

    const text = textSpan.textContent || ''
    if (!text.length) return 0

    const clickX = event.clientX
    const spanRect = textSpan.getBoundingClientRect()

    // If click is before the text, position at start
    if (clickX <= spanRect.left) return 0
    // If click is after the text, position at end
    if (clickX >= spanRect.right) return text.length

    // Calculate position using character measurement
    // Create a range to measure text width character by character
    const range = document.createRange()
    const textNode = textSpan.firstChild
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null

    // Binary search for the character position
    let low = 0
    let high = text.length

    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      range.setStart(textNode, 0)
      range.setEnd(textNode, mid)
      const rect = range.getBoundingClientRect()

      if (rect.right < clickX) {
        low = mid + 1
      } else {
        high = mid
      }
    }

    // Fine-tune: check if click is closer to before or after this character
    if (low > 0 && low < text.length) {
      range.setStart(textNode, low - 1)
      range.setEnd(textNode, low)
      const charRect = range.getBoundingClientRect()
      const charMidpoint = charRect.left + charRect.width / 2
      if (clickX < charMidpoint) {
        low--
      }
    }

    return low
  }

  #startEdit(rowIndex, field, trigger = 'dblclick', context = {}) {
    console.log('[startEdit] row:', rowIndex, 'field:', field, 'trigger:', trigger, 'context:', context)

    // Ensure draft exists
    const draftRow = this.#getDraftRow(rowIndex)

    this.#editingCell = { rowIndex, field, trigger, ...context }

    const column = this.#columns.find(c => c.field === field)
    const editorType = column.editor || 'text'
    const opts = column.editorOptions || {}

    // Initialize editor state
    this.#editorInternalValue = draftRow[field]
    this.#editorDropdownOpen = false
    this.#editorDropdownOptions = opts.options || []
    this.#editorLoadedOptions = []
    this.#editorHighlightedIndex = -1
    this.#editorFilterText = ''
    this.#editorIsSearching = false
    this.#editorIsUserFiltering = false
    this.#editorJustSelected = false

    // Initialize filter text for dropdowns
    if (editorType === 'combobox' || editorType === 'autocomplete') {
      const allOpts = opts.options || []
      const opt = allOpts.find(o => this.#getEditorOptionValue(o, column) === draftRow[field])
      this.#editorFilterText = opt ? this.#getEditorOptionLabel(opt, column) : ''
    }

    // Create debounced search for autocomplete
    if (editorType === 'autocomplete' && opts.onSearch) {
      this.#editorDebouncedSearch = debounce((query) => {
        this.#performEditorSearch(query, column)
      }, opts.debounceMs || 300)
    }

    this.onroweditstart?.({
      row: this.#items[rowIndex],
      rowIndex,
      field,
      column
    })

    this.emit('roweditstart', {
      row: this.#items[rowIndex],
      rowIndex,
      field
    })

    // Direct DOM update - only update the target cell
    const cell = this.$(`[data-row="${rowIndex}"][data-field="${field}"]`)
    if (cell) {
      cell.classList.add('editing')

      // Preserve original content width by keeping a hidden spacer
      const originalContent = cell.querySelector('.cell-content')
      const spacerHtml = originalContent
        ? `<div class="cell-content" style="visibility: hidden; height: 0; overflow: hidden;">${originalContent.innerHTML}</div>`
        : ''

      // Create inline editor HTML
      const editorHtml = this.#renderInlineEditor(column, rowIndex).toString()
      cell.innerHTML = `${spacerHtml}<div class="editor-wrapper grid-cell-editor">${editorHtml}</div>`

      // Set up the editor
      this.#setupInlineEditor(cell, column, rowIndex)
    }
  }

  #cancelEdit() {
    if (!this.#editingCell) return

    const { rowIndex, field } = this.#editingCell
    const row = this.#items[rowIndex]
    const column = this.#columns.find(c => c.field === field)

    this.onroweditcancel?.({
      row,
      rowIndex,
      field
    })

    this.emit('roweditcancel', {
      row,
      rowIndex,
      field
    })

    this.#editingCell = null

    console.log('[cancelEdit] isNavigateMode:', this.#isNavigateMode, 'focusedCell:', this.#focusedCell)

    // Direct DOM update - restore the cell content
    const cell = this.$(`[data-row="${rowIndex}"][data-field="${field}"]`)
    if (cell) {
      // Clean up keydown handler to prevent accumulation
      if (this.#editorKeydownHandler) {
        cell.removeEventListener('keydown', this.#editorKeydownHandler)
        this.#editorKeydownHandler = null
      }

      cell.classList.remove('editing')

      // Restore display content
      const value = this.#getCellValue(row, column, rowIndex)
      const displayValue = this.#formatCellValue(value, column, row)
      const isCheckbox = column.editor === 'checkbox' && this.#isNavigateMode
      const overflowClass = column.textOverflow === 'ellipsis' ? 'text-ellipsis' : ''
      const contentStyle = column.maxWidth ? `max-width: ${column.maxWidth}` : ''

      if (isCheckbox) {
        cell.innerHTML = `
          <div class="cell-content ${overflowClass}" style="${contentStyle}">
            <input type="checkbox" class="cell-checkbox-display" ${value ? 'checked' : ''} disabled />
          </div>
        `
      } else {
        cell.innerHTML = `
          <div class="cell-content ${overflowClass}" style="${contentStyle}">
            <span>${escapeHtml(displayValue)}</span>
          </div>
        `
      }

      // Restore focus if in navigate mode
      if (this.#isNavigateMode && this.#focusedCell) {
        cell.classList.add('focused')
        cell.focus({ preventScroll: true })
      }
    }
  }

  async #commitEdit(newValue) {
    if (!this.#editingCell) return

    const { rowIndex, field } = this.#editingCell
    const column = this.#columns.find(c => c.field === field)
    const draftRow = this.#getDraftRow(rowIndex)
    const oldValue = draftRow[field]

    // Run validation if defined
    let isValid = true
    let validationError = null
    let finalValue = newValue

    if (column?.onbeforecommit) {
      this.#isValidating = true
      this.scheduleRender()

      try {
        const result = await column.onbeforecommit({
          value: newValue,
          oldValue,
          row: this.#items[rowIndex],
          rowIndex,
          field
        })

        if (result === false) {
          isValid = false
          validationError = 'Validation failed'
        } else if (typeof result === 'string') {
          isValid = false
          validationError = result
        } else if (result && typeof result === 'object') {
          if (result.valid === false) {
            isValid = false
            validationError = result.message || 'Validation failed'
          } else if (result.transformedValue !== undefined) {
            finalValue = result.transformedValue
          }
        }
      } catch (error) {
        isValid = false
        validationError = error.message || 'Validation error'
      } finally {
        this.#isValidating = false
      }
    }

    // Update draft row
    draftRow[field] = finalValue

    // Update invalid cells tracking
    const existingIdx = this.#invalidCells.findIndex(
      c => c.rowIndex === rowIndex && c.field === field
    )

    if (!isValid) {
      if (existingIdx >= 0) {
        this.#invalidCells[existingIdx].error = validationError
      } else {
        this.#invalidCells.push({ rowIndex, field, error: validationError })
      }

      this.onvalidationerror?.({
        row: this.#items[rowIndex],
        rowIndex,
        field,
        error: validationError
      })

      this.emit('validationerror', { rowIndex, field, error: validationError })
    } else {
      if (existingIdx >= 0) {
        this.#invalidCells.splice(existingIdx, 1)
      }
    }

    // Fire change callback
    const detail = {
      row: this.#items[rowIndex],
      draftRow,
      rowIndex,
      field,
      oldValue,
      newValue: finalValue,
      isValid,
      validationError
    }

    this.onrowchange?.(detail)
    this.emit('rowchange', detail)

    // Set skip flag for dropdown editors to prevent auto-reopen after selection
    const isDropdownEditor = column?.editor === 'select' || column?.editor === 'combobox' || column?.editor === 'autocomplete'
    if (isDropdownEditor && this.#isNavigateMode) {
      this.#skipNextDropdownAutoEdit = true
    }

    this.#editingCell = null

    // Direct DOM update - restore the cell content with new value
    const cell = this.$(`[data-row="${rowIndex}"][data-field="${field}"]`)
    if (cell) {
      // Clean up keydown handler to prevent accumulation
      if (this.#editorKeydownHandler) {
        cell.removeEventListener('keydown', this.#editorKeydownHandler)
        this.#editorKeydownHandler = null
      }

      cell.classList.remove('editing')
      if (!isValid) {
        cell.classList.add('validation-error')
      } else {
        cell.classList.remove('validation-error')
      }

      // Restore display content with new value
      const displayValue = this.#formatCellValue(finalValue, column, this.#items[rowIndex])
      const isCheckbox = column.editor === 'checkbox' && this.#isNavigateMode
      const overflowClass = column.textOverflow === 'ellipsis' ? 'text-ellipsis' : ''
      const contentStyle = column.maxWidth ? `max-width: ${column.maxWidth}` : ''

      if (isCheckbox) {
        cell.innerHTML = `
          <div class="cell-content ${overflowClass}" style="${contentStyle}">
            <input type="checkbox" class="cell-checkbox-display" ${finalValue ? 'checked' : ''} disabled />
          </div>
          ${!isValid ? `<span class="cell-error-indicator" title="${escapeHtml(validationError)}">⚠</span>` : ''}
        `
      } else {
        cell.innerHTML = `
          <div class="cell-content ${overflowClass}" style="${contentStyle}">
            <span>${escapeHtml(displayValue)}</span>
          </div>
          ${!isValid ? `<span class="cell-error-indicator" title="${escapeHtml(validationError)}">⚠</span>` : ''}
        `
      }

      // Restore focus if in navigate mode
      if (this.#isNavigateMode && this.#focusedCell) {
        cell.classList.add('focused')
        cell.focus({ preventScroll: true })
      }
    }
  }

  // ============ Inline Editor Methods ============

  #setupInlineEditor(cell, column, rowIndex) {
    const editorType = column.editor || 'text'
    const opts = column.editorOptions || {}
    const trigger = this.#editingCell?.trigger || 'dblclick'
    const typedChar = this.#editingCell?.typedChar

    // Get input elements
    const input = cell.querySelector('.cell-input')
    const checkbox = cell.querySelector('.cell-checkbox')
    const selectTrigger = cell.querySelector('.cell-select-trigger')
    const comboboxInput = cell.querySelector('.cell-combobox-input')
    const autocompleteInput = cell.querySelector('.cell-autocomplete-input')

    // Apply column alignment to input
    if (input) {
      input.style.textAlign = column.align || 'left'
    }

    // Remove previous keydown handler if exists (prevents accumulation)
    if (this.#editorKeydownHandler) {
      cell.removeEventListener('keydown', this.#editorKeydownHandler)
    }

    // Create and store new handler so we can remove it later
    this.#editorKeydownHandler = (e) => this.#handleEditorKeyDown(e, column)
    cell.addEventListener('keydown', this.#editorKeydownHandler)

    // Text input
    if (input && editorType === 'text') {
      // Use behavior class to determine initial value
      const initialValue = this.#editBehavior.getInitialValue(trigger, {
        originalValue: this.#editorInternalValue,
        typedChar
      })
      this.#editorInternalValue = initialValue
      input.value = initialValue ?? ''

      input.addEventListener('input', (e) => {
        this.#editorInternalValue = e.target.value
      })
      input.focus({ preventScroll: true })

      // Use behavior class to determine cursor position
      const cursorPos = this.#editBehavior.getCursorPosition(trigger, {
        clickPosition: this.#editingCell?.cursorPosition,
        textLength: input.value.length
      })

      // Apply cursor position
      if (cursorPos === 'selectAll') {
        input.select()
      } else if (cursorPos === 'start') {
        input.setSelectionRange(0, 0)
      } else if (cursorPos === 'end') {
        input.setSelectionRange(input.value.length, input.value.length)
      } else if (typeof cursorPos === 'number') {
        const pos = Math.min(cursorPos, input.value.length)
        input.setSelectionRange(pos, pos)
      }
    }

    // Number input
    // Note: <input type="number"> doesn't support setSelectionRange, so we always select all
    // But we still use behavior class for initial value (typing replaces value)
    if (input && editorType === 'number') {
      const initialValue = this.#editBehavior.getInitialValue(trigger, {
        originalValue: this.#editorInternalValue,
        typedChar
      })
      this.#editorInternalValue = initialValue
      input.value = initialValue ?? ''

      input.addEventListener('input', (e) => {
        const val = e.target.valueAsNumber
        this.#editorInternalValue = isNaN(val) ? null : val
      })
      input.focus({ preventScroll: true })
      input.select()
    }

    // Date input
    if (input && editorType === 'date') {
      input.value = this.#formatDateValue(this.#editorInternalValue)
      input.addEventListener('change', (e) => {
        this.#handleEditorDateChange(e, column)
      })
      input.focus({ preventScroll: true })
    }

    // Checkbox
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        this.#handleEditorCheckboxChange(column)
      })
      checkbox.focus({ preventScroll: true })
    }

    // Select trigger
    if (selectTrigger) {
      selectTrigger.addEventListener('click', () => this.#toggleEditorDropdown(column))
      selectTrigger.addEventListener('keydown', (e) => this.#handleEditorSelectKeyDown(e, column))
      selectTrigger.focus({ preventScroll: true })
      // Handle typed character for select (filters dropdown)
      if (typedChar) {
        this.#handleEditorInitialQuery(typedChar, column)
      }
    }

    // Combobox input
    if (comboboxInput) {
      comboboxInput.value = this.#editorFilterText
      comboboxInput.addEventListener('input', (e) => this.#handleEditorComboboxInput(e, column))
      comboboxInput.addEventListener('focus', () => this.#handleEditorComboboxFocus(column))
      comboboxInput.focus({ preventScroll: true })
      if (typedChar) {
        comboboxInput.value = typedChar
        this.#editorFilterText = typedChar
        this.#openEditorDropdown(column)
      }
    }

    // Autocomplete input
    if (autocompleteInput) {
      autocompleteInput.value = this.#editorFilterText
      autocompleteInput.addEventListener('input', (e) => this.#handleEditorAutocompleteInput(e, column))
      autocompleteInput.addEventListener('focus', () => this.#handleEditorAutocompleteFocus(column))
      autocompleteInput.focus({ preventScroll: true })
      if (typedChar) {
        autocompleteInput.value = typedChar
        this.#editorFilterText = typedChar
        this.#editorDropdownOpen = true
        this.#editorDebouncedSearch?.(typedChar)
      }
    }
  }

  #handleEditorKeyDown(e, column) {
    const editorType = column.editor || 'text'

    // Handle dropdown keyboard navigation
    if (this.#editorDropdownOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
      this.#handleEditorDropdownKeyDown(e, column)
      return
    }

    if (e.key === 'Enter') {
      console.log('[Editor] Enter pressed, committing')
      e.preventDefault()
      e.stopPropagation()
      this.#editorCommit(column)
    } else if (e.key === 'Escape') {
      console.log('[Editor] Escape pressed, canceling')
      e.preventDefault()
      e.stopPropagation()
      this.#cancelEdit()
    } else if (e.key === 'Tab') {
      console.log('[Editor] Tab pressed, committing')
      e.preventDefault()
      e.stopPropagation()

      // Save current position before commit (commit clears editingCell)
      const { rowIndex, field } = this.#editingCell
      const colIndex = this.#columns.findIndex(c => c.field === field)

      this.#editorCommit(column)

      // Navigate to next/prev cell after commit (in navigate mode)
      if (this.#isNavigateMode) {
        const editableCols = this.#editableColumns
        const currentEditableIdx = editableCols.findIndex(ec => ec.index === colIndex)

        if (e.shiftKey) {
          // Move backwards
          if (currentEditableIdx > 0) {
            this.#focusCell(rowIndex, editableCols[currentEditableIdx - 1].index)
          } else if (rowIndex > 0) {
            this.#focusCell(rowIndex - 1, editableCols[editableCols.length - 1].index)
          }
        } else {
          // Move forwards
          if (currentEditableIdx < editableCols.length - 1) {
            this.#focusCell(rowIndex, editableCols[currentEditableIdx + 1].index)
          } else if (rowIndex < this.#paginatedItems.length - 1) {
            this.#focusCell(rowIndex + 1, editableCols[0].index)
          }
        }
      }
    }
  }

  #handleEditorDropdownKeyDown(e, column) {
    const editorType = column.editor || 'text'
    const opts = editorType === 'combobox'
      ? this.#getEditorFilteredOptions(column)
      : this.#editorDropdownOptions

    switch (e.key) {
      case 'ArrowDown':
        if (!this.#editorDropdownOpen) return
        e.preventDefault()
        e.stopPropagation()
        this.#editorHighlightedIndex = Math.min(this.#editorHighlightedIndex + 1, opts.length - 1)
        this.#updateEditorDropdownHighlight()
        break

      case 'ArrowUp':
        if (!this.#editorDropdownOpen) return
        e.preventDefault()
        e.stopPropagation()
        this.#editorHighlightedIndex = Math.max(this.#editorHighlightedIndex - 1, 0)
        this.#updateEditorDropdownHighlight()
        break

      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        if (!this.#editorDropdownOpen) {
          this.#openEditorDropdown(column)
        } else if (this.#editorHighlightedIndex >= 0 && this.#editorHighlightedIndex < opts.length) {
          this.#selectEditorOption(opts[this.#editorHighlightedIndex], column)
        } else if (editorType === 'autocomplete' && this.#editorFilterText.trim()) {
          this.#editorInternalValue = this.#editorFilterText.trim()
          this.#closeEditorDropdown()
          this.#commitEdit(this.#editorFilterText.trim())
        }
        break

      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        if (this.#editorDropdownOpen) {
          this.#closeEditorDropdown()
        } else {
          this.#cancelEdit()
        }
        break

      case 'Tab':
        e.preventDefault()
        e.stopPropagation()

        // Save current position before commit
        const { rowIndex, field } = this.#editingCell
        const colIndex = this.#columns.findIndex(c => c.field === field)

        // Select highlighted option if any, or just commit current value
        if (this.#editorDropdownOpen && this.#editorHighlightedIndex >= 0 && this.#editorHighlightedIndex < opts.length) {
          this.#selectEditorOption(opts[this.#editorHighlightedIndex], column)
        } else {
          this.#closeEditorDropdown()
          this.#editorCommit(column)
        }

        // Navigate to next/prev cell after commit (in navigate mode)
        if (this.#isNavigateMode) {
          const editableCols = this.#editableColumns
          const currentEditableIdx = editableCols.findIndex(ec => ec.index === colIndex)

          if (e.shiftKey) {
            if (currentEditableIdx > 0) {
              this.#focusCell(rowIndex, editableCols[currentEditableIdx - 1].index)
            } else if (rowIndex > 0) {
              this.#focusCell(rowIndex - 1, editableCols[editableCols.length - 1].index)
            }
          } else {
            if (currentEditableIdx < editableCols.length - 1) {
              this.#focusCell(rowIndex, editableCols[currentEditableIdx + 1].index)
            } else if (rowIndex < this.#paginatedItems.length - 1) {
              this.#focusCell(rowIndex + 1, editableCols[0].index)
            }
          }
        }
        break

      case ' ':
        if (editorType === 'select' && !this.#editorDropdownOpen) {
          e.preventDefault()
          e.stopPropagation()
          this.#openEditorDropdown(column)
        }
        break
    }
  }

  #handleEditorSelectKeyDown(e, column) {
    // Letter jumping
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const letter = e.key.toLowerCase()
      const opts = this.#getEditorEffectiveOptions(column)
      const startIdx = this.#editorHighlightedIndex + 1

      for (let i = 0; i < opts.length; i++) {
        const idx = (startIdx + i) % opts.length
        if (this.#getEditorOptionLabel(opts[idx], column).toLowerCase().startsWith(letter)) {
          this.#editorHighlightedIndex = idx
          if (!this.#editorDropdownOpen) {
            this.#openEditorDropdown(column)
          }
          this.#updateEditorDropdownHighlight()
          return
        }
      }
    }

    this.#handleEditorDropdownKeyDown(e, column)
  }

  #editorCommit(column) {
    let finalValue = this.#editorInternalValue
    const opts = column.editorOptions || {}

    // Apply decimal places for number
    if (column.editor === 'number' && opts.decimalPlaces !== undefined && typeof finalValue === 'number') {
      finalValue = Number(finalValue.toFixed(opts.decimalPlaces))
    }

    // Get original value
    const draftRow = this.#getDraftRow(this.#editingCell.rowIndex)
    const originalValue = draftRow[this.#editingCell.field]

    if (finalValue !== originalValue) {
      this.#commitEdit(finalValue)
    } else {
      this.#cancelEdit()
    }
  }

  #handleEditorCheckboxChange(column) {
    const opts = column.editorOptions || {}
    const trueVal = opts.trueValue ?? true
    const falseVal = opts.falseValue ?? false
    const currentIsTrue = this.#editorInternalValue === trueVal || this.#editorInternalValue === true
    this.#editorInternalValue = currentIsTrue ? falseVal : trueVal
    this.#commitEdit(this.#editorInternalValue)
  }

  #handleEditorDateChange(e, column) {
    const dateStr = e.target.value
    const opts = column.editorOptions || {}

    if (!dateStr) {
      this.#editorInternalValue = null
      this.#commitEdit(null)
      return
    }

    const date = new Date(dateStr)
    const outputFormat = opts.outputFormat || 'date'

    switch (outputFormat) {
      case 'iso':
        this.#editorInternalValue = date.toISOString()
        break
      case 'timestamp':
        this.#editorInternalValue = date.getTime()
        break
      default:
        this.#editorInternalValue = date
    }

    this.#commitEdit(this.#editorInternalValue)
  }

  #handleEditorComboboxInput(e, column) {
    this.#editorFilterText = e.target.value
    this.#editorIsUserFiltering = true
    if (!this.#editorDropdownOpen) {
      this.#openEditorDropdown(column)
    }
    this.#editorHighlightedIndex = this.#getEditorFilteredOptions(column).length > 0 ? 0 : -1
    this.#rerenderEditorDropdown(column)
  }

  #handleEditorComboboxFocus(column) {
    if (this.#editorJustSelected) {
      this.#editorJustSelected = false
      return
    }
    this.#editorIsUserFiltering = false
    this.#openEditorDropdown(column)
  }

  #handleEditorAutocompleteInput(e, column) {
    this.#editorFilterText = e.target.value

    if (!this.#editorDropdownOpen) {
      this.#editorDropdownOpen = true
      this.#editorDropdownOptions = []
      this.#editorHighlightedIndex = -1
    }

    this.#editorDebouncedSearch?.(this.#editorFilterText)
  }

  #handleEditorAutocompleteFocus(column) {
    if (this.#editorJustSelected) {
      this.#editorJustSelected = false
      return
    }
    if (!this.#editorDropdownOpen) {
      this.#openEditorDropdown(column)
    }
  }

  #handleEditorInitialQuery(query, column) {
    const editorType = column.editor || 'text'
    const opts = this.#getEditorEffectiveOptions(column)

    if (editorType === 'select') {
      const letter = query.toLowerCase()
      const idx = opts.findIndex(opt =>
        this.#getEditorOptionLabel(opt, column).toLowerCase().startsWith(letter)
      )
      if (idx >= 0) {
        this.#editorHighlightedIndex = idx
        this.#openEditorDropdown(column)
      }
    }
  }

  // Dropdown management
  #openEditorDropdown(column) {
    if (this.#editorDropdownOpen) return

    this.#editorDropdownOpen = true
    this.#editorHighlightedIndex = -1

    const editorType = column.editor || 'text'
    const opts = column.editorOptions || {}

    if (editorType === 'select' || editorType === 'combobox') {
      this.#editorDropdownOptions = this.#getEditorEffectiveOptions(column)
      const currentIdx = this.#editorDropdownOptions.findIndex(
        opt => this.#getEditorOptionValue(opt, column) === this.#editorInternalValue
      )
      if (currentIdx >= 0) {
        this.#editorHighlightedIndex = currentIdx
        if (editorType === 'combobox' && !this.#editorFilterText) {
          this.#editorFilterText = this.#getEditorOptionLabel(this.#editorDropdownOptions[currentIdx], column)
        }
      }
    } else if (editorType === 'autocomplete') {
      this.#editorDropdownOptions = opts.initialOptions || opts.options || []
      if (!this.#editorFilterText && this.#editorInternalValue != null) {
        const opt = this.#editorDropdownOptions.find(o => this.#getEditorOptionValue(o, column) === this.#editorInternalValue)
        if (opt) {
          this.#editorFilterText = this.#getEditorOptionLabel(opt, column)
        }
      }
    }

    this.#rerenderEditorDropdown(column)
  }

  #closeEditorDropdown() {
    this.#editorDropdownOpen = false
    this.#editorHighlightedIndex = -1

    if (this.#editorSearchAbortController) {
      this.#editorSearchAbortController.abort()
      this.#editorSearchAbortController = null
    }

    // Remove dropdown from DOM
    const dropdown = this.$('.cell-dropdown-region')
    dropdown?.remove()
  }

  #toggleEditorDropdown(column) {
    if (this.#editorDropdownOpen) {
      this.#closeEditorDropdown()
    } else {
      this.#openEditorDropdown(column)
    }
  }

  #selectEditorOption(option, column) {
    const newValue = this.#getEditorOptionValue(option, column)
    this.#editorInternalValue = newValue
    this.#editorFilterText = this.#getEditorOptionLabel(option, column)
    this.#editorIsUserFiltering = false
    this.#editorJustSelected = true

    this.#closeEditorDropdown()
    this.#commitEdit(newValue)
  }

  #updateEditorDropdownHighlight() {
    const dropdown = this.$('.cell-dropdown')
    if (!dropdown) return

    dropdown.querySelectorAll('.cell-dropdown-option').forEach((opt, idx) => {
      if (idx === this.#editorHighlightedIndex) {
        opt.classList.add('highlighted')
        opt.scrollIntoView({ block: 'nearest' })
      } else {
        opt.classList.remove('highlighted')
      }
    })
  }

  #rerenderEditorDropdown(column) {
    if (!this.#editingCell) return

    const cell = this.$(`[data-row="${this.#editingCell.rowIndex}"][data-field="${this.#editingCell.field}"]`)
    if (!cell) return

    // Remove existing dropdown
    const existingDropdown = cell.querySelector('.cell-dropdown-region')
    existingDropdown?.remove()

    if (this.#editorDropdownOpen) {
      // Add new dropdown
      const dropdownHtml = this.#renderEditorDropdown(column).toString()
      cell.insertAdjacentHTML('beforeend', dropdownHtml)

      // Set up dropdown event handlers
      this.#setupEditorDropdownEvents(cell, column)

      // Position the dropdown
      const posRegion = cell.querySelector('qg-positioning-region')
      if (posRegion) {
        posRegion.anchor = cell
        posRegion.position = 'bottom'
        posRegion.align = 'start'
        posRegion.visible = true
      }
    }
  }

  #setupEditorDropdownEvents(cell, column) {
    const dropdown = cell.querySelector('.cell-dropdown')
    if (!dropdown) return

    dropdown.addEventListener('mousedown', (e) => e.preventDefault()) // Prevent blur

    dropdown.querySelectorAll('.cell-dropdown-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.dataset.empty === 'true') {
          this.#editorInternalValue = null
          this.#closeEditorDropdown()
          this.#commitEdit(null)
        } else {
          const index = parseInt(opt.dataset.index)
          const editorType = column.editor || 'text'
          const opts = editorType === 'combobox'
            ? this.#getEditorFilteredOptions(column)
            : this.#editorDropdownOptions
          if (opts[index]) {
            this.#selectEditorOption(opts[index], column)
          }
        }
      })
    })
  }

  async #performEditorSearch(query, column) {
    const opts = column.editorOptions || {}
    const minLength = opts.minSearchLength ?? 1

    if (query.length < minLength) {
      this.#editorDropdownOptions = opts.initialOptions || opts.options || []
      this.#editorHighlightedIndex = this.#editorDropdownOptions.length > 0 ? 0 : -1
      this.#rerenderEditorDropdown(column)
      return
    }

    if (!opts.onSearch) {
      // Filter local options
      const searchLower = query.toLowerCase()
      const allOpts = opts.initialOptions || opts.options || []
      this.#editorDropdownOptions = allOpts.filter(opt =>
        this.#getEditorOptionLabel(opt, column).toLowerCase().includes(searchLower)
      )
      this.#editorHighlightedIndex = this.#editorDropdownOptions.length > 0 ? 0 : -1
      this.#rerenderEditorDropdown(column)
      return
    }

    // Cancel previous request
    if (this.#editorSearchAbortController) {
      this.#editorSearchAbortController.abort()
    }

    this.#editorSearchAbortController = new AbortController()
    const signal = this.#editorSearchAbortController.signal

    this.#editorIsSearching = true
    this.#rerenderEditorDropdown(column)

    try {
      const results = await opts.onSearch(query, signal)
      if (!signal.aborted) {
        this.#editorDropdownOptions = results
        this.#editorHighlightedIndex = results.length > 0 ? 0 : -1
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search failed:', error)
        this.#editorDropdownOptions = []
        this.#editorHighlightedIndex = -1
      }
    } finally {
      if (!signal.aborted) {
        this.#editorIsSearching = false
        this.#rerenderEditorDropdown(column)
      }
    }
  }

  // ============ Navigate Mode ============

  #focusCell(rowIndex, colIndex) {
    // Don't change focus while editing
    if (this.#editingCell) return

    console.log('[focusCell] row:', rowIndex, 'col:', colIndex)

    // Remove focus from previous cell (direct DOM update, no re-render)
    if (this.#focusedCell) {
      const prevCell = this.$(`[data-row="${this.#focusedCell.rowIndex}"][data-col="${this.#focusedCell.colIndex}"]`)
      prevCell?.classList.remove('focused')
    }

    this.#focusedCell = { rowIndex, colIndex }

    // Add focus to new cell (direct DOM update, no re-render)
    const cell = this.$(`[data-row="${rowIndex}"][data-col="${colIndex}"]`)
    console.log('[focusCell] Found cell:', cell)
    cell?.classList.add('focused')
    cell?.focus({ preventScroll: true })
  }

  /**
   * Auto-open dropdown for focused cell if showOnFocus is enabled (default true).
   * Called after arrow key navigation.
   */
  #maybeAutoOpenDropdown() {
    if (!this.#focusedCell || this.#editingCell) return

    // Check skip flag (set after dropdown selection to prevent immediate reopen)
    if (this.#skipNextDropdownAutoEdit) {
      this.#skipNextDropdownAutoEdit = false
      return
    }

    const { rowIndex, colIndex } = this.#focusedCell
    const column = this.#columns[colIndex]
    if (!column) return

    const isDropdownEditor = column.editor === 'select' || column.editor === 'combobox' || column.editor === 'autocomplete'
    if (!isDropdownEditor) return

    const opts = column.editorOptions || {}
    if (opts.showOnFocus === false) return  // default is true

    // Auto-start edit (which opens the dropdown)
    this.#startEdit(rowIndex, column.field, 'focus')
  }

  #handleNavigateKeyDown(e) {
    if (!this.#focusedCell) return
    // Don't handle navigation while editing - let editor handle keys
    if (this.#editingCell) return

    const { rowIndex, colIndex } = this.#focusedCell  // colIndex = original column index
    const editableCols = this.#editableColumns  // Array of {index, column}

    // Find current position within editable columns by original index
    const currentEditableIdx = editableCols.findIndex(ec => ec.index === colIndex)
    if (currentEditableIdx < 0) return  // Not on an editable column

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (rowIndex > 0) {
          this.#focusCell(rowIndex - 1, colIndex)
          this.#maybeAutoOpenDropdown()
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (rowIndex < this.#paginatedItems.length - 1) {
          this.#focusCell(rowIndex + 1, colIndex)
          this.#maybeAutoOpenDropdown()
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        if (currentEditableIdx > 0) {
          this.#focusCell(rowIndex, editableCols[currentEditableIdx - 1].index)
          this.#maybeAutoOpenDropdown()
        }
        break

      case 'ArrowRight':
        e.preventDefault()
        if (currentEditableIdx < editableCols.length - 1) {
          this.#focusCell(rowIndex, editableCols[currentEditableIdx + 1].index)
          this.#maybeAutoOpenDropdown()
        }
        break

      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          // Move backwards
          if (currentEditableIdx > 0) {
            this.#focusCell(rowIndex, editableCols[currentEditableIdx - 1].index)
          } else if (rowIndex > 0) {
            this.#focusCell(rowIndex - 1, editableCols[editableCols.length - 1].index)
          }
        } else {
          // Move forwards
          if (currentEditableIdx < editableCols.length - 1) {
            this.#focusCell(rowIndex, editableCols[currentEditableIdx + 1].index)
          } else if (rowIndex < this.#paginatedItems.length - 1) {
            this.#focusCell(rowIndex + 1, editableCols[0].index)
          }
        }
        break

      case 'Enter':
      case 'F2':
        e.preventDefault()
        const col = editableCols[currentEditableIdx]?.column
        if (col?.editor === 'checkbox') {
          // Toggle checkbox directly without edit mode (same as Space)
          const draftRow = this.#getDraftRow(rowIndex)
          const currentVal = draftRow[col.field]
          const trueVal = col.editorOptions?.trueValue ?? true
          const falseVal = col.editorOptions?.falseValue ?? false
          const newVal = currentVal === trueVal ? falseVal : trueVal
          this.#editingCell = { rowIndex, field: col.field }
          this.#commitEdit(newVal)
        } else if (col) {
          this.#startEdit(rowIndex, col.field, e.key === 'F2' ? 'f2' : 'enter')
        }
        break

      case ' ':
        // Toggle checkbox directly without entering edit mode
        const spaceCol = editableCols[currentEditableIdx]?.column
        if (spaceCol?.editor === 'checkbox') {
          e.preventDefault()
          const draftRow = this.#getDraftRow(rowIndex)
          const currentVal = draftRow[spaceCol.field]
          const trueVal = spaceCol.editorOptions?.trueValue ?? true
          const falseVal = spaceCol.editorOptions?.falseValue ?? false
          const newVal = currentVal === trueVal ? falseVal : trueVal
          // Set editingCell temporarily for commitEdit to work
          this.#editingCell = { rowIndex, field: spaceCol.field }
          this.#commitEdit(newVal)
        }
        break

      case 'Escape':
        e.preventDefault()
        // Direct DOM update - remove focus styling without re-render
        if (this.#focusedCell) {
          const prevCell = this.$(`[data-row="${this.#focusedCell.rowIndex}"][data-col="${this.#focusedCell.colIndex}"]`)
          prevCell?.classList.remove('focused')
          prevCell?.blur()
        }
        this.#focusedCell = null
        break

      default:
        // Ctrl+C - Copy cell value
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault()
          const copyCol = editableCols[currentEditableIdx]?.column
          if (copyCol) {
            const row = this.#items[rowIndex]
            let value = row[copyCol.field]
            // Apply beforeCopyCallback if defined
            if (copyCol.beforeCopyCallback) {
              value = copyCol.beforeCopyCallback(value, row)
            }
            // Convert to string for clipboard
            const textValue = value == null ? '' : String(value)
            navigator.clipboard.writeText(textValue).then(() => {
              console.log('[Copy] Copied:', textValue)
            }).catch(err => {
              console.error('[Copy] Failed:', err)
            })
          }
          return
        }

        // Start editing on printable character
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          const typeCol = editableCols[currentEditableIdx]?.column
          if (typeCol && typeCol.editor !== 'checkbox') {
            e.preventDefault()  // Prevent browser from also typing the character
            this.#startEdit(rowIndex, typeCol.field, 'typing', { typedChar: e.key })
          }
        }
    }
  }

  // ============ Row Toolbar ============

  get #resolvedShowToolbar() {
    return this.showRowToolbar ?? this.showRowActions ?? false
  }

  get #resolvedToolbarConfig() {
    return this.rowToolbar ?? this.rowActions ?? ['add', 'delete', 'duplicate']
  }

  get #groupedToolbarItems() {
    return groupToolbarItems(this.#resolvedToolbarConfig)
  }

  #handleRowMouseEnter = (rowIndex, element) => {
    if (this.toolbarTrigger !== 'hover') return

    if (this.#toolbarHideTimeout) {
      clearTimeout(this.#toolbarHideTimeout)
      this.#toolbarHideTimeout = null
    }

    this.#hoveredRowIndex = rowIndex
    this.#hoveredRowElement = element
    this.#hoveredRowItem = this.#paginatedItems[rowIndex]
    this.#updateToolbarPosition()
    this.scheduleRender()
  }

  #handleRowMouseLeave = () => {
    if (this.toolbarTrigger !== 'hover') return

    this.#toolbarHideTimeout = setTimeout(() => {
      if (!this.#toolbarHovered) {
        this.#hoveredRowIndex = null
        this.#hoveredRowElement = null
        this.#hoveredRowItem = null
        this.scheduleRender()
      }
    }, 200)
  }

  #handleToolbarMouseEnter = () => {
    this.#toolbarHovered = true
    if (this.#toolbarHideTimeout) {
      clearTimeout(this.#toolbarHideTimeout)
      this.#toolbarHideTimeout = null
    }
  }

  #handleToolbarMouseLeave = () => {
    this.#toolbarHovered = false
    this.#toolbarHideTimeout = setTimeout(() => {
      this.#hoveredRowIndex = null
      this.#hoveredRowElement = null
      this.#hoveredRowItem = null
      this.scheduleRender()
    }, 150)
  }

  #handleToolbarButtonClick = (rowIndex, event) => {
    if (this.#toolbarActiveRow === rowIndex) {
      // Toggle off
      this.#toolbarActiveRow = null
      this.#hoveredRowIndex = null
      this.#hoveredRowElement = null
      this.#hoveredRowItem = null
    } else {
      // Show for this row
      this.#toolbarActiveRow = rowIndex
      this.#hoveredRowIndex = rowIndex
      this.#hoveredRowElement = event.currentTarget.closest('tr')
      this.#hoveredRowItem = this.#paginatedItems[rowIndex]
      this.#updateToolbarPosition()
    }
    this.scheduleRender()
  }

  #updateToolbarPosition() {
    // Determine best position for toolbar based on available space
    const tableEl = this.$('.web-grid')
    if (!tableEl) return

    const tableRect = tableEl.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const minSpace = 100

    if (tableRect.left > minSpace) {
      this.#toolbarPosition = 'left'
    } else if (viewportWidth - tableRect.right > minSpace) {
      this.#toolbarPosition = 'right'
    } else {
      this.#toolbarPosition = 'top'
    }
  }

  #handleRowAction(action, rowIndex) {
    const row = this.#items[rowIndex]

    this.onrowaction?.({ action, rowIndex, row })
    this.emit('rowaction', { action, rowIndex, row })
  }

  #handleToolbarItemClick = (item) => {
    if (this.#hoveredRowItem === null) return

    const currentIndex = this.#paginatedItems.findIndex(i => i === this.#hoveredRowItem)
    if (currentIndex === -1) {
      this.#hoveredRowIndex = null
      this.#hoveredRowElement = null
      this.#hoveredRowItem = null
      this.scheduleRender()
      return
    }

    // Call custom onclick if defined
    item.onclick?.({ row: this.#hoveredRowItem, rowIndex: currentIndex })

    // Fire callbacks
    this.ontoolbarclick?.({ item, rowIndex: currentIndex, row: this.#hoveredRowItem })
    this.emit('toolbarclick', { item, rowIndex: currentIndex, row: this.#hoveredRowItem })

    // Fire legacy callback for predefined types
    if (item.type) {
      this.#handleRowAction(item.type, currentIndex)
    }

    // Hide toolbar for delete action
    if (item.type === 'delete') {
      this.#hoveredRowIndex = null
      this.#hoveredRowElement = null
      this.#hoveredRowItem = null
      this.scheduleRender()
    }
  }

  // ============ Context Menu ============

  #handleContextMenu(e, rowIndex, colIndex) {
    if (this.contextMenu.length === 0) return

    e.preventDefault()

    const row = this.#items[rowIndex]
    const column = this.#columns[colIndex]
    const cellValue = row[column.field]

    this.#contextMenuContext = {
      row,
      rowIndex,
      colIndex,
      column,
      cellValue
    }

    // Calculate visible items
    this.#contextMenuVisibleItems = this.contextMenu.filter(item => {
      if (typeof item.visible === 'function') {
        return item.visible(this.#contextMenuContext)
      }
      return item.visible !== false
    })

    // Calculate position with viewport bounds
    let x = e.clientX
    let y = e.clientY
    const menuWidth = 200  // Approximate menu width
    const menuHeight = this.#contextMenuVisibleItems.length * 36 + 8  // Approximate height

    // Adjust for viewport edges
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8
    }
    if (x < 8) x = 8
    if (y < 8) y = 8

    this.#contextMenuPosition = { x, y }
    this.#contextMenuVisible = true
    this.#contextMenuHighlightedIndex = -1

    this.oncontextmenuopen?.(this.#contextMenuContext)
    this.emit('contextmenuopen', this.#contextMenuContext)

    this.scheduleRender()

    // Add keyboard listener
    document.addEventListener('keydown', this.#handleContextMenuKeyDown)
  }

  #closeContextMenu() {
    this.#contextMenuVisible = false
    this.#contextMenuContext = null
    this.#contextMenuHighlightedIndex = -1
    this.#contextMenuVisibleItems = []
    document.removeEventListener('keydown', this.#handleContextMenuKeyDown)
    this.scheduleRender()
  }

  #handleContextMenuKeyDown = (e) => {
    if (!this.#contextMenuVisible) return

    const enabledItems = this.#contextMenuVisibleItems.filter(item => {
      if (typeof item.disabled === 'function') {
        return !item.disabled(this.#contextMenuContext)
      }
      return !item.disabled
    })

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.#contextMenuHighlightedIndex = Math.min(
          this.#contextMenuHighlightedIndex + 1,
          this.#contextMenuVisibleItems.length - 1
        )
        // Skip disabled items
        while (
          this.#contextMenuHighlightedIndex < this.#contextMenuVisibleItems.length &&
          !enabledItems.includes(this.#contextMenuVisibleItems[this.#contextMenuHighlightedIndex])
        ) {
          this.#contextMenuHighlightedIndex++
        }
        this.scheduleRender()
        break

      case 'ArrowUp':
        e.preventDefault()
        this.#contextMenuHighlightedIndex = Math.max(this.#contextMenuHighlightedIndex - 1, 0)
        // Skip disabled items
        while (
          this.#contextMenuHighlightedIndex > 0 &&
          !enabledItems.includes(this.#contextMenuVisibleItems[this.#contextMenuHighlightedIndex])
        ) {
          this.#contextMenuHighlightedIndex--
        }
        this.scheduleRender()
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        if (this.#contextMenuHighlightedIndex >= 0) {
          const item = this.#contextMenuVisibleItems[this.#contextMenuHighlightedIndex]
          if (item && enabledItems.includes(item)) {
            item.onclick?.(this.#contextMenuContext)
            this.#closeContextMenu()
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        this.#closeContextMenu()
        break
    }
  }

  #handleDocumentClick = (e) => {
    if (this.#contextMenuVisible) {
      const menu = this.shadowRoot?.querySelector('.context-menu')
      if (menu && !menu.contains(e.target)) {
        this.#closeContextMenu()
      }
    }

    // Cancel edit when clicking outside the editing cell
    if (this.#editingCell) {
      const editingCellEl = this.$(`[data-row="${this.#editingCell.rowIndex}"][data-field="${this.#editingCell.field}"]`)
      // Use composedPath to check clicks across Shadow DOM boundaries
      const path = e.composedPath()
      const clickedInEditingCell = editingCellEl && path.includes(editingCellEl)

      if (!clickedInEditingCell) {
        this.#cancelEdit()
      }
    }
  }

  #handleDocumentContextMenu = (e) => {
    if (this.#contextMenuVisible) {
      const menu = this.shadowRoot?.querySelector('.context-menu')
      if (!menu?.contains(e.target)) {
        this.#closeContextMenu()
      }
    }
  }

  #handlePaste = (e) => {
    // Only handle paste in navigate mode with a focused cell (not while editing)
    if (!this.#isNavigateMode || !this.#focusedCell || this.#editingCell) return

    const { rowIndex, colIndex } = this.#focusedCell
    const column = this.#columns[colIndex]
    if (!column || !column.editable) return

    e.preventDefault()
    let text = e.clipboardData.getData('text')

    // Apply beforePasteCallback if defined
    if (column.beforePasteCallback) {
      const row = this.#items[rowIndex]
      text = column.beforePasteCallback(text, row)
    }

    console.log('[Paste] Pasting:', text)

    // Use the edit/commit flow to apply the value (handles validation)
    this.#editingCell = { rowIndex, field: column.field }
    this.#commitEdit(text)
  }

  // ============ Cell Value Helpers ============

  #getCellValue(row, column, rowIndex) {
    // Use draft row if exists
    const dataRow = this.#draftRows.has(rowIndex)
      ? this.#draftRows.get(rowIndex)
      : row

    return dataRow[column.field]
  }

  #formatCellValue(value, column, row) {
    if (column.format) {
      return column.format(value, row)
    }
    if (value === null || value === undefined) {
      return ''
    }
    return String(value)
  }

  // ============ Rendering ============

  styles() {
    return styles
  }

  template() {
    const items = this.#paginatedItems
    const hasItems = items.length > 0
    const hasFilters = this.filterable && this.#columns.some(c =>
      c.filterable !== false && (this.filterable || c.filterable)
    )

    const gridClasses = [
      'web-grid',
      this.striped ? 'striped' : '',
      this.hoverable ? 'hoverable' : '',
      this.editable ? 'editable' : '',
      this.#isNavigateMode ? 'navigate-mode' : ''
    ].filter(Boolean).join(' ')

    return html`
      <div class="web-grid-container">
        ${when(this.#resolvedShowToolbar && this.#hoveredRowIndex !== null, () => this.#renderRowToolbar())}

        <table class="${gridClasses}">
          <thead>
            <tr>
              ${when(this.toolbarTrigger === 'button' && this.showRowToolbar, () => html`
                <th class="actions-column"></th>
              `)}
              ${map(this.#columns, col => this.#renderHeaderCell(col))}
            </tr>
            ${when(hasFilters, () => html`
              <tr class="filter-row">
                ${when(this.toolbarTrigger === 'button' && this.showRowToolbar, () => html`
                  <th class="actions-column"></th>
                `)}
                ${map(this.#columns, col => this.#renderFilterCell(col))}
              </tr>
            `)}
          </thead>
          <tbody>
            ${when(!hasItems, () => html`
              <tr>
                <td colspan="${this.#columns.length + (this.toolbarTrigger === 'button' ? 1 : 0)}" class="empty-message">
                  No data available
                </td>
              </tr>
            `)}
            ${map(items, (row, idx) => this.#renderRow(row, idx))}
          </tbody>
        </table>

        ${when(this.pageable, () => this.#renderPagination())}
        ${when(this.#contextMenuVisible, () => this.#renderContextMenu())}
      </div>
    `.toString()
  }

  #renderHeaderCell(column) {
    const isSortable = this.sortable || column.sortable
    const isSorted = this.#sortColumn === column.field
    const sortIndicator = isSorted
      ? (this.#sortDirection === 'asc' ? '▲' : '▼')
      : ''

    const classes = [
      'column-header',
      isSortable ? 'sortable' : '',
      isSorted ? 'sorted' : ''
    ].filter(Boolean).join(' ')

    // With table-layout: fixed, use width or maxWidth for column sizing
    const colWidth = column.width || column.maxWidth
    const style = [
      colWidth ? `width: ${colWidth}` : '',
      column.minWidth ? `min-width: ${column.minWidth}` : '',
      `text-align: ${column.align || 'left'}`
    ].filter(Boolean).join('; ')

    return html`
      <th
        class="${classes}"
        style="${style}"
        data-field="${column.field}"
      >
        <div class="column-header-content">
          <span>${column.title}</span>
          ${when(column.headerInfo, () => html`
            <span class="header-info-icon" title="${column.headerInfo}">ⓘ</span>
          `)}
          ${when(isSortable, () => html`
            <span class="sort-indicator ${!isSorted ? 'sort-placeholder' : ''}">
              ${isSorted ? sortIndicator : '⇅'}
            </span>
          `)}
        </div>
      </th>
    `
  }

  #renderFilterCell(column) {
    const isFilterable = this.filterable || column.filterable
    if (!isFilterable || column.filterable === false) {
      return html`<th></th>`
    }

    return html`
      <th>
        <input
          type="text"
          class="filter-input"
          placeholder="Filter..."
          data-field="${column.field}"
          value="${this.#filters[column.field] || ''}"
        />
      </th>
    `
  }

  #renderRow(row, rowIndex) {
    const isEditing = this.#editingCell?.rowIndex === rowIndex
    const isFocused = this.#focusedCell?.rowIndex === rowIndex
    const isHovered = this.#hoveredRowIndex === rowIndex

    return html`
      <tr data-row-index="${rowIndex}">
        ${when(this.toolbarTrigger === 'button' && this.showRowToolbar, () => html`
          <td class="actions-column">
            <button
              class="toolbar-trigger-btn ${this.#toolbarActiveRow === rowIndex ? 'active' : ''}"
              data-toolbar-trigger="${rowIndex}"
            >
              ⋮
            </button>
          </td>
        `)}
        ${map(this.#columns, (col, colIdx) => this.#renderCell(row, col, rowIndex, colIdx))}
      </tr>
    `
  }

  // ============ Inline Editor Rendering ============

  #renderInlineEditor(column, rowIndex) {
    const editorType = column.editor || 'text'
    const opts = column.editorOptions || {}

    switch (editorType) {
      case 'text':
        return this.#renderTextEditorHtml(opts)
      case 'number':
        return this.#renderNumberEditorHtml(opts)
      case 'checkbox':
        return this.#renderCheckboxEditorHtml(opts)
      case 'select':
        return this.#renderSelectEditorHtml(opts)
      case 'combobox':
        return this.#renderComboboxEditorHtml(opts)
      case 'date':
        return this.#renderDateEditorHtml(opts)
      case 'autocomplete':
        return this.#renderAutocompleteEditorHtml(opts)
      default:
        return this.#renderTextEditorHtml(opts)
    }
  }

  #renderTextEditorHtml(opts) {
    return html`
      <input
        type="text"
        class="cell-input"
        maxlength="${opts.maxLength || ''}"
        placeholder="${opts.placeholder || ''}"
        pattern="${opts.pattern || ''}"
        inputmode="${opts.inputMode || ''}"
      />
    `
  }

  #renderNumberEditorHtml(opts) {
    const min = opts.allowNegative === false ? 0 : opts.min
    const step = opts.step ?? (opts.decimalPlaces ? Math.pow(10, -opts.decimalPlaces) : undefined)

    return html`
      <input
        type="number"
        class="cell-input"
        min="${min ?? ''}"
        max="${opts.max ?? ''}"
        step="${step ?? ''}"
        placeholder="${opts.placeholder || ''}"
      />
    `
  }

  #renderCheckboxEditorHtml(opts) {
    const checked = this.#editorInternalValue === (opts.trueValue ?? true) || this.#editorInternalValue === true
    return html`
      <input
        type="checkbox"
        class="cell-checkbox"
        ${checked ? raw('checked') : raw('')}
      />
    `
  }

  #renderSelectEditorHtml(opts) {
    const displayValue = this.#getEditorCurrentDisplayValue()
    return html`
      <div
        class="cell-select-trigger"
        tabindex="0"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="${this.#editorDropdownOpen}"
      >
        <span class="cell-select-value">${displayValue}</span>
        <span class="cell-select-arrow">▼</span>
      </div>
    `
  }

  #renderComboboxEditorHtml(opts) {
    return html`
      <div class="cell-combobox-wrapper">
        <input
          type="text"
          class="cell-combobox-input"
          placeholder="${opts.placeholder || 'Select...'}"
        />
        <span class="cell-select-arrow">▼</span>
      </div>
    `
  }

  #renderDateEditorHtml(opts) {
    return html`
      <input
        type="date"
        class="cell-input"
        min="${this.#formatConstraintDate(opts.minDate) || ''}"
        max="${this.#formatConstraintDate(opts.maxDate) || ''}"
      />
    `
  }

  #renderAutocompleteEditorHtml(opts) {
    return html`
      <div class="cell-autocomplete-wrapper">
        <input
          type="text"
          class="cell-autocomplete-input"
          placeholder="${opts.placeholder || 'Type to search...'}"
        />
        ${when(this.#editorIsSearching, () => html`
          <span class="cell-loading-indicator">...</span>
        `)}
      </div>
    `
  }

  #renderEditorDropdown(column) {
    const opts = column.editorOptions || {}
    const editorType = column.editor || 'text'
    const dropdownOpts = editorType === 'combobox' ? this.#getEditorFilteredOptions(column) : this.#editorDropdownOptions

    return html`
      <qg-positioning-region class="cell-dropdown-region">
        <div class="cell-dropdown" role="listbox">
          ${when(opts.allowEmpty && editorType === 'select', () => html`
            <div
              class="cell-dropdown-option ${this.#editorInternalValue == null ? 'highlighted' : ''}"
              role="option"
              data-empty="true"
            >
              ${opts.emptyLabel || '-- Select --'}
            </div>
          `)}

          ${map(dropdownOpts, (opt, index) => html`
            <div
              class="cell-dropdown-option ${index === this.#editorHighlightedIndex ? 'highlighted' : ''}"
              role="option"
              aria-selected="${index === this.#editorHighlightedIndex}"
              data-index="${index}"
            >
              ${this.#getEditorOptionLabel(opt, column)}
            </div>
          `)}

          ${when(dropdownOpts.length === 0, () => html`
            <div class="cell-dropdown-empty">
              ${this.#editorIsSearching ? 'Searching...' : 'No options'}
            </div>
          `)}
        </div>
      </qg-positioning-region>
    `
  }

  // Editor option helpers
  #getEditorOptionValue(option, column) {
    const opts = column.editorOptions || {}
    const member = opts.valueMember || 'value'
    return option[member] ?? option.value
  }

  #getEditorOptionLabel(option, column) {
    const opts = column.editorOptions || {}
    const member = opts.displayMember || 'label'
    return String(option[member] ?? option.label)
  }

  #getEditorCurrentDisplayValue() {
    if (!this.#editingCell) return ''
    const column = this.#columns.find(c => c.field === this.#editingCell.field)
    if (!column) return ''

    const opts = column.editorOptions || {}
    if (this.#editorInternalValue === null || this.#editorInternalValue === undefined) {
      return opts.emptyLabel || '-- Select --'
    }
    const allOpts = this.#editorLoadedOptions.length > 0 ? this.#editorLoadedOptions : (opts.options || [])
    const opt = allOpts.find(o => this.#getEditorOptionValue(o, column) === this.#editorInternalValue)
    return opt ? this.#getEditorOptionLabel(opt, column) : String(this.#editorInternalValue)
  }

  #getEditorEffectiveOptions(column) {
    const opts = column.editorOptions || {}
    return this.#editorLoadedOptions.length > 0 ? this.#editorLoadedOptions : (opts.options || [])
  }

  #getEditorFilteredOptions(column) {
    if (!this.#editorIsUserFiltering || !this.#editorFilterText.trim()) {
      return this.#getEditorEffectiveOptions(column)
    }
    const searchLower = this.#editorFilterText.toLowerCase()
    return this.#getEditorEffectiveOptions(column).filter(opt =>
      this.#getEditorOptionLabel(opt, column).toLowerCase().includes(searchLower)
    )
  }

  #formatConstraintDate(val) {
    if (!val) return undefined
    if (val instanceof Date) {
      return val.toISOString().split('T')[0]
    }
    return val
  }

  #formatDateValue(val) {
    if (!val) return ''
    if (val instanceof Date) {
      return val.toISOString().split('T')[0]
    }
    if (typeof val === 'number') {
      return new Date(val).toISOString().split('T')[0]
    }
    if (typeof val === 'string') {
      const date = new Date(val)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
    return String(val)
  }

  #renderCell(row, column, rowIndex, colIndex) {
    const value = this.#getCellValue(row, column, rowIndex)
    const isEditing = this.#editingCell?.rowIndex === rowIndex &&
                      this.#editingCell?.field === column.field
    const isFocused = this.#isNavigateMode &&
                      this.#focusedCell?.rowIndex === rowIndex &&
                      this.#focusedCell?.colIndex === colIndex

    const isInvalid = this.#invalidCells.some(
      c => c.rowIndex === rowIndex && c.field === column.field
    )
    const validationError = this.#invalidCells.find(
      c => c.rowIndex === rowIndex && c.field === column.field
    )?.error

    const isEditable = column.editable && this.editable
    const trigger = column.editTrigger || this.editTrigger
    const isAlwaysEdit = trigger === 'always'
    const isCheckboxAlwaysEdit = column.editor === 'checkbox' && this.checkboxAlwaysEditable

    const classes = [
      isEditable ? 'editable-cell' : '',
      isEditing ? 'editing' : '',
      isFocused ? 'focused' : '',
      isInvalid ? 'validation-error' : ''
    ].filter(Boolean).join(' ')

    const cellStyle = [
      `text-align: ${column.align || 'left'}`,
      column.width ? `width: ${column.width}` : '',
      column.minWidth ? `min-width: ${column.minWidth}` : ''
    ].filter(Boolean).join('; ')

    const contentStyle = column.maxWidth ? `max-width: ${column.maxWidth}` : ''
    const overflowClass = column.textOverflow === 'ellipsis' ? 'text-ellipsis' : ''

    // Render editor if editing or always-edit mode
    if (isEditing || isAlwaysEdit || isCheckboxAlwaysEdit) {
      const editorType = column.editor || 'text'
      const showDropdown = this.#editorDropdownOpen && ['select', 'combobox', 'autocomplete'].includes(editorType)

      return html`
        <td
          class="${classes}"
          style="${cellStyle}"
          data-field="${column.field}"
          data-row="${rowIndex}"
          data-col="${colIndex}"
          tabindex="${this.#isNavigateMode ? '0' : '-1'}"
        >
          <div class="editor-wrapper grid-cell-editor ${this.#isValidating ? 'validating' : ''}">
            ${this.#renderInlineEditor(column, rowIndex)}
            ${when(this.#isValidating, () => html`
              <span class="validating-indicator">⏳</span>
            `)}
          </div>
          ${when(showDropdown, () => this.#renderEditorDropdown(column))}
          ${when(isInvalid, () => html`
            <span class="cell-error-indicator" title="${validationError}">⚠</span>
          `)}
        </td>
      `
    }

    // Render display value
    const displayValue = this.#formatCellValue(value, column, row)

    return html`
      <td
        class="${classes}"
        style="${cellStyle}"
        data-field="${column.field}"
        data-row="${rowIndex}"
        data-col="${colIndex}"
        tabindex="${this.#isNavigateMode && isEditable ? '0' : '-1'}"
      >
        <div class="cell-content ${overflowClass}" style="${contentStyle}">
          ${when(column.editor === 'checkbox' && this.#isNavigateMode, () => html`
            <input
              type="checkbox"
              class="cell-checkbox-display"
              ${value ? raw('checked') : raw('')}
              disabled
            />
          `, () => html`
            <span>${displayValue}</span>
          `)}
          ${when(column.showEditButton && isEditable, () => html`
            <button class="cell-edit-btn" data-edit-btn="${column.field}" data-row="${rowIndex}">✎</button>
          `)}
          ${when(isInvalid, () => html`
            <span class="cell-error-indicator" title="${validationError}">⚠</span>
          `)}
        </div>
      </td>
    `
  }

  #renderPagination() {
    const total = this.#processedItems.length
    const start = (this.#currentPage - 1) * this.#pageSize + 1
    const end = Math.min(this.#currentPage * this.#pageSize, total)

    return html`
      <div class="pagination">
        <button
          class="pagination-btn"
          ${this.#currentPage <= 1 ? raw('disabled') : raw('')}
          data-page-prev
        >
          ← Previous
        </button>
        <span class="pagination-info">
          Page ${this.#currentPage} of ${this.#totalPages}
          <span class="item-count">(${start}-${end} of ${total})</span>
        </span>
        <button
          class="pagination-btn"
          ${this.#currentPage >= this.#totalPages ? raw('disabled') : raw('')}
          data-page-next
        >
          Next →
        </button>
      </div>
    `
  }

  #renderRowToolbar() {
    const groupedItems = this.#groupedToolbarItems
    const currentRowIndex = this.#hoveredRowIndex

    return html`
      <qg-positioning-region
        class="row-toolbar-region"
        data-toolbar-popup
      >
        <div class="row-toolbar">
          ${map(groupedItems, (toolbarRow) => html`
            <div class="row-toolbar-row">
              ${map(toolbarRow.groups, (group, groupIdx) => html`
                ${when(groupIdx > 0, () => html`<div class="row-toolbar-divider"></div>`)}
                ${map(group.items, (item) => {
                  const isDisabled = typeof item.disabled === 'function'
                    ? item.disabled(this.#hoveredRowItem, currentRowIndex)
                    : item.disabled

                  return html`
                    <button
                      class="row-toolbar-btn ${item.danger ? 'danger' : ''}"
                      title="${item.title}"
                      ${isDisabled ? raw('disabled') : raw('')}
                      data-toolbar-item="${item.id}"
                    >
                      ${item.icon}
                      ${when(item.label, () => html`<span class="row-toolbar-label">${item.label}</span>`)}
                    </button>
                  `
                })}
              `)}
            </div>
          `)}
        </div>
      </qg-positioning-region>
    `
  }

  #renderContextMenu() {
    const ctx = this.#contextMenuContext
    if (!ctx) return html``

    const visibleItems = this.#contextMenuVisibleItems

    return html`
      <div
        class="context-menu"
        style="position: fixed; left: ${this.#contextMenuPosition.x}px; top: ${this.#contextMenuPosition.y}px;"
        role="menu"
      >
        ${map(visibleItems, (item, index) => {
          const label = typeof item.label === 'function' ? item.label(ctx) : item.label
          const disabled = typeof item.disabled === 'function' ? item.disabled(ctx) : item.disabled
          const isHighlighted = index === this.#contextMenuHighlightedIndex

          return html`
            ${when(item.dividerBefore, () => html`<div class="context-menu-divider"></div>`)}
            <button
              class="context-menu-item ${item.danger ? 'danger' : ''} ${isHighlighted ? 'highlighted' : ''}"
              ${disabled ? raw('disabled') : raw('')}
              data-menu-item="${item.id}"
              data-menu-index="${index}"
              role="menuitem"
            >
              ${when(item.icon, () => html`<span class="context-menu-icon">${item.icon}</span>`)}
              <span>${label}</span>
            </button>
          `
        })}
      </div>
    `
  }

  afterRender() {
    // Sort click handlers
    this.$$('.column-header.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.field
        this.#handleSort(field)
      })
    })

    // Filter input handlers
    this.$$('.filter-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field
        this.#handleFilterChange(field, e.target.value)
      })
    })

    // Pagination handlers
    this.$('[data-page-prev]')?.addEventListener('click', () => this.#handlePageChange(-1))
    this.$('[data-page-next]')?.addEventListener('click', () => this.#handlePageChange(1))

    // Cell click handlers for editing
    console.log('[afterRender] editTrigger:', this.editTrigger, 'isNavigateMode:', this.#isNavigateMode, 'editable cells:', this.$$('td.editable-cell').length)

    this.$$('td.editable-cell').forEach(td => {
      const rowIndex = parseInt(td.dataset.row)
      const field = td.dataset.field
      const column = this.#columns.find(c => c.field === field)
      const trigger = column?.editTrigger || this.editTrigger

      console.log('[afterRender] Cell:', field, 'row:', rowIndex, 'trigger:', trigger)

      if (trigger === 'click') {
        td.addEventListener('click', (e) => {
          // Don't start edit if already editing this cell
          if (this.#editingCell?.rowIndex === rowIndex && this.#editingCell?.field === field) return
          // Prevent default text selection
          e.preventDefault()
          console.log('[click] Starting edit for', field)
          // Calculate cursor position from click BEFORE replacing content
          const cursorPos = this.#getCursorPositionFromClick(e, td)
          this.#startEdit(rowIndex, field, 'click', { cursorPosition: cursorPos })
        })
      } else if (trigger === 'dblclick' || trigger === 'navigate') {
        // Double-click works in both dblclick and navigate modes
        td.addEventListener('dblclick', (e) => {
          // Don't start edit if already editing this cell
          if (this.#editingCell?.rowIndex === rowIndex && this.#editingCell?.field === field) return
          // Prevent default text selection
          e.preventDefault()
          console.log('[dblclick] Starting edit for', field)
          // Calculate cursor position from click BEFORE replacing content
          const cursorPos = this.#getCursorPositionFromClick(e, td)
          this.#startEdit(rowIndex, field, 'dblclick', { cursorPosition: cursorPos })
        })
      }

      // Navigate mode: focus tracking and checkbox click
      if (this.#isNavigateMode) {
        td.addEventListener('click', (e) => {
          // Don't change focus if we're editing
          if (this.#editingCell) return
          // Use the original column index from data-col attribute
          const originalColIdx = parseInt(td.dataset.col)
          // Check if this column is editable
          const isEditable = this.#editableColumns.some(ec => ec.index === originalColIdx)
          if (isEditable) {
            this.#focusCell(rowIndex, originalColIdx)
          }

          // Toggle checkbox on click (no edit mode)
          if (e.target.classList.contains('cell-checkbox-display')) {
            const checkboxCol = this.#columns[originalColIdx]
            if (checkboxCol?.editor === 'checkbox') {
              const draftRow = this.#getDraftRow(rowIndex)
              const currentVal = draftRow[checkboxCol.field]
              const trueVal = checkboxCol.editorOptions?.trueValue ?? true
              const falseVal = checkboxCol.editorOptions?.falseValue ?? false
              const newVal = currentVal === trueVal ? falseVal : trueVal
              this.#editingCell = { rowIndex, field: checkboxCol.field }
              this.#commitEdit(newVal)
            }
          }
        })

        td.addEventListener('keydown', (e) => this.#handleNavigateKeyDown(e))
      }

      // Context menu
      td.addEventListener('contextmenu', (e) => {
        const colIndex = parseInt(td.dataset.col)
        this.#handleContextMenu(e, rowIndex, colIndex)
      })
    })

    // Edit button handlers
    this.$$('.cell-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const field = btn.dataset.editBtn
        const rowIndex = parseInt(btn.dataset.row)
        this.#startEdit(rowIndex, field)
      })
    })

    // Row hover for toolbar
    if (this.#resolvedShowToolbar) {
      this.$$('tbody tr[data-row-index]').forEach(tr => {
        const rowIndex = parseInt(tr.dataset.rowIndex)

        if (this.toolbarTrigger === 'hover') {
          tr.addEventListener('mouseenter', () => {
            this.#handleRowMouseEnter(rowIndex, tr)
          })
          tr.addEventListener('mouseleave', () => {
            this.#handleRowMouseLeave()
          })
        }
      })

      // Toolbar button click handlers (for button trigger mode)
      this.$$('.toolbar-trigger-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const rowIndex = parseInt(btn.dataset.toolbarTrigger)
          this.#handleToolbarButtonClick(rowIndex, e)
        })
      })

      // Toolbar popup hover handlers
      const toolbarPopup = this.$('[data-toolbar-popup]')
      if (toolbarPopup) {
        const toolbarDiv = toolbarPopup.querySelector('.row-toolbar')
        if (toolbarDiv) {
          toolbarDiv.addEventListener('mouseenter', this.#handleToolbarMouseEnter)
          toolbarDiv.addEventListener('mouseleave', this.#handleToolbarMouseLeave)
        }

        // Position the toolbar
        const posRegion = this.$('qg-positioning-region.row-toolbar-region')
        if (posRegion && this.#hoveredRowElement) {
          posRegion.anchor = this.#hoveredRowElement
          posRegion.position = this.#toolbarPosition
          posRegion.align = this.toolbarAlign === 'top' ? 'start' : 'center'
          posRegion.visible = true
        }

        // Toolbar item click handlers
        this.$$('.row-toolbar-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const itemId = btn.dataset.toolbarItem
            const item = this.#groupedToolbarItems
              .flatMap(row => row.groups.flatMap(g => g.items))
              .find(i => i.id === itemId)
            if (item) {
              this.#handleToolbarItemClick(item)
            }
          })
        })
      }
    }

    // Context menu item handlers
    this.$$('.context-menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.menuItem
        const item = this.contextMenu.find(i => i.id === itemId)
        if (item && this.#contextMenuContext) {
          item.onclick?.(this.#contextMenuContext)
          this.#closeContextMenu()
        }
      })
    })

    // Note: Inline editors are now set up directly in #startEdit() and #setupInlineEditor()
    // No need for separate qg-cell-editor configuration
  }
}

// Define custom element
defineElement('web-grid', WebGrid)

export default WebGrid
