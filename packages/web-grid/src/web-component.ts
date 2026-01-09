// =============================================================================
// GridElement - Web Component Registration
// =============================================================================

import { WebGrid } from './grid.js'
import type {
	Column,
	CellValidationState,
	RowToolbarConfig,
	ContextMenuItem,
	RowShortcut,
	ShortcutContext,
	ParsedKeyCombo,
	RowChangeDetail,
	ToolbarClickDetail,
	RowActionClickDetail,
	ContextMenuContext,
	CustomEditorContext,
	EditTrigger,
	EditStartSelection,
	EditorOption,
	EditorOptions,
	GridMode,
	ToggleVisibility,
	NormalizedToolbarItem,
	DataRequestDetail,
	SortState,
	SortMode,
	PaginationLabelsCallback,
	SummaryContentCallback,
	ValidationTooltipContext,
	ToolbarPosition,
	GridLabels,
	RowLockInfo,
	RowLockingOptions,
	RowLockChangeDetail,
	ColumnResizeDetail,
	ColumnWidthState,
	ColumnReorderDetail,
	ColumnOrderState,
	FillDragDetail,
	RangeShortcut,
	RangeShortcutContext
} from './types.js'

// Import CSS (Vite inlines this as a string)
import styles from './css/main.css?inline'

// Import module functions
import {
	getOptionDisplayValue,
	getOptionLabel,
	getOptionValue,
	renderDropdown,
	removeDropdown,
	selectDropdownOption,
	updateDropdownHighlight,
	scrollHighlightedIntoView,
	updateLoadingIndicator,
	openDropdownForCurrentEditor,
	toggleDropdown,
	attachDropdownListeners,
	updateSelectFilter,
	handleComboboxInput,
	handleAutocompleteInput,
	isOptionDisabled
} from './modules/dropdown/index.js'

import {
	showTooltip,
	hideTooltip
} from './modules/tooltip/index.js'

import {
	focusCellElement,
	updateFocusVisual,
	clearEditingVisual,
	handleCellFocus,
	moveFocus,
	tryStartEdit,
	getCursorPositionFromClick,
	handleTableFocusOut,
	scrollToRowPosition
} from './modules/navigation/index.js'

import {
	commitCurrentEditor,
	handleCheckboxChange,
	toggleCheckboxAndMove,
	handleEditorBlur,
	moveFocusAfterCommit,
	focusCellAfterCancel,
	renderCellEditor
} from './modules/editing/index.js'

import {
	getContainerClasses,
	renderHeaderRow,
	renderDataRows,
	renderDataRowsVirtual,
	renderPagination,
	renderSummary,
	renderCell
} from './modules/rendering/index.js'

import type { VirtualScrollParams } from './modules/rendering/index.js'

import { DatePicker, parseFormat, formatDate, normalizeDate, toISODateString } from './modules/datepicker/index.js'
import { openContextMenu, closeContextMenu } from './modules/contextmenu/index.js'
import {
	normalizeToolbarItems,
	openToolbar,
	closeToolbar,
	isToolbarOpenForRow,
	getActiveToolbarRowIndex,
	isToolbarOwnedBy,
	getConnectorState,
	updateConnector,
	buildToolbarTooltipHtml,
	type ConnectorState
} from './modules/toolbar/index.js'

import {
	parseKeyCombo,
	matchesKeyCombo,
	formatKeyCombo
} from './modules/keyboard/index.js'

import {
	calculateVisibleRange,
	calculateScrollToRow,
	shouldTriggerInfiniteScroll
} from './modules/scroll/index.js'

import { handleSortClick, handlePaginationClick, handlePageSizeChange } from './modules/events/index.js'
import { handleResizeStart } from './modules/resize/index.js'
import { handleReorderStart, isReordering } from './modules/reorder/index.js'
import { updateFillHandle, removeFillHandle } from './modules/fill-handle/index.js'

import {
	handleRowNumberMouseDown,
	handleContainerClick,
	handleEscapeKey as handleSelectionEscape
} from './modules/selection/index.js'

import type { GridContext } from './modules/types.js'

/**
 * GridElement - Custom HTML Element for WebGrid
 *
 * Extends HTMLElement and composes WebGrid for business logic.
 *
 * Usage:
 * ```html
 * <web-grid></web-grid>
 * ```
 *
 * ```js
 * const grid = document.querySelector('web-grid');
 * grid.items = [...];
 * grid.columns = [...];
 * ```
 */
export class GridElement<T = unknown> extends HTMLElement implements GridContext<T> {
	// Core grid logic (composition)
	readonly grid: WebGrid<T>

	// Shadow DOM root
	readonly shadow: ShadowRoot

	// Style element (for initial CSS injection)
	private styleElement: HTMLStyleElement

	// Custom styles element (for user-provided CSS via customStylesCallback)
	private customStyleElement: HTMLStyleElement | null = null

	// Update batching
	private updatePending = false

	// Flag to prevent blur from committing when keyboard already handled it
	isCommittingFromKeyboard = false

	// Flag to prevent blur from cancelling edit when switching between dropdown cells
	private isTransitioningCells = false

	// Flag to track if wheel listener has been added (prevent duplicates)
	private wheelListenerAdded = false

	// Flag to track if toolbar outside click listener has been added
	private toolbarOutsideClickAdded = false

	// Flag to track if toolbar scroll listener has been added
	private toolbarScrollListenerAdded = false

	// Flag to prevent mouseleave from closing toolbar during move actions
	private toolbarMoveInProgress = false

	// Toolbar hover tracking (for delayed hide like QuickGrid)
	private toolbarHideTimeout: ReturnType<typeof setTimeout> | null = null
	private toolbarHovered = false
	private toolbarShortcutHandler: ((e: KeyboardEvent) => void) | null = null

	// Inline shortcuts handler (hovered row tracked in WebGrid.hoveredRowIndex)
	private inlineShortcutHandler: ((e: KeyboardEvent) => void) | null = null

	// Dropdown state for combobox/autocomplete
	dropdownOpen = false
	dropdownOptions: EditorOption[] = []
	highlightedIndex = -1
	filterText = ''
	isUserFiltering = false
	justSelected = false
	isOpeningDropdown = false  // Flag to skip scroll events during dropdown opening
	private isProgrammaticScroll = false  // Flag to skip handleVirtualScroll during keyboard nav

	// Autocomplete async state
	searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
	searchAbortController: AbortController | null = null
	isSearching = false

	// Tooltip state
	tooltipElement: HTMLElement | null = null
	tooltipArrowElement: HTMLElement | null = null
	tooltipAnchor: HTMLElement | null = null  // Track current anchor for repositioning
	tooltipShowTimer: ReturnType<typeof setTimeout> | null = null
	tooltipHideTimer: ReturnType<typeof setTimeout> | null = null

	// Tooltip configuration (grid-level)
	private _tooltipShowDelay: number = 400
	private _tooltipHideDelay: number = 100

	get tooltipShowDelay(): number { return this._tooltipShowDelay }
	set tooltipShowDelay(value: number) { this._tooltipShowDelay = value }

	get tooltipHideDelay(): number { return this._tooltipHideDelay }
	set tooltipHideDelay(value: number) { this._tooltipHideDelay = value }

	// DatePicker instance (for date editor)
	private datepicker: DatePicker | null = null

	// Context menu element (rendered to document.body)
	private contextMenuElement: HTMLElement | null = null

	// Virtual scroll state
	private virtualScrollStart = 0
	private virtualScrollEnd = 0
	private scrollListenerAdded = false
	private isLoadingMoreItems = false

	constructor() {
		super()
		this.shadow = this.attachShadow({ mode: 'open' })
		this.grid = new WebGrid<T>()

		// Inject styles immediately to prevent FOUC
		this.styleElement = document.createElement('style')
		this.styleElement.textContent = styles
		this.shadow.appendChild(this.styleElement)

		// Override requestUpdate to trigger DOM render
		;(this.grid as unknown as { requestUpdate: () => void }).requestUpdate = () => this.requestUpdate()

		// Handle interaction changes (cleanup dropdown when editing is cancelled externally)
		;(this.grid as unknown as { _onInteractionChange: ((type: string, detail: { prev: unknown, current: unknown }) => void) | null })._onInteractionChange = (type, detail) => {
			if (type === 'editingCell' && detail.current === null) {
				// Editing was cancelled - clean up dropdown if open
				removeDropdown(this)
			}
		}
	}

	// ==========================================================================
	// Web Component Lifecycle
	// ==========================================================================

	connectedCallback(): void {
		// Load persisted column widths before initial render
		if (this.grid.gridName && this.grid.persistColumnWidths) {
			this.grid.loadPersistedWidths()
		}
		this.render()
		// Register paste handler for navigate mode
		this.addEventListener('paste', this.handlePaste as EventListener)
	}

	disconnectedCallback(): void {
		// Cleanup event listeners, observers, etc.
		this.removeEventListener('paste', this.handlePaste as EventListener)
		if (this.datepicker) {
			this.datepicker.destroy()
			this.datepicker = null
		}
		if (this.contextMenuElement) {
			closeContextMenu(this.contextMenuElement)
			this.contextMenuElement = null
		}
		// Close any open toolbar
		closeToolbar()
		// Cleanup inline shortcuts
		this.removeInlineShortcuts()
	}

	// ==========================================================================
	// Public API - Proxy to WebGrid
	// ==========================================================================

	get items(): T[] { return this.grid.items }
	set items(value: T[]) {
		this.grid.items = value
		// Reset infinite scroll loading flag
		this.isLoadingMoreItems = false
	}

	get columns(): Column<T>[] { return this.grid.columns }
	set columns(value: Column<T>[]) { this.grid.columns = value }

	get filterable(): boolean { return this.grid.filterable }
	set filterable(value: boolean) { this.grid.filterable = value }

	get pageable(): boolean { return this.grid.pageable }
	set pageable(value: boolean) { this.grid.pageable = value }

	get pageSize(): number { return this.grid.pageSize }
	set pageSize(value: number) { this.grid.pageSize = value }

	get pageSizes(): number[] { return this.grid.pageSizes }
	set pageSizes(value: number[]) { this.grid.pageSizes = value }

	get striped(): boolean { return this.grid.striped }
	set striped(value: boolean) { this.grid.striped = value }

	get hoverable(): boolean { return this.grid.hoverable }
	set hoverable(value: boolean) { this.grid.hoverable = value }

	get editable(): boolean { return this.grid.editable }
	set editable(value: boolean) { this.grid.editable = value }

	get editTrigger(): EditTrigger { return this.grid.editTrigger }
	set editTrigger(value: EditTrigger) { this.grid.editTrigger = value }

	get editStartSelection(): EditStartSelection { return this.grid.editStartSelection }
	set editStartSelection(value: EditStartSelection) { this.grid.editStartSelection = value }

	get mode(): GridMode { return this.grid.mode }
	set mode(value: GridMode) { this.grid.mode = value }

	get dropdownToggleVisibility(): ToggleVisibility { return this.grid.dropdownToggleVisibility }
	set dropdownToggleVisibility(value: ToggleVisibility) { this.grid.dropdownToggleVisibility = value }

	get dropdownShowOnFocus(): boolean { return this.grid.dropdownShowOnFocus }
	set dropdownShowOnFocus(value: boolean) { this.grid.dropdownShowOnFocus = value }

	get openDropdownOnEnter(): boolean { return this.grid.openDropdownOnEnter }
	set openDropdownOnEnter(value: boolean) { this.grid.openDropdownOnEnter = value }

	get checkboxAlwaysEditable(): boolean { return this.grid.checkboxAlwaysEditable }
	set checkboxAlwaysEditable(value: boolean) { this.grid.checkboxAlwaysEditable = value }

	get showRowNumbers(): boolean { return this.grid.showRowNumbers }
	set showRowNumbers(value: boolean) { this.grid.showRowNumbers = value }

	get stickyRowNumbers(): boolean { return this.grid.stickyRowNumbers }
	set stickyRowNumbers(value: boolean) { this.grid.stickyRowNumbers = value }

	get freezeColumns(): number { return this.grid.freezeColumns }
	set freezeColumns(value: number) { this.grid.freezeColumns = value }

	get invalidCells(): CellValidationState[] { return this.grid.invalidCells }
	set invalidCells(value: CellValidationState[]) { this.grid.invalidCells = value }

	get showRowToolbar(): boolean { return this.grid.showRowToolbar }
	set showRowToolbar(value: boolean) { this.grid.showRowToolbar = value }

	get rowToolbar(): RowToolbarConfig<T>[] { return this.grid.rowToolbar }
	set rowToolbar(value: RowToolbarConfig<T>[]) { this.grid.rowToolbar = value }

	get toolbarVerticalAlign(): 'top' | 'center' | 'bottom' { return this.grid.toolbarVerticalAlign }
	set toolbarVerticalAlign(value: 'top' | 'center' | 'bottom') { this.grid.toolbarVerticalAlign = value }

	get toolbarHorizontalAlign(): 'start' | 'center' | 'end' | 'cursor' { return this.grid.toolbarHorizontalAlign }
	set toolbarHorizontalAlign(value: 'start' | 'center' | 'end' | 'cursor') { this.grid.toolbarHorizontalAlign = value }

	// Deprecated aliases
	get toolbarAlign(): 'top' | 'center' | 'bottom' { return this.grid.toolbarVerticalAlign }
	set toolbarAlign(value: 'top' | 'center' | 'bottom') { this.grid.toolbarVerticalAlign = value }

	get toolbarTopPosition(): 'start' | 'center' | 'end' | 'cursor' { return this.grid.toolbarHorizontalAlign }
	set toolbarTopPosition(value: 'start' | 'center' | 'end' | 'cursor') { this.grid.toolbarHorizontalAlign = value }

	get toolbarTrigger(): 'hover' | 'click' | 'button' { return this.grid.toolbarTrigger }
	set toolbarTrigger(value: 'hover' | 'click' | 'button') { this.grid.toolbarTrigger = value }

	get toolbarPosition(): ToolbarPosition { return this.grid.toolbarPosition }
	set toolbarPosition(value: ToolbarPosition) { this.grid.toolbarPosition = value }

	get inlineActionsTitle(): string { return this.grid.inlineActionsTitle }
	set inlineActionsTitle(value: string) { this.grid.inlineActionsTitle = value }

	get contextMenu(): ContextMenuItem<T>[] | undefined { return this.grid.contextMenu }
	set contextMenu(value: ContextMenuItem<T>[] | undefined) { this.grid.contextMenu = value }

	get contextMenuXOffset(): number { return this.grid.contextMenuXOffset }
	set contextMenuXOffset(value: number) { this.grid.contextMenuXOffset = value }

	get contextMenuYOffset(): number { return this.grid.contextMenuYOffset }
	set contextMenuYOffset(value: number) { this.grid.contextMenuYOffset = value }

	// Row keyboard shortcuts
	get rowShortcuts(): RowShortcut<T>[] | undefined { return this.grid.rowShortcuts }
	set rowShortcuts(value: RowShortcut<T>[] | undefined) { this.grid.rowShortcuts = value }

	// Range shortcuts (for multi-row selection)
	get rangeShortcuts(): RangeShortcut<T>[] { return this.grid.rangeShortcuts }
	set rangeShortcuts(value: RangeShortcut<T>[]) { this.grid.rangeShortcuts = value }

	// Row selection
	get selectedRows(): number[] { return this.grid.selectedRows }
	selectRow(rowIndex: number, mode: 'replace' | 'toggle' | 'range' = 'replace'): void { this.grid.selectRow(rowIndex, mode) }
	selectRowRange(fromIndex: number, toIndex: number): void { this.grid.selectRowRange(fromIndex, toIndex) }
	clearSelection(): void { this.grid.clearSelection() }
	isRowSelected(rowIndex: number): boolean { return this.grid.isRowSelected(rowIndex) }
	getSelectedRowsData(): T[] { return this.grid.getSelectedRowsData() }

	get showShortcutsHelp(): boolean { return this.grid.showShortcutsHelp }
	set showShortcutsHelp(value: boolean) { this.grid.showShortcutsHelp = value }

	get shortcutsHelpPosition(): 'top-right' | 'top-left' { return this.grid.shortcutsHelpPosition }
	set shortcutsHelpPosition(value: 'top-right' | 'top-left') { this.grid.shortcutsHelpPosition = value }

	get shortcutsHelpContentCallback(): (() => string) | undefined { return this.grid.shortcutsHelpContentCallback }
	set shortcutsHelpContentCallback(value: (() => string) | undefined) { this.grid.shortcutsHelpContentCallback = value }

	// Legacy aliases
	get showRowActions(): boolean { return this.grid.showRowActions }
	set showRowActions(value: boolean) { this.grid.showRowActions = value }

	get rowActions(): RowToolbarConfig<T>[] { return this.grid.rowActions }
	set rowActions(value: RowToolbarConfig<T>[]) { this.grid.rowActions = value }

	// Callback setters
	set onrowchange(value: ((detail: RowChangeDetail<T>) => void) | undefined) {
		this.grid.onrowchange = value
	}

	set onroweditstart(value: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined) {
		this.grid.onroweditstart = value
	}

	set onroweditcancel(value: ((detail: { row: T, rowIndex: number, field: string }) => void) | undefined) {
		this.grid.onroweditcancel = value
	}

	set onvalidationerror(value: ((detail: { row: T, rowIndex: number, field: string, error: string }) => void) | undefined) {
		this.grid.onvalidationerror = value
	}

	get validationTooltipCallback(): ((context: ValidationTooltipContext<T>) => string | null) | undefined {
		return this.grid.validationTooltipCallback
	}
	set validationTooltipCallback(value: ((context: ValidationTooltipContext<T>) => string | null) | undefined) {
		this.grid.validationTooltipCallback = value
	}

	set ontoolbarclick(value: ((detail: ToolbarClickDetail<T>) => void) | undefined) {
		this.grid.ontoolbarclick = value
	}

	set onrowaction(value: ((detail: RowActionClickDetail<T>) => void) | undefined) {
		this.grid.onrowaction = value
	}

	set oncontextmenuopen(value: ((context: ContextMenuContext<T>) => void) | undefined) {
		this.grid.oncontextmenuopen = value
	}

	get ondatarequest(): ((detail: DataRequestDetail) => void) | undefined {
		return this.grid.ondatarequest
	}
	set ondatarequest(value: ((detail: DataRequestDetail) => void) | undefined) {
		this.grid.ondatarequest = value
	}

	get onrowdelete(): ((detail: { rowIndex: number; row: T }) => void) | undefined {
		return this.grid.onrowdelete
	}
	set onrowdelete(value: ((detail: { rowIndex: number; row: T }) => void) | undefined) {
		this.grid.onrowdelete = value
	}

	// Sorting & Pagination
	get sort(): SortState[] { return this.grid.sort }
	set sort(value: SortState[]) { this.grid.sort = value }

	get sortMode(): SortMode { return this.grid.sortMode }
	set sortMode(value: SortMode) { this.grid.sortMode = value }

	get currentPage(): number { return this.grid.currentPage }
	set currentPage(value: number) { this.grid.currentPage = value }

	get totalItems(): number | null { return this.grid.totalItems }
	set totalItems(value: number | null) { this.grid.totalItems = value }

	get showPagination(): boolean | 'auto' { return this.grid.showPagination }
	set showPagination(value: boolean | 'auto') { this.grid.showPagination = value }

	get paginationPosition(): string { return this.grid.paginationPosition }
	set paginationPosition(value: string) { this.grid.paginationPosition = value }

	get paginationLabelsCallback(): PaginationLabelsCallback | undefined { return this.grid.paginationLabelsCallback }
	set paginationLabelsCallback(value: PaginationLabelsCallback | undefined) { this.grid.paginationLabelsCallback = value }

	get paginationLayout(): string { return this.grid.paginationLayout }
	set paginationLayout(value: string) { this.grid.paginationLayout = value }

	get summaryPosition(): string | undefined { return this.grid.summaryPosition }
	set summaryPosition(value: string | undefined) { this.grid.summaryPosition = value }

	get summaryContentCallback(): SummaryContentCallback<T> | undefined { return this.grid.summaryContentCallback }
	set summaryContentCallback(value: SummaryContentCallback<T> | undefined) { this.grid.summaryContentCallback = value }

	get customStylesCallback(): (() => string) | undefined { return this.grid.customStylesCallback }
	set customStylesCallback(value: (() => string) | undefined) {
		this.grid.customStylesCallback = value
		this.updateCustomStyles()
	}

	get rowClassCallback(): ((row: T, rowIndex: number) => string | null) | undefined { return this.grid.rowClassCallback }
	set rowClassCallback(value: ((row: T, rowIndex: number) => string | null) | undefined) { this.grid.rowClassCallback = value }

	get labels(): GridLabels { return this.grid.labels }
	set labels(value: Partial<GridLabels>) { this.grid.labels = value }

	get summaryMetadata(): unknown { return this.grid.summaryMetadata }
	set summaryMetadata(value: unknown) { this.grid.summaryMetadata = value }

	get summaryInline(): boolean { return this.grid.summaryInline }
	set summaryInline(value: boolean) { this.grid.summaryInline = value }

	// Row identification
	get idValueMember(): keyof T | undefined { return this.grid.idValueMember }
	set idValueMember(value: keyof T | undefined) { this.grid.idValueMember = value }

	get idValueCallback(): ((row: T) => unknown) | undefined { return this.grid.idValueCallback }
	set idValueCallback(value: ((row: T) => unknown) | undefined) { this.grid.idValueCallback = value }

	// Row locking
	get rowLocking(): RowLockingOptions<T> | undefined { return this.grid.rowLocking }
	set rowLocking(value: RowLockingOptions<T> | undefined) { this.grid.rowLocking = value }

	get onrowlockchange(): ((detail: RowLockChangeDetail<T>) => void) | undefined { return this.grid.onrowlockchange }
	set onrowlockchange(value: ((detail: RowLockChangeDetail<T>) => void) | undefined) { this.grid.onrowlockchange = value }

	// Column resize & persistence
	get gridName(): string | null { return this.grid.gridName }
	set gridName(value: string | null) {
		this.grid.gridName = value
		// Load persisted widths if both gridName and persistColumnWidths are set
		this.tryLoadPersistedWidths()
	}

	get persistColumnWidths(): boolean { return this.grid.persistColumnWidths }
	set persistColumnWidths(value: boolean) {
		this.grid.persistColumnWidths = value
		this.tryLoadPersistedState()
	}

	get allowColumnReorder(): boolean { return this.grid.allowColumnReorder }
	set allowColumnReorder(value: boolean) { this.grid.allowColumnReorder = value }

	get persistColumnOrder(): boolean { return this.grid.persistColumnOrder }
	set persistColumnOrder(value: boolean) {
		this.grid.persistColumnOrder = value
		this.tryLoadPersistedState()
	}

	/**
	 * Try to load persisted state (widths/order) if conditions are met
	 */
	private tryLoadPersistedState(): void {
		if (this.grid.gridName && (this.grid.persistColumnWidths || this.grid.persistColumnOrder)) {
			this.grid.loadPersistedState()
			// Re-render if we're connected to DOM
			if (this.isConnected) {
				this.render()
			}
		}
	}

	// Keep old method for backwards compatibility
	private tryLoadPersistedWidths(): void {
		this.tryLoadPersistedState()
	}

	get oncolumnresize(): ((detail: ColumnResizeDetail) => void) | undefined { return this.grid.oncolumnresize }
	set oncolumnresize(value: ((detail: ColumnResizeDetail) => void) | undefined) { this.grid.oncolumnresize = value }

	get oncolumnreorder(): ((detail: ColumnReorderDetail) => void) | undefined { return this.grid.oncolumnreorder }
	set oncolumnreorder(value: ((detail: ColumnReorderDetail) => void) | undefined) { this.grid.oncolumnreorder = value }

	// Fill handle callback
	get onfilldrag(): ((detail: FillDragDetail) => boolean | void) | undefined { return this.grid.onfilldrag }
	set onfilldrag(value: ((detail: FillDragDetail) => boolean | void) | undefined) { this.grid.onfilldrag = value }

	// Virtual scroll
	get virtualScroll(): boolean { return this.grid.virtualScroll }
	set virtualScroll(value: boolean) { this.grid.virtualScroll = value }

	get virtualScrollThreshold(): number { return this.grid.virtualScrollThreshold }
	set virtualScrollThreshold(value: number) { this.grid.virtualScrollThreshold = value }

	get virtualScrollRowHeight(): number { return this.grid.virtualScrollRowHeight }
	set virtualScrollRowHeight(value: number) { this.grid.virtualScrollRowHeight = value }

	get virtualScrollBuffer(): number { return this.grid.virtualScrollBuffer }
	set virtualScrollBuffer(value: number) { this.grid.virtualScrollBuffer = value }

	// Infinite scroll
	get infiniteScroll(): boolean { return this.grid.infiniteScroll }
	set infiniteScroll(value: boolean) { this.grid.infiniteScroll = value }

	get infiniteScrollThreshold(): number { return this.grid.infiniteScrollThreshold }
	set infiniteScrollThreshold(value: number) { this.grid.infiniteScrollThreshold = value }

	get hasMoreItems(): boolean { return this.grid.hasMoreItems }
	set hasMoreItems(value: boolean) { this.grid.hasMoreItems = value }

	// Computed properties
	get displayItems(): T[] { return this.grid.displayItems }
	get totalPages(): number { return this.grid.totalPages }
	get isNavigateMode(): boolean { return this.grid.isNavigateMode }

	// Draft row methods
	getRowDraft(rowIndex: number): T | undefined { return this.grid.getRowDraft(rowIndex) }
	hasRowDraft(rowIndex: number): boolean { return this.grid.hasRowDraft(rowIndex) }
	discardRowDraft(rowIndex: number): void { this.grid.discardRowDraft(rowIndex) }
	getDraftRowIndices(): number[] { return this.grid.getDraftRowIndices() }
	discardAllDrafts(): void { this.grid.discardAllDrafts() }

	// Validation methods
	isCellInvalid(rowIndex: number, field: string): boolean { return this.grid.isCellInvalid(rowIndex, field) }
	getCellValidationError(rowIndex: number, field: string): string | null { return this.grid.getCellValidationError(rowIndex, field) }

	// Row identification methods
	getRowId(row: T): unknown | undefined { return this.grid.getRowId(row) }
	findRowById(id: unknown): { row: T; index: number } | null { return this.grid.findRowById(id) }

	// Row locking methods
	isRowLocked(rowOrId: T | unknown): boolean { return this.grid.isRowLocked(rowOrId) }
	getRowLockInfo(rowOrId: T | unknown): RowLockInfo | null { return this.grid.getRowLockInfo(rowOrId) }
	lockRowById(id: unknown, lockerInfo?: Partial<RowLockInfo>): boolean { return this.grid.lockRowById(id, lockerInfo) }
	unlockRowById(id: unknown): boolean { return this.grid.unlockRowById(id) }
	getExternalLocks(): Map<unknown, RowLockInfo> { return this.grid.getExternalLocks() }
	clearExternalLocks(): void { this.grid.clearExternalLocks() }

	// Row update methods (for WebSocket/external updates)
	updateRowById(id: unknown, newData: Partial<T>): boolean { return this.grid.updateRowById(id, newData) }
	replaceRowById(id: unknown, newRow: T): boolean { return this.grid.replaceRowById(id, newRow) }

	// Edit permission check
	canEditCell(rowIndex: number, field: string): boolean { return this.grid.canEditCell(rowIndex, field) }

	// Column width methods
	setColumnWidth(field: string, width: string): void { this.grid.setColumnWidth(field, width) }
	setColumnWidths(widths: ColumnWidthState[]): void { this.grid.setColumnWidths(widths) }
	getColumnWidthsState(): ColumnWidthState[] { return this.grid.getColumnWidthsState() }

	// Column order methods
	setColumnOrder(order: ColumnOrderState[]): void { this.grid.setColumnOrder(order) }
	getColumnOrderState(): ColumnOrderState[] { return this.grid.getColumnOrderState() }

	// Public methods for focus and editing
	/**
	 * Programmatically focus a cell. Updates state and focuses the DOM element.
	 * State is updated immediately so pending renders use the correct position.
	 */
	focusCell(rowIndex: number, colIndex: number): void {
		const columns = this.grid.columns
		const displayItems = this.grid.displayItems
		if (rowIndex < 0 || rowIndex >= displayItems.length) return
		if (colIndex < 0 || colIndex >= columns.length) return

		// Update state immediately so any pending render uses the correct position
		this.grid.setFocusedCell(rowIndex, colIndex)

		// Schedule DOM focus for after any pending render completes
		requestAnimationFrame(() => {
			moveFocus(this, rowIndex, colIndex)
		})
	}

	/**
	 * Programmatically start editing a cell.
	 * Uses surgical DOM update instead of full re-render.
	 */
	startEditing(rowIndex: number, colIndex: number): void {
		const columns = this.grid.columns
		if (colIndex < 0 || colIndex >= columns.length) return

		const column = columns[colIndex]
		const field = String(column.field)

		// Update state (no longer triggers requestUpdate)
		this.grid.startEdit(rowIndex, field)

		// Surgical DOM update
		const cell = this.shadow.querySelector(
			`td[data-row="${rowIndex}"][data-col="${colIndex}"]`
		) as HTMLElement
		if (cell) {
			cell.classList.remove('wg__cell--focused')
			cell.classList.add('wg__cell--editing')
			cell.innerHTML = renderCellEditor(this, rowIndex, colIndex, column)
		}
	}

	// ==========================================================================
	// GridContext Implementation - Required by module functions
	// ==========================================================================

	escapeHtml(text: string): string {
		const div = document.createElement('div')
		div.textContent = text
		return div.innerHTML
	}

	getCurrentEditingColumn(): Column<T> | null {
		const editingCell = this.grid.editingCell
		if (!editingCell) return null
		return this.grid.columns.find(c => String(c.field) === editingCell.field) || null
	}

	getCurrentEditorOptions(): EditorOptions {
		const column = this.getCurrentEditingColumn()
		return column?.editorOptions || {}
	}

	// Delegate to module function - needed for lifecycle module
	moveFocusAfterCommit(rowIndex: number, field: string, direction: 'down' | 'up' | 'next' | 'prev'): void {
		moveFocusAfterCommit(this, rowIndex, field, direction)
	}

	// ==========================================================================
	// Update Mechanism
	// ==========================================================================

	private requestUpdate(): void {
		if (this.updatePending) return
		this.updatePending = true

		// Batch updates using microtask
		queueMicrotask(() => {
			this.updatePending = false
			this.render()
		})
	}

	/**
	 * Update custom styles in shadow DOM from customStylesCallback
	 */
	private updateCustomStyles(): void {
		const callback = this.grid.customStylesCallback
		if (callback) {
			const css = callback()
			if (!this.customStyleElement) {
				this.customStyleElement = document.createElement('style')
				this.shadow.appendChild(this.customStyleElement)
			}
			this.customStyleElement.textContent = css
		} else if (this.customStyleElement) {
			this.customStyleElement.remove()
			this.customStyleElement = null
		}
	}

	// ==========================================================================
	// Keyboard Navigation - Cell level
	// ==========================================================================

	/**
	 * Handle keyboard navigation in cells
	 */
	private handleCellKeyDown(e: KeyboardEvent, rowIndex: number, colIndex: number): void {
		if (!this.grid.isNavigateMode) {
			return
		}

		const columns = this.grid.columns
		const displayItems = this.grid.displayItems

		// For Tab navigation, we still use editable columns only
		const editableCols = this.grid.getEditableColumns()
		const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

		// Ctrl+C - Copy cell value to clipboard
		if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
			const column = columns[colIndex]
			const row = displayItems[rowIndex]
			if (column && row) {
				let value: unknown = this.grid.getCellRawValue(row, rowIndex, String(column.field))
				if (column.beforeCopyCallback) {
					value = column.beforeCopyCallback(value, row)
				}
				const textValue = value != null ? String(value) : ''
				navigator.clipboard.writeText(textValue)
			}
			return // Let browser also handle for visual feedback
		}

		// Check range shortcuts (when rows are selected)
		const selectedRowIndices = this.grid.selectedRows
		if (selectedRowIndices.length > 0) {
			const rangeShortcuts = this.grid.rangeShortcuts
			if (rangeShortcuts && rangeShortcuts.length > 0) {
				for (const shortcut of rangeShortcuts) {
					const combo = parseKeyCombo(shortcut.key)
					if (matchesKeyCombo(e, combo)) {
						// Build range context
						const ctx: RangeShortcutContext<T> = {
							rows: this.grid.getSelectedRowsData(),
							rowIndices: selectedRowIndices
						}

						// Check if disabled
						const isDisabled = typeof shortcut.disabled === 'function'
							? shortcut.disabled(ctx)
							: shortcut.disabled === true

						if (!isDisabled) {
							e.preventDefault()
							shortcut.action(ctx)
							return
						}
					}
				}
			}
		}

		// Check row shortcuts (user-defined keyboard shortcuts)
		const shortcuts = this.grid.rowShortcuts
		if (shortcuts && shortcuts.length > 0) {
			const column = columns[colIndex]
			const row = displayItems[rowIndex]
			if (column && row) {
				for (const shortcut of shortcuts) {
					const combo = parseKeyCombo(shortcut.key)
					if (matchesKeyCombo(e, combo)) {
						// Build shortcut context
						const ctx: ShortcutContext<T> = {
							row,
							rowIndex,
							colIndex,
							column,
							cellValue: this.grid.getCellRawValue(row, rowIndex, String(column.field))
						}

						// Check if disabled
						const isDisabled = typeof shortcut.disabled === 'function'
							? shortcut.disabled(ctx)
							: shortcut.disabled === true

						if (!isDisabled) {
							e.preventDefault()
							shortcut.action(ctx)
							return
						}
					}
				}
			}
		}

		switch (e.key) {
			case 'ArrowUp':
				e.preventDefault()
				if (rowIndex > 0) {
					moveFocus(this, rowIndex - 1, colIndex)
				}
				break

			case 'ArrowDown':
				e.preventDefault()
				if (rowIndex < displayItems.length - 1) {
					moveFocus(this, rowIndex + 1, colIndex)
				}
				break

			case 'ArrowLeft':
				e.preventDefault()
				if (colIndex > 0) {
					moveFocus(this, rowIndex, colIndex - 1)
				}
				break

			case 'ArrowRight':
				e.preventDefault()
				if (colIndex < columns.length - 1) {
					moveFocus(this, rowIndex, colIndex + 1)
				}
				break

			case 'Tab':
				e.preventDefault()
				if (e.shiftKey) {
					if (currentEditableIndex > 0) {
						const newColIndex = editableCols[currentEditableIndex - 1].index
						moveFocus(this, rowIndex, newColIndex)
					} else if (rowIndex > 0) {
						const newColIndex = editableCols[editableCols.length - 1].index
						moveFocus(this, rowIndex - 1, newColIndex)
					}
				} else {
					if (currentEditableIndex >= 0 && currentEditableIndex < editableCols.length - 1) {
						const newColIndex = editableCols[currentEditableIndex + 1].index
						moveFocus(this, rowIndex, newColIndex)
					} else if (currentEditableIndex === -1 && editableCols.length > 0) {
						moveFocus(this, rowIndex, editableCols[0].index)
					} else if (rowIndex < displayItems.length - 1) {
						const newColIndex = editableCols[0].index
						moveFocus(this, rowIndex + 1, newColIndex)
					}
				}
				break

			case 'Home':
				e.preventDefault()
				if (e.ctrlKey) {
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(0, 0)
						this.scrollToRowProgrammatically(0)
						const cell = this.shadow.querySelector(`td[data-row="0"][data-col="0"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: 0, colIndex: 0 })
						}
					} else {
						moveFocus(this, 0, 0)
					}
				} else {
					moveFocus(this, rowIndex, 0)
				}
				break

			case 'End':
				e.preventDefault()
				if (e.ctrlKey) {
					const lastRow = displayItems.length - 1
					const lastCol = columns.length - 1
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(lastRow, lastCol)
						this.scrollToRowProgrammatically(lastRow)
						const cell = this.shadow.querySelector(`td[data-row="${lastRow}"][data-col="${lastCol}"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: lastRow, colIndex: lastCol })
						}
					} else {
						moveFocus(this, lastRow, lastCol)
					}
				} else {
					moveFocus(this, rowIndex, columns.length - 1)
				}
				break

			case 'PageUp':
				e.preventDefault()
				if (e.ctrlKey) {
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(0, colIndex)
						this.scrollToRowProgrammatically(0)
						const cell = this.shadow.querySelector(`td[data-row="0"][data-col="${colIndex}"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: 0, colIndex })
						}
					} else {
						moveFocus(this, 0, colIndex)
					}
				} else {
					const newRowUp = Math.max(0, rowIndex - 10)
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(newRowUp, colIndex)
						this.scrollToRowProgrammatically(newRowUp)
						const cell = this.shadow.querySelector(`td[data-row="${newRowUp}"][data-col="${colIndex}"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: newRowUp, colIndex })
						}
					} else {
						moveFocus(this, newRowUp, colIndex)
					}
				}
				break

			case 'PageDown':
				e.preventDefault()
				if (e.ctrlKey) {
					const lastRow = displayItems.length - 1
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(lastRow, colIndex)
						this.scrollToRowProgrammatically(lastRow)
						const cell = this.shadow.querySelector(`td[data-row="${lastRow}"][data-col="${colIndex}"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: lastRow, colIndex })
						}
					} else {
						moveFocus(this, lastRow, colIndex)
					}
				} else {
					const newRowDown = Math.min(displayItems.length - 1, rowIndex + 10)
					if (this.grid.shouldUseVirtualScroll()) {
						const oldFocus = this.grid.focusedCell
						this.grid.setFocusedCell(newRowDown, colIndex)
						this.scrollToRowProgrammatically(newRowDown)
						// Focus the cell after scroll (renderVirtualRows may not run if range unchanged)
						const cell = this.shadow.querySelector(`td[data-row="${newRowDown}"][data-col="${colIndex}"]`) as HTMLElement
						if (cell) {
							cell.focus({ preventScroll: true })
							updateFocusVisual(this, oldFocus, { rowIndex: newRowDown, colIndex })
						}
					} else {
						moveFocus(this, newRowDown, colIndex)
					}
				}
				break

			case 'g':
			case 'G':
				if (e.ctrlKey) {
					e.preventDefault()
					this.showGoToRowDialog(colIndex)
				}
				break

			case 'Enter': {
				e.preventDefault()
				const column = columns[colIndex]
				const isDropdownColumn = column?.editor === 'select' || column?.editor === 'combobox' || column?.editor === 'autocomplete'

				if (isDropdownColumn && this.grid.getEffectiveOpenDropdownOnEnter(column)) {
					tryStartEdit(this, rowIndex, colIndex)
					requestAnimationFrame(() => {
						if (!this.dropdownOpen) {
							openDropdownForCurrentEditor(this)
						}
					})
				} else {
					if (rowIndex < displayItems.length - 1) {
						moveFocus(this, rowIndex + 1, colIndex)
					}
				}
				break
			}

			case 'F2': {
				e.preventDefault()
				const f2Column = columns[colIndex]
				const f2IsDropdown = f2Column?.editor === 'select' || f2Column?.editor === 'combobox' || f2Column?.editor === 'autocomplete'
				const f2IsCustom = f2Column?.editor === 'custom'
				tryStartEdit(this, rowIndex, colIndex)
				if (f2IsDropdown) {
					requestAnimationFrame(() => {
						if (!this.dropdownOpen) {
							openDropdownForCurrentEditor(this)
						}
					})
				} else if (f2IsCustom) {
					requestAnimationFrame(() => {
						this.openCustomEditor(rowIndex, colIndex)
					})
				}
				break
			}

			case ' ': {
				e.preventDefault()
				const col = columns[colIndex]
				const isCheckbox = col?.editor === 'checkbox'
				const isDropdown = col?.editor === 'select' || col?.editor === 'combobox' || col?.editor === 'autocomplete'
				const isDate = col?.editor === 'date'
				const isCustom = col?.editor === 'custom'

				if (isCheckbox) {
					toggleCheckboxAndMove(this, rowIndex, colIndex)
				} else if (isDropdown) {
					tryStartEdit(this, rowIndex, colIndex)
					requestAnimationFrame(() => {
						if (!this.dropdownOpen) {
							openDropdownForCurrentEditor(this)
						}
					})
				} else if (isDate) {
					// Same pattern as dropdown - start edit and open datepicker
					tryStartEdit(this, rowIndex, colIndex)
					requestAnimationFrame(() => {
						const cell = this.shadowRoot?.querySelector(
							`.wg__cell[data-row="${rowIndex}"][data-col="${colIndex}"]`
						)
						const input = cell?.querySelector('.wg__date-input') as HTMLInputElement
						const anchor = cell?.querySelector('.wg__editor--date') as HTMLElement
						if (input && anchor) this.openDatePicker(input, anchor)
					})
				} else if (isCustom) {
					// Custom editors - start edit and call callback
					tryStartEdit(this, rowIndex, colIndex)
					requestAnimationFrame(() => {
						this.openCustomEditor(rowIndex, colIndex)
					})
				}
				break
			}

			case 'Escape':
				e.preventDefault()
				if (this.grid.editingCell) {
					clearEditingVisual(this)
					this.grid.cancelEdit()
				} else if (this.grid.selectedRows.length > 0) {
					// Clear row selection first
					this.grid.clearSelection()
				} else {
					const oldFocus = this.grid.focusedCell
					this.grid.clearFocusedCell()
					updateFocusVisual(this, oldFocus, null)
					;(e.target as HTMLElement)?.blur()
				}
				break

			case 'Delete': {
				e.preventDefault()
				const column = columns[colIndex]
				const row = displayItems[rowIndex]
				if (e.ctrlKey) {
					// Ctrl+Delete: Request row deletion
					if (row) {
						const detail = { rowIndex, row }
						if (this.grid.onrowdelete) {
							this.grid.onrowdelete(detail)
						}
						this.dispatchEvent(new CustomEvent('rowdelete', { detail }))
					}
				} else {
					// Delete: Clear cell content
					if (column && this.grid.isCellEditable(column)) {
						this.grid.commitEdit(rowIndex, String(column.field), null)
						this.render()
						// Restore focus to the same cell
						requestAnimationFrame(() => {
							const cell = this.shadow.querySelector(
								`td[data-row="${rowIndex}"][data-col="${colIndex}"]`
							) as HTMLElement
							cell?.focus()
						})
					}
				}
				break
			}

			default:
				// Printable characters start editing with initial query
				if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
					const col = columns[colIndex]
					// For number columns, only allow numeric input to start editing
					if (col?.editor === 'number') {
						if (!/[\d.\-]/.test(e.key)) {
							return // Ignore non-numeric keys for number columns
						}
					}
					tryStartEdit(this, rowIndex, colIndex, { initialSearchQuery: e.key })
					e.preventDefault()
				}
				break
		}
	}

	// ==========================================================================
	// Editor Event Handlers
	// ==========================================================================

	/**
	 * Handle keydown in editor inputs
	 */
	private handleEditorKeyDown(e: KeyboardEvent, editor: HTMLElement): void {
		const rowIndex = parseInt(editor.dataset.row || '0', 10)
		const field = editor.dataset.field || ''
		const column = this.grid.columns.find(c => c.field === field)
		const editorType = column?.editor || 'text'
		const isDropdownEditor = editorType === 'select' || editorType === 'combobox' || editorType === 'autocomplete'

		// For dropdown editors with CLOSED dropdown, navigation keys cancel edit and navigate
		const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']
		if (isDropdownEditor && !this.dropdownOpen && navKeys.includes(e.key)) {
			e.preventDefault()
			e.stopPropagation()

			const colIndex = this.grid.columns.findIndex(c => c.field === field)
			const editableCols = this.grid.columns
				.map((c, i) => ({ index: i, column: c }))
				.filter(ec => ec.column.editable !== false)
			const currentEditableIdx = editableCols.findIndex(ec => ec.index === colIndex)
			const displayItems = this.grid.displayItems

			let destRow = rowIndex
			let destCol = colIndex
			let canNavigate = false

			switch (e.key) {
				case 'ArrowUp':
					if (rowIndex > 0) { destRow = rowIndex - 1; canNavigate = true }
					break
				case 'ArrowDown':
					if (rowIndex < displayItems.length - 1) { destRow = rowIndex + 1; canNavigate = true }
					break
				case 'ArrowLeft':
					if (currentEditableIdx > 0) { destCol = editableCols[currentEditableIdx - 1].index; canNavigate = true }
					break
				case 'ArrowRight':
					if (currentEditableIdx < editableCols.length - 1) { destCol = editableCols[currentEditableIdx + 1].index; canNavigate = true }
					break
				case 'PageUp':
					destRow = Math.max(0, rowIndex - 10); canNavigate = true
					break
				case 'PageDown':
					destRow = Math.min(displayItems.length - 1, rowIndex + 10); canNavigate = true
					break
				case 'Home':
					if (e.ctrlKey) { destRow = 0; destCol = 0 } else { destCol = 0 }
					canNavigate = true
					break
				case 'End':
					if (e.ctrlKey) { destRow = displayItems.length - 1; destCol = this.grid.columns.length - 1 } else { destCol = this.grid.columns.length - 1 }
					canNavigate = true
					break
			}

			if (canNavigate) {
				clearEditingVisual(this)
				this.grid.cancelEdit()
				queueMicrotask(() => {
					moveFocus(this, destRow, destCol)
				})
			}
			return
		}

		switch (e.key) {
			case 'ArrowDown':
				if (this.dropdownOpen) {
					e.preventDefault()
					e.stopPropagation()
					const optsDown = this.getCurrentEditorOptions()
					// Find next non-disabled option
					let nextIndex = this.highlightedIndex + 1
					while (nextIndex < this.dropdownOptions.length && isOptionDisabled(this.dropdownOptions[nextIndex], optsDown)) {
						nextIndex++
					}
					if (nextIndex < this.dropdownOptions.length) {
						this.highlightedIndex = nextIndex
						updateDropdownHighlight(this)
						scrollHighlightedIntoView(this)
					}
				}
				break

			case 'ArrowUp':
				if (this.dropdownOpen) {
					e.preventDefault()
					e.stopPropagation()
					const optsUp = this.getCurrentEditorOptions()
					// Find previous non-disabled option
					let prevIndex = this.highlightedIndex - 1
					while (prevIndex >= 0 && isOptionDisabled(this.dropdownOptions[prevIndex], optsUp)) {
						prevIndex--
					}
					if (prevIndex >= 0) {
						this.highlightedIndex = prevIndex
						updateDropdownHighlight(this)
						scrollHighlightedIntoView(this)
					}
				}
				break

			case 'Enter':
				// If datepicker is open, let it handle Enter (selects focused date)
				if (this.datepicker) {
					return
				}
				e.preventDefault()
				e.stopPropagation()
				if (this.dropdownOpen && this.highlightedIndex >= 0) {
					selectDropdownOption(this, this.highlightedIndex)
				} else if (isDropdownEditor && !this.dropdownOpen) {
					openDropdownForCurrentEditor(this)
				} else {
					this.isCommittingFromKeyboard = true
					removeDropdown(this)
					if (editorType === 'date' && editor instanceof HTMLInputElement) {
						this.commitDateEditor(editor)
					} else {
						commitCurrentEditor(this, editor)
					}
					moveFocusAfterCommit(this, rowIndex, field, 'down')
				}
				break

			case 'Tab':
				// If datepicker is open, let it handle Tab (selects focused date)
				if (this.datepicker) {
					return
				}
				e.preventDefault()
				e.stopPropagation()
				this.isCommittingFromKeyboard = true
				// For dropdowns with a highlighted option, select it before moving
				if (this.dropdownOpen && this.highlightedIndex >= 0 && isDropdownEditor) {
					// Select the highlighted option - this commits the value (skip if disabled)
					const option = this.dropdownOptions[this.highlightedIndex]
					const opts = this.getCurrentEditorOptions()
					if (option && !isOptionDisabled(option, opts)) {
						const value = getOptionValue(option, opts)
						this.grid.commitEdit(rowIndex, field, value)
					}
					removeDropdown(this)
				} else {
					removeDropdown(this)
					if (editorType === 'date' && editor instanceof HTMLInputElement) {
						this.commitDateEditor(editor)
					} else if (!isDropdownEditor) {
						// Only commit for non-dropdown editors (text, number, etc.)
						commitCurrentEditor(this, editor)
					}
					// For select editors without dropdown open, keep current value
				}
				moveFocusAfterCommit(this, rowIndex, field, e.shiftKey ? 'prev' : 'next')
				break

			case 'Escape':
				e.preventDefault()
				e.stopPropagation()
				if (this.dropdownOpen) {
					removeDropdown(this)
				}
				// Close datepicker if open
				if (this.datepicker) {
					this.datepicker.close(true)
					this.datepicker = null
				}
				this.isCommittingFromKeyboard = true
				clearEditingVisual(this)
				this.grid.cancelEdit()
				focusCellAfterCancel(this, rowIndex, field)
				break

			case 'F2':
				e.preventDefault()
				e.stopPropagation()
				if (isDropdownEditor && !this.dropdownOpen) {
					openDropdownForCurrentEditor(this)
				}
				break

			case 'Backspace':
				if (editorType === 'select') {
					e.preventDefault()
					e.stopPropagation()
					if (this.filterText.length > 0) {
						this.filterText = this.filterText.slice(0, -1)
						updateSelectFilter(this, column!.editorOptions || {})
					}
				}
				break

			default:
				if (editorType === 'select' && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
					e.preventDefault()
					e.stopPropagation()
					this.filterText += e.key
					updateSelectFilter(this, column!.editorOptions || {})
				}
				break
		}
	}

	// ==========================================================================
	// Event Listener Attachment
	// ==========================================================================

	private attachEventListeners(): void {
		const table = this.shadow.querySelector('.wg__table')
		if (!table) return

		// Focus events
		table.addEventListener('focus', (e: Event) => {
			const target = e.target as HTMLElement
			if (target.matches('.wg__cell')) {
				const rowIndex = parseInt(target.dataset.row || '0', 10)
				const colIndex = parseInt(target.dataset.col || '0', 10)
				handleCellFocus(this, rowIndex, colIndex)
				updateFillHandle(this)
			}
			if (target.matches('.wg__select-trigger, .wg__combobox-input, .wg__autocomplete-input')) {
				if (!this.justSelected && !this.dropdownOpen) {
					const field = target.dataset.field || ''
					const column = this.grid.columns.find(c => c.field === field)
					const opts = column?.editorOptions || {}
					const hasInitialQuery = this.grid.editingCell?.initialSearchQuery !== undefined
					if (hasInitialQuery || (opts as { showOnFocus?: boolean }).showOnFocus !== false) {
						openDropdownForCurrentEditor(this)
					}
				}
			}
		}, true)

		// Keydown events
		table.addEventListener('keydown', (e: Event) => {
			const target = e.target as HTMLElement
			if (target.matches('.wg__editor, .wg__combobox-input, .wg__autocomplete-input, .wg__date-input')) {
				this.handleEditorKeyDown(e as KeyboardEvent, target)
				return
			}
			if (target.matches('.wg__cell')) {
				const rowIndex = parseInt(target.dataset.row || '0', 10)
				const colIndex = parseInt(target.dataset.col || '0', 10)
				this.handleCellKeyDown(e as KeyboardEvent, rowIndex, colIndex)
			}
		})

		// Focus out
		table.addEventListener('focusout', (e: Event) => {
			handleTableFocusOut(this, e as FocusEvent)
		})

		// Double-click to edit
		table.addEventListener('dblclick', (e: Event) => {
			e.preventDefault()
			const target = e.target as HTMLElement
			const cell = target.closest('.wg__cell') as HTMLElement
			if (cell) {
				const rowIndex = parseInt(cell.dataset.row || '0', 10)
				const colIndex = parseInt(cell.dataset.col || '0', 10)
				const column = this.grid.columns[colIndex]
				if (column) {
					const trigger = column.editTrigger || this.grid.editTrigger
					if (trigger === 'dblclick' || trigger === 'navigate') {
						const cursorPos = getCursorPositionFromClick(e as MouseEvent, cell)
						tryStartEdit(this, rowIndex, colIndex, { cursorPosition: cursorPos ?? undefined })
						const editor = column.editor
						if (editor === 'select' || editor === 'combobox' || editor === 'autocomplete') {
							requestAnimationFrame(() => {
								if (!this.dropdownOpen) {
									openDropdownForCurrentEditor(this)
								}
							})
						} else if (editor === 'custom') {
							requestAnimationFrame(() => {
								this.openCustomEditor(rowIndex, colIndex)
							})
						}
					}
				}
			}
		})

		// Single click to edit (for editTrigger = 'click')
		table.addEventListener('click', (e: Event) => {
			const target = e.target as HTMLElement
			const cell = target.closest('.wg__cell') as HTMLElement
			if (cell && !cell.classList.contains('wg__cell--editing')) {
				const rowIndex = parseInt(cell.dataset.row || '0', 10)
				const colIndex = parseInt(cell.dataset.col || '0', 10)
				const column = this.grid.columns[colIndex]
				if (column) {
					const trigger = column.editTrigger || this.grid.editTrigger
					if (trigger === 'click') {
						e.preventDefault()
						const cursorPos = getCursorPositionFromClick(e as MouseEvent, cell)
						tryStartEdit(this, rowIndex, colIndex, { cursorPosition: cursorPos ?? undefined })
						const editor = column.editor
						if (editor === 'select' || editor === 'combobox' || editor === 'autocomplete') {
							requestAnimationFrame(() => {
								if (!this.dropdownOpen) {
									openDropdownForCurrentEditor(this)
								}
							})
						} else if (editor === 'custom') {
							requestAnimationFrame(() => {
								this.openCustomEditor(rowIndex, colIndex)
							})
						}
					}
				}
			}
		})

		// Mousedown - toggle dropdown, handle cell transitions
		table.addEventListener('mousedown', (e: Event) => {
			const target = e.target as HTMLElement

			// Date trigger button - handle in mousedown since SVG clicks don't bubble well
			const dateTrigger = target.closest('.wg__date-trigger')
			if (dateTrigger) {
				e.preventDefault()
				e.stopPropagation()

				const displayContainer = target.closest('.wg__cell-date-display') as HTMLElement
				const editorContainer = target.closest('.wg__editor--date') as HTMLElement

				if (editorContainer) {
					// Already editing - just open datepicker
					const input = editorContainer.querySelector('.wg__date-input') as HTMLInputElement
					if (input) this.openDatePicker(input, editorContainer)
				} else if (displayContainer) {
					// In read mode - start editing and open datepicker
					const rowIndex = parseInt(displayContainer.dataset.row || '0', 10)
					const field = displayContainer.dataset.field || ''
					const colIndex = this.grid.columns.findIndex(c => String(c.field) === field)
					if (colIndex >= 0) {
						this.isTransitioningCells = true
						if (this.grid.editingCell) {
							// Save old cell info BEFORE cancelEdit clears it
							const oldEditingCell = this.grid.editingCell
							const oldColIndex = this.grid.columns.findIndex(c => String(c.field) === oldEditingCell.field)

							removeDropdown(this)
							clearEditingVisual(this)
							this.grid.cancelEdit()

							// Re-render old cell to remove editor HTML
							if (oldColIndex >= 0) {
								renderCell(this, oldEditingCell.rowIndex, oldColIndex)
							}
						}
						tryStartEdit(this, rowIndex, colIndex)
						requestAnimationFrame(() => {
							this.isTransitioningCells = false
							// Find the newly rendered date input and open picker
							const cell = this.shadowRoot?.querySelector(
								`.wg__cell[data-row="${rowIndex}"][data-field="${field}"]`
							)
							const input = cell?.querySelector('.wg__date-input') as HTMLInputElement
							const anchor = cell?.querySelector('.wg__editor--date') as HTMLElement
							if (input && anchor) this.openDatePicker(input, anchor)
						})
					}
				}
				return
			}

			// Handle click on any cell when dropdown is open
			if (this.dropdownOpen || this.grid.editingCell) {
				const cell = target.closest('.wg__cell') as HTMLElement
				if (cell && !target.closest('.wg__editor--select, .wg__editor--combobox, .wg__editor--autocomplete, .wg__editor--date')) {
					const rowIndex = parseInt(cell.dataset.row || '0', 10)
					const colIndex = parseInt(cell.dataset.col || '0', 10)
					const editingCell = this.grid.editingCell
					const isClickingToggle = target.matches('.wg__combobox-toggle, .wg__select-toggle, .wg__date-trigger')
					if (editingCell && !isClickingToggle) {
						const editingColIndex = this.grid.columns.findIndex(c => String(c.field) === editingCell.field)
						if (rowIndex !== editingCell.rowIndex || colIndex !== editingColIndex) {
							e.preventDefault()
							this.isTransitioningCells = true
							// Save old editing cell info
							const oldRowIndex = editingCell.rowIndex
							const oldColIndex = editingColIndex
							removeDropdown(this)
							clearEditingVisual(this)
							this.grid.cancelEdit()
							// Re-render old cell AFTER cancelEdit so it renders in display mode
							if (oldColIndex >= 0) {
								renderCell(this, oldRowIndex, oldColIndex)
							}
							const newColumn = this.grid.columns[colIndex]
							const trigger = newColumn?.editTrigger || this.grid.editTrigger
							// Capture click position for cursor placement
							const mouseEvent = e as MouseEvent
							const clickX = mouseEvent.clientX
							requestAnimationFrame(() => {
								this.isTransitioningCells = false
								if (trigger === 'click' && newColumn && this.grid.isCellEditable(newColumn)) {
									// For click trigger, immediately start editing the new cell
									// Find the new cell and calculate cursor position
									const newCell = this.shadow.querySelector(
										`td[data-row="${rowIndex}"][data-col="${colIndex}"]`
									) as HTMLElement
									const cursorPos = newCell ? getCursorPositionFromClick({ clientX: clickX } as MouseEvent, newCell) : undefined
									tryStartEdit(this, rowIndex, colIndex, { cursorPosition: cursorPos ?? undefined })
								} else {
									moveFocus(this, rowIndex, colIndex)
								}
							})
							return
						}
					}
				}
			}

			// Toggle click
			if (target.matches('.wg__combobox-toggle, .wg__select-toggle')) {
				e.preventDefault()
				e.stopPropagation()

				const displayContainer = target.closest('.wg__cell-dropdown-display') as HTMLElement
				const editorContainer = target.closest('.wg__editor--select, .wg__editor--combobox, .wg__editor--autocomplete') as HTMLElement

				if (editorContainer) {
					toggleDropdown(this)
				} else if (displayContainer) {
					const rowIndex = parseInt(displayContainer.dataset.row || '0', 10)
					const field = displayContainer.dataset.field || ''
					const colIndex = this.grid.columns.findIndex(c => String(c.field) === field)
					if (colIndex >= 0) {
						this.isTransitioningCells = true
						// Save old editing cell info before clearing
						const oldEditingCell = this.grid.editingCell
						const oldColIndex = oldEditingCell
							? this.grid.columns.findIndex(c => String(c.field) === oldEditingCell.field)
							: -1
						if (oldEditingCell) {
							removeDropdown(this)
							clearEditingVisual(this)
							this.grid.cancelEdit()
							// Re-render old cell AFTER cancelEdit so it renders in display mode
							if (oldColIndex >= 0) {
								renderCell(this, oldEditingCell.rowIndex, oldColIndex)
							}
						}
						tryStartEdit(this, rowIndex, colIndex)
						requestAnimationFrame(() => {
							this.isTransitioningCells = false
							if (!this.dropdownOpen) {
								openDropdownForCurrentEditor(this)
							}
						})
					}
				}
			}

			// Display mode dropdown click
			if (target.matches('.wg__cell-dropdown-display')) {
				e.preventDefault()
				e.stopPropagation()
				const displayContainer = target.closest('.wg__cell-dropdown-display') as HTMLElement
				if (displayContainer) {
					const rowIndex = parseInt(displayContainer.dataset.row || '0', 10)
					const field = displayContainer.dataset.field || ''
					const colIndex = this.grid.columns.findIndex(c => String(c.field) === field)
					if (colIndex >= 0) {
						this.isTransitioningCells = true
						// Save old editing cell info before clearing
						const oldEditingCell = this.grid.editingCell
						const oldColIndex = oldEditingCell
							? this.grid.columns.findIndex(c => String(c.field) === oldEditingCell.field)
							: -1
						if (oldEditingCell) {
							removeDropdown(this)
							clearEditingVisual(this)
							this.grid.cancelEdit()
							// Re-render old cell AFTER cancelEdit so it renders in display mode
							if (oldColIndex >= 0) {
								renderCell(this, oldEditingCell.rowIndex, oldColIndex)
							}
						}
						tryStartEdit(this, rowIndex, colIndex)
						requestAnimationFrame(() => {
							this.isTransitioningCells = false
							if (!this.dropdownOpen) {
								openDropdownForCurrentEditor(this)
							}
						})
					}
				}
			}
		})

		// Click events
		table.addEventListener('click', (e: Event) => {
			const target = e.target as HTMLElement

			if (target.matches('.wg__select-trigger, .wg__select-value')) {
				e.preventDefault()
				e.stopPropagation()
				toggleDropdown(this)
			}
		})

		// Column resize handle mousedown
		table.addEventListener('mousedown', (e: Event) => {
			const target = e.target as HTMLElement

			// Resize handle takes priority
			const resizeHandle = target.closest('.wg__resize-handle') as HTMLElement
			if (resizeHandle) {
				e.preventDefault()
				e.stopPropagation()
				const field = resizeHandle.dataset.field
				if (field) {
					handleResizeStart(this, e as MouseEvent, field)
				}
				return
			}

			// Column reorder: start drag when clicking on a non-frozen header (if enabled)
			if (this.grid.allowColumnReorder) {
				const header = target.closest('.wg__header') as HTMLElement
				if (header && !header.classList.contains('wg__header--frozen') && !header.classList.contains('wg__row-number-header')) {
					const field = header.dataset.field
					if (field) {
						handleReorderStart(this, e as MouseEvent, field)
					}
				}
			}

			// Row selection: handle mousedown on row number cells
			const rowNumberCell = target.closest('.wg__row-number[data-row-number]') as HTMLElement
			if (rowNumberCell) {
				const rowIndex = parseInt(rowNumberCell.dataset.rowNumber || '-1', 10)
				if (rowIndex >= 0) {
					handleRowNumberMouseDown(this, rowIndex, e as MouseEvent)
				}
			}
		})

		// Header click for sorting
		table.addEventListener('click', (e: Event) => {
			const mouseEvent = e as MouseEvent
			const target = mouseEvent.target as HTMLElement
			// Skip if clicking on resize handle
			if (target.closest('.wg__resize-handle')) return
			// Skip if reordering was just performed (prevents sort on drop)
			if (isReordering()) return
			const header = target.closest('.wg__header--sortable') as HTMLElement
			if (header) {
				handleSortClick(this, mouseEvent)
				this.render()
			}
		})

		// Context menu (right-click)
		table.addEventListener('contextmenu', (e: Event) => {
			this.handleContextMenu(e as MouseEvent)
		})

		// Change events (checkbox)
		table.addEventListener('change', (e: Event) => {
			const target = e.target as HTMLElement
			if (target.matches('.wg__editor--checkbox')) {
				handleCheckboxChange(this, target as HTMLInputElement)
			}
		})

		// Input events (combobox/autocomplete)
		table.addEventListener('input', (e: Event) => {
			const target = e.target as HTMLElement
			if (target.matches('.wg__combobox-input')) {
				handleComboboxInput(this, e)
			} else if (target.matches('.wg__autocomplete-input')) {
				handleAutocompleteInput(this, e)
			}
		})

		// Blur events (use capture: blur doesn't bubble)
		table.addEventListener('blur', (e: Event) => {
			const target = e.target as HTMLElement
			if (target.matches('.wg__editor--text, .wg__editor--number')) {
				handleEditorBlur(this, target as HTMLInputElement)
			}
			// Date input blur - commit if datepicker is not open
			if (target.matches('.wg__date-input')) {
				if (!this.datepicker && !this.isCommittingFromKeyboard && !this.isTransitioningCells) {
					this.commitDateEditor(target as HTMLInputElement)
				}
			}
			if (target.matches('.wg__select-trigger')) {
				if (!this.isCommittingFromKeyboard && !this.isTransitioningCells && !this.dropdownOpen && !this.isOpeningDropdown) {
					removeDropdown(this)
					clearEditingVisual(this)
					this.grid.cancelEdit()
				}
			}
			if (target.matches('.wg__combobox-input, .wg__autocomplete-input')) {
				if (this.isCommittingFromKeyboard || this.isTransitioningCells) {
					return
				}
				removeDropdown(this)
				if (this.grid.editingCell) {
					const input = target as HTMLInputElement
					const column = this.getCurrentEditingColumn()
					if (column) {
						const opts = column.editorOptions || {}
						const allOptions = opts.options || opts.initialOptions || []
						const matchedOpt = allOptions.find(opt =>
							getOptionLabel(opt, opts).toLowerCase() === input.value.toLowerCase()
						)
						if (matchedOpt) {
							this.grid.commitEdit(this.grid.editingCell.rowIndex, this.grid.editingCell.field, getOptionValue(matchedOpt, opts))
						} else {
							this.grid.commitEdit(this.grid.editingCell.rowIndex, this.grid.editingCell.field, input.value)
						}
					}
				}
			}
		}, true)

		// Scroll events - close dropdown + virtual scroll + infinite scroll + connector update
		const container = this.shadow.querySelector('.wg') as HTMLElement
		if (container) {
			// Make container focusable for keyboard events when rows are selected
			container.setAttribute('tabindex', '-1')

			// Range shortcuts - handle keyboard shortcuts for selected rows
			container.addEventListener('keydown', (e: KeyboardEvent) => {
				const selectedRowIndices = this.grid.selectedRows
				if (selectedRowIndices.length === 0) return

				// Skip if focus is in an input
				const target = e.target as HTMLElement
				if (target.matches('input, textarea, select, [contenteditable="true"]')) {
					return
				}

				// Handle Escape to clear selection
				if (e.key === 'Escape') {
					e.preventDefault()
					this.grid.clearSelection()
					return
				}

				// Check range shortcuts
				const rangeShortcuts = this.grid.rangeShortcuts
				if (!rangeShortcuts?.length) return

				for (const shortcut of rangeShortcuts) {
					const combo = parseKeyCombo(shortcut.key)
					if (matchesKeyCombo(e, combo)) {
						const ctx: RangeShortcutContext<T> = {
							rows: this.grid.getSelectedRowsData(),
							rowIndices: selectedRowIndices
						}

						const isDisabled = typeof shortcut.disabled === 'function'
							? shortcut.disabled(ctx)
							: shortcut.disabled === true

						if (!isDisabled) {
							e.preventDefault()
							shortcut.action(ctx)
							return
						}
					}
				}
			})

			container.addEventListener('scroll', () => {
				// Toggle horizontal scroll indicator for frozen column shadow
				const isScrolledHorizontally = container.scrollLeft > 0
				container.classList.toggle('wg--scrolled-horizontal', isScrolledHorizontally)

				// Close dropdown on scroll
				if (this.dropdownOpen && !this.isTransitioningCells && !this.isOpeningDropdown) {
					// Save editing cell info BEFORE cancelEdit clears it
					const oldEditingCell = this.grid.editingCell
					const oldColIndex = oldEditingCell
						? this.grid.columns.findIndex(c => String(c.field) === oldEditingCell.field)
						: -1

					removeDropdown(this)
					clearEditingVisual(this)
					this.grid.cancelEdit()

					// Re-render old cell to remove editor HTML (toggle, etc.)
					if (oldEditingCell && oldColIndex >= 0) {
						renderCell(this, oldEditingCell.rowIndex, oldColIndex)
					}
				}

				// Virtual scroll: recalculate visible range
				if (this.grid.shouldUseVirtualScroll()) {
					this.handleVirtualScroll(container)
				}

				// Infinite scroll: detect when near bottom
				if (this.grid.infiniteScroll && this.grid.hasMoreItems && !this.isLoadingMoreItems) {
					this.handleInfiniteScroll(container)
				}

				// Update connector position when scrolling (clips at container boundary)
				if (getActiveToolbarRowIndex() !== null) {
					updateConnector(this, this.grid.displayItems)
					this.renderConnector()
				}

				// Update fill handle position on scroll
				updateFillHandle(this)
			})
		}

		if (!this.wheelListenerAdded) {
			this.wheelListenerAdded = true
			window.addEventListener('scroll', () => {
				if (this.dropdownOpen && !this.isTransitioningCells) {
					// Save editing cell info BEFORE cancelEdit clears it
					const oldEditingCell = this.grid.editingCell
					const oldColIndex = oldEditingCell
						? this.grid.columns.findIndex(c => String(c.field) === oldEditingCell.field)
						: -1

					removeDropdown(this)
					clearEditingVisual(this)
					this.grid.cancelEdit()

					// Re-render old cell to remove editor HTML (toggle, etc.)
					if (oldEditingCell && oldColIndex >= 0) {
						renderCell(this, oldEditingCell.rowIndex, oldColIndex)
					}
				}
			}, { passive: true, capture: true })
		}

		// Tooltip events
		table.addEventListener('mouseenter', (e: Event) => {
			const target = e.target as HTMLElement
			// Check for HTML tooltip first, then plain text
			const htmlTooltipElement = target.closest('[data-tooltip-html]') as HTMLElement
			if (htmlTooltipElement) {
				const tooltipHtml = htmlTooltipElement.getAttribute('data-tooltip-html')!
				showTooltip(this, htmlTooltipElement, tooltipHtml, this._tooltipShowDelay, true)
				return
			}
			const tooltipElement = target.closest('[data-tooltip]') as HTMLElement
			if (tooltipElement) {
				const tooltipText = tooltipElement.getAttribute('data-tooltip')!
				showTooltip(this, tooltipElement, tooltipText, this._tooltipShowDelay, false)
			}
		}, true)

		table.addEventListener('mouseleave', (e: Event) => {
			const mouseEvent = e as MouseEvent
			const target = mouseEvent.target as HTMLElement
			const relatedTarget = mouseEvent.relatedTarget as HTMLElement | null
			const tooltipEl = target.closest('[data-tooltip], [data-tooltip-html]') as HTMLElement

			if (tooltipEl && relatedTarget?.closest('[data-tooltip], [data-tooltip-html]') === tooltipEl) {
				return
			}

			if (tooltipEl) {
				hideTooltip(this, this._tooltipHideDelay)
			}
		}, true)

		// =========================================================================
		// Row Toolbar Events
		// =========================================================================

		// Toolbar trigger button click (button mode)
		table.addEventListener('click', (e: Event) => {
			const target = e.target as HTMLElement
			const triggerBtn = target.closest('.wg__toolbar-trigger') as HTMLElement
			if (triggerBtn && this.grid.toolbarTrigger === 'button') {
				e.preventDefault()
				e.stopPropagation()
				const rowIndex = parseInt(triggerBtn.dataset.toolbarTrigger || '0', 10)
				const rowElement = table.querySelector(`tr[data-row-index="${rowIndex}"]`) as HTMLElement
				if (rowElement) {
					// Toggle toolbar for this row
					if (isToolbarOpenForRow(rowIndex)) {
						this.closeToolbarAndReset()
						// No render() needed - closeToolbar() surgically removes toolbar
					} else {
						this.showToolbarForRow(rowElement, rowIndex)
					}
				}
			}
		})

		// Inline action button click (inline mode - toolbarPosition="inline")
		table.addEventListener('click', (e: Event) => {
			if (this.grid.toolbarPosition !== 'inline') return

			const target = e.target as HTMLElement
			const btn = target.closest('.wg__inline-action-btn') as HTMLButtonElement
			if (btn && !btn.disabled) {
				e.preventDefault()
				e.stopPropagation()
				const actionId = btn.dataset.actionId
				const rowIndex = parseInt(btn.dataset.row || '0', 10)
				this.handleInlineActionClick(actionId, rowIndex)
			}
		})

		// Row hover - track hovered row and handle toolbar/inline shortcuts
		table.addEventListener('mouseenter', (e: Event) => {
			const mouseEvent = e as MouseEvent
			const target = mouseEvent.target as HTMLElement
			const row = target.closest('.wg__row') as HTMLElement
			if (row) {
				const rowIndex = parseInt(row.dataset.rowIndex || '0', 10)
				this.grid.setHoveredRow(rowIndex)

				// For inline mode, setup shortcuts
				if (this.grid.toolbarPosition === 'inline') {
					this.setupInlineShortcuts()
				}

				// For floating toolbar (hover trigger)
				if (this.grid.toolbarTrigger === 'hover' && this.grid.toolbarPosition !== 'inline') {
					// Cancel any pending hide timeout when entering a row
					if (this.toolbarHideTimeout) {
						clearTimeout(this.toolbarHideTimeout)
						this.toolbarHideTimeout = null
					}
					if (!isToolbarOpenForRow(rowIndex)) {
						this.showToolbarForRow(row, rowIndex, mouseEvent.clientX)
					}
				}
			}
		}, true)

		// Row mouseleave - handle toolbar hide and inline shortcuts cleanup
		table.addEventListener('mouseleave', (e: Event) => {
			const mouseEvent = e as MouseEvent
			const target = mouseEvent.target as HTMLElement
			const row = target.closest('.wg__row') as HTMLElement

			if (row) {
				// For inline mode, clear hovered row and shortcuts after short delay
				if (this.grid.toolbarPosition === 'inline') {
					setTimeout(() => {
						if (!table.matches(':hover')) {
							this.grid.setHoveredRow(null)
							this.removeInlineShortcuts()
						}
					}, 50)
				}

				// For floating toolbar (hover trigger)
				if (this.grid.toolbarTrigger === 'hover' && this.grid.toolbarPosition !== 'inline') {
					// Don't close during move actions (connector tracking)
					if (this.toolbarMoveInProgress) return

					// Start hide timeout (shared with toolbar mouseleave)
					if (this.toolbarHideTimeout) {
						clearTimeout(this.toolbarHideTimeout)
					}
					this.toolbarHideTimeout = setTimeout(() => {
						const toolbarContainer = this.shadow.querySelector('.wg__toolbar-container')
						const isHoveringToolbar = toolbarContainer?.matches(':hover')
						const isHoveringTable = table.matches(':hover')

						if (!isHoveringToolbar && !isHoveringTable) {
							this.grid.setHoveredRow(null)
							this.closeToolbarAndReset()
							// No render() needed - closeToolbar() already removes toolbar from DOM
						}
					}, 150)
				}
			}
		}, true)

		// Row click (click mode)
		table.addEventListener('click', (e: Event) => {
			if (this.grid.toolbarTrigger !== 'click') return

			const mouseEvent = e as MouseEvent
			const target = mouseEvent.target as HTMLElement
			const row = target.closest('.wg__row') as HTMLElement
			if (row && !target.closest('.wg__cell--editing')) {
				const rowIndex = parseInt(row.dataset.rowIndex || '0', 10)
				// Toggle toolbar
				if (isToolbarOpenForRow(rowIndex)) {
					this.closeToolbarAndReset()
					// No render() needed - closeToolbar() surgically removes toolbar
				} else {
					this.showToolbarForRow(row, rowIndex, mouseEvent.clientX)
				}
			}
		})

		// Close toolbar on outside click
		if (!this.toolbarOutsideClickAdded) {
			this.toolbarOutsideClickAdded = true
			document.addEventListener('click', (e: MouseEvent) => {
				// Only handle if this grid owns the active toolbar
				if (!isToolbarOwnedBy(this.shadow)) {
					return
				}

				const composedPath = e.composedPath()
				const isInToolbar = composedPath.some(el => (el as HTMLElement).classList?.contains('wg__toolbar-container'))
				const isInTrigger = composedPath.some(el => (el as HTMLElement).classList?.contains('wg__toolbar-trigger'))

				if (isInToolbar || isInTrigger) {
					return
				}
				// Don't close if clicking inside grid (hover/click mode handles that)
				const isInGrid = composedPath.includes(this)
				if (isInGrid && (this.grid.toolbarTrigger === 'hover' || this.grid.toolbarTrigger === 'click')) {
					return
				}
				// Close toolbar if clicking outside
				if (getActiveToolbarRowIndex() !== null) {
					this.closeToolbarAndReset()
					// No render() needed - closeToolbar() surgically removes toolbar
				}
			})
		}

		// Close toolbar on any scroll (window or container)
		if (!this.toolbarScrollListenerAdded) {
			this.toolbarScrollListenerAdded = true
			window.addEventListener('scroll', () => {
				if (getActiveToolbarRowIndex() !== null) {
					this.closeToolbarAndReset()
					// No render() needed - closeToolbar() surgically removes toolbar
				}
			}, true)  // Use capture to catch all scroll events
		}

		// =========================================================================
		// Pagination Events (handles multiple pagination elements)
		// =========================================================================
		const paginations = this.shadow.querySelectorAll('.wg__pagination')
		paginations.forEach(pagination => {
			// Page navigation buttons
			pagination.addEventListener('click', (e: Event) => {
				if (handlePaginationClick(this, e)) {
					this.render()
				}
			})

			// Page size selector
			const pageSizeSelect = pagination.querySelector('.wg__pagination-select') as HTMLSelectElement
			if (pageSizeSelect) {
				pageSizeSelect.addEventListener('change', () => {
					if (handlePageSizeChange(this, pageSizeSelect)) {
						this.render()
					}
				})
			}
		})
	}

	// ==========================================================================
	// Virtual Scroll & Infinite Scroll
	// ==========================================================================

	/**
	 * Scroll to a row position programmatically (keyboard navigation).
	 * Pre-renders the target row range ONCE, then scrolls. Flag prevents
	 * the scroll event from redundantly calling handleVirtualScroll.
	 */
	private scrollToRowProgrammatically(targetRow: number): void {
		const container = this.shadow.querySelector('.wg') as HTMLElement
		if (!container) return

		const { scrollTop, startIndex, endIndex } = calculateScrollToRow({
			targetRow,
			rowHeight: this.grid.virtualScrollRowHeight,
			buffer: this.grid.virtualScrollBuffer,
			totalItems: this.grid.displayItems.length,
			viewportHeight: container.clientHeight,
			scrollHeight: container.scrollHeight,
			clientHeight: container.clientHeight
		})

		// Update range and render ONCE (before scroll)
		if (startIndex !== this.virtualScrollStart || endIndex !== this.virtualScrollEnd) {
			this.virtualScrollStart = startIndex
			this.virtualScrollEnd = endIndex
			this.renderVirtualRows(container)
		}

		// Now scroll - flag prevents handleVirtualScroll from re-rendering
		this.isProgrammaticScroll = true
		container.scrollTop = scrollTop
		queueMicrotask(() => { this.isProgrammaticScroll = false })
	}

	/**
	 * Handle virtual scroll - recalculate visible range and re-render if changed
	 */
	private handleVirtualScroll(container: HTMLElement): void {
		// Skip during programmatic scroll (keyboard nav already handles row visibility)
		if (this.isProgrammaticScroll) return

		const { startIndex, endIndex } = calculateVisibleRange({
			scrollTop: container.scrollTop,
			viewportHeight: container.clientHeight,
			rowHeight: this.grid.virtualScrollRowHeight,
			buffer: this.grid.virtualScrollBuffer,
			totalItems: this.grid.displayItems.length,
			editingRowIndex: this.grid.editingCell?.rowIndex
		})

		// Only re-render if range changed
		if (startIndex !== this.virtualScrollStart || endIndex !== this.virtualScrollEnd) {
			this.virtualScrollStart = startIndex
			this.virtualScrollEnd = endIndex
			this.renderVirtualRows(container)
		}
	}

	/**
	 * Render only the tbody with virtual rows (fast update, no full re-render)
	 * After re-render, re-focus the focusedCell to maintain keyboard navigation
	 */
	private renderVirtualRows(container: HTMLElement): void {
		const tbody = container.querySelector('tbody')
		if (!tbody) return

		const items = this.grid.displayItems
		const params: VirtualScrollParams = {
			startIndex: this.virtualScrollStart,
			endIndex: this.virtualScrollEnd,
			rowHeight: this.grid.virtualScrollRowHeight,
			totalItems: items.length
		}

		// Save focusedCell BEFORE innerHTML - the blur from destroyed cell will clear it
		const focusedCell = this.grid.focusedCell

		tbody.innerHTML = renderDataRowsVirtual(this, params)

		// Re-focus the focusedCell after re-render (if it's in the rendered range)
		// Use the saved value since blur event may have cleared it
		if (focusedCell) {
			// Restore focusedCell state (blur may have cleared it)
			this.grid.setFocusedCell(focusedCell.rowIndex, focusedCell.colIndex)

			const cell = tbody.querySelector(
				`td[data-row="${focusedCell.rowIndex}"][data-col="${focusedCell.colIndex}"]`
			) as HTMLElement | null
			if (cell) {
				cell.focus({ preventScroll: true })
				updateFocusVisual(this, null, focusedCell)
			}
		}
	}

	/**
	 * Handle infinite scroll - trigger load more when near bottom
	 */
	private handleInfiniteScroll(container: HTMLElement): void {
		const shouldLoad = shouldTriggerInfiniteScroll(
			container.scrollTop,
			container.scrollHeight,
			container.clientHeight,
			this.grid.infiniteScrollThreshold
		)

		if (shouldLoad) {
			this.isLoadingMoreItems = true

			// Fire data request with loadMore trigger
			this.grid.fireDataRequest('loadMore')

			// The consumer is responsible for:
			// 1. Fetching more data
			// 2. Appending to items array
			// 3. Setting hasMoreItems = false when done
			// 4. After items update, isLoadingMoreItems will reset on next scroll
		}
	}

	// ==========================================================================
	// Rendering
	// ==========================================================================

	/**
	 * Render the shortcuts help icon and overlay
	 */
	private renderShortcutsHelpIcon(): string {
		if (!this.grid.showShortcutsHelp || !this.grid.rowShortcuts?.length) {
			return ''
		}

		const position = this.grid.shortcutsHelpPosition
		const positionClass = position === 'top-left' ? 'wg__shortcuts-help--left' : ''

		// Build shortcuts list HTML
		const shortcutsHtml = this.grid.rowShortcuts.map(shortcut => {
			const formattedKey = formatKeyCombo(shortcut.key)
			return `<div class="wg__shortcuts-help-item">
				<span class="wg__shortcuts-help-key">${formattedKey}</span>
				<span class="wg__shortcuts-help-label">${shortcut.label}</span>
			</div>`
		}).join('')

		// Get custom content if callback is provided
		const customContent = this.grid.shortcutsHelpContentCallback?.() || ''

		return `
			<div class="wg__shortcuts-help ${positionClass}">
				<button class="wg__shortcuts-help-icon" type="button" title="${this.grid.labels.keyboardShortcuts}">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<path d="M12 16v-4"></path>
						<path d="M12 8h.01"></path>
					</svg>
				</button>
				<div class="wg__shortcuts-help-overlay">
					${customContent ? `<div class="wg__shortcuts-help-custom">${customContent}</div>` : ''}
					<div class="wg__shortcuts-help-title">${this.grid.labels.keyboardShortcuts}</div>
					<div class="wg__shortcuts-help-list">
						${shortcutsHtml}
					</div>
				</div>
			</div>
		`
	}

	private render(): void {
		// Preserve scroll position before re-render
		const oldContainer = this.shadow.querySelector('.wg') as HTMLElement
		const scrollTop = oldContainer?.scrollTop || 0
		const scrollLeft = oldContainer?.scrollLeft || 0

		// Preserve focused cell position (for restoring after re-render)
		const focusedCell = this.grid.focusedCell

		// Remove old content (except the style element)
		if (oldContainer) {
			oldContainer.remove()
		}

		// Create the container
		const container = document.createElement('div')
		container.className = getContainerClasses(this)

		// Parse pagination positions (e.g., "bottom-center" or "top-right|bottom-right")
		const paginationPositions = this.grid.paginationPosition.split('|').map(p => p.trim())

		// Parse summary positions (if set)
		const summaryPositions = this.grid.summaryPosition
			? this.grid.summaryPosition.split('|').map(p => p.trim())
			: []

		// Helper to render content for a position area (top or bottom)
		const renderPositionArea = (positions: string[], isTop: boolean) => {
			// Get all positions for this area
			const areaPaginationPositions = paginationPositions.filter(p =>
				isTop ? p.startsWith('top-') : p.startsWith('bottom-')
			)
			const areaSummaryPositions = summaryPositions.filter(p =>
				isTop ? p.startsWith('top-') : p.startsWith('bottom-')
			)

			const areaHasPagination = areaPaginationPositions.length > 0
			const areaHasSummary = areaSummaryPositions.length > 0

			if (!areaHasPagination && !areaHasSummary) return ''

			// If both exist in this area and summaryInline is true, combine into single footer
			if (areaHasSummary && areaHasPagination && this.grid.summaryInline) {
				const topClass = isTop ? ' wg__footer--top' : ''
				return `<div class="wg__footer${topClass}">
					${renderSummary(this, areaSummaryPositions[0])}
					${renderPagination(this, areaPaginationPositions[0])}
				</div>`
			}

			// Otherwise render each position separately
			const allPositions = [...new Set([...areaPaginationPositions, ...areaSummaryPositions])]
			return allPositions.map(pos => {
				const hasPagination = areaPaginationPositions.includes(pos)
				const hasSummary = areaSummaryPositions.includes(pos)

				if (hasSummary && hasPagination) {
					// Both at exact same position: wrap in footer
					const topClass = isTop ? ' wg__footer--top' : ''
					return `<div class="wg__footer${topClass}">
						${renderSummary(this, pos)}
						${renderPagination(this, pos)}
					</div>`
				} else if (hasSummary) {
					return renderSummary(this, pos)
				} else {
					return renderPagination(this, pos)
				}
			}).join('')
		}

		// Render top and bottom areas
		const topContent = renderPositionArea(paginationPositions, true)
		const bottomContent = renderPositionArea(paginationPositions, false)

		// Determine if we should use virtual scrolling
		const useVirtualScroll = this.grid.shouldUseVirtualScroll()

		// Get data rows HTML (virtual or normal)
		let dataRowsHtml: string
		if (useVirtualScroll) {
			// Calculate virtual scroll params
			const items = this.grid.displayItems
			const rowHeight = this.grid.virtualScrollRowHeight
			const buffer = this.grid.virtualScrollBuffer

			// Use stored scroll position for calculation (scrollTop from old container)
			const viewportHeight = oldContainer?.clientHeight || 400  // Default height if not available

			// Calculate visible range
			const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer)
			const visibleCount = Math.ceil(viewportHeight / rowHeight) + buffer * 2
			const endIndex = Math.min(items.length, startIndex + visibleCount)

			// Store for later comparison
			this.virtualScrollStart = startIndex
			this.virtualScrollEnd = endIndex

			const params: VirtualScrollParams = {
				startIndex,
				endIndex,
				rowHeight,
				totalItems: items.length
			}
			dataRowsHtml = renderDataRowsVirtual(this, params)
		} else {
			dataRowsHtml = renderDataRows(this)
		}

		// Add modifier class for virtual scroll
		if (useVirtualScroll) {
			container.classList.add('wg--virtual-scroll')
		}

		// Render shortcuts help icon if enabled
		const shortcutsHelpHtml = this.renderShortcutsHelpIcon()

		// Build the table HTML
		const tableHtml = `
			${shortcutsHelpHtml}
			${topContent}
			<table class="wg__table">
				<thead>
					${renderHeaderRow(this)}
				</thead>
				<tbody>
					${dataRowsHtml}
				</tbody>
			</table>
			${bottomContent}
		`

		container.innerHTML = tableHtml
		this.shadow.appendChild(container)

		// Restore scroll position after re-render
		// For virtual scroll, clamp to valid range (items may have changed)
		if (useVirtualScroll) {
			const maxScrollTop = Math.max(0, this.grid.displayItems.length * this.grid.virtualScrollRowHeight - container.clientHeight)
			container.scrollTop = Math.min(scrollTop, maxScrollTop)
		} else {
			container.scrollTop = scrollTop
		}
		container.scrollLeft = scrollLeft

		// Wire up event listeners
		this.attachEventListeners()

		// Auto-focus editor if in edit mode
		if (this.grid.editingCell) {
			const { rowIndex, field } = this.grid.editingCell
			// Use specific selectors to avoid finding stale editor elements
			let editor = this.shadow.querySelector(
				`.wg__combobox-input[data-row="${rowIndex}"][data-field="${field}"],
				 .wg__autocomplete-input[data-row="${rowIndex}"][data-field="${field}"],
				 .wg__select-trigger[data-row="${rowIndex}"][data-field="${field}"],
				 .wg__date-input[data-row="${rowIndex}"][data-field="${field}"]`
			) as HTMLElement
			if (!editor) {
				editor = this.shadow.querySelector(
					`.wg__editor[data-row="${rowIndex}"][data-field="${field}"]`
				) as HTMLElement
			}
			if (editor) {
				editor.focus()
				if (editor instanceof HTMLInputElement && editor.type === 'text') {
					const cursorPos = this.grid.editingCell.cursorPosition
					const column = this.getCurrentEditingColumn()
					const editStartSelection = column?.editorOptions?.editStartSelection || this.grid.editStartSelection

					if (this.grid.editingCell.initialSearchQuery !== undefined) {
						// Type-to-start: always cursor at end
						const len = editor.value.length
						editor.setSelectionRange(len, len)
					} else {
						// Apply editStartSelection setting
						switch (editStartSelection) {
							case 'mousePosition':
								if (cursorPos !== undefined) {
									const pos = Math.min(cursorPos, editor.value.length)
									editor.setSelectionRange(pos, pos)
								} else {
									// No click position available (e.g., Enter/F2 in navigate mode) - cursor at end
									editor.setSelectionRange(editor.value.length, editor.value.length)
								}
								break
							case 'cursorAtStart':
								editor.setSelectionRange(0, 0)
								break
							case 'cursorAtEnd':
								editor.setSelectionRange(editor.value.length, editor.value.length)
								break
							case 'selectAll':
							default:
								editor.select()
								break
						}
					}
				}
			}
		} else if (focusedCell && !this.grid.editingCell) {
			// Restore focus to the previously focused cell (if not editing)
			const cell = container.querySelector(
				`td[data-row="${focusedCell.rowIndex}"][data-col="${focusedCell.colIndex}"]`
			) as HTMLElement
			if (cell) {
				// Use setTimeout to ensure DOM is ready
				setTimeout(() => cell.focus(), 0)
			}
		}

		// Fix wheel scroll after DOM replacement - force browser to recalculate element under cursor
		// Without this, user has to move mouse for scroll to work after re-render
		if (useVirtualScroll) {
			requestAnimationFrame(() => {
				// Briefly toggle pointer-events to force recalculation
				container.style.pointerEvents = 'none'
				requestAnimationFrame(() => {
					container.style.pointerEvents = ''
				})
			})
		}

		// Render connector arrow if active
		this.renderConnector()

		// Update fill handle after render
		updateFillHandle(this)
	}

	/**
	 * Render the SVG connector arrow for toolbar row tracking
	 */
	private renderConnector(): void {
		// Remove any existing connector
		const existingConnector = this.shadow.querySelector('.wg__connector')
		if (existingConnector) {
			existingConnector.remove()
		}

		const state = getConnectorState()
		if (!state.path || !state.arrowPos) {
			return
		}

		// Create SVG overlay
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('class', 'wg__connector')
		svg.setAttribute('style', 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 999;')

		// Create path
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		path.setAttribute('d', state.path)
		path.setAttribute('stroke', 'var(--wg-accent-color, #0078d4)')
		path.setAttribute('stroke-width', '2')
		path.setAttribute('fill', 'none')
		svg.appendChild(path)

		// Create arrow head
		const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
		const points = state.arrowDir === 'down' ? '-4,0 4,0 0,8' :
			state.arrowDir === 'up' ? '-4,0 4,0 0,-8' :
			state.arrowDir === 'left' ? '0,-4 -8,0 0,4' :
			'0,-4 8,0 0,4'
		arrow.setAttribute('points', points)
		arrow.setAttribute('fill', 'var(--wg-accent-color, #0078d4)')
		arrow.setAttribute('transform', `translate(${state.arrowPos.x}, ${state.arrowPos.y})`)
		svg.appendChild(arrow)

		this.shadow.appendChild(svg)
	}

	/**
	 * Open the date picker for a date input
	 */
	private openDatePicker(input: HTMLInputElement, anchor: HTMLElement): void {
		// Close any existing datepicker silently (don't trigger onClose - we're opening a new one)
		if (this.datepicker) {
			this.datepicker.close(true)
			this.datepicker = null
		}

		const dateFormat = input.dataset.dateFormat || 'YYYY-MM-DD'
		const minDateStr = input.dataset.minDate
		const maxDateStr = input.dataset.maxDate

		// Parse current value
		const currentValue = input.dataset.dateValue || ''

		this.datepicker = new DatePicker({
			dateFormat,
			minDate: minDateStr || undefined,
			maxDate: maxDateStr || undefined,
			onSelect: (date, direction) => {
				this.handleDatePickerSelect(input, date, direction)
			},
			onClose: () => {
				this.datepicker = null
				// Cancel edit mode (Escape or click outside without selecting)
				clearEditingVisual(this)
				this.grid.cancelEdit()
			}
		})

		this.datepicker.open(anchor, currentValue || null)
	}

	/**
	 * Handle date selection from the date picker
	 */
	private handleDatePickerSelect(input: HTMLInputElement, date: Date, direction?: 'down' | 'next'): void {
		const dateFormat = input.dataset.dateFormat || 'YYYY-MM-DD'
		const formatInfo = parseFormat(dateFormat)

		// Update input value with formatted date
		input.value = formatDate(date, formatInfo)
		input.dataset.dateValue = toISODateString(date)

		// Clear datepicker reference (picker closes silently via close(true), skipping onClose)
		this.datepicker = null

		// Commit the date
		this.isCommittingFromKeyboard = true
		this.commitDateEditor(input)

		// Move focus after commit (direction from keyboard: Enter=down, Tab=next)
		const rowIndex = parseInt(input.dataset.row || '0', 10)
		const field = input.dataset.field || ''
		this.moveFocusAfterCommit(rowIndex, field, direction || 'down')
	}

	/**
	 * Commit the date editor value
	 */
	private commitDateEditor(input: HTMLInputElement): void {
		if (!this.grid.editingCell) return

		const rowIndex = parseInt(input.dataset.row || '0', 10)
		const field = input.dataset.field || ''
		const outputFormat = input.dataset.outputFormat || 'iso'
		const dateFormat = input.dataset.dateFormat || 'YYYY-MM-DD'
		const formatInfo = parseFormat(dateFormat)

		// Parse the input value using the format
		const dateValue = input.value ? this.parseDateInput(input.value, formatInfo) : null

		// Convert to output format
		let value: unknown = null
		if (dateValue) {
			switch (outputFormat) {
				case 'date':
					value = dateValue
					break
				case 'timestamp':
					value = dateValue.getTime()
					break
				case 'iso':
				default:
					value = toISODateString(dateValue)
					break
			}
		}

		this.grid.commitEdit(rowIndex, field, value)
	}

	/**
	 * Parse date input string using format info
	 */
	private parseDateInput(value: string, formatInfo: { separator: string; parts: { year?: { index: number }; month?: { index: number }; day?: { index: number } } }): Date | null {
		if (!value) return null

		const segments = value.split(formatInfo.separator)
		let year: number | null = null
		let month: number | null = null
		let day: number | null = null

		segments.forEach((segment, index) => {
			if (!segment) return
			const numValue = parseInt(segment, 10)

			if (formatInfo.parts.year?.index === index) {
				year = numValue < 100 ? numValue + 2000 : numValue
			} else if (formatInfo.parts.month?.index === index) {
				month = numValue
			} else if (formatInfo.parts.day?.index === index) {
				day = numValue
			}
		})

		if (year === null || month === null || day === null) return null

		const date = new Date(year, month - 1, day)
		if (date.getMonth() !== month - 1 || date.getDate() !== day) return null

		return date
	}

	/**
	 * Show "Go to Row" dialog (Ctrl+G)
	 */
	private showGoToRowDialog(colIndex: number): void {
		const displayItems = this.grid.displayItems
		if (displayItems.length === 0) return

		// Create dialog overlay
		const overlay = document.createElement('div')
		overlay.className = 'wg__goto-overlay'
		overlay.innerHTML = `
			<div class="wg__goto-dialog">
				<label class="wg__goto-label">Go to row (1-${displayItems.length}):</label>
				<input type="number" class="wg__goto-input" min="1" max="${displayItems.length}" value="1" />
				<div class="wg__goto-buttons">
					<button type="button" class="wg__goto-btn wg__goto-btn--cancel">Cancel</button>
					<button type="button" class="wg__goto-btn wg__goto-btn--go">Go</button>
				</div>
			</div>
		`

		const input = overlay.querySelector('.wg__goto-input') as HTMLInputElement
		const goBtn = overlay.querySelector('.wg__goto-btn--go') as HTMLButtonElement
		const cancelBtn = overlay.querySelector('.wg__goto-btn--cancel') as HTMLButtonElement

		const closeDialog = () => {
			overlay.remove()
		}

		const goToRow = () => {
			const rowNum = parseInt(input.value, 10)
			if (isNaN(rowNum) || rowNum < 1 || rowNum > displayItems.length) {
				input.focus()
				input.select()
				return
			}

			closeDialog()

			// Convert 1-based to 0-based index
			const targetRow = rowNum - 1
			const oldFocus = this.grid.focusedCell
			this.grid.setFocusedCell(targetRow, colIndex)

			if (this.grid.shouldUseVirtualScroll()) {
				// Virtual scroll: scroll to position (programmatic flag prevents redundant handleVirtualScroll)
				this.scrollToRowProgrammatically(targetRow)
				// After scroll settles, focus the cell
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const cell = this.shadow.querySelector(
							`td[data-row="${targetRow}"][data-col="${colIndex}"]`
						) as HTMLElement
						cell?.focus()
					})
				})
			} else {
				// Non-virtual: scroll cell into view and focus it
				const cell = this.shadow.querySelector(
					`td[data-row="${targetRow}"][data-col="${colIndex}"]`
				) as HTMLElement
				if (cell) {
					cell.scrollIntoView({ block: 'nearest', behavior: 'auto' })
					cell.focus()
					updateFocusVisual(this, oldFocus, { rowIndex: targetRow, colIndex })
				}
			}
		}

		// Event handlers
		goBtn.addEventListener('click', goToRow)
		cancelBtn.addEventListener('click', closeDialog)
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) closeDialog()
		})
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				goToRow()
			} else if (e.key === 'Escape') {
				e.preventDefault()
				closeDialog()
			}
		})

		this.shadow.appendChild(overlay)
		input.focus()
		input.select()
	}

	/**
	 * Open custom editor by calling the cellEditCallback
	 */
	private openCustomEditor(rowIndex: number, colIndex: number): void {
		const column = this.grid.columns[colIndex]
		if (!column || column.editor !== 'custom' || !column.cellEditCallback) {
			return
		}

		const field = String(column.field)
		const item = this.grid.displayItems[rowIndex]
		if (!item) return

		const currentValue = this.grid.getCellRawValue(item, rowIndex, field)

		// Create context with commit/cancel functions
		const context: CustomEditorContext<unknown> = {
			value: currentValue,
			row: item,
			rowIndex,
			field,
			commit: (newValue: unknown) => {
				// Commit the value and exit edit mode
				this.grid.commitEdit(rowIndex, field, newValue)
				clearEditingVisual(this)
				// Return focus to the cell
				requestAnimationFrame(() => {
					moveFocus(this, rowIndex, colIndex)
				})
			},
			cancel: () => {
				// Cancel edit mode without saving
				clearEditingVisual(this)
				this.grid.cancelEdit()
				// Return focus to the cell
				requestAnimationFrame(() => {
					moveFocus(this, rowIndex, colIndex)
				})
			}
		}

		// Call the callback (cast to any to satisfy generic constraint)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(column.cellEditCallback as (ctx: CustomEditorContext<any>) => void)(context)
	}

	/**
	 * Handle context menu (right-click) on cells
	 */
	private handleContextMenu(e: MouseEvent): void {
		const contextMenuItems = this.grid.contextMenu
		if (!contextMenuItems || contextMenuItems.length === 0) {
			return // No context menu defined, use browser default
		}

		const target = e.target as HTMLElement
		const cell = target.closest('.wg__cell') as HTMLElement
		if (!cell) {
			return // Right-click not on a cell
		}

		e.preventDefault()

		// Close any existing context menu
		if (this.contextMenuElement) {
			closeContextMenu(this.contextMenuElement)
			this.contextMenuElement = null
		}

		const rowIndex = parseInt(cell.dataset.row || '0', 10)
		const colIndex = parseInt(cell.dataset.col || '0', 10)
		const column = this.grid.columns[colIndex]
		if (!column) return

		const item = this.grid.displayItems[rowIndex]
		if (!item) return

		const field = String(column.field)
		const cellValue = this.grid.getCellRawValue(item, rowIndex, field)

		// Create context for callbacks
		const menuContext = {
			row: item,
			rowIndex,
			colIndex,
			column,
			cellValue
		}

		// Fire oncontextmenuopen event
		if (this.grid.oncontextmenuopen) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(this.grid.oncontextmenuopen as (ctx: any) => void)(menuContext)
		}

		// Sync any shadowed own properties to grid (workaround for property shadowing)
		const ownXOffset = Object.getOwnPropertyDescriptor(this, 'contextMenuXOffset')
		const ownYOffset = Object.getOwnPropertyDescriptor(this, 'contextMenuYOffset')
		if (ownXOffset && 'value' in ownXOffset) {
			this.grid.contextMenuXOffset = ownXOffset.value
			delete (this as any).contextMenuXOffset // Remove shadow
		}
		if (ownYOffset && 'value' in ownYOffset) {
			this.grid.contextMenuYOffset = ownYOffset.value
			delete (this as any).contextMenuYOffset // Remove shadow
		}

		// Open the context menu
		this.contextMenuElement = openContextMenu(
			this,
			e.clientX,
			e.clientY,
			this.grid.contextMenuXOffset,
			this.grid.contextMenuYOffset,
			contextMenuItems,
			menuContext,
			(itemId: string) => {
				// Find the clicked item and call its onclick
				const clickedItem = contextMenuItems.find(item => item.id === itemId)
				if (clickedItem?.onclick) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					;(clickedItem.onclick as (ctx: any) => void | Promise<void>)(menuContext)
				}
				// Close menu after click
				if (this.contextMenuElement) {
					closeContextMenu(this.contextMenuElement)
					this.contextMenuElement = null
				}
			},
			() => {
				// onClose callback
				this.contextMenuElement = null
			}
		)
	}

	/**
	 * Setup document-level keyboard shortcut listener for toolbar row
	 * Allows shortcuts to work on hovered row without cell focus
	 */
	private setupToolbarShortcuts(): void {
		// Remove any existing listener first
		if (this.toolbarShortcutHandler) {
			document.removeEventListener('keydown', this.toolbarShortcutHandler)
		}

		const shortcuts = this.grid.rowShortcuts
		if (!shortcuts?.length) return

		this.toolbarShortcutHandler = (e: KeyboardEvent) => {
			// Skip if focus is in an input/editor
			const target = e.target as HTMLElement
			if (target.matches('input, textarea, select, [contenteditable="true"]')) {
				return
			}

			const toolbarRowIndex = getActiveToolbarRowIndex()
			if (toolbarRowIndex === null || !isToolbarOwnedBy(this.shadow)) return

			const row = this.grid.displayItems[toolbarRowIndex]
			if (!row) return

			const columns = this.grid.columns

			for (const shortcut of shortcuts) {
				const combo = parseKeyCombo(shortcut.key)
				if (matchesKeyCombo(e, combo)) {
					const ctx: ShortcutContext<T> = {
						row,
						rowIndex: toolbarRowIndex,
						colIndex: 0,
						column: columns[0],
						cellValue: null
					}

					const isDisabled = typeof shortcut.disabled === 'function'
						? shortcut.disabled(ctx)
						: shortcut.disabled === true

					if (!isDisabled) {
						e.preventDefault()
						e.stopPropagation()
						shortcut.action(ctx)
						return
					}
				}
			}
		}

		document.addEventListener('keydown', this.toolbarShortcutHandler)
	}

	/**
	 * Setup keyboard shortcuts for inline toolbar mode
	 * Uses hoveredRowIndex to determine which row to act on
	 */
	private setupInlineShortcuts(): void {
		this.removeInlineShortcuts()

		const shortcuts = this.grid.rowShortcuts
		if (!shortcuts?.length || this.grid.hoveredRowIndex === null) return

		this.inlineShortcutHandler = (e: KeyboardEvent) => {
			// Skip if focus is in an input/editor
			const target = e.target as HTMLElement
			if (target.matches('input, textarea, select, [contenteditable="true"]')) {
				return
			}

			const rowIndex = this.grid.hoveredRowIndex
			if (rowIndex === null) return

			const row = this.grid.displayItems[rowIndex]
			if (!row) return

			const columns = this.grid.columns

			for (const shortcut of shortcuts) {
				const combo = parseKeyCombo(shortcut.key)
				if (matchesKeyCombo(e, combo)) {
					const ctx: ShortcutContext<T> = {
						row,
						rowIndex,
						colIndex: 0,
						column: columns[0],
						cellValue: null
					}

					const isDisabled = typeof shortcut.disabled === 'function'
						? shortcut.disabled(ctx)
						: shortcut.disabled === true

					if (!isDisabled) {
						e.preventDefault()
						e.stopPropagation()
						shortcut.action(ctx)
						return
					}
				}
			}
		}

		document.addEventListener('keydown', this.inlineShortcutHandler)
	}

	/**
	 * Remove inline shortcuts listener
	 */
	private removeInlineShortcuts(): void {
		if (this.inlineShortcutHandler) {
			document.removeEventListener('keydown', this.inlineShortcutHandler)
			this.inlineShortcutHandler = null
		}
	}

	/**
	 * Setup rich tooltips for toolbar buttons
	 * Shows title, description, and keyboard shortcut on hover
	 */
	private setupToolbarTooltips(items: NormalizedToolbarItem<T>[], row: T, rowIndex: number): void {
		const toolbarContainer = this.shadow.querySelector('.wg__toolbar-container')
		if (!toolbarContainer) return

		const buttons = toolbarContainer.querySelectorAll('.wg__toolbar-btn')
		buttons.forEach(btn => {
			const button = btn as HTMLElement
			const itemId = button.dataset.toolbarItem
			const item = items.find(i => i.id === itemId)
			if (!item) return

			// Find matching keyboard shortcut from rowShortcuts
			const matchingShortcut = this.grid.rowShortcuts?.find(s => s.id === item.id)

			button.addEventListener('mouseenter', () => {
				// Use custom callback if provided, otherwise build standard tooltip
				const html = item.tooltipCallback
					? item.tooltipCallback(row, rowIndex)
					: buildToolbarTooltipHtml(item, matchingShortcut?.key)

				showTooltip(this, button, html, 0, true)
			})

			button.addEventListener('mouseleave', () => {
				hideTooltip(this)
			})
		})
	}

	/**
	 * Show toolbar for a specific row
	 */
	private showToolbarForRow(rowElement: HTMLElement, rowIndex: number, cursorX?: number): void {
		// Skip floating toolbar in inline mode (buttons rendered directly in cells)
		if (this.grid.toolbarPosition === 'inline') {
			return
		}

		if (!this.grid.showRowToolbar || !this.grid.rowToolbar.length) {
			return
		}

		const items = normalizeToolbarItems(this.grid.rowToolbar)

		const row = this.grid.displayItems[rowIndex]
		if (!row) {
			return
		}

		// Clear any pending hide timeout when opening new toolbar
		if (this.toolbarHideTimeout) {
			clearTimeout(this.toolbarHideTimeout)
			this.toolbarHideTimeout = null
		}

		openToolbar(
			this,
			rowElement,
			rowIndex,
			items,
			row,
			(item: NormalizedToolbarItem<T>) => {
				this.handleToolbarItemClick(item, rowIndex, row)
			},
			cursorX
		)

		// Add document-level shortcut listener for toolbar row
		this.setupToolbarShortcuts()

		// Clean up any existing connector (state was reset in openToolbar)
		this.renderConnector()

		// Add rich tooltip handlers to toolbar buttons
		this.setupToolbarTooltips(items, row, rowIndex)

		// Add hover tracking to toolbar container (hover mode only)
		if (this.grid.toolbarTrigger === 'hover') {
			const toolbarContainer = this.shadow.querySelector('.wg__toolbar-container')
			if (toolbarContainer) {
				toolbarContainer.addEventListener('mouseenter', () => {
					this.toolbarHovered = true
					if (this.toolbarHideTimeout) {
						clearTimeout(this.toolbarHideTimeout)
						this.toolbarHideTimeout = null
					}
				})

				toolbarContainer.addEventListener('mouseleave', () => {
					this.toolbarHovered = false
					// Don't close during move actions
					if (this.toolbarMoveInProgress) return

					// Start hide timeout when leaving the toolbar
					this.toolbarHideTimeout = setTimeout(() => {
						// Check if mouse moved back to a row or toolbar
						const table = this.shadow.querySelector('.wg__table')
						const isHoveringTable = table?.matches(':hover')
						const isHoveringToolbar = toolbarContainer.matches(':hover')

						if (!isHoveringTable && !isHoveringToolbar) {
							this.closeToolbarAndReset()
							// No render() needed - closeToolbar() surgically removes toolbar
						}
					}, 150)
				})
			}
		}

		// Update trigger button active state without full re-render
		// (re-render would destroy rowElement before Floating UI positions the toolbar)
		const triggerBtn = this.shadow.querySelector(`[data-toolbar-trigger="${rowIndex}"]`) as HTMLElement
		if (triggerBtn) {
			// Remove active from all triggers
			this.shadow.querySelectorAll('.wg__toolbar-trigger--active').forEach(el => {
				el.classList.remove('wg__toolbar-trigger--active')
			})
			triggerBtn.classList.add('wg__toolbar-trigger--active')
		}
	}

	/**
	 * Close toolbar and reset move flag
	 */
	private closeToolbarAndReset(): void {
		this.toolbarMoveInProgress = false
		this.toolbarHovered = false
		if (this.toolbarHideTimeout) {
			clearTimeout(this.toolbarHideTimeout)
			this.toolbarHideTimeout = null
		}
		// Remove document shortcut listener
		if (this.toolbarShortcutHandler) {
			document.removeEventListener('keydown', this.toolbarShortcutHandler)
			this.toolbarShortcutHandler = null
		}
		closeToolbar()
	}

	/**
	 * Handle toolbar item click
	 */
	private handleToolbarItemClick(item: NormalizedToolbarItem<T>, _originalRowIndex: number, row: T): void {
		// Find CURRENT index of the row item (it may have moved) - like QuickGrid
		const currentIndex = this.grid.displayItems.findIndex(i => i === row)
		if (currentIndex === -1) {
			// Row was deleted, close toolbar
			this.closeToolbarAndReset()
			// No render() needed - items setter already triggered requestUpdate()
			return
		}

		// Check if this is a move action (toolbar should stay open)
		const isMoveAction = item.id === 'moveUp' || item.id === 'moveDown'

		// Prevent mouseleave from closing toolbar during move
		if (isMoveAction) {
			this.toolbarMoveInProgress = true
		}

		// Call item's onclick if defined - use CURRENT index
		if (item.onclick) {
			item.onclick({ row, rowIndex: currentIndex })
		}

		// Fire ontoolbarclick callback - use CURRENT index
		if (this.grid.ontoolbarclick) {
			this.grid.ontoolbarclick({
				item,
				rowIndex: currentIndex,
				row
			})
		}

		// For delete action, close toolbar (row is gone)
		if (item.id === 'delete') {
			this.closeToolbarAndReset()
			// No render() needed - delete onclick should have modified items, triggering requestUpdate()
			return
		}

		if (isMoveAction) {
			// For move actions: keep toolbar open, re-render, update connector
			this.render()
			// Update connector to show where the row moved to
			updateConnector(this, this.grid.displayItems)
			this.renderConnector()
		} else {
			// For other actions (add, duplicate): keep toolbar open
			this.render()
		}
	}

	/**
	 * Handle inline action button click (toolbarPosition="inline")
	 */
	private handleInlineActionClick(actionId: string | undefined, rowIndex: number): void {
		if (!actionId) return

		const items = normalizeToolbarItems(this.grid.rowToolbar)
		const item = items.find(i => i.id === actionId)
		const row = this.grid.displayItems[rowIndex]

		if (!item || !row) return

		// Call item's onclick if defined
		if (item.onclick) {
			item.onclick({ row, rowIndex })
		}

		// Fire ontoolbarclick callback
		if (this.grid.ontoolbarclick) {
			this.grid.ontoolbarclick({
				item,
				rowIndex,
				row
			})
		}

		// Re-render to update button states
		this.render()
	}

	/**
	 * Handle paste event in navigate mode
	 */
	private handlePaste = (e: ClipboardEvent): void => {
		// Only in navigate mode with focused cell, not while editing
		if (!this.grid.isNavigateMode || this.grid.editingCell || !this.grid.focusedCell) return

		const { rowIndex, colIndex } = this.grid.focusedCell
		const column = this.grid.columns[colIndex]
		const row = this.grid.displayItems[rowIndex]
		if (!column || !row) return

		// Check if cell is editable
		if (!this.grid.isCellEditable(column)) return

		e.preventDefault()

		let text = e.clipboardData?.getData('text') || ''
		if (column.beforePasteCallback) {
			const result = column.beforePasteCallback(text, row)
			text = result != null ? String(result) : ''
		}

		// Commit the pasted value
		const field = String(column.field)
		this.grid.commitEdit(rowIndex, field, text)
		this.render()
	}
}

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('web-grid')) {
	customElements.define('web-grid', GridElement)
}

export default GridElement
