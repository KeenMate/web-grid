// =============================================================================
// Column Reorder Module
// =============================================================================

import type { GridContext } from '../types.js'

/**
 * State for tracking an active reorder operation
 */
export interface ReorderState {
	isReordering: boolean
	field: string
	startX: number
	headerCell: HTMLElement | null
	ghost: HTMLElement | null
	dropIndicator: HTMLElement | null
	fromIndex: number
	currentDropIndex: number
}

// Module-level state
let reorderState: ReorderState = {
	isReordering: false,
	field: '',
	startX: 0,
	headerCell: null,
	ghost: null,
	dropIndicator: null,
	fromIndex: -1,
	currentDropIndex: -1
}

// Store the current context for document-level handlers
let activeContext: GridContext | null = null

/**
 * Get the current reorder state
 */
export function getReorderState(): ReorderState {
	return reorderState
}

/**
 * Check if reorder is currently active
 */
export function isReordering(): boolean {
	return reorderState.isReordering
}

/**
 * Start a column reorder operation
 */
export function handleReorderStart<T>(ctx: GridContext<T>, e: MouseEvent, field: string): void {
	const target = e.target as HTMLElement
	const headerCell = target.closest('.wg__header') as HTMLElement
	if (!headerCell) return

	// Don't start reorder if clicking on resize handle
	if (target.classList.contains('wg__resize-handle')) return

	// Check if column is frozen (frozen columns are not reorderable)
	const visualCols = ctx.grid.visualColumns
	const frozenCount = ctx.grid.totalFrozenColumns
	const visualIndex = visualCols.findIndex(vc => String(vc.column.field) === field)
	if (visualIndex < frozenCount) return  // This is a frozen column

	// Get non-frozen column index
	const nonFrozenIndex = visualIndex - frozenCount

	// Set up reorder state
	reorderState = {
		isReordering: true,
		field,
		startX: e.clientX,
		headerCell,
		ghost: null,
		dropIndicator: null,
		fromIndex: nonFrozenIndex,
		currentDropIndex: nonFrozenIndex
	}

	activeContext = ctx as GridContext

	// Add reordering class to grid container
	const container = ctx.shadow.querySelector('.wg')
	container?.classList.add('wg--reordering')

	// Add dragging class to header
	headerCell.classList.add('wg__header--dragging')

	// Create ghost element
	createGhost(ctx, headerCell, e)

	// Create drop indicator
	createDropIndicator(ctx)

	// Attach document-level listeners
	document.addEventListener('mousemove', handleDocumentMouseMove)
	document.addEventListener('mouseup', handleDocumentMouseUp)

	// Prevent text selection during reorder
	e.preventDefault()
}

/**
 * Create ghost element that follows cursor
 */
function createGhost<T>(ctx: GridContext<T>, headerCell: HTMLElement, e: MouseEvent): void {
	const ghost = document.createElement('div')
	ghost.className = 'wg__reorder-ghost'
	ghost.textContent = headerCell.querySelector('.wg__header-title')?.textContent || ''

	// Position near cursor (offset slightly so it doesn't block the cursor)
	const containerRect = ctx.shadow.querySelector('.wg')?.getBoundingClientRect()
	if (containerRect) {
		ghost.style.left = `${e.clientX - containerRect.left + 10}px`
		ghost.style.top = `${e.clientY - containerRect.top - 10}px`
	}

	ctx.shadow.querySelector('.wg')?.appendChild(ghost)
	reorderState.ghost = ghost
}

/**
 * Create drop indicator line
 */
function createDropIndicator<T>(ctx: GridContext<T>): void {
	const indicator = document.createElement('div')
	indicator.className = 'wg__drop-indicator'
	ctx.shadow.querySelector('.wg')?.appendChild(indicator)
	reorderState.dropIndicator = indicator
}

/**
 * Handle mouse move during reorder (document-level)
 */
function handleDocumentMouseMove(e: MouseEvent): void {
	if (!reorderState.isReordering || !activeContext) return

	const container = activeContext.shadow.querySelector('.wg')
	if (!container) return

	// Move ghost to follow cursor
	if (reorderState.ghost) {
		const containerRect = container.getBoundingClientRect()
		reorderState.ghost.style.left = `${e.clientX - containerRect.left + 10}px`
		reorderState.ghost.style.top = `${e.clientY - containerRect.top - 10}px`
	}

	// Find drop target based on mouse position
	const dropIndex = findDropIndex(activeContext, e.clientX)
	if (dropIndex !== reorderState.currentDropIndex) {
		reorderState.currentDropIndex = dropIndex
		updateDropIndicator(activeContext, dropIndex)
	}
}

/**
 * Find the drop index based on cursor X position
 * Returns index relative to non-frozen columns (0 = first position after frozen columns)
 */
function findDropIndex<T>(ctx: GridContext<T>, mouseX: number): number {
	const visualCols = ctx.grid.visualColumns
	const frozenCount = ctx.grid.totalFrozenColumns
	const nonFrozenCols = visualCols.slice(frozenCount)

	if (nonFrozenCols.length === 0) return 0

	// Get the first non-frozen column to check if mouse is in frozen area
	const firstNonFrozenField = String(nonFrozenCols[0].column.field)
	const firstNonFrozenHeader = ctx.shadow.querySelector(`th[data-field="${firstNonFrozenField}"]`) as HTMLElement

	// If mouse is to the left of the first non-frozen column, clamp to position 0
	if (firstNonFrozenHeader) {
		const firstRect = firstNonFrozenHeader.getBoundingClientRect()
		if (mouseX < firstRect.left) {
			return 0  // Drop at first non-frozen position (after all frozen columns)
		}
	}

	// Get header cells for non-frozen columns
	for (let i = 0; i < nonFrozenCols.length; i++) {
		const field = String(nonFrozenCols[i].column.field)
		const header = ctx.shadow.querySelector(`th[data-field="${field}"]`) as HTMLElement
		if (header) {
			const rect = header.getBoundingClientRect()
			const midpoint = rect.left + rect.width / 2
			if (mouseX < midpoint) {
				return i
			}
		}
	}

	// If past all columns, return last position
	return nonFrozenCols.length
}

/**
 * Update drop indicator position
 */
function updateDropIndicator<T>(ctx: GridContext<T>, dropIndex: number): void {
	const indicator = reorderState.dropIndicator
	if (!indicator) return

	const visualCols = ctx.grid.visualColumns
	const frozenCount = ctx.grid.totalFrozenColumns
	const nonFrozenCols = visualCols.slice(frozenCount)
	const container = ctx.shadow.querySelector('.wg')
	const containerRect = container?.getBoundingClientRect()
	if (!containerRect) return

	let targetX: number

	if (dropIndex >= nonFrozenCols.length) {
		// After last column
		const lastField = String(nonFrozenCols[nonFrozenCols.length - 1].column.field)
		const lastHeader = ctx.shadow.querySelector(`th[data-field="${lastField}"]`) as HTMLElement
		if (lastHeader) {
			const rect = lastHeader.getBoundingClientRect()
			targetX = rect.right - containerRect.left
		} else {
			return
		}
	} else {
		// Before column at dropIndex
		const field = String(nonFrozenCols[dropIndex].column.field)
		const header = ctx.shadow.querySelector(`th[data-field="${field}"]`) as HTMLElement
		if (header) {
			const rect = header.getBoundingClientRect()
			targetX = rect.left - containerRect.left
		} else {
			return
		}
	}

	indicator.style.left = `${targetX}px`
	indicator.style.display = 'block'
}

/**
 * End reorder operation (document-level)
 */
function handleDocumentMouseUp(e: MouseEvent): void {
	if (!reorderState.isReordering || !activeContext) return

	const ctx = activeContext
	const field = reorderState.field
	const fromIndex = reorderState.fromIndex
	const toIndex = reorderState.currentDropIndex

	// Apply the reorder if position changed
	if (fromIndex !== toIndex && toIndex !== fromIndex + 1) {
		// Adjust toIndex if moving right (since we remove from original position first)
		const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex
		ctx.grid.moveColumn(field, adjustedToIndex)

		// Fire callback
		if (ctx.grid.oncolumnreorder) {
			ctx.grid.oncolumnreorder({
				field,
				fromIndex,
				toIndex: adjustedToIndex,
				allOrder: ctx.grid.getColumnOrderState()
			})
		}

		// Persist to localStorage if enabled
		if (ctx.grid.persistColumnOrder && ctx.grid.gridName) {
			ctx.grid.savePersistedState()
		}
	}

	// Clean up
	cleanup(ctx)
}

/**
 * Clean up reorder state and DOM elements
 */
function cleanup<T>(ctx: GridContext<T>): void {
	// Remove ghost
	if (reorderState.ghost) {
		reorderState.ghost.remove()
	}

	// Remove drop indicator
	if (reorderState.dropIndicator) {
		reorderState.dropIndicator.remove()
	}

	// Remove classes
	const container = ctx.shadow.querySelector('.wg')
	container?.classList.remove('wg--reordering')

	if (reorderState.headerCell) {
		reorderState.headerCell.classList.remove('wg__header--dragging')
	}

	// Remove document listeners
	document.removeEventListener('mousemove', handleDocumentMouseMove)
	document.removeEventListener('mouseup', handleDocumentMouseUp)

	// Reset state
	reorderState = {
		isReordering: false,
		field: '',
		startX: 0,
		headerCell: null,
		ghost: null,
		dropIndicator: null,
		fromIndex: -1,
		currentDropIndex: -1
	}
	activeContext = null
}
