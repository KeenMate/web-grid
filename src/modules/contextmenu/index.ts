// =============================================================================
// Context Menu Module
// =============================================================================

import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { ContextMenuItem, ContextMenuContext } from '../../types.js'
import type { GridContext } from '../types.js'

// Context menu styles (injected into document.head)
const CONTEXT_MENU_STYLES = `
.wg-context-menu-container {
	position: fixed;
	z-index: var(--wg-cm-z-index, 10000);

	/* Colors */
	--wg-cm-background: var(--base-layer-01, #fff);
	--wg-cm-border-color: var(--base-stroke-default, #e0e0e0);
	--wg-cm-text-color: var(--base-text-color-primary, #1a1a1a);
	--wg-cm-text-secondary: var(--base-text-color-secondary, #666);
	--wg-cm-text-danger: var(--base-error-color, #d32f2f);
	--wg-cm-hover-bg: var(--base-layer-hover, #f5f5f5);
	--wg-cm-disabled-opacity: 0.5;

	/* Typography */
	--wg-cm-font-family: var(--base-font-family, inherit);
	--wg-cm-font-size: var(--base-font-size-sm, 13px);

	/* Sizing */
	--wg-cm-padding: 4px;
	--wg-cm-item-padding: 8px 12px;
	--wg-cm-min-width: 160px;
	--wg-cm-border-radius: var(--base-border-radius-sm, 4px);
	--wg-cm-icon-size: 16px;
	--wg-cm-icon-gap: 8px;

	/* Shadow */
	--wg-cm-shadow: var(--base-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.15));
}

.wg-context-menu {
	position: absolute;
	background: var(--wg-cm-background, #fff);
	border: 1px solid var(--wg-cm-border-color);
	border-radius: var(--wg-cm-border-radius);
	box-shadow: var(--wg-cm-shadow);
	padding: var(--wg-cm-padding) 0;
	min-width: var(--wg-cm-min-width);
	font-family: var(--wg-cm-font-family);
	font-size: var(--wg-cm-font-size);
	color: var(--wg-cm-text-color);
}

.wg-context-menu__item {
	display: flex;
	align-items: center;
	gap: var(--wg-cm-icon-gap);
	padding: var(--wg-cm-item-padding);
	cursor: pointer;
	white-space: nowrap;
}

.wg-context-menu__item:hover {
	background: var(--wg-cm-hover-bg);
}

.wg-context-menu__item--disabled {
	opacity: var(--wg-cm-disabled-opacity);
	cursor: not-allowed;
	pointer-events: none;
}

.wg-context-menu__item--danger {
	color: var(--wg-cm-text-danger);
}

.wg-context-menu__item--danger:hover {
	background: color-mix(in srgb, var(--wg-cm-text-danger) 10%, transparent);
}

.wg-context-menu__icon {
	width: var(--wg-cm-icon-size);
	height: var(--wg-cm-icon-size);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.wg-context-menu__label {
	flex: 1;
}

.wg-context-menu__divider {
	height: 1px;
	background: var(--wg-cm-border-color);
	margin: var(--wg-cm-padding) 0;
}
`

let stylesInjected = false

function injectStyles(): void {
	if (stylesInjected) return

	const style = document.createElement('style')
	style.id = 'wg-context-menu-styles'
	style.textContent = CONTEXT_MENU_STYLES
	document.head.appendChild(style)
	stylesInjected = true
}

/**
 * Render context menu HTML
 */
function renderContextMenu<T>(
	items: ContextMenuItem<T>[],
	context: ContextMenuContext<T>
): string {
	const visibleItems = items.filter(item => {
		if (item.visible === undefined) return true
		return typeof item.visible === 'function' ? item.visible(context) : item.visible
	})

	if (visibleItems.length === 0) return ''

	const itemsHtml = visibleItems.map((item, index) => {
		const label = typeof item.label === 'function' ? item.label(context) : item.label
		const icon = typeof item.icon === 'function' ? item.icon(context) : item.icon
		const isDisabled = typeof item.disabled === 'function' ? item.disabled(context) : item.disabled
		const isDanger = item.danger === true

		const classes = [
			'wg-context-menu__item',
			isDisabled ? 'wg-context-menu__item--disabled' : '',
			isDanger ? 'wg-context-menu__item--danger' : ''
		].filter(Boolean).join(' ')

		const divider = item.dividerBefore && index > 0 ? '<div class="wg-context-menu__divider"></div>' : ''

		const iconHtml = icon
			? `<span class="wg-context-menu__icon">${icon}</span>`
			: ''

		return `${divider}<div class="${classes}" data-item-id="${item.id}" data-disabled="${isDisabled ? 'true' : 'false'}">${iconHtml}<span class="wg-context-menu__label">${label}</span></div>`
	}).join('')

	return `<div class="wg-context-menu">${itemsHtml}</div>`
}

/**
 * Open context menu at position
 */
export function openContextMenu<T>(
	ctx: GridContext<T>,
	x: number,
	y: number,
	items: ContextMenuItem<T>[],
	menuContext: ContextMenuContext<T>,
	onItemClick: (itemId: string) => void,
	onClose: () => void
): HTMLElement | null {
	injectStyles()

	const html = renderContextMenu(items, menuContext)
	if (!html) return null

	// Create container
	const container = document.createElement('div')
	container.className = 'wg-context-menu-container'
	container.innerHTML = html
	document.body.appendChild(container)

	const menu = container.querySelector('.wg-context-menu') as HTMLElement

	// Position using a virtual element at the click coordinates
	const virtualEl = {
		getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			x,
			y,
			top: y,
			left: x,
			right: x,
			bottom: y
		})
	}

	computePosition(virtualEl, menu, {
		placement: 'bottom-start',
		middleware: [
			offset(4),
			flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }),
			shift({ padding: 8 })
		]
	}).then(({ x: posX, y: posY }) => {
		Object.assign(menu.style, {
			left: `${posX}px`,
			top: `${posY}px`
		})
	})

	// Handle item clicks
	container.addEventListener('click', (e) => {
		const item = (e.target as HTMLElement).closest('.wg-context-menu__item') as HTMLElement
		if (item && item.dataset.disabled !== 'true') {
			const itemId = item.dataset.itemId || ''
			onItemClick(itemId)
		}
	})

	// Handle close on outside click
	const handleOutsideClick = (e: MouseEvent) => {
		if (!container.contains(e.target as Node)) {
			closeContextMenu(container, handleOutsideClick, handleKeyDown)
			onClose()
		}
	}

	// Handle close on Escape
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			closeContextMenu(container, handleOutsideClick, handleKeyDown)
			onClose()
		}
	}

	// Attach listeners with delay to avoid catching the opening click
	setTimeout(() => {
		document.addEventListener('mousedown', handleOutsideClick)
		document.addEventListener('keydown', handleKeyDown)
	}, 0)

	// Store cleanup functions on container for later removal
	;(container as any)._cleanup = { handleOutsideClick, handleKeyDown }

	return container
}

/**
 * Close context menu and cleanup
 */
export function closeContextMenu(
	container: HTMLElement,
	handleOutsideClick?: (e: MouseEvent) => void,
	handleKeyDown?: (e: KeyboardEvent) => void
): void {
	if (handleOutsideClick) {
		document.removeEventListener('mousedown', handleOutsideClick)
	}
	if (handleKeyDown) {
		document.removeEventListener('keydown', handleKeyDown)
	}

	// Also check for stored cleanup functions
	const cleanup = (container as any)._cleanup
	if (cleanup) {
		if (cleanup.handleOutsideClick) {
			document.removeEventListener('mousedown', cleanup.handleOutsideClick)
		}
		if (cleanup.handleKeyDown) {
			document.removeEventListener('keydown', cleanup.handleKeyDown)
		}
	}

	container.remove()
}
