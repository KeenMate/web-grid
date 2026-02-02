// =============================================================================
// Edit Executor
// Handles startEdit, commitEdit, cancelEdit actions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, StartEditAction, DeleteCellAction, EscapeEditAction } from '../types.js'
import { tryStartEdit, clearEditingVisual, focusCellElement } from '../../navigation/focus.js'
import { removeDropdown } from '../../dropdown/rendering.js'
import { renderCell } from '../../rendering/index.js'

/**
 * Edit executor - handles edit lifecycle actions
 */
export const editExecutor: ActionExecutor = {
	handles: ['startEdit', 'commitEdit', 'cancelEdit', 'escapeEdit', 'deleteCell'],

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
			case 'escapeEdit':
				return executeEscapeEdit(ctx, action)
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
async function executeCommitEdit(ctx: ExecutorContext, commitEmptyRow?: boolean): Promise<void> {
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
		} else if (editor.classList.contains('wg__editor--number')) {
			// Number editor - parse to number
			const strValue = editor.value.trim()
			if (strValue === '') {
				value = null
			} else {
				const num = parseFloat(strValue)
				value = isNaN(num) ? strValue : num
			}
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

	// Commit the edit and await it (may be async with validation callbacks)
	await ctx.grid.commitEdit(rowIndex, field, value, commitEmptyRow)

	// Re-render the cell (now has correct value with formatCallback applied)
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
 * Handle Escape key - behavior depends on search text state
 * Phase 'dropdown': If search text exists, clear it and keep dropdown open; otherwise close and exit
 * Phase 'edit': Cancel edit entirely and return to display mode
 */
function executeEscapeEdit(ctx: ExecutorContext, action: EscapeEditAction): GridAction[] | void {
	const editingCell = ctx.grid.editingCell
	const focusedCell = ctx.grid.focusedCell

	if (action.phase === 'dropdown') {
		// Get cell info and editor type
		const cellInfo = editingCell || focusedCell
		if (!cellInfo) return

		const colIndex = editingCell
			? ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field)
			: focusedCell?.colIndex ?? -1
		const column = ctx.grid.columns[colIndex]
		const editorType = column?.editor

		// For select: check if there's filter text (type-to-filter)
		if (editorType === 'select' && ctx.filterText) {
			ctx.filterText = ''
			// Refresh dropdown by closing and reopening (shows all options)
			removeDropdown(ctx)
			ctx.dispatch({ type: 'openDropdown' })
			return // Stay in edit mode with dropdown open
		}

		// For autocomplete/combobox: check if input has search text (different from original)
		if (editorType === 'autocomplete' || editorType === 'combobox') {
			const cell = ctx.shadow.querySelector(
				`.wg__cell[data-row="${cellInfo.rowIndex}"][data-col="${colIndex}"]`
			) as HTMLElement
			const input = cell?.querySelector('.wg__combobox-input, .wg__autocomplete-input') as HTMLInputElement

			// Get original value from row data
			const row = ctx.grid.displayItems[cellInfo.rowIndex]
			const field = column?.field
			const originalValue = row && field ? String((row as Record<string, unknown>)[field as string] ?? '') : ''
			const currentValue = input?.value ?? ''

			// If input has been modified (different from original), restore original and refresh dropdown
			if (input && currentValue !== originalValue) {
				ctx.filterText = ''
				input.value = originalValue  // Restore original, not clear to empty
				input.focus()
				input.select()  // Select all so user can easily retype
				// Refresh dropdown by closing and reopening (shows all options with empty filter)
				removeDropdown(ctx)
				ctx.dispatch({ type: 'openDropdown' })
				return // Stay in edit mode with dropdown open
			}
		}

		// No search text OR select editor: close dropdown AND exit edit mode
		removeDropdown(ctx)
		if (editingCell) {
			clearEditingVisual(ctx)
			ctx.grid.cancelEdit()
			renderCell(ctx, cellInfo.rowIndex, colIndex)
			focusCellElement(ctx, cellInfo.rowIndex, colIndex)
		}
		return
	}

	// Phase 2: Cancel edit entirely
	if (editingCell) {
		const { rowIndex, field } = editingCell
		const colIndex = ctx.grid.columns.findIndex(c => String(c.field) === field)

		// Close dropdown/datepicker if open
		if (ctx.dropdownOpen) {
			removeDropdown(ctx)
		}
		if (ctx.datepicker) {
			ctx.datepicker.close(true)
			ctx.datepicker = null
		}

		// Clear visual state and cancel edit
		clearEditingVisual(ctx)
		ctx.grid.cancelEdit()

		// Re-render the cell and focus it
		if (colIndex >= 0) {
			renderCell(ctx, rowIndex, colIndex)
			focusCellElement(ctx, rowIndex, colIndex)
		}
	} else if (focusedCell) {
		// No active edit, just clear focus
		const { rowIndex, colIndex } = focusedCell
		ctx.grid.clearFocusedCell()
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
