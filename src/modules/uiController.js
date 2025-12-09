/**
 * UI Controller module
 */

import { CONFIG } from '../config.js';
import { AppState } from '../state.js';
import { formatNumber, announceToScreenReader, Logger } from '../utils/index.js';
import { ErrorHandler } from './errorHandler.js';
import { ModalController } from './modalController.js';
import { TangentManager } from './tangentManager.js';
import { DemoMode } from './demoMode.js';
import { HintSystem } from './hintSystem.js';
import { FileHandler } from './fileHandler.js';
import { SampleLoader } from './sampleLoader.js';
import { ThemeManager } from './themeManager.js';

export const UIController = {
  /**
   * Initializes all UI element references
   */
  initializeElements() {
    const ids = [
      'csvInput', 'sampleSelect', 'resetZoomBtn', 'clearTangentsBtn',
      'errorMessage', 'errorText', 'mainChartPlaceholder', 'derivativePlaceholder',
      'coordinatesDisplay', 'tangent1Btn', 'tangent2Btn', 'tangentHint',
      'helpBtn', 'helpModal', 'loadingIndicator', 'fileName', 'resultsPanel',
      'a11yStatus', 'demoBtn', 'demoOverlay', 'stopDemoBtn', 'demoStepNumber',
      'demoStepText', 'hintPanel', 'hintText', 'nextHintBtn', 'highlightOverlay',
      'clickPointInfo', 'clickPointValue', 'themeToggle'
    ];

    ids.forEach(id => {
      AppState.elements[id] = document.getElementById(id);
    });

    AppState.elements.modalCloseButtons = document.querySelectorAll('[data-close-modal]');
    AppState.elements.errorDismissBtn = document.querySelector('[data-dismiss-error]');
  },

  /**
   * Sets up all event listeners
   */
  initializeEventListeners() {
    // Sample selection
    if (AppState.elements.sampleSelect) {
      AppState.elements.sampleSelect.addEventListener('change', SampleLoader.handleSelect);
    }

    // File upload
    if (AppState.elements.csvInput) {
      AppState.elements.csvInput.addEventListener('change', FileHandler.handleUpload);
    }

    // Control buttons
    if (AppState.elements.resetZoomBtn) {
      AppState.elements.resetZoomBtn.addEventListener('click', this.handleResetZoom);
    }

    if (AppState.elements.clearTangentsBtn) {
      AppState.elements.clearTangentsBtn.addEventListener('click', () => {
        TangentManager.removeAllTangents();
      });
    }

    // Tangent buttons
    if (AppState.elements.tangent1Btn) {
      AppState.elements.tangent1Btn.addEventListener('click', () => this.switchTangent(0));
    }
    if (AppState.elements.tangent2Btn) {
      AppState.elements.tangent2Btn.addEventListener('click', () => this.switchTangent(1));
    }

    // Demo mode
    if (AppState.elements.demoBtn) {
      AppState.elements.demoBtn.addEventListener('click', () => DemoMode.start());
    }
    if (AppState.elements.stopDemoBtn) {
      AppState.elements.stopDemoBtn.addEventListener('click', () => DemoMode.stop());
    }

    // Hints
    if (AppState.elements.nextHintBtn) {
      AppState.elements.nextHintBtn.addEventListener('click', () => HintSystem.nextHint());
    }

    // Modal
    if (AppState.elements.helpBtn && AppState.elements.helpModal) {
      AppState.elements.helpBtn.addEventListener('click', ModalController.show);
    }

    AppState.elements.modalCloseButtons?.forEach(btn => {
      btn.addEventListener('click', ModalController.hide);
    });

    // Error dismiss
    if (AppState.elements.errorDismissBtn) {
      AppState.elements.errorDismissBtn.addEventListener('click', ErrorHandler.hide);
    }

    // Drag & drop
    const placeholder = AppState.elements.mainChartPlaceholder;
    if (placeholder) {
      placeholder.addEventListener('dragover', FileHandler.handleDragOver);
      placeholder.addEventListener('dragleave', FileHandler.handleDragLeave);
      placeholder.addEventListener('drop', FileHandler.handleDrop);
    }

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Theme toggle
    if (AppState.elements.themeToggle) {
      AppState.elements.themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
      });
    }
  },

  /**
   * Handles keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboard(event) {
    if (event.key === 'Escape') {
      const modal = AppState.elements.helpModal;
      if (modal && modal.open) {
        ModalController.hide();
      }
      if (AppState.isDemoRunning) {
        DemoMode.stop();
      }
    }

    // Tangent shortcuts
    if (AppState.isDataLoaded && !event.ctrlKey && !event.altKey) {
      if (event.key === '1') {
        this.switchTangent(0);
      } else if (event.key === '2') {
        this.switchTangent(1);
      }
    }
  },

  /**
   * Switches active tangent
   * @param {number} index - Tangent index (0 or 1)
   */
  switchTangent(index) {
    Logger.action(`Переключение на касательную ${index + 1}`);
    
    AppState.tangents.activeIndex = index;

    const btn1 = AppState.elements.tangent1Btn;
    const btn2 = AppState.elements.tangent2Btn;

    if (btn1 && btn2) {
      btn1.classList.toggle('is-active', index === 0);
      btn2.classList.toggle('is-active', index === 1);
      btn1.setAttribute('aria-checked', String(index === 0));
      btn2.setAttribute('aria-checked', String(index === 1));
    }

    this.updateTangentStatus();
    announceToScreenReader(`Выбрана ${CONFIG.TANGENT_NAMES[index]}`);
  },

  /**
   * Updates tangent button status indicators
   */
  updateTangentStatus() {
    [0, 1].forEach(index => {
      const btn = AppState.elements[`tangent${index + 1}Btn`];
      if (!btn) return;

      const isDrawn = AppState.tangents.data[index] !== null;
      const statusEl = btn.querySelector('.tangent-btn__status');

      btn.classList.toggle('is-drawn', isDrawn);
      
      if (statusEl) {
        statusEl.textContent = isDrawn ? 'построена' : 'не построена';
      }
    });
  },

  /**
   * Updates clear button state
   */
  updateClearButton() {
    const btn = AppState.elements.clearTangentsBtn;
    if (btn) {
      const hasAnyTangent = AppState.tangents.data.some(t => t !== null);
      btn.disabled = !hasAnyTangent;
    }
  },

  /**
   * Updates coordinates display
   * @param {number|null} temp - Temperature value
   * @param {number|null} signal - DTA signal value
   */
  updateCoordinates(temp, signal) {
    const display = AppState.elements.coordinatesDisplay;
    if (!display) return;

    if (temp === null || signal === null) {
      if (AppState.isDataLoaded) {
        display.textContent = 'Наведите курсор на график';
      } else {
        display.textContent = 'Выберите пример или загрузите данные';
      }
      return;
    }

    const activeTangent = CONFIG.TANGENT_NAMES[AppState.tangents.activeIndex];
    display.textContent = `T: ${formatNumber(temp, 2)}°C`;
  },

  /**
   * Updates file name display
   * @param {string} name - File name
   */
  updateFileName(name) {
    const el = AppState.elements.fileName;
    if (el) {
      el.textContent = name;
      el.title = name;
    }

    // Кнопка "Демо" доступна только для примеров
    const demoBtn = AppState.elements.demoBtn;
    if (demoBtn) {
      demoBtn.disabled = !AppState.currentSample;
    }
  },

  /**
   * Enables controls after data is loaded
   */
  enableControls() {
    const elements = [
      AppState.elements.tangent1Btn,
      AppState.elements.tangent2Btn,
      AppState.elements.resetZoomBtn
      // AppState.elements.demoBtn - убираем из общего списка
    ];

    elements.forEach(el => {
      if (el) {
        el.disabled = false;
      }
    });

    // Кнопка "Демо" доступна только для примеров
    const demoBtn = AppState.elements.demoBtn;
    if (demoBtn) {
      demoBtn.disabled = !AppState.currentSample;
    }
  },

  /**
   * Handles reset zoom button click
   */
  handleResetZoom() {
    Logger.action('Сброс масштаба графиков');
    
    const mainChart = AppState.charts.main;
    const derivChart = AppState.charts.derivative;

    if (mainChart) {
      const tangentDatasets = mainChart.data.datasets.filter(ds => ds._isTangent);
      mainChart.data.datasets = mainChart.data.datasets.filter(ds => !ds._isTangent);
      mainChart.resetZoom();
      delete mainChart.options.scales.y.min;
      delete mainChart.options.scales.y.max;
      mainChart.data.datasets.push(...tangentDatasets);
      mainChart.update('none');
    }

    if (derivChart) {
      derivChart.resetZoom();
      delete derivChart.options.scales.y.min;
      delete derivChart.options.scales.y.max;
      derivChart.update('none');
    }

    announceToScreenReader('Масштаб сброшен');
  },

  /**
   * Resets UI to initial state
   */
  reset() {
    // Show placeholders
    if (AppState.elements.mainChartPlaceholder) {
      AppState.elements.mainChartPlaceholder.hidden = false;
    }
    if (AppState.elements.derivativePlaceholder) {
      AppState.elements.derivativePlaceholder.hidden = false;
    }

    // Hide hint
    if (AppState.elements.tangentHint) {
      AppState.elements.tangentHint.hidden = true;
    }

    // Disable buttons
    const elementsToDisable = [
      AppState.elements.resetZoomBtn,
      AppState.elements.clearTangentsBtn,
      AppState.elements.tangent1Btn,
      AppState.elements.tangent2Btn,
      AppState.elements.demoBtn
    ];

    elementsToDisable.forEach(el => {
      if (el) {
        el.disabled = true;
      }
    });

    // Reset tangent selection
    this.switchTangent(0);
    this.updateTangentStatus();
    this.updateClearButton();

    // Hide results and hints
    if (AppState.elements.resultsPanel) {
      AppState.elements.resultsPanel.hidden = true;
    }
    
    HintSystem.hide();

    // Clear displays
    this.updateFileName('');
    this.updateCoordinates(null, null);
    
    // Hide click point info
    import('./clickFeedback.js').then(({ ClickFeedback }) => {
      ClickFeedback.hideClickPointInfo();
    });
  }
};
