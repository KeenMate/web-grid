// =============================================================================
// Render Executor
// Handles renderCell actions - updates cell DOM
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, RenderCellAction } from '../types.js'
import { renderCell } from '../../rendering/index.js'

/**
 * Render executor - handles cell rendering actions
 */
export const renderExecutor: ActionExecutor = {
	handles: ['renderCell'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		if (action.type !== 'renderCell') return
		executeRenderCell(ctx, action)
	}
}

/**
 * Execute renderCell action
 * Delegates to existing renderCell() function from rendering module
 */
function executeRenderCell(ctx: ExecutorContext, action: RenderCellAction): void {
	const { target, focusEditor, cursorPosition, initialSearchQuery } = action

	renderCell(ctx, target.rowIndex, target.colIndex, {
		focusEditor,
		cursorPosition,
		initialSearchQuery
	})
}
