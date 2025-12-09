/**
 * Click feedback visualization module
 */

import { AppState } from '../state.js';
import { delay, formatNumber } from '../utils/index.js';

export const ClickFeedback = {
  /**
   * Shows ripple effect at click point
   * @param {number} pixelX - X pixel coordinate
   * @param {number} pixelY - Y pixel coordinate
   * @param {string} canvasId - Canvas element ID
   */
  async showAtPoint(pixelX, pixelY, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    const feedback = document.createElement('div');
    feedback.className = 'click-feedback';
    feedback.style.left = `${pixelX}px`;
    feedback.style.top = `${pixelY}px`;
    
    // Get theme-aware color
    const clickColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-click-feedback').trim();
    
    feedback.style.borderColor = clickColor;
    feedback.style.setProperty('--feedback-color', clickColor);
    
    container.appendChild(feedback);
    
    await delay(600);
    feedback.remove();
  },

  /**
   * Shows click point information
   * @param {number} temp - Temperature value
   * @param {number} signal - DTA signal value
   */
  showClickPointInfo(temp, signal) {
    const infoEl = AppState.elements.clickPointInfo;
    const valueEl = AppState.elements.clickPointValue;
    
    if (infoEl && valueEl) {
      valueEl.textContent = `T = ${formatNumber(temp, 1)}°C, DTA = ${formatNumber(signal, 4)}`;
      infoEl.hidden = false;
    }
  },

  /**
   * Hides click point information
   */
  hideClickPointInfo() {
    const infoEl = AppState.elements.clickPointInfo;
    if (infoEl) {
      infoEl.hidden = true;
    }
  }
};
