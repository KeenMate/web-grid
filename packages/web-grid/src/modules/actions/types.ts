// =============================================================================
// Action Types for Event Pipeline
// Discriminated union of all actions that can flow through the pipeline
// =============================================================================

/**
 * Cell coordinates (row and column indices)
 */
export type CellCoordinates = {
	rowIndex: number
	colIndex: number
}

/**
 * Navigation direction for keyboard navigation
 */
export type NavigationDirection =
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'tab'
	| 'tab-back'
	| 'enter'
	| 'home'
	| 'end'
	| 'page-up'
	| 'page-down'

// =============================================================================
// State-Change Actions
// =============================================================================

/**
 * Focus a cell - set focused cell state and focus DOM element
 */
export type FocusCellAction = {
	type: 'focusCell'
	target: CellCoordinates
	/** Select all text in editor (default: true for 'always' mode) */
	selectText?: boolean
}

/**
 * Blur/unfocus the current cell
 */
export type BlurCellAction = {
	type: 'blurCell'
}

/**
 * Start editing a cell
 */
export type StartEditAction = {
	type: 'startEdit'
	target: CellCoordinates
	initialSearchQuery?: string
	cursorPosition?: number
}

/**
 * Commit current editor value
 */
export type CommitEditAction = {
	type: 'commitEdit'
	/** Commit empty row if applicable */
	commitEmptyRow?: boolean
}

/**
 * Cancel editing and discard changes
 */
export type CancelEditAction = {
	type: 'cancelEdit'
}

/**
 * Select a range of cells
 */
export type SelectCellRangeAction = {
	type: 'selectCellRange'
	start: CellCoordinates
	end: CellCoordinates
}

/**
 * Clear all selections (row, column, cell)
 */
export type ClearSelectionAction = {
	type: 'clearSelection'
}

/**
 * Navigate from current position in a direction
 */
export type NavigateAction = {
	type: 'navigate'
	direction: NavigationDirection
	/** Current position (if not provided, uses grid.focusedCell) */
	from?: CellCoordinates
	/** Hold Ctrl key (for Home/End to go to extremes) */
	ctrlKey?: boolean
}

// =============================================================================
// Effect Actions
// =============================================================================

/**
 * Open dropdown list for current editor
 */
export type OpenDropdownAction = {
	type: 'openDropdown'
}

/**
 * Close dropdown list
 */
export type CloseDropdownAction = {
	type: 'closeDropdown'
}

/**
 * Toggle dropdown open/closed
 */
export type ToggleDropdownAction = {
	type: 'toggleDropdown'
}

/**
 * Navigate within dropdown (up/down through options)
 */
export type DropdownNavigateAction = {
	type: 'dropdownNavigate'
	direction: 'up' | 'down'
}

/**
 * Select the highlighted dropdown option
 */
export type DropdownSelectAction = {
	type: 'dropdownSelect'
	/** Move to next cell after selection */
	moveAfterSelect?: boolean
	/** Commit empty row if applicable */
	commitEmptyRow?: boolean
	/** Navigate after selecting (for Tab) */
	thenNavigate?: NavigationDirection
}

/**
 * Open date picker for current date editor
 */
export type OpenDatePickerAction = {
	type: 'openDatePicker'
}

/**
 * Close date picker
 */
export type CloseDatePickerAction = {
	type: 'closeDatePicker'
}

/**
 * Re-render a single cell's DOM
 */
export type RenderCellAction = {
	type: 'renderCell'
	target: CellCoordinates
	/** Focus editor after rendering */
	focusEditor?: boolean
	/** Cursor position for text inputs */
	cursorPosition?: number
	/** Initial search query for type-to-start */
	initialSearchQuery?: string
}

// =============================================================================
// Compound Actions (produce child actions)
// =============================================================================

/**
 * Transition focus from one cell to another
 * Compound action that handles: render old cell -> focus new cell
 */
export type TransitionCellAction = {
	type: 'transitionCell'
	from: CellCoordinates
	to: CellCoordinates
	/** Select text in target editor */
	selectText?: boolean
}

// =============================================================================
// Union Type
// =============================================================================

/**
 * All possible actions in the grid event pipeline
 */
export type GridAction =
	// State-change actions
	| FocusCellAction
	| BlurCellAction
	| StartEditAction
	| CommitEditAction
	| CancelEditAction
	| SelectCellRangeAction
	| ClearSelectionAction
	| NavigateAction
	// Effect actions
	| OpenDropdownAction
	| CloseDropdownAction
	| ToggleDropdownAction
	| DropdownNavigateAction
	| DropdownSelectAction
	| OpenDatePickerAction
	| CloseDatePickerAction
	| RenderCellAction
	// Compound actions
	| TransitionCellAction
