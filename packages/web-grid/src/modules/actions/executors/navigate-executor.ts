// =============================================================================
// Navigate Executor
// Handles navigate actions - calculates target cell and produces transition action
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, NavigateAction, TransitionCellAction, RenderCellAction, CellCoordinates } from '../types.js'

/**
 * Navigate executor - handles keyboard navigation
 */
export const navigateExecutor: ActionExecutor = {
	handles: ['navigate'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		if (action.type !== 'navigate') return
		return executeNavigate(ctx, action)
	}
}

/**
 * Execute navigate action - calculate target and produce transition action
 */
function executeNavigate(ctx: ExecutorContext, action: NavigateAction): GridAction[] | void {
	const from = action.from ?? ctx.grid.focusedCell
	if (!from) return

	const target = calculateTarget(ctx, from, action)

	// Check if we're currently editing this cell
	const fromColumn = ctx.grid.columns[from.colIndex]
	const fromField = fromColumn ? String(fromColumn.field) : ''
	const isEditing = ctx.grid.editingCell &&
		ctx.grid.editingCell.rowIndex === from.rowIndex &&
		ctx.grid.editingCell.field === fromField

	// If no target (e.g., Enter on last row, Tab on last cell), still commit if editing
	if (!target) {
		if (isEditing) {
			// Commit, re-render, and keep focus on current cell
			return [
				{ type: 'commitEdit' },
				{ type: 'renderCell', target: from },
				{ type: 'focusCell', target: from, selectText: false }
			]
		}
		return
	}

	// If target is same as source, no transition needed
	if (target.rowIndex === from.rowIndex && target.colIndex === from.colIndex) {
		return
	}

	// Return transition action
	const transitionAction: TransitionCellAction = {
		type: 'transitionCell',
		from,
		to: target,
		selectText: true
	}

	return [transitionAction]
}

/**
 * Calculate the target cell based on direction
 */
function calculateTarget(
	ctx: ExecutorContext,
	from: CellCoordinates,
	action: NavigateAction
): CellCoordinates | null {
	const { direction, ctrlKey } = action
	const { rowIndex, colIndex } = from
	const columns = ctx.grid.columns
	const displayItems = ctx.grid.displayItems
	const maxRow = displayItems.length - 1
	const maxCol = columns.length - 1

	// For Tab navigation, use editable columns only
	const editableCols = ctx.grid.getEditableColumns()

	// Clear tab traversal tracking on non-tab/non-enter navigation (arrow keys, etc.)
	if (direction !== 'tab' && direction !== 'tab-back' && direction !== 'enter') {
		ctx.grid.tabTraversalStartColIndex = null
	}

	switch (direction) {
		case 'up':
			if (rowIndex > 0) {
				return { rowIndex: rowIndex - 1, colIndex }
			}
			break

		case 'down':
			if (rowIndex < maxRow) {
				return { rowIndex: rowIndex + 1, colIndex }
			}
			break

		case 'left':
			if (colIndex > 0) {
				return { rowIndex, colIndex: colIndex - 1 }
			}
			break

		case 'right':
			if (colIndex < maxCol) {
				return { rowIndex, colIndex: colIndex + 1 }
			}
			break

		case 'tab': {
			// Read-only grid: traverse all columns, wrapping to next row
			if (editableCols.length === 0) {
				if (colIndex < maxCol) {
					return { rowIndex, colIndex: colIndex + 1 }
				} else if (rowIndex < maxRow) {
					return { rowIndex: rowIndex + 1, colIndex: 0 }
				}
				break
			}

			// Track tab traversal start for Excel-like Enter behavior
			if (ctx.grid.tabTraversalStartColIndex === null) {
				ctx.grid.tabTraversalStartColIndex = colIndex
			}
			// Find current position in editable columns
			const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

			if (currentEditableIndex >= 0 && currentEditableIndex < editableCols.length - 1) {
				// Move to next editable column in same row
				return { rowIndex, colIndex: editableCols[currentEditableIndex + 1].index }
			} else if (currentEditableIndex === -1 && editableCols.length > 0) {
				// Not on an editable column, go to first editable
				return { rowIndex, colIndex: editableCols[0].index }
			} else if (rowIndex < maxRow) {
				// Last editable column - wrap to first editable of next row
				return { rowIndex: rowIndex + 1, colIndex: editableCols[0].index }
			} else if (ctx.grid.isEmptyRowIndex(rowIndex)) {
				// On empty row's last cell - wrap to first editable cell of same row
				return { rowIndex, colIndex: editableCols[0].index }
			}
			break
		}

		case 'tab-back': {
			// Read-only grid: traverse all columns backwards, wrapping to previous row
			if (editableCols.length === 0) {
				if (colIndex > 0) {
					return { rowIndex, colIndex: colIndex - 1 }
				} else if (rowIndex > 0) {
					return { rowIndex: rowIndex - 1, colIndex: maxCol }
				}
				break
			}

			// Track tab traversal start for Excel-like Enter behavior
			if (ctx.grid.tabTraversalStartColIndex === null) {
				ctx.grid.tabTraversalStartColIndex = colIndex
			}
			// Find current position in editable columns
			const currentEditableIndex = editableCols.findIndex(ec => ec.index === colIndex)

			if (currentEditableIndex > 0) {
				// Move to previous editable column in same row
				return { rowIndex, colIndex: editableCols[currentEditableIndex - 1].index }
			} else if (rowIndex > 0) {
				// First editable column - wrap to last editable of previous row
				return { rowIndex: rowIndex - 1, colIndex: editableCols[editableCols.length - 1].index }
			}
			break
		}

		case 'enter': {
			// Excel-like: Enter after Tab returns to the column where Tab started
			const targetCol = ctx.grid.tabTraversalStartColIndex ?? colIndex
			ctx.grid.tabTraversalStartColIndex = null
			if (rowIndex < maxRow) {
				return { rowIndex: rowIndex + 1, colIndex: targetCol }
			}
			break
		}

		case 'home':
			if (ctrlKey) {
				// Ctrl+Home - go to first cell
				return { rowIndex: 0, colIndex: 0 }
			}
			// Home - go to first column in same row
			return { rowIndex, colIndex: 0 }

		case 'end':
			if (ctrlKey) {
				// Ctrl+End - go to last cell
				return { rowIndex: maxRow, colIndex: maxCol }
			}
			// End - go to last column in same row
			return { rowIndex, colIndex: maxCol }

		case 'page-up':
			if (ctrlKey) {
				// Ctrl+PageUp - go to first row (same column)
				return { rowIndex: 0, colIndex }
			}
			// PageUp - move up 10 rows
			return { rowIndex: Math.max(0, rowIndex - 10), colIndex }

		case 'page-down':
			if (ctrlKey) {
				// Ctrl+PageDown - go to last row (same column)
				return { rowIndex: maxRow, colIndex }
			}
			// PageDown - move down 10 rows
			return { rowIndex: Math.min(maxRow, rowIndex + 10), colIndex }
	}

	return null
}
