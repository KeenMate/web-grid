// =============================================================================
// QuickGrid Types - Ported from QuickGrid.svelte lines 17-245
// =============================================================================

// Editor type options
export type EditorType = "text" | "number" | "checkbox" | "select" | "combobox" | "date" | "autocomplete" | "custom"

// How editing is triggered
export type EditTrigger = "click" | "dblclick" | "button" | "always" | "navigate"

// Grid mode - sets sensible defaults for common use cases
export type GridMode = "read-only" | "excel" | "input-matrix"

// When to show dropdown toggle (▼)
export type ToggleVisibility = "always" | "on-focus"

// When to load dynamic options
export type OptionsLoadTrigger = "immediate" | "oneditstart" | "ondropdownopen"

// Date output format options
export type DateOutputFormat = "date" | "iso" | "timestamp"

// How to position cursor/selection when entering edit mode
export type EditStartSelection = "mousePosition" | "selectAll" | "cursorAtStart" | "cursorAtEnd"

// Option for select/combobox/autocomplete editors
export type EditorOption = {
	value: string | number | boolean
	label: string
	[key: string]: unknown  // Allow extra properties
}

// Render context for custom option rendering
export type OptionRenderContext = {
	index: number
	isHighlighted: boolean
	isSelected: boolean
	isDisabled: boolean
}

// Editor configuration options
export type EditorOptions<T = unknown> = {
	// === SHARED (select/combobox/autocomplete) ===
	options?: EditorOption[]
	loadOptions?: (row: T, field: string) => Promise<EditorOption[]>
	optionsLoadTrigger?: OptionsLoadTrigger  // Default: "oneditstart"

	// Member properties (string-based property access)
	valueMember?: string      // Property for value (default: "value")
	displayMember?: string    // Property for display text (default: "label")
	searchMember?: string     // Property for searchable text (falls back to displayMember)
	iconMember?: string       // Property for icon/emoji
	subtitleMember?: string   // Property for subtitle/description
	disabledMember?: string   // Property for disabled state
	groupMember?: string      // Property for grouping options

	// Callback alternatives (override member properties)
	getValueCallback?: (option: EditorOption) => string | number
	getDisplayCallback?: (option: EditorOption) => string
	getSearchCallback?: (option: EditorOption) => string
	getIconCallback?: (option: EditorOption) => string
	getSubtitleCallback?: (option: EditorOption) => string
	getDisabledCallback?: (option: EditorOption) => boolean
	getGroupCallback?: (option: EditorOption) => string

	// Render callback (returns HTML string)
	renderOptionCallback?: (option: EditorOption, context: OptionRenderContext) => string

	// Selection event
	onselect?: (option: EditorOption, row: T) => void

	// Other shared options
	allowEmpty?: boolean    // Allow null/empty selection
	emptyLabel?: string     // Label for empty option (default: "-- Select --")
	noOptionsText?: string  // Override "No options" message (falls back to grid.labels.dropdownNoOptions)
	searchingText?: string  // Override "Searching..." message (falls back to grid.labels.dropdownSearching)

	// === TEXT ===
	maxLength?: number
	placeholder?: string
	pattern?: string
	inputMode?: "text" | "numeric" | "email" | "tel" | "url"
	editStartSelection?: EditStartSelection  // Cursor position when entering edit (default: "selectAll")

	// === NUMBER ===
	min?: number
	max?: number
	step?: number
	decimalPlaces?: number
	allowNegative?: boolean

	// === CHECKBOX ===
	trueValue?: unknown     // Value to store when checked (default: true)
	falseValue?: unknown    // Value to store when unchecked (default: false)

	// === DATE ===
	minDate?: Date | string
	maxDate?: Date | string
	dateFormat?: string               // Display format: 'YYYY-MM-DD', 'DD.MM.YYYY', etc.
	outputFormat?: DateOutputFormat  // What to store: Date object, ISO string, or timestamp

	// === AUTOCOMPLETE ===
	initialOptions?: EditorOption[]  // Show before search (popular items)
	onSearchCallback?: (query: string, row: T, signal?: AbortSignal) => Promise<EditorOption[]>
	minSearchLength?: number         // Min chars before search (default: 1)
	debounceMs?: number              // Debounce search calls (default: 300)
	multiple?: boolean               // Allow multiple selections
	maxSelections?: number           // Max items when multiple=true
}

// Context passed to custom editor callback
export type CustomEditorContext<T> = {
	value: unknown
	row: T
	rowIndex: number
	field: string
	commit: (newValue: unknown) => void
	cancel: () => void
}

// Validation state for a cell
export type CellValidationState = {
	rowIndex: number
	field: string
	error: string
}

// Validation result from beforeCommitCallback
export type ValidationResult = {
	valid: boolean
	message?: string
	transformedValue?: unknown
}

// Context passed to beforeCommitCallback
export type BeforeCommitContext<T> = {
	value: unknown
	oldValue: unknown
	row: T
	rowIndex: number
	field: string
}

// beforeCommitCallback can return:
// - ValidationResult object
// - boolean (true = valid, false = invalid with no message)
// - string (error message = invalid)
// - null/undefined (valid)
export type BeforeCommitResult = ValidationResult | boolean | string | null | undefined

// Cell render callback (replaces Svelte snippet)
export type CellRenderCallback<T> = (row: T, element: HTMLElement) => void

// Column definition
export type Column<T> = {
	field: keyof T | string
	title: string
	headerInfo?: string  // Info tooltip shown next to header title (displays ⓘ icon)
	sortable?: boolean
	filterable?: boolean
	width?: string
	minWidth?: string
	maxWidth?: string
	textOverflow?: 'wrap' | 'ellipsis'
	align?: "left" | "center" | "right"
	cellClass?: string  // Custom CSS class(es) applied to all cells in this column
	cellClassCallback?: (value: unknown, row: T) => string | null  // Dynamic CSS class based on value/row
	formatCallback?: (value: unknown, row: T) => string
	templateCallback?: (row: T) => string
	// Render callback (replaces Svelte snippet)
	renderCallback?: CellRenderCallback<T>
	// Editing props
	editable?: boolean
	editor?: EditorType
	editTrigger?: EditTrigger  // Per-column override
	dropdownToggleVisibility?: ToggleVisibility  // Per-column override for toggle visibility
	openDropdownOnEnter?: boolean  // Per-column override: Enter opens dropdown (true) or moves down (false)
	editorOptions?: EditorOptions<T>
	// Validation - can return error message or null (deprecated, use beforeCommitCallback)
	validateCallback?: (value: unknown, row: T) => string | null | Promise<string | null>
	// Before commit callback - validates and optionally transforms value
	beforeCommitCallback?: (context: BeforeCommitContext<T>) => BeforeCommitResult | Promise<BeforeCommitResult>
	// Custom editor callback
	cellEditCallback?: (context: CustomEditorContext<T>) => void
	// Show edit button in cell
	showEditButton?: boolean
	// Tooltip - displayed on cell hover
	tooltipMember?: string  // Property name in row data containing tooltip text
	tooltipCallback?: (value: unknown, row: T) => string | null  // Dynamic tooltip (takes priority over tooltipMember)
	// Clipboard callbacks
	beforeCopyCallback?: (value: unknown, row: T) => string  // Transform value before copying to clipboard
	beforePasteCallback?: (value: string, row: T) => unknown  // Process pasted value before applying
	// Validation tooltip - return HTML string for rich error display
	validationTooltipCallback?: (context: ValidationTooltipContext<T>) => string | null
	// Freeze panes - column sticks to left side during horizontal scroll
	frozen?: boolean
	// Resizable - allow column width to be changed by dragging (default: true)
	resizable?: boolean
}

// Context for validation tooltip callback
export type ValidationTooltipContext<T> = {
	field: string
	error: string
	value: unknown
	row: T
	rowIndex: number
}

// Detail passed to onrowchange callback
export type RowChangeDetail<T> = {
	row: T                    // Original row (unchanged)
	draftRow: T              // Draft row with user's changes (including invalid)
	rowIndex: number
	field: string
	oldValue: unknown
	newValue: unknown
	isValid: boolean
	validationError?: string | null
}

// =============================================================================
// Row Toolbar Types
// =============================================================================

// Predefined toolbar item types
export type PredefinedToolbarItemType = 'add' | 'delete' | 'duplicate' | 'moveUp' | 'moveDown'

// Toolbar position options
export type ToolbarPosition = 'auto' | 'left' | 'right' | 'top' | 'inline'

// Toolbar tooltip configuration
export type ToolbarTooltip = {
	description?: string   // Additional description text
	shortcut?: string      // Keyboard shortcut to display (e.g., "Ctrl+D")
}

// Custom toolbar item configuration
export type RowToolbarItem<T> = {
	// Identity
	id: string

	// Display
	icon: string
	title: string
	label?: string  // Optional text label next to icon

	// Layout
	row?: number    // Row number (1 = closest to grid row, default: 1)
	group?: number  // Group number for divider placement

	// Behavior
	type?: PredefinedToolbarItemType  // If predefined, use built-in handler
	danger?: boolean                   // Red styling (like delete)
	disabled?: boolean | ((row: T, rowIndex: number) => boolean)
	hidden?: boolean | ((row: T, rowIndex: number) => boolean)  // Hide button for specific rows

	// Tooltip
	tooltip?: ToolbarTooltip  // Rich tooltip with description and shortcut
	tooltipCallback?: (row: T, rowIndex: number) => string  // Custom HTML tooltip

	// Custom handler (required if no type)
	onclick?: (detail: { row: T, rowIndex: number }) => void | Promise<void>
}

// Shorthand: string = predefined type, or full RowToolbarItem
export type RowToolbarConfig<T> = PredefinedToolbarItemType | RowToolbarItem<T>

// Normalized toolbar item (after processing shorthand)
export type NormalizedToolbarItem<T> = Required<Pick<RowToolbarItem<T>, 'id' | 'icon' | 'title' | 'row' | 'group'>> & Omit<RowToolbarItem<T>, 'id' | 'icon' | 'title' | 'row' | 'group'> & {
	tooltip?: ToolbarTooltip
	tooltipCallback?: (row: T, rowIndex: number) => string
}

// Detail passed to ontoolbarclick callback
export type ToolbarClickDetail<T> = {
	item: NormalizedToolbarItem<T>
	rowIndex: number
	row: T
}

// Legacy type aliases for backwards compatibility
export type RowActionType = PredefinedToolbarItemType
export type RowActionClickDetail<T> = {
	action: RowActionType
	rowIndex: number
	row: T
}

// =============================================================================
// Context Menu Types
// =============================================================================

// Context passed to context menu callbacks
export type ContextMenuContext<T> = {
	row: T
	rowIndex: number
	colIndex: number
	column: Column<T>
	cellValue: unknown
}

// Context menu item configuration
export type ContextMenuItem<T> = {
	id: string
	label: string | ((context: ContextMenuContext<T>) => string)
	icon?: string | ((context: ContextMenuContext<T>) => string)
	shortcut?: string  // Keyboard shortcut (e.g., "c", "Delete", "Ctrl+C")
	disabled?: boolean | ((context: ContextMenuContext<T>) => boolean)
	visible?: boolean | ((context: ContextMenuContext<T>) => boolean)
	danger?: boolean
	dividerBefore?: boolean
	onclick?: (context: ContextMenuContext<T>) => void | Promise<void>
}

// =============================================================================
// Row Keyboard Shortcuts Types
// =============================================================================

// Context passed to shortcut action callbacks
export type ShortcutContext<T> = {
	row: T
	rowIndex: number
	colIndex: number
	column: Column<T>
	cellValue: unknown
}

// Single shortcut definition
export type RowShortcut<T> = {
	key: string                    // e.g., "Delete", "Ctrl+D", "F3", "Shift+Enter"
	id: string                     // Unique identifier
	label: string                  // Display label for help overlay
	action: (ctx: ShortcutContext<T>) => void | Promise<void>
	disabled?: boolean | ((ctx: ShortcutContext<T>) => boolean)
}

// Parsed key combination (internal use)
export type ParsedKeyCombo = {
	key: string
	ctrl: boolean
	shift: boolean
	alt: boolean
	meta: boolean
}

// =============================================================================
// Component Props
// =============================================================================

// Main QuickGrid props
export type QuickGridProps<T> = {
	items: T[]
	columns: Column<T>[]
	filterable?: boolean
	pageable?: boolean
	pageSize?: number
	striped?: boolean
	hoverable?: boolean
	showRowNumbers?: boolean  // Show row number column on the left (default: false)
	stickyRowNumbers?: boolean  // Make row number column sticky (freeze panes)
	freezeColumns?: number  // Freeze first N columns (after visual reorder from frozen: true)
	class?: string
	style?: string
	customStylesCallback?: () => string  // Callback returning custom CSS to inject into shadow DOM
	rowClassCallback?: (row: T, rowIndex: number) => string | null  // Dynamic CSS class for rows
	// Sorting
	sort?: SortState[]  // Current sort state (can be set for initial/server-side sort)
	sortMode?: SortMode  // Sort mode: "none" (disabled), "single", or "multi" (default: "none")
	// Pagination state
	currentPage?: number  // Current page (1-based)
	totalItems?: number   // Total items for server-side pagination
	showPagination?: boolean | 'auto'  // true=always show, false=never, 'auto'=hide when ≤1 page
	pageSizes?: number[]  // Available page sizes for selector (e.g., [10, 25, 50, 100])
	paginationPosition?: string  // Position(s): "bottom-center" (default), "top-right|bottom-right" for multiple
	paginationLabelsCallback?: PaginationLabelsCallback  // Callback to customize/translate pagination text
	paginationLayout?: string  // Element order: "pageSize|previous|pageInfo|next" or "first|previous|pageInfo|next|last"
	// Summary
	summaryPosition?: string  // Position(s): "bottom-left", "top-right|bottom-right", etc.
	summaryContentCallback?: SummaryContentCallback<T>  // Callback returning HTML content
	summaryInline?: boolean  // Share row with pagination when in same area (default: true)
	// Editing props
	editable?: boolean
	editTrigger?: EditTrigger
	editStartSelection?: EditStartSelection  // Default cursor position when entering edit via navigate mode (default: selectAll)
	mode?: GridMode  // Grid mode - sets sensible defaults (read-only, excel, input-matrix)
	dropdownToggleVisibility?: ToggleVisibility  // When to show dropdown toggle (always, on-focus)
	dropdownShowOnFocus?: boolean  // Auto-open dropdown when cell is focused (deprecated, use showOnFocus in editorOptions)
	openDropdownOnEnter?: boolean  // Enter opens dropdown (true) or moves down (false, default)
	checkboxAlwaysEditable?: boolean  // Make checkboxes always interactive, even in navigate mode
	// Invalid cells state (for external tracking)
	invalidCells?: CellValidationState[]
	// Row toolbar (floating toolbar for row actions)
	showRowToolbar?: boolean
	rowToolbar?: RowToolbarConfig<T>[]  // Toolbar items (predefined strings or custom objects)
	toolbarVerticalAlign?: 'top' | 'center' | 'bottom'  // Vertical alignment for left/right positions: top (rows above), center, bottom (default, rows below)
	toolbarHorizontalAlign?: 'start' | 'center' | 'end' | 'cursor'  // Horizontal alignment for top position (default: 'center')
	toolbarTrigger?: 'hover' | 'click' | 'button'  // How to show toolbar
	toolbarPosition?: ToolbarPosition  // Preferred position: auto (default), left, right, top, or inline
	inlineActionsTitle?: string  // Header title for inline actions column (when toolbarPosition="inline")
	// Legacy aliases for backwards compatibility
	showRowActions?: boolean      // Deprecated: use showRowToolbar
	rowActions?: RowToolbarConfig<T>[]  // Deprecated: use rowToolbar
	toolbarAlign?: 'top' | 'center' | 'bottom'  // Deprecated: use toolbarVerticalAlign
	toolbarTopPosition?: 'start' | 'center' | 'end' | 'cursor'  // Deprecated: use toolbarHorizontalAlign
	// Context menu
	contextMenu?: ContextMenuItem<T>[]
	contextMenuXOffset?: number           // Horizontal offset from click (default: 0)
	contextMenuYOffset?: number           // Vertical offset from click (default: 4)
	oncontextmenuopen?: (context: ContextMenuContext<T>) => void
	// Row keyboard shortcuts
	rowShortcuts?: RowShortcut<T>[]              // Shortcut definitions
	showShortcutsHelp?: boolean                   // Show info icon (default: false)
	shortcutsHelpPosition?: 'top-right' | 'top-left'  // Icon position (default: 'top-right')
	shortcutsHelpContentCallback?: () => string   // Custom HTML to show with shortcuts list
	// Virtual scroll
	virtualScroll?: boolean              // Enable virtual scroll (default: false)
	virtualScrollThreshold?: number      // Auto-enable when items >= threshold (default: 100)
	virtualScrollRowHeight?: number      // Fixed row height in px (default: 38)
	virtualScrollBuffer?: number         // Extra rows above/below viewport (default: 10)
	// Infinite scroll (load more)
	infiniteScroll?: boolean             // Enable infinite scroll (default: false)
	infiniteScrollThreshold?: number     // Distance from bottom to trigger load (default: 100px)
	hasMoreItems?: boolean               // Set to false when no more data (default: true)
	// Callbacks
	onrowchange?: (detail: RowChangeDetail<T>) => void
	onroweditstart?: (detail: { row: T, rowIndex: number, field: string }) => void
	onroweditcancel?: (detail: { row: T, rowIndex: number, field: string }) => void
	onvalidationerror?: (detail: { row: T, rowIndex: number, field: string, error: string }) => void
	// Validation tooltip - return HTML string for rich error display (column-level overrides this)
	validationTooltipCallback?: (context: ValidationTooltipContext<T>) => string | null
	ontoolbarclick?: (detail: ToolbarClickDetail<T>) => void
	onrowaction?: (detail: RowActionClickDetail<T>) => void  // Deprecated: use ontoolbarclick
	ondatarequest?: (detail: DataRequestDetail) => void  // Fires when sort/page changes
	onrowdelete?: (detail: { rowIndex: number; row: T }) => void  // Ctrl+Delete pressed on a row
	// Column resize & persistence
	gridName?: string                                    // Unique name for localStorage persistence
	persistColumnWidths?: boolean                        // Persist column widths to localStorage (requires gridName)
	oncolumnresize?: (detail: ColumnResizeDetail) => void  // Fired when column is resized

	// Column reorder & persistence
	allowColumnReorder?: boolean                         // Enable drag-to-reorder columns (default: false)
	persistColumnOrder?: boolean                         // Persist column order to localStorage (requires gridName)
	oncolumnreorder?: (detail: ColumnReorderDetail) => void  // Fired when column is reordered
}

// =============================================================================
// Internal Types (used within the component)
// =============================================================================

// Editing cell state
export type EditingCell = {
	rowIndex: number
	field: string
	initialSearchQuery?: string
	cursorPosition?: number
} | null

// Focused cell state (for navigate mode)
export type FocusedCell = {
	rowIndex: number
	colIndex: number
} | null

// Sort direction
export type SortDirection = "asc" | "desc"

// Sort mode - none (disabled), single column, or multi-column
export type SortMode = "none" | "single" | "multi"

// Toolbar row group (for grouped rendering)
export type ToolbarRowGroup<T> = {
	rowNum: number
	groups: { groupNum: number; items: NormalizedToolbarItem<T>[] }[]
}

// Popup position
export type PopupPosition = 'left' | 'right' | 'top'

// Connector arrow direction
export type ConnectorArrowDir = 'right' | 'left' | 'down'

// =============================================================================
// Sorting & Pagination Types
// =============================================================================

// Sort state for a single column
export type SortState = {
	column: string
	direction: SortDirection
}

// What triggered the data request
export type DataRequestTrigger = 'sort' | 'page' | 'pageSize' | 'init' | 'loadMore'

// How to handle the data response
export type DataRequestMode = 'replace' | 'append'

// Detail passed to ondatarequest callback
export type DataRequestDetail = {
	sort: SortState[]
	page: number
	pageSize: number
	trigger: DataRequestTrigger
	mode: DataRequestMode    // 'replace' for normal ops, 'append' for loadMore
	skip: number             // Items to skip (offset for server)
}

// Pagination position (can combine with | for multiple, e.g., "top-right|bottom-right")
export type PaginationPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

// Pagination labels for translation/customization
export type PaginationLabels = {
	first: string
	previous: string
	next: string
	last: string
	pageInfo: string
	itemCount: string
	perPage: string
}

export type PaginationLabelsContext = {
	currentPage: number
	totalPages: number
	totalItems: number
	pageSize: number
}

export type PaginationLabelsCallback = (context: PaginationLabelsContext) => Partial<PaginationLabels>

// Grid labels for translation/i18n
export type GridLabels = {
	// Toolbar
	rowActions: string              // Toolbar trigger button title
	inlineActionsHeader: string     // Default inline actions column header

	// Shortcuts help
	keyboardShortcuts: string       // Shortcuts help icon title

	// Pagination (defaults, can be overridden by paginationLabelsCallback)
	paginationFirst: string
	paginationPrevious: string
	paginationNext: string
	paginationLast: string
	paginationPageInfo: string      // e.g., "Page {current} of {total}"
	paginationItemCount: string     // e.g., "{count} items"
	paginationPerPage: string       // e.g., "per page"

	// Dropdown
	dropdownNoOptions: string       // "No options" - shown when filter returns empty
	dropdownSearching: string       // "Searching..." - shown during async search
}

// Summary content callback
export type SummaryContext<T> = {
	items: T[]           // Current display items (paginated)
	allItems: T[]        // All items (before pagination)
	totalItems: number
	currentPage: number
	pageSize: number
	metadata: unknown    // Server-provided metadata (aggregates, etc.)
}

export type SummaryContentCallback<T> = (context: SummaryContext<T>) => string

// =============================================================================
// Row Locking Types
// =============================================================================

// Lock information for a row
export type RowLockInfo = {
	isLocked: boolean
	lockedBy?: string        // Who locked (user name/ID)
	lockedAt?: Date | string // When locked
	reason?: string          // Why locked
	[key: string]: unknown   // Allow extra properties
}

// Edit behavior for locked rows
export type LockedRowEditBehavior =
	| 'block'      // Cannot edit (default)
	| 'allow'      // Can edit, just show visual
	| 'callback'   // Consumer decides via callback

// Row locking configuration
export type RowLockingOptions<T> = {
	// Property-based sources
	lockedMember?: keyof T                    // Field with boolean
	lockInfoMember?: keyof T                  // Field with RowLockInfo

	// Callback-based sources
	isLockedCallback?: (row: T, rowIndex: number) => boolean
	getLockInfoCallback?: (row: T, rowIndex: number) => RowLockInfo | null

	// Edit behavior
	lockedEditBehavior?: LockedRowEditBehavior
	canEditLockedCallback?: (row: T, lockInfo: RowLockInfo) => boolean

	// Visual options
	lockTooltipCallback?: (lockInfo: RowLockInfo, row: T) => string | null
}

// Event for lock changes
export type RowLockChangeDetail<T> = {
	rowId: unknown
	row: T | null
	rowIndex: number
	lockInfo: RowLockInfo | null
	source: 'property' | 'callback' | 'external'
}

// =============================================================================
// Column Resize & Persistence Types
// =============================================================================

// Width state for a single column
export type ColumnWidthState = {
	field: string
	width: string
}

// Persisted grid state (stored in localStorage)
export type GridPersistenceState = {
	columnWidths?: ColumnWidthState[]
	columnOrder?: ColumnOrderState[]
}

// Detail passed to oncolumnresize callback
export type ColumnResizeDetail = {
	field: string
	oldWidth: string
	newWidth: string
	allWidths: ColumnWidthState[]  // Same format as localStorage - can be sent to server
}

// Order state for a single column
export type ColumnOrderState = {
	field: string
	order: number
}

// Detail passed to oncolumnreorder callback
export type ColumnReorderDetail = {
	field: string
	fromIndex: number
	toIndex: number
	allOrder: ColumnOrderState[]  // Same format as localStorage - can be sent to server
}
