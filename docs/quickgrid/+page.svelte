<script lang="ts">
	import {QuickGrid, Stack, Grid, GridItem, Card} from "svelte-fluentui"

	type Person = {
		id: number
		name: string
		email: string
		age: number
		city: string
		active: boolean
	}

	const sampleData: Person[] = [
		{id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28, city: "New York", active: true},
		{id: 2, name: "Bob Smith", email: "bob@example.com", age: 34, city: "Los Angeles", active: true},
		{id: 3, name: "Carol White", email: "carol@example.com", age: 26, city: "Chicago", active: false},
		{id: 4, name: "David Brown", email: "david@example.com", age: 42, city: "Houston", active: true},
		{id: 5, name: "Eve Davis", email: "eve@example.com", age: 31, city: "Phoenix", active: true},
		{id: 6, name: "Frank Miller", email: "frank@example.com", age: 29, city: "Philadelphia", active: false},
		{id: 7, name: "Grace Lee", email: "grace@example.com", age: 37, city: "San Antonio", active: true},
		{id: 8, name: "Henry Wilson", email: "henry@example.com", age: 25, city: "San Diego", active: true},
		{id: 9, name: "Iris Moore", email: "iris@example.com", age: 33, city: "Dallas", active: false},
		{id: 10, name: "Jack Taylor", email: "jack@example.com", age: 39, city: "San Jose", active: true},
		{id: 11, name: "Karen Anderson", email: "karen@example.com", age: 27, city: "Austin", active: true},
		{id: 12, name: "Leo Thomas", email: "leo@example.com", age: 36, city: "Jacksonville", active: false},
		{id: 13, name: "Mary Martinez", email: "mary@example.com", age: 30, city: "Fort Worth", active: true},
		{id: 14, name: "Nancy Garcia", email: "nancy@example.com", age: 32, city: "Columbus", active: true},
		{id: 15, name: "Oscar Rodriguez", email: "oscar@example.com", age: 41, city: "Charlotte", active: false}
	]

	const basicColumns = [
		{field: "id", title: "ID", width: "80px"},
		{field: "name", title: "Name"},
		{field: "email", title: "Email"},
		{field: "city", title: "City"}
	]

	const sortableColumns = [
		{field: "id", title: "ID", width: "80px", sortable: true},
		{field: "name", title: "Name", sortable: true},
		{field: "age", title: "Age", width: "100px", sortable: true, align: "center" as const},
		{field: "city", title: "City", sortable: true}
	]

	const filterableColumns = [
		{field: "name", title: "Name", filterable: true},
		{field: "email", title: "Email", filterable: true},
		{field: "city", title: "City", filterable: true}
	]

	const formattedColumns = [
		{field: "id", title: "ID", width: "80px"},
		{field: "name", title: "Name"},
		{field: "age", title: "Age", width: "100px", align: "center" as const},
		{
			field: "active",
			title: "Status",
			width: "120px",
			align: "center" as const,
			format: (value: boolean) => (value ? "✓ Active" : "✗ Inactive")
		}
	]

	const allFeaturesColumns = [
		{field: "id", title: "ID", width: "80px", sortable: true, align: "center" as const},
		{field: "name", title: "Name", sortable: true, filterable: true},
		{field: "email", title: "Email", filterable: true},
		{field: "age", title: "Age", width: "100px", sortable: true, align: "center" as const},
		{field: "city", title: "City", sortable: true, filterable: true},
		{
			field: "active",
			title: "Status",
			width: "120px",
			sortable: true,
			filterable: false,
			align: "center" as const,
			format: (value: boolean) => (value ? "✓ Active" : "✗ Inactive")
		}
	]
</script>

<Stack orientation="vertical" gap="1rem">
	<h1>QuickGrid</h1>

	<Card>
		<p>
			<strong>References:</strong>
			<span style="color: #999; cursor: not-allowed;" title="Custom component">QuickGrid (Custom)</span>
			|
			<a href="https://aspnet.github.io/quickgridsamples/" target="_blank" rel="noopener noreferrer">ASP.NET QuickGrid (Inspiration)</a>
			|
			<a href="/components/quickgrid-editable">QuickGrid Editable</a>
			|
			<a href="/components/quickgrid-contextmenu">QuickGrid Context Menu</a>
		</p>
	</Card>

	<p>
		A lightweight, flexible data grid component with sorting, filtering, and pagination support. Inspired by ASP.NET QuickGrid.
	</p>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6}>
			<Card>
				<h2>QuickGrid Component</h2>
				<table class="member-table">
					<thead>
						<tr>
							<th>Property</th>
							<th>Type</th>
							<th>Default</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>items</td>
							<td>T[]</td>
							<td>[]</td>
							<td>Array of data items to display</td>
						</tr>
						<tr>
							<td>columns</td>
							<td>Column&lt;T&gt;[]</td>
							<td>[]</td>
							<td>Column definitions</td>
						</tr>
						<tr>
							<td>sortable</td>
							<td>boolean</td>
							<td>false</td>
							<td>Enable sorting globally</td>
						</tr>
						<tr>
							<td>filterable</td>
							<td>boolean</td>
							<td>false</td>
							<td>Enable filtering globally</td>
						</tr>
						<tr>
							<td>pageable</td>
							<td>boolean</td>
							<td>false</td>
							<td>Enable pagination</td>
						</tr>
						<tr>
							<td>pageSize</td>
							<td>number</td>
							<td>10</td>
							<td>Items per page</td>
						</tr>
						<tr>
							<td>striped</td>
							<td>boolean</td>
							<td>true</td>
							<td>Alternate row colors</td>
						</tr>
						<tr>
							<td>hoverable</td>
							<td>boolean</td>
							<td>true</td>
							<td>Highlight rows on hover</td>
						</tr>
						<tr>
							<td>editable</td>
							<td>boolean</td>
							<td>false</td>
							<td>Enable inline editing (<a href="/components/quickgrid-editable">see editable docs</a>)</td>
						</tr>
					</tbody>
				</table>
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6}>
			<Card>
				<h2>Column Definition</h2>
				<table class="member-table">
					<thead>
						<tr>
							<th>Property</th>
							<th>Type</th>
							<th>Default</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>field</td>
							<td>keyof T | string</td>
							<td>required</td>
							<td>Field name from data item</td>
						</tr>
						<tr>
							<td>title</td>
							<td>string</td>
							<td>required</td>
							<td>Column header text</td>
						</tr>
						<tr>
							<td>sortable</td>
							<td>boolean</td>
							<td>undefined</td>
							<td>Enable sorting for this column</td>
						</tr>
						<tr>
							<td>filterable</td>
							<td>boolean</td>
							<td>undefined</td>
							<td>Enable filtering for this column</td>
						</tr>
						<tr>
							<td>width</td>
							<td>string</td>
							<td>undefined</td>
							<td>Column width (e.g., "120px")</td>
						</tr>
						<tr>
							<td>align</td>
							<td>"left" | "center" | "right"</td>
							<td>"left"</td>
							<td>Text alignment</td>
						</tr>
						<tr>
							<td>format</td>
							<td>(value, row) =&gt; string</td>
							<td>undefined</td>
							<td>Custom cell formatter</td>
						</tr>
						<tr>
							<td>editable</td>
							<td>boolean</td>
							<td>undefined</td>
							<td>Enable editing (<a href="/components/quickgrid-editable">see editable docs</a>)</td>
						</tr>
					</tbody>
				</table>
			</Card>
		</GridItem>
	</Grid>

	<Card>
		<h2>Basic Grid</h2>
		<p>Simple grid with default settings:</p>
		<QuickGrid items={sampleData} columns={basicColumns} />
	</Card>

	<Card>
		<h2>Sortable Grid</h2>
		<p>Click column headers to sort (supports string, number, and mixed types):</p>
		<QuickGrid items={sampleData} columns={sortableColumns} sortable />
	</Card>

	<Card>
		<h2>Filterable Grid</h2>
		<p>Type in the filter inputs to search (case-insensitive):</p>
		<QuickGrid items={sampleData} columns={filterableColumns} filterable />
	</Card>

	<Card>
		<h2>Paginated Grid</h2>
		<p>Grid with pagination (5 items per page):</p>
		<QuickGrid items={sampleData} columns={basicColumns} pageable pageSize={5} />
	</Card>

	<Card>
		<h2>Custom Formatting</h2>
		<p>Use format function to customize cell display:</p>
		<QuickGrid items={sampleData} columns={formattedColumns} />
	</Card>

	<Card>
		<h2>All Features Combined</h2>
		<p>Sorting, filtering, pagination, and custom formatting:</p>
		<QuickGrid
			items={sampleData}
			columns={allFeaturesColumns}
			sortable
			filterable
			pageable
			pageSize={7}
		/>
	</Card>

	<Card>
		<h2>No Stripes, No Hover</h2>
		<p>Grid without alternating row colors or hover effects:</p>
		<QuickGrid items={sampleData} columns={basicColumns} striped={false} hoverable={false} />
	</Card>

	<Card>
		<h2>Editable Grid</h2>
		<p>QuickGrid supports inline editing with multiple editor types, validation, dynamic options loading, and custom editors.</p>
		<p><a href="/components/quickgrid-editable">See QuickGrid Editable documentation</a> for examples and full API reference.</p>
	</Card>
</Stack>
