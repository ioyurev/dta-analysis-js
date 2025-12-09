/**
 * Modal dialog controller module
 */

import { AppState } from '../state.js';

export const ModalController = {
  /**
   * Shows the help modal
   */
  show() {
    const modal = AppState.elements.helpModal;
    if (modal && typeof modal.showModal === 'function') {
      modal.showModal();
      
      const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  },

  /**
   * Hides the help modal
   */
  hide() {
    const modal = AppState.elements.helpModal;
    if (modal && typeof modal.close === 'function') {
      modal.close();
      
      if (AppState.elements.helpBtn) {
        AppState.elements.helpBtn.focus();
      }
    }
  }
};