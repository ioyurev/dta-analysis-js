/**
 * Demo mode module for automated demonstration
 */

import { CONFIG } from '../config.js';
import { AppState } from '../state.js';
import { delay, Logger } from '../utils/index.js';
import { TangentManager } from './tangentManager.js';
import { HighlightManager } from './highlightManager.js';
import { ClickFeedback } from './clickFeedback.js';

export const DemoMode = {
  /**
   * Starts the demo
   */
  async start() {
    Logger.demo('Демо-режим запущен');
    
    if (AppState.isDemoRunning || !AppState.isDataLoaded) return;
    
    AppState.isDemoRunning = true;
    
    // Блокируем интерфейс
    this.blockUI();
    
    const overlay = AppState.elements.demoOverlay;
    if (overlay) {
      overlay.hidden = false;
    }
    
    TangentManager.removeAllTangents();
    
    try {
      await this.runSteps();
    } catch (error) {
      if (error.message !== 'Demo stopped') {
        // eslint-disable-next-line no-console
        console.warn('Demo interrupted:', error);
      }
    }
    
    this.stop();
  },

  /**
   * Stops the demo
   */
  stop() {
    Logger.demo('Демо-режим остановлен');
    
    AppState.isDemoRunning = false;
    
    // Разблокируем интерфейс
    this.unblockUI();
    
    const overlay = AppState.elements.demoOverlay;
    if (overlay) {
      overlay.hidden = true;
    }
    
    HighlightManager.hide();
  },

  /**
   * Runs demo steps
   */
  async runSteps() {
    const steps = [
      {
        number: 1,
        text: 'Анализируем график производной...',
        action: async () => {
          Logger.demo('Шаг 1: Анализ графика');
          await delay(CONFIG.DEMO.STEP_DELAY);
        }
      },
      {
        number: 1.5,
        text: 'Зум области 590-670°C',
        action: async () => {
          Logger.demo('Шаг 1.5: Фиксация зум-области');
          
          // Устанавливаем фиксированный зум
          if (AppState.charts.main && AppState.charts.derivative) {
            AppState.charts.main.options.scales.x.min = 590;
            AppState.charts.main.options.scales.x.max = 670;
            AppState.charts.derivative.options.scales.x.min = 590;
            AppState.charts.derivative.options.scales.x.max = 670;
            
            AppState.charts.main.update('none');
            AppState.charts.derivative.update('none');
          }
          
          await delay(CONFIG.DEMO.STEP_DELAY / 2);
        }
      },
      {
        number: 2,
        text: 'Находим область перед пиком, где производная постоянна',
        action: async () => {
          Logger.demo('Шаг 2: Поиск области перед пиком');
          const point = this.findFirstTangentPoint();
          if (point) {
            await HighlightManager.highlightTemperatureRange(
              point.x - 10, 
              point.x + 10
            );
            await delay(CONFIG.DEMO.HIGHLIGHT_DURATION);
          }
        }
      },
      {
        number: 3,
        text: 'Строим первую касательную',
        action: async () => {
          Logger.demo('Шаг 3: Построение первой касательной');
          const point = this.findFirstTangentPoint();
          if (point) {
            HighlightManager.hide();
            await delay(CONFIG.DEMO.CLICK_DELAY);
            await ClickFeedback.showAtPoint(point.pixelX, point.pixelY, 'derivativeChart');
            this.buildTangentAtPoint(point, 0);
          }
        }
      },
      {
        number: 4,
        text: 'Переключаемся на вторую касательную',
        action: async () => {
          Logger.demo('Шаг 4: Переключение на вторую касательную');
          await delay(CONFIG.DEMO.STEP_DELAY / 2);
          // Dynamic import to avoid circular dependency
          const { UIController } = await import('./uiController.js');
          UIController.switchTangent(1);
          await delay(CONFIG.DEMO.STEP_DELAY / 2);
        }
      },
      {
        number: 5,
        text: 'Находим область пика',
        action: async () => {
          Logger.demo('Шаг 5: Поиск области пика');
          const point = this.findSecondTangentPoint();
          if (point) {
            await HighlightManager.highlightTemperatureRange(
              point.x - 10, 
              point.x + 10
            );
            await delay(CONFIG.DEMO.HIGHLIGHT_DURATION);
          }
        }
      },
      {
        number: 6,
        text: 'Строим вторую касательную через точку минимума производной',
        action: async () => {
          Logger.demo('Шаг 6: Построение второй касательной');
          const point = this.findSecondTangentPoint();
          if (point) {
            HighlightManager.hide();
            await delay(CONFIG.DEMO.CLICK_DELAY);
            await ClickFeedback.showAtPoint(point.pixelX, point.pixelY, 'derivativeChart');
            this.buildTangentAtPoint(point, 1);
          }
        }
      },
      {
        number: 7,
        text: 'Готово! Смотрим результат',
        action: async () => {
          Logger.demo('Шаг 7: Завершение демонстрации');
          await delay(CONFIG.DEMO.STEP_DELAY);
        }
      }
    ];

    for (const step of steps) {
      if (!AppState.isDemoRunning) {
        throw new Error('Demo stopped');
      }
      
      this.updateStepDisplay(step.number, step.text);
      await step.action();
    }
  },

  /**
   * Updates step display
   * @param {number} number - Step number
   * @param {string} text - Step text
   */
  updateStepDisplay(number, text) {
    const numberEl = AppState.elements.demoStepNumber;
    const textEl = AppState.elements.demoStepText;
    
    if (numberEl) numberEl.textContent = number;
    if (textEl) textEl.textContent = text;
  },

  /**
   * Finds suitable point for first tangent (fixed at 610°C)
   * @returns {Object|null} Point data
   */
  findFirstTangentPoint() {
    if (!AppState.data.derivative || !AppState.charts.derivative) return null;
    
    const data = AppState.data.derivative;
    const chart = AppState.charts.derivative;
    
    // Ищем точку с температурой 610°C (или ближайшую к ней)
    let targetPoint = data[0];
    let minDiff = Infinity;
    
    for (const point of data) {
      const diff = Math.abs(point.x - 610);
      if (diff < minDiff) {
        minDiff = diff;
        targetPoint = point;
      }
    }
    
    if (!targetPoint) return null;
    
    return {
      ...targetPoint,
      index: data.indexOf(targetPoint),
      pixelX: chart.scales.x.getPixelForValue(targetPoint.x),
      pixelY: chart.scales.y.getPixelForValue(targetPoint.y)
    };
  },

  /**
   * Finds suitable point for second tangent (automatic from derivative in zoom area)
   * @returns {Object|null} Point data
   */
  findSecondTangentPoint() {
    if (!AppState.data.derivative || !AppState.charts.derivative) return null;
    
    const data = AppState.data.derivative;
    const chart = AppState.charts.derivative;
    
    // Ищем минимум производной в зум-области (590-670°C)
    const zoomData = data.filter(p => p.x >= 590 && p.x <= 670);
    
    if (zoomData.length === 0) return null;
    
    // Находим точку с минимальным значением производной
    let minPoint = zoomData[0];
    for (const point of zoomData) {
      if (point.y < minPoint.y) {
        minPoint = point;
      }
    }
    
    if (!minPoint) return null;
    
    return {
      ...minPoint,
      index: data.indexOf(minPoint),
      pixelX: chart.scales.x.getPixelForValue(minPoint.x),
      pixelY: chart.scales.y.getPixelForValue(minPoint.y)
    };
  },

  /**
   * Blocks all UI elements during demo
   */
  blockUI() {
    const elements = [
      AppState.elements.sampleSelect,
      AppState.elements.csvInput,
      AppState.elements.tangent1Btn,
      AppState.elements.tangent2Btn,
      AppState.elements.clearTangentsBtn,
      AppState.elements.resetZoomBtn,
      AppState.elements.helpBtn,
      AppState.elements.nextHintBtn,
      AppState.elements.themeToggle
    ];
    
    elements.forEach(el => {
      if (el) {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
      }
    });
    
    // Блокируем клики по графикам
    const canvases = [
      document.getElementById('mainChart'),
      document.getElementById('derivativeChart')
    ];
    
    canvases.forEach(canvas => {
      if (canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0.7';
      }
    });
  },

  /**
   * Unlocks all UI elements after demo
   */
  unblockUI() {
    const elements = [
      AppState.elements.sampleSelect,
      AppState.elements.csvInput,
      AppState.elements.tangent1Btn,
      AppState.elements.tangent2Btn,
      AppState.elements.clearTangentsBtn,
      AppState.elements.resetZoomBtn,
      AppState.elements.helpBtn,
      AppState.elements.nextHintBtn,
      AppState.elements.themeToggle
    ];
    
    elements.forEach(el => {
      if (el) {
        el.disabled = false;
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
    });
    
    const canvases = [
      document.getElementById('mainChart'),
      document.getElementById('derivativeChart')
    ];
    
    canvases.forEach(canvas => {
      if (canvas) {
        canvas.style.pointerEvents = '';
        canvas.style.opacity = '';
      }
    });
  },

  /**
   * Builds tangent at specified point
   * @param {Object} derivativePoint - Derivative point data
   * @param {number} tangentIndex - Tangent index
   */
  buildTangentAtPoint(derivativePoint, tangentIndex) {
    if (!derivativePoint.tempGradient || derivativePoint.tempGradient === 0) return;
    
    const slope = derivativePoint.y / derivativePoint.tempGradient;
    
    const mainPoint = AppState.data.main.reduce((prev, curr) =>
      Math.abs(curr.x - derivativePoint.x) < Math.abs(prev.x - derivativePoint.x) ? curr : prev
    );
    
    AppState.tangents.activeIndex = tangentIndex;
    TangentManager.drawTangent(slope, mainPoint.x, mainPoint.y);
  }
};
