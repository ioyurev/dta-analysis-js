/**
 * Tangent line management module
 */

import { CONFIG } from '../config.js';
import { AppState } from '../state.js';
import { formatNumber, announceToScreenReader, Logger } from '../utils/index.js';
import { HintSystem } from './hintSystem.js';
import { ResultsPanel } from './resultsPanel.js';
import { ClickFeedback } from './clickFeedback.js';

export const TangentManager = {
  /**
   * Draws a tangent line on the main chart
   * @param {number} slope - Tangent slope
   * @param {number} x0 - X coordinate of tangent point
   * @param {number} y0 - Y coordinate of tangent point
   */
  drawTangent(slope, x0, y0) {
    if (!AppState.charts.main || !AppState.data.main) return;
    if (AppState.data.main.length < 2) return;

    const chart = AppState.charts.main;
    const index = AppState.tangents.activeIndex;

    // Логирование построения касательной
    Logger.tangentConstruction(index, { slope, x0, y0 });

    // Store current bounds
    const currentBounds = {
      xMin: chart.scales.x.min,
      xMax: chart.scales.x.max,
      yMin: chart.scales.y.min,
      yMax: chart.scales.y.max
    };

    // Вычисляем точки касательной, ограниченные видимой областью
    const lineData = this._calculateClippedTangentPoints(
      slope, x0, y0, 
      currentBounds
    );

    // Style configuration - get theme-aware colors
    const tangentColors = [
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-tangent-1').trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-tangent-2').trim()
    ];
    
    const styles = [
      { color: tangentColors[0], label: CONFIG.TANGENT_NAMES[0] },
      { color: tangentColors[1], label: CONFIG.TANGENT_NAMES[1] }
    ];
    const style = styles[index];

    const tangentDataset = {
      label: style.label,
      data: lineData,
      borderColor: style.color,
      backgroundColor: style.color,
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      _isTangent: true,
      _tangentIndex: index,
      _tangentParams: { slope, x0, y0 }
    };

    // Remove existing tangent with same index
    chart.data.datasets = chart.data.datasets.filter(
      ds => ds._tangentIndex !== index
    );

    chart.data.datasets.push(tangentDataset);

    // Restore bounds (не даём касательной изменить масштаб)
    chart.options.scales.x.min = currentBounds.xMin;
    chart.options.scales.x.max = currentBounds.xMax;
    chart.options.scales.y.min = currentBounds.yMin;
    chart.options.scales.y.max = currentBounds.yMax;

    chart.update('none');

    // Store tangent data
    AppState.tangents.data[index] = {
      params: { slope, x0, y0 },
      dataset: tangentDataset
    };

    // Update UI
    this._notifyUIUpdate();

    // Проверяем пересечение после построения обеих касательных
    this._checkAndLogIntersection();

    announceToScreenReader(
      `${style.label} построена в точке T=${formatNumber(x0, 1)}°C`
    );
  },

  /**
   * Calculates tangent line points clipped to visible chart area
   * @private
   * @param {number} slope - Line slope
   * @param {number} x0 - Point X
   * @param {number} y0 - Point Y
   * @param {Object} bounds - Chart bounds {xMin, xMax, yMin, yMax}
   * @returns {Array} Array of {x, y} points
   */
  _calculateClippedTangentPoints(slope, x0, y0, bounds) {
    const { xMin, xMax, yMin, yMax } = bounds;
    
    // Добавляем небольшой запас за пределы видимой области
    const padding = (xMax - xMin) * CONFIG.TANGENT_SPAN_PERCENT;
    const extendedXMin = xMin - padding;
    const extendedXMax = xMax + padding;
    
    // Функция линии: y = slope * (x - x0) + y0
    const getY = (x) => slope * (x - x0) + y0;
    const getX = (y) => (y - y0) / slope + x0;
    
    // Собираем все точки пересечения с границами
    const intersections = [];
    
    // Пересечение с левой границей (x = extendedXMin)
    const yAtLeft = getY(extendedXMin);
    if (yAtLeft >= yMin && yAtLeft <= yMax) {
      intersections.push({ x: extendedXMin, y: yAtLeft });
    }
    
    // Пересечение с правой границей (x = extendedXMax)
    const yAtRight = getY(extendedXMax);
    if (yAtRight >= yMin && yAtRight <= yMax) {
      intersections.push({ x: extendedXMax, y: yAtRight });
    }
    
    // Пересечение с верхней границей (y = yMax)
    if (Math.abs(slope) > 1e-10) {
      const xAtTop = getX(yMax);
      if (xAtTop >= extendedXMin && xAtTop <= extendedXMax) {
        intersections.push({ x: xAtTop, y: yMax });
      }
    }
    
    // Пересечение с нижней границей (y = yMin)
    if (Math.abs(slope) > 1e-10) {
      const xAtBottom = getX(yMin);
      if (xAtBottom >= extendedXMin && xAtBottom <= extendedXMax) {
        intersections.push({ x: xAtBottom, y: yMin });
      }
    }
    
    // Если линия почти горизонтальная
    if (Math.abs(slope) < 1e-10) {
      return [
        { x: extendedXMin, y: y0 },
        { x: extendedXMax, y: y0 }
      ];
    }
    
    // Удаляем дубликаты и сортируем по X
    const uniquePoints = intersections.reduce((acc, point) => {
      const exists = acc.some(p => 
        Math.abs(p.x - point.x) < 1e-6 && Math.abs(p.y - point.y) < 1e-6
      );
      if (!exists) acc.push(point);
      return acc;
    }, []);
    
    uniquePoints.sort((a, b) => a.x - b.x);
    
    // Нужны минимум 2 точки для линии
    if (uniquePoints.length >= 2) {
      // Возвращаем первую и последнюю точку
      return [uniquePoints[0], uniquePoints[uniquePoints.length - 1]];
    }
    
    // Fallback: используем стандартный способ с ограничением
    Logger.info('Fallback: касательная полностью за пределами видимой области');
    
    let startX = extendedXMin;
    let endX = extendedXMax;
    let startY = getY(startX);
    let endY = getY(endX);
    
    // Ограничиваем по Y
    if (startY < yMin) {
      startY = yMin;
      startX = getX(yMin);
    } else if (startY > yMax) {
      startY = yMax;
      startX = getX(yMax);
    }
    
    if (endY < yMin) {
      endY = yMin;
      endX = getX(yMin);
    } else if (endY > yMax) {
      endY = yMax;
      endX = getX(yMax);
    }
    
    return [
      { x: startX, y: startY },
      { x: endX, y: endY }
    ];
  },

  /**
   * Removes a tangent by index
   * @param {number} index - Tangent index (0 or 1)
   */
  removeTangent(index) {
    if (!AppState.charts.main) return;

    Logger.action(`Удаление касательной ${index + 1}`);

    AppState.charts.main.data.datasets = AppState.charts.main.data.datasets.filter(
      ds => ds._tangentIndex !== index
    );
    AppState.charts.main.update('none');

    AppState.tangents.data[index] = null;
    
    this._notifyUIUpdate();
    ClickFeedback.hideClickPointInfo();
  },

  /**
   * Removes all tangents
   */
  removeAllTangents() {
    if (!AppState.charts.main) return;

    Logger.action('Удаление всех касательных');

    AppState.charts.main.data.datasets = AppState.charts.main.data.datasets.filter(
      ds => !ds._isTangent
    );
    AppState.charts.main.update('none');

    AppState.tangents.data = [null, null];
    
    HintSystem.reset();
    this._notifyUIUpdate();
    ClickFeedback.hideClickPointInfo();
    
    announceToScreenReader('Все касательные удалены');
  },

  /**
   * Calculates intersection point of two tangents
   * @returns {{ x: number, y: number } | null}
   */
  calculateIntersection() {
    const t1 = AppState.tangents.data[0];
    const t2 = AppState.tangents.data[1];

    if (!t1 || !t2) return null;

    const { slope: m1, x0: x1, y0: y1 } = t1.params;
    const { slope: m2, x0: x2, y0: y2 } = t2.params;

    // Parallel lines check
    if (Math.abs(m1 - m2) < 1e-10) {
      Logger.info('Касательные параллельны, пересечение невозможно');
      return null;
    }

    const x = (m1 * x1 - m2 * x2 + y2 - y1) / (m1 - m2);
    const y = m1 * (x - x1) + y1;

    return { x, y };
  },

  /**
   * Check and log intersection when both tangents are drawn
   * @private
   */
  _checkAndLogIntersection() {
    const t1 = AppState.tangents.data[0];
    const t2 = AppState.tangents.data[1];

    if (t1 && t2) {
      const intersection = this.calculateIntersection();
      if (intersection) {
        Logger.intersection(intersection, t1.params, t2.params);
      }
    }
  },

  /**
   * Notify UI components of tangent changes
   * @private
   */
  _notifyUIUpdate() {
    import('./uiController.js').then(({ UIController }) => {
      UIController.updateTangentStatus();
      UIController.updateClearButton();
    });
    
    ResultsPanel.update();
    HintSystem.updateBasedOnState();
  }
};
