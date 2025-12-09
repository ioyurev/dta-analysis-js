/**
 * Sample data loader module
 */

import { CONFIG } from '../config.js';
import { AppState, resetState } from '../state.js';
import { ErrorHandler } from './errorHandler.js';
import { LoadingState } from './loadingState.js';
import { ChartRenderer } from './chartRenderer.js';
import { DataProcessor } from './dataProcessor.js';
import { Logger } from '../utils/index.js';

// Chart.js will be passed from main.js
let ChartConstructor = null;

export const SampleLoader = {
  /**
   * Sets the Chart.js constructor
   * @param {Object} Chart - Chart.js constructor
   */
  setChartConstructor(Chart) {
    ChartConstructor = Chart;
  },

  /**
   * Handles sample selection
   * @param {Event} event - Change event
   */
  handleSelect(event) {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;

    const sampleKey = select.value;
    if (!sampleKey) return;

    const sample = CONFIG.SAMPLES[sampleKey];
    if (!sample) {
      ErrorHandler.show('Пример не найден');
      return;
    }

    SampleLoader.loadSample(sampleKey, sample);
  },

  /**
   * Loads a sample dataset
   * @param {string} key - Sample key
   * @param {Object} sample - Sample configuration
   */
  async loadSample(key, sample) {
    Logger.file('Загрузка примера', {
      key,
      name: sample.name,
      expectedTemp: sample.expectedTemp
    });
    
    LoadingState.show(`Загрузка: ${sample.name}...`);
    ErrorHandler.hide();

    // Reset state
    resetState();
    ChartRenderer.destroyCharts();
    ChartRenderer.clearCanvas('mainChart');
    ChartRenderer.clearCanvas('derivativeChart');
    
    import('./uiController.js').then(({ UIController }) => {
      UIController.reset();
      UIController.updateFileName(sample.name);
    });

    AppState.currentSample = key;

    try {
      const response = await fetch(sample.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      // Parse CSV using unified parser
      DataProcessor.parseCSV(text, (error, results) => {
        if (error) {
          LoadingState.hide();
          ErrorHandler.show(`Ошибка чтения файла: ${error.message}`);
          return;
        }

        LoadingState.hide();

        if (results.errors.length > 0) {
          ErrorHandler.show(`Ошибка парсинга: ${results.errors[0].message}`);
          return;
        }

        if (!results.data || results.data.length < 3) {
          ErrorHandler.show('Пример содержит недостаточно данных');
          return;
        }

        DataProcessor.process(results.data, ChartConstructor);
      });
    } catch (error) {
      LoadingState.hide();
      ErrorHandler.show(`Ошибка загрузки примера: ${error.message}`);
    }
  }
};
