// =============================================================================
// Tree Cell Rendering
// Wraps cell content with indent + expand/collapse chevron when column.isTree
// =============================================================================

import type { Column } from '../../types.js'
import type { GridContext } from '../types.js'

/**
 * Wrap cell content with tree indent + chevron when column is the tree column.
 * Returns the original innerHtml unchanged when tree mode is off or column isn't isTree.
 *
 * Used by both the full-table render (table.ts) and the surgical single-cell
 * render (cell.ts), so both paths keep the chevron after focus/edit transitions.
 */
export function wrapTreeCell<T>(
	ctx: GridContext<T>,
	column: Column<T>,
	item: T,
	innerHtml: string
): string {
	if (!column.isTree || !ctx.grid.isTreeMode) return innerHtml
	const info = ctx.grid.getRowTreeInfo(item)
	if (!info) return innerHtml
	const isExpanded = ctx.grid.isPathExpanded(info.path)
	// Indent + chevron sit in the cell's padding-left zone via the wrapper.
	// padding-left reserves: (level * indent) + chevron-size + gap   (so content starts after the chevron)
	// chevron is absolutely positioned at: level * indent              (left edge of the row's indent)
	const indentExpr = `calc(${info.level} * var(--wg-tree-indent))`
	const wrapperPaddingLeft = `calc(${indentExpr} + var(--wg-tree-chevron-size) + var(--wg-tree-chevron-gap))`
	const chevronInner = ctx.grid.getTreeChevronHtml(item, isExpanded, info.hasChildren, info.level, info.path)
	let chevron: string
	if (info.hasChildren) {
		chevron = `<button type="button" class="wg__tree-chevron" style="left: ${indentExpr}" data-tree-toggle="${ctx.escapeHtml(info.path)}" tabindex="-1" aria-label="${isExpanded ? 'Collapse' : 'Expand'}">${chevronInner}</button>`
	} else {
		chevron = `<span class="wg__tree-chevron wg__tree-chevron--leaf" style="left: ${indentExpr}" aria-hidden="true">${chevronInner}</span>`
	}
	return `<div class="wg__tree-cell" style="padding-left: ${wrapperPaddingLeft}">${chevron}<div class="wg__tree-cell-content">${innerHtml}</div></div>`
}
