// =============================================================================
// Focus Executor
// Handles focusCell and blurCell actions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, FocusCellAction, BlurCellAction } from '../types.js'
import { updateFocusVisual } from '../../navigation/index.js'
import { updateFillHandle } from '../../fill-handle/index.js'

/**
 * Focus executor - handles cell focus/blur actions
 */
export const focusExecutor: ActionExecutor = {
	handles: ['focusCell', 'blurCell'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		switch (action.type) {
			case 'focusCell':
				return executeFocusCell(ctx, action)
			case 'blurCell':
				return executeBlurCell(ctx, action)
		}
	}
}

/**
 * Execute focusCell action
 */
function executeFocusCell(ctx: ExecutorContext, action: FocusCellAction): void {
	const { rowIndex, colIndex } = action.target
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	// Check if this cell uses 'always' editTrigger
	const effectiveTrigger = column.editTrigger ?? ctx.grid.editTrigger
	const isAlwaysEditMode = effectiveTrigger === 'always'

	// Update grid state
	const oldFocus = ctx.grid.focusedCell
	ctx.grid.setFocusedCell(rowIndex, colIndex)

	// Update visual state (adds/removes focus classes)
	updateFocusVisual(ctx, oldFocus, { rowIndex, colIndex })

	// Find the cell element
	const cell = ctx.shadow.querySelector(
		`td[data-row="${rowIndex}"][data-col="${colIndex}"]`
	) as HTMLElement
	if (!cell) return

	// Focus the appropriate element
	if (isAlwaysEditMode) {
		// In 'always' mode, focus the editor input inside the cell
		// First try specific focusable inputs (combobox/autocomplete/date have wrapper divs)
		// Then fall back to .wg__editor (for text/number inputs where the input IS the .wg__editor)
		let editor = cell.querySelector(
			'.wg__combobox-input, .wg__autocomplete-input, .wg__date-input, .wg__select-trigger'
		) as HTMLElement
		if (!editor) {
			editor = cell.querySelector('.wg__editor') as HTMLElement
		}

		if (editor) {
			editor.focus({ preventScroll: true })
			// Select all text in text inputs (unless explicitly disabled)
			if (action.selectText !== false && editor instanceof HTMLInputElement && editor.type === 'text') {
				editor.select()
			}
		}
	} else {
		// Default: focus the cell itself
		cell.focus({ preventScroll: true })
	}

	// Scroll into view if needed
	cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })

	// Update fill handle position for the newly focused cell
	updateFillHandle(ctx)
}

/**
 * Execute blurCell action
 */
function executeBlurCell(ctx: ExecutorContext, _action: BlurCellAction): void {
	const oldFocus = ctx.grid.focusedCell
	ctx.grid.clearFocusedCell()
	updateFocusVisual(ctx, oldFocus, null)
}
