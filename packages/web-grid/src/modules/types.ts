// =============================================================================
// Module Types - Interfaces for GridElement context
// =============================================================================

import type { WebGrid } from '../grid.js'
import type { Column, EditorOption, EditorOptions } from '../types.js'
import type { ScrollEventManager } from './scroll-events/index.js'
import type { FocusEventManager } from './focus-events/index.js'

/**
 * GridElement context interface for module functions
 * This is the subset of GridElement that modules need access to
 */
export interface GridContext<T = unknown> {
	// Shadow DOM
	readonly shadow: ShadowRoot

	// Grid logic
	readonly grid: WebGrid<T>

	// Dropdown state
	dropdownOpen: boolean
	dropdownOptions: EditorOption[]
	highlightedIndex: number
	filterText: string
	isUserFiltering: boolean
	justSelected: boolean
	isOpeningDropdown: boolean
	isCommittingFromKeyboard: boolean

	// Autocomplete async state
	searchDebounceTimer: ReturnType<typeof setTimeout> | null
	searchAbortController: AbortController | null
	isSearching: boolean

	// Tooltip state
	tooltipElement: HTMLElement | null
	tooltipArrowElement: HTMLElement | null
	tooltipAnchor: HTMLElement | null
	tooltipShowTimer: ReturnType<typeof setTimeout> | null
	tooltipHideTimer: ReturnType<typeof setTimeout> | null
	readonly tooltipShowDelay: number
	readonly tooltipHideDelay: number

	// Utility methods
	escapeHtml(text: string): string

	// Helper methods that modules may need
	getCurrentEditingColumn(): Column<T> | null
	getCurrentEditorOptions(): EditorOptions

	// Focus/navigation methods
	moveFocusAfterCommit(rowIndex: number, field: string, direction: 'down' | 'up' | 'next' | 'prev'): void

	// Scroll event manager (pub/sub for scroll events)
	readonly scrollEvents: ScrollEventManager

	// Focus event manager (pub/sub for blur/focusout events)
	readonly focusEvents: FocusEventManager
}
