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
	const currentValue = (item as Record<string, unknown>)[field]
	const newValue = currentValue === trueValue ? falseValue : trueValue

	// Commit the toggle
	ctx.grid.commitEdit(rowIndex, field, newValue)

	// Re-render the cell to show new checkbox state
	renderCell(ctx, rowIndex, colIndex)
}
