// =============================================================================
// Action Pipeline Adapter
// Bridge between DOM events and the action pipeline
// Enables incremental migration by checking mode before using pipeline
// =============================================================================

import type { GridContext } from '../types.js'
import { ActionPipeline, createActionPipeline, ActionExecutor } from './pipeline.js'
import { focusExecutor } from './executors/focus-executor.js'
import { navigateExecutor } from './executors/navigate-executor.js'
import { transitionExecutor } from './executors/transition-executor.js'
import { renderExecutor } from './executors/render-executor.js'
import { dropdownExecutor } from './executors/dropdown-executor.js'
import { checkboxExecutor } from './executors/checkbox-executor.js'
import { datepickerExecutor } from './executors/datepicker-executor.js'
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

		// Register all executors (cast needed as executors are type-agnostic)
		this.pipeline.registerExecutor(focusExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(navigateExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(transitionExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(renderExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(dropdownExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(checkboxExecutor as ActionExecutor<T>)
		this.pipeline.registerExecutor(datepickerExecutor as ActionExecutor<T>)
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
	 * Check if a column has a checkbox editor
	 */
	private isCheckboxEditor(colIndex: number): boolean {
		const column = this.ctx.grid.columns[colIndex]
		if (!column) return false
		return column.editor === 'checkbox'
	}

	/**
	 * Check if a column has a date editor
	 */
	private isDateEditor(colIndex: number): boolean {
		const column = this.ctx.grid.columns[colIndex]
		if (!column) return false
		return column.editor === 'date'
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

		if (!cell) return false

		// Only handle 'always' mode cells for Phase 1
		if (!this.isAlwaysMode(cell.colIndex)) return false

		const dropdownOpen = this.ctx.dropdownOpen
		const isDropdown = this.isDropdownEditor(cell.colIndex)
		const isCheckbox = this.isCheckboxEditor(cell.colIndex)

		// Check if this key should be handled by the pipeline
		if (!isPipelineKey(e.key, dropdownOpen, isDropdown, isCheckbox)) return false

		// Map the event to an action
		const action = mapKeyDownToAction(e, {
			currentCell: cell,
			dropdownOpen,
			isDropdownEditor: isDropdown,
			isCheckboxEditor: isCheckbox
		})
		if (!action) return false

		// Prevent default and dispatch
		e.preventDefault()
		e.stopPropagation()
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

		// Check what kind of click this is
		const isToggleClick = target.matches('.wg__combobox-toggle, .wg__select-toggle')
		const isDateTriggerClick = !!target.closest('.wg__date-trigger')
		const isCheckboxClick = target.matches('.wg__checkbox-input, input[type="checkbox"]')
		const isCellClick = !isToggleClick && !isDateTriggerClick && !isCheckboxClick && (
			target.matches('.wg__cell') ||
			target.closest('.wg__cell') !== null
		)

		// Get cell coordinates
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
		} else if (isDateTriggerClick) {
			// For date trigger clicks, get cell info from date editor container
			const editorContainer = target.closest('.wg__editor--date') as HTMLElement
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

		if (!cell) return false

		// Only handle 'always' mode cells
		if (!this.isAlwaysMode(cell.colIndex)) return false

		// Handle toggle clicks, date trigger clicks, checkbox clicks, and cell clicks
		if (!isToggleClick && !isDateTriggerClick && !isCheckboxClick && !isCellClick) {
			return false
		}

		const dropdownOpen = this.ctx.dropdownOpen
		const isDropdown = this.isDropdownEditor(cell.colIndex)

		// Map the event to actions
		const actions = mapMouseDownToActions(e, {
			cell,
			dropdownOpen,
			isDropdownEditor: isDropdown,
			isDateEditor: this.isDateEditor(cell.colIndex),
			isCheckboxEditor: this.isCheckboxEditor(cell.colIndex),
			isToggleClick,
			isDateTriggerClick,
			isCheckboxClick,
			isCellClick
		})

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
