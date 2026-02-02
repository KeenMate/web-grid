// =============================================================================
// Event Mapper
// Maps DOM events to Action objects for the pipeline
// =============================================================================

import type { GridAction, NavigateAction, NavigationDirection, CellCoordinates } from './types.js'

/**
 * Context for mapping events - includes dropdown state
 */
export type EventMapperContext = {
	currentCell: CellCoordinates | null
	dropdownOpen: boolean
	isDropdownEditor: boolean
	isCheckboxEditor?: boolean
}

/**
 * Map a keyboard event to an action
 * Returns null if the event should not be handled by the pipeline
 */
export function mapKeyDownToAction(
	e: KeyboardEvent,
	context: EventMapperContext
): GridAction | null {
	const { currentCell, dropdownOpen, isDropdownEditor } = context
	if (!currentCell) return null

	const ctrlKey = e.ctrlKey || e.metaKey

	// When dropdown is open, handle dropdown-specific keys
	if (dropdownOpen) {
		switch (e.key) {
			case 'ArrowUp':
				return { type: 'dropdownNavigate', direction: 'up' } as GridAction
			case 'ArrowDown':
				return { type: 'dropdownNavigate', direction: 'down' } as GridAction
			case 'Enter':
				return { type: 'dropdownSelect', moveAfterSelect: true, commitEmptyRow: true } as GridAction
			case 'Tab':
				return {
					type: 'dropdownSelect',
					moveAfterSelect: false, // We'll navigate after
					commitEmptyRow: false,
					thenNavigate: e.shiftKey ? 'tab-back' : 'tab'
				} as GridAction
			case 'Escape':
				// Close dropdown and clear search (first phase of escape)
				return { type: 'escapeEdit', phase: 'dropdown' } as GridAction
			// Let other keys fall through to normal handling
		}
	}

	// Escape when not in dropdown - cancel edit entirely
	if (e.key === 'Escape') {
		return { type: 'escapeEdit', phase: 'edit' } as GridAction
	}

	// Checkbox editor - Space toggles checkbox
	if (context.isCheckboxEditor && e.key === ' ') {
		return {
			type: 'toggleCheckbox',
			target: currentCell
		}
	}

	// Dropdown editor without open dropdown
	if (isDropdownEditor && !dropdownOpen) {
		switch (e.key) {
			case ' ':  // Space opens dropdown
			case 'F2': // F2 opens dropdown
				return { type: 'openDropdown' }
			case 'Enter':
				// Enter opens dropdown for dropdown editors (unless configured otherwise)
				return { type: 'openDropdown' }
		}
	}

	// Standard navigation keys
	let direction: NavigationDirection | null = null

	switch (e.key) {
		case 'Tab':
			direction = e.shiftKey ? 'tab-back' : 'tab'
			break

		case 'Enter':
			direction = 'enter'
			break

		case 'ArrowUp':
			direction = 'up'
			break

		case 'ArrowDown':
			direction = 'down'
			break

		case 'ArrowLeft':
			direction = 'left'
			break

		case 'ArrowRight':
			direction = 'right'
			break

		case 'Home':
			direction = 'home'
			break

		case 'End':
			direction = 'end'
			break

		case 'PageUp':
			direction = 'page-up'
			break

		case 'PageDown':
			direction = 'page-down'
			break

		default:
			return null
	}

	if (!direction) return null

	const action: NavigateAction = {
		type: 'navigate',
		direction,
		from: currentCell,
		ctrlKey
	}

	return action
}

/**
 * Check if a key should be handled by the pipeline
 */
export function isPipelineKey(key: string, dropdownOpen: boolean, isDropdownEditor: boolean, isCheckboxEditor: boolean = false): boolean {
	const navKeys = [
		'Tab',
		'Enter',
		'ArrowUp',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'Home',
		'End',
		'PageUp',
		'PageDown'
	]

	if (navKeys.includes(key)) return true

	// Escape is always handled by pipeline (two-phase escape behavior)
	if (key === 'Escape') return true

	// Dropdown-specific keys
	if (isDropdownEditor && !dropdownOpen && (key === ' ' || key === 'F2')) return true

	// Checkbox-specific keys
	if (isCheckboxEditor && key === ' ') return true

	return false
}

// Keep for backwards compatibility
export function isNavigationKey(key: string): boolean {
	return isPipelineKey(key, false, false)
}

// =============================================================================
// Mouse Event Mapping
// =============================================================================

/**
 * Context for mapping mouse events
 */
export type MouseMapperContext = {
	cell: CellCoordinates
	dropdownOpen: boolean
	isDropdownEditor: boolean
	isDateEditor?: boolean
	isCheckboxEditor?: boolean
	isToggleClick: boolean
	isDateTriggerClick?: boolean
	isCheckboxClick?: boolean
	isCellClick?: boolean
}

/**
 * Map a mouse event to actions
 * Returns array of actions to dispatch (may be multiple for compound operations)
 */
export function mapMouseDownToActions(
	_e: MouseEvent,
	context: MouseMapperContext
): GridAction[] {
	const { cell, dropdownOpen, isToggleClick, isDateTriggerClick, isCheckboxClick, isCellClick } = context
	const actions: GridAction[] = []

	// For checkbox clicks, just toggle - don't need to focus first
	if (isCheckboxClick) {
		actions.push({
			type: 'toggleCheckbox',
			target: cell
		})
		return actions
	}

	// For date trigger clicks, focus cell, start edit, then toggle date picker
	if (isDateTriggerClick) {
		actions.push({
			type: 'focusCell',
			target: cell,
			selectText: false
		})
		// Must dispatch startEdit so editingCell is set for keyboard handling
		actions.push({ type: 'startEdit', target: cell })
		actions.push({ type: 'toggleDatePicker' })
		return actions
	}

	// Always focus the clicked cell first
	actions.push({
		type: 'focusCell',
		target: cell,
		selectText: !isToggleClick && !isCellClick  // Select text on editor focus, not on toggle/cell click
	})

	// Toggle click → start edit (if not already editing) and toggle dropdown
	if (isToggleClick) {
		if (dropdownOpen) {
			actions.push({ type: 'closeDropdown' })
		} else {
			// Must dispatch startEdit so editingCell is set for keyboard handling
			actions.push({ type: 'startEdit', target: cell })
			actions.push({ type: 'openDropdown' })
		}
	}

	return actions
}
