/**
 * Data processing module
 */

import Papa from 'papaparse';
import { AppState } from '../state.js';
import { announceToScreenReader, Logger } from '../utils/index.js';
import { DataValidator } from './dataValidator.js';
import { ErrorHandler } from './errorHandler.js';
import { LoadingState } from './loadingState.js';
import { ChartRenderer } from './chartRenderer.js';
import { HintSystem } from './hintSystem.js';

export const DataProcessor = {
  /**
   * Parses CSV file or text content
   * @param {File|string} source - File object or text content
   * @param {Function} callback - Callback function (error, results)
   */
  parseCSV(source, callback) {
    const parseOptions = {
      skipEmptyLines: true,
      dynamicTyping: true,
      delimiter: ',',
      encoding: 'UTF-8',
      header: false,
      newline: '\n',
      complete: (results) => {
        // Log parsed data for debugging
        console.log('Parsed rows:', results.data.length);
        console.log('First row:', results.data[0]);
        
        // Filter out rows with insufficient columns
        const validData = results.data.filter(row => 
          row && row.length >= 3 && 
          row.every(val => val !== null && val !== undefined)
        );
        
        console.log('Valid rows:', validData.length);
        results.data = validData;
        callback(null, results);
      },
      error: (error) => {
        callback(error, null);
      }
    };

    if (source instanceof File) {
      Papa.parse(source, parseOptions);
    } else if (typeof source === 'string') {
      Papa.parse(source, parseOptions);
    } else {
      callback(new Error('Invalid source type. Expected File or string.'), null);
    }
  },

  /**
   * Processes parsed CSV data
   * @param {unknown[][]} rawData - Raw parsed data
   * @param {Object} Chart - Chart.js constructor
   */
  process(rawData, Chart) {
    LoadingState.show('Обработка данных...');

    const { hasHeader } = this.detectHeader(rawData);
    const dataRows = hasHeader ? rawData.slice(1) : rawData;

    if (dataRows[0]?.length < 3) {
      LoadingState.hide();
      ErrorHandler.show('Неверный формат. Требуется 3 колонки: Time, Temperature, DTA');
      return;
    }

    const { valid, data: cleanedData, errors } = DataValidator.validateAndCleanData(dataRows);

    if (!valid) {
      LoadingState.hide();
      ErrorHandler.show('Недостаточно корректных данных после валидации');
      return;
    }

    errors.forEach(error => ErrorHandler.warn(error));

    const { chartPoints, derivativePoints } = this.calculateData(cleanedData);

    if (derivativePoints.length < 2) {
      LoadingState.hide();
      ErrorHandler.show('Невозможно вычислить производную: недостаточно данных');
      return;
    }

    Logger.data('Данные обработаны', {
      totalRows: rawData.length,
      validPoints: chartPoints.length,
      derivativePoints: derivativePoints.length,
      temperatureRange: {
        min: chartPoints[0]?.x,
        max: chartPoints[chartPoints.length - 1]?.x
      }
    });

    LoadingState.show('Построение графиков...');

    requestAnimationFrame(() => {
      ChartRenderer.renderMainChart(chartPoints, Chart);
      ChartRenderer.renderDerivativeChart(derivativePoints, Chart);
      
      LoadingState.hide();
      
      AppState.isDataLoaded = true;
      
      // Enable controls
      import('./uiController.js').then(({ UIController }) => {
        UIController.enableControls();
      });
      
      HintSystem.show();
      HintSystem.reset();

      announceToScreenReader(
        `Загружено ${chartPoints.length} точек данных. Графики построены.`
      );
    });
  },

  /**
   * Detects if data has a header row
   * @param {unknown[][]} data - Data to check
   * @returns {{ hasHeader: boolean, headerRow: unknown[] }}
   */
  detectHeader(data) {
    if (data.length < 2) {
      return { hasHeader: false, headerRow: [] };
    }

    const firstRow = data[0];
    const secondRow = data[1];

    const firstRowHasStrings = firstRow.some(val => typeof val === 'string' && isNaN(Number(val)));
    const secondRowHasNumbers = secondRow.every(val => typeof val === 'number');

    const hasHeader = firstRowHasStrings && secondRowHasNumbers;

    return {
      hasHeader,
      headerRow: hasHeader ? firstRow : []
    };
  },

  /**
   * Calculates chart points and derivative
   * @param {number[][]} data - Cleaned data rows
   * @returns {{ chartPoints: Array, derivativePoints: Array }}
   */
  calculateData(data) {
    const chartPoints = [];
    const derivativePoints = [];

    const times = data.map(row => row[0]);
    const temps = data.map(row => row[1]);
    const dtas = data.map(row => row[2]);

    for (let i = 0; i < data.length; i++) {
      chartPoints.push({ x: temps[i], y: dtas[i] });
    }

    for (let i = 0; i < data.length - 1; i++) {
      const dt = times[i + 1] - times[i];
      
      if (dt <= 0) continue;

      const dDTA = dtas[i + 1] - dtas[i];
      const dTemp = temps[i + 1] - temps[i];

      const dtaDerivative = dDTA / dt;
      const tempGradient = dTemp / dt;

      const midTemp = (temps[i] + temps[i + 1]) / 2;

      derivativePoints.push({
        x: midTemp,
        y: dtaDerivative,
        tempGradient: tempGradient
      });
    }

    return { chartPoints, derivativePoints };
  }
};
