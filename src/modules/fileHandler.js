/**
 * File handling module
 */

import { resetState } from '../state.js';
import { ErrorHandler } from './errorHandler.js';
import { LoadingState } from './loadingState.js';
import { ChartRenderer } from './chartRenderer.js';
import { DataProcessor } from './dataProcessor.js';
import { Logger } from '../utils/index.js';

// Chart.js will be passed from main.js
let ChartConstructor = null;

export const FileHandler = {
  /**
   * Sets the Chart.js constructor
   * @param {Object} Chart - Chart.js constructor
   */
  setChartConstructor(Chart) {
    ChartConstructor = Chart;
  },

  /**
   * Initializes drag & drop and click handlers for mainChartPlaceholder
   */
  initMainChartPlaceholder() {
    const placeholder = document.getElementById('mainChartPlaceholder');
    if (!placeholder) return;

    // Drag & drop handlers
    placeholder.addEventListener('dragover', this.handleDragOver);
    placeholder.addEventListener('dragleave', this.handleDragLeave);
    placeholder.addEventListener('drop', this.handleDrop);

    // Click handler (открывает файловый диалог)
    placeholder.addEventListener('click', () => {
      const input = document.getElementById('mainChartFileInput');
      if (input) {
        input.click();
      }
    });

    // Обработчик выбора файла
    const input = document.getElementById('mainChartFileInput');
    if (input) {
      input.addEventListener('change', (event) => {
        this.handleUpload(event);
      });
    }
  },

  /**
   * Handles file upload from input
   * @param {Event} event - Change event
   */
  handleUpload(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const file = input.files?.[0];
    if (!file) return;

    FileHandler.processFile(file);
    input.value = '';
  },

  /**
   * Handles dragover event
   * @param {DragEvent} event - Drag event
   */
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.classList.add('placeholder--dragover');
  },

  /**
   * Handles dragleave event
   * @param {DragEvent} event - Drag event
   */
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.classList.remove('placeholder--dragover');
  },

  /**
   * Handles file drop
   * @param {DragEvent} event - Drop event
   */
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.classList.remove('placeholder--dragover');

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      ErrorHandler.show('Пожалуйста, загрузите файл в формате CSV');
      return;
    }

    FileHandler.processFile(file);
  },

  /**
   * Processes uploaded file
   * @param {File} file - File to process
   */
  processFile(file) {
    Logger.file('Загрузка файла', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type
    });
    
    LoadingState.show('Загрузка файла...');
    ErrorHandler.hide();
    
    // Update file name display
    import('./uiController.js').then(({ UIController }) => {
      UIController.updateFileName(file.name);
    });

    // Reset state
    resetState();
    ChartRenderer.destroyCharts();
    ChartRenderer.clearCanvas('mainChart');
    ChartRenderer.clearCanvas('derivativeChart');
    
    import('./uiController.js').then(({ UIController }) => {
      UIController.reset();
    });

    // Parse CSV using unified parser
    DataProcessor.parseCSV(file, (error, results) => {
      if (error) {
        LoadingState.hide();
        ErrorHandler.show(`Ошибка чтения файла: ${error.message}`);
        return;
      }

      LoadingState.hide();

      if (results.errors.length > 0) {
        ErrorHandler.show(`Ошибка парсинга CSV: ${results.errors[0].message}`);
        return;
      }

      if (!results.data || results.data.length < 3) {
        ErrorHandler.show('Файл пуст или содержит недостаточно данных');
        return;
      }

      DataProcessor.process(results.data, ChartConstructor);
    });
  }
};
