// =============================================================================
// Row Toolbar Module
// Floating toolbar with row actions
// =============================================================================

import type {
	PredefinedToolbarItemType,
	RowToolbarConfig,
	NormalizedToolbarItem,
	ToolbarClickDetail
} from '../../types.js'
import type { GridContext } from '../types.js'

// =============================================================================
// Connector Arrow Types and State
// =============================================================================

export type ConnectorState = {
	path: string | null
	arrowPos: { x: number; y: number } | null
	arrowDir: 'left' | 'right' | 'down' | 'up'
}

// State for the connector arrow that tracks row movement
let connectorState: ConnectorState = {
	path: null,
	arrowPos: null,
	arrowDir: 'right'
}

// =============================================================================
// Predefined Action Definitions
// =============================================================================

const PREDEFINED_ACTIONS: Record<PredefinedToolbarItemType, {
	icon: string
	title: string
	danger?: boolean
}> = {
	add: { icon: '+', title: 'Add row' },
	delete: { icon: '−', title: 'Delete row', danger: true },
	duplicate: { icon: '⧉', title: 'Duplicate row' },
	moveUp: { icon: '↑', title: 'Move up' },
	moveDown: { icon: '↓', title: 'Move down' }
}

// =============================================================================
// Normalize Toolbar Items
// =============================================================================

/**
 * Convert toolbar config (strings or objects) to normalized items
 */
export function normalizeToolbarItems<T>(
	config: RowToolbarConfig<T>[]
): NormalizedToolbarItem<T>[] {
	return config.map((item, index) => {
		if (typeof item === 'string') {
			// Predefined action shorthand
			const predefined = PREDEFINED_ACTIONS[item]
			if (!predefined) {
				console.warn(`Unknown predefined toolbar action: ${item}`)
				return null
			}
			return {
				id: item,
				icon: predefined.icon,
				title: predefined.title,
				row: 1,
				group: 1,
				type: item,
				danger: predefined.danger
			} as NormalizedToolbarItem<T>
		}

		// Full item object
		return {
			id: item.id || `toolbar-item-${index}`,
			icon: item.icon,
			title: item.title,
			label: item.label,
			row: item.row ?? 1,
			group: item.group ?? 1,
			type: item.type,
			danger: item.danger,
			disabled: item.disabled,
			onclick: item.onclick
		} as NormalizedToolbarItem<T>
	}).filter((item): item is NormalizedToolbarItem<T> => item !== null)
}

// =============================================================================
// Group Items by Row and Group
// =============================================================================

type GroupedItems<T> = {
	rowNum: number
	groups: { groupNum: number; items: NormalizedToolbarItem<T>[] }[]
}[]

function groupToolbarItems<T>(items: NormalizedToolbarItem<T>[]): GroupedItems<T> {
	// Group by row number
	const byRow = new Map<number, NormalizedToolbarItem<T>[]>()
	for (const item of items) {
		const row = item.row
		if (!byRow.has(row)) byRow.set(row, [])
		byRow.get(row)!.push(item)
	}

	// Sort rows ascending: row 1 first, row 2 second, etc.
	// With CSS column-reverse, row 1 ends up at bottom (aligned with data row)
	// and higher rows expand upward
	const result: GroupedItems<T> = []
	const sortedRows = [...byRow.keys()].sort((a, b) => a - b)

	for (const rowNum of sortedRows) {
		const rowItems = byRow.get(rowNum)!
		const byGroup = new Map<number, NormalizedToolbarItem<T>[]>()

		for (const item of rowItems) {
			const group = item.group
			if (!byGroup.has(group)) byGroup.set(group, [])
			byGroup.get(group)!.push(item)
		}

		const sortedGroups = [...byGroup.keys()].sort((a, b) => a - b)
		result.push({
			rowNum,
			groups: sortedGroups.map(groupNum => ({
				groupNum,
				items: byGroup.get(groupNum)!
			}))
		})
	}

	return result
}

// =============================================================================
// Render Toolbar HTML
// =============================================================================

/**
 * Render toolbar HTML for a specific row
 */
export function renderToolbarHTML<T>(
	items: NormalizedToolbarItem<T>[],
	row: T,
	rowIndex: number
): string {
	const grouped = groupToolbarItems(items)

	const rowsHtml = grouped.map(({ groups }) => {
		const groupsHtml = groups.map(({ items: groupItems }, groupIdx) => {
			const divider = groupIdx > 0 ? '<div class="wg__toolbar-divider"></div>' : ''

			const buttonsHtml = groupItems.map(item => {
				const isDisabled = typeof item.disabled === 'function'
					? item.disabled(row, rowIndex)
					: item.disabled

				const classes = [
					'wg__toolbar-btn',
					item.danger ? 'wg__toolbar-btn--danger' : ''
				].filter(Boolean).join(' ')

				const labelHtml = item.label
					? `<span class="wg__toolbar-label">${item.label}</span>`
					: ''

				return `<button
					class="${classes}"
					data-toolbar-item="${item.id}"
					title="${item.title}"
					${isDisabled ? 'disabled' : ''}
				>${item.icon}${labelHtml}</button>`
			}).join('')

			return divider + buttonsHtml
		}).join('')

		return `<div class="wg__toolbar-row">${groupsHtml}</div>`
	}).join('')

	return `<div class="wg__toolbar">${rowsHtml}</div>`
}

// =============================================================================
// Open/Close Toolbar
// =============================================================================

let activeToolbar: {
	container: HTMLElement
	toolbar: HTMLElement
	rowIndex: number
	rowItem: unknown  // Reference to the actual data item
	position: 'left' | 'right' | 'top'
	hasRowMoved: boolean
	cursorX?: number  // Store cursor X for connector in 'cursor' mode
	cleanup: () => void
} | null = null

/**
 * Open toolbar for a specific row
 */
export function openToolbar<T>(
	ctx: GridContext<T>,
	rowElement: HTMLElement,
	rowIndex: number,
	items: NormalizedToolbarItem<T>[],
	row: T,
	onItemClick: (item: NormalizedToolbarItem<T>) => void,
	cursorX?: number  // For 'cursor' mode positioning
): void {
	// Close any existing toolbar
	closeToolbar()

	const html = renderToolbarHTML(items, row, rowIndex)

	// Create container - append to shadow root to stay in same DOM context as rowElement
	const container = document.createElement('div')
	container.className = 'wg__toolbar-container'
	container.innerHTML = html
	ctx.shadow.appendChild(container)

	const toolbar = container.querySelector('.wg__toolbar') as HTMLElement
	let toolbarPosition: 'left' | 'right' | 'top' = 'left'

	// Wait for next frame before positioning (ensures element is rendered)
	requestAnimationFrame(() => {
		// Re-query row element fresh from shadow DOM (original might be stale)
		const freshRow = ctx.shadow.querySelector(`tr[data-row-index="${rowIndex}"]`) as HTMLElement
		if (!freshRow) {
			closeToolbar()
			return
		}

		const rowRect = freshRow.getBoundingClientRect()
		const toolbarRect = toolbar.getBoundingClientRect()

		// Get table bounds for position detection (like QuickGrid)
		const table = ctx.shadow.querySelector('.wg__table') as HTMLElement
		const tableRect = table?.getBoundingClientRect()
		const minSpace = 100  // Minimum space needed for toolbar

		// Determine position: left, right, or top (like QuickGrid)
		if (tableRect) {
			if (tableRect.left >= minSpace) {
				toolbarPosition = 'left'
			} else if (window.innerWidth - tableRect.right >= minSpace) {
				toolbarPosition = 'right'
			} else {
				toolbarPosition = 'top'
			}
		}

		// Calculate x, y based on position
		let x: number, y: number
		if (toolbarPosition === 'left') {
			x = rowRect.left - toolbarRect.width
			// Center toolbar vertically with the row
			y = rowRect.top + (rowRect.height - toolbarRect.height) / 2
		} else if (toolbarPosition === 'right') {
			x = rowRect.right
			y = rowRect.top + (rowRect.height - toolbarRect.height) / 2
		} else {
			// 'top' - position above the row
			y = rowRect.top - toolbarRect.height
			// Horizontal position based on toolbarTopPosition setting
			const topPosition = ctx.grid.toolbarTopPosition
			if (topPosition === 'start') {
				x = rowRect.left
			} else if (topPosition === 'end') {
				x = rowRect.right - toolbarRect.width
			} else if (topPosition === 'cursor' && cursorX !== undefined) {
				x = cursorX - toolbarRect.width / 2  // Center on cursor
			} else {
				// 'center' (default)
				x = rowRect.left + (rowRect.width - toolbarRect.width) / 2
			}
		}

		// Override vertical alignment if explicitly set to 'top' (align toolbar top with row top)
		if (toolbarPosition !== 'top' && ctx.grid.toolbarAlign === 'top') {
			y = rowRect.top
		}

		// Viewport clamping - keep toolbar within visible area
		if (x + toolbarRect.width > window.innerWidth - 8) {
			x = window.innerWidth - toolbarRect.width - 8
		}
		if (x < 8) {
			x = 8
		}
		if (y + toolbarRect.height > window.innerHeight - 8) {
			y = window.innerHeight - toolbarRect.height - 8
		}
		if (y < 8) {
			y = 8
		}

		Object.assign(toolbar.style, {
			position: 'fixed',
			left: `${x}px`,
			top: `${y}px`
		})

		// Store position for connector calculations
		if (activeToolbar) {
			activeToolbar.position = toolbarPosition
		}
	})

	// Handle button clicks
	const handleClick = (e: MouseEvent) => {
		const btn = (e.target as HTMLElement).closest('.wg__toolbar-btn') as HTMLButtonElement
		if (btn && !btn.disabled) {
			const itemId = btn.dataset.toolbarItem || ''
			const item = items.find(i => i.id === itemId)
			if (item) {
				onItemClick(item)
			}
		}
	}

	container.addEventListener('click', handleClick)

	// Store cleanup and row reference for connector tracking
	activeToolbar = {
		container,
		toolbar,
		rowIndex,
		rowItem: row,
		position: toolbarPosition,
		hasRowMoved: false,
		cursorX,
		cleanup: () => {
			container.removeEventListener('click', handleClick)
			container.remove()
		}
	}

	// Reset connector state
	connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
}

/**
 * Close the active toolbar
 */
export function closeToolbar(): void {
	if (activeToolbar) {
		activeToolbar.cleanup()
		activeToolbar = null
	}
	// Reset connector state
	connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
}

/**
 * Get currently active toolbar row index
 */
export function getActiveToolbarRowIndex(): number | null {
	return activeToolbar?.rowIndex ?? null
}

/**
 * Check if active toolbar belongs to a specific shadow root
 */
export function isToolbarOwnedBy(shadow: ShadowRoot): boolean {
	return activeToolbar?.container.getRootNode() === shadow
}

/**
 * Check if toolbar is open for a specific row
 */
export function isToolbarOpenForRow(rowIndex: number): boolean {
	return activeToolbar?.rowIndex === rowIndex
}

/**
 * Get the row item reference for the active toolbar
 */
export function getActiveToolbarRowItem<T>(): T | null {
	return activeToolbar?.rowItem as T ?? null
}

/**
 * Get the current connector state for rendering
 */
export function getConnectorState(): ConnectorState {
	return connectorState
}

/**
 * Update connector path after row has moved
 * Call this after a moveUp/moveDown action to draw the bracket-shaped connector
 */
export function updateConnector<T>(
	ctx: GridContext<T>,
	displayItems: T[]
): void {
	if (!activeToolbar) {
		connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
		return
	}

	const { toolbar, rowItem, position } = activeToolbar

	// Find current index of the row item (it may have moved)
	const currentIndex = displayItems.findIndex(item => item === rowItem)
	if (currentIndex === -1) {
		connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
		return
	}

	// Get the current row element
	const currentRowEl = ctx.shadow.querySelector(`tr[data-row-index="${currentIndex}"]`) as HTMLElement
	if (!currentRowEl) {
		connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
		return
	}

	// Check if row is at its original position
	const isAdjacent = currentIndex === activeToolbar.rowIndex

	// Track if row has ever moved
	if (!isAdjacent) {
		activeToolbar.hasRowMoved = true
	}

	// If row has never moved, no connector needed
	if (!activeToolbar.hasRowMoved) {
		connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
		return
	}

	const popupRect = toolbar.getBoundingClientRect()
	const rowRect = currentRowEl.getBoundingClientRect()
	const table = ctx.shadow.querySelector('.wg__table') as HTMLElement
	const tableRect = table?.getBoundingClientRect()

	if (!tableRect) {
		connectorState = { path: null, arrowPos: null, arrowDir: 'right' }
		return
	}

	const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl'

	// For 'top' position, check if overlapping
	const isOverlapping = !(rowRect.bottom < popupRect.top || rowRect.top > popupRect.bottom)

	// Bracket shape goes to the left side of the table (LTR) or right (RTL)
	const cornerX = isRTL ? tableRect.right + 15 : tableRect.left - 15
	const endX = isRTL ? rowRect.right + 8 : rowRect.left - 8
	const endY = rowRect.top + rowRect.height / 2

	let path: string
	let arrowDir: 'left' | 'right' | 'down' | 'up' = isRTL ? 'left' : 'right'

	if (position === 'left') {
		// Popup is to the left - connect from right side of popup
		const startX = popupRect.right
		const startY = popupRect.top + popupRect.height / 2
		path = `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`
	} else if (position === 'right') {
		// Popup is to the right - connect from left side of popup
		const startX = popupRect.left
		const startY = popupRect.top + popupRect.height / 2
		path = `M ${startX} ${startY} H ${cornerX} V ${endY} H ${endX}`
	} else {
		// Position: 'top' - L-shaped connector from right side of toolbar
		const horizontalLength = 48  // 3rem at 16px base

		// Start from center-right of toolbar
		const startX = popupRect.right
		const startY = popupRect.top + popupRect.height / 2
		const turnX = startX + horizontalLength

		// Calculate length: current row index - original toolbar row index
		const length = currentIndex - activeToolbar.rowIndex

		const arrowSize = 8  // Arrow head size

		if (length === 0) {
			// Row at same position - simple L pointing down at top edge of row
			const targetY = rowRect.top - arrowSize
			path = `M ${startX} ${startY} H ${turnX} V ${targetY}`
			connectorState = { path, arrowPos: { x: turnX, y: targetY }, arrowDir: 'down' }
			return
		} else if (length === -1) {
			// Row one position above (behind toolbar) - U-turn loop on right side
			const loopWidth = 24  // 1.5rem
			const startLoopY = popupRect.top + popupRect.height * 0.25
			const endLoopY = popupRect.top + popupRect.height * 0.75
			const loopX = popupRect.right + loopWidth
			const endX = popupRect.right + arrowSize  // Leave space for arrow
			path = `M ${popupRect.right} ${startLoopY} H ${loopX} V ${endLoopY} H ${endX}`
			connectorState = { path, arrowPos: { x: endX, y: endLoopY }, arrowDir: 'left' }
			return
		} else if (length < 0) {
			// Row above toolbar (more than 1) - L goes UP, arrow points UP at bottom edge of row
			const targetY = rowRect.bottom + arrowSize
			path = `M ${startX} ${startY} H ${turnX} V ${targetY}`
			connectorState = { path, arrowPos: { x: turnX, y: targetY }, arrowDir: 'up' }
			return
		} else {
			// Row below toolbar - L goes DOWN, arrow points DOWN at top edge of row
			const targetY = rowRect.top - arrowSize
			path = `M ${startX} ${startY} H ${turnX} V ${targetY}`
			connectorState = { path, arrowPos: { x: turnX, y: targetY }, arrowDir: 'down' }
			return
		}
	}

	connectorState = { path, arrowPos: { x: endX, y: endY }, arrowDir }
}

// =============================================================================
// Render Trigger Button (for button mode)
// =============================================================================

/**
 * Render the toolbar trigger button HTML
 */
export function renderTriggerButton(rowIndex: number, isActive: boolean): string {
	const activeClass = isActive ? 'wg__toolbar-trigger--active' : ''
	return `<button
		class="wg__toolbar-trigger ${activeClass}"
		data-toolbar-trigger="${rowIndex}"
		title="Row actions"
	>⋮</button>`
}
