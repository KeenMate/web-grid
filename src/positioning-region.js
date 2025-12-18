/**
 * PositioningRegion - Utility component for positioning overlays
 *
 * Positions content (dropdowns, tooltips, menus) relative to an anchor element.
 * Supports automatic repositioning when off-screen.
 *
 * This is an internal component used by WebGrid and GridCellEditor.
 */

import { BaseComponent, defineElement } from './base-component.js'

/**
 * @typedef {'bottom' | 'top' | 'left' | 'right'} Position
 * @typedef {'center' | 'start' | 'end'} Alignment
 */

export class PositioningRegion extends BaseComponent {
  // ============ Properties ============

  /** @type {HTMLElement|null} */
  #anchor = null

  /** @type {Position} */
  #position = 'bottom'

  /** @type {Alignment} */
  #align = 'start'

  /** @type {boolean} */
  #visible = false

  /** @type {number} */
  #gap = 4

  /** @type {number|null} */
  #rafId = null

  // ============ Getters/Setters ============

  get anchor() {
    return this.#anchor
  }

  set anchor(value) {
    this.#anchor = value
    if (this.#visible) {
      this.updatePosition()
    }
  }

  get position() {
    return this.#position
  }

  set position(value) {
    this.#position = value
    if (this.#visible) {
      this.updatePosition()
    }
  }

  get align() {
    return this.#align
  }

  set align(value) {
    this.#align = value
    if (this.#visible) {
      this.updatePosition()
    }
  }

  get visible() {
    return this.#visible
  }

  set visible(value) {
    const wasVisible = this.#visible
    this.#visible = value

    if (value && !wasVisible) {
      this.show()
    } else if (!value && wasVisible) {
      this.hide()
    }
  }

  get gap() {
    return this.#gap
  }

  set gap(value) {
    this.#gap = value
    if (this.#visible) {
      this.updatePosition()
    }
  }

  // ============ Lifecycle ============

  init() {
    // Set initial styles
    this.style.position = 'fixed'
    this.style.zIndex = '1000'
    this.style.display = 'none'
  }

  connected() {
    // Start position updates if visible
    if (this.#visible) {
      this.startPositionUpdates()
    }
  }

  disconnected() {
    this.stopPositionUpdates()
  }

  // ============ Positioning Logic ============

  show() {
    this.style.display = 'block'
    this.updatePosition()
    this.startPositionUpdates()
  }

  hide() {
    this.style.display = 'none'
    this.stopPositionUpdates()
  }

  /**
   * Start continuous position updates (for scroll/resize handling)
   */
  startPositionUpdates() {
    this.stopPositionUpdates()

    const update = () => {
      if (this.#visible && this.isConnected) {
        this.updatePosition()
        this.#rafId = requestAnimationFrame(update)
      }
    }

    this.#rafId = requestAnimationFrame(update)
  }

  /**
   * Stop position updates
   */
  stopPositionUpdates() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId)
      this.#rafId = null
    }
  }

  /**
   * Update the position based on anchor element
   */
  updatePosition() {
    if (!this.#anchor || !this.#visible) return

    const anchorRect = this.#anchor.getBoundingClientRect()
    const thisRect = this.getBoundingClientRect()

    // Viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate position
    let { top, left } = this.calculatePosition(
      anchorRect,
      thisRect,
      this.#position,
      this.#align
    )

    // Check if off-screen and try alternate positions
    const positions = this.getAlternatePositions(this.#position)

    for (const pos of positions) {
      const { top: newTop, left: newLeft } = this.calculatePosition(
        anchorRect,
        thisRect,
        pos,
        this.#align
      )

      // Check if this position fits in viewport
      if (
        newTop >= 0 &&
        newLeft >= 0 &&
        newTop + thisRect.height <= viewportHeight &&
        newLeft + thisRect.width <= viewportWidth
      ) {
        top = newTop
        left = newLeft
        break
      }
    }

    // Clamp to viewport bounds
    top = Math.max(0, Math.min(top, viewportHeight - thisRect.height))
    left = Math.max(0, Math.min(left, viewportWidth - thisRect.width))

    // Apply position
    this.style.top = `${top}px`
    this.style.left = `${left}px`
  }

  /**
   * Calculate position for given placement
   * @param {DOMRect} anchorRect
   * @param {DOMRect} thisRect
   * @param {Position} position
   * @param {Alignment} align
   * @returns {{ top: number, left: number }}
   */
  calculatePosition(anchorRect, thisRect, position, align) {
    let top = 0
    let left = 0

    switch (position) {
      case 'bottom':
        top = anchorRect.bottom + this.#gap
        left = this.calculateAlignedLeft(anchorRect, thisRect, align)
        break

      case 'top':
        top = anchorRect.top - thisRect.height - this.#gap
        left = this.calculateAlignedLeft(anchorRect, thisRect, align)
        break

      case 'left':
        top = this.calculateAlignedTop(anchorRect, thisRect, align)
        left = anchorRect.left - thisRect.width - this.#gap
        break

      case 'right':
        top = this.calculateAlignedTop(anchorRect, thisRect, align)
        left = anchorRect.right + this.#gap
        break
    }

    return { top, left }
  }

  /**
   * Calculate left position based on alignment (for top/bottom placement)
   * @param {DOMRect} anchorRect
   * @param {DOMRect} thisRect
   * @param {Alignment} align
   * @returns {number}
   */
  calculateAlignedLeft(anchorRect, thisRect, align) {
    switch (align) {
      case 'start':
        return anchorRect.left
      case 'end':
        return anchorRect.right - thisRect.width
      case 'center':
      default:
        return anchorRect.left + (anchorRect.width - thisRect.width) / 2
    }
  }

  /**
   * Calculate top position based on alignment (for left/right placement)
   * @param {DOMRect} anchorRect
   * @param {DOMRect} thisRect
   * @param {Alignment} align
   * @returns {number}
   */
  calculateAlignedTop(anchorRect, thisRect, align) {
    switch (align) {
      case 'start':
        return anchorRect.top
      case 'end':
        return anchorRect.bottom - thisRect.height
      case 'center':
      default:
        return anchorRect.top + (anchorRect.height - thisRect.height) / 2
    }
  }

  /**
   * Get alternate positions to try if primary is off-screen
   * @param {Position} primary
   * @returns {Position[]}
   */
  getAlternatePositions(primary) {
    const all = ['bottom', 'top', 'right', 'left']
    const opposite = {
      bottom: 'top',
      top: 'bottom',
      left: 'right',
      right: 'left'
    }

    // Try: primary, opposite, then others
    const result = [primary, opposite[primary]]
    for (const pos of all) {
      if (!result.includes(pos)) {
        result.push(pos)
      }
    }

    return result
  }

  // ============ Rendering ============

  styles() {
    return `
      :host {
        position: fixed;
        z-index: 1000;
      }
    `
  }

  template() {
    return `<slot></slot>`
  }
}

// Define custom element
defineElement('qg-positioning-region', PositioningRegion)

export default PositioningRegion
