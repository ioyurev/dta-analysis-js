/**
 * Results panel module
 */

import { AppState } from '../state.js';
import { formatNumber, announceToScreenReader } from '../utils/index.js';
import { TangentManager } from './tangentManager.js';

export const ResultsPanel = {
  /**
   * Updates the results panel with current tangent data
   */
  update() {
    const panel = AppState.elements.resultsPanel;
    if (!panel) return;

    const t1 = AppState.tangents.data[0];
    const t2 = AppState.tangents.data[1];
    const hasAnyTangent = t1 || t2;

    panel.hidden = !hasAnyTangent;

    this.updateTangentResult(0, t1);
    this.updateTangentResult(1, t2);
    this.updateIntersection();
  },

  /**
   * Updates a single tangent result display
   * @param {number} index - Tangent index
   * @param {Object|null} tangentData - Tangent data
   */
  updateTangentResult(index, tangentData) {
    const resultEl = document.getElementById(`tangent${index + 1}Result`);
    if (!resultEl) return;

    if (!tangentData) {
      resultEl.hidden = true;
      return;
    }

    resultEl.hidden = false;

    const { slope, x0, y0 } = tangentData.params;
    
    const slopeEl = document.getElementById(`slope${index + 1}`);
    const pointXEl = document.getElementById(`point${index + 1}X`);
    const pointYEl = document.getElementById(`point${index + 1}Y`);

    if (slopeEl) slopeEl.textContent = formatNumber(slope, 6);
    if (pointXEl) pointXEl.textContent = formatNumber(x0, 2);
    if (pointYEl) pointYEl.textContent = formatNumber(y0, 4);
  },

  /**
   * Updates intersection result display
   */
  updateIntersection() {
    const resultEl = document.getElementById('intersectionResult');
    const intersectionXEl = document.getElementById('intersectionX');
    if (!resultEl || !intersectionXEl) return;

    const intersection = TangentManager.calculateIntersection();

    if (!intersection) {
      resultEl.hidden = true;
      return;
    }

    resultEl.hidden = false;
    intersectionXEl.textContent = formatNumber(intersection.x, 1);
    
    announceToScreenReader(
      `Температура фазового перехода: ${formatNumber(intersection.x, 1)} градусов Цельсия`
    );
  }
};