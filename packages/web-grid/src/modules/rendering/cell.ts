// =============================================================================
// Surgical Cell Rendering
// Centralized function to update a single cell's DOM without full re-render
// =============================================================================

import type { GridContext } from '../types.js'
import { renderCellEditor } from '../editing/index.js'
import { renderCellDisplay } from './display.js'

export type RenderCellOptions = {
	/** Focus the editor after rendering (for edit mode) */
	focusEditor?: boolean
	/** Cursor position for text inputs */
	cursorPosition?: number
	/** Initial search query (type-to-start) */
	initialSearchQuery?: string
}

/**
 * Surgically update a single cell's DOM based on current grid state.
 * This is the single source of truth for cell appearance.
 *
 * Handles:
 * - All CSS classes (focused, editing, editable, invalid, etc.)
 * - Cell content (editor vs display mode)
 * - Editor focus and cursor positioning
 */
export function renderCell<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number,
	options: RenderCellOptions = {}
): void {
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	const cell = ctx.shadow.querySelector(
		`td[data-row="${rowIndex}"][data-col="${colIndex}"]`
	) as HTMLElement
	if (!cell) return

	const field = String(column.field)
	const item = ctx.grid.displayItems[rowIndex]
	if (!item) return

	// Determine cell state
	const isEditing = ctx.grid.isEditing(rowIndex, field)
	const isFocused = ctx.grid.isCellFocused(rowIndex, colIndex)
	const isEditable = ctx.grid.isCellEditable(column)
	const isInvalid = ctx.grid.isCellInvalid(rowIndex, field)

	// Build class list
	const classes = ['wg__cell']
	if (isEditable) classes.push('wg__cell--editable')
	if (isFocused && !isEditing) classes.push('wg__cell--focused')
	if (column.textOverflow !== 'wrap') classes.push('wg__cell--ellipsis')
	if (isEditing) classes.push('wg__cell--editing')
	if (isInvalid) classes.push('wg__cell--invalid')
	if (column.cellClass) classes.push(column.cellClass)
	if (column.cellClassCallback) {
		const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
		const dynamicClass = column.cellClassCallback(rawValue, item)
		if (dynamicClass) classes.push(dynamicClass)
	}

	// Update classes (replace all)
	cell.className = classes.join(' ')

	// Update content
	if (isEditing) {
		cell.innerHTML = renderCellEditor(ctx, rowIndex, colIndex, column)

		// Focus editor if requested
		if (options.focusEditor) {
			focusEditorInCell(ctx, cell, column, options)
		}
	} else {
		const value = ctx.grid.getCellValue(item, column, rowIndex)
		cell.innerHTML = renderCellDisplay(ctx, rowIndex, colIndex, column, value, isFocused)
	}
}

/**
 * Focus the editor input within a cell and set cursor position
 */
function focusEditorInCell<T>(
	ctx: GridContext<T>,
	cell: HTMLElement,
	column: { field: string | number | symbol; editor?: string; editorOptions?: { editStartSelection?: string } },
	options: RenderCellOptions
): void {
	// Find the appropriate editor element
	let editor = cell.querySelector('.wg__combobox-input, .wg__autocomplete-input, .wg__select-trigger, .wg__date-input') as HTMLElement
	if (!editor) {
		editor = cell.querySelector('.wg__editor') as HTMLElement
	}
	if (!editor) return

	editor.focus()

	// Set cursor position for text inputs
	if (editor instanceof HTMLInputElement && editor.type === 'text') {
		const cursorPos = options.cursorPosition
		const editStartSelection = column.editorOptions?.editStartSelection || ctx.grid.editStartSelection

		if (options.initialSearchQuery !== undefined) {
			// Type-to-start: always cursor at end
			const len = editor.value.length
			editor.setSelectionRange(len, len)
		} else {
			// Apply editStartSelection setting
			switch (editStartSelection) {
				case 'mousePosition':
					if (cursorPos !== undefined) {
						const pos = Math.min(cursorPos, editor.value.length)
						editor.setSelectionRange(pos, pos)
					} else {
						editor.setSelectionRange(editor.value.length, editor.value.length)
					}
					break
				case 'cursorAtStart':
					editor.setSelectionRange(0, 0)
					break
				case 'cursorAtEnd':
					editor.setSelectionRange(editor.value.length, editor.value.length)
					break
				case 'selectAll':
				default:
					editor.select()
					break
			}
		}
	}
}
