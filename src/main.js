/**
 * DTA Trainer - Main Entry Point
 * Учебный тренажёр для анализа данных дифференциального термического анализа
 */

// =============================================================================
// IMPORTS
// =============================================================================

import {
  Chart,
  LineController,
  LinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

import './styles/index.css';

// Modules
import { UIController } from './modules/uiController.js';
import { FileHandler } from './modules/fileHandler.js';
import { SampleLoader } from './modules/sampleLoader.js';
import { ThemeManager } from './modules/themeManager.js';

// =============================================================================
// CHART.JS SETUP
// =============================================================================

Chart.register(
  LineController,
  LinearScale,
  PointElement,
  LineElement,
  zoomPlugin
);

// Global defaults (только то, что существует)
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initializes the application
 */
function initializeApp() {
// Initialize theme first (before UI)
ThemeManager.init();

// Pass Chart constructor to modules that need it
FileHandler.setChartConstructor(Chart);
SampleLoader.setChartConstructor(Chart);

// Initialize mainChartPlaceholder handlers
FileHandler.initMainChartPlaceholder();

// Initialize UI
UIController.initializeElements();
UIController.initializeEventListeners();

  // eslint-disable-next-line no-console
  console.info('[DTA Trainer] Application initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// =============================================================================
// EXPORTS (for testing)
// =============================================================================

export { Chart };
