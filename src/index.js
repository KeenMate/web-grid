/**
 * WebGrid Web Component
 *
 * A feature-rich data grid as a pure JavaScript web component.
 *
 * @example
 * import '@keenmate/web-grid'
 *
 * const grid = document.querySelector('web-grid')
 * grid.items = [...]
 * grid.columns = [...]
 */

// Import CSS (Vite will bundle it)
import './css/main.css'

// Export all components
export { BaseComponent, defineElement } from './base-component.js'
export { WebGrid } from './web-grid.js'
export { PositioningRegion } from './positioning-region.js'
export { GridEditBehavior } from './grid-edit-behavior.js'

// Export utilities
export * from './utils.js'

// Import components to register them
import './web-grid.js'
import './positioning-region.js'

// Default export
export { WebGrid as default } from './web-grid.js'
