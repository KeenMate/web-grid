// =============================================================================
// Dropdown Option Helpers
// Pure functions for extracting values from EditorOption objects
// =============================================================================

import type { EditorOption, EditorOptions } from '../../types.js'

/**
 * Get display value for a selected value from options list
 * Fallback chain:
 * 1. Find option by value, then use getDisplayCallback if provided
 * 2. Find option by value, then use displayMember
 * 3. Find option by value, then use 'label' property
 * 4. If no option found, return raw value as string
 */
export function getOptionDisplayValue(
	value: unknown,
	options: EditorOption[],
	opts: EditorOptions
): string {
	const valueMember = opts.valueMember || 'value'
	const opt = options.find(o => (o as Record<string, unknown>)[valueMember] === value)
	if (opt) {
		// Use the same logic as getOptionLabel for consistency
		return getOptionLabel(opt, opts)
	}
	// No matching option - return raw value
	return value != null ? String(value) : ''
}

/**
 * Get display label from option object
 */
export function getOptionLabel(opt: EditorOption, opts: EditorOptions): string {
	if (opts.getDisplayCallback) return opts.getDisplayCallback(opt)
	const displayMember = opts.displayMember || 'label'
	return String((opt as Record<string, unknown>)[displayMember] ?? opt.label ?? '')
}

/**
 * Get value from option object
 */
export function getOptionValue(opt: EditorOption, opts: EditorOptions): unknown {
	if (opts.getValueCallback) return opts.getValueCallback(opt)
	const valueMember = opts.valueMember || 'value'
	return (opt as Record<string, unknown>)[valueMember] ?? opt.value
}

/**
 * Get searchable text from option object (falls back to display)
 */
export function getOptionSearchText(opt: EditorOption, opts: EditorOptions): string {
	if (opts.getSearchCallback) return opts.getSearchCallback(opt)
	if (opts.searchMember) return String((opt as Record<string, unknown>)[opts.searchMember] ?? '')
	return getOptionLabel(opt, opts)
}

/**
 * Get icon from option object
 */
export function getOptionIcon(opt: EditorOption, opts: EditorOptions): string | null {
	if (opts.getIconCallback) return opts.getIconCallback(opt)
	if (opts.iconMember) return (opt as Record<string, unknown>)[opts.iconMember] as string || null
	return null
}

/**
 * Get subtitle from option object
 */
export function getOptionSubtitle(opt: EditorOption, opts: EditorOptions): string | null {
	if (opts.getSubtitleCallback) return opts.getSubtitleCallback(opt)
	if (opts.subtitleMember) return (opt as Record<string, unknown>)[opts.subtitleMember] as string || null
	return null
}

/**
 * Check if option is disabled
 */
export function isOptionDisabled(opt: EditorOption, opts: EditorOptions): boolean {
	if (opts.getDisabledCallback) return opts.getDisabledCallback(opt)
	if (opts.disabledMember) return Boolean((opt as Record<string, unknown>)[opts.disabledMember])
	return false
}

/**
 * Get group from option object
 */
export function getOptionGroup(opt: EditorOption, opts: EditorOptions): string | null {
	if (opts.getGroupCallback) return opts.getGroupCallback(opt)
	if (opts.groupMember) return (opt as Record<string, unknown>)[opts.groupMember] as string || null
	return null
}
