// =============================================================================
// Navigation Focus Module
// Low-level focus management utilities
// =============================================================================

import type { FocusedCell } from '../../types.js'
import type { GridContext } from '../types.js'
import { renderCell } from '../rendering/index.js'
import { removeDropdown } from '../dropdown/rendering.js'
import { removeFillHandle } from '../fill-handle/index.js'

/**
 * Focus the appropriate element within a cell.
 * In 'always' edit mode, focuses the editor input inside the cell.
 * Otherwise, focuses the cell element itself.
 */
function focusElementInCell(cell: HTMLElement, isAlwaysEditMode: boolean): void {
	if (isAlwaysEditMode) {
		// In 'always' mode, find and focus the editor input inside the cell
		const editor = cell.querySelector(
			'.wg__editor, .wg__combobox-input, .wg__autocomplete-input, .wg__date-input, .wg__select-trigger'
		) as HTMLElement
		if (editor) {
			editor.focus({ preventScroll: true })
			// Select all text in text inputs for easier editing
			if (editor instanceof HTMLInputElement && editor.type === 'text') {
				editor.select()
			}
			return
		}
	}
	// Default: focus the cell itself
	cell.focus({ preventScroll: true })
}

/**
 * Focus a cell element in the DOM
 * In virtual scroll mode, only scroll if cell is outside viewport (minimal scroll)
 */
export function focusCellElement<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number
): void {
	// Check if this cell uses 'always' editTrigger
	const column = ctx.grid.columns[colIndex]
	const effectiveTrigger = column?.editTrigger ?? ctx.grid.editTrigger
	const isAlwaysEditMode = effectiveTrigger === 'always'

	// In virtual scroll mode: only scroll if row is outside viewport
	if (ctx.grid.shouldUseVirtualScroll()) {
		ensureRowVisibleMinimal(ctx, rowIndex)
		// If row is already visible, focus immediately
		const cell = ctx.shadow.querySelector(
			`[data-row="${rowIndex}"][data-col="${colIndex}"]`
		) as HTMLElement
		if (cell) {
			focusElementInCell(cell, isAlwaysEditMode)
		}
		// If not visible, scroll triggered re-render which will focus via renderVirtualRows
		return
	}

	// Normal mode: focus the cell and scroll into view
	const cell = ctx.shadow.querySelector(
		`[data-row="${rowIndex}"][data-col="${colIndex}"]`
	) as HTMLElement
	if (!cell) return

	focusElementInCell(cell, isAlwaysEditMode)

	// Let scrollIntoView handle the main scrolling (both axes)
	cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })

	// After scrollIntoView, check if cell is STILL obscured by sticky header
	const header = ctx.shadow.querySelector('.wg__header') as HTMLElement
	const scrollContainer = ctx.shadow.querySelector('.wg') as HTMLElement

	if (header && scrollContainer) {
		const headerRect = header.getBoundingClientRect()
		const cellRect = cell.getBoundingClientRect()

		// If cell is still under the header, adjust
		if (cellRect.top < headerRect.bottom) {
			const scrollAmount = cellRect.top - headerRect.bottom - 4
			scrollContainer.scrollBy({ top: scrollAmount, behavior: 'instant' })
		}
	}
}

/**
 * Ensure a row is visible with minimal scrolling (only if outside viewport)
 * Used for arrow key navigation - doesn't reposition, just ensures visibility
 */
function ensureRowVisibleMinimal<T>(ctx: GridContext<T>, rowIndex: number): void {
	const container = ctx.shadow.querySelector('.wg') as HTMLElement
	if (!container) return

	const rowHeight = ctx.grid.virtualScrollRowHeight
	const scrollTop = container.scrollTop
	const viewportHeight = container.clientHeight

	// Account for sticky header
	const header = ctx.shadow.querySelector('.wg__header') as HTMLElement
	const headerHeight = header?.offsetHeight || 0

	const rowTop = rowIndex * rowHeight
	const rowBottom = rowTop + rowHeight
	const visibleTop = scrollTop + headerHeight
	const visibleBottom = scrollTop + viewportHeight

	// Only scroll if row is outside viewport
	if (rowTop < visibleTop) {
		// Row is above viewport - scroll up to show it
		container.scrollTop = rowTop - headerHeight
	} else if (rowBottom > visibleBottom) {
		// Row is below viewport - scroll down to show it
		container.scrollTop = rowBottom - viewportHeight
	}
	// If row is visible, don't scroll at all
}

/**
 * Scroll to position a row as the second visible row (for PageUp/PageDown)
 * Exported so keyboard handlers can use it directly
 */
export function scrollToRowPosition<T>(ctx: GridContext<T>, rowIndex: number): void {
	const container = ctx.shadow.querySelector('.wg') as HTMLElement
	if (!container) return

	const rowHeight = ctx.grid.virtualScrollRowHeight

	// Position target row as second visible row (rowIndex - 1 at top)
	// This gives one row of context above the target
	const targetScrollTop = Math.max(0, (rowIndex - 1) * rowHeight)

	// Clamp to valid range
	const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
	container.scrollTop = Math.min(targetScrollTop, maxScroll)
}

// Track last focus visual update to debounce rapid changes during double-click
let lastFocusVisualUpdate = 0
const FOCUS_VISUAL_DEBOUNCE_MS = 100

/**
 * Update focus visual state surgically (without full re-render)
 * Uses centralized renderCell() to ensure all states are correct
 */
export function updateFocusVisual<T>(
	ctx: GridContext<T>,
	oldFocus: FocusedCell | null,
	newFocus: FocusedCell | null
): void {
	// Debounce rapid focus visual changes on SAME cell (happens during double-click)
	// Don't debounce when focus is actually moving to a different cell
	const isSameCell = oldFocus && newFocus &&
		oldFocus.rowIndex === newFocus.rowIndex &&
		oldFocus.colIndex === newFocus.colIndex
	const now = Date.now()
	if (isSameCell && now - lastFocusVisualUpdate < FOCUS_VISUAL_DEBOUNCE_MS) {
		return
	}
	lastFocusVisualUpdate = now

	const editingCell = ctx.grid.editingCell

	// Re-render old cell (will remove --focused class)
	// Skip if this cell is currently being edited (don't disrupt editor)
	if (oldFocus) {
		const isOldCellEditing = editingCell &&
			editingCell.rowIndex === oldFocus.rowIndex &&
			ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field) === oldFocus.colIndex
		if (!isOldCellEditing) {
			renderCell(ctx, oldFocus.rowIndex, oldFocus.colIndex)
		}
	}

	// Re-render new cell (will add --focused class)
	// Skip if this cell is currently being edited (don't disrupt editor)
	if (newFocus) {
		const isNewCellEditing = editingCell &&
			editingCell.rowIndex === newFocus.rowIndex &&
			ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field) === newFocus.colIndex
		if (!isNewCellEditing) {
			renderCell(ctx, newFocus.rowIndex, newFocus.colIndex)
		}
	}
}

/**
 * Surgically remove the editing visual (blue border) from current editing cell.
 * Call this BEFORE cancelEdit() to ensure the DOM class is removed immediately.
 * NOTE: This just removes the class - full cell restoration happens via renderCell()
 * after cancelEdit() clears the state.
 */
export function clearEditingVisual<T>(ctx: GridContext<T>): void {
	const editingCell = ctx.grid.editingCell
	if (editingCell) {
		const colIndex = ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field)
		const cell = ctx.shadow.querySelector(
			`[data-row="${editingCell.rowIndex}"][data-col="${colIndex}"]`
		) as HTMLElement
		if (cell) {
			cell.classList.remove('wg__cell--editing')
		}
	}
}

/**
 * Fully restore an editing cell to display mode.
 * Must be called AFTER cancelEdit() so the cell renders in display mode.
 */
export function restoreEditingCellToDisplayMode<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number
): void {
	renderCell(ctx, rowIndex, colIndex)
}

/**
 * Handle cell focus event
 */
export function handleCellFocus<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number
): void {
	if (!ctx.grid.isNavigateMode) return

	const oldFocus = ctx.grid.focusedCell
	const newFocus = { rowIndex, colIndex }

	// Skip if already focused on this cell
	if (oldFocus?.rowIndex === rowIndex && oldFocus?.colIndex === colIndex) {
		return
	}

	ctx.grid.setFocusedCell(rowIndex, colIndex)  // Just updates state (no re-render)
	updateFocusVisual(ctx, oldFocus, newFocus)     // Updates DOM directly
}

/**
 * Helper to move focus to a new cell with surgical DOM updates
 */
export function moveFocus<T>(
	ctx: GridContext<T>,
	newRowIndex: number,
	newColIndex: number
): void {
	const oldFocus = ctx.grid.focusedCell
	const newFocus = { rowIndex: newRowIndex, colIndex: newColIndex }

	ctx.grid.setFocusedCell(newRowIndex, newColIndex)
	updateFocusVisual(ctx, oldFocus, newFocus)
	focusCellElement(ctx, newRowIndex, newColIndex)
}

/**
 * Try to start editing a cell (checks if editable first)
 * Uses centralized renderCell() for surgical DOM update
 */
export function tryStartEdit<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number,
	options?: { initialSearchQuery?: string; cursorPosition?: number }
): void {
	const column = ctx.grid.columns[colIndex]
	if (!column) return

	const field = String(column.field)

	// Check if cell can be edited (column editability + row locking)
	if (!ctx.grid.canEditCell(rowIndex, field)) {
		return
	}

	// Remove any open dropdown before transitioning to new cell
	if (ctx.dropdownOpen) {
		removeDropdown(ctx)
	}

	// Clear old focus visual if editing a different cell
	const oldFocus = ctx.grid.focusedCell
	if (oldFocus && (oldFocus.rowIndex !== rowIndex || oldFocus.colIndex !== colIndex)) {
		// Clear focus state BEFORE re-rendering so cell renders without focus visual
		ctx.grid.clearFocusedCell()
		renderCell(ctx, oldFocus.rowIndex, oldFocus.colIndex)
	}

	// Update state (no longer triggers requestUpdate)
	ctx.grid.startEdit(rowIndex, field, options)

	// Re-render the cell in edit mode with focus
	renderCell(ctx, rowIndex, colIndex, {
		focusEditor: true,
		cursorPosition: options?.cursorPosition,
		initialSearchQuery: options?.initialSearchQuery
	})
}

/**
 * Calculate cursor position from a click event using binary search (v3 pattern)
 */
export function getCursorPositionFromClick(
	event: MouseEvent,
	cell: HTMLElement
): number | null {
	// Find the text span inside the cell (matches v3's .cell-content > span pattern)
	const textSpan = cell.querySelector('.wg__cell-text') as HTMLElement
	if (!textSpan) return null

	const text = textSpan.textContent || ''
	if (!text.length) return 0

	const clickX = event.clientX
	const spanRect = textSpan.getBoundingClientRect()

	// If click is before the text, position at start
	if (clickX <= spanRect.left) return 0
	// If click is after the text, position at end
	if (clickX >= spanRect.right) return text.length

	// Find text node
	const textNode = textSpan.firstChild
	if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null

	// Binary search for the character position
	const range = document.createRange()
	let low = 0
	let high = text.length

	try {
		while (low < high) {
			const mid = Math.floor((low + high) / 2)
			range.setStart(textNode, 0)
			range.setEnd(textNode, mid)
			const rect = range.getBoundingClientRect()

			if (rect.right < clickX) {
				low = mid + 1
			} else {
				high = mid
			}
		}

		// Fine-tune: check if click is closer to before or after this character
		if (low > 0 && low < text.length) {
			range.setStart(textNode, low - 1)
			range.setEnd(textNode, low)
			const charRect = range.getBoundingClientRect()
			const charMidpoint = charRect.left + charRect.width / 2
			if (clickX < charMidpoint) {
				low--
			}
		}
	} catch {
		return text.length
	}

	return low
}

/**
 * Handle focus leaving the table
 * Uses double requestAnimationFrame to ensure DOM and focus have stabilized
 */
export function handleTableFocusOut<T>(ctx: GridContext<T>, e: FocusEvent): void {
	const relatedTarget = e.relatedTarget as HTMLElement
	const table = ctx.shadow.querySelector('.wg__table')

	// If relatedTarget is in the table, focus is staying - no action needed
	if (relatedTarget && table?.contains(relatedTarget)) {
		return
	}

	// Check if focus is still within the component
	const activeElement = ctx.shadow.activeElement as HTMLElement
	const activeIsInTable = activeElement && table?.contains(activeElement)

	// If activeElement is still in the table, don't clear focus
	if (activeIsInTable) {
		return
	}

	// Check if the web component (shadow host) still has focus
	const host = ctx.shadow.host as HTMLElement
	const componentHasFocus = document.activeElement === host ||
		host.contains(document.activeElement as Node)

	if (componentHasFocus) {
		return
	}

	// Focus truly left the component - clear focus state
	const oldFocus = ctx.grid.focusedCell
	ctx.grid.clearFocusedCell()
	updateFocusVisual(ctx, oldFocus, null)
	removeFillHandle()
}
