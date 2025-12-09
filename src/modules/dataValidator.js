/**
 * Data validation module
 */

import { CONFIG } from '../config.js';

export const DataValidator = {
  /**
   * Checks if a value is a valid finite number
   * @param {unknown} value - Value to check
   * @returns {boolean}
   */
  isValidNumber(value) {
    return typeof value === 'number' && 
           Number.isFinite(value) && 
           !Number.isNaN(value);
  },

  /**
   * Validates a single data row
   * @param {unknown[]} row - Row to validate
   * @returns {boolean}
   */
  validateDataRow(row) {
    if (!Array.isArray(row) || row.length < 3) {
      return false;
    }
    return this.isValidNumber(row[0]) && 
           this.isValidNumber(row[1]) && 
           this.isValidNumber(row[2]);
  },

  /**
   * Validates time monotonicity and returns cleaned data
   * @param {number[][]} rows - Data rows
   * @returns {{ valid: boolean, data: number[][], errors: string[] }}
   */
  validateAndCleanData(rows) {
    const errors = [];
    const cleanedData = [];
    let lastTime = -Infinity;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!this.validateDataRow(row)) {
        invalidCount++;
        continue;
      }

      const [time, temp, dta] = row;

      if (time <= lastTime) {
        duplicateCount++;
        continue;
      }

      lastTime = time;
      cleanedData.push([time, temp, dta]);
    }

    if (invalidCount > 0) {
      errors.push(`Пропущено ${invalidCount} строк с некорректными данными`);
    }
    if (duplicateCount > 0) {
      errors.push(`Пропущено ${duplicateCount} строк с немонотонным временем`);
    }

    return {
      valid: cleanedData.length >= CONFIG.MIN_DATA_POINTS,
      data: cleanedData,
      errors
    };
  }
};