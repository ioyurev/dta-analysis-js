/**
 * Error handling module
 */

import { AppState } from '../state.js';
import { announceToScreenReader } from '../utils/index.js';

export const ErrorHandler = {
  /**
   * Shows an error message
   * @param {string} message - Error message
   */
  show(message) {
    const container = AppState.elements.errorMessage;
    const text = AppState.elements.errorText;
    
    if (container && text) {
      text.textContent = message;
      container.hidden = false;
      announceToScreenReader(`Ошибка: ${message}`);
    }
    
    // eslint-disable-next-line no-console
    console.error('[DTA Trainer]', message);
  },

  /**
   * Hides the error message
   */
  hide() {
    const container = AppState.elements.errorMessage;
    if (container) {
      container.hidden = true;
    }
  },

  /**
   * Shows a warning (non-blocking)
   * @param {string} message - Warning message
   */
  warn(message) {
    // eslint-disable-next-line no-console
    console.warn('[DTA Trainer]', message);
  }
};