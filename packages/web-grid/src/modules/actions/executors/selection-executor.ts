// =============================================================================
// Selection Executor
// Handles row selection, column selection, clear selection
// Note: Cell range drag selection is handled separately in cell-selection module
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, SelectRowAction, SelectColumnAction } from '../types.js'
import { removeRangeBorder } from '../../cell-selection/index.js'
import { removeRowSelectionBorders, removeColumnSelectionBorders } from '../../selection-border/index.js'
import { removeFillHandle } from '../../fill-handle/index.js'

/**
 * Selection executor - handles selection actions
 */
export const selectionExecutor: ActionExecutor = {
	handles: ['selectRow', 'selectColumn', 'clearSelection'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		switch (action.type) {
			case 'selectRow':
				executeSelectRow(ctx, action)
				break
			case 'selectColumn':
				executeSelectColumn(ctx, action)
				break
			case 'clearSelection':
				executeClearSelection(ctx)
				break
		}
	}
}

/**
 * Select a row
 */
function executeSelectRow(ctx: ExecutorContext, action: SelectRowAction): void {
	const { rowIndex, addToSelection, extendSelection } = action

	// Clear other selection types
	if (ctx.grid.selectedColumns.length > 0) {
		ctx.grid.clearColumnSelection()
	}
	if (ctx.grid.selectedCellRange) {
		ctx.grid.clearCellSelection()
		removeRangeBorder()
		removeFillHandle()
	}

	if (extendSelection && ctx.grid.selectedRows.length > 0) {
		// Extend selection from last selected row to this row
		ctx.grid.selectRow(rowIndex, 'range')
	} else if (addToSelection) {
		// Toggle this row in selection
		ctx.grid.selectRow(rowIndex, 'toggle')
	} else {
		// Single row selection (replace existing)
		ctx.grid.selectRow(rowIndex, 'replace')
	}

	// Update visual
	updateRowSelectionVisual(ctx)
}

/**
 * Select a column
 */
function executeSelectColumn(ctx: ExecutorContext, action: SelectColumnAction): void {
	const { colIndex, addToSelection, extendSelection } = action

	// Clear other selection types
	if (ctx.grid.selectedRows.length > 0) {
		ctx.grid.clearSelection()
	}
	if (ctx.grid.selectedCellRange) {
		ctx.grid.clearCellSelection()
		removeRangeBorder()
		removeFillHandle()
	}

	if (extendSelection && ctx.grid.selectedColumns.length > 0) {
		// Extend selection from last selected column to this column
		ctx.grid.selectColumn(colIndex, 'range')
	} else if (addToSelection) {
		// Toggle this column in selection
		ctx.grid.selectColumn(colIndex, 'toggle')
	} else {
		// Single column selection (replace existing)
		ctx.grid.selectColumn(colIndex, 'replace')
	}

	// Update visual
	updateColumnSelectionVisual(ctx)
}

/**
 * Clear all selections
 */
function executeClearSelection(ctx: ExecutorContext): void {
	// Clear row selection
	if (ctx.grid.selectedRows.length > 0) {
		ctx.grid.clearSelection()
		removeRowSelectionBorders()
		updateRowSelectionVisual(ctx)
	}

	// Clear column selection
	if (ctx.grid.selectedColumns.length > 0) {
		ctx.grid.clearColumnSelection()
		removeColumnSelectionBorders()
		updateColumnSelectionVisual(ctx)
	}

	// Clear cell range selection
	if (ctx.grid.selectedCellRange) {
		ctx.grid.clearCellSelection()
		removeRangeBorder()
		// Remove fill handle that was hidden by CSS while range border existed
		// (without this, the old fill handle becomes visible at its stale position)
		removeFillHandle()
		updateCellRangeVisual(ctx)
	}
}

/**
 * Update row selection visual classes
 */
function updateRowSelectionVisual(ctx: ExecutorContext): void {
	// Remove all row-selected classes
	const selectedRows = ctx.shadow.querySelectorAll('.wg__row--selected')
	selectedRows.forEach(row => row.classList.remove('wg__row--selected'))

	// Add class to selected rows
	for (const rowIndex of ctx.grid.selectedRows) {
		const row = ctx.shadow.querySelector(`tr[data-row="${rowIndex}"]`)
		if (row) {
			row.classList.add('wg__row--selected')
		}
	}
}

/**
 * Update column selection visual classes
 */
function updateColumnSelectionVisual(ctx: ExecutorContext): void {
	// Remove all column-selected classes
	const selectedCells = ctx.shadow.querySelectorAll('.wg__cell--column-selected')
	selectedCells.forEach(cell => cell.classList.remove('wg__cell--column-selected'))

	const selectedHeaders = ctx.shadow.querySelectorAll('.wg__header-cell--selected')
	selectedHeaders.forEach(header => header.classList.remove('wg__header-cell--selected'))

	// Add class to selected column cells and headers
	for (const colIndex of ctx.grid.selectedColumns) {
		const cells = ctx.shadow.querySelectorAll(`.wg__cell[data-col="${colIndex}"]`)
		cells.forEach(cell => cell.classList.add('wg__cell--column-selected'))

		const header = ctx.shadow.querySelector(`.wg__header-cell[data-col="${colIndex}"]`)
		if (header) {
			header.classList.add('wg__header-cell--selected')
		}
	}
}

/**
 * Update cell range selection visual classes
 */
function updateCellRangeVisual(ctx: ExecutorContext): void {
	// Remove all in-range classes
	const inRangeCells = ctx.shadow.querySelectorAll('.wg__cell--in-range')
	inRangeCells.forEach(cell => cell.classList.remove('wg__cell--in-range'))

	// Add class to cells in range
	const range = ctx.grid.selectedCellRange
	if (!range) return

	const { startRowIndex, endRowIndex, startColIndex, endColIndex } = range
	const minRow = Math.min(startRowIndex, endRowIndex)
	const maxRow = Math.max(startRowIndex, endRowIndex)
	const minCol = Math.min(startColIndex, endColIndex)
	const maxCol = Math.max(startColIndex, endColIndex)

	for (let row = minRow; row <= maxRow; row++) {
		for (let col = minCol; col <= maxCol; col++) {
			const cell = ctx.shadow.querySelector(`.wg__cell[data-row="${row}"][data-col="${col}"]`)
			if (cell) {
				cell.classList.add('wg__cell--in-range')
			}
		}
	}
}
