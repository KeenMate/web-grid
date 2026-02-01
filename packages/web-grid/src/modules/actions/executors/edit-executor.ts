// =============================================================================
// Edit Executor
// Handles startEdit, commitEdit, cancelEdit actions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, StartEditAction, DeleteCellAction } from '../types.js'
import { tryStartEdit, clearEditingVisual } from '../../navigation/focus.js'
import { removeDropdown } from '../../dropdown/rendering.js'
import { renderCell } from '../../rendering/index.js'

/**
 * Edit executor - handles edit lifecycle actions
 */
export const editExecutor: ActionExecutor = {
	handles: ['startEdit', 'commitEdit', 'cancelEdit', 'deleteCell'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		switch (action.type) {
			case 'startEdit':
				executeStartEdit(ctx, action)
				break
			case 'commitEdit':
				executeCommitEdit(ctx, action.commitEmptyRow)
				break
			case 'cancelEdit':
				executeCancelEdit(ctx)
				break
			case 'deleteCell':
				executeDeleteCell(ctx, action)
				break
		}
	}
}

/**
 * Start editing a cell
 */
function executeStartEdit(ctx: ExecutorContext, action: StartEditAction): void {
	const { rowIndex, colIndex } = action.target
	tryStartEdit(ctx, rowIndex, colIndex, {
		initialSearchQuery: action.initialSearchQuery,
		cursorPosition: action.cursorPosition
	})
}

/**
 * Commit the current editor and optionally navigate
 */
function executeCommitEdit(ctx: ExecutorContext, commitEmptyRow?: boolean): void {
	const editingCell = ctx.grid.editingCell
	if (!editingCell) return

	const { rowIndex, field } = editingCell
	const colIndex = ctx.grid.columns.findIndex(c => String(c.field) === field)
	if (colIndex < 0) return

	// Find the editor element
	const cell = ctx.shadow.querySelector(
		`.wg__cell[data-row="${rowIndex}"][data-col="${colIndex}"]`
	) as HTMLElement
	if (!cell) return

	const editor = cell.querySelector(
		'.wg__editor, .wg__combobox-input, .wg__autocomplete-input, .wg__date-input, .wg__select-trigger'
	) as HTMLInputElement | HTMLSelectElement
	if (!editor) return

	// Get the value based on editor type
	let value: unknown
	if (editor instanceof HTMLInputElement) {
		if (editor.type === 'checkbox') {
			value = editor.checked
		} else if (editor.classList.contains('wg__date-input')) {
			// Date editor - use the stored date value
			value = editor.dataset.dateValue || editor.value
		} else {
			value = editor.value
		}
	} else if (editor instanceof HTMLSelectElement) {
		value = editor.value
	} else {
		// Select trigger - get from data attribute
		value = (editor as HTMLElement).dataset.value || ''
	}

	// Close dropdown if open
	if (ctx.dropdownOpen) {
		removeDropdown(ctx)
	}

	// Clear visual state
	clearEditingVisual(ctx)

	// Commit the edit
	ctx.grid.commitEdit(rowIndex, field, value, commitEmptyRow)

	// Re-render the cell
	renderCell(ctx, rowIndex, colIndex)
}

/**
 * Cancel editing and discard changes
 */
function executeCancelEdit(ctx: ExecutorContext): void {
	const editingCell = ctx.grid.editingCell
	if (!editingCell) return

	const { rowIndex, field } = editingCell
	const colIndex = ctx.grid.columns.findIndex(c => String(c.field) === field)

	// Close dropdown if open
	if (ctx.dropdownOpen) {
		removeDropdown(ctx)
	}

	// Clear visual state
	clearEditingVisual(ctx)

	// Cancel the edit
	ctx.grid.cancelEdit()

	// Re-render the cell if we have valid coordinates
	if (colIndex >= 0) {
		renderCell(ctx, rowIndex, colIndex)
	}
}

/**
 * Delete/clear cell content
 */
function executeDeleteCell(ctx: ExecutorContext, action: DeleteCellAction): void {
	// Get target cell - use action target or focused cell
	const target = action.target || ctx.grid.focusedCell
	if (!target) return

	const { rowIndex, colIndex } = target
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	// Check if cell is editable
	if (!ctx.grid.isCellEditable(column)) return

	const field = String(column.field)

	// Clear the cell value
	ctx.grid.commitEdit(rowIndex, field, null)

	// Re-render the cell
	renderCell(ctx, rowIndex, colIndex)
}
