// =============================================================================
// Context Menu Module
// =============================================================================

import { computePosition, flip, shift } from '@floating-ui/dom'
import type {
	ContextMenuItem,
	ContextMenuContext,
	HeaderMenuConfig,
	HeaderMenuItem,
	HeaderMenuContext,
	PredefinedHeaderMenuItemType,
	GridLabels
} from '../../types.js'
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

.wg-context-menu__shortcut {
	margin-left: auto;
	padding-left: 16px;
	color: var(--wg-cm-text-secondary);
	font-size: 0.9em;
}

.wg-context-menu__divider {
	height: 1px;
	background: var(--wg-cm-border-color);
	margin: var(--wg-cm-padding) 0;
}

/* Submenu support */
.wg-context-menu__item--has-submenu {
	position: relative;
}

.wg-context-menu__item--has-submenu::after {
	content: '▶';
	margin-left: auto;
	padding-left: 16px;
	font-size: 0.65em;
	opacity: 0.6;
}

.wg-context-menu--submenu {
	position: absolute;
	left: 100%;
	top: -5px;
	/* No margin - box-shadow provides visual separation, no hover gap */
	display: none;
}

.wg-context-menu__item--has-submenu:hover > .wg-context-menu--submenu {
	display: block;
}

/* Submenu item with checkbox-like toggle */
.wg-context-menu__item--toggle .wg-context-menu__icon {
	opacity: 0.4;
}

.wg-context-menu__item--toggle.wg-context-menu__item--checked .wg-context-menu__icon {
	opacity: 1;
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
		const shortcut = item.shortcut
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

		const shortcutHtml = shortcut
			? `<span class="wg-context-menu__shortcut">${shortcut}</span>`
			: ''

		return `${divider}<div class="${classes}" data-item-id="${item.id}" data-disabled="${isDisabled ? 'true' : 'false'}" data-shortcut="${shortcut || ''}">${iconHtml}<span class="wg-context-menu__label">${label}</span>${shortcutHtml}</div>`
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
	xOffset: number,
	yOffset: number,
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

	// Apply offsets to click coordinates
	const menuX = x + xOffset
	const menuY = y + yOffset

	// Position using a virtual element at the adjusted coordinates
	const virtualEl = {
		getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			x: menuX,
			y: menuY,
			top: menuY,
			left: menuX,
			right: menuX,
			bottom: menuY
		})
	}

	computePosition(virtualEl, menu, {
		placement: 'bottom-start',
		middleware: [
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

	// Subscribe to scroll events via the scroll event manager
	const scrollSubscription = ctx.scrollEvents.subscribe('window', () => {
		cleanup()
		onClose()
	})

	// Cleanup function to remove all listeners and close menu
	const cleanup = () => {
		scrollSubscription.unsubscribe()
		document.removeEventListener('mousedown', handleOutsideClick)
		document.removeEventListener('keydown', handleKeyDown)
		container.remove()
	}

	// Handle close on outside click
	const handleOutsideClick = (e: MouseEvent) => {
		if (!container.contains(e.target as Node)) {
			cleanup()
			onClose()
		}
	}

	// Handle close on Escape and shortcut keys
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			cleanup()
			onClose()
			return
		}

		// Match shortcut keys
		const key = e.key.toLowerCase()
		const menuItems = container.querySelectorAll('.wg-context-menu__item') as NodeListOf<HTMLElement>

		for (const menuItem of menuItems) {
			const shortcut = menuItem.dataset.shortcut
			const disabled = menuItem.dataset.disabled === 'true'

			if (disabled) continue
			if (!shortcut) continue

			// Case-insensitive match for single letters, exact match for others
			const shortcutLower = shortcut.toLowerCase()
			if (shortcutLower === key || shortcut === e.key) {
				e.preventDefault()
				const itemId = menuItem.dataset.itemId || ''
				onItemClick(itemId)
				cleanup()
				onClose()
				return
			}
		}
	}

	// Attach listeners with delay to avoid catching the opening click
	setTimeout(() => {
		document.addEventListener('mousedown', handleOutsideClick)
		document.addEventListener('keydown', handleKeyDown)
	}, 0)

	// Store cleanup function on container for later removal
	;(container as any)._cleanup = cleanup

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
	// Check for stored cleanup function (new style)
	const cleanup = (container as any)._cleanup
	if (typeof cleanup === 'function') {
		cleanup()
		return
	}

	// Legacy cleanup (old style with separate handlers)
	if (handleOutsideClick) {
		document.removeEventListener('mousedown', handleOutsideClick)
	}
	if (handleKeyDown) {
		document.removeEventListener('keydown', handleKeyDown)
	}

	container.remove()
}

// =============================================================================
// Header Context Menu
// =============================================================================

/**
 * Predefined header menu actions with icons and labels
 */
const PREDEFINED_HEADER_ACTIONS: Record<PredefinedHeaderMenuItemType, {
	icon: string
	labelKey: keyof GridLabels['contextMenu']
	danger?: boolean
	hasSubmenu?: boolean
}> = {
	sortAsc: { icon: '↑', labelKey: 'sortAsc' },
	sortDesc: { icon: '↓', labelKey: 'sortDesc' },
	clearSort: { icon: '✕', labelKey: 'clearSort' },
	hideColumn: { icon: '👁', labelKey: 'hideColumn' },
	freezeColumn: { icon: '❄', labelKey: 'freezeColumn' },
	unfreezeColumn: { icon: '☀', labelKey: 'unfreezeColumn' },
	columnVisibility: { icon: '👁', labelKey: 'columnVisibility', hasSubmenu: true }
}

/**
 * Normalize header menu items (convert string shortcuts to full items)
 * Handles standalone divider markers like { dividerBefore: true } by applying
 * the divider to the next actual item.
 */
export function normalizeHeaderMenuItems<T>(
	config: HeaderMenuConfig<T>[],
	context: HeaderMenuContext<T>
): HeaderMenuItem<T>[] {
	const result: HeaderMenuItem<T>[] = []
	let pendingDivider = false

	for (let index = 0; index < config.length; index++) {
		const item = config[index]

		if (typeof item === 'string') {
			// Predefined action shorthand
			const predefined = PREDEFINED_HEADER_ACTIONS[item]
			if (!predefined) {
				console.warn(`Unknown predefined header menu action: ${item}`)
				continue
			}

			// Add automatic visibility rules for predefined items
			let visible: boolean | ((ctx: HeaderMenuContext<T>) => boolean) = true

			if (item === 'sortAsc' || item === 'sortDesc') {
				// Hide sort options if column is not sortable
				visible = (ctx) => ctx.column.isSortable !== false
			} else if (item === 'clearSort') {
				// Only show clear sort if column is currently sorted
				visible = (ctx) => ctx.sortDirection !== null
			} else if (item === 'freezeColumn') {
				// Only show freeze if not already frozen
				visible = (ctx) => !ctx.isFrozen
			} else if (item === 'unfreezeColumn') {
				// Only show unfreeze if currently frozen
				visible = (ctx) => ctx.isFrozen
			}

			// Handle columnVisibility with dynamic submenu
			let submenu: ((ctx: HeaderMenuContext<T>) => HeaderMenuItem<T>[]) | undefined
			if (item === 'columnVisibility') {
				submenu = (ctx) => {
					// Check if all columns are visible
					const allVisible = ctx.allColumns.every(col => !col.isHidden)
					const items: HeaderMenuItem<T>[] = [
						// "Show all" option at the top - checked only if all columns are visible
						{
							id: 'show-all-columns',
							icon: allVisible ? '☑' : '☐',
							label: ctx.labels.contextMenu.showAll,
							onclick: () => {
								ctx.allColumns.forEach(col => {
									col.isHidden = false
								})
							}
						}
					]
					// Add individual column toggles
					ctx.allColumns.forEach(col => {
						items.push({
							id: `toggle-col-${String(col.field)}`,
							icon: col.isHidden ? '☐' : '☑',
							label: col.title || String(col.field),
							onclick: () => {
								col.isHidden = !col.isHidden
							}
						})
					})
					return items
				}
			}

			result.push({
				id: item,
				icon: predefined.icon,
				label: context.labels.contextMenu[predefined.labelKey],
				danger: predefined.danger,
				visible,
				dividerBefore: pendingDivider,
				submenu
			} as HeaderMenuItem<T>)
			pendingDivider = false
		} else if (item.dividerBefore && !item.id && !item.label) {
			// Standalone divider marker - apply to next item
			pendingDivider = true
		} else {
			// Full item object - pass through
			result.push({
				id: item.id || `header-menu-item-${index}`,
				...item,
				dividerBefore: pendingDivider || item.dividerBefore
			} as HeaderMenuItem<T>)
			pendingDivider = false
		}
	}

	return result
}

/**
 * Render a single header menu item (recursive for submenus)
 */
function renderHeaderMenuItem<T>(
	item: HeaderMenuItem<T>,
	context: HeaderMenuContext<T>,
	index: number,
	isSubmenuItem: boolean = false
): string {
	const label = typeof item.label === 'function' ? item.label(context) : item.label
	const icon = typeof item.icon === 'function' ? item.icon(context) : item.icon
	const shortcut = item.shortcut
	const isDisabled = typeof item.disabled === 'function' ? item.disabled(context) : item.disabled
	const isDanger = item.danger === true

	// Check for submenu
	const hasSubmenu = item.children?.length || item.submenu
	const submenuItems = item.children || (item.submenu ? item.submenu(context) : [])

	// Render submenu if present
	let submenuHtml = ''
	if (hasSubmenu && submenuItems.length > 0) {
		const submenuItemsHtml = submenuItems.map((child, i) =>
			renderHeaderMenuItem(child, context, i, true)
		).join('')
		submenuHtml = `<div class="wg-context-menu wg-context-menu--submenu">${submenuItemsHtml}</div>`
	}

	// Determine if this is a toggle item (for column visibility)
	const isToggle = isSubmenuItem && item.id?.startsWith('toggle-col-')
	const isChecked = isToggle && icon === '☑'

	const classes = [
		'wg-context-menu__item',
		isDisabled ? 'wg-context-menu__item--disabled' : '',
		isDanger ? 'wg-context-menu__item--danger' : '',
		hasSubmenu ? 'wg-context-menu__item--has-submenu' : '',
		isToggle ? 'wg-context-menu__item--toggle' : '',
		isChecked ? 'wg-context-menu__item--checked' : ''
	].filter(Boolean).join(' ')

	const divider = item.dividerBefore && index > 0 ? '<div class="wg-context-menu__divider"></div>' : ''

	const iconHtml = icon
		? `<span class="wg-context-menu__icon">${icon}</span>`
		: ''

	const shortcutHtml = shortcut
		? `<span class="wg-context-menu__shortcut">${shortcut}</span>`
		: ''

	return `${divider}<div class="${classes}" data-item-id="${item.id}" data-disabled="${isDisabled ? 'true' : 'false'}" data-shortcut="${shortcut || ''}">${iconHtml}<span class="wg-context-menu__label">${label}</span>${shortcutHtml}${submenuHtml}</div>`
}

/**
 * Render header context menu HTML
 */
function renderHeaderContextMenu<T>(
	items: HeaderMenuItem<T>[],
	context: HeaderMenuContext<T>
): string {
	const visibleItems = items.filter(item => {
		if (item.visible === undefined) return true
		return typeof item.visible === 'function' ? item.visible(context) : item.visible
	})

	if (visibleItems.length === 0) return ''

	const itemsHtml = visibleItems.map((item, index) =>
		renderHeaderMenuItem(item, context, index)
	).join('')

	return `<div class="wg-context-menu">${itemsHtml}</div>`
}

/**
 * Execute predefined header menu action
 */
export function executeHeaderMenuAction<T>(
	ctx: GridContext<T>,
	actionId: string,
	menuContext: HeaderMenuContext<T>,
	ctrlKey: boolean = false
): void {
	const { field, columnIndex } = menuContext

	switch (actionId) {
		case 'sortAsc':
		case 'sortDesc': {
			const direction = actionId === 'sortAsc' ? 'asc' : 'desc'
			const currentSort = [...ctx.grid.sort]

			if (ctrlKey && ctx.grid.sortMode === 'multi') {
				// Multi-sort: Ctrl+click adds/updates this column
				const existingIndex = currentSort.findIndex(s => s.column === field)
				if (existingIndex >= 0) {
					currentSort[existingIndex] = { column: field, direction }
				} else {
					currentSort.push({ column: field, direction })
				}
				ctx.grid.sort = currentSort
			} else {
				// Single sort: replace
				ctx.grid.sort = [{ column: field, direction }]
			}
			break
		}
		case 'clearSort':
			// Remove sort for this column
			ctx.grid.sort = ctx.grid.sort.filter(s => s.column !== field)
			break
		case 'hideColumn': {
			// Hide the column by setting isHidden property (keeps it in array for Column Visibility)
			const col = ctx.grid.columns.find(c => String(c.field) === field)
			if (col) {
				col.isHidden = true
				ctx.grid.columns = [...ctx.grid.columns]  // Trigger update
			}
			break
		}
		case 'freezeColumn':
			// Freeze up to and including this column
			ctx.grid.freezeColumns = columnIndex + 1
			break
		case 'unfreezeColumn':
			// Unfreeze by reducing freeze count to before this column
			ctx.grid.freezeColumns = Math.max(0, columnIndex)
			break
	}
}

/**
 * Open header context menu at position
 */
export function openHeaderContextMenu<T>(
	ctx: GridContext<T>,
	x: number,
	y: number,
	items: HeaderMenuItem<T>[],
	menuContext: HeaderMenuContext<T>,
	onItemClick: (itemId: string, keepOpen?: boolean, ctrlKey?: boolean) => void,
	onClose: () => void
): HTMLElement | null {
	injectStyles()

	const html = renderHeaderContextMenu(items, menuContext)
	if (!html) return null

	// Create container
	const container = document.createElement('div')
	container.className = 'wg-context-menu-container'
	container.innerHTML = html
	document.body.appendChild(container)

	let currentMenu = container.querySelector('.wg-context-menu') as HTMLElement

	// Position using a virtual element at the click coordinates
	const virtualEl = {
		getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			x: x,
			y: y,
			top: y,
			left: x,
			right: x,
			bottom: y
		})
	}

	computePosition(virtualEl, currentMenu, {
		placement: 'bottom-start',
		middleware: [
			flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }),
			shift({ padding: 8 })
		]
	}).then(({ x: posX, y: posY }) => {
		Object.assign(currentMenu.style, {
			left: `${posX}px`,
			top: `${posY}px`
		})
	})

	// Handle item clicks
	container.addEventListener('click', (e) => {
		const item = (e.target as HTMLElement).closest('.wg-context-menu__item') as HTMLElement
		if (!item || item.dataset.disabled === 'true') return

		const itemId = item.dataset.itemId || ''
		const ctrlKey = e.ctrlKey

		// Don't do anything if clicking a parent item with submenu
		if (item.classList.contains('wg-context-menu__item--has-submenu')) {
			return
		}

		// For toggle items (column visibility) and show-all, execute but keep menu open and refresh
		if (itemId.startsWith('toggle-col-') || itemId === 'show-all-columns') {
			onItemClick(itemId, true, ctrlKey)  // true = keep menu open
			// Re-render the menu to show updated toggle state
			const newHtml = renderHeaderContextMenu(items, menuContext)
			const newMenuWrapper = document.createElement('div')
			newMenuWrapper.innerHTML = newHtml
			const newMenuEl = newMenuWrapper.querySelector('.wg-context-menu') as HTMLElement
			if (newMenuEl && currentMenu.parentNode) {
				// Copy position from old menu
				newMenuEl.style.left = currentMenu.style.left
				newMenuEl.style.top = currentMenu.style.top
				currentMenu.parentNode.replaceChild(newMenuEl, currentMenu)
				currentMenu = newMenuEl

				// Force submenu to stay visible (CSS :hover is lost on DOM replace)
				const submenu = newMenuEl.querySelector('.wg-context-menu--submenu') as HTMLElement
				if (submenu) {
					submenu.style.display = 'block'
				}
			}
			return
		}

		// Normal item - execute and close
		onItemClick(itemId, false, ctrlKey)
	})

	// Subscribe to scroll events via the scroll event manager
	const scrollSubscription = ctx.scrollEvents.subscribe('window', () => {
		cleanup()
		onClose()
	})

	// Cleanup function to remove all listeners and close menu
	const cleanup = () => {
		scrollSubscription.unsubscribe()
		document.removeEventListener('mousedown', handleOutsideClick)
		document.removeEventListener('keydown', handleKeyDown)
		container.remove()
	}

	// Handle close on outside click
	const handleOutsideClick = (e: MouseEvent) => {
		if (!container.contains(e.target as Node)) {
			cleanup()
			onClose()
		}
	}

	// Handle close on Escape and shortcut keys
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			cleanup()
			onClose()
			return
		}

		// Match shortcut keys
		const key = e.key.toLowerCase()
		const menuItems = container.querySelectorAll('.wg-context-menu__item') as NodeListOf<HTMLElement>

		for (const menuItem of menuItems) {
			const shortcut = menuItem.dataset.shortcut
			const disabled = menuItem.dataset.disabled === 'true'

			if (disabled) continue
			if (!shortcut) continue

			// Case-insensitive match for single letters, exact match for others
			const shortcutLower = shortcut.toLowerCase()
			if (shortcutLower === key || shortcut === e.key) {
				e.preventDefault()
				const itemId = menuItem.dataset.itemId || ''
				onItemClick(itemId)
				cleanup()
				onClose()
				return
			}
		}
	}

	// Attach listeners with delay to avoid catching the opening click
	setTimeout(() => {
		document.addEventListener('mousedown', handleOutsideClick)
		document.addEventListener('keydown', handleKeyDown)
	}, 0)

	// Store cleanup function on container for later removal
	;(container as any)._cleanup = cleanup

	return container
}
