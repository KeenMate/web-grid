export type SlotType = any

export type OptionItem = {
	value: string
	label: string
	disabled: boolean
}

export type SelectedValue = OptionItem["value"][] | undefined | null

export type FluentAccordionSvelteContext = {
	// in case of expand mode = "single" value will be an array of length 1 or null if nothing is expanded
	value: string[] | null | undefined
}
