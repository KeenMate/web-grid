// =============================================================================
// Transition Executor
// Handles transitionCell compound action - orchestrates cell transitions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, TransitionCellAction, RenderCellAction, FocusCellAction } from '../types.js'

/**
 * Transition executor - handles cell-to-cell transitions
 */
export const transitionExecutor: ActionExecutor = {
	handles: ['transitionCell'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		if (action.type !== 'transitionCell') return
		return executeTransition(ctx, action)
	}
}

/**
 * Execute transitionCell action
 * Produces child actions to: 1) commit edit if editing, 2) re-render old cell, 3) focus new cell
 */
function executeTransition(ctx: ExecutorContext, action: TransitionCellAction): GridAction[] {
	const { from, to, selectText } = action
	const childActions: GridAction[] = []

	// Check if we're transitioning FROM an editing cell
	const editingCell = ctx.grid.editingCell
	const isFromEditing = editingCell &&
		editingCell.rowIndex === from.rowIndex &&
		ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field) === from.colIndex

	// If moving to a different cell
	if (from.rowIndex !== to.rowIndex || from.colIndex !== to.colIndex) {
		// If the old cell was being edited, commit the edit first
		// This saves the value from the DOM input before re-rendering destroys it
		if (isFromEditing) {
			childActions.push({ type: 'commitEdit' })
		} else {
			// Just re-render the old one to remove focus visual
			const renderOld: RenderCellAction = {
				type: 'renderCell',
				target: from
			}
			childActions.push(renderOld)
		}
	}

	// Focus the new cell
	const focusNew: FocusCellAction = {
		type: 'focusCell',
		target: to,
		selectText
	}
	childActions.push(focusNew)

	return childActions
}
