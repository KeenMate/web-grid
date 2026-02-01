// =============================================================================
// Dropdown Executor
// Handles openDropdown, closeDropdown, toggleDropdown, dropdownNavigate, dropdownSelect actions
// =============================================================================

import type { ActionExecutor, ExecutorContext } from '../pipeline.js'
import type { GridAction, DropdownNavigateAction, DropdownSelectAction, NavigateAction } from '../types.js'
import {
	openDropdownForCurrentEditor,
	removeDropdown,
	selectDropdownOption,
	updateDropdownHighlight,
	scrollHighlightedIntoView,
	isOptionDisabled,
	getOptionValue
} from '../../dropdown/index.js'
import { renderCell } from '../../rendering/index.js'

/**
 * Dropdown executor - handles dropdown open/close/toggle/navigate/select actions
 */
export const dropdownExecutor: ActionExecutor = {
	handles: ['openDropdown', 'closeDropdown', 'toggleDropdown', 'dropdownNavigate', 'dropdownSelect'],

	execute(ctx: ExecutorContext, action: GridAction): GridAction[] | void {
		console.log('[DropdownExecutor] execute:', action.type, 'dropdownOpen:', ctx.dropdownOpen)
		switch (action.type) {
			case 'openDropdown':
				console.log('[DropdownExecutor] Opening dropdown, focusedCell:', ctx.grid.focusedCell)
				openDropdownForCurrentEditor(ctx)
				console.log('[DropdownExecutor] After open, dropdownOpen:', ctx.dropdownOpen)
				break
			case 'closeDropdown':
				removeDropdown(ctx)
				break
			case 'toggleDropdown':
				if (ctx.dropdownOpen) {
					removeDropdown(ctx)
				} else {
					openDropdownForCurrentEditor(ctx)
				}
				break
			case 'dropdownNavigate':
				return executeDropdownNavigate(ctx, action)
			case 'dropdownSelect':
				return executeDropdownSelect(ctx, action)
		}
	}
}

/**
 * Execute dropdown navigate action (up/down through options)
 */
function executeDropdownNavigate(ctx: ExecutorContext, action: DropdownNavigateAction): void {
	if (!ctx.dropdownOpen) return

	const opts = ctx.getCurrentEditorOptions()
	let newIndex = ctx.highlightedIndex

	if (action.direction === 'up') {
		newIndex = ctx.highlightedIndex - 1
		// Find previous non-disabled option
		while (newIndex >= 0 && isOptionDisabled(ctx.dropdownOptions[newIndex], opts)) {
			newIndex--
		}
		if (newIndex < 0) return // No valid option above
	} else {
		newIndex = ctx.highlightedIndex + 1
		// Find next non-disabled option
		while (newIndex < ctx.dropdownOptions.length && isOptionDisabled(ctx.dropdownOptions[newIndex], opts)) {
			newIndex++
		}
		if (newIndex >= ctx.dropdownOptions.length) return // No valid option below
	}

	ctx.highlightedIndex = newIndex
	updateDropdownHighlight(ctx)
	scrollHighlightedIntoView(ctx)
}

/**
 * Execute dropdown select action (select highlighted option)
 * Works with both editingCell (normal edit mode) and focusedCell ('always' edit mode)
 */
function executeDropdownSelect(ctx: ExecutorContext, action: DropdownSelectAction): GridAction[] | void {
	if (!ctx.dropdownOpen || ctx.highlightedIndex < 0) {
		// No dropdown or nothing highlighted - just close and maybe navigate
		removeDropdown(ctx)
		if (action.thenNavigate) {
			const navigateAction: NavigateAction = {
				type: 'navigate',
				direction: action.thenNavigate
			}
			return [navigateAction]
		}
		return
	}

	const option = ctx.dropdownOptions[ctx.highlightedIndex]
	if (!option) return

	// Get cell info - prefer editingCell, fall back to focusedCell for 'always' mode
	const editingCell = ctx.grid.editingCell
	const focusedCell = ctx.grid.focusedCell
	const cellInfo = editingCell
		? { rowIndex: editingCell.rowIndex, field: editingCell.field, colIndex: ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field) }
		: focusedCell
			? { rowIndex: focusedCell.rowIndex, field: String(ctx.grid.columns[focusedCell.colIndex]?.field), colIndex: focusedCell.colIndex }
			: null

	if (!cellInfo) return

	const { rowIndex, field, colIndex } = cellInfo

	// Get column for editorOptions
	const column = ctx.grid.columns[colIndex]
	const opts = column?.editorOptions || {}

	if (isOptionDisabled(option, opts)) return

	const value = getOptionValue(option, opts)
	const row = ctx.grid.displayItems[rowIndex]

	// Fire onselect event if provided
	if (opts.onselect && row) {
		opts.onselect(option, row)
	}

	ctx.justSelected = true
	ctx.isCommittingFromKeyboard = true
	removeDropdown(ctx)
	ctx.grid.commitEdit(rowIndex, field, value, action.commitEmptyRow ?? false)

	// If thenNavigate is specified (Tab key), navigate after select
	if (action.thenNavigate) {
		// Re-render current cell first to show new value
		renderCell(ctx, rowIndex, colIndex)

		// Reset justSelected after a frame
		requestAnimationFrame(() => {
			ctx.justSelected = false
		})

		// Return navigate action
		const navigateAction: NavigateAction = {
			type: 'navigate',
			direction: action.thenNavigate,
			from: { rowIndex, colIndex }
		}
		return [navigateAction]
	}

	if (action.moveAfterSelect) {
		// Move focus to next row in same column (like Enter does)
		ctx.moveFocusAfterCommit(rowIndex, field, 'down')
	} else {
		// Stay on current cell - re-render to show new value
		renderCell(ctx, rowIndex, colIndex)
	}

	// Reset justSelected after focus moves
	requestAnimationFrame(() => {
		ctx.justSelected = false
	})
}
