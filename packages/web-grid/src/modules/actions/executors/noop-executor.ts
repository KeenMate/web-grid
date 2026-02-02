// =============================================================================
// Noop Executor
// Handles noop action - consumes event but does nothing
// =============================================================================

import type { ActionExecutor } from '../pipeline.js'

/**
 * Noop executor - handles noop action by doing nothing
 * Used to consume events that should not propagate to other handlers
 */
export const noopExecutor: ActionExecutor = {
	handles: ['noop'],

	execute(): void {
		// Intentionally empty - just consume the event
	}
}
