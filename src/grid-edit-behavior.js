/**
 * GridEditBehavior - Controls how edit mode is entered
 *
 * @typedef {'click'|'dblclick'|'f2'|'enter'|'typing'} EditTrigger
 * @typedef {'start'|'end'|'selectAll'|number} CursorPosition
 */

export class GridEditBehavior {
  /**
   * Get the initial value for the editor
   * @param {EditTrigger} trigger - How edit mode was triggered
   * @param {Object} context - Context information
   * @param {any} context.originalValue - The original cell value
   * @param {string} [context.typedChar] - The character typed (for 'typing' trigger)
   * @returns {any} - The value to put in the editor
   */
  getInitialValue(trigger, context) {
    if (trigger === 'typing') {
      return context.typedChar // Replace with typed character
    }
    return context.originalValue // Keep original
  }

  /**
   * Get cursor position for the editor
   * @param {EditTrigger} trigger - How edit mode was triggered
   * @param {Object} context - Context information
   * @param {number} [context.clickPosition] - Character position from mouse click
   * @param {number} context.textLength - Length of the text in the editor
   * @returns {CursorPosition} - Where to position the cursor
   */
  getCursorPosition(trigger, context) {
    switch (trigger) {
      case 'click':
      case 'dblclick':
        return context.clickPosition ?? 'end'
      case 'f2':
      case 'enter':
      case 'typing':
        return 'end'
      default:
        return 'selectAll'
    }
  }
}
