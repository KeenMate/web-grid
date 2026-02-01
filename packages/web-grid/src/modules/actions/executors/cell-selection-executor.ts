// =============================================================================
// Cell Selection Executor
// Handles startCellSelection action for drag-to-select functionality
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, StartCellSelectionAction } from '../types.js'
import { handleCellMouseDown } from '../../cell-selection/index.js'

/**
 * Cell selection executor - handles start of cell range selection
 */
export const cellSelectionExecutor: ActionExecutor = {
	handles: ['startCellSelection'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		if (action.type === 'startCellSelection') {
			return executeStartCellSelection(ctx, action)
		}
	}
}

/**
 * Execute startCellSelection action
 */
function executeStartCellSelection(ctx: ExecutorContext, action: StartCellSelectionAction): void {
	// Call existing cell selection handler with synthetic mouse event info
	handleCellMouseDown(ctx, action.rowIndex, action.colIndex, {
		clientX: action.clientX,
		clientY: action.clientY,
		shiftKey: action.shiftKey
	} as MouseEvent)
}
