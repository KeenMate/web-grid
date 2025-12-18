<script lang="ts">
	import {QuickGrid, Stack, Grid, GridItem, Card, Dialog, Button, Select, Option} from "svelte-fluentui"

	type Person = {
		id: number
		name: string
		email: string
		age: number
		city: string
		active: boolean
		role?: string
		metadata?: Record<string, any>
	}

	// Type for validation state
	type CellValidationState = {
		rowIndex: number
		field: string
		error: string
	}

	let sampleData: Person[] = $state([
		{id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28, city: "New York", active: true, role: "admin", metadata: {theme: "dark", notifications: true}},
		{id: 2, name: "Bob Smith", email: "bob@example.com", age: 34, city: "Los Angeles", active: true, role: "user", metadata: {theme: "light", language: "en"}},
		{id: 3, name: "Carol White", email: "carol@example.com", age: 26, city: "Chicago", active: false, role: "user", metadata: null},
		{id: 4, name: "David Brown", email: "david@example.com", age: 42, city: "Houston", active: true, role: "moderator", metadata: {permissions: ["read", "write"]}},
		{id: 5, name: "Eve Davis", email: "eve@example.com", age: 31, city: "Phoenix", active: true, role: "user", metadata: {theme: "auto"}},
		{id: 6, name: "Frank Miller", email: "frank@example.com", age: 29, city: "Philadelphia", active: false, role: "user"},
		{id: 7, name: "Grace Lee", email: "grace@example.com", age: 37, city: "San Antonio", active: true, role: "admin", metadata: {dashboard: {widgets: ["stats", "chart"]}}},
		{id: 8, name: "Henry Wilson", email: "henry@example.com", age: 25, city: "San Diego", active: true, role: "user"},
		{id: 9, name: "Iris Moore", email: "iris@example.com", age: 33, city: "Dallas", active: false, role: "moderator", metadata: {notes: "VIP customer"}},
		{id: 10, name: "Jack Taylor", email: "jack@example.com", age: 39, city: "San Jose", active: true, role: "user"},
		{id: 11, name: "Karen Anderson", email: "karen@example.com", age: 27, city: "Austin", active: true, role: "user"},
		{id: 12, name: "Leo Thomas", email: "leo@example.com", age: 36, city: "Jacksonville", active: false, role: "user"},
		{id: 13, name: "Mary Martinez", email: "mary@example.com", age: 30, city: "Fort Worth", active: true, role: "moderator"},
		{id: 14, name: "Nancy Garcia", email: "nancy@example.com", age: 32, city: "Columbus", active: true, role: "user"},
		{id: 15, name: "Oscar Rodriguez", email: "oscar@example.com", age: 41, city: "Charlotte", active: false, role: "admin", metadata: {verified: true, level: 5}}
	])

	// Editable columns configuration
	const editableColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "age", title: "Age", width: "100px", align: "center" as const, editable: true, editor: "number" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const},
		{field: "active", title: "Active", width: "100px", align: "center" as const, editable: true, editor: "checkbox" as const},
		{
			field: "role",
			title: "Role",
			width: "150px",
			editable: true,
			editor: "select" as const,
			editorOptions: {
				options: [
					{value: "admin", label: "Administrator"},
					{value: "moderator", label: "Moderator"},
					{value: "user", label: "User"}
				]
			}
		}
	]

	// Always editable columns (Excel-like spreadsheet)
	const alwaysEditableColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const, editTrigger: "always" as const},
		{field: "age", title: "Age", width: "80px", align: "center" as const, editable: true, editor: "number" as const, editTrigger: "always" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const, editTrigger: "always" as const},
		{field: "active", title: "Active", width: "80px", align: "center" as const, editable: true, editor: "checkbox" as const, editTrigger: "always" as const}
	]

	// Navigate mode columns (arrow keys to move, type to edit)
	const navigateColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "age", title: "Age", width: "80px", align: "center" as const, editable: true, editor: "number" as const, editorOptions: {min: 0, max: 120}},
		{field: "city", title: "City", editable: true, editor: "text" as const},
		{field: "active", title: "Active", width: "80px", align: "center" as const, editable: true, editor: "checkbox" as const},
		{
			field: "metadata",
			title: "Metadata",
			width: "150px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			format: (value: any) => value ? JSON.stringify(value).substring(0, 20) + (JSON.stringify(value).length > 20 ? "..." : "") : "(empty)",
			oncelledit: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	// Mixed edit triggers columns
	const mixedTriggerColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name (dblclick)", editable: true, editor: "text" as const, editTrigger: "dblclick" as const},
		{field: "city", title: "City (click)", editable: true, editor: "text" as const, editTrigger: "click" as const},
		{field: "age", title: "Age (button)", width: "100px", align: "center" as const, editable: true, editor: "number" as const, editTrigger: "button" as const, showEditButton: true},
		{field: "active", title: "Active (always)", width: "100px", align: "center" as const, editable: true, editor: "checkbox" as const, editTrigger: "always" as const}
	]

	// Custom JSON editor columns
	type CustomEditorContext = {
		value: any
		row: Person
		rowIndex: number
		field: string
		commit: (newValue: any) => void
		cancel: () => void
	}

	let jsonDialogOpen = $state(false)
	let jsonEditorContext = $state<CustomEditorContext | null>(null)
	let jsonEditorValue = $state("")
	let jsonError = $state<string | null>(null)
	let jsonTextarea: HTMLTextAreaElement | undefined = $state()

	// Autofocus textarea when dialog opens
	$effect(() => {
		if (jsonDialogOpen && jsonTextarea) {
			// Small delay to ensure dialog is fully rendered
			setTimeout(() => jsonTextarea?.focus({ preventScroll: true }), 50)
		}
	})

	const jsonEditorColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "email", title: "Email", editable: true, editor: "text" as const},
		{
			field: "metadata",
			title: "Metadata (JSON)",
			width: "200px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			format: (value: any) => value ? JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? "..." : "") : "(empty)",
			oncelledit: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	function handleJsonSave() {
		if (!jsonEditorContext) return

		try {
			const parsed = jsonEditorValue.trim() ? JSON.parse(jsonEditorValue) : null
			jsonEditorContext.commit(parsed)
			jsonDialogOpen = false
			jsonEditorContext = null
			jsonError = null
		} catch (e) {
			jsonError = "Invalid JSON: " + (e as Error).message
		}
	}

	function handleJsonCancel() {
		jsonEditorContext?.cancel()
		jsonDialogOpen = false
		jsonEditorContext = null
		jsonError = null
	}

	let lastChange = $state<string>("")

	function handleRowChange(detail: {row: Person; draftRow: Person; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		// Only update data if validation passed
		if (detail.isValid) {
			// Apply the change from draftRow to the original data
			sampleData[detail.rowIndex] = {...detail.draftRow}
			lastChange = `Changed ${detail.field}: "${JSON.stringify(detail.oldValue)}" → "${JSON.stringify(detail.newValue)}" (row ${detail.rowIndex + 1})`
		} else {
			// Invalid value stays in draftRow and cell displays it (user can fix it)
			lastChange = `Validation failed for ${detail.field}: ${detail.validationError} (row ${detail.rowIndex + 1})`
		}
	}

	// === Validation Example ===

	// All countries with ISO codes
	const allCountries = [
		{value: "US", label: "United States"},
		{value: "GB", label: "United Kingdom"},
		{value: "DE", label: "Germany"},
		{value: "FR", label: "France"},
		{value: "IT", label: "Italy"},
		{value: "ES", label: "Spain"},
		{value: "PT", label: "Portugal"},
		{value: "NL", label: "Netherlands"},
		{value: "BE", label: "Belgium"},
		{value: "AT", label: "Austria"},
		{value: "CH", label: "Switzerland"},
		{value: "PL", label: "Poland"},
		{value: "CZ", label: "Czech Republic"},
		{value: "SK", label: "Slovakia"},
		{value: "HU", label: "Hungary"},
		{value: "RO", label: "Romania"},
		{value: "BG", label: "Bulgaria"},
		{value: "GR", label: "Greece"},
		{value: "SE", label: "Sweden"},
		{value: "NO", label: "Norway"},
		{value: "DK", label: "Denmark"},
		{value: "FI", label: "Finland"},
		{value: "IE", label: "Ireland"},
		{value: "CA", label: "Canada"},
		{value: "AU", label: "Australia"},
		{value: "NZ", label: "New Zealand"},
		{value: "JP", label: "Japan"},
		{value: "KR", label: "South Korea"},
		{value: "CN", label: "China"},
		{value: "IN", label: "India"},
		{value: "BR", label: "Brazil"},
		{value: "MX", label: "Mexico"},
		{value: "AR", label: "Argentina"},
		{value: "ZA", label: "South Africa"}
	]

	// Initial popular countries to show before search
	const popularCountries = allCountries.slice(0, 10)

	// Fake API search with delay - supports AbortSignal for cancellation
	async function searchCountries(query: string, _row: unknown, signal?: AbortSignal): Promise<typeof allCountries> {
		// Simulate network delay (300-800ms) with abort support
		const delay = 300 + Math.random() * 500
		await new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(resolve, delay)
			signal?.addEventListener('abort', () => {
				clearTimeout(timeoutId)
				reject(new DOMException('Aborted', 'AbortError'))
			})
		})

		// Check if aborted after delay
		if (signal?.aborted) {
			throw new DOMException('Aborted', 'AbortError')
		}

		const lowerQuery = query.toLowerCase()
		return allCountries.filter(c =>
			c.label.toLowerCase().includes(lowerQuery) ||
			c.value.toLowerCase().includes(lowerQuery)
		)
	}

	// Helper to get country name from ISO code
	function getCountryName(isoCode: string | null): string {
		if (!isoCode) return ""
		const country = allCountries.find(c => c.value === isoCode)
		return country?.label || isoCode
	}

	// Status options for select editor
	const statusOptions = [
		{value: "active", label: "Active"},
		{value: "inactive", label: "Inactive"},
		{value: "pending", label: "Pending"},
		{value: "suspended", label: "Suspended"}
	]

	// City options for combobox editor (static filterable list)
	const cityOptions = [
		{value: "new_york", label: "New York"},
		{value: "los_angeles", label: "Los Angeles"},
		{value: "chicago", label: "Chicago"},
		{value: "houston", label: "Houston"},
		{value: "phoenix", label: "Phoenix"},
		{value: "philadelphia", label: "Philadelphia"},
		{value: "san_antonio", label: "San Antonio"},
		{value: "san_diego", label: "San Diego"},
		{value: "dallas", label: "Dallas"},
		{value: "austin", label: "Austin"}
	]

	let validationData = $state([
		{id: 1, name: "Alice", email: "alice@example.com", age: 28, score: 85, country: "US", status: "active", city: "new_york", verified: true, settings: {theme: "dark"}},
		{id: 2, name: "Bob", email: "bob@example.com", age: 34, score: 92, country: "GB", status: "active", city: "chicago", verified: true, settings: {notifications: true}},
		{id: 3, name: "Carol", email: "carol@example.com", age: 26, score: 78, country: "DE", status: "pending", city: "austin", verified: false, settings: null},
		{id: 4, name: "David", email: "invalid-email", age: -5, score: 150, country: null, status: "inactive", city: null, verified: false, settings: {level: 5}},  // Pre-invalid data
		{id: 5, name: "", email: "eve@example.com", age: 31, score: 88, country: "FR", status: "suspended", city: "dallas", verified: true, settings: {premium: true}}  // Empty name
	])

	let validationInvalidCells = $state<CellValidationState[]>([])
	let validationLastChange = $state("")

	// Helper to get city name from value
	function getCityName(cityValue: string | null): string {
		if (!cityValue) return ""
		const city = cityOptions.find(c => c.value === cityValue)
		return city?.label || cityValue
	}

	// Helper to get status label
	function getStatusLabel(statusValue: string | null): string {
		if (!statusValue) return ""
		const status = statusOptions.find(s => s.value === statusValue)
		return status?.label || statusValue
	}

	const validationColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{
			field: "name",
			title: "Name (text)",
			editable: true,
			editor: "text" as const,
			onbeforecommit: ({value}: {value: unknown}) => {
				const strValue = String(value || "").trim()
				if (!strValue) return "Name is required"
				if (strValue.length < 2) return "Name must be at least 2 characters"
				// Transform: capitalize first letter
				return {
					valid: true,
					transformedValue: strValue.charAt(0).toUpperCase() + strValue.slice(1)
				}
			}
		},
		{
			field: "age",
			title: "Age (number)",
			width: "120px",
			align: "center" as const,
			editable: true,
			editor: "number" as const,
			editorOptions: {min: 0, max: 150},
			onbeforecommit: ({value}: {value: unknown}) => {
				const numValue = Number(value)
				if (isNaN(numValue)) return "Age must be a number"
				if (numValue < 0) return "Age cannot be negative"
				if (numValue > 150) return "Age seems unrealistic"
				return true
			}
		},
		{
			field: "score",
			title: "Score (number)",
			width: "130px",
			align: "center" as const,
			editable: true,
			editor: "number" as const,
			onbeforecommit: ({value}: {value: unknown}) => {
				const numValue = Number(value)
				if (numValue < 0 || numValue > 100) {
					return "Score must be between 0 and 100"
				}
				// Transform: round to integer
				return {
					valid: true,
					transformedValue: Math.round(numValue)
				}
			}
		},
		{
			field: "status",
			title: "Status (select)",
			headerInfo: "Click cell to show dropdown toggle, then click toggle to open options",
			width: "150px",
			editable: true,
			editor: "select" as const,
			format: (value: string | null) => getStatusLabel(value),
			editorOptions: {
				options: statusOptions,
				valueMember: "value",
				displayMember: "label"
			}
		},
		{
			field: "city",
			title: "City (combobox)",
			headerInfo: "Type to filter options, or click toggle to see all",
			width: "170px",
			editable: true,
			editor: "combobox" as const,
			format: (value: string | null) => getCityName(value),
			editorOptions: {
				options: cityOptions,
				valueMember: "value",
				displayMember: "label",
				allowEmpty: true,
				placeholder: "Filter cities..."
			}
		},
		{
			field: "country",
			title: "Country (autocomplete)",
			headerInfo: "Type to search countries via async API",
			width: "210px",
			editable: true,
			editor: "autocomplete" as const,
			// Display country name instead of ISO code
			format: (value: string | null) => getCountryName(value),
			editorOptions: {
				// Initial options shown before user types
				initialOptions: popularCountries,
				// Async search with fake API delay
				onSearch: searchCountries,
				// Start searching after 1 character
				minSearchLength: 1,
				// Debounce search calls
				debounceMs: 200,
				// Use ISO code as value, label as display
				valueMember: "value",
				displayMember: "label",
				// Allow clearing
				allowEmpty: true,
				emptyLabel: "-- Select country --",
				placeholder: "Search countries..."
			},
			onbeforecommit: ({value}: {value: unknown}) => {
				// Country is optional, but if provided must be valid
				if (value && !allCountries.find(c => c.value === value)) {
					return "Please select a valid country"
				}
				return true
			}
		},
		{
			field: "verified",
			title: "Verified (checkbox)",
			headerInfo: "Toggle verification status",
			width: "130px",
			align: "center" as const,
			editable: true,
			editor: "checkbox" as const
		},
		{
			field: "settings",
			title: "Settings (JSON)",
			headerInfo: "Click edit button to open JSON editor",
			width: "150px",
			editable: true,
			editor: "custom" as const,
			showEditButton: true,
			format: (value: any) => value ? JSON.stringify(value).substring(0, 15) + (JSON.stringify(value).length > 15 ? "..." : "") : "(empty)",
			oncelledit: (context: CustomEditorContext) => {
				jsonEditorContext = context
				jsonEditorValue = context.value ? JSON.stringify(context.value, null, 2) : ""
				jsonError = null
				jsonDialogOpen = true
			}
		}
	]

	function handleValidationRowChange(detail: {row: typeof validationData[0]; draftRow: typeof validationData[0]; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		if (detail.isValid) {
			// Apply changes from draftRow to original data
			validationData[detail.rowIndex] = {...detail.draftRow}
			validationLastChange = `✓ ${detail.field} updated to "${detail.newValue}"`
		} else {
			// Invalid value persists in draftRow - cell will display the invalid value
			validationLastChange = `✗ ${detail.field}: ${detail.validationError} (invalid value "${detail.newValue}" shown in cell)`
		}
	}

	// === Async Validation Example ===
	let asyncValidationData = $state([
		{id: 1, username: "alice", email: "alice@example.com"},
		{id: 2, username: "bob", email: "bob@example.com"},
		{id: 3, username: "admin", email: "admin@example.com"}  // Reserved username
	])

	let asyncInvalidCells = $state<CellValidationState[]>([])
	let asyncLastChange = $state("")
	let isCheckingUsername = $state(false)

	// Simulated API call to check username availability
	async function checkUsernameAvailable(username: string): Promise<boolean> {
		await new Promise(resolve => setTimeout(resolve, 500))  // Simulate network delay
		const reserved = ["admin", "root", "system", "test"]
		return !reserved.includes(username.toLowerCase())
	}

	const asyncValidationColumns = [
		{field: "id", title: "ID", width: "60px", align: "center" as const},
		{
			field: "username",
			title: "Username",
			editable: true,
			editor: "text" as const,
			onbeforecommit: async ({value}: {value: unknown}) => {
				const strValue = String(value || "").trim().toLowerCase()
				if (!strValue) return "Username is required"
				if (strValue.length < 3) return "Username must be at least 3 characters"
				if (!/^[a-z0-9_]+$/.test(strValue)) return "Username can only contain letters, numbers, and underscores"

				// Async validation - check availability
				const available = await checkUsernameAvailable(strValue)
				if (!available) return `Username "${strValue}" is reserved`

				return {valid: true, transformedValue: strValue}
			}
		},
		{
			field: "email",
			title: "Email",
			editable: true,
			editor: "text" as const,
			onbeforecommit: ({value}: {value: unknown}) => {
				const strValue = String(value || "")
				if (!strValue.includes("@")) return "Invalid email"
				return {valid: true, transformedValue: strValue.toLowerCase()}
			}
		}
	]

	function handleAsyncValidationRowChange(detail: {row: typeof asyncValidationData[0]; draftRow: typeof asyncValidationData[0]; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean; validationError?: string | null}) {
		if (detail.isValid) {
			// Apply changes from draftRow
			asyncValidationData[detail.rowIndex] = {...detail.draftRow}
			asyncLastChange = `✓ ${detail.field} updated`
		} else {
			// Invalid value shown in cell - user can fix it
			asyncLastChange = `✗ ${detail.field}: ${detail.validationError}`
		}
	}

	// === Row Actions Demo ===
	type SimpleItem = {
		id: number
		name: string
		value: number
	}

	let rowActionsData: SimpleItem[] = $state([
		{id: 1, name: "Item One", value: 100},
		{id: 2, name: "Item Two", value: 200},
		{id: 3, name: "Item Three", value: 300}
	])

	// Separate data for the second row actions example
	let rowActionsData2: SimpleItem[] = $state([
		{id: 1, name: "Alpha", value: 10},
		{id: 2, name: "Beta", value: 20},
		{id: 3, name: "Gamma", value: 30},
		{id: 4, name: "Delta", value: 40},
		{id: 5, name: "Epsilon", value: 50}
	])

	let nextRowId = $state(4)
	let nextRowId2 = $state(6)
	let lastRowAction = $state("")
	let lastRowAction2 = $state("")

	const rowActionsColumns = [
		{field: "id", title: "ID", width: "80px", align: "center" as const},
		{field: "name", title: "Name", editable: true, editor: "text" as const},
		{field: "value", title: "Value", width: "120px", align: "right" as const, editable: true, editor: "number" as const}
	]

	function handleRowAction(detail: {action: string; rowIndex: number; row: SimpleItem}) {
		const { action, rowIndex, row } = detail

		switch (action) {
			case 'add': {
				const newRow: SimpleItem = {id: nextRowId++, name: "", value: 0}
				rowActionsData = [
					...rowActionsData.slice(0, rowIndex + 1),
					newRow,
					...rowActionsData.slice(rowIndex + 1)
				]
				lastRowAction = `Added empty row after row ${rowIndex + 1}`
				break
			}
			case 'delete': {
				rowActionsData = rowActionsData.filter((_, i) => i !== rowIndex)
				lastRowAction = `Deleted row ${rowIndex + 1}`
				break
			}
			case 'duplicate': {
				const newRow = {...row, id: nextRowId++}
				rowActionsData = [
					...rowActionsData.slice(0, rowIndex + 1),
					newRow,
					...rowActionsData.slice(rowIndex + 1)
				]
				lastRowAction = `Duplicated row ${rowIndex + 1}`
				break
			}
			case 'moveUp': {
				if (rowIndex > 0) {
					const items = [...rowActionsData]
					;[items[rowIndex - 1], items[rowIndex]] = [items[rowIndex], items[rowIndex - 1]]
					rowActionsData = items
					lastRowAction = `Moved row ${rowIndex + 1} up`
				}
				break
			}
			case 'moveDown': {
				if (rowIndex < rowActionsData.length - 1) {
					const items = [...rowActionsData]
					;[items[rowIndex], items[rowIndex + 1]] = [items[rowIndex + 1], items[rowIndex]]
					rowActionsData = items
					lastRowAction = `Moved row ${rowIndex + 1} down`
				}
				break
			}
		}
	}

	function handleRowActionsRowChange(detail: {row: SimpleItem; draftRow: SimpleItem; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			rowActionsData[detail.rowIndex] = {...detail.draftRow}
		}
	}

	// Handler for second row actions example
	function handleRowAction2(detail: {action: string; rowIndex: number; row: SimpleItem}) {
		const { action, rowIndex, row } = detail

		switch (action) {
			case 'add': {
				const newRow: SimpleItem = {id: nextRowId2++, name: "", value: 0}
				rowActionsData2 = [
					...rowActionsData2.slice(0, rowIndex + 1),
					newRow,
					...rowActionsData2.slice(rowIndex + 1)
				]
				lastRowAction2 = `Added empty row after row ${rowIndex + 1}`
				break
			}
			case 'delete': {
				rowActionsData2 = rowActionsData2.filter((_, i) => i !== rowIndex)
				lastRowAction2 = `Deleted row ${rowIndex + 1}`
				break
			}
			case 'duplicate': {
				const newRow = {...row, id: nextRowId2++}
				rowActionsData2 = [
					...rowActionsData2.slice(0, rowIndex + 1),
					newRow,
					...rowActionsData2.slice(rowIndex + 1)
				]
				lastRowAction2 = `Duplicated row ${rowIndex + 1}`
				break
			}
			case 'moveUp': {
				if (rowIndex > 0) {
					const items = [...rowActionsData2]
					;[items[rowIndex - 1], items[rowIndex]] = [items[rowIndex], items[rowIndex - 1]]
					rowActionsData2 = items
					lastRowAction2 = `Moved row ${rowIndex + 1} up`
				}
				break
			}
			case 'moveDown': {
				if (rowIndex < rowActionsData2.length - 1) {
					const items = [...rowActionsData2]
					;[items[rowIndex], items[rowIndex + 1]] = [items[rowIndex + 1], items[rowIndex]]
					rowActionsData2 = items
					lastRowAction2 = `Moved row ${rowIndex + 1} down`
				}
				break
			}
		}
	}

	function handleRowActionsRowChange2(detail: {row: SimpleItem; draftRow: SimpleItem; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			rowActionsData2[detail.rowIndex] = {...detail.draftRow}
		}
	}

	// === Advanced Row Toolbar Demo ===
	let toolbarData: SimpleItem[] = $state([
		{id: 1, name: "Project Alpha", value: 1000},
		{id: 2, name: "Project Beta", value: 2500},
		{id: 3, name: "Project Gamma", value: 750},
		{id: 4, name: "Project Delta", value: 3200}
	])

	let nextToolbarId = $state(5)
	let lastToolbarAction = $state("")
	let toolbarAlignment = $state<'center' | 'top'>('center')
	let toolbarTriggerMode = $state<'hover' | 'click' | 'button'>('hover')

	// Custom async export handler
	async function handleExportRow(detail: {row: SimpleItem; rowIndex: number}) {
		lastToolbarAction = `Exporting "${detail.row.name}"...`
		// Simulate async operation
		await new Promise(resolve => setTimeout(resolve, 800))
		lastToolbarAction = `✓ Exported "${detail.row.name}" (ID: ${detail.row.id})`
	}

	// Custom preview handler
	function handlePreviewRow(detail: {row: SimpleItem; rowIndex: number}) {
		lastToolbarAction = `Preview: ${detail.row.name} - Value: $${detail.row.value.toLocaleString()}`
	}

	// Advanced toolbar with multi-row layout, groups, and custom actions
	type ToolbarItem = {
		id: string
		icon: string
		title: string
		label?: string
		row?: number
		group?: number
		type?: 'add' | 'delete' | 'duplicate' | 'moveUp' | 'moveDown'
		danger?: boolean
		disabled?: boolean | ((row: SimpleItem, rowIndex: number) => boolean)
		onclick?: (detail: {row: SimpleItem; rowIndex: number}) => void | Promise<void>
	}

	const advancedToolbar: (string | ToolbarItem)[] = [
		// Row 1: Move actions (group 1) | CRUD actions (group 2)
		{id: 'moveUp', type: 'moveUp', icon: '↑', title: 'Move up', row: 1, group: 1, disabled: (row, idx) => idx === 0},
		{id: 'moveDown', type: 'moveDown', icon: '↓', title: 'Move down', row: 1, group: 1, disabled: (row, idx) => idx === toolbarData.length - 1},
		{id: 'add', type: 'add', icon: '+', title: 'Add row below', row: 1, group: 2},
		{id: 'duplicate', type: 'duplicate', icon: '⧉', title: 'Duplicate', row: 1, group: 2},
		{id: 'delete', type: 'delete', icon: '−', title: 'Delete', danger: true, row: 1, group: 2},

		// Row 2: Custom actions
		{id: 'export', icon: '📤', title: 'Export row', row: 2, group: 1, onclick: handleExportRow},
		{id: 'preview', icon: '👁', title: 'Preview', label: 'View', row: 2, group: 1, onclick: handlePreviewRow},
		// Test buttons
		{id: 'test1', icon: '⚡', title: 'Test 1', row: 2, group: 2},
		{id: 'test2', icon: '🔧', title: 'Test 2', row: 2, group: 2},
		{id: 'test3', icon: '📋', title: 'Test 3', row: 2, group: 2},
		{id: 'test4', icon: '🔍', title: 'Test 4', row: 2, group: 2},
		{id: 'test5', icon: '📊', title: 'Test 5', row: 2, group: 2},
		{id: 'test6', icon: '⭐', title: 'Test 6', row: 2, group: 3},
		{id: 'test7', icon: '🎯', title: 'Test 7', row: 2, group: 3},
		{id: 'test8', icon: '💡', title: 'Test 8', row: 2, group: 3},
		{id: 'test9', icon: '🔔', title: 'Test 9', row: 2, group: 3},
		{id: 'test10', icon: '📌', title: 'Test 10', row: 2, group: 3}
	]

	function handleToolbarClick(detail: {item: ToolbarItem; rowIndex: number; row: SimpleItem}) {
		const {item, rowIndex, row} = detail

		// Handle predefined types
		if (item.type) {
			switch (item.type) {
				case 'add': {
					const newRow: SimpleItem = {id: nextToolbarId++, name: "New Project", value: 0}
					toolbarData = [
						...toolbarData.slice(0, rowIndex + 1),
						newRow,
						...toolbarData.slice(rowIndex + 1)
					]
					lastToolbarAction = `Added new row after "${row.name}"`
					break
				}
				case 'delete': {
					toolbarData = toolbarData.filter((_, i) => i !== rowIndex)
					lastToolbarAction = `Deleted "${row.name}"`
					break
				}
				case 'duplicate': {
					const newRow = {...row, id: nextToolbarId++, name: row.name + " (copy)"}
					toolbarData = [
						...toolbarData.slice(0, rowIndex + 1),
						newRow,
						...toolbarData.slice(rowIndex + 1)
					]
					lastToolbarAction = `Duplicated "${row.name}"`
					break
				}
				case 'moveUp': {
					if (rowIndex > 0) {
						const items = [...toolbarData]
						;[items[rowIndex - 1], items[rowIndex]] = [items[rowIndex], items[rowIndex - 1]]
						toolbarData = items
						lastToolbarAction = `Moved "${row.name}" up`
					}
					break
				}
				case 'moveDown': {
					if (rowIndex < toolbarData.length - 1) {
						const items = [...toolbarData]
						;[items[rowIndex], items[rowIndex + 1]] = [items[rowIndex + 1], items[rowIndex]]
						toolbarData = items
						lastToolbarAction = `Moved "${row.name}" down`
					}
					break
				}
			}
		}
	}

	function handleToolbarRowChange(detail: {row: SimpleItem; draftRow: SimpleItem; rowIndex: number; field: string; oldValue: any; newValue: any; isValid: boolean}) {
		if (detail.isValid) {
			toolbarData[detail.rowIndex] = {...detail.draftRow}
		}
	}
</script>

<Stack orientation="vertical" gap="1rem">
	<h1>QuickGrid Editable</h1>

	<Card>
		<p>
			<strong>References:</strong>
			<a href="/components/quickgrid">QuickGrid (Basic)</a>
			|
			<span style="color: #999; cursor: not-allowed;" title="Custom component">QuickGrid Editable (Custom)</span>
			|
			<a href="/components/quickgrid-contextmenu">QuickGrid Context Menu</a>
		</p>
	</Card>

	<p>
		QuickGrid supports inline editing with multiple editor types, edit triggers, validation, and advanced callbacks. This page covers all editable features.
	</p>

	<Grid spacing={3}>
		<GridItem xs={12} xl={6}>
			<Card>
				<h2>Editing Props (QuickGrid)</h2>
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
							<td>editable</td>
							<td>boolean</td>
							<td>false</td>
							<td>Enable inline editing mode</td>
						</tr>
						<tr>
							<td>editTrigger</td>
							<td>"click" | "dblclick" | "button" | "always" | "navigate"</td>
							<td>"dblclick"</td>
							<td>How to trigger cell editing</td>
						</tr>
						<tr>
							<td>invalidCells</td>
							<td>CellValidationState[]</td>
							<td>[]</td>
							<td>Bindable array of invalid cells (rowIndex, field, error)</td>
						</tr>
						<tr>
							<td>onrowchange</td>
							<td>(detail) =&gt; void</td>
							<td>undefined</td>
							<td>Callback when cell value changes (includes isValid, validationError)</td>
						</tr>
						<tr>
							<td>onroweditstart</td>
							<td>(detail) =&gt; void</td>
							<td>undefined</td>
							<td>Callback when cell enters edit mode</td>
						</tr>
						<tr>
							<td>onroweditcancel</td>
							<td>(detail) =&gt; void</td>
							<td>undefined</td>
							<td>Callback when editing is cancelled</td>
						</tr>
						<tr>
							<td>onvalidationerror</td>
							<td>(detail) =&gt; void</td>
							<td>undefined</td>
							<td>Callback when validation fails</td>
						</tr>
					</tbody>
				</table>
			</Card>
		</GridItem>
		<GridItem xs={12} xl={6}>
			<Card>
				<h2>Column Editing Props</h2>
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
							<td>editable</td>
							<td>boolean</td>
							<td>undefined</td>
							<td>Enable editing for this column</td>
						</tr>
						<tr>
							<td>editor</td>
							<td>"text" | "number" | "checkbox" | "select" | "date" | "autocomplete" | "custom"</td>
							<td>"text"</td>
							<td>Editor type for this column</td>
						</tr>
						<tr>
							<td>editTrigger</td>
							<td>"click" | "dblclick" | "button" | "always" | "navigate"</td>
							<td>grid default</td>
							<td>Per-column edit trigger override</td>
						</tr>
						<tr>
							<td>editorOptions</td>
							<td>object</td>
							<td>undefined</td>
							<td>Editor options (min/max, options, loadOptions, etc.)</td>
						</tr>
						<tr>
							<td>onbeforecommit</td>
							<td>(context) =&gt; ValidationResult | boolean | string | null | Promise</td>
							<td>undefined</td>
							<td>Validate and optionally transform value before commit</td>
						</tr>
						<tr>
							<td>validate</td>
							<td>(value, row) =&gt; string | null | Promise</td>
							<td>undefined</td>
							<td>Legacy validation (use onbeforecommit instead)</td>
						</tr>
						<tr>
							<td>oncelledit</td>
							<td>(context) =&gt; void</td>
							<td>undefined</td>
							<td>Custom editor callback (for editor="custom")</td>
						</tr>
						<tr>
							<td>showEditButton</td>
							<td>boolean</td>
							<td>false</td>
							<td>Show edit button in cell</td>
						</tr>
					</tbody>
				</table>
			</Card>
		</GridItem>
	</Grid>

	<Card>
		<h2>Edit Triggers</h2>
		<table class="member-table">
			<thead>
				<tr>
					<th>Trigger</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>dblclick</td>
					<td>Double-click to enter edit mode (default)</td>
				</tr>
				<tr>
					<td>click</td>
					<td>Single-click to enter edit mode</td>
				</tr>
				<tr>
					<td>button</td>
					<td>Click the edit button to enter edit mode</td>
				</tr>
				<tr>
					<td>always</td>
					<td>Cell is always in edit mode (spreadsheet-like)</td>
				</tr>
				<tr>
					<td>navigate</td>
					<td>Arrow key navigation with type-to-edit (Excel-like)</td>
				</tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Editable Grid (Double-click)</h2>
		<p>Double-click any editable cell to edit. Press <strong>Enter</strong> to save, <strong>Escape</strong> to cancel. Supports text, number, checkbox, and select editors.</p>
		<QuickGrid
			items={sampleData}
			columns={editableColumns}
			editable
			editTrigger="dblclick"
			onrowchange={handleRowChange}
			pageable
			pageSize={8}
		/>
		{#if lastChange}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				<strong>Last change:</strong> {lastChange}
			</p>
		{/if}
	</Card>

	<Card>
		<h2>Always Editable (Spreadsheet Mode)</h2>
		<p>All cells are always in edit mode - like a spreadsheet. Try using <strong>Tab</strong> to move between cells.</p>
		<QuickGrid
			items={sampleData}
			columns={alwaysEditableColumns}
			editable
			onrowchange={handleRowChange}
			pageable
			pageSize={10}
			striped={false}
		/>
	</Card>

	<Card>
		<h2>Navigate Mode (Excel-like)</h2>
		<p>Click a cell to focus, then use keyboard to navigate and edit:</p>
		<table class="member-table" style="margin-bottom: 1rem;">
			<thead>
				<tr>
					<th>Key</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>Arrow keys</td><td>Move between editable cells</td></tr>
				<tr><td>Tab / Shift+Tab</td><td>Move to next/previous cell</td></tr>
				<tr><td>Enter / F2</td><td>Enter edit mode</td></tr>
				<tr><td>Space</td><td>Toggle checkbox</td></tr>
				<tr><td>Escape</td><td>Cancel editing, return to navigation</td></tr>
				<tr><td>Any character</td><td>Start editing and type (text/number fields)</td></tr>
				<tr><td>Enter (while editing)</td><td>Commit and move to cell below</td></tr>
			</tbody>
		</table>
		<QuickGrid
			items={sampleData}
			columns={navigateColumns}
			editable
			editTrigger="navigate"
			onrowchange={handleRowChange}
			pageable
			pageSize={10}
		/>
	</Card>

	<Card>
		<h2>Mixed Edit Triggers</h2>
		<p>Different columns can have different edit triggers:</p>
		<QuickGrid
			items={sampleData}
			columns={mixedTriggerColumns}
			editable
			onrowchange={handleRowChange}
			pageable
			pageSize={8}
		/>
		<div style="margin-top: 1rem; padding: 1rem; background: var(--neutral-layer-2); border-radius: 4px;">
			<p><strong>Test checkboxes (outside grid):</strong></p>
			<label><input type="checkbox" /> Checkbox 1</label><br/>
			<label><input type="checkbox" /> Checkbox 2</label><br/>
			<label><input type="checkbox" /> Checkbox 3</label>
		</div>
	</Card>

	<Card>
		<h2>Custom Editor: JSON in Dialog</h2>
		<p>Click the edit button (✎) in the Metadata column to open a JSON editor dialog. This demonstrates using <code>editor: "custom"</code> with <code>oncelledit</code> callback.</p>
		<QuickGrid
			items={sampleData}
			columns={jsonEditorColumns}
			editable
			onrowchange={handleRowChange}
			pageable
			pageSize={8}
		/>
	</Card>

	<!-- JSON Editor Dialog -->
	<Dialog
		visible={jsonDialogOpen}
		modal
		size="small"
		onClose={handleJsonCancel}
	>
		<div class="json-editor-dialog">
			<h3>Edit JSON Metadata</h3>
			<p style="margin-bottom: 0.5rem; color: var(--neutral-foreground-hint, #707070);">
				Editing: {jsonEditorContext?.row?.name ?? ""}
			</p>
			<textarea
				bind:this={jsonTextarea}
				class="json-textarea"
				bind:value={jsonEditorValue}
				placeholder={'{"key": "value"}'}
				rows={12}
			></textarea>
			{#if jsonError}
				<p class="json-error">{jsonError}</p>
			{/if}
			<div class="json-dialog-actions">
				<Button appearance="neutral" onclick={handleJsonCancel}>Cancel</Button>
				<Button appearance="accent" onclick={handleJsonSave}>Save</Button>
			</div>
		</div>
	</Dialog>

	<Card>
		<h2>Validation with onbeforecommit (Excel-like)</h2>
		<p>
			Use <code>onbeforecommit</code> for validation and value transformation. Invalid cells stay marked until fixed.
			Click a cell and use arrow keys to navigate, type to edit. Try entering invalid values:
		</p>
		<ul style="margin: 0.5rem 0 1rem 1.5rem;">
			<li><strong>Name:</strong> Empty or less than 2 characters</li>
			<li><strong>Email:</strong> Missing @ or domain</li>
			<li><strong>Age:</strong> Negative or over 150</li>
			<li><strong>Score:</strong> Less than 0 or more than 100</li>
		</ul>
		<QuickGrid
			items={validationData}
			columns={validationColumns}
			editable
			editTrigger="navigate"
			checkboxAlwaysEditable
			bind:invalidCells={validationInvalidCells}
			onrowchange={handleValidationRowChange}
		/>
		<div style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
			{#if validationLastChange}
				<p style="padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px; margin: 0;">
					{validationLastChange}
				</p>
			{/if}
			{#if validationInvalidCells.length > 0}
				<p style="padding: 0.5rem; background: var(--error-fill-rest, #fde7e9); border-radius: 4px; margin: 0; color: var(--error-foreground, #d13438);">
					Invalid cells: {validationInvalidCells.length}
				</p>
			{/if}
		</div>
	</Card>

	<Card>
		<h2>Async Validation</h2>
		<p>
			<code>onbeforecommit</code> supports async validation. Try changing a username to "admin", "root", "system", or "test" - these are reserved and will show a validation error after the async check.
		</p>
		<QuickGrid
			items={asyncValidationData}
			columns={asyncValidationColumns}
			editable
			editTrigger="dblclick"
			bind:invalidCells={asyncInvalidCells}
			onrowchange={handleAsyncValidationRowChange}
		/>
		{#if asyncLastChange}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{asyncLastChange}
			</p>
		{/if}
	</Card>

	<Card>
		<h2>Row Action Popup</h2>
		<p>
			Hover over a row to see a popup with action buttons below the first cell. Actions include: <strong>Add</strong> (+), <strong>Delete</strong> (−), and <strong>Duplicate</strong> (⧉).
		</p>
		<QuickGrid
			items={rowActionsData}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowActions
			onrowaction={handleRowAction}
			onrowchange={handleRowActionsRowChange}
		/>
		{#if lastRowAction}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastRowAction}
			</p>
		{/if}
	</Card>

	<Card>
		<h2>Row Actions with Move Up/Down</h2>
		<p>
			You can customize which actions appear using the <code>rowActions</code> prop:
		</p>
		<QuickGrid
			items={rowActionsData2}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowActions
			rowActions={['moveUp', 'moveDown', 'duplicate', 'delete']}
			onrowaction={handleRowAction2}
			onrowchange={handleRowActionsRowChange2}
		/>
		{#if lastRowAction2}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastRowAction2}
			</p>
		{/if}
	</Card>

	<Card>
		<h2>Advanced Row Toolbar (Multi-row, Groups, Custom Actions)</h2>
		<p>
			The <code>rowToolbar</code> prop supports advanced configurations:
		</p>
		<ul style="margin: 0.5rem 0 1rem 1.5rem;">
			<li><strong>Multi-row layout:</strong> Items can be placed in different rows (<code>row: 1</code> = closest to grid)</li>
			<li><strong>Groups with dividers:</strong> Items with different <code>group</code> numbers are separated by <code>|</code></li>
			<li><strong>Custom actions:</strong> Define <code>onclick</code> handlers with async support</li>
			<li><strong>Dynamic disabled:</strong> Use a function <code>(row, rowIndex) =&gt; boolean</code> to disable conditionally</li>
			<li><strong>Labels:</strong> Add text labels next to icons with <code>label</code> property</li>
			<li><strong>Toolbar alignment:</strong> Use <code>toolbarAlign</code> to control vertical alignment (<code>center</code> or <code>top</code>)</li>
			<li><strong>Toolbar trigger:</strong> Use <code>toolbarTrigger</code> to control how toolbar appears (<code>hover</code>, <code>click</code>, or <code>button</code>)</li>
		</ul>
		<div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<label for="toolbar-align">Alignment:</label>
				<Select id="toolbar-align" value={toolbarAlignment} onchange={({ value }) => toolbarAlignment = value as 'center' | 'top'}>
					<Option value="center">Center (default)</Option>
					<Option value="top">Top (first row aligned)</Option>
				</Select>
			</div>
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<label for="toolbar-trigger">Trigger:</label>
				<Select id="toolbar-trigger" value={toolbarTriggerMode} onchange={({ value }) => toolbarTriggerMode = value as 'hover' | 'click' | 'button'}>
					<Option value="hover">Hover (default)</Option>
					<Option value="click">Click on row</Option>
					<Option value="button">Button in first column</Option>
				</Select>
			</div>
		</div>
		<QuickGrid
			items={toolbarData}
			columns={rowActionsColumns}
			editable
			editTrigger="dblclick"
			showRowToolbar
			rowToolbar={advancedToolbar}
			toolbarAlign={toolbarAlignment}
			toolbarTrigger={toolbarTriggerMode}
			ontoolbarclick={handleToolbarClick}
			onrowchange={handleToolbarRowChange}
		/>
		{#if lastToolbarAction}
			<p style="margin-top: 1rem; padding: 0.5rem; background: var(--neutral-layer-2, #f5f5f5); border-radius: 4px;">
				{lastToolbarAction}
			</p>
		{/if}
	</Card>

	<Card>
		<h2>Advanced Row Toolbar Code Example</h2>
		<pre>{`// Define toolbar with multi-row layout, groups, and custom actions
const advancedToolbar = [
  // Row 1: Move actions (group 1) | CRUD actions (group 2)
  { id: 'moveUp', type: 'moveUp', icon: '↑', title: 'Move up', row: 1, group: 1,
    disabled: (row, idx) => idx === 0 },
  { id: 'moveDown', type: 'moveDown', icon: '↓', title: 'Move down', row: 1, group: 1,
    disabled: (row, idx) => idx === items.length - 1 },
  { id: 'add', type: 'add', icon: '+', title: 'Add', row: 1, group: 2 },
  { id: 'duplicate', type: 'duplicate', icon: '⧉', title: 'Duplicate', row: 1, group: 2 },
  { id: 'delete', type: 'delete', icon: '−', title: 'Delete', danger: true, row: 1, group: 2 },

  // Row 2: Custom actions with async onclick
  { id: 'export', icon: '📤', title: 'Export', row: 2, group: 1,
    onclick: async ({ row }) => {
      await exportToCSV(row)
    }
  },
  { id: 'preview', icon: '👁', title: 'Preview', label: 'View', row: 2, group: 1,
    onclick: ({ row }) => showPreviewDialog(row)
  }
]

<QuickGrid
  {items}
  {columns}
  showRowToolbar
  rowToolbar={advancedToolbar}
  ontoolbarclick={handleToolbarClick}
/>`}</pre>
	</Card>

	<Card>
		<h2>Row Actions Code Example</h2>
		<pre>{`<script lang="ts">
  let items = $state([
    { id: 1, name: "Item One", value: 100 },
    { id: 2, name: "Item Two", value: 200 }
  ])

  let nextId = 3

  function handleRowAction(detail) {
    const { action, rowIndex, row } = detail

    switch (action) {
      case 'add':
        items = [
          ...items.slice(0, rowIndex + 1),
          { id: nextId++, name: "", value: 0 },
          ...items.slice(rowIndex + 1)
        ]
        break
      case 'delete':
        items = items.filter((_, i) => i !== rowIndex)
        break
      case 'duplicate':
        items = [
          ...items.slice(0, rowIndex + 1),
          { ...row, id: nextId++ },
          ...items.slice(rowIndex + 1)
        ]
        break
    }
  }
</script>

<QuickGrid
  {items}
  {columns}
  editable
  showRowActions
  onrowaction={handleRowAction}
/>

<!-- Or customize which actions to show -->
<QuickGrid
  {items}
  {columns}
  showRowActions
  rowActions={['add', 'duplicate']}
  onrowaction={handleRowAction}
/>`}</pre>
	</Card>

	<Card>
		<h2>Row Actions Props</h2>
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
					<td>showRowActions</td>
					<td>boolean</td>
					<td>false</td>
					<td>Show row action popup on hover</td>
				</tr>
				<tr>
					<td>rowActions</td>
					<td>RowActionType[]</td>
					<td>['add', 'delete', 'duplicate']</td>
					<td>Which actions to show in the popup</td>
				</tr>
				<tr>
					<td>onrowaction</td>
					<td>(detail) =&gt; void</td>
					<td>undefined</td>
					<td>Callback when an action button is clicked</td>
				</tr>
			</tbody>
		</table>
		<h3 style="margin-top: 1rem;">RowActionType</h3>
		<table class="member-table">
			<thead>
				<tr>
					<th>Action</th>
					<th>Icon</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>'add'</td><td>+</td><td>Add a new row below</td></tr>
				<tr><td>'delete'</td><td>−</td><td>Delete the row (shown in red on hover)</td></tr>
				<tr><td>'duplicate'</td><td>⧉</td><td>Duplicate the row</td></tr>
				<tr><td>'moveUp'</td><td>↑</td><td>Move the row up</td></tr>
				<tr><td>'moveDown'</td><td>↓</td><td>Move the row down</td></tr>
			</tbody>
		</table>
		<h3 style="margin-top: 1rem;">RowActionClickDetail</h3>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>action</td><td>RowActionType</td><td>The action that was clicked</td></tr>
				<tr><td>rowIndex</td><td>number</td><td>Index of the hovered row</td></tr>
				<tr><td>row</td><td>T</td><td>The row data</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>Basic Editable Code Example</h2>
		<pre>{`<script lang="ts">
  type Person = {
    id: number
    name: string
    age: number
    active: boolean
    role: string
  }

  let data: Person[] = $state([
    { id: 1, name: "Alice", age: 28, active: true, role: "admin" },
    { id: 2, name: "Bob", age: 34, active: false, role: "user" }
  ])

  const columns = [
    { field: "id", title: "ID", width: "80px" },
    { field: "name", title: "Name", editable: true, editor: "text" },
    { field: "age", title: "Age", editable: true, editor: "number",
      editorOptions: { min: 0, max: 120 } },
    { field: "active", title: "Active", editable: true, editor: "checkbox" },
    {
      field: "role",
      title: "Role",
      editable: true,
      editor: "select",
      editorOptions: {
        options: [
          { value: "admin", label: "Administrator" },
          { value: "user", label: "User" }
        ]
      }
    }
  ]

  function handleRowChange(detail) {
    // Update data - the component does NOT mutate your data
    data[detail.rowIndex] = {
      ...detail.row,
      [detail.field]: detail.newValue
    }
  }
</script>

<QuickGrid
  items={data}
  columns={columns}
  editable
  editTrigger="dblclick"
  onrowchange={handleRowChange}
/>`}</pre>
	</Card>

	<Card>
		<h2>Async Validation</h2>
		<p>QuickGrid supports both synchronous and asynchronous validation. The cell shows a loading state during async validation.</p>
		<pre>{`const columns = [
  {
    field: "email",
    title: "Email",
    editable: true,
    editor: "text",
    // Supports both sync and async validation
    validate: async (value, row) => {
      // Async API call to check uniqueness
      const exists = await checkEmailExists(value, row.id)
      return exists ? "Email already in use" : null
    }
  }
]

<QuickGrid
  items={data}
  columns={columns}
  editable
  onvalidationerror={(detail) => {
    console.log(\`Validation failed: \${detail.error}\`)
  }}
/>`}</pre>
	</Card>

	<Card>
		<h2>Dynamic Options Loading</h2>
		<p>Select and autocomplete editors can load options dynamically with configurable timing.</p>
		<table class="member-table" style="margin-bottom: 1rem;">
			<thead>
				<tr>
					<th>optionsLoadTrigger</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>immediate</td><td>Load once when grid mounts, cache forever</td></tr>
				<tr><td>oneditstart</td><td>Load when cell enters edit mode (default)</td></tr>
				<tr><td>ondropdownopen</td><td>Load when dropdown opens (lazy)</td></tr>
			</tbody>
		</table>
		<pre>{`const columns = [
  {
    field: "departmentId",
    title: "Department",
    editable: true,
    editor: "select",
    editorOptions: {
      // Load options dynamically
      loadOptions: async (row, field) => {
        const departments = await fetchDepartments(row.companyId)
        return departments.map(d => ({ value: d.id, label: d.name }))
      },
      optionsLoadTrigger: "ondropdownopen"
    }
  }
]`}</pre>
	</Card>

	<Card>
		<h2>Custom Editor (Dialog)</h2>
		<p>Use <code>editor: "custom"</code> with <code>oncelledit</code> callback to implement custom editors like dialogs, JSON editors, color pickers, etc.</p>
		<pre>{`<script>
  let showJsonDialog = false
  let jsonEditorContext = null

  const columns = [
    {
      field: "metadata",
      title: "Metadata",
      editable: true,
      editor: "custom",
      showEditButton: true,  // Shows edit icon in cell
      format: (value) => value ? "{ ... }" : "(empty)",
      oncelledit: (context) => {
        // context provides: value, row, rowIndex, field, commit(), cancel()
        jsonEditorContext = context
        showJsonDialog = true
      }
    }
  ]

  function handleJsonSave(newJson) {
    jsonEditorContext?.commit(newJson)  // Fires onrowchange
    showJsonDialog = false
  }
</script>

<QuickGrid {items} {columns} editable onrowchange={handleRowChange} />

{#if showJsonDialog}
  <Dialog open onclose={() => jsonEditorContext?.cancel()}>
    <JsonEditor
      value={jsonEditorContext?.value}
      onsave={handleJsonSave}
    />
  </Dialog>
{/if}`}</pre>
	</Card>

	<Card>
		<h2>CustomEditorContext</h2>
		<p>The context object passed to <code>oncelledit</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>value</td><td>any</td><td>Current cell value</td></tr>
				<tr><td>row</td><td>T</td><td>Full row data</td></tr>
				<tr><td>rowIndex</td><td>number</td><td>Row index in current view</td></tr>
				<tr><td>field</td><td>string</td><td>Field name being edited</td></tr>
				<tr><td>commit</td><td>(newValue) =&gt; void</td><td>Call to save new value (fires onrowchange)</td></tr>
				<tr><td>cancel</td><td>() =&gt; void</td><td>Call to cancel editing</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>EditorOptions</h2>
		<p>Options available in <code>editorOptions</code> depending on editor type:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Editors</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>options</td><td>EditorOption[]</td><td>select, autocomplete</td><td>Static options array</td></tr>
				<tr><td>loadOptions</td><td>(row, field) =&gt; Promise&lt;EditorOption[]&gt;</td><td>select, autocomplete</td><td>Dynamic options loader</td></tr>
				<tr><td>optionsLoadTrigger</td><td>"immediate" | "oneditstart" | "ondropdownopen"</td><td>select, autocomplete</td><td>When to load dynamic options</td></tr>
				<tr><td>min</td><td>number</td><td>number</td><td>Minimum value</td></tr>
				<tr><td>max</td><td>number</td><td>number</td><td>Maximum value</td></tr>
				<tr><td>step</td><td>number</td><td>number</td><td>Step increment</td></tr>
				<tr><td>maxLength</td><td>number</td><td>text</td><td>Maximum character length</td></tr>
				<tr><td>onSearch</td><td>(query, row) =&gt; Promise&lt;EditorOption[]&gt;</td><td>autocomplete</td><td>Search callback for autocomplete</td></tr>
				<tr><td>valueMember</td><td>string</td><td>select, autocomplete</td><td>Property to use as value (default: "value")</td></tr>
				<tr><td>displayMember</td><td>string</td><td>select, autocomplete</td><td>Property to use for display (default: "label")</td></tr>
				<tr><td>allowEmpty</td><td>boolean</td><td>select, autocomplete</td><td>Allow null/empty selection</td></tr>
				<tr><td>emptyLabel</td><td>string</td><td>select</td><td>Label for empty option (default: "-- Select --")</td></tr>
				<tr><td>placeholder</td><td>string</td><td>text, number, autocomplete</td><td>Input placeholder text</td></tr>
				<tr><td>initialOptions</td><td>EditorOption[]</td><td>autocomplete</td><td>Options shown before search</td></tr>
				<tr><td>minSearchLength</td><td>number</td><td>autocomplete</td><td>Min chars before search (default: 1)</td></tr>
				<tr><td>debounceMs</td><td>number</td><td>autocomplete</td><td>Search debounce delay (default: 300)</td></tr>
				<tr><td>trueValue</td><td>any</td><td>checkbox</td><td>Value to store when checked (default: true)</td></tr>
				<tr><td>falseValue</td><td>any</td><td>checkbox</td><td>Value to store when unchecked (default: false)</td></tr>
				<tr><td>minDate</td><td>Date | string</td><td>date</td><td>Minimum selectable date</td></tr>
				<tr><td>maxDate</td><td>Date | string</td><td>date</td><td>Maximum selectable date</td></tr>
				<tr><td>outputFormat</td><td>"date" | "iso" | "timestamp"</td><td>date</td><td>How to store the date value</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>RowChangeDetail</h2>
		<p>The detail object passed to <code>onrowchange</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>row</td><td>T</td><td>Original row data (unchanged)</td></tr>
				<tr><td>draftRow</td><td>T</td><td>Draft row with user's changes (including invalid values)</td></tr>
				<tr><td>rowIndex</td><td>number</td><td>Row index in current view</td></tr>
				<tr><td>field</td><td>string</td><td>Field name that changed</td></tr>
				<tr><td>oldValue</td><td>any</td><td>Previous value</td></tr>
				<tr><td>newValue</td><td>any</td><td>New value (may be transformed)</td></tr>
				<tr><td>isValid</td><td>boolean</td><td>True if validation passed</td></tr>
				<tr><td>validationError</td><td>string | null</td><td>Error message if validation failed</td></tr>
			</tbody>
		</table>
		<p style="margin-top: 0.5rem;"><strong>Note:</strong> Invalid values persist in <code>draftRow</code> and are displayed in the cell, allowing users to see and fix their invalid input. Use <code>draftRow</code> when applying changes to your data.</p>
	</Card>

	<Card>
		<h2>BeforeCommitContext</h2>
		<p>The context object passed to <code>onbeforecommit</code>:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>value</td><td>unknown</td><td>The new value being committed</td></tr>
				<tr><td>oldValue</td><td>unknown</td><td>The previous value</td></tr>
				<tr><td>row</td><td>T</td><td>Full row data</td></tr>
				<tr><td>rowIndex</td><td>number</td><td>Row index in current view</td></tr>
				<tr><td>field</td><td>string</td><td>Field name being edited</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>ValidationResult</h2>
		<p><code>onbeforecommit</code> can return various types:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Return Value</th>
					<th>Meaning</th>
				</tr>
			</thead>
			<tbody>
				<tr><td><code>true</code> / <code>null</code> / <code>undefined</code></td><td>Valid - commit proceeds</td></tr>
				<tr><td><code>false</code></td><td>Invalid - shows "Validation failed"</td></tr>
				<tr><td><code>"Error message"</code></td><td>Invalid - shows the error message</td></tr>
				<tr><td><code>{'{'}valid: true{'}'}</code></td><td>Valid - commit proceeds</td></tr>
				<tr><td><code>{'{'}valid: false, message: "Error"{'}'}</code></td><td>Invalid - shows the error message</td></tr>
				<tr><td><code>{'{'}valid: true, transformedValue: x{'}'}</code></td><td>Valid - commit with transformed value</td></tr>
			</tbody>
		</table>
	</Card>

	<Card>
		<h2>onbeforecommit Code Example</h2>
		<pre>{`const columns = [
  {
    field: "email",
    title: "Email",
    editable: true,
    editor: "text",
    onbeforecommit: ({ value, row }) => {
      const email = String(value || "").trim()

      // Validation
      if (!email) return "Email is required"
      if (!email.includes("@")) return "Invalid email format"

      // Transform (normalize to lowercase)
      return {
        valid: true,
        transformedValue: email.toLowerCase()
      }
    }
  },
  {
    field: "age",
    title: "Age",
    editable: true,
    editor: "number",
    onbeforecommit: async ({ value }) => {
      // Async validation example
      const num = Number(value)
      if (num < 0) return "Age cannot be negative"

      // Simulate API call
      const isValid = await validateAge(num)
      return isValid ? true : "Age validation failed"
    }
  }
]

// Handle changes
function handleRowChange(detail) {
  if (detail.isValid) {
    // Safe to update - newValue may be transformed
    data[detail.rowIndex][detail.field] = detail.newValue
  } else {
    // Cell marked invalid, user can see error
    console.log("Validation error:", detail.validationError)
  }
}

<QuickGrid
  items={data}
  columns={columns}
  editable
  bind:invalidCells={invalidCells}
  onrowchange={handleRowChange}
/>`}</pre>
	</Card>

	<Card>
		<h2>CellValidationState</h2>
		<p>The <code>invalidCells</code> array contains objects with this shape:</p>
		<table class="member-table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Type</th>
					<th>Description</th>
				</tr>
			</thead>
			<tbody>
				<tr><td>rowIndex</td><td>number</td><td>Row index of the invalid cell</td></tr>
				<tr><td>field</td><td>string</td><td>Field name of the invalid cell</td></tr>
				<tr><td>error</td><td>string</td><td>Validation error message</td></tr>
			</tbody>
		</table>
		<p style="margin-top: 1rem;">Use <code>bind:invalidCells</code> to track which cells have validation errors:</p>
		<pre>{`let invalidCells = $state([])

// Check if form is valid before saving
function canSave() {
  return invalidCells.length === 0
}

// Clear a specific cell's error
function clearError(rowIndex, field) {
  invalidCells = invalidCells.filter(c =>
    !(c.rowIndex === rowIndex && c.field === field)
  )
}`}</pre>
	</Card>
</Stack>

<style>
	.json-editor-dialog {
		padding: 1rem;
	}

	.json-editor-dialog h3 {
		margin: 0 0 0.5rem 0;
	}

	.json-textarea {
		width: 100%;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		padding: 0.75rem;
		border: 1px solid var(--neutral-stroke-input-rest, #d1d1d1);
		border-radius: var(--control-corner-radius, 4px);
		background: var(--neutral-layer-1, #ffffff);
		color: var(--neutral-foreground-rest, #242424);
		resize: vertical;
		box-sizing: border-box;
	}

	.json-textarea:focus {
		outline: none;
		border-color: var(--accent-fill-rest, #0078d4);
		box-shadow: 0 0 0 1px var(--accent-fill-rest, #0078d4);
	}

	.json-error {
		color: var(--error-foreground, #d13438);
		font-size: 0.875rem;
		margin: 0.5rem 0;
	}

	.json-dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	:global([data-theme="dark"]) .json-textarea {
		background: var(--neutral-layer-1, #1f1f1f);
		color: var(--neutral-foreground-rest, #e0e0e0);
		border-color: var(--neutral-stroke-input-rest, #5a5a5a);
	}
</style>
