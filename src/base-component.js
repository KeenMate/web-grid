/**
 * BaseComponent - A lightweight base class for web components with reactive state
 *
 * Features:
 * - Shadow DOM with open mode
 * - Batched rendering via requestAnimationFrame
 * - Reactive state management with automatic re-renders
 * - Attribute reflection helpers
 * - CSS injection utilities
 */
export class BaseComponent extends HTMLElement {
  /** @type {boolean} */
  #renderScheduled = false

  /** @type {Map<string, any>} */
  #state = new Map()

  /** @type {Set<string>} */
  #changedKeys = new Set()

  /** @type {boolean} */
  #initialized = false

  /** @type {AbortController|null} */
  #abortController = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  /**
   * Called when element is added to DOM
   */
  connectedCallback() {
    this.#abortController = new AbortController()

    if (!this.#initialized) {
      this.#initialized = true
      this.init()
    }

    this.scheduleRender()
    this.connected()
  }

  /**
   * Called when element is removed from DOM
   */
  disconnectedCallback() {
    if (this.#abortController) {
      this.#abortController.abort()
      this.#abortController = null
    }
    this.disconnected()
  }

  /**
   * Called when observed attribute changes
   * @param {string} name
   * @param {string|null} oldValue
   * @param {string|null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.attributeChanged(name, oldValue, newValue)
      this.scheduleRender()
    }
  }

  // ============ Lifecycle hooks for subclasses ============

  /**
   * Override to perform one-time initialization
   */
  init() {}

  /**
   * Override to perform actions when connected to DOM
   */
  connected() {}

  /**
   * Override to perform cleanup when disconnected
   */
  disconnected() {}

  /**
   * Override to handle attribute changes
   * @param {string} name
   * @param {string|null} oldValue
   * @param {string|null} newValue
   */
  attributeChanged(name, oldValue, newValue) {}

  /**
   * Override to render the component
   * @returns {string} HTML string to render
   */
  template() {
    return ''
  }

  /**
   * Override to return CSS styles
   * @returns {string} CSS string
   */
  styles() {
    return ''
  }

  /**
   * Override to set up event listeners after render
   * Called after every render
   */
  afterRender() {}

  // ============ State Management ============

  /**
   * Get a state value
   * @param {string} key
   * @returns {any}
   */
  getState(key) {
    return this.#state.get(key)
  }

  /**
   * Set a state value and schedule re-render if changed
   * @param {string} key
   * @param {any} value
   * @returns {boolean} true if value changed
   */
  setState(key, value) {
    const oldValue = this.#state.get(key)

    // Deep equality check for objects/arrays would be expensive
    // Use reference equality for objects, strict equality for primitives
    if (oldValue === value) {
      return false
    }

    this.#state.set(key, value)
    this.#changedKeys.add(key)
    this.scheduleRender()
    return true
  }

  /**
   * Set multiple state values at once
   * @param {Record<string, any>} updates
   */
  setStates(updates) {
    let changed = false
    for (const [key, value] of Object.entries(updates)) {
      if (this.setState(key, value)) {
        changed = true
      }
    }
    return changed
  }

  /**
   * Check if a state key changed in the last update
   * @param {string} key
   * @returns {boolean}
   */
  stateChanged(key) {
    return this.#changedKeys.has(key)
  }

  /**
   * Batch multiple state updates without intermediate renders
   * @param {() => void} fn
   */
  batch(fn) {
    const wasScheduled = this.#renderScheduled
    this.#renderScheduled = true // Prevent renders during batch

    try {
      fn()
    } finally {
      this.#renderScheduled = wasScheduled
      this.scheduleRender()
    }
  }

  // ============ Rendering ============

  /**
   * Schedule a render on next animation frame
   */
  scheduleRender() {
    if (this.#renderScheduled || !this.isConnected) {
      return
    }

    this.#renderScheduled = true

    requestAnimationFrame(() => {
      this.#renderScheduled = false
      this.render()
      this.#changedKeys.clear()
    })
  }

  /**
   * Force immediate render (use sparingly)
   */
  forceRender() {
    this.#renderScheduled = false
    this.render()
    this.#changedKeys.clear()
  }

  /**
   * Render the component
   */
  render() {
    if (!this.shadowRoot) return

    const css = this.styles()
    const html = this.template()

    this.shadowRoot.innerHTML = `
      ${css ? `<style>${css}</style>` : ''}
      ${html}
    `

    this.afterRender()
  }

  // ============ DOM Utilities ============

  /**
   * Query an element in shadow DOM
   * @param {string} selector
   * @returns {Element|null}
   */
  $(selector) {
    return this.shadowRoot?.querySelector(selector) ?? null
  }

  /**
   * Query all elements in shadow DOM
   * @param {string} selector
   * @returns {NodeListOf<Element>}
   */
  $$(selector) {
    return this.shadowRoot?.querySelectorAll(selector) ?? []
  }

  /**
   * Add event listener with automatic cleanup on disconnect
   * @param {EventTarget} target
   * @param {string} event
   * @param {EventListener} handler
   * @param {AddEventListenerOptions} [options]
   */
  listen(target, event, handler, options = {}) {
    if (this.#abortController) {
      target.addEventListener(event, handler, {
        ...options,
        signal: this.#abortController.signal
      })
    }
  }

  /**
   * Emit a custom event
   * @param {string} eventName
   * @param {any} [detail]
   * @param {CustomEventInit} [options]
   */
  emit(eventName, detail, options = {}) {
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true, // Cross shadow DOM boundary
      detail,
      ...options
    }))
  }

  // ============ Attribute Utilities ============

  /**
   * Get boolean attribute
   * @param {string} name
   * @returns {boolean}
   */
  getBoolAttr(name) {
    return this.hasAttribute(name)
  }

  /**
   * Set boolean attribute
   * @param {string} name
   * @param {boolean} value
   */
  setBoolAttr(name, value) {
    if (value) {
      this.setAttribute(name, '')
    } else {
      this.removeAttribute(name)
    }
  }

  /**
   * Get number attribute with default
   * @param {string} name
   * @param {number} defaultValue
   * @returns {number}
   */
  getNumAttr(name, defaultValue = 0) {
    const value = this.getAttribute(name)
    if (value === null) return defaultValue
    const num = Number(value)
    return isNaN(num) ? defaultValue : num
  }

  /**
   * Get string attribute with default
   * @param {string} name
   * @param {string} defaultValue
   * @returns {string}
   */
  getStrAttr(name, defaultValue = '') {
    return this.getAttribute(name) ?? defaultValue
  }

  // ============ Abort Signal (for async operations) ============

  /**
   * Get abort signal for async operations (auto-aborts on disconnect)
   * @returns {AbortSignal|undefined}
   */
  get signal() {
    return this.#abortController?.signal
  }
}

/**
 * Define a custom element with automatic kebab-case naming
 * @param {string} tagName
 * @param {typeof HTMLElement} elementClass
 */
export function defineElement(tagName, elementClass) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass)
  }
}
