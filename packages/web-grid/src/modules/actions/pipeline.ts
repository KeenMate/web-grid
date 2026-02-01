// =============================================================================
// Action Pipeline
// Routes actions to executors and processes child actions
// =============================================================================

import type { GridContext } from '../types.js'
import type { GridAction } from './types.js'

/**
 * Context passed to executors, extends GridContext with dispatch capability
 */
export interface ExecutorContext<T = unknown> extends GridContext<T> {
	/**
	 * Dispatch a child action to be processed after current action completes
	 */
	dispatch(action: GridAction): void
}

/**
 * Executor interface - handles a specific action type
 */
export interface ActionExecutor<T = unknown> {
	/**
	 * Action types this executor handles
	 */
	readonly handles: GridAction['type'][]

	/**
	 * Execute the action
	 * @returns Child actions to process, or void/empty array
	 */
	execute(ctx: ExecutorContext<T>, action: GridAction): GridAction[] | void
}

/**
 * Action pipeline - coordinates action dispatch and execution
 */
export class ActionPipeline<T = unknown> {
	private executors: Map<GridAction['type'], ActionExecutor<T>> = new Map()
	private ctx: GridContext<T>

	constructor(ctx: GridContext<T>) {
		this.ctx = ctx
	}

	/**
	 * Register an executor for action types
	 */
	registerExecutor(executor: ActionExecutor<T>): void {
		for (const type of executor.handles) {
			this.executors.set(type, executor)
		}
	}

	/**
	 * Dispatch an action through the pipeline
	 * Processes the action and any child actions it produces
	 */
	dispatch(action: GridAction): void {
		const queue: GridAction[] = [action]

		while (queue.length > 0) {
			const current = queue.shift()!
			const executor = this.executors.get(current.type)

			if (!executor) {
				console.warn(`[ActionPipeline] No executor for action type: ${current.type}`)
				continue
			}

			// Create executor context with dispatch capability
			// Use Object.create to preserve prototype chain (methods like escapeHtml)
			const execCtx = Object.create(this.ctx) as ExecutorContext<T>
			execCtx.dispatch = (childAction: GridAction) => {
				queue.push(childAction)
			}

			// Execute and collect child actions
			const childActions = executor.execute(execCtx, current)
			if (childActions && childActions.length > 0) {
				// Add child actions to front of queue (depth-first)
				queue.unshift(...childActions)
			}
		}
	}
}

/**
 * Create a new action pipeline with the given context
 */
export function createActionPipeline<T>(ctx: GridContext<T>): ActionPipeline<T> {
	return new ActionPipeline(ctx)
}
