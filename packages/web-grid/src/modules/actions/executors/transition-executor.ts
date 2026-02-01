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
 * Produces child actions to: 1) re-render old cell, 2) focus new cell
 */
function executeTransition(_ctx: ExecutorContext, action: TransitionCellAction): GridAction[] {
	const { from, to, selectText } = action
	const childActions: GridAction[] = []

	// If moving to a different cell, re-render the old one to remove focus visual
	if (from.rowIndex !== to.rowIndex || from.colIndex !== to.colIndex) {
		const renderOld: RenderCellAction = {
			type: 'renderCell',
			target: from
		}
		childActions.push(renderOld)
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
