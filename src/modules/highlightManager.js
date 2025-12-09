/**
 * Chart area highlight module
 */

import { AppState } from '../state.js';
import { delay } from '../utils/index.js';

export const HighlightManager = {
  /**
   * Highlights a temperature range on derivative chart
   * @param {number} tempMin - Minimum temperature
   * @param {number} tempMax - Maximum temperature
   */
  async highlightTemperatureRange(tempMin, tempMax) {
    const overlay = AppState.elements.highlightOverlay;
    const chart = AppState.charts.derivative;
    
    if (!overlay || !chart) return;
    
    const chartArea = chart.chartArea;
    const pixelMin = chart.scales.x.getPixelForValue(tempMin) - chartArea.left;
    const pixelMax = chart.scales.x.getPixelForValue(tempMax) - chartArea.left;
    
    overlay.style.left = `${Math.max(0, pixelMin) + chartArea.left}px`;
    overlay.style.width = `${Math.abs(pixelMax - pixelMin)}px`;
    overlay.hidden = false;
    overlay.classList.add('highlight-overlay--pulse');
    
    await delay(100);
  },

  /**
   * Hides the highlight overlay
   */
  hide() {
    const overlay = AppState.elements.highlightOverlay;
    if (overlay) {
      overlay.hidden = true;
      overlay.classList.remove('highlight-overlay--pulse');
    }
  }
};