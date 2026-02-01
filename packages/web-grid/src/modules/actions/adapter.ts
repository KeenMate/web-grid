// =============================================================================
// Action Pipeline Adapter
// Bridge between DOM events and the action pipeline
// Enables incremental migration by checking mode before using pipeline
// =============================================================================

import type { GridContext } from '../types.js'
import { ActionPipeline, createActionPipeline } from './pipeline.js'
import { focusExecutor } from './executors/focus-executor.js'
import { navigateExecutor } from './executors/navigate-executor.js'
import { transitionExecutor } from './executors/transition-executor.js'
import { renderExecutor } from './executors/render-executor.js'
import { dropdownExecutor } from './executors/dropdown-executor.js'
import { mapKeyDownToAction, isPipelineKey, mapMouseDownToActions } from './event-mapper.js'
import type { CellCoordinates } from './types.js'

/**
 * Adapter that bridges GridElement event handlers with the action pipeline.
 * For Phase 1, only handles 'always' editTrigger mode.
 */
export class ActionPipelineAdapter<T = unknown> {
	private pipeline: ActionPipeline<T>
	private ctx: GridContext<T>

	constructor(ctx: GridContext<T>) {
		this.ctx = ctx
		this.pipeline = createActionPipeline(ctx)

		// Register all executors
		this.pipeline.registerExecutor(focusExecutor)
		this.pipeline.registerExecutor(navigateExecutor)
		this.pipeline.registerExecutor(transitionExecutor)
		this.pipeline.registerExecutor(renderExecutor)
		this.pipeline.registerExecutor(dropdownExecutor)
	}

	/**
	 * Check if a cell is in 'always' editTrigger mode
	 */
	private isAlwaysMode(colIndex: number): boolean {
		const column = this.ctx.grid.columns[colIndex]
		if (!column) return false
		const effectiveTrigger = column.editTrigger ?? this.ctx.grid.editTrigger
		return effectiveTrigger === 'always'
	}

	/**
	 * Check if a column has a dropdown editor (select, combobox, autocomplete)
	 */
	private isDropdownEditor(colIndex: number): boolean {
		const column = this.ctx.grid.columns[colIndex]
		if (!column) return false
		const editor = column.editor
		return editor === 'select' || editor === 'combobox' || editor === 'autocomplete'
	}

	/**
	 * Get the current cell coordinates from the event target
	 */
	private getCellFromTarget(target: HTMLElement): CellCoordinates | null {
		// Target could be an editor inside a cell, or the cell itself
		const cell = target.closest('.wg__cell') as HTMLElement
		if (!cell) return null

		const rowIndex = parseInt(cell.dataset.row || '', 10)
		const colIndex = parseInt(cell.dataset.col || '', 10)

		if (isNaN(rowIndex) || isNaN(colIndex)) return null

		return { rowIndex, colIndex }
	}

	/**
	 * Try to handle a keydown event via the pipeline.
	 * Returns true if the event was handled, false to fall through to existing handlers.
	 */
	tryHandleKeyDown(e: KeyboardEvent): boolean {
		const target = e.target as HTMLElement
		const cell = this.getCellFromTarget(target)

		console.log('[Pipeline] tryHandleKeyDown:', e.key, 'target:', target.className, 'cell:', cell)

		if (!cell) {
			console.log('[Pipeline] No cell found, returning false')
			return false
		}

		// Only handle 'always' mode cells for Phase 1
		if (!this.isAlwaysMode(cell.colIndex)) {
			console.log('[Pipeline] Not always mode, returning false')
			return false
		}

		const dropdownOpen = this.ctx.dropdownOpen
		const isDropdown = this.isDropdownEditor(cell.colIndex)

		console.log('[Pipeline] dropdownOpen:', dropdownOpen, 'isDropdown:', isDropdown)

		// Check if this key should be handled by the pipeline
		if (!isPipelineKey(e.key, dropdownOpen, isDropdown)) {
			console.log('[Pipeline] Not a pipeline key, returning false')
			return false
		}

		// Map the event to an action
		const action = mapKeyDownToAction(e, {
			currentCell: cell,
			dropdownOpen,
			isDropdownEditor: isDropdown
		})
		console.log('[Pipeline] Mapped action:', action)
		if (!action) return false

		// Prevent default and dispatch
		e.preventDefault()
		e.stopPropagation()
		console.log('[Pipeline] Dispatching action:', action.type)
		this.pipeline.dispatch(action)

		return true
	}

	/**
	 * Try to handle a focus event via the pipeline.
	 * Returns true if the event was handled.
	 */
	tryHandleFocus(e: FocusEvent): boolean {
		const target = e.target as HTMLElement
		const cell = this.getCellFromTarget(target)

		if (!cell) return false

		// Only handle 'always' mode cells for Phase 1
		if (!this.isAlwaysMode(cell.colIndex)) {
			return false
		}

		// Check if focus is on an editor element
		const isEditorFocus = target.matches(
			'.wg__editor, .wg__combobox-input, .wg__autocomplete-input, .wg__date-input, .wg__select-trigger'
		)

		if (!isEditorFocus) {
			return false
		}

		// Update focus state if cell changed
		const currentFocus = this.ctx.grid.focusedCell
		if (!currentFocus || currentFocus.rowIndex !== cell.rowIndex || currentFocus.colIndex !== cell.colIndex) {
			this.pipeline.dispatch({
				type: 'focusCell',
				target: cell,
				selectText: false  // Don't re-select on focus events (already focused)
			})
		}

		return true
	}

	/**
	 * Try to handle a mousedown event via the pipeline.
	 * Returns true if the event was handled, false to fall through to existing handlers.
	 */
	tryHandleMouseDown(e: MouseEvent): boolean {
		const target = e.target as HTMLElement

		// Check if this is a toggle click
		const isToggleClick = target.matches('.wg__combobox-toggle, .wg__select-toggle')

		// Get cell from toggle's parent editor container or from cell
		let cell: CellCoordinates | null = null

		if (isToggleClick) {
			// For toggle clicks, get cell info from editor container
			const editorContainer = target.closest('.wg__editor--select, .wg__editor--combobox, .wg__editor--autocomplete') as HTMLElement
			if (editorContainer) {
				const rowIndex = parseInt(editorContainer.dataset.row || '', 10)
				const field = editorContainer.dataset.field || ''
				const colIndex = this.ctx.grid.columns.findIndex(c => String(c.field) === field)
				if (!isNaN(rowIndex) && colIndex >= 0) {
					cell = { rowIndex, colIndex }
				}
			}
		} else {
			cell = this.getCellFromTarget(target)
		}

		console.log('[Pipeline] tryHandleMouseDown: isToggle:', isToggleClick, 'cell:', cell)

		if (!cell) return false

		// Only handle 'always' mode cells
		if (!this.isAlwaysMode(cell.colIndex)) {
			console.log('[Pipeline] Not always mode, returning false')
			return false
		}

		// Only handle toggle clicks for now (cell clicks work via focus events)
		if (!isToggleClick) {
			return false
		}

		const dropdownOpen = this.ctx.dropdownOpen
		const isDropdown = this.isDropdownEditor(cell.colIndex)

		// Map the event to actions
		const actions = mapMouseDownToActions(e, {
			cell,
			dropdownOpen,
			isDropdownEditor: isDropdown,
			isToggleClick
		})

		console.log('[Pipeline] Mapped mouse actions:', actions.map(a => a.type))

		if (actions.length === 0) return false

		// Prevent default and dispatch all actions
		e.preventDefault()
		e.stopPropagation()

		for (const action of actions) {
			this.pipeline.dispatch(action)
		}

		return true
	}
}

/**
 * Create an action pipeline adapter for a grid context
 */
export function createActionPipelineAdapter<T>(ctx: GridContext<T>): ActionPipelineAdapter<T> {
	return new ActionPipelineAdapter(ctx)
}
