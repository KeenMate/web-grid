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
