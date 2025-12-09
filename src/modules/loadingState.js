/**
 * Loading indicator module
 */

import { AppState } from '../state.js';

export const LoadingState = {
  /**
   * Shows loading indicator
   * @param {string} [message='Обработка данных...'] - Loading message
   */
  show(message = 'Обработка данных...') {
    const indicator = AppState.elements.loadingIndicator;
    if (indicator) {
      const text = indicator.querySelector('.loading-text');
      if (text) {
        text.textContent = message;
      }
      indicator.hidden = false;
    }
  },

  /**
   * Hides loading indicator
   */
  hide() {
    const indicator = AppState.elements.loadingIndicator;
    if (indicator) {
      indicator.hidden = true;
    }
  }
};