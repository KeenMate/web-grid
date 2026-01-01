// =============================================================================
// Tooltip Module
// Show/hide/create tooltips using Floating UI for positioning
// =============================================================================

import { computePosition, flip, offset, arrow } from '@floating-ui/dom'
import type { GridContext } from '../types.js'

/**
 * Show tooltip for an element
 */
export function showTooltip<T>(
	ctx: GridContext<T>,
	anchor: HTMLElement,
	text: string,
	delay?: number
): void {
	const showDelay = delay ?? ctx.tooltipShowDelay

	// Clear any pending hide
	if (ctx.tooltipHideTimer) {
		clearTimeout(ctx.tooltipHideTimer)
		ctx.tooltipHideTimer = null
	}

	// If tooltip already showing for same anchor, just keep it
	// (check anchor, not text - same text on different cells should reposition)
	if (ctx.tooltipElement && ctx.tooltipAnchor === anchor) {
		return
	}

	// Clear any pending show
	if (ctx.tooltipShowTimer) {
		clearTimeout(ctx.tooltipShowTimer)
	}

	ctx.tooltipShowTimer = setTimeout(() => {
		createTooltip(ctx, anchor, text)
	}, showDelay)
}

/**
 * Hide tooltip
 */
export function hideTooltip<T>(ctx: GridContext<T>, delay?: number): void {
	const hideDelay = delay ?? ctx.tooltipHideDelay

	// Clear any pending show
	if (ctx.tooltipShowTimer) {
		clearTimeout(ctx.tooltipShowTimer)
		ctx.tooltipShowTimer = null
	}

	// If no tooltip, nothing to hide
	if (!ctx.tooltipElement) return

	// Delay hide slightly to allow moving to tooltip
	ctx.tooltipHideTimer = setTimeout(() => {
		if (ctx.tooltipElement) {
			ctx.tooltipElement.classList.remove('wg__tooltip--visible')
			// Remove after transition
			setTimeout(() => {
				ctx.tooltipElement?.remove()
				ctx.tooltipElement = null
				ctx.tooltipArrowElement = null
				ctx.tooltipAnchor = null
			}, 100)
		}
	}, hideDelay)
}

/**
 * Create and position tooltip element
 */
export function createTooltip<T>(
	ctx: GridContext<T>,
	anchor: HTMLElement,
	text: string
): void {
	// Remove existing
	ctx.tooltipElement?.remove()

	// Create tooltip
	const tooltip = document.createElement('div')
	tooltip.className = 'wg__tooltip'
	tooltip.textContent = text

	// Create arrow
	const arrowEl = document.createElement('div')
	arrowEl.className = 'wg__tooltip-arrow'
	tooltip.appendChild(arrowEl)

	ctx.shadow.appendChild(tooltip)
	ctx.tooltipElement = tooltip
	ctx.tooltipArrowElement = arrowEl
	ctx.tooltipAnchor = anchor

	// Position with Floating UI
	computePosition(anchor, tooltip, {
		strategy: 'fixed',
		placement: 'top',
		middleware: [
			offset(8),
			flip({ fallbackPlacements: ['bottom', 'left', 'right'] }),
			arrow({ element: arrowEl })
		]
	}).then(({ x, y, placement, middlewareData }) => {
		tooltip.style.left = `${x}px`
		tooltip.style.top = `${y}px`
		tooltip.setAttribute('data-placement', placement)

		// Position arrow
		if (middlewareData.arrow) {
			const { x: arrowX, y: arrowY } = middlewareData.arrow
			if (arrowX != null) arrowEl.style.left = `${arrowX}px`
			if (arrowY != null) arrowEl.style.top = `${arrowY}px`
		}

		// Show with animation
		requestAnimationFrame(() => {
			tooltip.classList.add('wg__tooltip--visible')
		})
	})
}
