// =============================================================================
// Checkbox Executor
// Handles toggleCheckbox action
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, ToggleCheckboxAction } from '../types.js'
import { renderCell } from '../../rendering/index.js'

/**
 * Checkbox executor - handles checkbox toggle actions
 */
export const checkboxExecutor: ActionExecutor = {
	handles: ['toggleCheckbox'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		if (action.type !== 'toggleCheckbox') return
		executeToggleCheckbox(ctx, action)
	}
}

/**
 * Toggle checkbox value
 * Updates the draft row directly WITHOUT exiting edit mode.
 * This allows users to toggle the checkbox multiple times before committing.
 */
function executeToggleCheckbox(ctx: ExecutorContext, action: ToggleCheckboxAction): void {
	const { rowIndex, colIndex } = action.target
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	const field = String(column.field)
	const item = ctx.grid.displayItems[rowIndex]
	if (!item) return

	const opts = column.editorOptions || {}
	const trueValue = opts.trueValue ?? true
	const falseValue = opts.falseValue ?? false
	// Use getCellRawValue to get value from draft row if it exists
	const currentValue = ctx.grid.getCellRawValue(item, rowIndex, field)
	const newValue = currentValue === trueValue ? falseValue : trueValue

	// Update draft row directly WITHOUT exiting edit mode
	// This allows checkbox to be toggled multiple times while staying in edit mode
	ctx.grid.updateDraftValue(rowIndex, field, newValue)

	// Re-render the cell to show new checkbox state
	renderCell(ctx, rowIndex, colIndex)
}
