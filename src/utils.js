/**
 * Utility functions for WebGrid web component
 */

// ============ HTML Templating ============

/**
 * Escape HTML special characters to prevent XSS
 * @param {any} unsafe - Value to escape
 * @returns {string}
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) {
    return ''
  }
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Tagged template literal for safe HTML generation
 * Escapes interpolated values unless they are SafeHTML instances
 *
 * @example
 * html`<div class="${className}">${userInput}</div>`
 * html`<div>${html`<span>nested</span>`}</div>`
 *
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {SafeHTML}
 */
export function html(strings, ...values) {
  let result = strings[0]

  for (let i = 0; i < values.length; i++) {
    const value = values[i]

    if (value instanceof SafeHTML) {
      // Already safe, use as-is
      result += value.toString()
    } else if (Array.isArray(value)) {
      // Join array items (each item gets escaped unless SafeHTML)
      result += value
        .map(v => v instanceof SafeHTML ? v.toString() : escapeHtml(v))
        .join('')
    } else {
      // Escape the value
      result += escapeHtml(value)
    }

    result += strings[i + 1]
  }

  return new SafeHTML(result)
}

/**
 * Wrapper class to mark HTML as safe (already escaped)
 */
export class SafeHTML {
  /** @type {string} */
  #html

  /**
   * @param {string} html
   */
  constructor(html) {
    this.#html = html
  }

  toString() {
    return this.#html
  }
}

/**
 * Create raw/unsafe HTML (use with caution!)
 * Only use for trusted content like icons or pre-sanitized HTML
 * @param {string} htmlString
 * @returns {SafeHTML}
 */
export function raw(htmlString) {
  return new SafeHTML(htmlString)
}

/**
 * Conditionally render HTML
 * @param {boolean} condition
 * @param {() => SafeHTML | string} thenFn
 * @param {() => SafeHTML | string} [elseFn]
 * @returns {SafeHTML}
 */
export function when(condition, thenFn, elseFn) {
  if (condition) {
    const result = thenFn()
    return result instanceof SafeHTML ? result : new SafeHTML(escapeHtml(result))
  }
  if (elseFn) {
    const result = elseFn()
    return result instanceof SafeHTML ? result : new SafeHTML(escapeHtml(result))
  }
  return new SafeHTML('')
}

/**
 * Map array to HTML
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => SafeHTML | string} fn
 * @returns {SafeHTML}
 */
export function map(items, fn) {
  if (!items || items.length === 0) {
    return new SafeHTML('')
  }
  const results = items.map((item, index) => {
    const result = fn(item, index)
    return result instanceof SafeHTML ? result.toString() : escapeHtml(result)
  })
  return new SafeHTML(results.join(''))
}

/**
 * Join array of SafeHTML or strings
 * @param {(SafeHTML | string)[]} items
 * @param {string} [separator='']
 * @returns {SafeHTML}
 */
export function join(items, separator = '') {
  const result = items
    .map(item => item instanceof SafeHTML ? item.toString() : escapeHtml(item))
    .join(separator)
  return new SafeHTML(result)
}

// ============ Function Utilities ============

/**
 * Debounce a function
 * @template {(...args: any[]) => any} T
 * @param {T} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T & { cancel: () => void }}
 */
export function debounce(fn, delay) {
  let timeoutId = null

  const debounced = function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn.apply(this, args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Throttle a function
 * @template {(...args: any[]) => any} T
 * @param {T} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {T}
 */
export function throttle(fn, limit) {
  let inThrottle = false

  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// ============ Number Utilities ============

/**
 * Clamp a number between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Round to specified decimal places
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function round(value, decimals) {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

// ============ String Utilities ============

/**
 * Convert camelCase to kebab-case
 * @param {string} str
 * @returns {string}
 */
export function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str
 * @returns {string}
 */
export function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Capitalize first letter
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============ Object Utilities ============

/**
 * Deep clone an object (simple implementation)
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item))
  }

  const cloned = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

/**
 * Get nested property value by path
 * @param {object} obj
 * @param {string} path - Dot-separated path (e.g., "user.name")
 * @param {any} [defaultValue]
 * @returns {any}
 */
export function getPath(obj, path, defaultValue = undefined) {
  if (!obj || !path) return defaultValue

  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue
    }
    current = current[key]
  }

  return current === undefined ? defaultValue : current
}

/**
 * Set nested property value by path
 * @param {object} obj
 * @param {string} path - Dot-separated path
 * @param {any} value
 */
export function setPath(obj, path, value) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

// ============ Array Utilities ============

/**
 * Move item in array from one index to another
 * @template T
 * @param {T[]} array
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {T[]} New array with item moved
 */
export function moveItem(array, fromIndex, toIndex) {
  const result = [...array]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

/**
 * Insert item into array at index
 * @template T
 * @param {T[]} array
 * @param {number} index
 * @param {T} item
 * @returns {T[]} New array with item inserted
 */
export function insertItem(array, index, item) {
  const result = [...array]
  result.splice(index, 0, item)
  return result
}

/**
 * Remove item from array at index
 * @template T
 * @param {T[]} array
 * @param {number} index
 * @returns {T[]} New array with item removed
 */
export function removeItem(array, index) {
  const result = [...array]
  result.splice(index, 1)
  return result
}

// ============ Comparison Utilities ============

/**
 * Compare two values for sorting
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
export function compare(a, b) {
  // Handle null/undefined
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1
  if (b === null || b === undefined) return 1

  // Same type comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }

  // Fallback to string comparison
  return String(a).localeCompare(String(b))
}

// ============ DOM Utilities ============

/**
 * Get element's position relative to viewport
 * @param {Element} element
 * @returns {{ top: number, left: number, width: number, height: number }}
 */
export function getRect(element) {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  }
}

/**
 * Check if element is visible in viewport
 * @param {Element} element
 * @returns {boolean}
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  )
}

/**
 * Scroll element into view if not visible
 * @param {Element} element
 * @param {ScrollIntoViewOptions} [options]
 */
export function scrollIntoViewIfNeeded(element, options = { block: 'nearest' }) {
  if (!isInViewport(element)) {
    element.scrollIntoView(options)
  }
}

/**
 * Get closest scrollable parent
 * @param {Element} element
 * @returns {Element|null}
 */
export function getScrollParent(element) {
  let parent = element.parentElement

  while (parent) {
    const style = getComputedStyle(parent)
    const overflow = style.overflow + style.overflowY + style.overflowX

    if (/(auto|scroll)/.test(overflow)) {
      return parent
    }

    parent = parent.parentElement
  }

  return document.documentElement
}

// ============ Event Utilities ============

/**
 * Create event delegation handler
 * @param {string} selector - CSS selector to match
 * @param {(event: Event, target: Element) => void} handler
 * @returns {(event: Event) => void}
 */
export function delegate(selector, handler) {
  return function (event) {
    const target = event.target.closest(selector)
    if (target) {
      handler(event, target)
    }
  }
}

/**
 * One-time event listener
 * @param {EventTarget} target
 * @param {string} event
 * @param {EventListener} handler
 * @param {AddEventListenerOptions} [options]
 */
export function once(target, event, handler, options = {}) {
  target.addEventListener(event, handler, { ...options, once: true })
}

// ============ Async Utilities ============

/**
 * Wait for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait for next animation frame
 * @returns {Promise<number>}
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * Wait for next microtask (like Svelte's tick)
 * @returns {Promise<void>}
 */
export function tick() {
  return Promise.resolve()
}

// ============ ID Generation ============

let idCounter = 0

/**
 * Generate unique ID
 * @param {string} [prefix='id']
 * @returns {string}
 */
export function uniqueId(prefix = 'id') {
  return `${prefix}-${++idCounter}`
}

// ============ Type Checking ============

/**
 * Check if value is a plain object
 * @param {any} value
 * @returns {boolean}
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check if value is a function
 * @param {any} value
 * @returns {boolean}
 */
export function isFunction(value) {
  return typeof value === 'function'
}

/**
 * Check if value is nullish (null or undefined)
 * @param {any} value
 * @returns {boolean}
 */
export function isNullish(value) {
  return value === null || value === undefined
}
