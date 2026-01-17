// =============================================================================
// Paste Module (Excel/TSV multi-cell paste)
// =============================================================================

import type { GridContext } from '../types.js'
import type {
	Column,
	PasteColumnMapping,
	BeforePasteDetail,
	PasteCellResult,
	PasteDetail
} from '../../types.js'

/**
 * Parse TSV/CSV clipboard text into 2D array
 * Handles Excel's quoting rules for cells containing tabs/newlines
 */
export function parseTSV(text: string): string[][] {
	const rows: string[][] = []
	let currentRow: string[] = []
	let currentCell = ''
	let inQuotes = false

	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		const nextChar = text[i + 1]

		if (inQuotes) {
			if (char === '"') {
				if (nextChar === '"') {
					// Escaped quote
					currentCell += '"'
					i++ // Skip next quote
				} else {
					// End of quoted section
					inQuotes = false
				}
			} else {
				currentCell += char
			}
		} else {
			if (char === '"') {
				inQuotes = true
			} else if (char === '\t') {
				currentRow.push(currentCell)
				currentCell = ''
			} else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
				currentRow.push(currentCell)
				if (currentRow.some(cell => cell !== '')) {
					rows.push(currentRow)
				}
				currentRow = []
				currentCell = ''
				if (char === '\r') i++ // Skip \n in \r\n
			} else if (char !== '\r') {
				currentCell += char
			}
		}
	}

	// Handle last cell/row
	if (currentCell !== '' || currentRow.length > 0) {
		currentRow.push(currentCell)
		if (currentRow.some(cell => cell !== '')) {
			rows.push(currentRow)
		}
	}

	return rows
}

/**
 * Detect if first row of pasted data matches column titles/fields
 * Returns mapping if match found (>50% cells match), null otherwise
 */
export function detectHeaders<T>(
	firstRow: string[],
	columns: Column<T>[]
): PasteColumnMapping[] | null {
	// Build lookup maps for both titles and field names
	const titleMap = new Map<string, { field: string; colIndex: number }>()
	const fieldMap = new Map<string, { field: string; colIndex: number }>()

	columns.forEach((col, index) => {
		if (col.isHidden) return // Skip hidden columns

		const field = String(col.field)
		const title = col.title?.toLowerCase().trim() || ''

		if (title) titleMap.set(title, { field, colIndex: index })
		fieldMap.set(field.toLowerCase(), { field, colIndex: index })
	})

	// Check how many cells match column titles/fields
	const mappings: PasteColumnMapping[] = []
	let matchCount = 0

	for (const cellValue of firstRow) {
		const normalized = cellValue.trim().toLowerCase()
		if (!normalized) continue

		// Try title match first, then field match
		const match = titleMap.get(normalized) || fieldMap.get(normalized)

		if (match) {
			matchCount++
			mappings.push({
				pastedHeader: cellValue,
				gridField: match.field,
				colIndex: match.colIndex
			})
		}
	}

	// Consider it a header row if >50% of non-empty cells match AND at least 2 matches
	const nonEmptyCells = firstRow.filter(c => c.trim() !== '').length
	const threshold = Math.max(2, Math.floor(nonEmptyCells * 0.5))

	if (matchCount >= threshold) {
		return mappings
	}

	return null
}

/**
 * Execute multi-cell paste operation
 */
export async function executePaste<T>(
	ctx: GridContext<T>,
	clipboardText: string,
	targetRowIndex: number,
	targetColIndex: number
): Promise<PasteDetail<T>> {
	const grid = ctx.grid
	const parsedRows = parseTSV(clipboardText)

	// Empty result for empty clipboard
	if (parsedRows.length === 0) {
		return {
			totalCells: 0,
			successfulCells: 0,
			failedCells: 0,
			skippedCells: 0,
			newRowsCreated: 0,
			cellResults: [],
			hadHeaders: false
		}
	}

	// Detect headers in first row
	const headerMapping = detectHeaders(parsedRows[0], grid.columns)
	const hasHeaders = headerMapping !== null
	const dataRows = hasHeaders ? parsedRows.slice(1) : parsedRows

	// Handle empty data (only had headers)
	if (dataRows.length === 0) {
		return {
			totalCells: 0,
			successfulCells: 0,
			failedCells: 0,
			skippedCells: 0,
			newRowsCreated: 0,
			cellResults: [],
			hadHeaders: hasHeaders
		}
	}

	// Get visual columns for position-based mapping
	const visualCols = grid.visualColumns

	// Calculate how many new rows are needed
	const existingRowCount = grid.items.length
	const lastDataRowIndex = targetRowIndex + dataRows.length - 1
	const newRowsCount = Math.max(0, lastDataRowIndex - existingRowCount + 1)

	// Build BeforePasteDetail for the event
	const beforeDetail: BeforePasteDetail<T> = {
		rawText: clipboardText,
		parsedRows,
		hasHeaders,
		headerMapping,
		targetRowIndex,
		targetColIndex,
		newRowsCount,
		cancel: false,
		skipCells: new Set()
	}

	// Fire onbeforepaste event - allow consumer to cancel or modify
	if (grid.onbeforepaste) {
		grid.onbeforepaste(beforeDetail)

		if (beforeDetail.cancel) {
			return {
				totalCells: dataRows.reduce((sum, row) => sum + row.length, 0),
				successfulCells: 0,
				failedCells: 0,
				skippedCells: dataRows.reduce((sum, row) => sum + row.length, 0),
				newRowsCreated: 0,
				cellResults: [],
				hadHeaders: hasHeaders
			}
		}
	}

	// Create new rows if needed
	let createdRowsCount = 0
	if (newRowsCount > 0) {
		const newItems = [...grid.items]

		for (let i = 0; i < newRowsCount; i++) {
			const rowIndex = existingRowCount + i
			const relativeRowIndex = rowIndex - targetRowIndex
			const pastedRowData = dataRows[relativeRowIndex]

			// Collect pasted values for this row
			const pastedData: Record<string, unknown> = {}

			if (hasHeaders && headerMapping) {
				// Map by headers
				pastedRowData?.forEach((value, cellIndex) => {
					const mapping = headerMapping[cellIndex]
					if (mapping) {
						pastedData[mapping.gridField] = value
					}
				})
			} else {
				// Map by position
				pastedRowData?.forEach((value, cellIndex) => {
					const colIndex = targetColIndex + cellIndex
					if (colIndex < visualCols.length) {
						const field = String(visualCols[colIndex].column.field)
						pastedData[field] = value
					}
				})
			}

			// Create the row
			let newRow: T
			if (grid.createRowCallback) {
				newRow = grid.createRowCallback(pastedData, rowIndex)
			} else {
				newRow = pastedData as T
			}

			newItems.push(newRow)
			createdRowsCount++
		}

		grid.items = newItems
	}

	// Now paste values into cells
	const cellResults: PasteCellResult[] = []
	const pasteMode = grid.pasteMode

	for (let relRowIndex = 0; relRowIndex < dataRows.length; relRowIndex++) {
		const row = dataRows[relRowIndex]
		const absoluteRowIndex = targetRowIndex + relRowIndex

		for (let relColIndex = 0; relColIndex < row.length; relColIndex++) {
			const value = row[relColIndex]

			// Determine target field and column index
			let field: string
			let absoluteColIndex: number

			if (hasHeaders && headerMapping) {
				const mapping = headerMapping[relColIndex]
				if (!mapping) {
					// No mapping for this column - skip
					continue
				}
				field = mapping.gridField
				absoluteColIndex = mapping.colIndex
			} else {
				absoluteColIndex = targetColIndex + relColIndex
				if (absoluteColIndex >= visualCols.length) {
					// Out of bounds - skip
					cellResults.push({
						rowIndex: absoluteRowIndex,
						field: '',
						value,
						isValid: false,
						wasSkipped: true,
						skipReason: 'out-of-bounds'
					})
					continue
				}
				field = String(visualCols[absoluteColIndex].column.field)
			}

			// Check if user wants to skip this cell
			const cellKey = `${relRowIndex}-${relColIndex}`
			if (beforeDetail.skipCells.has(cellKey)) {
				cellResults.push({
					rowIndex: absoluteRowIndex,
					field,
					value,
					isValid: true,
					wasSkipped: true,
					skipReason: 'user-canceled'
				})
				continue
			}

			// Find the column
			const column = grid.columns.find(c => String(c.field) === field)
			if (!column) {
				continue
			}

			// Check editability based on paste mode
			const isEditable = grid.isCellEditable(column)

			if (!isEditable) {
				if (pasteMode === 'editable-only') {
					// Block entire paste - but we're already iterating, so skip remaining
					cellResults.push({
						rowIndex: absoluteRowIndex,
						field,
						value,
						isValid: false,
						wasSkipped: true,
						skipReason: 'non-editable'
					})
					continue
				} else if (pasteMode === 'skip-non-editable') {
					cellResults.push({
						rowIndex: absoluteRowIndex,
						field,
						value,
						isValid: true,
						wasSkipped: true,
						skipReason: 'non-editable'
					})
					continue
				}
				// 'all-columns' falls through - paste anyway
			}

			// Check row locking
			const rowData = grid.displayItems[absoluteRowIndex]
			if (rowData && grid.isRowLocked(rowData)) {
				cellResults.push({
					rowIndex: absoluteRowIndex,
					field,
					value,
					isValid: true,
					wasSkipped: true,
					skipReason: 'locked'
				})
				continue
			}

			// Process the value through column's beforePasteCallback if present
			let processedValue: unknown = value
			if (column.beforePasteCallback && rowData) {
				processedValue = column.beforePasteCallback(value, rowData)
			}

			// Commit the value
			if (grid.shouldValidateOnPaste) {
				// Use commitEdit which handles validation
				await grid.commitEdit(absoluteRowIndex, field, processedValue)

				// Check if cell is now invalid
				const invalidCell = grid.invalidCells.find(
					c => c.rowIndex === absoluteRowIndex && c.field === field
				)

				cellResults.push({
					rowIndex: absoluteRowIndex,
					field,
					value: processedValue,
					isValid: !invalidCell,
					validationError: invalidCell?.error,
					wasSkipped: false
				})
			} else {
				// Skip validation - update directly
				// For existing rows, we need to update via draft
				const item = grid.items[absoluteRowIndex]
				if (item) {
					;(item as Record<string, unknown>)[field] = processedValue
				}

				cellResults.push({
					rowIndex: absoluteRowIndex,
					field,
					value: processedValue,
					isValid: true,
					wasSkipped: false
				})
			}
		}
	}

	// Calculate summary
	const successfulCells = cellResults.filter(r => !r.wasSkipped && r.isValid).length
	const failedCells = cellResults.filter(r => !r.wasSkipped && !r.isValid).length
	const skippedCells = cellResults.filter(r => r.wasSkipped).length

	const pasteDetail: PasteDetail<T> = {
		totalCells: cellResults.length,
		successfulCells,
		failedCells,
		skippedCells,
		newRowsCreated: createdRowsCount,
		cellResults,
		hadHeaders: hasHeaders
	}

	// Fire onpaste event
	if (grid.onpaste) {
		grid.onpaste(pasteDetail)
	}

	return pasteDetail
}
