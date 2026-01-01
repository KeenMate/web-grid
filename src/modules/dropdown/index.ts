// =============================================================================
// Dropdown Module - Barrel Export
// =============================================================================

// Option helpers
export {
	getOptionDisplayValue,
	getOptionLabel,
	getOptionValue,
	getOptionSearchText,
	getOptionIcon,
	getOptionSubtitle,
	isOptionDisabled,
	getOptionGroup
} from './options.js'

// Rendering
export {
	renderDropdown,
	removeDropdown
} from './rendering.js'

// Interaction
export {
	selectDropdownOption,
	updateDropdownHighlight,
	scrollHighlightedIntoView,
	updateLoadingIndicator,
	openDropdownForCurrentEditor,
	toggleDropdown,
	attachDropdownListeners,
	updateSelectFilter
} from './interaction.js'

// Input handlers
export {
	handleComboboxInput,
	handleAutocompleteInput,
	performAutocompleteSearch
} from './input-handlers.js'
