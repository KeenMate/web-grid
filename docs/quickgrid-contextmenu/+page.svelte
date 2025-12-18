<script lang="ts">
	import {QuickGrid, Stack, Grid, GridItem, Card, Dialog, Button} from "svelte-fluentui"

	type Product = {
		id: number
		name: string
		category: string
		price: number
		stock: number
		active: boolean
	}

	let products = $state<Product[]>([
		{id: 1, name: "Laptop Pro", category: "Electronics", price: 1299, stock: 15, active: true},
		{id: 2, name: "Wireless Mouse", category: "Electronics", price: 49, stock: 120, active: true},
		{id: 3, name: "Office Chair", category: "Furniture", price: 299, stock: 8, active: true},
		{id: 4, name: "Standing Desk", category: "Furniture", price: 599, stock: 3, active: false},
		{id: 5, name: "Monitor 27\"", category: "Electronics", price: 449, stock: 22, active: true},
		{id: 6, name: "Keyboard RGB", category: "Electronics", price: 89, stock: 65, active: true},
		{id: 7, name: "Desk Lamp", category: "Furniture", price: 45, stock: 0, active: false},
		{id: 8, name: "Webcam HD", category: "Electronics", price: 79, stock: 34, active: true}
	])

	// Message display
	let lastAction = $state<string>('')

	function showMessage(message: string) {
		lastAction = message
		setTimeout(() => { if (lastAction === message) lastAction = '' }, 3000)
	}

	// Currency conversion dialog
	let conversionDialogOpen = $state(false)
	let conversionData = $state<{productName: string, usd: number, eur: number} | null>(null)
	const USD_TO_EUR = 0.92  // Example rate

	function showConversionDialog(productName: string, priceUsd: number) {
		conversionData = {
			productName,
			usd: priceUsd,
			eur: priceUsd * USD_TO_EUR
		}
		conversionDialogOpen = true
	}

	const readOnlyColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Product Name", sortable: true},
		{field: "category", title: "Category", sortable: true},
		{field: "price", title: "Price", width: "120px", align: "right" as const, format: (v: number) => `$${v.toFixed(2)}`},
		{field: "stock", title: "Stock", width: "100px", align: "center" as const},
		{field: "active", title: "Status", width: "100px", align: "center" as const, format: (v: boolean) => v ? "✓" : "✗"}
	]

	// Read-only context menu
	const readOnlyContextMenu = [
		{
			id: 'view',
			label: 'View Details',
			icon: '👁️',
			onclick: (ctx: any) => {
				showMessage(`Viewing: ${ctx.row.name} (ID: ${ctx.row.id})`)
			}
		},
		{
			id: 'copy-cell',
			label: (ctx: any) => `Copy "${ctx.column.title}"`,
			icon: '📋',
			onclick: (ctx: any) => {
				navigator.clipboard.writeText(String(ctx.cellValue))
				showMessage(`Copied: ${ctx.cellValue}`)
			}
		},
		{
			id: 'copy-row',
			label: 'Copy Row as JSON',
			icon: '📄',
			onclick: (ctx: any) => {
				navigator.clipboard.writeText(JSON.stringify(ctx.row, null, 2))
				showMessage('Row copied as JSON')
			}
		},
		{
			id: 'convert-eur',
			label: 'Convert to Euro',
			icon: '💶',
			visible: (ctx: any) => ctx.column.field === 'price',
			onclick: (ctx: any) => {
				const eurPrice = (ctx.row.price * 0.92).toFixed(2)
				alert(`${ctx.row.name}\n\n$${ctx.row.price} USD = €${eurPrice} EUR`)
				showConversionDialog(ctx.row.name, ctx.row.price)
			}
		},
		{
			id: 'export',
			label: 'Export to CSV',
			icon: '📊',
			dividerBefore: true,
			onclick: (ctx: any) => {
				showMessage(`Would export: ${ctx.row.name}`)
			}
		}
	]

	// Editable grid columns
	const editableColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Product Name", sortable: true, editable: true, editor: "text" as const},
		{field: "category", title: "Category", sortable: true, editable: true, editor: "select" as const, editorOptions: {
			options: [
				{value: "Electronics", label: "Electronics"},
				{value: "Furniture", label: "Furniture"},
				{value: "Accessories", label: "Accessories"}
			]
		}},
		{field: "price", title: "Price", width: "120px", align: "right" as const, editable: true, editor: "number" as const, format: (v: number) => `$${v.toFixed(2)}`},
		{field: "stock", title: "Stock", width: "100px", align: "center" as const, editable: true, editor: "number" as const},
		{field: "active", title: "Active", width: "100px", align: "center" as const, editable: true, editor: "checkbox" as const}
	]

	// Editable context menu with conditional items
	const editableContextMenu = [
		{
			id: 'edit',
			label: 'Edit Cell',
			icon: '✏️',
			onclick: (ctx: any) => {
				showMessage(`Double-click the cell to edit "${ctx.column.title}"`)
			}
		},
		{
			id: 'duplicate',
			label: 'Duplicate Row',
			icon: '📑',
			onclick: (ctx: any) => {
				const newProduct = {...ctx.row, id: Math.max(...products.map(p => p.id)) + 1}
				products = [...products.slice(0, ctx.rowIndex + 1), newProduct, ...products.slice(ctx.rowIndex + 1)]
				showMessage(`Duplicated: ${ctx.row.name}`)
			}
		},
		{
			id: 'toggle-active',
			label: (ctx: any) => ctx.row.active ? 'Deactivate' : 'Activate',
			icon: '🔄',
			onclick: (ctx: any) => {
				products[ctx.rowIndex].active = !products[ctx.rowIndex].active
				showMessage(`${ctx.row.name} is now ${products[ctx.rowIndex].active ? 'active' : 'inactive'}`)
			}
		},
		{
			id: 'restock',
			label: 'Restock (+10)',
			icon: '📦',
			visible: (ctx: any) => ctx.row.stock < 20,
			onclick: (ctx: any) => {
				products[ctx.rowIndex].stock += 10
				showMessage(`${ctx.row.name} stock increased to ${products[ctx.rowIndex].stock}`)
			}
		},
		{
			id: 'delete',
			label: 'Delete',
			icon: '🗑️',
			danger: true,
			dividerBefore: true,
			disabled: (ctx: any) => ctx.row.active,
			onclick: (ctx: any) => {
				products = products.filter((_, i) => i !== ctx.rowIndex)
				showMessage(`Deleted: ${ctx.row.name}`)
			}
		}
	]

	function handleRowChange(detail: any) {
		if (detail.isValid) {
			products[detail.rowIndex] = {...products[detail.rowIndex], [detail.field]: detail.newValue}
		}
	}

	function handleContextMenuOpen(ctx: any) {
		console.log('Context menu opened:', ctx)
		console.log('Column field:', ctx.column.field)
		console.log('Is price column:', ctx.column.field === 'price')
	}
</script>

<!-- Currency Conversion Dialog -->
<Dialog
	bind:open={conversionDialogOpen}
	modal
	style="min-width: 320px;"
>
	{#snippet header()}
		<h3 style="margin: 0;">💶 Currency Conversion</h3>
	{/snippet}

	{#if conversionData}
		<div class="conversion-content">
			<p class="product-name">{conversionData.productName}</p>
			<div class="conversion-row">
				<span class="currency-label">USD</span>
				<span class="currency-value">${conversionData.usd.toFixed(2)}</span>
			</div>
			<div class="conversion-arrow">↓</div>
			<div class="conversion-row highlight">
				<span class="currency-label">EUR</span>
				<span class="currency-value">€{conversionData.eur.toFixed(2)}</span>
			</div>
			<p class="rate-info">Exchange rate: 1 USD = {USD_TO_EUR} EUR</p>
		</div>
	{/if}

	{#snippet footer()}
		<Button appearance="accent" onclick={() => conversionDialogOpen = false}>Close</Button>
	{/snippet}
</Dialog>

<Stack orientation="vertical" gap="1rem">
	<h1>QuickGrid Context Menu</h1>

	<Card>
		<p>
			<strong>References:</strong>
			<a href="/components/quickgrid">QuickGrid (Basic)</a>
			|
			<a href="/components/quickgrid-editable">QuickGrid Editable</a>
		</p>
	</Card>

	{#if lastAction}
		<div class="action-message">
			{lastAction}
		</div>
	{/if}

	<p>
		QuickGrid supports right-click context menus that are cell and row aware. The context menu can be used
		in both read-only and editable grids, with support for dynamic labels, conditional visibility, and
		disabled states based on row/cell data.
	</p>

	<Grid spacing={3}>
		<!-- Read-Only Context Menu -->
		<GridItem span={12}>
			<Card>
				<h3>Read-Only Grid with Context Menu</h3>
				<p style="color: var(--neutral-foreground-hint); margin-bottom: 1rem;">
					Right-click any cell to see the context menu. Try "Copy Cell" to see dynamic labels based on column.
				</p>
				<QuickGrid
					items={products}
					columns={readOnlyColumns}
					sortable
					contextMenu={readOnlyContextMenu}
					oncontextmenuopen={handleContextMenuOpen}
				/>
			</Card>
		</GridItem>

		<!-- Editable Context Menu -->
		<GridItem span={12}>
			<Card>
				<h3>Editable Grid with Context Menu</h3>
				<p style="color: var(--neutral-foreground-hint); margin-bottom: 1rem;">
					Right-click to see context-aware options. Note: "Delete" is disabled for active products,
					"Restock" only appears for low-stock items (stock &lt; 20).
				</p>
				<QuickGrid
					items={products}
					columns={editableColumns}
					editable
					editTrigger="dblclick"
					contextMenu={editableContextMenu}
					onrowchange={handleRowChange}
				/>
			</Card>
		</GridItem>

		<!-- API Documentation -->
		<GridItem span={12}>
			<Card>
				<h3>Context Menu API</h3>

				<h4 style="margin-top: 1rem;">Props</h4>
				<table class="api-table">
					<thead>
						<tr>
							<th>Property</th>
							<th>Type</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>contextMenu</code></td>
							<td><code>ContextMenuItem[]</code></td>
							<td>Array of menu item configurations</td>
						</tr>
						<tr>
							<td><code>oncontextmenuopen</code></td>
							<td><code>(context) =&gt; void</code></td>
							<td>Callback fired when context menu opens</td>
						</tr>
					</tbody>
				</table>

				<h4 style="margin-top: 1.5rem;">ContextMenuItem Properties</h4>
				<table class="api-table">
					<thead>
						<tr>
							<th>Property</th>
							<th>Type</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>id</code></td>
							<td><code>string</code></td>
							<td>Unique identifier for the menu item</td>
						</tr>
						<tr>
							<td><code>label</code></td>
							<td><code>string | (context) =&gt; string</code></td>
							<td>Display text (can be dynamic based on context)</td>
						</tr>
						<tr>
							<td><code>icon</code></td>
							<td><code>string</code></td>
							<td>Optional icon (emoji or text)</td>
						</tr>
						<tr>
							<td><code>disabled</code></td>
							<td><code>boolean | (context) =&gt; boolean</code></td>
							<td>Whether the item is disabled</td>
						</tr>
						<tr>
							<td><code>visible</code></td>
							<td><code>boolean | (context) =&gt; boolean</code></td>
							<td>Whether the item is visible</td>
						</tr>
						<tr>
							<td><code>danger</code></td>
							<td><code>boolean</code></td>
							<td>Red styling for destructive actions</td>
						</tr>
						<tr>
							<td><code>dividerBefore</code></td>
							<td><code>boolean</code></td>
							<td>Add a divider line before this item</td>
						</tr>
						<tr>
							<td><code>onclick</code></td>
							<td><code>(context) =&gt; void</code></td>
							<td>Click handler receiving the context</td>
						</tr>
					</tbody>
				</table>

				<h4 style="margin-top: 1.5rem;">ContextMenuContext Properties</h4>
				<table class="api-table">
					<thead>
						<tr>
							<th>Property</th>
							<th>Type</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><code>row</code></td>
							<td><code>T</code></td>
							<td>The row data object</td>
						</tr>
						<tr>
							<td><code>rowIndex</code></td>
							<td><code>number</code></td>
							<td>Index of the row in displayed items</td>
						</tr>
						<tr>
							<td><code>colIndex</code></td>
							<td><code>number</code></td>
							<td>Index of the column</td>
						</tr>
						<tr>
							<td><code>column</code></td>
							<td><code>Column&lt;T&gt;</code></td>
							<td>The column definition</td>
						</tr>
						<tr>
							<td><code>cellValue</code></td>
							<td><code>unknown</code></td>
							<td>The value of the clicked cell</td>
						</tr>
					</tbody>
				</table>
			</Card>
		</GridItem>

		<!-- Code Example -->
		<GridItem span={12}>
			<Card>
				<h3>Example Usage</h3>
				<pre><code>{`<QuickGrid
  items={products}
  columns={columns}
  contextMenu={[
    {
      id: 'view',
      label: 'View Details',
      icon: '👁️',
      onclick: (ctx) => console.log('View:', ctx.row)
    },
    {
      id: 'copy',
      label: (ctx) => \`Copy "\${ctx.column.title}"\`,
      icon: '📋',
      onclick: (ctx) => navigator.clipboard.writeText(String(ctx.cellValue))
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      danger: true,
      dividerBefore: true,
      disabled: (ctx) => ctx.row.isProtected,
      visible: (ctx) => ctx.row.canDelete,
      onclick: (ctx) => deleteRow(ctx.rowIndex)
    }
  ]}
/>`}</code></pre>
			</Card>
		</GridItem>
	</Grid>
</Stack>

<style>
	.action-message {
		padding: 12px 16px;
		background: var(--accent-fill-rest, #0078d4);
		color: white;
		border-radius: 4px;
		font-weight: 500;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Conversion dialog styles */
	.conversion-content {
		text-align: center;
		padding: 1rem 0;
	}

	.product-name {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 1.5rem;
		color: var(--neutral-foreground-rest);
	}

	.conversion-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		background: var(--neutral-layer-2, #f5f5f5);
	}

	.conversion-row.highlight {
		background: var(--accent-fill-rest, #0078d4);
		color: white;
	}

	.currency-label {
		font-weight: 600;
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.currency-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.conversion-arrow {
		font-size: 1.5rem;
		color: var(--neutral-foreground-hint);
		margin: 0.5rem 0;
	}

	.rate-info {
		margin-top: 1.5rem;
		font-size: 0.85rem;
		color: var(--neutral-foreground-hint);
	}

	[data-theme="dark"] .conversion-row:not(.highlight) {
		background: var(--neutral-layer-2, #2b2b2b);
	}

	.api-table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 0.5rem;
	}

	.api-table th,
	.api-table td {
		padding: 8px 12px;
		text-align: left;
		border-bottom: 1px solid var(--neutral-stroke-rest, #e0e0e0);
	}

	.api-table th {
		background: var(--neutral-layer-2, #f5f5f5);
		font-weight: 600;
	}

	.api-table code {
		background: var(--neutral-layer-3, #ebebeb);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 13px;
	}

	pre {
		background: var(--neutral-layer-2, #f5f5f5);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
	}

	pre code {
		background: none;
		padding: 0;
	}

	[data-theme="dark"] .api-table th {
		background: var(--neutral-layer-2, #2b2b2b);
	}

	[data-theme="dark"] .api-table code {
		background: var(--neutral-layer-3, #333);
	}

	[data-theme="dark"] pre {
		background: var(--neutral-layer-2, #2b2b2b);
	}
</style>
