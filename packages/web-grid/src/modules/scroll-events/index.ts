// =============================================================================
// Scroll Event Manager (Pub/Sub Pattern)
// =============================================================================
// Centralizes scroll event handling to avoid duplicate listeners.
// Single listener per source (container, window), modules subscribe/unsubscribe.

export type ScrollSource = 'container' | 'window'
export type ScrollHandler = () => void

export interface ScrollSubscription {
	unsubscribe: () => void
}

export interface ScrollEventManager {
	/**
	 * Subscribe to scroll events from a specific source
	 * @param source - 'container' for grid container scroll, 'window' for window scroll
	 * @param handler - Callback function to invoke on scroll
	 * @returns Subscription object with unsubscribe method
	 */
	subscribe(source: ScrollSource, handler: ScrollHandler): ScrollSubscription

	/**
	 * Initialize scroll listeners (called once in connectedCallback)
	 * @param container - The grid container element (.wg)
	 */
	init(container: HTMLElement): void

	/**
	 * Remove all listeners and subscriptions (called in disconnectedCallback)
	 */
	destroy(): void
}

/**
 * Create a scroll event manager for a single grid instance
 */
export function createScrollEventManager(): ScrollEventManager {
	const containerHandlers = new Set<ScrollHandler>()
	const windowHandlers = new Set<ScrollHandler>()

	let containerElement: HTMLElement | null = null
	let windowListenerAttached = false

	// Single container scroll handler
	const handleContainerScroll = () => {
		containerHandlers.forEach(handler => handler())
	}

	// Single window scroll handler
	const handleWindowScroll = () => {
		windowHandlers.forEach(handler => handler())
	}

	return {
		subscribe(source: ScrollSource, handler: ScrollHandler): ScrollSubscription {
			const handlers = source === 'container' ? containerHandlers : windowHandlers
			handlers.add(handler)

			return {
				unsubscribe: () => {
					handlers.delete(handler)
				}
			}
		},

		init(container: HTMLElement) {
			containerElement = container
			container.addEventListener('scroll', handleContainerScroll)

			if (!windowListenerAttached) {
				window.addEventListener('scroll', handleWindowScroll, { capture: true, passive: true })
				windowListenerAttached = true
			}
		},

		destroy() {
			if (containerElement) {
				containerElement.removeEventListener('scroll', handleContainerScroll)
				containerElement = null
			}

			if (windowListenerAttached) {
				window.removeEventListener('scroll', handleWindowScroll, true)
				windowListenerAttached = false
			}

			containerHandlers.clear()
			windowHandlers.clear()
		}
	}
}
