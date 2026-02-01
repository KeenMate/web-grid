// =============================================================================
// DatePicker Executor
// Handles openDatePicker and closeDatePicker actions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction } from '../types.js'
import { DatePicker } from '../../datepicker/datepicker.js'
import { toISODateString, formatDate, parseFormat } from '../../datepicker/formatting.js'
import { renderCell } from '../../rendering/index.js'
import { clearEditingVisual } from '../../navigation/focus.js'

/**
 * DatePicker executor - handles date picker open/close actions
 */
export const datepickerExecutor: ActionExecutor = {
	handles: ['openDatePicker', 'closeDatePicker'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		switch (action.type) {
			case 'openDatePicker':
				executeOpenDatePicker(ctx)
				break
			case 'closeDatePicker':
				executeCloseDatePicker(ctx)
				break
		}
	}
}

/**
 * Open date picker for the currently focused cell
 */
function executeOpenDatePicker(ctx: ExecutorContext): void {
	// Get current cell - use focusedCell for 'always' mode
	const focusedCell = ctx.grid.focusedCell
	if (!focusedCell) return

	const { rowIndex, colIndex } = focusedCell
	const column = ctx.grid.columns[colIndex]
	if (!column || column.editor !== 'date') return

	// Find the date editor elements in the DOM
	const field = String(column.field)
	const cell = ctx.shadow.querySelector(
		`.wg__cell[data-row="${rowIndex}"][data-col="${colIndex}"]`
	) as HTMLElement
	if (!cell) return

	const editorContainer = cell.querySelector('.wg__editor--date') as HTMLElement
	const input = cell.querySelector('.wg__date-input') as HTMLInputElement
	if (!editorContainer || !input) return

	// Close any existing datepicker
	if (ctx.datepicker) {
		ctx.datepicker.close(true)
		ctx.datepicker = null
	}

	// Get date configuration from input data attributes
	const dateFormat = input.dataset.dateFormat || 'YYYY-MM-DD'
	const minDateStr = input.dataset.minDate
	const maxDateStr = input.dataset.maxDate
	const currentValue = input.dataset.dateValue || ''

	// Create and open the date picker
	ctx.datepicker = new DatePicker({
		dateFormat,
		minDate: minDateStr || undefined,
		maxDate: maxDateStr || undefined,
		onSelect: (date, direction) => {
			handleDateSelect(ctx, input, date, direction)
		},
		onClose: () => {
			handleDatePickerClose(ctx, rowIndex, colIndex)
		}
	})

	ctx.datepicker.open(editorContainer, currentValue || null)
}

/**
 * Handle date selection from the picker
 */
function handleDateSelect(
	ctx: ExecutorContext,
	input: HTMLInputElement,
	date: Date,
	direction?: 'down' | 'next'
): void {
	// Get the date format from input
	const dateFormat = input.dataset.dateFormat || 'YYYY-MM-DD'

	// Format and update the input value
	const formatInfo = parseFormat(dateFormat)
	input.value = formatDate(date, formatInfo)
	input.dataset.dateValue = toISODateString(date)

	// Clear datepicker reference
	ctx.datepicker = null

	// Get cell info from input's parent
	const editorContainer = input.closest('.wg__editor--date') as HTMLElement
	if (!editorContainer) return

	const rowIndex = parseInt(editorContainer.dataset.row || '0', 10)
	const field = editorContainer.dataset.field || ''

	// Commit the date value
	ctx.grid.commitEdit(rowIndex, field, toISODateString(date))

	// Navigate based on direction (Enter goes down, Tab goes next)
	if (direction === 'down') {
		ctx.dispatch({ type: 'navigate', direction: 'down' })
	} else if (direction === 'next') {
		ctx.dispatch({ type: 'navigate', direction: 'tab' })
	}
}

/**
 * Handle date picker close (without selection)
 */
function handleDatePickerClose(ctx: ExecutorContext, rowIndex: number, colIndex: number): void {
	ctx.datepicker = null

	// For 'always' mode, just re-render the cell to restore focus
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	const effectiveTrigger = column.editTrigger ?? ctx.grid.editTrigger
	if (effectiveTrigger === 'always') {
		// Just re-render to clean up any visual state
		renderCell(ctx, rowIndex, colIndex)
	} else {
		// For other modes, cancel the edit
		clearEditingVisual(ctx)
		ctx.grid.cancelEdit()
		renderCell(ctx, rowIndex, colIndex)
	}
}

/**
 * Close the date picker
 */
function executeCloseDatePicker(ctx: ExecutorContext): void {
	if (ctx.datepicker) {
		ctx.datepicker.close(true)
		ctx.datepicker = null
	}
}
