<script lang="ts">
	type IconSize = 16 | 20 | 24 | 28 | 32 | 48
	type IconVariant = 'regular' | 'filled'
	type IconColor = 'neutral' | 'accent' | 'warning' | 'info' | 'error' | 'success' | 'fill' | 'fill-inverse' | 'lightweight' | 'disabled' | 'custom'

	type Props = {
		name: string
		size?: IconSize
		variant?: IconVariant
		color?: IconColor
		customColor?: string
		primaryFill?: string  // Legacy prop, use color instead
		hoverEffect?: boolean
		class?: string
		style?: string
		title?: string
		width?: string
	}

	// Color enum to CSS variable mapping (matching FluentUI Blazor)
	const colorMap: Record<IconColor, string> = {
		'neutral': 'var(--neutral-foreground-rest)',
		'accent': 'var(--accent-fill-rest)',
		'warning': 'var(--warning)',
		'info': 'var(--info)',
		'error': 'var(--error)',
		'success': 'var(--success)',
		'fill': 'var(--neutral-fill-rest)',
		'fill-inverse': 'var(--neutral-fill-inverse-rest)',
		'lightweight': 'var(--neutral-layer-1)',
		'disabled': 'var(--neutral-stroke-rest)',
		'custom': ''  // Uses customColor prop
	}

	let {
		name,
		size = 24,
		variant = 'regular',
		color = undefined,
		customColor = undefined,
		primaryFill = undefined,
		hoverEffect = false,
		class: className = '',
		style: styleParam = '',
		title = undefined,
		width = undefined
	}: Props = $props()

	// Resolve the fill color: color enum > customColor > primaryFill > currentColor
	let resolvedFill = $derived.by(() => {
		if (color === 'custom' && customColor) {
			return customColor
		}
		if (color && colorMap[color]) {
			return colorMap[color]
		}
		return primaryFill || 'currentColor'
	})

	let svgContent = $state<string>('')
	let svgContentFilled = $state<string>('')
	let isLoading = $state<boolean>(true)
	let error = $state<string | null>(null)

	// Derived computed style
	let computedStyle = $derived.by(() => {
		let styles = styleParam || ''
		styles += ` --icon-size: ${size}px;`
		styles += ` --icon-fill: ${resolvedFill};`
		if (width) {
			styles += ` width: ${width};`
		}
		return styles
	})

	// Load SVG content using fetch
	async function loadSvg(iconName: string, iconSize: IconSize, iconVariant: IconVariant) {
		try {
			isLoading = true
			error = null

			// Construct the icon file path
			const fileName = `${iconName}_${iconSize}_${iconVariant}.svg`

			// Fetch from node_modules - Vite dev server will serve these files
			const iconUrl = `/node_modules/@fluentui/svg-icons/icons/${fileName}`

			const response = await fetch(iconUrl)
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const svgContent = await response.text()
			return svgContent
		} catch (err) {
			console.error(`Failed to load icon: ${iconName}_${iconSize}_${iconVariant}`, err)
			error = `Icon not found: ${iconName}`
			return ''
		} finally {
			isLoading = false
		}
	}

	// Load the SVG on mount and when props change
	$effect(() => {
		loadSvg(name, size, variant).then((content) => {
			svgContent = content
		})

		// If hover effect is enabled, also load the filled variant
		if (hoverEffect && variant === 'regular') {
			loadSvg(name, size, 'filled').then((content) => {
				svgContentFilled = content
			})
		}
	})
</script>

{#if error}
	<span class="fluent-icon-error" style={computedStyle} title={error}>⚠️</span>
{:else if isLoading}
	<span class="fluent-icon-loading" style={computedStyle} title="Loading icon..."></span>
{:else if hoverEffect && svgContentFilled}
	<!-- Hover effect: show both regular and filled -->
	<span class="fluent-icon fluent-icon-hoverable {className}" style={computedStyle}>
		<span class="icon-regular" {title}>{@html svgContent}</span>
		<span class="icon-filled" {title}>{@html svgContentFilled}</span>
	</span>
{:else}
	<!-- Standard icon without hover effect -->
	<span class="fluent-icon {className}" style={computedStyle} {title}>
		{@html svgContent}
	</span>
{/if}

<style>
	.fluent-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--icon-size, 24px);
		height: var(--icon-size, 24px);
		color: var(--icon-fill, currentColor);
		line-height: 1;
		vertical-align: middle;
	}

	.fluent-icon :global(svg) {
		width: 100%;
		height: 100%;
		fill: var(--icon-fill, currentColor);
		display: block;
	}

	/* Hover effect styles */
	.fluent-icon-hoverable {
		position: relative;
	}

	.fluent-icon-hoverable .icon-regular,
	.fluent-icon-hoverable .icon-filled {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	/* Default: show regular, hide filled */
	.fluent-icon-hoverable .icon-regular {
		display: inline-flex;
	}
	.fluent-icon-hoverable .icon-filled {
		display: none;
	}

	/* On hover/active: show filled, hide regular */
	.fluent-icon-hoverable:hover .icon-regular,
	.fluent-icon-hoverable:active .icon-regular {
		display: none;
	}
	.fluent-icon-hoverable:hover .icon-filled,
	.fluent-icon-hoverable:active .icon-filled {
		display: inline-flex;
	}

	/* Trigger icon change when parent button/link is hovered */
	:global(fluent-button:hover) .fluent-icon-hoverable .icon-regular,
	:global(button:hover) .fluent-icon-hoverable .icon-regular,
	:global(a:hover) .fluent-icon-hoverable .icon-regular,
	:global(.fluent-nav-link:hover) .fluent-icon-hoverable .icon-regular {
		display: none;
	}

	:global(fluent-button:hover) .fluent-icon-hoverable .icon-filled,
	:global(button:hover) .fluent-icon-hoverable .icon-filled,
	:global(a:hover) .fluent-icon-hoverable .icon-filled,
	:global(.fluent-nav-link:hover) .fluent-icon-hoverable .icon-filled {
		display: inline-flex;
	}

	/* Also trigger on active state */
	:global(fluent-button:active) .fluent-icon-hoverable .icon-regular,
	:global(button:active) .fluent-icon-hoverable .icon-regular,
	:global(a:active) .fluent-icon-hoverable .icon-regular,
	:global(.fluent-nav-link:active) .fluent-icon-hoverable .icon-regular {
		display: none;
	}

	:global(fluent-button:active) .fluent-icon-hoverable .icon-filled,
	:global(button:active) .fluent-icon-hoverable .icon-filled,
	:global(a:active) .fluent-icon-hoverable .icon-filled,
	:global(.fluent-nav-link:active) .fluent-icon-hoverable .icon-filled {
		display: inline-flex;
	}

	.fluent-icon-error,
	.fluent-icon-loading {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--icon-size, 24px);
		height: var(--icon-size, 24px);
		font-size: calc(var(--icon-size, 24px) * 0.75);
	}

	.fluent-icon-loading {
		opacity: 0.5;
	}
</style>
