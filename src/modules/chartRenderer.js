/**
 * Chart rendering module
 */

import { CONFIG } from '../config.js';
import { AppState } from '../state.js';
import { throttle, EventManager, Logger } from '../utils/index.js';
import { ErrorHandler } from './errorHandler.js';
import { TangentManager } from './tangentManager.js';
import { ClickFeedback } from './clickFeedback.js';

export const ChartRenderer = {
  /**
   * Destroys all existing charts
   */
  destroyCharts() {
    if (AppState.charts.main) {
      AppState.charts.main.destroy();
      AppState.charts.main = null;
    }
    if (AppState.charts.derivative) {
      AppState.charts.derivative.destroy();
      AppState.charts.derivative = null;
    }
  },

  /**
   * Clears a canvas
   * @param {string} canvasId - Canvas element ID
   */
  clearCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas instanceof HTMLCanvasElement) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  },

  /**
   * Creates base chart options
   * @param {Object} overrides - Option overrides
   * @returns {Object} Chart options
   */
  createBaseOptions(overrides = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      parsing: false,
      hover: { mode: null },
      interaction: { mode: null, intersect: false },
      elements: {
        point: { radius: 0, hoverRadius: 0, hitRadius: 0 },
        line: { tension: 0, borderWidth: 1.5 }
      },
      plugins: {
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          samples: CONFIG.DECIMATION.SAMPLES,
          threshold: CONFIG.DECIMATION.THRESHOLD
        }
      },
      ...overrides
    };
  },

  /**
   * Renders the main DTA chart
   * @param {Array} data - Chart data points
   * @param {Object} Chart - Chart.js constructor
   */
  renderMainChart(data, Chart) {
    const canvas = document.getElementById('mainChart');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const placeholder = AppState.elements.mainChartPlaceholder;
    if (placeholder) {
      placeholder.hidden = true;
    }

    AppState.data.main = data;
    const renderer = this;

    // Get theme-aware color
    const chartColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-chart-main').trim();

    AppState.charts.main = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'DTA Signal',
          data: data,
          borderColor: chartColor,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false
        }]
      },
      options: this.createBaseOptions({
        plugins: {
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'ctrl',
              onPanComplete() {
                renderer.syncZoom();
              }
            },
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: true },
              drag: {
                enabled: true,
                backgroundColor: getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-zoom-bg').trim(),
                borderColor: getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-zoom-border').trim(),
                borderWidth: 1,
                threshold: 5
              },
              mode: 'xy',
              onZoomComplete() {
                renderer.syncZoom();
              }
            }
          }
        },
        scales: {
          x: { type: 'linear', display: true, title: { display: false } },
          y: { display: true, title: { display: false } }
        }
      })
    });

    canvas.setAttribute('aria-label', `График термограммы DTA. ${data.length} точек.`);
    this.setupCoordinatesTracking(canvas);
  },

  /**
   * Renders the derivative chart
   * @param {Array} data - Derivative data points
   * @param {Object} Chart - Chart.js constructor
   */
  renderDerivativeChart(data, Chart) {
    const canvas = document.getElementById('derivativeChart');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const placeholder = AppState.elements.derivativePlaceholder;
    if (placeholder) {
      placeholder.hidden = true;
    }

    const hint = AppState.elements.tangentHint;
    if (hint) {
      hint.hidden = false;
    }

    AppState.data.derivative = data;

    // Get theme-aware color
    const derivativeColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-chart-derivative').trim();

    AppState.charts.derivative = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'dDTA/dt',
          data: data,
          borderColor: derivativeColor,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        }]
      },
      options: this.createBaseOptions({
        plugins: {
          zoom: {
            pan: { enabled: false },
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: false },
              drag: { enabled: false }
            }
          }
        },
        scales: {
          x: { type: 'linear', display: true, title: { display: false } },
          y: { display: true, title: { display: false } }
        }
      })
    });

    canvas.setAttribute('aria-label', `График производной DTA. ${data.length} точек.`);
    canvas.classList.add('is-enabled');
    
    this.setupDerivativeClickHandler(canvas);
  },

  /**
   * Sets up coordinates tracking on mouse move
   * @param {HTMLCanvasElement} canvas - Target canvas
   */
  setupCoordinatesTracking(canvas) {
    const throttledHandler = throttle((event) => {
      if (!AppState.charts.main) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const temp = AppState.charts.main.scales.x.getValueForPixel(x);
      const signal = AppState.charts.main.scales.y.getValueForPixel(y);

      // Dynamic import to avoid circular dependency
      import('./uiController.js').then(({ UIController }) => {
        UIController.updateCoordinates(temp, signal);
      });
    }, CONFIG.THROTTLE_DELAY);

    const leaveHandler = () => {
      import('./uiController.js').then(({ UIController }) => {
        UIController.updateCoordinates(null, null);
      });
    };

    EventManager.add(canvas, 'mousemove', throttledHandler);
    EventManager.add(canvas, 'mouseleave', leaveHandler);
  },

  /**
   * Sets up click handler for derivative chart
   * @param {HTMLCanvasElement} canvas - Target canvas
   */
  setupDerivativeClickHandler(canvas) {
    const clickHandler = (event) => {
      if (!AppState.charts.derivative || !AppState.charts.main) return;
      if (!AppState.data.derivative || !AppState.data.main) return;
      if (AppState.isDemoRunning) return;

      const rect = canvas.getBoundingClientRect();
      const clickPixelX = event.clientX - rect.left;
      const clickPixelY = event.clientY - rect.top;

      let nearestPoint = null;
      let minPixelDistance = Infinity;

      for (const point of AppState.data.derivative) {
        const pointPixelX = AppState.charts.derivative.scales.x.getPixelForValue(point.x);
        const pixelDistance = Math.abs(pointPixelX - clickPixelX);

        if (pixelDistance < minPixelDistance) {
          minPixelDistance = pixelDistance;
          nearestPoint = point;
        }
      }

      if (!nearestPoint || minPixelDistance > CONFIG.TOLERANCE_PIXELS) {
        Logger.action('Клик вне допустимой области', {
          pixelX: clickPixelX,
          pixelY: clickPixelY,
          minDistance: minPixelDistance,
          tolerance: CONFIG.TOLERANCE_PIXELS
        });
        return;
      }

      if (!nearestPoint.tempGradient || nearestPoint.tempGradient === 0) {
        Logger.error('Невозможно построить касательную: tempGradient = 0');
        ErrorHandler.warn('Невозможно построить касательную в этой точке');
        return;
      }

      const slope = nearestPoint.y / nearestPoint.tempGradient;

      // Логирование клика по графику производной
      Logger.derivativeClick({
        pixelX: clickPixelX.toFixed(1),
        pixelY: clickPixelY.toFixed(1),
        temperature: nearestPoint.x.toFixed(2),
        derivativeValue: nearestPoint.y.toFixed(6),
        tempGradient: nearestPoint.tempGradient.toFixed(6),
        calculatedSlope: slope.toFixed(6)
      });

      ClickFeedback.showAtPoint(clickPixelX, clickPixelY, 'derivativeChart');

      const mainPoint = AppState.data.main.reduce((prev, curr) =>
        Math.abs(curr.x - nearestPoint.x) < Math.abs(prev.x - nearestPoint.x) ? curr : prev
      );

      ClickFeedback.showClickPointInfo(mainPoint.x, mainPoint.y);
      TangentManager.drawTangent(slope, mainPoint.x, mainPoint.y);
    };

    EventManager.add(canvas, 'click', clickHandler);
  },

  /**
   * Synchronizes zoom between charts
   */
  syncZoom() {
    if (!AppState.charts.main || !AppState.charts.derivative) return;

    const mainXScale = AppState.charts.main.scales.x;
    const xMin = mainXScale.min;
    const xMax = mainXScale.max;

    this.calculateMainChartYScale(xMin, xMax);
    AppState.charts.main.update('none');

    AppState.charts.derivative.options.scales.x.min = xMin;
    AppState.charts.derivative.options.scales.x.max = xMax;

    this.calculateDerivativeYScale(xMin, xMax);
    AppState.charts.derivative.update('none');
  },

  /**
   * Calculates Y scale for main chart
   * @param {number} xMin - Minimum X value
   * @param {number} xMax - Maximum X value
   */
  calculateMainChartYScale(xMin, xMax) {
    if (!AppState.charts.main || !AppState.data.main) return;

    let minY = Infinity;
    let maxY = -Infinity;
    let hasVisiblePoints = false;

    for (const point of AppState.data.main) {
      if (point.x >= xMin && point.x <= xMax) {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
        hasVisiblePoints = true;
      }
    }

    if (hasVisiblePoints && maxY > minY) {
      const padding = (maxY - minY) * CONFIG.CHART_PADDING_PERCENT;
      AppState.charts.main.options.scales.y.min = minY - padding;
      AppState.charts.main.options.scales.y.max = maxY + padding;
    }
  },

  /**
   * Calculates Y scale for derivative chart
   * @param {number} xMin - Minimum X value
   * @param {number} xMax - Maximum X value
   */
  calculateDerivativeYScale(xMin, xMax) {
    if (!AppState.charts.derivative || !AppState.data.derivative) return;

    let minY = Infinity;
    let maxY = -Infinity;
    let hasVisiblePoints = false;

    for (const point of AppState.data.derivative) {
      if (point.x >= xMin && point.x <= xMax) {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
        hasVisiblePoints = true;
      }
    }

    if (hasVisiblePoints && minY !== maxY) {
      const padding = (maxY - minY) * CONFIG.CHART_PADDING_PERCENT;
      AppState.charts.derivative.options.scales.y.min = minY - padding;
      AppState.charts.derivative.options.scales.y.max = maxY + padding;
    }
  }
};
