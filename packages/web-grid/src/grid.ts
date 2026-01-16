// =============================================================================
// WebGrid - Core Grid Logic Class
// =============================================================================

import type {
	Column,
	CellValidationState,
	RowToolbarConfig,
	ContextMenuItem,
	RowShortcut,
	RowChangeDetail,
	ToolbarClickDetail,
	RowActionClickDetail,
	ContextMenuContext,
	HeaderMenuConfig,
	HeaderMenuContext,
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
	ValidationTooltipContext,
	ToolbarPosition,
	GridLabels,
	RowLockInfo,
	RowLockingOptions,
	RowLockChangeDetail,
	ColumnWidthState,
	ColumnResizeDetail,
	ColumnOrderState,
	ColumnReorderDetail,
	FillDragDetail,
	FillDirection,
	GridPersistenceState,
	RangeShortcut,
	RangeShortcutContext,
	CellSelectionMode,
	CellRange,
	CellSelectionChangeDetail
} from './types.js'

// Date formatting utilities for auto-formatting date columns
import { parseFormat, formatDate } from './modules/datepicker/index.js'

// Default labels (English)
const DEFAULT_LABELS: GridLabels = {
	// Toolbar
	rowActions: 'Row actions',
	inlineActionsHeader: 'Actions',

	// Shortcuts help
	keyboardShortcuts: 'Keyboard shortcuts',

	// Pagination
	paginationFirst: '⏮',
	paginationPrevious: '◀',
	paginationNext: '▶',
	paginationLast: '⏭',
	paginationPageInfo: 'Page {current} of {total}',
	paginationItemCount: '{count} items',
	paginationPerPage: 'per page',

	// Dropdown
	dropdownNoOptions: 'No options',
	dropdownSearching: 'Searching...',

	// Context menu
	contextMenu: {
		sortAsc: 'Sort Ascending',
		sortDesc: 'Sort Descending',
		clearSort: 'Clear Sort',
		hideColumn: 'Hide Column',
		freezeColumn: 'Freeze Column',
		unfreezeColumn: 'Unfreeze Column',
		columnVisibility: 'Column Visibility',
		showAll: 'Show all'
	}
}

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
	protected _isFilterable: boolean = false
	protected _isPageable: boolean = false
	protected _pageSize: number = 10
	protected _pageSizes: number[] = [10, 25, 50, 100]
	protected _isStriped: boolean = true
	protected _isHoverable: boolean = true
	protected _isEditable: boolean = false
	protected _editTrigger: EditTrigger = "dblclick"
	protected _editStartSelection: EditStartSelection = "mousePosition"
	protected _mode: GridMode = "excel"
	protected _dropdownToggleVisibility: ToggleVisibility = "always"
	protected _shouldShowDropdownOnFocus: boolean = true
	protected _shouldOpenDropdownOnEnter: boolean = false
	protected _isCheckboxAlwaysEditable: boolean = false
	protected _isRowNumbersVisible: boolean = false
	protected _isStickyRowNumbers: boolean = false
	protected _freezeColumns: number = 0
	protected _invalidCells: CellValidationState[] = []
	protected _isRowToolbarVisible: boolean = false
	protected _rowToolbar: RowToolbarConfig<T>[] = ['add', 'delete', 'duplicate']
	protected _toolbarVerticalAlign: 'top' | 'center' | 'bottom' = 'bottom'
	protected _toolbarHorizontalAlign: 'start' | 'center' | 'end' | 'cursor' = 'center'
	protected _toolbarTrigger: 'hover' | 'click' | 'button' = 'hover'
	protected _toolbarPosition: ToolbarPosition = 'auto'
	protected _inlineActionsTitle: string = ''
	protected _contextMenu: ContextMenuItem<T>[] | undefined = undefined
	protected _contextMenuXOffset: number = 8
	protected _contextMenuYOffset: number = 0
	protected _headerContextMenu: HeaderMenuConfig<T>[] | undefined = undefined
	protected _rowShortcuts: RowShortcut<T>[] | undefined = undefined
	protected _isShortcutsHelpVisible: boolean = false
	protected _shortcutsHelpPosition: 'top-right' | 'top-left' = 'top-right'
	protected _shortcutsHelpContentCallback: (() => string) | undefined = undefined

	// Row identification
	protected _idValueMember: keyof T | undefined = undefined
	protected _idValueCallback: ((row: T) => unknown) | undefined = undefined

	// Row locking
	protected _rowLocking: RowLockingOptions<T> | undefined = undefined
	protected _externalLocks: Map<unknown, RowLockInfo> = new Map()
	protected _onrowlockchange: ((detail: RowLockChangeDetail<T>) => void) | undefined = undefined

	// Column resize & persistence
	protected _gridName: string | null = null
	protected _shouldPersistColumnWidths: boolean = false
	protected _columnWidths: Map<string, string> = new Map()  // Runtime width overrides
	protected _oncolumnresize: ((detail: ColumnResizeDetail) => void) | undefined = undefined

	// Column reorder & persistence
	protected _isColumnReorderAllowed: boolean = false
	protected _shouldPersistColumnOrder: boolean = false
	protected _columnOrder: Map<string, number> = new Map()  // Runtime order overrides
	protected _oncolumnreorder: ((detail: ColumnReorderDetail) => void) | undefined = undefined

	// Fill handle
	protected _fillDirection: FillDirection = 'vertical'
	protected _fillDragCallback: ((detail: FillDragDetail) => boolean | void) | undefined = undefined

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
	protected _onheadercontextmenuopen: ((context: HeaderMenuContext<T>) => void) | undefined
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
	protected _isSummaryInline: boolean = true

	// Custom styles
	protected _customStylesCallback?: () => string
	protected _rowClassCallback?: (row: T, rowIndex: number) => string | null

	// Labels/i18n
	protected _labels: GridLabels = { ...DEFAULT_LABELS }

	// Virtual scroll
	protected _isVirtualScrollEnabled: boolean = false
	protected _virtualScrollThreshold: number = 100
	protected _virtualScrollRowHeight: number = 38
	protected _virtualScrollBuffer: number = 10

	// Infinite scroll
	protected _isInfiniteScrollEnabled: boolean = false
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

	// Interaction state (centralized tracking for hover, focus, edit)
	protected _hoveredRowIndex: number | null = null
	protected _onInteractionChange: ((type: 'hoveredRow' | 'focusedCell' | 'editingCell', detail: { prev: any, current: any }) => void) | null = null

	// Row selection state
	protected _selectedRows: Set<number> = new Set()
	protected _lastSelectedRowIndex: number | null = null  // For Shift+Click range selection
	protected _rangeShortcuts: RangeShortcut<T>[] = []

	// Cell range selection state
	protected _cellSelectionMode: CellSelectionMode = 'click'
	protected _selectedCellRange: CellRange | null = null
	protected _lastClickedCell: { rowIndex: number, colIndex: number } | null = null
	protected _shouldCopyWithHeaders: boolean = false
	protected _oncellselectionchange: ((detail: CellSelectionChangeDetail) => void) | null = null

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

	get isFilterable(): boolean { return this._isFilterable }
	set isFilterable(value: boolean) {
		this._isFilterable = value
		this.requestUpdate()
	}

	get isPageable(): boolean { return this._isPageable }
	set isPageable(value: boolean) {
		this._isPageable = value
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

	get isStriped(): boolean { return this._isStriped }
	set isStriped(value: boolean) {
		this._isStriped = value
		this.requestUpdate()
	}

	get isHoverable(): boolean { return this._isHoverable }
	set isHoverable(value: boolean) {
		this._isHoverable = value
		this.requestUpdate()
	}

	get isEditable(): boolean { return this._isEditable }
	set isEditable(value: boolean) {
		this._isEditable = value
		this.requestUpdate()
	}

	get editTrigger(): EditTrigger { return this._editTrigger }
	set editTrigger(value: EditTrigger) {
		this._editTrigger = value
		this.checkSelectionConflicts()
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

	get shouldShowDropdownOnFocus(): boolean { return this._shouldShowDropdownOnFocus }
	set shouldShowDropdownOnFocus(value: boolean) {
		this._shouldShowDropdownOnFocus = value
	}

	get shouldOpenDropdownOnEnter(): boolean { return this._shouldOpenDropdownOnEnter }
	set shouldOpenDropdownOnEnter(value: boolean) {
		this._shouldOpenDropdownOnEnter = value
	}

	/**
	 * Get effective shouldOpenDropdownOnEnter for a column (column override or grid default)
	 */
	getEffectiveShouldOpenDropdownOnEnter(column: Column<T>): boolean {
		return column.shouldOpenDropdownOnEnter ?? this._shouldOpenDropdownOnEnter
	}

	get isCheckboxAlwaysEditable(): boolean { return this._isCheckboxAlwaysEditable }
	set isCheckboxAlwaysEditable(value: boolean) {
		this._isCheckboxAlwaysEditable = value
		this.requestUpdate()
	}

	get isRowNumbersVisible(): boolean { return this._isRowNumbersVisible }
	set isRowNumbersVisible(value: boolean) {
		this._isRowNumbersVisible = value
		this.requestUpdate()
	}

	get isStickyRowNumbers(): boolean { return this._isStickyRowNumbers }
	set isStickyRowNumbers(value: boolean) {
		this._isStickyRowNumbers = value
		this.requestUpdate()
	}

	get freezeColumns(): number { return this._freezeColumns }
	set freezeColumns(value: number) {
		this._freezeColumns = Math.max(0, Math.floor(value))
		this.requestUpdate()
	}

	/**
	 * Get columns in visual display order.
	 * Columns with frozen: true appear first, followed by non-frozen columns.
	 * Original column indices are preserved for data access.
	 */
	get visualColumns(): Array<{ column: Column<T>; originalIndex: number }> {
		const frozenCols: Array<{ column: Column<T>; originalIndex: number }> = []
		const normalCols: Array<{ column: Column<T>; originalIndex: number }> = []

		// First, separate explicitly frozen columns (column.isFrozen = true)
		// Skip hidden columns entirely
		const explicitlyFrozenCount = this._columns.filter(c => c.isFrozen && !c.isHidden).length

		this._columns.forEach((column, index) => {
			// Skip hidden columns
			if (column.isHidden) return

			const entry = { column, originalIndex: index }
			if (column.isFrozen) {
				// Explicitly frozen columns go first
				frozenCols.push(entry)
			} else {
				normalCols.push(entry)
			}
		})

		// Now handle freezeColumns - these freeze the first N non-explicitly-frozen columns
		// They should stay at the front of normalCols and NOT be reorderable
		const positionalFrozenCols: Array<{ column: Column<T>; originalIndex: number }> = []
		const reorderableCols: Array<{ column: Column<T>; originalIndex: number }> = []

		normalCols.forEach((entry, idx) => {
			if (idx < this._freezeColumns) {
				// This column is frozen by position (freezeColumns prop)
				positionalFrozenCols.push(entry)
			} else {
				reorderableCols.push(entry)
			}
		})

		// Apply custom order only to reorderable (non-frozen) columns
		if (this._columnOrder.size > 0) {
			reorderableCols.sort((a, b) => {
				const fieldA = String(a.column.field)
				const fieldB = String(b.column.field)
				const orderA = this._columnOrder.get(fieldA) ?? a.originalIndex
				const orderB = this._columnOrder.get(fieldB) ?? b.originalIndex
				return orderA - orderB
			})
		}

		return [...frozenCols, ...positionalFrozenCols, ...reorderableCols]
	}

	/**
	 * Get the total number of frozen columns (from frozen: true + freezeColumns prop).
	 */
	get totalFrozenColumns(): number {
		const explicitlyFrozen = this._columns.filter(c => c.isFrozen).length
		return explicitlyFrozen + this._freezeColumns
	}

	/**
	 * Check if a column at visual index should be frozen.
	 */
	isColumnFrozen(visualIndex: number): boolean {
		return visualIndex < this.totalFrozenColumns
	}

	get invalidCells(): CellValidationState[] { return this._invalidCells }
	set invalidCells(value: CellValidationState[]) {
		this._invalidCells = value
		this.requestUpdate()
	}

	get editingCell(): EditingCell { return this._editingCell }
	get isValidating(): boolean { return this._isValidating }
	get currentCellError(): string | null { return this._currentCellError }
	get hoveredRowIndex(): number | null { return this._hoveredRowIndex }

	get isRowToolbarVisible(): boolean { return this._isRowToolbarVisible }
	set isRowToolbarVisible(value: boolean) {
		this._isRowToolbarVisible = value
		this.requestUpdate()
	}

	get rowToolbar(): RowToolbarConfig<T>[] { return this._rowToolbar }
	set rowToolbar(value: RowToolbarConfig<T>[]) {
		this._rowToolbar = value
		this.requestUpdate()
	}

	get toolbarVerticalAlign(): 'top' | 'center' | 'bottom' { return this._toolbarVerticalAlign }
	set toolbarVerticalAlign(value: 'top' | 'center' | 'bottom') {
		this._toolbarVerticalAlign = value
		this.requestUpdate()
	}

	get toolbarHorizontalAlign(): 'start' | 'center' | 'end' | 'cursor' { return this._toolbarHorizontalAlign }
	set toolbarHorizontalAlign(value: 'start' | 'center' | 'end' | 'cursor') {
		this._toolbarHorizontalAlign = value
		this.requestUpdate()
	}

	// Deprecated aliases
	get toolbarAlign(): 'top' | 'center' | 'bottom' { return this._toolbarVerticalAlign }
	set toolbarAlign(value: 'top' | 'center' | 'bottom') { this.toolbarVerticalAlign = value }

	get toolbarTopPosition(): 'start' | 'center' | 'end' | 'cursor' { return this._toolbarHorizontalAlign }
	set toolbarTopPosition(value: 'start' | 'center' | 'end' | 'cursor') { this.toolbarHorizontalAlign = value }

	get toolbarTrigger(): 'hover' | 'click' | 'button' { return this._toolbarTrigger }
	set toolbarTrigger(value: 'hover' | 'click' | 'button') {
		this._toolbarTrigger = value
		this.requestUpdate()
	}

	get toolbarPosition(): ToolbarPosition { return this._toolbarPosition }
	set toolbarPosition(value: ToolbarPosition) {
		this._toolbarPosition = value
		this.requestUpdate()
	}

	get inlineActionsTitle(): string { return this._inlineActionsTitle }
	set inlineActionsTitle(value: string) {
		this._inlineActionsTitle = value
		this.requestUpdate()
	}

	get contextMenu(): ContextMenuItem<T>[] | undefined { return this._contextMenu }
	set contextMenu(value: ContextMenuItem<T>[] | undefined) {
		this._contextMenu = value
		this.requestUpdate()
	}

	get contextMenuXOffset(): number { return this._contextMenuXOffset }
	set contextMenuXOffset(value: number) {
		this._contextMenuXOffset = value
	}

	get contextMenuYOffset(): number { return this._contextMenuYOffset }
	set contextMenuYOffset(value: number) {
		this._contextMenuYOffset = value
	}

	// Header context menu
	get headerContextMenu(): HeaderMenuConfig<T>[] | undefined { return this._headerContextMenu }
	set headerContextMenu(value: HeaderMenuConfig<T>[] | undefined) {
		this._headerContextMenu = value
	}

	// Row keyboard shortcuts
	get rowShortcuts(): RowShortcut<T>[] | undefined { return this._rowShortcuts }
	set rowShortcuts(value: RowShortcut<T>[] | undefined) {
		this._rowShortcuts = value
		this.requestUpdate()
	}

	get isShortcutsHelpVisible(): boolean { return this._isShortcutsHelpVisible }
	set isShortcutsHelpVisible(value: boolean) {
		this._isShortcutsHelpVisible = value
		this.requestUpdate()
	}

	get shortcutsHelpPosition(): 'top-right' | 'top-left' { return this._shortcutsHelpPosition }
	set shortcutsHelpPosition(value: 'top-right' | 'top-left') {
		this._shortcutsHelpPosition = value
		this.requestUpdate()
	}

	get shortcutsHelpContentCallback(): (() => string) | undefined { return this._shortcutsHelpContentCallback }
	set shortcutsHelpContentCallback(value: (() => string) | undefined) {
		this._shortcutsHelpContentCallback = value
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

	get isSummaryInline(): boolean { return this._isSummaryInline }
	set isSummaryInline(value: boolean) {
		this._isSummaryInline = value
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

	// Labels/i18n - merge with defaults so partial updates work
	get labels(): GridLabels { return this._labels }
	set labels(value: Partial<GridLabels>) {
		this._labels = { ...DEFAULT_LABELS, ...value }
		this.requestUpdate()
	}

	// Virtual scroll
	get isVirtualScrollEnabled(): boolean { return this._isVirtualScrollEnabled }
	set isVirtualScrollEnabled(value: boolean) {
		this._isVirtualScrollEnabled = value
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
	get isInfiniteScrollEnabled(): boolean { return this._isInfiniteScrollEnabled }
	set isInfiniteScrollEnabled(value: boolean) {
		this._isInfiniteScrollEnabled = value
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
		if (this._isVirtualScrollEnabled === false) return false
		if (this._isVirtualScrollEnabled === true) return true
		// Auto-enable based on threshold
		return this.displayItems.length >= this._virtualScrollThreshold
	}

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

	get onheadercontextmenuopen(): ((context: HeaderMenuContext<T>) => void) | undefined {
		return this._onheadercontextmenuopen
	}
	set onheadercontextmenuopen(value: ((context: HeaderMenuContext<T>) => void) | undefined) {
		this._onheadercontextmenuopen = value
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

	// Row identification
	get idValueMember(): keyof T | undefined { return this._idValueMember }
	set idValueMember(value: keyof T | undefined) {
		this._idValueMember = value
	}

	get idValueCallback(): ((row: T) => unknown) | undefined { return this._idValueCallback }
	set idValueCallback(value: ((row: T) => unknown) | undefined) {
		this._idValueCallback = value
	}

	// Row locking
	get rowLocking(): RowLockingOptions<T> | undefined { return this._rowLocking }
	set rowLocking(value: RowLockingOptions<T> | undefined) {
		this._rowLocking = value
		this.requestUpdate()
	}

	get onrowlockchange(): ((detail: RowLockChangeDetail<T>) => void) | undefined { return this._onrowlockchange }
	set onrowlockchange(value: ((detail: RowLockChangeDetail<T>) => void) | undefined) {
		this._onrowlockchange = value
	}

	// Column resize & persistence
	get gridName(): string | null { return this._gridName }
	set gridName(value: string | null) {
		this._gridName = value
	}

	get shouldPersistColumnWidths(): boolean { return this._shouldPersistColumnWidths }
	set shouldPersistColumnWidths(value: boolean) {
		this._shouldPersistColumnWidths = value
	}

	get oncolumnresize(): ((detail: ColumnResizeDetail) => void) | undefined { return this._oncolumnresize }
	set oncolumnresize(value: ((detail: ColumnResizeDetail) => void) | undefined) {
		this._oncolumnresize = value
	}

	// Column reorder & persistence
	get isColumnReorderAllowed(): boolean { return this._isColumnReorderAllowed }
	set isColumnReorderAllowed(value: boolean) {
		this._isColumnReorderAllowed = value
	}

	get shouldPersistColumnOrder(): boolean { return this._shouldPersistColumnOrder }
	set shouldPersistColumnOrder(value: boolean) {
		this._shouldPersistColumnOrder = value
	}

	get oncolumnreorder(): ((detail: ColumnReorderDetail) => void) | undefined { return this._oncolumnreorder }
	set oncolumnreorder(value: ((detail: ColumnReorderDetail) => void) | undefined) {
		this._oncolumnreorder = value
	}

	// Fill handle
	get fillDirection(): FillDirection { return this._fillDirection }
	set fillDirection(value: FillDirection) {
		this._fillDirection = value
	}

	get fillDragCallback(): ((detail: FillDragDetail) => boolean | void) | undefined { return this._fillDragCallback }
	set fillDragCallback(value: ((detail: FillDragDetail) => boolean | void) | undefined) {
		this._fillDragCallback = value
	}

	// Row selection
	get selectedRows(): number[] {
		return Array.from(this._selectedRows).sort((a, b) => a - b)
	}

	get rangeShortcuts(): RangeShortcut<T>[] { return this._rangeShortcuts }
	set rangeShortcuts(value: RangeShortcut<T>[]) {
		this._rangeShortcuts = value
	}

	isRowSelected(rowIndex: number): boolean {
		return this._selectedRows.has(rowIndex)
	}

	selectRow(rowIndex: number, mode: 'replace' | 'toggle' | 'range' = 'replace'): void {
		// Clear cell selection when selecting rows
		if (this._selectedCellRange) {
			this._selectedCellRange = null
		}

		switch (mode) {
			case 'replace':
				this._selectedRows.clear()
				this._selectedRows.add(rowIndex)
				this._lastSelectedRowIndex = rowIndex
				break
			case 'toggle':
				if (this._selectedRows.has(rowIndex)) {
					this._selectedRows.delete(rowIndex)
				} else {
					this._selectedRows.add(rowIndex)
				}
				this._lastSelectedRowIndex = rowIndex
				break
			case 'range':
				if (this._lastSelectedRowIndex !== null) {
					const start = Math.min(this._lastSelectedRowIndex, rowIndex)
					const end = Math.max(this._lastSelectedRowIndex, rowIndex)
					for (let i = start; i <= end; i++) {
						this._selectedRows.add(i)
					}
				} else {
					this._selectedRows.add(rowIndex)
					this._lastSelectedRowIndex = rowIndex
				}
				break
		}
		this.requestUpdate()
	}

	selectRowRange(fromIndex: number, toIndex: number): void {
		this._selectedRows.clear()
		const start = Math.min(fromIndex, toIndex)
		const end = Math.max(fromIndex, toIndex)
		for (let i = start; i <= end; i++) {
			this._selectedRows.add(i)
		}
		this._lastSelectedRowIndex = toIndex
		this.requestUpdate()
	}

	clearSelection(): void {
		if (this._selectedRows.size > 0) {
			this._selectedRows.clear()
			this._lastSelectedRowIndex = null
			this.requestUpdate()
		}
	}

	getSelectedRowsData(): T[] {
		return this.selectedRows.map(idx => this.displayItems[idx]).filter(Boolean)
	}

	/**
	 * Copy selected rows to clipboard in TSV format (Excel-compatible)
	 * @returns true if copy was successful, false if no selection or clipboard failed
	 */
	async copySelectedRowsToClipboard(): Promise<boolean> {
		const selectedIndices = this.selectedRows
		if (selectedIndices.length === 0) return false

		const rows: string[] = []

		// Add header row if configured
		if (this._shouldCopyWithHeaders) {
			const headerCells: string[] = []
			for (const vc of this.visualColumns) {
				const title = vc.column.title ?? vc.column.field ?? ''
				headerCells.push(String(title))
			}
			rows.push(headerCells.join('\t'))
		}

		// Add data rows
		for (const rowIndex of selectedIndices) {
			const rowData = this.displayItems[rowIndex]
			if (!rowData) continue

			const rowCells: string[] = []
			for (const vc of this.visualColumns) {
				const field = String(vc.column.field)
				const value = (rowData as Record<string, unknown>)[field]
				const cellText = value == null ? '' : String(value)
				rowCells.push(cellText)
			}
			rows.push(rowCells.join('\t'))
		}

		const tsv = rows.join('\n')

		try {
			await navigator.clipboard.writeText(tsv)
			return true
		} catch {
			return false
		}
	}

	// Cell range selection
	get cellSelectionMode(): CellSelectionMode { return this._cellSelectionMode }
	set cellSelectionMode(value: CellSelectionMode) {
		this._cellSelectionMode = value
		this.checkSelectionConflicts()
		this.requestUpdate()
	}

	get shouldCopyWithHeaders(): boolean { return this._shouldCopyWithHeaders }
	set shouldCopyWithHeaders(value: boolean) { this._shouldCopyWithHeaders = value }

	get selectedCellRange(): CellRange | null { return this._selectedCellRange }

	get lastClickedCell(): { rowIndex: number, colIndex: number } | null {
		return this._lastClickedCell
	}
	set lastClickedCell(value: { rowIndex: number, colIndex: number } | null) {
		this._lastClickedCell = value
	}

	get oncellselectionchange(): ((detail: CellSelectionChangeDetail) => void) | null {
		return this._oncellselectionchange
	}
	set oncellselectionchange(value: ((detail: CellSelectionChangeDetail) => void) | null) {
		this._oncellselectionchange = value
	}

	selectCellRange(range: CellRange): void {
		// Clear row selection when selecting cells
		if (this._selectedRows.size > 0) {
			this._selectedRows.clear()
			this._lastSelectedRowIndex = null
		}

		this._selectedCellRange = range
		this.requestUpdate()

		// Fire oncellselectionchange event
		if (this._oncellselectionchange) {
			const cells = this.getSelectedCells()
			this._oncellselectionchange({
				range,
				cellCount: cells.length
			})
		}
	}

	clearCellSelection(): void {
		if (this._selectedCellRange) {
			this._selectedCellRange = null
			this.requestUpdate()

			// Fire event
			if (this._oncellselectionchange) {
				this._oncellselectionchange({ range: null, cellCount: 0 })
			}
		}
	}

	getSelectedCells(): Array<{ row: T, rowIndex: number, colIndex: number, field: string, value: unknown }> {
		if (!this._selectedCellRange) return []

		const { startRowIndex, endRowIndex, startColIndex, endColIndex } = this._selectedCellRange
		const minRow = Math.min(startRowIndex, endRowIndex)
		const maxRow = Math.max(startRowIndex, endRowIndex)
		const minCol = Math.min(startColIndex, endColIndex)
		const maxCol = Math.max(startColIndex, endColIndex)

		const cells = []
		for (let row = minRow; row <= maxRow; row++) {
			for (let col = minCol; col <= maxCol; col++) {
				const column = this.visualColumns[col]?.column
				if (!column) continue

				const rowData = this.displayItems[row]
				if (!rowData) continue

				const field = String(column.field)
				const value = (rowData as Record<string, unknown>)[field]

				cells.push({ row: rowData, rowIndex: row, colIndex: col, field, value })
			}
		}

		return cells
	}

	/**
	 * Check if a cell is in the selected cell range
	 */
	isCellInSelectedRange(rowIndex: number, colIndex: number): boolean {
		if (!this._selectedCellRange) return false

		const { startRowIndex, endRowIndex, startColIndex, endColIndex } = this._selectedCellRange
		const minRow = Math.min(startRowIndex, endRowIndex)
		const maxRow = Math.max(startRowIndex, endRowIndex)
		const minCol = Math.min(startColIndex, endColIndex)
		const maxCol = Math.max(startColIndex, endColIndex)

		return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
	}

	/**
	 * Copy selected cell range to clipboard in TSV format (Excel-compatible)
	 * @returns true if copy was successful, false if no selection or clipboard failed
	 */
	async copyCellSelectionToClipboard(): Promise<boolean> {
		if (!this._selectedCellRange) return false

		const { startRowIndex, endRowIndex, startColIndex, endColIndex } = this._selectedCellRange
		const minRow = Math.min(startRowIndex, endRowIndex)
		const maxRow = Math.max(startRowIndex, endRowIndex)
		const minCol = Math.min(startColIndex, endColIndex)
		const maxCol = Math.max(startColIndex, endColIndex)

		const rows: string[] = []

		// Add header row if configured
		if (this._shouldCopyWithHeaders) {
			const headerCells: string[] = []
			for (let col = minCol; col <= maxCol; col++) {
				const column = this.visualColumns[col]?.column
				const title = column?.title ?? column?.field ?? ''
				headerCells.push(String(title))
			}
			rows.push(headerCells.join('\t'))
		}

		// Add data rows
		for (let row = minRow; row <= maxRow; row++) {
			const rowData = this.displayItems[row]
			if (!rowData) continue

			const rowCells: string[] = []
			for (let col = minCol; col <= maxCol; col++) {
				const column = this.visualColumns[col]?.column
				if (!column) {
					rowCells.push('')
					continue
				}

				const field = String(column.field)
				const value = (rowData as Record<string, unknown>)[field]
				// Convert value to string, handle null/undefined
				const cellText = value == null ? '' : String(value)
				rowCells.push(cellText)
			}
			rows.push(rowCells.join('\t'))
		}

		const tsv = rows.join('\n')

		try {
			await navigator.clipboard.writeText(tsv)
			return true
		} catch {
			return false
		}
	}

	// ==========================================================================
	// Computed Properties (Data Pipeline)
	// ==========================================================================

	get isNavigateMode(): boolean {
		return this._editTrigger === "navigate" || this._columns.some(c => c.editTrigger === "navigate")
	}

	get filteredItems(): T[] {
		if (!this._isFilterable || Object.keys(this._filters).length === 0) {
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
		if (!this._isPageable) return this.sortedItems

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
				this._isEditable = false
				this._dropdownToggleVisibility = "on-focus"
				this._cellSelectionMode = "click"  // No editing, click to select cells
				break
			case "excel":
				this._isEditable = true
				this._editTrigger = "navigate"
				this._dropdownToggleVisibility = "always"
				this._shouldShowDropdownOnFocus = false
				this._cellSelectionMode = "click"  // Excel-like: click+drag to select
				break
			case "input-matrix":
				this._isEditable = true
				this._editTrigger = "always"
				this._dropdownToggleVisibility = "always"
				this._shouldShowDropdownOnFocus = true
				this._cellSelectionMode = "shift"  // Avoid conflict with always-editing cells
				break
		}
	}

	/**
	 * Check for configuration conflicts and warn user
	 */
	protected checkSelectionConflicts(): void {
		if (this._cellSelectionMode === 'click' && this._editTrigger === 'click') {
			console.warn(
				'WebGrid: cellSelectionMode="click" conflicts with editTrigger="click". ' +
				'Cell range selection takes priority. Use Shift+click to enter edit mode, ' +
				'or change to cellSelectionMode="shift" to avoid confusion.'
			)
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

		// Auto-format date columns using editorOptions.dateFormat when no formatCallback
		if (column.editor === 'date' && column.editorOptions?.dateFormat && value) {
			try {
				const date = value instanceof Date ? value : new Date(value as string | number)
				if (!isNaN(date.getTime())) {
					const formatInfo = parseFormat(column.editorOptions.dateFormat)
					return formatDate(date, formatInfo)
				}
			} catch {
				// Fall through to default string conversion
			}
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
		// Check if edit is allowed (respects locking)
		if (!this.canEditCell(rowIndex, field)) {
			return  // Silently block edit
		}

		const item = this.displayItems[rowIndex]
		if (!item) return

		// Clone row to draft if not already cloned (preserves dirty values across edits)
		if (!this._draftRows.has(rowIndex)) {
			this._draftRows.set(rowIndex, { ...item })
		}

		const prev = this._editingCell
		this._editingCell = {
			rowIndex,
			field,
			initialSearchQuery: options?.initialSearchQuery,
			cursorPosition: options?.cursorPosition
		}
		this._onInteractionChange?.('editingCell', { prev, current: this._editingCell })
		this._currentCellError = null
		// NOTE: No requestUpdate() - caller (tryStartEdit) handles surgical DOM update

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
			const prev = this._editingCell
			const { rowIndex, field } = prev
			const item = this.displayItems[rowIndex]
			if (item) {
				this._onroweditcancel?.({
					row: item,
					rowIndex,
					field
				})
			}
			this._editingCell = null
			this._onInteractionChange?.('editingCell', { prev, current: null })
			this._currentCellError = null
			// NOTE: No requestUpdate() - caller handles surgical DOM update
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
		const prevEditingCell = this._editingCell
		this._editingCell = null
		this._onInteractionChange?.('editingCell', { prev: prevEditingCell, current: null })
		// NOTE: No requestUpdate() - caller handles surgical DOM update
	}

	// ==========================================================================
	// Cell Editability Helpers
	// ==========================================================================

	/**
	 * Check if a column's cells can be edited
	 */
	isCellEditable(column: Column<T>): boolean {
		// Column must have editable !== false AND (global editable OR column has an editor)
		if (column.isEditable === false) return false
		return this._isEditable || column.editor !== undefined
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
		const prev = this._focusedCell
		const next: FocusedCell = { rowIndex, colIndex }
		if (prev?.rowIndex === next.rowIndex && prev?.colIndex === next.colIndex) return
		this._focusedCell = next
		this._onInteractionChange?.('focusedCell', { prev, current: next })
		// Don't call requestUpdate() - focus updates are handled surgically in GridElement
	}

	/**
	 * Clear the focused cell
	 * NOTE: Does NOT call requestUpdate() - GridElement handles DOM updates surgically
	 */
	clearFocusedCell(): void {
		const prev = this._focusedCell
		if (prev === null) return
		this._focusedCell = null
		this._onInteractionChange?.('focusedCell', { prev, current: null })
		// Don't call requestUpdate() - focus updates are handled surgically in GridElement
	}

	/**
	 * Set the hovered row index (for toolbar/shortcuts)
	 * NOTE: Does NOT call requestUpdate() - GridElement handles UI updates
	 */
	setHoveredRow(rowIndex: number | null): void {
		if (this._hoveredRowIndex === rowIndex) return
		const prev = this._hoveredRowIndex
		this._hoveredRowIndex = rowIndex
		this._onInteractionChange?.('hoveredRow', { prev, current: rowIndex })
	}

	// ==========================================================================
	// Row Identification
	// ==========================================================================

	/**
	 * Get the unique ID for a row using configured idValueMember/idValueCallback
	 */
	getRowId(row: T): unknown | undefined {
		if (this._idValueCallback) {
			return this._idValueCallback(row)
		}
		if (this._idValueMember) {
			return (row as Record<string, unknown>)[String(this._idValueMember)]
		}
		return undefined
	}

	/**
	 * Find a row by its ID
	 */
	findRowById(id: unknown): { row: T; index: number } | null {
		const index = this._items.findIndex(row => this.getRowId(row) === id)
		if (index === -1) return null
		return { row: this._items[index], index }
	}

	// ==========================================================================
	// Row Locking
	// ==========================================================================

	/**
	 * Get lock info for a row (combines all sources: external, callback, property)
	 */
	getRowLockInfo(rowOrId: T | unknown): RowLockInfo | null {
		let row: T | undefined
		let id: unknown
		let rowIndex: number = -1

		// Determine if input is a row object or an ID
		if (typeof rowOrId === 'object' && rowOrId !== null) {
			row = rowOrId as T
			id = this.getRowId(row)
			rowIndex = this._items.indexOf(row)
			if (rowIndex === -1) {
				// Row might be from displayItems
				rowIndex = this.displayItems.indexOf(row)
			}
		} else {
			id = rowOrId
			const found = this.findRowById(id)
			if (found) {
				row = found.row
				rowIndex = found.index
			}
		}

		// 1. Check external locks first (highest priority - real-time)
		if (id !== undefined && this._externalLocks.has(id)) {
			return this._externalLocks.get(id)!
		}

		// If no row object, can't check property/callback sources
		if (!row) return null

		const opts = this._rowLocking
		if (!opts) return null

		// 2. Callback-based sources
		if (opts.getLockInfoCallback) {
			const info = opts.getLockInfoCallback(row, rowIndex)
			if (info?.isLocked) return info
		}
		if (opts.isLockedCallback) {
			if (opts.isLockedCallback(row, rowIndex)) {
				return { isLocked: true }
			}
		}

		// 3. Property-based sources
		if (opts.lockInfoMember) {
			const info = (row as Record<string, unknown>)[String(opts.lockInfoMember)] as RowLockInfo | undefined
			if (info?.isLocked) return info
		}
		if (opts.lockedMember) {
			const locked = (row as Record<string, unknown>)[String(opts.lockedMember)]
			if (locked) return { isLocked: true }
		}

		return null
	}

	/**
	 * Check if a row is locked
	 */
	isRowLocked(rowOrId: T | unknown): boolean {
		const lockInfo = this.getRowLockInfo(rowOrId)
		return lockInfo?.isLocked === true
	}

	/**
	 * Lock a row by ID (external lock for WebSocket scenarios)
	 */
	lockRowById(id: unknown, lockerInfo?: Partial<RowLockInfo>): boolean {
		const lockInfo: RowLockInfo = {
			isLocked: true,
			lockedBy: lockerInfo?.lockedBy,
			lockedAt: lockerInfo?.lockedAt ?? new Date(),
			reason: lockerInfo?.reason,
			...lockerInfo
		}
		this._externalLocks.set(id, lockInfo)

		// Cancel editing if the locked row is currently being edited
		const found = this.findRowById(id)
		if (found && this._editingCell && this._editingCell.rowIndex === found.index) {
			this.cancelEdit()
		}

		this.requestUpdate()

		// Fire callback
		this._onrowlockchange?.({
			rowId: id,
			row: found?.row ?? null,
			rowIndex: found?.index ?? -1,
			lockInfo,
			source: 'external'
		})

		return true
	}

	/**
	 * Unlock a row by ID
	 */
	unlockRowById(id: unknown): boolean {
		const wasLocked = this._externalLocks.has(id)
		this._externalLocks.delete(id)
		if (wasLocked) {
			this.requestUpdate()

			const found = this.findRowById(id)
			this._onrowlockchange?.({
				rowId: id,
				row: found?.row ?? null,
				rowIndex: found?.index ?? -1,
				lockInfo: null,
				source: 'external'
			})
		}
		return wasLocked
	}

	/**
	 * Get all external locks (for debugging/inspection)
	 */
	getExternalLocks(): Map<unknown, RowLockInfo> {
		return new Map(this._externalLocks)
	}

	/**
	 * Clear all external locks
	 */
	clearExternalLocks(): void {
		this._externalLocks.clear()
		this.requestUpdate()
	}

	// ==========================================================================
	// Row Update Methods (for WebSocket/external updates)
	// ==========================================================================

	/**
	 * Update a row's data by ID (partial update, preserves other fields)
	 */
	updateRowById(id: unknown, newData: Partial<T>): boolean {
		const found = this.findRowById(id)
		if (!found) return false

		// Update original data
		Object.assign(this._items[found.index], newData)

		// Update draft if exists
		const draft = this._draftRows.get(found.index)
		if (draft) {
			Object.assign(draft, newData)
		}

		this.requestUpdate()
		return true
	}

	/**
	 * Replace entire row by ID
	 */
	replaceRowById(id: unknown, newRow: T): boolean {
		const found = this.findRowById(id)
		if (!found) return false

		this._items[found.index] = newRow

		// Clear draft for this row (data was replaced externally)
		this._draftRows.delete(found.index)

		this.requestUpdate()
		return true
	}

	// ==========================================================================
	// Edit Lock Checking
	// ==========================================================================

	/**
	 * Check if a cell can be edited (respects lock state)
	 */
	canEditCell(rowIndex: number, field: string): boolean {
		const column = this._columns.find(c => String(c.field) === field)
		if (!column || !this.isCellEditable(column)) return false

		const item = this.displayItems[rowIndex]
		if (!item) return false

		const lockInfo = this.getRowLockInfo(item)
		if (!lockInfo?.isLocked) return true  // Not locked

		const opts = this._rowLocking
		const behavior = opts?.lockedEditBehavior ?? 'block'

		switch (behavior) {
			case 'allow':
				return true
			case 'callback':
				return opts?.canEditLockedCallback?.(item, lockInfo) ?? false
			case 'block':
			default:
				return false
		}
	}

	// ==========================================================================
	// Column Width Management
	// ==========================================================================

	/**
	 * Get runtime column width override (or undefined if using column definition)
	 */
	getColumnWidth(field: string): string | undefined {
		return this._columnWidths.get(field)
	}

	/**
	 * Set runtime column width override
	 * @param skipRender - If true, don't trigger a re-render (useful during resize when DOM is already updated)
	 */
	setColumnWidth(field: string, width: string, skipRender = false): void {
		this._columnWidths.set(field, width)
		if (!skipRender) {
			this.requestUpdate()
		}
	}

	/**
	 * Set multiple column widths at once (for restoring saved state)
	 * Accepts the same format as oncolumnresize.allWidths
	 */
	setColumnWidths(widths: ColumnWidthState[]): void {
		for (const { field, width } of widths) {
			if (field && width) {
				this._columnWidths.set(field, width)
			}
		}
		this.requestUpdate()
	}

	/**
	 * Get all column widths state (for persistence/callback)
	 */
	getColumnWidthsState(): ColumnWidthState[] {
		return this._columns.map(column => {
			const field = String(column.field)
			const width = this._columnWidths.get(field) || column.width || ''
			return { field, width }
		}).filter(cw => cw.width)  // Only include columns with widths
	}

	/**
	 * Load column widths from localStorage
	 */
	loadPersistedWidths(): void {
		this.loadPersistedState()
	}

	/**
	 * Save column widths to localStorage
	 */
	savePersistedWidths(): void {
		this.savePersistedState()
	}

	/**
	 * Load persisted state (widths, order) from localStorage
	 * Automatically cleans up orphaned entries for columns that no longer exist
	 */
	loadPersistedState(): void {
		if (!this._gridName || typeof localStorage === 'undefined') return

		try {
			const key = `wg-${this._gridName}-state`
			const stored = localStorage.getItem(key)
			if (!stored) return

			const state: GridPersistenceState = JSON.parse(stored)

			// Get set of valid field names from current columns
			const validFields = new Set(this._columns.map(c => String(c.field)))
			let needsCleanup = false

			if (state.columnWidths) {
				this._columnWidths.clear()
				for (const cw of state.columnWidths) {
					if (validFields.has(cw.field)) {
						this._columnWidths.set(cw.field, cw.width)
					} else {
						needsCleanup = true
					}
				}
			}
			if (state.columnOrder) {
				this._columnOrder.clear()
				for (const co of state.columnOrder) {
					if (validFields.has(co.field)) {
						this._columnOrder.set(co.field, co.order)
					} else {
						needsCleanup = true
					}
				}
			}

			// Re-save cleaned state if orphaned entries were removed
			if (needsCleanup) {
				this.savePersistedState()
			}
		} catch (e) {
			console.warn('WebGrid: Failed to load persisted state', e)
		}
	}

	/**
	 * Save persisted state (widths, order) to localStorage
	 */
	savePersistedState(): void {
		if (!this._gridName || typeof localStorage === 'undefined') return

		try {
			const key = `wg-${this._gridName}-state`
			const state: GridPersistenceState = {}
			if (this._shouldPersistColumnWidths) {
				state.columnWidths = this.getColumnWidthsState()
			}
			if (this._shouldPersistColumnOrder) {
				state.columnOrder = this.getColumnOrderState()
			}
			localStorage.setItem(key, JSON.stringify(state))
		} catch (e) {
			console.warn('WebGrid: Failed to save persisted state', e)
		}
	}

	// ==========================================================================
	// Column Order Management
	// ==========================================================================

	/**
	 * Get runtime column order override (or undefined if using original order)
	 */
	getColumnOrder(field: string): number | undefined {
		return this._columnOrder.get(field)
	}

	/**
	 * Set multiple column orders at once (for restoring saved state)
	 * Accepts the same format as oncolumnreorder.allOrder
	 */
	setColumnOrder(order: ColumnOrderState[]): void {
		this._columnOrder.clear()
		for (const { field, order: orderValue } of order) {
			if (field !== undefined && orderValue !== undefined) {
				this._columnOrder.set(field, orderValue)
			}
		}
		this.requestUpdate()
	}

	/**
	 * Get all column order state (for persistence/callback)
	 * Returns only non-frozen columns in their visual order
	 */
	getColumnOrderState(): ColumnOrderState[] {
		const visualCols = this.visualColumns
		const frozenCount = this.totalFrozenColumns

		// Only return order for non-frozen columns
		return visualCols.slice(frozenCount).map((vc, index) => ({
			field: String(vc.column.field),
			order: index
		}))
	}

	/**
	 * Move a column to a new visual index (among non-frozen columns)
	 * Used by the reorder drag handler
	 */
	moveColumn(field: string, toIndex: number): void {
		const visualCols = this.visualColumns
		const frozenCount = this.totalFrozenColumns
		const nonFrozenCols = visualCols.slice(frozenCount)

		// Find the current index of the column being moved
		const fromIndex = nonFrozenCols.findIndex(vc => String(vc.column.field) === field)
		if (fromIndex === -1 || fromIndex === toIndex) return

		// Build new order: assign order numbers based on new positions
		this._columnOrder.clear()
		const reordered = [...nonFrozenCols]
		const [moved] = reordered.splice(fromIndex, 1)
		reordered.splice(toIndex, 0, moved)

		reordered.forEach((vc, index) => {
			this._columnOrder.set(String(vc.column.field), index)
		})

		this.requestUpdate()
	}
}

export default WebGrid
