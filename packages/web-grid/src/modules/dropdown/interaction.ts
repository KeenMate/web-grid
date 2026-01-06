// =============================================================================
// Dropdown Interaction
// Selection, highlighting, scrolling, toggle, open for current editor
// =============================================================================

import type { EditorOptions } from '../../types.js'
import type { GridContext } from '../types.js'
import { getOptionValue, getOptionLabel, isOptionDisabled } from './options.js'
import { renderDropdown, removeDropdown } from './rendering.js'
import { renderCell } from '../rendering/index.js'

/**
 * Select dropdown option by index
 */
export function selectDropdownOption<T>(
	ctx: GridContext<T>,
	index: number,
	moveAfterSelect: boolean = true
): void {
	const option = ctx.dropdownOptions[index]
	if (!option) return

	const editingCell = ctx.grid.editingCell
	if (!editingCell) return

	const opts = ctx.getCurrentEditorOptions()

	// Skip if option is disabled
	if (isOptionDisabled(option, opts)) return

	const value = getOptionValue(option, opts)
	const colIndex = ctx.grid.columns.findIndex(c => String(c.field) === editingCell.field)
	const row = ctx.grid.displayItems[editingCell.rowIndex]

	// Fire onselect event if provided
	if (opts.onselect && row) {
		opts.onselect(option, row)
	}

	ctx.justSelected = true
	ctx.isCommittingFromKeyboard = true
	removeDropdown(ctx)
	ctx.grid.commitEdit(editingCell.rowIndex, editingCell.field, value)

	if (moveAfterSelect) {
		// Move focus to next row in same column (like Enter does for other editors)
		ctx.moveFocusAfterCommit(editingCell.rowIndex, editingCell.field, 'down')
	} else {
		// Stay on current cell with focused state - re-render to show new value
		renderCell(ctx, editingCell.rowIndex, colIndex)
	}

	// Reset justSelected after focus moves
	requestAnimationFrame(() => {
		ctx.justSelected = false
	})
}

/**
 * Update dropdown highlight visually
 */
export function updateDropdownHighlight<T>(ctx: GridContext<T>): void {
	const dropdown = ctx.shadow.querySelector('.wg__dropdown')
	if (!dropdown) return

	const options = dropdown.querySelectorAll('.wg__dropdown-option')
	options.forEach((el, i) => {
		el.classList.toggle('wg__dropdown-option--highlighted', i === ctx.highlightedIndex)
	})
}

/**
 * Scroll highlighted option into view
 */
export function scrollHighlightedIntoView<T>(ctx: GridContext<T>): void {
	const highlighted = ctx.shadow.querySelector('.wg__dropdown-option--highlighted')
	highlighted?.scrollIntoView({ block: 'nearest' })
}

/**
 * Update loading indicator visibility
 */
export function updateLoadingIndicator<T>(ctx: GridContext<T>, show: boolean): void {
	const indicator = ctx.shadow.querySelector('.wg__loading-indicator') as HTMLElement
	if (indicator) {
		indicator.style.display = show ? 'inline' : 'none'
	}
	// Hide toggle when loading (they occupy same position)
	const toggle = ctx.shadow.querySelector('.wg__editor--autocomplete .wg__combobox-toggle') as HTMLElement
	if (toggle) {
		toggle.style.display = show ? 'none' : 'inline'
	}
}

/**
 * Open dropdown for current editor
 */
export function openDropdownForCurrentEditor<T>(ctx: GridContext<T>): void {
	if (ctx.justSelected) return

	const column = ctx.getCurrentEditingColumn()
	if (!column) return

	const opts = column.editorOptions || {}
	const editor = column.editor

	// Calculate target index BEFORE renderDropdown (which resets highlightedIndex via removeDropdown)
	let targetIndex = 0

	if (editor === 'select') {
		const allOptions = opts.options || []
		// If there's a filter text (from typing to start editing), filter and highlight first match
		if (ctx.filterText) {
			const searchLower = ctx.filterText.toLowerCase()
			ctx.dropdownOptions = allOptions.filter(opt => {
				const label = getOptionLabel(opt, opts)
				return label.toLowerCase().includes(searchLower)
			})
			targetIndex = ctx.dropdownOptions.length > 0 ? 0 : -1
		} else {
			ctx.dropdownOptions = allOptions
			// Calculate highlight index for current value
			const editingCell = ctx.grid.editingCell
			if (editingCell) {
				const item = ctx.grid.displayItems[editingCell.rowIndex]
				const currentValue = item ? (item as Record<string, unknown>)[editingCell.field] : undefined
				const currentIdx = ctx.dropdownOptions.findIndex(
					opt => getOptionValue(opt, opts) === currentValue
				)
				targetIndex = currentIdx >= 0 ? currentIdx : 0
			} else {
				targetIndex = ctx.dropdownOptions.length > 0 ? 0 : -1
			}
		}
	} else if (editor === 'combobox' || editor === 'autocomplete') {
		const baseOptions = editor === 'autocomplete'
			? (opts.initialOptions || opts.options || [])
			: (opts.options || [])

		// Get current cell value
		const editingCell = ctx.grid.editingCell
		let currentValue: unknown = undefined
		if (editingCell) {
			const item = ctx.grid.displayItems[editingCell.rowIndex]
			currentValue = item ? (item as Record<string, unknown>)[editingCell.field] : undefined
		}

		// Check if current value exists in options
		const currentIdx = baseOptions.findIndex(
			opt => getOptionValue(opt, opts) === currentValue
		)

		if (currentIdx >= 0) {
			// Current value is in options - highlight it
			ctx.dropdownOptions = baseOptions
			targetIndex = currentIdx
		} else if (currentValue != null && currentValue !== '') {
			// Current value not in options - prepend it as first option
			const valueMember = opts.valueMember || 'value'
			const displayMember = opts.displayMember || 'label'
			const displayText = String(currentValue)
			const syntheticOption = {
				// Required base properties
				value: currentValue as string | number | boolean,
				label: displayText,
				// Custom member properties (may override above if different)
				[valueMember]: currentValue,
				[displayMember]: displayText
			}
			ctx.dropdownOptions = [syntheticOption, ...baseOptions]
			targetIndex = 0
		} else {
			// No current value - use options as-is
			ctx.dropdownOptions = baseOptions
			targetIndex = baseOptions.length > 0 ? 0 : -1
		}
	}

	const wrapper = ctx.shadow.querySelector('.wg__editor--select, .wg__editor--combobox, .wg__editor--autocomplete') as HTMLElement
	if (wrapper && ctx.dropdownOptions.length > 0) {
		// Save filterText before renderDropdown (which calls removeDropdown that clears it)
		const savedFilterText = ctx.filterText
		// Set flag to prevent scroll handler from closing dropdown during opening
		ctx.isOpeningDropdown = true
		const dropdown = renderDropdown(ctx, wrapper, ctx.dropdownOptions, opts)
		attachDropdownListeners(ctx, dropdown)
		// Restore filterText after renderDropdown
		ctx.filterText = savedFilterText
		// Set highlightedIndex AFTER renderDropdown (which calls removeDropdown that resets it to -1)
		ctx.highlightedIndex = targetIndex
		updateDropdownHighlight(ctx)
		// Refocus the editor after dropdown renders (select trigger or input)
		const selectTrigger = ctx.shadow.querySelector('.wg__select-trigger') as HTMLElement
		const input = ctx.shadow.querySelector('.wg__combobox-input, .wg__autocomplete-input') as HTMLElement
		const focusTarget = selectTrigger || input
		if (focusTarget) {
			focusTarget.focus()
		}
		// Clear flag after next frame to allow scroll events again
		requestAnimationFrame(() => {
			ctx.isOpeningDropdown = false
		})
	}
}

/**
 * Toggle dropdown open/close
 */
export function toggleDropdown<T>(ctx: GridContext<T>): void {
	if (ctx.dropdownOpen) {
		removeDropdown(ctx)
	} else {
		openDropdownForCurrentEditor(ctx)
	}
}

/**
 * Attach event listeners to dropdown element
 */
export function attachDropdownListeners<T>(
	ctx: GridContext<T>,
	dropdown: HTMLElement
): void {
	// Click on option - don't move to next row, just save and stay
	dropdown.addEventListener('mousedown', (e) => {
		e.preventDefault() // Prevent blur
		const option = (e.target as HTMLElement).closest('.wg__dropdown-option')
		if (option && !option.hasAttribute('data-disabled')) {
			const index = parseInt(option.getAttribute('data-index') || '0', 10)
			selectDropdownOption(ctx, index, false)
		}
	})

	// Hover highlights option (skip disabled)
	dropdown.addEventListener('mouseover', (e) => {
		const option = (e.target as HTMLElement).closest('.wg__dropdown-option')
		if (option && !option.hasAttribute('data-disabled')) {
			ctx.highlightedIndex = parseInt(option.getAttribute('data-index') || '0', 10)
			updateDropdownHighlight(ctx)
		}
	})
}

/**
 * Update select dropdown filter based on current filterText
 */
export function updateSelectFilter<T>(
	ctx: GridContext<T>,
	opts: EditorOptions
): void {
	const allOptions = opts.options || []
	const searchLower = ctx.filterText.toLowerCase()
	// Save filterText before renderDropdown (which calls removeDropdown that clears it)
	const savedFilterText = ctx.filterText

	ctx.dropdownOptions = allOptions.filter(opt => {
		const label = getOptionLabel(opt, opts)
		return label.toLowerCase().includes(searchLower)
	})
	ctx.highlightedIndex = ctx.dropdownOptions.length > 0 ? 0 : -1

	// Open or update dropdown (show "No options" message when empty)
	const wrapper = ctx.shadow.querySelector('.wg__editor--select') as HTMLElement
	if (wrapper) {
		const dropdown = renderDropdown(ctx, wrapper, ctx.dropdownOptions, opts)
		attachDropdownListeners(ctx, dropdown)
		// Restore filterText after renderDropdown
		ctx.filterText = savedFilterText
		if (ctx.dropdownOptions.length > 0) {
			ctx.highlightedIndex = 0
			updateDropdownHighlight(ctx)
		}
	}
}
