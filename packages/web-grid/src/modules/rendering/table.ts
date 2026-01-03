// =============================================================================
// Table Rendering Module
// Render header row, data rows, pagination
// =============================================================================

import type { GridContext } from '../types.js'
import { renderCellEditor } from '../editing/index.js'
import { renderCellDisplay } from './display.js'
import { renderTriggerButton, getActiveToolbarRowIndex } from '../toolbar/index.js'

/**
 * Get container CSS classes
 */
export function getContainerClasses<T>(ctx: GridContext<T>): string {
	const classes = ['wg']
	if (ctx.grid.striped) classes.push('wg--striped')
	if (ctx.grid.hoverable) classes.push('wg--hoverable')
	if (ctx.grid.editable) classes.push('wg--editable')
	if (ctx.grid.isNavigateMode) classes.push('wg--navigate-mode')
	return classes.join(' ')
}

/**
 * Render header row
 */
export function renderHeaderRow<T>(ctx: GridContext<T>): string {
	const columns = ctx.grid.columns
	if (columns.length === 0) return ''

	// Row number column
	const rowNumberColumnHtml = ctx.grid.showRowNumbers
		? '<th class="wg__header wg__row-number-header">#</th>'
		: ''

	// Actions column for button trigger mode
	const showActionsColumn = ctx.grid.showRowToolbar && ctx.grid.toolbarTrigger === 'button'
	const actionsColumnHtml = showActionsColumn
		? '<th class="wg__header wg__actions-column"></th>'
		: ''

	const headerCells = columns.map(column => {
		const field = String(column.field)
		const isSortable = column.sortable !== false && ctx.grid.sortMode !== 'none'
		const sortState = ctx.grid.getColumnSortState(field)
		const sortPriority = ctx.grid.getColumnSortPriority(field)
		const isSorted = sortState !== undefined

		const classes = ['wg__header']
		if (isSortable) classes.push('wg__header--sortable')
		if (isSorted) classes.push('wg__header--sorted')

		// Build style with width, minWidth, maxWidth
		const colWidth = column.width || column.maxWidth
		const styleProps = [
			colWidth ? `width: ${colWidth}` : '',
			column.minWidth ? `min-width: ${column.minWidth}` : '',
			`text-align: ${column.align || 'left'}`
		].filter(Boolean).join('; ')
		const styleAttr = `style="${styleProps}"`

		let sortIndicator = ''
		if (isSortable) {
			if (isSorted) {
				const arrow = sortState.direction === 'asc' ? '▲' : '▼'
				// Show priority number for multi-column sort (only if more than one column is sorted)
				const priorityLabel = ctx.grid.sort.length > 1 ? `<sup class="wg__sort-priority">${sortPriority}</sup>` : ''
				sortIndicator = `<span class="wg__sort-indicator">${arrow}${priorityLabel}</span>`
			} else {
				sortIndicator = `<span class="wg__sort-indicator wg__sort-placeholder">⬍</span>`
			}
		}

		let headerInfo = ''
		if (column.headerInfo) {
			headerInfo = `<span class="wg__header-info" data-tooltip="${ctx.escapeHtml(column.headerInfo)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>`
		}

		return `
			<th class="${classes.join(' ')}" ${styleAttr} data-field="${field}">
				<div class="wg__header-content">
					<span class="wg__header-title">${ctx.escapeHtml(column.title)}</span>
					${headerInfo}
					${sortIndicator}
				</div>
			</th>
		`
	}).join('')

	return `<tr>${rowNumberColumnHtml}${actionsColumnHtml}${headerCells}</tr>`
}

/**
 * Render data rows
 */
export function renderDataRows<T>(ctx: GridContext<T>): string {
	const items = ctx.grid.displayItems
	const columns = ctx.grid.columns

	// Row number column
	const showRowNumbers = ctx.grid.showRowNumbers

	// Actions column for button trigger mode
	const showActionsColumn = ctx.grid.showRowToolbar && ctx.grid.toolbarTrigger === 'button'
	const colspanWithExtras = columns.length + (showActionsColumn ? 1 : 0) + (showRowNumbers ? 1 : 0)

	if (items.length === 0) {
		return `
			<tr>
				<td class="wg__empty" colspan="${colspanWithExtras}">
					No items to display
				</td>
			</tr>
		`
	}

	const activeToolbarRow = getActiveToolbarRowIndex()

	return items.map((item, rowIndex) => {
		// Row number cell
		const rowNumberCell = showRowNumbers
			? `<td class="wg__cell wg__row-number">${rowIndex + 1}</td>`
			: ''

		// Actions cell for button trigger mode
		let actionsCell = ''
		if (showActionsColumn) {
			const isActive = activeToolbarRow === rowIndex
			actionsCell = `
				<td class="wg__cell wg__actions-column">
					${renderTriggerButton(rowIndex, isActive)}
				</td>
			`
		}

		const cells = columns.map((column, colIndex) => {
			const field = String(column.field)
			const value = ctx.grid.getCellValue(item, column, rowIndex)
			const align = column.align || 'left'
			const isEditable = ctx.grid.isCellEditable(column)
			const isFocused = ctx.grid.isCellFocused(rowIndex, colIndex)

			const classes = ['wg__cell']
			const isEditingThisCell = ctx.grid.isEditing(rowIndex, field)
			if (isEditable) classes.push('wg__cell--editable')
			if (isFocused && !isEditingThisCell) classes.push('wg__cell--focused')
			if (column.textOverflow === 'ellipsis') classes.push('wg__cell--ellipsis')
			if (isEditingThisCell) classes.push('wg__cell--editing')
			if (ctx.grid.isCellInvalid(rowIndex, field)) classes.push('wg__cell--invalid')
			if (column.cellClass) classes.push(column.cellClass)
			if (column.cellClassCallback) {
				// Pass raw value (not formatted) to callback
				const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
				const dynamicClass = column.cellClassCallback(rawValue, item)
				if (dynamicClass) classes.push(dynamicClass)
			}

			// Build cell style with width properties
			const cellStyleProps = [
				`text-align: ${align}`,
				column.width ? `width: ${column.width}` : '',
				column.minWidth ? `min-width: ${column.minWidth}` : '',
				column.maxWidth ? `max-width: ${column.maxWidth}` : ''
			].filter(Boolean).join('; ')

			// In navigate mode, ALL cells are focusable (not just editable)
			const tabindexAttr = ctx.grid.isNavigateMode ? 'tabindex="0"' : ''

			// Get cell tooltip (callback takes priority over member, then validation error)
			// tooltipCallback receives the RAW value, not the formatted value
			let tooltipAttr = ''
			if (column.tooltipCallback) {
				const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
				const tooltipText = column.tooltipCallback(rawValue, item)
				if (tooltipText) {
					tooltipAttr = `data-tooltip="${ctx.escapeHtml(tooltipText)}"`
				}
			} else if (column.tooltipMember) {
				const tooltipText = (item as Record<string, unknown>)[column.tooltipMember]
				if (tooltipText && typeof tooltipText === 'string') {
					tooltipAttr = `data-tooltip="${ctx.escapeHtml(tooltipText)}"`
				}
			}
			// Show validation error as tooltip for invalid cells (if no other tooltip)
			if (!tooltipAttr && ctx.grid.isCellInvalid(rowIndex, field)) {
				const errorMsg = ctx.grid.getCellValidationError(rowIndex, field)
				if (errorMsg) {
					// Check for validationTooltipCallback (column-level first, then grid-level)
					const validationTooltipCb = column.validationTooltipCallback || ctx.grid.validationTooltipCallback
					if (validationTooltipCb) {
						const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
						const htmlContent = validationTooltipCb({
							field,
							error: errorMsg,
							value: rawValue,
							row: item,
							rowIndex
						})
						if (htmlContent) {
							// Use data-tooltip-html for HTML content (not escaped)
							tooltipAttr = `data-tooltip-html="${ctx.escapeHtml(htmlContent)}"`
						}
					}
					// Fallback to plain text if no callback or callback returned null
					if (!tooltipAttr) {
						tooltipAttr = `data-tooltip="${ctx.escapeHtml(errorMsg)}"`
					}
				}
			}

			return `
				<td
					class="${classes.join(' ')}"
					style="${cellStyleProps}"
					data-row="${rowIndex}"
					data-col="${colIndex}"
					data-field="${field}"
					${tabindexAttr}
					${tooltipAttr}
				>
					${ctx.grid.isEditing(rowIndex, field)
						? renderCellEditor(ctx, rowIndex, colIndex, column)
						: renderCellDisplay(ctx, rowIndex, colIndex, column, value, isFocused)}
				</td>
			`
		}).join('')

		// Build row classes
		const rowClasses = ['wg__row']
		if (ctx.grid.rowClassCallback) {
			const dynamicClass = ctx.grid.rowClassCallback(item, rowIndex)
			if (dynamicClass) rowClasses.push(dynamicClass)
		}

		return `<tr class="${rowClasses.join(' ')}" data-row-index="${rowIndex}">${rowNumberCell}${actionsCell}${cells}</tr>`
	}).join('')
}

/**
 * Virtual scroll parameters
 */
export type VirtualScrollParams = {
	startIndex: number
	endIndex: number
	rowHeight: number
	totalItems: number
}

/**
 * Render data rows with virtual scrolling (spacer rows pattern)
 * Only renders visible rows + buffer, with spacer rows for correct scroll height
 */
export function renderDataRowsVirtual<T>(ctx: GridContext<T>, params: VirtualScrollParams): string {
	const items = ctx.grid.displayItems
	const columns = ctx.grid.columns
	const { startIndex, endIndex, rowHeight, totalItems } = params

	// Row number column
	const showRowNumbers = ctx.grid.showRowNumbers

	// Actions column for button trigger mode
	const showActionsColumn = ctx.grid.showRowToolbar && ctx.grid.toolbarTrigger === 'button'
	const colspanWithExtras = columns.length + (showActionsColumn ? 1 : 0) + (showRowNumbers ? 1 : 0)

	if (items.length === 0) {
		return `
			<tr>
				<td class="wg__empty" colspan="${colspanWithExtras}">
					No items to display
				</td>
			</tr>
		`
	}

	const activeToolbarRow = getActiveToolbarRowIndex()

	// Calculate spacer heights
	const topSpacerHeight = startIndex * rowHeight
	const bottomSpacerHeight = (totalItems - endIndex) * rowHeight

	// Top spacer row - height on TD for better browser compatibility
	const topSpacer = topSpacerHeight > 0
		? `<tr class="wg__spacer-top"><td colspan="${colspanWithExtras}" style="height: ${topSpacerHeight}px"></td></tr>`
		: ''

	// Render only visible rows
	const visibleRows = []
	for (let i = startIndex; i < endIndex && i < items.length; i++) {
		const item = items[i]
		const rowIndex = i  // Absolute index in the data array

		// Row number cell
		const rowNumberCell = showRowNumbers
			? `<td class="wg__cell wg__row-number">${rowIndex + 1}</td>`
			: ''

		// Actions cell for button trigger mode
		let actionsCell = ''
		if (showActionsColumn) {
			const isActive = activeToolbarRow === rowIndex
			actionsCell = `
				<td class="wg__cell wg__actions-column">
					${renderTriggerButton(rowIndex, isActive)}
				</td>
			`
		}

		const cells = columns.map((column, colIndex) => {
			const field = String(column.field)
			const value = ctx.grid.getCellValue(item, column, rowIndex)
			const align = column.align || 'left'
			const isEditable = ctx.grid.isCellEditable(column)
			const isFocused = ctx.grid.isCellFocused(rowIndex, colIndex)

			const classes = ['wg__cell']
			const isEditingThisCell = ctx.grid.isEditing(rowIndex, field)
			if (isEditable) classes.push('wg__cell--editable')
			if (isFocused && !isEditingThisCell) classes.push('wg__cell--focused')
			if (column.textOverflow === 'ellipsis') classes.push('wg__cell--ellipsis')
			if (isEditingThisCell) classes.push('wg__cell--editing')
			if (ctx.grid.isCellInvalid(rowIndex, field)) classes.push('wg__cell--invalid')
			if (column.cellClass) classes.push(column.cellClass)
			if (column.cellClassCallback) {
				// Pass raw value (not formatted) to callback
				const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
				const dynamicClass = column.cellClassCallback(rawValue, item)
				if (dynamicClass) classes.push(dynamicClass)
			}

			// Build cell style with width properties
			const cellStyleProps = [
				`text-align: ${align}`,
				column.width ? `width: ${column.width}` : '',
				column.minWidth ? `min-width: ${column.minWidth}` : '',
				column.maxWidth ? `max-width: ${column.maxWidth}` : ''
			].filter(Boolean).join('; ')

			// In navigate mode, ALL cells are focusable (not just editable)
			const tabindexAttr = ctx.grid.isNavigateMode ? 'tabindex="0"' : ''

			// Get cell tooltip (callback takes priority over member, then validation error)
			let tooltipAttr = ''
			if (column.tooltipCallback) {
				const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
				const tooltipText = column.tooltipCallback(rawValue, item)
				if (tooltipText) {
					tooltipAttr = `data-tooltip="${ctx.escapeHtml(tooltipText)}"`
				}
			} else if (column.tooltipMember) {
				const tooltipText = (item as Record<string, unknown>)[column.tooltipMember]
				if (tooltipText && typeof tooltipText === 'string') {
					tooltipAttr = `data-tooltip="${ctx.escapeHtml(tooltipText)}"`
				}
			}
			// Show validation error as tooltip for invalid cells (if no other tooltip)
			if (!tooltipAttr && ctx.grid.isCellInvalid(rowIndex, field)) {
				const errorMsg = ctx.grid.getCellValidationError(rowIndex, field)
				if (errorMsg) {
					// Check for validationTooltipCallback (column-level first, then grid-level)
					const validationTooltipCb = column.validationTooltipCallback || ctx.grid.validationTooltipCallback
					if (validationTooltipCb) {
						const rawValue = ctx.grid.getCellRawValue(item, rowIndex, field)
						const htmlContent = validationTooltipCb({
							field,
							error: errorMsg,
							value: rawValue,
							row: item,
							rowIndex
						})
						if (htmlContent) {
							// Use data-tooltip-html for HTML content (not escaped)
							tooltipAttr = `data-tooltip-html="${ctx.escapeHtml(htmlContent)}"`
						}
					}
					// Fallback to plain text if no callback or callback returned null
					if (!tooltipAttr) {
						tooltipAttr = `data-tooltip="${ctx.escapeHtml(errorMsg)}"`
					}
				}
			}

			return `
				<td
					class="${classes.join(' ')}"
					style="${cellStyleProps}"
					data-row="${rowIndex}"
					data-col="${colIndex}"
					data-field="${field}"
					${tabindexAttr}
					${tooltipAttr}
				>
					${ctx.grid.isEditing(rowIndex, field)
						? renderCellEditor(ctx, rowIndex, colIndex, column)
						: renderCellDisplay(ctx, rowIndex, colIndex, column, value, isFocused)}
				</td>
			`
		}).join('')

		// Build row classes
		const rowClasses = ['wg__row']
		if (ctx.grid.rowClassCallback) {
			const dynamicClass = ctx.grid.rowClassCallback(item, rowIndex)
			if (dynamicClass) rowClasses.push(dynamicClass)
		}

		visibleRows.push(`<tr class="${rowClasses.join(' ')}" data-row-index="${rowIndex}">${rowNumberCell}${actionsCell}${cells}</tr>`)
	}

	// Bottom spacer row - height on TD for better browser compatibility
	const bottomSpacer = bottomSpacerHeight > 0
		? `<tr class="wg__spacer-bottom"><td colspan="${colspanWithExtras}" style="height: ${bottomSpacerHeight}px"></td></tr>`
		: ''

	return topSpacer + visibleRows.join('') + bottomSpacer
}

/**
 * Render pagination controls
 * @param ctx Grid context
 * @param position Position string (e.g., "bottom-center", "top-right")
 */
export function renderPagination<T>(ctx: GridContext<T>, position: string = 'bottom-center'): string {
	// Don't render if not pageable or showPagination is false
	const showPag = ctx.grid.showPagination
	if (!ctx.grid.pageable || showPag === false) return ''
	// 'auto' mode: hide when only 1 page
	if (showPag === 'auto' && ctx.grid.totalPages <= 1) return ''

	const currentPage = ctx.grid.currentPage
	const totalPages = ctx.grid.totalPages
	const currentPageSize = ctx.grid.pageSize
	const pageSizes = ctx.grid.pageSizes
	// Use totalItems if provided (server-side), otherwise use local item count
	const totalItems = ctx.grid.totalItems !== null
		? ctx.grid.totalItems
		: (ctx.grid as unknown as { sortedItems: T[] }).sortedItems.length

	// Build labels (defaults + custom from callback)
	const defaultLabels = {
		first: 'First',
		previous: 'Previous',
		next: 'Next',
		last: 'Last',
		pageInfo: `Page ${currentPage} of ${totalPages}`,
		itemCount: `(${totalItems} item${totalItems !== 1 ? 's' : ''})`,
		perPage: 'per page'
	}

	const labelsCallback = ctx.grid.paginationLabelsCallback
	const customLabels = labelsCallback
		? labelsCallback({ currentPage, totalPages, totalItems, pageSize: currentPageSize })
		: {}
	const labels = { ...defaultLabels, ...customLabels }

	// Determine alignment class from position
	const isTop = position.startsWith('top-')
	const alignment = position.replace('top-', '').replace('bottom-', '')  // left, center, or right

	// Build CSS classes
	const classes = ['wg__pagination']
	if (alignment === 'left') classes.push('wg__pagination--left')
	else if (alignment === 'right') classes.push('wg__pagination--right')
	// center is default, no modifier needed
	if (isTop) classes.push('wg__pagination--top')

	// Build element HTML fragments
	const elements: Record<string, string> = {
		first: `
			<button class="wg__pagination-btn" data-action="first" ${currentPage === 1 ? 'disabled' : ''}>
				${labels.first}
			</button>
		`,
		previous: `
			<button class="wg__pagination-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>
				${labels.previous}
			</button>
		`,
		next: `
			<button class="wg__pagination-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>
				${labels.next}
			</button>
		`,
		last: `
			<button class="wg__pagination-btn" data-action="last" ${currentPage === totalPages ? 'disabled' : ''}>
				${labels.last}
			</button>
		`,
		pageInfo: `
			<div class="wg__pagination-info">
				${labels.pageInfo}
				<span class="wg__pagination-count">${labels.itemCount}</span>
			</div>
		`,
		pageSize: pageSizes.length > 0 ? `
			<div class="wg__pagination-pagesize">
				<select class="wg__pagination-select" data-action="pagesize">
					${pageSizes.map(size =>
						`<option value="${size}" ${size === currentPageSize ? 'selected' : ''}>${size}</option>`
					).join('')}
				</select>
				<span class="wg__pagination-label">${labels.perPage}</span>
			</div>
		` : ''
	}

	// Parse layout and build content
	const layout = ctx.grid.paginationLayout.split('|').map(s => s.trim())
	const content = layout.map(part => elements[part] || '').join('')

	return `<div class="${classes.join(' ')}">${content}</div>`
}

/**
 * Render summary content
 * @param ctx Grid context
 * @param position Position string (e.g., "bottom-left", "top-right")
 */
export function renderSummary<T>(ctx: GridContext<T>, position: string): string {
	const callback = ctx.grid.summaryContentCallback
	if (!callback) return ''

	const currentPage = ctx.grid.currentPage
	const pageSize = ctx.grid.pageSize
	const allItems = (ctx.grid as unknown as { sortedItems: T[] }).sortedItems
	const items = ctx.grid.displayItems
	const totalItems = ctx.grid.totalItems !== null
		? ctx.grid.totalItems
		: allItems.length

	const content = callback({
		items,
		allItems,
		totalItems,
		currentPage,
		pageSize,
		metadata: ctx.grid.summaryMetadata
	})

	// Determine alignment class from position
	const isTop = position.startsWith('top-')
	const alignment = position.replace('top-', '').replace('bottom-', '')

	const classes = ['wg__summary']
	if (alignment === 'left') classes.push('wg__summary--left')
	else if (alignment === 'right') classes.push('wg__summary--right')
	if (isTop) classes.push('wg__summary--top')

	return `<div class="${classes.join(' ')}">${content}</div>`
}
