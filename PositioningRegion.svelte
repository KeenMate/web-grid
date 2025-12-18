<script lang="ts">
	import { onMount, tick } from 'svelte'
	import type {SlotType} from "../types/index.js"

	type PositionType = "bottom" | "left" | "right" | "top"
	type AlignType = "center" | "top"

	type Props = {
		anchor?: HTMLElement
		visible?: boolean
		style?: string
		title?: string
		position?: PositionType
		align?: AlignType  // Vertical alignment for left/right positions
		children?: SlotType
	}

	let {
		anchor = undefined,
		visible = false,
		style = '',
		title = undefined,
		position: positionProp = "bottom",
		align: alignProp = "center",
		children = undefined
	}: Props = $props()

	// svelte-ignore non_reactive_update
	let overlayElement: HTMLDivElement | undefined = undefined
	let coords = $state({ top: 0, left: 0, width: 0 })

	// Update position - synchronous calculation
	function updatePosition() {
		if (!anchor || !overlayElement || !visible) return

		const anchorRect = anchor.getBoundingClientRect()
		const overlayRect = overlayElement.getBoundingClientRect()
		const viewportHeight = window.innerHeight
		const viewportWidth = window.innerWidth

		let top = 0
		let left = 0
		let width = anchorRect.width

		if (positionProp === "left") {
			// Position to the left of the anchor
			if (alignProp === "top") {
				top = anchorRect.bottom - overlayRect.height
			} else {
				top = anchorRect.top + (anchorRect.height / 2) - (overlayRect.height / 2)
			}
			left = anchorRect.left - overlayRect.width
			width = overlayRect.width

			// Cascade: left → right → top
			if (left < 0) {
				// Try right side
				left = anchorRect.right
				if (left + overlayRect.width > viewportWidth) {
					// Neither side fits, use top
					top = anchorRect.top - overlayRect.height
					left = anchorRect.left
					width = overlayRect.width
					// If would go off top, position below
					if (top < 0) {
						top = anchorRect.bottom
					}
				}
			}
		} else if (positionProp === "right") {
			// Position to the right of the anchor
			if (alignProp === "top") {
				top = anchorRect.bottom - overlayRect.height
			} else {
				top = anchorRect.top + (anchorRect.height / 2) - (overlayRect.height / 2)
			}
			left = anchorRect.right
			width = overlayRect.width

			// Cascade: right → left → top
			if (left + overlayRect.width > viewportWidth) {
				// Try left side
				left = anchorRect.left - overlayRect.width
				if (left < 0) {
					// Neither side fits, use top
					top = anchorRect.top - overlayRect.height
					left = anchorRect.left
					width = overlayRect.width
					// If would go off top, position below
					if (top < 0) {
						top = anchorRect.bottom
					}
				}
			}
		} else if (positionProp === "top") {
			// Position above the anchor
			top = anchorRect.top - overlayRect.height
			left = anchorRect.left
			width = anchorRect.width

			// If would go off top, position below instead
			if (top < 0) {
				top = anchorRect.bottom
			}
		} else {
			// Default: position below the anchor
			top = anchorRect.bottom
			left = anchorRect.left
			width = anchorRect.width

			// If dropdown would go off bottom of viewport, position above instead
			if (anchorRect.bottom + overlayRect.height > viewportHeight) {
				top = anchorRect.top - overlayRect.height
			}
		}

		coords = { top, left, width }
	}

	// Update position when visible or anchor changes
	$effect(() => {
		if (visible && anchor) {
			// Use tick to ensure element is mounted before calculating position
			tick().then(() => updatePosition())
		}
	})

	onMount(() => {
		if (visible && anchor) {
			updatePosition()
		}
	})
</script>

{#if anchor}
	<!-- Positioned overlay mode (for dropdowns, tooltips) -->
	{#if visible}
		<div
			bind:this={overlayElement}
			class="positioning-region"
			{title}
			style="
				position: fixed;
				top: {coords.top}px;
				left: {coords.left}px;
				width: {coords.width}px;
				{style}
			"
		>
			{@render children?.()}
		</div>
	{/if}
{:else}
	<!-- Static wrapper mode (for NavLink, etc.) - always render -->
	<div
		class="positioning-region"
		{title}
		style={style}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	.positioning-region {
		z-index: 1000;
	}
</style>
