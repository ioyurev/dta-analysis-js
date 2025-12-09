/**
 * Hint system module for educational guidance
 */

import { CONFIG } from '../config.js';
import { AppState } from '../state.js';
import { announceToScreenReader } from '../utils/index.js';

export const HintSystem = {
  /**
   * Shows the hint panel
   */
  show() {
    const panel = AppState.elements.hintPanel;
    if (panel) {
      panel.hidden = false;
    }
    this.updateHintText();
  },

  /**
   * Hides the hint panel
   */
  hide() {
    const panel = AppState.elements.hintPanel;
    if (panel) {
      panel.hidden = true;
    }
  },

  /**
   * Resets hint index to beginning
   */
  reset() {
    AppState.currentHintIndex = 0;
    this.updateHintText();
  },

  /**
   * Shows the next hint
   */
  nextHint() {
    if (AppState.currentHintIndex < CONFIG.HINTS.length - 1) {
      AppState.currentHintIndex++;
    } else {
      AppState.currentHintIndex = 0;
    }
    
    this.updateHintText();
    announceToScreenReader(CONFIG.HINTS[AppState.currentHintIndex]);
  },

  /**
   * Updates hint text display
   */
  updateHintText() {
    const textEl = AppState.elements.hintText;
    if (textEl) {
      textEl.textContent = CONFIG.HINTS[AppState.currentHintIndex];
    }
  },

  /**
   * Updates hint based on current tangent state
   */
  updateBasedOnState() {
    const tangent1Drawn = AppState.tangents.data[0] !== null;
    const tangent2Drawn = AppState.tangents.data[1] !== null;
    const maxIndex = CONFIG.HINTS.length - 1;
    
    if (!tangent1Drawn && !tangent2Drawn) {
      AppState.currentHintIndex = 0;
    } else if (tangent1Drawn && !tangent2Drawn) {
      // После первой касательной - показываем подсказку про вторую
      AppState.currentHintIndex = Math.min(3, maxIndex);
    } else if (tangent1Drawn && tangent2Drawn) {
      // Обе построены - финальная подсказка
      AppState.currentHintIndex = maxIndex;
    }
    
    this.updateHintText();
  }
};
