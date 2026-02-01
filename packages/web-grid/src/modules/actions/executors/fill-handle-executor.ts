// =============================================================================
// Fill Handle Executor
// Handles fill handle drag operations
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, StartFillDragAction, UpdateFillDragAction } from '../types.js'

/**
 * Fill handle executor - handles fill drag actions
 * Note: The actual fill handle drag state and visual feedback is managed
 * by the fill-handle module. This executor provides pipeline integration.
 */
export const fillHandleExecutor: ActionExecutor = {
	handles: ['startFillDrag', 'updateFillDrag', 'completeFillDrag'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		switch (action.type) {
			case 'startFillDrag':
				executeStartFillDrag(ctx, action)
				break
			case 'updateFillDrag':
				executeUpdateFillDrag(ctx, action)
				break
			case 'completeFillDrag':
				executeCompleteFillDrag(ctx)
				break
		}
	}
}

/**
 * Start a fill handle drag operation
 */
function executeStartFillDrag(_ctx: ExecutorContext, _action: StartFillDragAction): void {
	// The actual fill handle drag is managed by the fill-handle module
	// which uses document-level mouse event listeners.
	// This is a placeholder for potential future pipeline-based fill handle control.
}

/**
 * Update fill handle drag extent
 */
function executeUpdateFillDrag(_ctx: ExecutorContext, _action: UpdateFillDragAction): void {
	// Placeholder for fill handle drag update
}

/**
 * Complete fill handle drag and apply fill
 */
function executeCompleteFillDrag(_ctx: ExecutorContext): void {
	// Placeholder for fill handle completion
}
