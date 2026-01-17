// =============================================================================
// @keenmate/web-grid - Main Entry Point
// =============================================================================

// Web component (auto-registers <web-grid>)
export { GridElement } from './web-component.js'

// Core logic class (for advanced usage)
export { WebGrid } from './grid.js'

// All types
export type {
	// Editor types
	EditorType,
	EditTrigger,
	OptionsLoadTrigger,
	DateOutputFormat,
	EditorOption,
	EditorOptions,
	CustomEditorContext,

	// Validation types
	CellValidationState,
	ValidationResult,
	BeforeCommitContext,
	BeforeCommitResult,

	// Column & rendering
	Column,
	CellRenderCallback,
	RowChangeDetail,

	// Toolbar types
	PredefinedToolbarItemType,
	ToolbarPosition,
	ToolbarTooltip,
	RowToolbarItem,
	RowToolbarConfig,
	NormalizedToolbarItem,
	ToolbarClickDetail,
	RowActionType,
	RowActionClickDetail,

	// Context menu types
	ContextMenuContext,
	ContextMenuItem,

	// Props
	QuickGridProps,

	// Sorting & Pagination types
	SortState,
	DataRequestDetail,
	DataRequestTrigger,

	// Labels/i18n
	GridLabels,

	// Row locking types
	RowLockInfo,
	RowLockingOptions,
	RowLockChangeDetail,
	LockedRowEditBehavior,

	// Column resize types
	ColumnWidthState,
	ColumnResizeDetail,

	// Column reorder types
	ColumnOrderState,
	ColumnReorderDetail,

	// Fill handle types
	FillDragDetail,
	FillDirection,

	// Row selection types
	RangeShortcut,
	RangeShortcutContext,

	// Cell range selection types
	CellSelectionMode,
	CellRange,
	CellSelectionChangeDetail,

	// Paste types
	PasteMode,
	PasteColumnMapping,
	BeforePasteDetail,
	PasteCellResult,
	PasteDetail,
	CreateRowCallback,

	// Internal types (exposed for advanced usage)
	EditingCell,
	FocusedCell,
	SortDirection,
	ToolbarRowGroup,
	PopupPosition,
	ConnectorArrowDir
} from './types.js'

// Default export
export { GridElement as default } from './web-component.js'
