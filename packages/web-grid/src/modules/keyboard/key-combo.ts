// =============================================================================
// Key Combo Parsing Utilities
// =============================================================================

import type { ParsedKeyCombo } from '../../types.js'

/**
 * Parse a key combination string like "Ctrl+D", "Shift+F3", "Alt+Delete"
 * into a structured object for matching against KeyboardEvents.
 */
export function parseKeyCombo(keyStr: string): ParsedKeyCombo {
	const parts = keyStr.split('+').map(p => p.trim())
	const result: ParsedKeyCombo = {
		key: '',
		ctrl: false,
		shift: false,
		alt: false,
		meta: false
	}

	for (const part of parts) {
		const lower = part.toLowerCase()
		if (lower === 'ctrl' || lower === 'control') {
			result.ctrl = true
		} else if (lower === 'shift') {
			result.shift = true
		} else if (lower === 'alt') {
			result.alt = true
		} else if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
			result.meta = true
		} else {
			// This is the actual key
			result.key = part
		}
	}

	return result
}

/**
 * Check if a KeyboardEvent matches a parsed key combination.
 */
export function matchesKeyCombo(e: KeyboardEvent, combo: ParsedKeyCombo): boolean {
	// Check modifier keys
	if (combo.ctrl !== e.ctrlKey) return false
	if (combo.shift !== e.shiftKey) return false
	if (combo.alt !== e.altKey) return false
	if (combo.meta !== e.metaKey) return false

	// Check the main key (case-insensitive for letters)
	const eventKey = e.key.toLowerCase()
	const comboKey = combo.key.toLowerCase()

	return eventKey === comboKey
}

/**
 * Format a key combination for display (e.g., "Ctrl+D" → "Ctrl+D")
 */
export function formatKeyCombo(keyStr: string): string {
	// Normalize formatting
	return keyStr.split('+').map(p => {
		const trimmed = p.trim()
		// Capitalize first letter of modifiers
		if (['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'command'].includes(trimmed.toLowerCase())) {
			return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
		}
		// Keep key as-is (could be F1, Delete, etc.)
		return trimmed
	}).join('+')
}
