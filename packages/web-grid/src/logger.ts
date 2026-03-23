/**
 * Logging configuration using loglevel with categorized loggers
 *
 * Categories:
 * - GRID:INIT: Component initialization and configuration
 * - GRID:DATA: Data loading, sorting, filtering, pagination
 * - GRID:UI: UI updates, rendering, scroll, resize operations
 * - GRID:INTERACTION: User interactions, clicks, selections, keyboard events
 *
 * Usage:
 * - By default, all logging is disabled (silent mode) for production
 * - Enable logging in browser console:
 *   ```javascript
 *   // Enable all logging at debug level
 *   window.components['web-grid'].logging.enableLogging();
 *
 *   // Or set a specific log level for all categories
 *   window.components['web-grid'].logging.setLogLevel('info');
 *
 *   // Or enable/disable specific categories
 *   window.components['web-grid'].logging.disableLogging();  // First disable all
 *   window.components['web-grid'].logging.setCategoryLevel('GRID:UI', 'debug');
 *   window.components['web-grid'].logging.setCategoryLevel('GRID:DATA', 'info');
 *   ```
 */

// Import vendored libraries via ES module wrappers
// @ts-ignore - Vendored library without type definitions
import log from './vendor/loglevel/index.js'
// @ts-ignore - Vendored library without type definitions
import prefix from './vendor/loglevel/prefix.js'

// Define color scheme matching original logger
const COLORS = {
	debug: '#0ea5e9',  // Blue
	info: '#10b981',   // Green
	warn: '#f59e0b',   // Orange
	error: '#ef4444'   // Red
}

// Register prefix plugin with the root logger
prefix.reg(log)

// Configure prefix plugin with color-coded formatting
prefix.apply(log, {
	format(level: string, name: string | undefined, timestamp: string) {
		// Get color for the current log level
		const color = COLORS[level.toLowerCase() as keyof typeof COLORS] || '#666'

		// Return formatted prefix with color styling
		return `%c[${timestamp}]%c %c[${level}]%c ${name ? `%c[${name}]%c ` : ''}`
	},
	timestampFormatter(date: Date) {
		// Format: HH:MM:SS.mmm
		return date.toTimeString().split(' ')[0] + '.' + date.getMilliseconds().toString().padStart(3, '0')
	}
})

// Apply color styling to console output using a custom method factory
const originalFactory = log.methodFactory
log.methodFactory = function(methodName: string, logLevel: number, loggerName: string) {
	const rawMethod = originalFactory(methodName, logLevel, loggerName)

	return function(...args: any[]) {
		// If first arg contains %c color codes, inject the colors
		if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('%c')) {
			const color = COLORS[methodName as keyof typeof COLORS] || '#666'
			const coloredArgs = [
				args[0],
				`color: ${color}; font-weight: bold;`,  // timestamp color
				'color: inherit;',                        // reset
				`color: ${color}; font-weight: bold;`,  // level color
				'color: inherit;',                        // reset
				...(loggerName ? [
					`color: ${color}; font-weight: bold;`,  // name color
					'color: inherit;',                        // reset
				] : []),
				...args.slice(1)
			]
			rawMethod(...coloredArgs)
		} else {
			rawMethod(...args)
		}
	}
}

// Set default log level to silent (production mode)
log.setLevel('silent')

// Create category-specific loggers with hierarchical naming
export const initLogger = log.getLogger('GRID:INIT')
export const dataLogger = log.getLogger('GRID:DATA')
export const uiLogger = log.getLogger('GRID:UI')
export const interactionLogger = log.getLogger('GRID:INTERACTION')

// Export the default logger
export default log

/**
 * List of all logging categories for introspection
 */
export const LOGGING_CATEGORIES = [
	'GRID:INIT',
	'GRID:DATA',
	'GRID:UI',
	'GRID:INTERACTION'
]

/**
 * Enable all logging (set to debug level)
 */
export function enableLogging() {
	log.setLevel('debug')
}

/**
 * Disable all logging (set to silent level)
 */
export function disableLogging() {
	log.setLevel('silent')
}

/**
 * Set log level for all loggers
 * @param level Log level to set ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export function setLogLevel(level: string) {
	log.setLevel(level)
}

/**
 * Set log level for a specific category
 * @param category Category logger to configure (e.g., 'GRID:UI')
 * @param level Log level to set ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent')
 */
export function setCategoryLevel(category: string, level: string) {
	log.getLogger(category).setLevel(level)
}
