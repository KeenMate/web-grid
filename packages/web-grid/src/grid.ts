// =============================================================================
// WebGrid - Core Grid Logic Class
// =============================================================================

import type {
	Column,
	CellValidationState,
	RowToolbarConfig,
	ContextMenuItem,
	RowChangeDetail,
	ToolbarClickDetail,
	RowActionClickDetail,
	ContextMenuContext,
	EditTrigger,
	EditStartSelection,
	EditingCell,
	FocusedCell,
	SortDirection,
	SortMode,
	SortState,
	DataRequestDetail,
	DataRequestTrigger,
	BeforeCommitContext,
	BeforeCommitResult,
	GridMode,
	ToggleVisibility,
	PaginationLabelsCallback,
	SummaryContentCallback,
	ValidationTooltipContext
} from './types.js'

/**
 * WebGrid - Core logic class for the data grid
 *
 * This class contains all the state management and business logic.
 * GridElement extends this to add DOM rendering and web component lifecycle.
 */
export class WebGrid<T = unknown> {
	// ==========================================================================
	// Configuration Props
	// ==========================================================================

	protected _items: T[] = []
	protected _columns: Column<T>[] = []
	protected _sortMode: SortMode = "none"
	protected _filterable: boolean = false
	protected _pageable: boolean = false
	protected _pageSize: number = 10
	protected _pageSizes: number[] = [10, 25, 50, 100]
	protected _striped: boolean = true
	protected _hoverable: boolean = true
	protected _editable: boolean = false
	protected _editTrigger: EditTrigger = "dblclick"
	protected _editStartSelection: EditStartSelection = "mousePosition"
	protected _mode: GridMode = "excel"
	protected _dropdownToggleVisibility: ToggleVisibility = "always"
	protected _dropdownShowOnFocus: boolean = true
	protected _openDropdownOnEnter: boolean = false
	protected _checkboxAlwaysEditable: boolean = false
	protected _showRowNumbers: boolean = false
	protected _invalidCells: CellValidationState[] = []
	protected _showRowToolbar: boolean = false
	protected _rowToolbar: RowToolbarConfig<T>[] = ['add', 'delete', 'duplicate']
	protected _toolbarAlign: 'center' | 'top' = 'center'
	protected _toolbarTopPosition: 'start' | 'center' | 'end' | 'cursor' = 'center'
	protected _toolbarTrigger: 'hover' | 'click' | 'button' = 'hover'
	protected _toolbarPosition: 'auto' | 'left' | 'right' | 'top' = 'auto'
	protected _contextMenu: ContextMenuItem<T>[] | undefined = undefined

	// ==========================================================================
	// Callbacks
	// ==========================================================================

	protected _onrowchange: ((detail: RowChangeDetail<T>) => void) | undefined
	protected _onroweditstart: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined
	protected _onroweditcancel: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined
	protected _onvalidationerror: ((detail: { row: T, rowIndex: number, field: string, error: string }) => void) | undefined
	protected _validationTooltipCallback: ((context: ValidationTooltipContext<T>) => string | null) | undefined
	protected _ontoolbarclick: ((detail: ToolbarClickDetail<T>) => void) | undefined
	protected _onrowaction: ((detail: RowActionClickDetail<T>) => void) | undefined
	protected _oncontextmenuopen: ((context: ContextMenuContext<T>) => void) | undefined
	protected _ondatarequest: ((detail: DataRequestDetail) => void) | undefined
	protected _onrowdelete: ((detail: { rowIndex: number; row: T }) => void) | undefined

	// ==========================================================================
	// Internal State
	// ==========================================================================

	// Sorting (multi-column)
	protected _sort: SortState[] = []

	// Filtering
	protected _filters: Record<string, string> = {}

	// Pagination
	protected _currentPage: number = 1
	protected _totalItems: number | null = null  // null = use items.length (client-side)
	protected _showPagination: boolean | 'auto' = true
	protected _paginationPosition: string = 'bottom-center'
	protected _paginationLabelsCallback?: PaginationLabelsCallback
	protected _paginationLayout: string = 'pageSize|previous|pageInfo|next'

	// Summary
	protected _summaryPosition?: string
	protected _summaryContentCallback?: SummaryContentCallback<T>
	protected _summaryMetadata: unknown = undefined
	protected _summaryInline: boolean = true

	// Custom styles
	protected _customStylesCallback?: () => string
	protected _rowClassCallback?: (row: T, rowIndex: number) => string | null

	// Virtual scroll
	protected _virtualScroll: boolean = false
	protected _virtualScrollThreshold: number = 100
	protected _virtualScrollRowHeight: number = 38
	protected _virtualScrollBuffer: number = 10

	// Infinite scroll
	protected _infiniteScroll: boolean = false
	protected _infiniteScrollThreshold: number = 100
	protected _hasMoreItems: boolean = true
	protected _isLoadingMore: boolean = false

	// Editing
	protected _editingCell: EditingCell = null
	protected _currentCellError: string | null = null
	protected _isValidating: boolean = false
	protected _draftRows: Map<number, T> = new Map()

	// Navigation
	protected _focusedCell: FocusedCell = null
	protected _isCommittingFromKeyboard: boolean = false
	protected _skipNextDropdownAutoEdit: boolean = false

	// ==========================================================================
	// Public API - Getters/Setters
	// ==========================================================================

	get items(): T[] { return this._items }
	set items(value: T[]) {
		this._items = value
		this.requestUpdate()
	}

	get columns(): Column<T>[] { return this._columns }
	set columns(value: Column<T>[]) {
		this._columns = value
		this.requestUpdate()
	}

	get sortMode(): SortMode { return this._sortMode }
	set sortMode(value: SortMode) {
		this._sortMode = value
		this.requestUpdate()
	}

	/** @deprecated Use sortMode instead. sortable=true maps to sortMode="multi", sortable=false maps to sortMode="none" */
	get sortable(): boolean { return this._sortMode !== "none" }
	set sortable(value: boolean) {
		this._sortMode = value ? "multi" : "none"
		this.requestUpdate()
	}

	get filterable(): boolean { return this._filterable }
	set filterable(value: boolean) {
		this._filterable = value
		this.requestUpdate()
	}

	get pageable(): boolean { return this._pageable }
	set pageable(value: boolean) {
		this._pageable = value
		this.requestUpdate()
	}

	get pageSize(): number { return this._pageSize }
	set pageSize(value: number) {
		this._pageSize = value
		this.requestUpdate()
	}

	get pageSizes(): number[] { return this._pageSizes }
	set pageSizes(value: number[]) {
		this._pageSizes = value
		this.requestUpdate()
	}

	get striped(): boolean { return this._striped }
	set striped(value: boolean) {
		this._striped = value
		this.requestUpdate()
	}

	get hoverable(): boolean { return this._hoverable }
	set hoverable(value: boolean) {
		this._hoverable = value
		this.requestUpdate()
	}

	get editable(): boolean { return this._editable }
	set editable(value: boolean) {
		this._editable = value
		this.requestUpdate()
	}

	get editTrigger(): EditTrigger { return this._editTrigger }
	set editTrigger(value: EditTrigger) {
		this._editTrigger = value
		this.requestUpdate()
	}

	get editStartSelection(): EditStartSelection { return this._editStartSelection }
	set editStartSelection(value: EditStartSelection) {
		this._editStartSelection = value
	}

	get mode(): GridMode { return this._mode }
	set mode(value: GridMode) {
		this._mode = value
		this.applyModeDefaults()
		this.requestUpdate()
	}

	get dropdownToggleVisibility(): ToggleVisibility { return this._dropdownToggleVisibility }
	set dropdownToggleVisibility(value: ToggleVisibility) {
		this._dropdownToggleVisibility = value
		this.requestUpdate()
	}

	/**
	 * Get effective toggle visibility for a column (column override or grid default)
	 */
	getEffectiveToggleVisibility(column: Column<T>): ToggleVisibility {
		return column.dropdownToggleVisibility ?? this._dropdownToggleVisibility
	}

	get dropdownShowOnFocus(): boolean { return this._dropdownShowOnFocus }
	set dropdownShowOnFocus(value: boolean) {
		this._dropdownShowOnFocus = value
	}

	get openDropdownOnEnter(): boolean { return this._openDropdownOnEnter }
	set openDropdownOnEnter(value: boolean) {
		this._openDropdownOnEnter = value
	}

	/**
	 * Get effective openDropdownOnEnter for a column (column override or grid default)
	 */
	getEffectiveOpenDropdownOnEnter(column: Column<T>): boolean {
		return column.openDropdownOnEnter ?? this._openDropdownOnEnter
	}

	get checkboxAlwaysEditable(): boolean { return this._checkboxAlwaysEditable }
	set checkboxAlwaysEditable(value: boolean) {
		this._checkboxAlwaysEditable = value
		this.requestUpdate()
	}

	get showRowNumbers(): boolean { return this._showRowNumbers }
	set showRowNumbers(value: boolean) {
		this._showRowNumbers = value
		this.requestUpdate()
	}

	get invalidCells(): CellValidationState[] { return this._invalidCells }
	set invalidCells(value: CellValidationState[]) {
		this._invalidCells = value
		this.requestUpdate()
	}

	get editingCell(): EditingCell { return this._editingCell }
	get isValidating(): boolean { return this._isValidating }
	get currentCellError(): string | null { return this._currentCellError }

	get showRowToolbar(): boolean { return this._showRowToolbar }
	set showRowToolbar(value: boolean) {
		this._showRowToolbar = value
		this.requestUpdate()
	}

	get rowToolbar(): RowToolbarConfig<T>[] { return this._rowToolbar }
	set rowToolbar(value: RowToolbarConfig<T>[]) {
		this._rowToolbar = value
		this.requestUpdate()
	}

	get toolbarAlign(): 'center' | 'top' { return this._toolbarAlign }
	set toolbarAlign(value: 'center' | 'top') {
		this._toolbarAlign = value
		this.requestUpdate()
	}

	get toolbarTopPosition(): 'start' | 'center' | 'end' | 'cursor' { return this._toolbarTopPosition }
	set toolbarTopPosition(value: 'start' | 'center' | 'end' | 'cursor') {
		this._toolbarTopPosition = value
		this.requestUpdate()
	}

	get toolbarTrigger(): 'hover' | 'click' | 'button' { return this._toolbarTrigger }
	set toolbarTrigger(value: 'hover' | 'click' | 'button') {
		this._toolbarTrigger = value
		this.requestUpdate()
	}

	get toolbarPosition(): 'auto' | 'left' | 'right' | 'top' { return this._toolbarPosition }
	set toolbarPosition(value: 'auto' | 'left' | 'right' | 'top') {
		this._toolbarPosition = value
		this.requestUpdate()
	}

	get contextMenu(): ContextMenuItem<T>[] | undefined { return this._contextMenu }
	set contextMenu(value: ContextMenuItem<T>[] | undefined) {
		this._contextMenu = value
		this.requestUpdate()
	}

	// Sorting (multi-column)
	get sort(): SortState[] { return this._sort }
	set sort(value: SortState[]) {
		this._sort = value
		this.requestUpdate()
	}

	// Pagination
	get currentPage(): number { return this._currentPage }
	set currentPage(value: number) {
		this._currentPage = value
		this.requestUpdate()
	}

	get totalItems(): number | null { return this._totalItems }
	set totalItems(value: number | null) {
		this._totalItems = value
		this.requestUpdate()
	}

	get showPagination(): boolean | 'auto' { return this._showPagination }
	set showPagination(value: boolean | 'auto') {
		this._showPagination = value
		this.requestUpdate()
	}

	get paginationPosition(): string { return this._paginationPosition }
	set paginationPosition(value: string) {
		this._paginationPosition = value
		this.requestUpdate()
	}

	get paginationLabelsCallback(): PaginationLabelsCallback | undefined { return this._paginationLabelsCallback }
	set paginationLabelsCallback(value: PaginationLabelsCallback | undefined) {
		this._paginationLabelsCallback = value
		this.requestUpdate()
	}

	get paginationLayout(): string { return this._paginationLayout }
	set paginationLayout(value: string) {
		this._paginationLayout = value
		this.requestUpdate()
	}

	get summaryPosition(): string | undefined { return this._summaryPosition }
	set summaryPosition(value: string | undefined) {
		this._summaryPosition = value
		this.requestUpdate()
	}

	get summaryContentCallback(): SummaryContentCallback<T> | undefined { return this._summaryContentCallback }
	set summaryContentCallback(value: SummaryContentCallback<T> | undefined) {
		this._summaryContentCallback = value
		this.requestUpdate()
	}

	get summaryMetadata(): unknown { return this._summaryMetadata }
	set summaryMetadata(value: unknown) {
		this._summaryMetadata = value
		this.requestUpdate()
	}

	get summaryInline(): boolean { return this._summaryInline }
	set summaryInline(value: boolean) {
		this._summaryInline = value
		this.requestUpdate()
	}

	get customStylesCallback(): (() => string) | undefined { return this._customStylesCallback }
	set customStylesCallback(value: (() => string) | undefined) {
		this._customStylesCallback = value
		// Note: requestUpdate not needed - styles are handled by web-component
	}

	get rowClassCallback(): ((row: T, rowIndex: number) => string | null) | undefined { return this._rowClassCallback }
	set rowClassCallback(value: ((row: T, rowIndex: number) => string | null) | undefined) {
		this._rowClassCallback = value
		this.requestUpdate()
	}

	// Virtual scroll
	get virtualScroll(): boolean { return this._virtualScroll }
	set virtualScroll(value: boolean) {
		this._virtualScroll = value
		this.requestUpdate()
	}

	get virtualScrollThreshold(): number { return this._virtualScrollThreshold }
	set virtualScrollThreshold(value: number) {
		this._virtualScrollThreshold = value
		this.requestUpdate()
	}

	get virtualScrollRowHeight(): number { return this._virtualScrollRowHeight }
	set virtualScrollRowHeight(value: number) {
		this._virtualScrollRowHeight = value
		this.requestUpdate()
	}

	get virtualScrollBuffer(): number { return this._virtualScrollBuffer }
	set virtualScrollBuffer(value: number) {
		this._virtualScrollBuffer = value
		this.requestUpdate()
	}

	// Infinite scroll
	get infiniteScroll(): boolean { return this._infiniteScroll }
	set infiniteScroll(value: boolean) {
		this._infiniteScroll = value
		this.requestUpdate()
	}

	get infiniteScrollThreshold(): number { return this._infiniteScrollThreshold }
	set infiniteScrollThreshold(value: number) { this._infiniteScrollThreshold = value }

	get hasMoreItems(): boolean { return this._hasMoreItems }
	set hasMoreItems(value: boolean) { this._hasMoreItems = value }

	get isLoadingMore(): boolean { return this._isLoadingMore }
	set isLoadingMore(value: boolean) { this._isLoadingMore = value }

	/**
	 * Check if virtual scroll should be used
	 */
	shouldUseVirtualScroll(): boolean {
		if (this._virtualScroll === false) return false
		if (this._virtualScroll === true) return true
		// Auto-enable based on threshold
		return this.displayItems.length >= this._virtualScrollThreshold
	}

	// Legacy aliases for backwards compatibility
	get showRowActions(): boolean { return this._showRowToolbar }
	set showRowActions(value: boolean) { this.showRowToolbar = value }

	get rowActions(): RowToolbarConfig<T>[] { return this._rowToolbar }
	set rowActions(value: RowToolbarConfig<T>[]) { this.rowToolbar = value }

	// Callback setters
	set onrowchange(value: ((detail: RowChangeDetail<T>) => void) | undefined) {
		this._onrowchange = value
	}

	set onroweditstart(value: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined) {
		this._onroweditstart = value
	}

	set onroweditcancel(value: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined) {
		this._onroweditcancel = value
	}

	set onvalidationerror(value: ((detail: { row: T, rowIndex: number, field: string, error: string }) => void) | undefined) {
		this._onvalidationerror = value
	}

	get validationTooltipCallback(): ((context: ValidationTooltipContext<T>) => string | null) | undefined {
		return this._validationTooltipCallback
	}
	set validationTooltipCallback(value: ((context: ValidationTooltipContext<T>) => string | null) | undefined) {
		this._validationTooltipCallback = value
	}

	get ontoolbarclick(): ((detail: ToolbarClickDetail<T>) => void) | undefined {
		return this._ontoolbarclick
	}
	set ontoolbarclick(value: ((detail: ToolbarClickDetail<T>) => void) | undefined) {
		this._ontoolbarclick = value
	}

	set onrowaction(value: ((detail: RowActionClickDetail<T>) => void) | undefined) {
		this._onrowaction = value
	}

	set oncontextmenuopen(value: ((context: ContextMenuContext<T>) => void) | undefined) {
		this._oncontextmenuopen = value
	}

	get ondatarequest(): ((detail: DataRequestDetail) => void) | undefined {
		return this._ondatarequest
	}
	set ondatarequest(value: ((detail: DataRequestDetail) => void) | undefined) {
		this._ondatarequest = value
	}

	get onrowdelete(): ((detail: { rowIndex: number; row: T }) => void) | undefined {
		return this._onrowdelete
	}
	set onrowdelete(value: ((detail: { rowIndex: number; row: T }) => void) | undefined) {
		this._onrowdelete = value
	}

	// ==========================================================================
	// Computed Properties (Data Pipeline)
	// ==========================================================================

	get isNavigateMode(): boolean {
		return this._editTrigger === "navigate" || this._columns.some(c => c.editTrigger === "navigate")
	}

	get filteredItems(): T[] {
		if (!this._filterable || Object.keys(this._filters).length === 0) {
			return this._items
		}

		return this._items.filter((item) => {
			return Object.entries(this._filters).every(([field, filterValue]) => {
				if (!filterValue) return true
				const cellValue = String((item as Record<string, unknown>)[field] ?? "").toLowerCase()
				return cellValue.includes(filterValue.toLowerCase())
			})
		})
	}

	get sortedItems(): T[] {
		// No sort columns = return filtered items as-is
		if (this._sort.length === 0) return this.filteredItems

		return [...this.filteredItems].sort((a, b) => {
			// Multi-column sort: compare each column in order
			for (const sortState of this._sort) {
				const aVal = (a as Record<string, unknown>)[sortState.column]
				const bVal = (b as Record<string, unknown>)[sortState.column]

				if (aVal === bVal) continue  // Equal, check next column

				let comparison = 0
				if (typeof aVal === "string" && typeof bVal === "string") {
					comparison = aVal.localeCompare(bVal)
				} else if (typeof aVal === "number" && typeof bVal === "number") {
					comparison = aVal - bVal
				} else {
					comparison = String(aVal ?? "").localeCompare(String(bVal ?? ""))
				}

				return sortState.direction === "asc" ? comparison : -comparison
			}
			return 0  // All columns equal
		})
	}

	get paginatedItems(): T[] {
		if (!this._pageable) return this.sortedItems

		const start = (this._currentPage - 1) * this._pageSize
		const end = start + this._pageSize
		return this.sortedItems.slice(start, end)
	}

	get totalPages(): number {
		// Use totalItems if provided (server-side pagination), otherwise use local item count
		const itemCount = this._totalItems !== null ? this._totalItems : this.sortedItems.length
		return Math.max(1, Math.ceil(itemCount / this._pageSize))
	}

	get displayItems(): T[] {
		return this.paginatedItems
	}

	// ==========================================================================
	// Data Request Helper
	// ==========================================================================

	/**
	 * Fire ondatarequest event with current state
	 */
	fireDataRequest(trigger: DataRequestTrigger): void {
		if (this._ondatarequest) {
			// For loadMore, skip is current item count; for pagination, it's page-based
			const skip = trigger === 'loadMore'
				? this._items.length
				: (this._currentPage - 1) * this._pageSize

			const detail: DataRequestDetail = {
				sort: [...this._sort],
				page: this._currentPage,
				pageSize: this._pageSize,
				trigger,
				mode: trigger === 'loadMore' ? 'append' : 'replace',
				skip
			}
			this._ondatarequest(detail)
		}
	}

	/**
	 * Check if column is currently sorted
	 */
	getColumnSortState(field: string): SortState | undefined {
		return this._sort.find(s => s.column === field)
	}

	/**
	 * Get sort priority (1-based) for a column, or 0 if not sorted
	 */
	getColumnSortPriority(field: string): number {
		const index = this._sort.findIndex(s => s.column === field)
		return index >= 0 ? index + 1 : 0
	}

	// ==========================================================================
	// Mode Defaults
	// ==========================================================================

	/**
	 * Apply sensible defaults based on the current mode.
	 * Called when mode is set.
	 */
	protected applyModeDefaults(): void {
		switch (this._mode) {
			case "read-only":
				this._editable = false
				this._dropdownToggleVisibility = "on-focus"
				break
			case "excel":
				this._editable = true
				this._editTrigger = "navigate"
				this._dropdownToggleVisibility = "always"
				this._dropdownShowOnFocus = false
				break
			case "input-matrix":
				this._editable = true
				this._editTrigger = "always"
				this._dropdownToggleVisibility = "always"
				this._dropdownShowOnFocus = true
				break
		}
	}

	// ==========================================================================
	// Update Mechanism (to be overridden by GridElement)
	// ==========================================================================

	protected requestUpdate(): void {
		// Override in GridElement to trigger DOM re-render
	}

	// ==========================================================================
	// Draft Row Management
	// ==========================================================================

	getRowDraft(rowIndex: number): T | undefined {
		return this._draftRows.get(rowIndex)
	}

	hasRowDraft(rowIndex: number): boolean {
		return this._draftRows.has(rowIndex)
	}

	discardRowDraft(rowIndex: number): void {
		this._draftRows.delete(rowIndex)
		this._invalidCells = this._invalidCells.filter(c => c.rowIndex !== rowIndex)
		this.requestUpdate()
	}

	getDraftRowIndices(): number[] {
		return Array.from(this._draftRows.keys())
	}

	discardAllDrafts(): void {
		this._draftRows.clear()
		this._invalidCells = []
		this.requestUpdate()
	}

	// ==========================================================================
	// Cell Value Helpers
	// ==========================================================================

	getCellRawValue(item: T, rowIndex: number, field: string): unknown {
		const draftRow = this._draftRows.get(rowIndex)
		if (draftRow) {
			return (draftRow as Record<string, unknown>)[field]
		}
		return (item as Record<string, unknown>)[field]
	}

	getCellValue(item: T, column: Column<T>, rowIndex?: number): string {
		if (column.templateCallback) {
			return column.templateCallback(item)
		}
		const value = rowIndex !== undefined
			? this.getCellRawValue(item, rowIndex, String(column.field))
			: (item as Record<string, unknown>)[String(column.field)]
		if (column.formatCallback) {
			return column.formatCallback(value, item)
		}
		return String(value ?? "")
	}

	// ==========================================================================
	// Validation Helpers
	// ==========================================================================

	isCellInvalid(rowIndex: number, field: string): boolean {
		return this._invalidCells.some(c => c.rowIndex === rowIndex && c.field === field)
	}

	getCellValidationError(rowIndex: number, field: string): string | null {
		const cell = this._invalidCells.find(c => c.rowIndex === rowIndex && c.field === field)
		return cell?.error || null
	}

	protected addInvalidCell(rowIndex: number, field: string, error: string): void {
		const existingIndex = this._invalidCells.findIndex(c => c.rowIndex === rowIndex && c.field === field)
		if (existingIndex >= 0) {
			this._invalidCells[existingIndex] = { rowIndex, field, error }
		} else {
			this._invalidCells = [...this._invalidCells, { rowIndex, field, error }]
		}
	}

	protected removeInvalidCell(rowIndex: number, field: string): void {
		this._invalidCells = this._invalidCells.filter(c => !(c.rowIndex === rowIndex && c.field === field))
	}

	// ==========================================================================
	// Edit State Management
	// ==========================================================================

	/**
	 * Check if a specific cell is currently being edited
	 */
	isEditing(rowIndex: number, field: string): boolean {
		return this._editingCell?.rowIndex === rowIndex && this._editingCell?.field === field
	}

	/**
	 * Start editing a cell
	 */
	startEdit(rowIndex: number, field: string, options?: { initialSearchQuery?: string; cursorPosition?: number }): void {
		const item = this.displayItems[rowIndex]
		if (!item) return

		// Clone row to draft if not already cloned (preserves dirty values across edits)
		if (!this._draftRows.has(rowIndex)) {
			this._draftRows.set(rowIndex, { ...item })
		}

		this._editingCell = {
			rowIndex,
			field,
			initialSearchQuery: options?.initialSearchQuery,
			cursorPosition: options?.cursorPosition
		}
		this._currentCellError = null
		this.requestUpdate()

		// Fire callback
		this._onroweditstart?.({
			row: item,
			rowIndex,
			field
		})
	}

	/**
	 * Cancel editing without saving
	 */
	cancelEdit(): void {
		if (this._editingCell) {
			const { rowIndex, field } = this._editingCell
			const item = this.displayItems[rowIndex]
			if (item) {
				this._onroweditcancel?.({
					row: item,
					rowIndex,
					field
				})
			}
			this._editingCell = null
			this._currentCellError = null
			this.requestUpdate()
		}
	}

	/**
	 * Normalize validation result to consistent format
	 */
	protected normalizeValidationResult(
		result: BeforeCommitResult,
		value: unknown
	): { valid: boolean; message?: string; finalValue: unknown } {
		if (result === null || result === undefined || result === true) {
			return { valid: true, finalValue: value }
		}
		if (result === false) {
			return { valid: false, message: "Validation failed", finalValue: value }
		}
		if (typeof result === "string") {
			return { valid: false, message: result, finalValue: value }
		}
		// ValidationResult object
		return {
			valid: result.valid,
			message: result.message,
			finalValue: result.transformedValue !== undefined
				? result.transformedValue
				: value
		}
	}

	/**
	 * Commit edit with validation
	 */
	async commitEdit(rowIndex: number, field: string, newValue: unknown): Promise<void> {
		const column = this._columns.find(c => String(c.field) === field)
		if (!column) return

		const item = this.displayItems[rowIndex]
		if (!item) return

		const oldValue = (item as Record<string, unknown>)[field]
		let finalValue = newValue
		let validationError: string | null = null
		let isValid = true

		this._isValidating = true

		try {
			// NEW: beforeCommitCallback (preferred)
			if (column.beforeCommitCallback) {
				const context: BeforeCommitContext<T> = {
					value: newValue,
					oldValue,
					row: item,
					rowIndex,
					field
				}
				const result = await Promise.resolve(column.beforeCommitCallback(context))
				const normalized = this.normalizeValidationResult(result, newValue)

				isValid = normalized.valid
				validationError = normalized.message || null
				finalValue = normalized.finalValue
			}
			// LEGACY: validateCallback function
			else if (column.validateCallback) {
				const error = await Promise.resolve(column.validateCallback(newValue, item))
				if (error) {
					isValid = false
					validationError = error
				}
			}
		} catch (err) {
			isValid = false
			validationError = err instanceof Error ? err.message : "Validation failed"
		}

		this._isValidating = false

		// ALWAYS update draft row (valid OR invalid) - preserves user input
		let draftRow = this._draftRows.get(rowIndex)
		if (!draftRow) {
			draftRow = { ...item }
			this._draftRows.set(rowIndex, draftRow)
		}
		(draftRow as Record<string, unknown>)[field] = finalValue

		// Update invalid cells tracking
		if (isValid) {
			this.removeInvalidCell(rowIndex, field)
			this._currentCellError = null
		} else {
			this.addInvalidCell(rowIndex, field, validationError || "Invalid value")
			this._currentCellError = validationError
			this._onvalidationerror?.({
				row: item,
				rowIndex,
				field,
				error: validationError || "Invalid value"
			})
		}

		// Fire onrowchange (always, with isValid flag)
		this._onrowchange?.({
			row: item,
			draftRow,
			rowIndex,
			field,
			oldValue,
			newValue: finalValue,
			isValid,
			validationError
		})

		// Exit edit mode
		this._editingCell = null
		this.requestUpdate()
	}

	// ==========================================================================
	// Cell Editability Helpers
	// ==========================================================================

	/**
	 * Check if a column's cells can be edited
	 */
	isCellEditable(column: Column<T>): boolean {
		// Column must have editable !== false AND (global editable OR column has an editor)
		if (column.editable === false) return false
		return this._editable || column.editor !== undefined
	}

	/**
	 * Get all editable columns with their indices
	 */
	getEditableColumns(): { index: number; column: Column<T> }[] {
		return this._columns
			.map((col, index) => ({ index, column: col }))
			.filter(({ column }) => this.isCellEditable(column))
	}

	// ==========================================================================
	// Navigation / Focus Helpers
	// ==========================================================================

	/**
	 * Check if a specific cell is currently focused
	 */
	isCellFocused(rowIndex: number, colIndex: number): boolean {
		return this._focusedCell?.rowIndex === rowIndex && this._focusedCell?.colIndex === colIndex
	}

	/**
	 * Get the currently focused cell
	 */
	get focusedCell(): FocusedCell {
		return this._focusedCell
	}

	/**
	 * Set focus to a specific cell (state only, DOM focus handled by GridElement)
	 * NOTE: Does NOT call requestUpdate() - GridElement handles DOM updates surgically
	 */
	setFocusedCell(rowIndex: number, colIndex: number): void {
		this._focusedCell = { rowIndex, colIndex }
		// Don't call requestUpdate() - focus updates are handled surgically in GridElement
	}

	/**
	 * Clear the focused cell
	 * NOTE: Does NOT call requestUpdate() - GridElement handles DOM updates surgically
	 */
	clearFocusedCell(): void {
		this._focusedCell = null
		// Don't call requestUpdate() - focus updates are handled surgically in GridElement
	}
}

export default WebGrid
