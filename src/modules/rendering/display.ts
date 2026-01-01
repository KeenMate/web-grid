// =============================================================================
// Cell Display Rendering
// Render cells in display (non-editing) mode
// =============================================================================

import type { Column } from '../../types.js'
import type { GridContext } from '../types.js'

/**
 * Render a cell in display mode (not editing)
 * For dropdown cells, always renders toggle - CSS controls visibility via hover/focus
 */
export function renderCellDisplay<T>(
	ctx: GridContext<T>,
	rowIndex: number,
	colIndex: number,
	column: Column<T>,
	value: string,
	isFocused: boolean
): string {
	const isDropdown = column.editor === 'select' || column.editor === 'combobox' || column.editor === 'autocomplete'
	const isDate = column.editor === 'date'
	const field = String(column.field)

	if (isDropdown) {
		// Add modifier class for on-focus visibility (CSS handles hover/focus show)
		const visibility = ctx.grid.getEffectiveToggleVisibility(column)
		const toggleClass = visibility === 'on-focus' ? 'wg__cell-dropdown-display--toggle-on-focus' : ''
		return `
			<div class="wg__cell-dropdown-display ${toggleClass}" data-row="${rowIndex}" data-field="${field}">
				<span class="wg__select-value">${ctx.escapeHtml(value)}</span>
				<span class="wg__select-toggle">▼</span>
			</div>
		`
	}

	if (isDate) {
		// Same pattern as dropdown - calendar button visible in read mode
		const visibility = ctx.grid.getEffectiveToggleVisibility(column)
		const toggleClass = visibility === 'on-focus' ? 'wg__cell-date-display--toggle-on-focus' : ''
		return `
			<div class="wg__cell-date-display ${toggleClass}" data-row="${rowIndex}" data-field="${field}">
				<span class="wg__date-value">${ctx.escapeHtml(value)}</span>
				<button type="button" class="wg__date-trigger" tabindex="-1">
					<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
				</button>
			</div>
		`
	}

	// templateCallback returns raw HTML - don't escape it
	if (column.templateCallback) {
		return `<span class="wg__cell-text">${value}</span>`
	}

	return `<span class="wg__cell-text">${ctx.escapeHtml(value)}</span>`
}
