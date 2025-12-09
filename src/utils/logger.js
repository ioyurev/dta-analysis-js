/**
 * Logger module for user actions and application events
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_CONFIG = {
  enabled: true,
  prefix: '[DTA Trainer]',
  styles: {
    action: 'color: #3b82f6; font-weight: bold',      // Синий - действия пользователя
    data: 'color: #10b981; font-weight: bold',        // Зеленый - данные
    tangent: 'color: #f59e0b; font-weight: bold',     // Оранжевый - касательные
    chart: 'color: #8b5cf6; font-weight: bold',       // Фиолетовый - графики
    error: 'color: #ef4444; font-weight: bold',       // Красный - ошибки
    info: 'color: #6b7280; font-weight: normal',      // Серый - информация
    demo: 'color: #ec4899; font-weight: bold',        // Розовый - демо режим
    file: 'color: #06b6d4; font-weight: bold'         // Голубой - файлы
  }
};

// =============================================================================
// LOGGER IMPLEMENTATION
// =============================================================================

export const Logger = {
  /**
   * Enable or disable logging
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    LOG_CONFIG.enabled = enabled;
  },

  /**
   * Logs a user action
   * @param {string} action - Action name
   * @param {Object} [details] - Additional details
   */
  action(action, details = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (details) {
      console.log(
        `%c${LOG_CONFIG.prefix} [ACTION] ${timestamp} ${action}`,
        LOG_CONFIG.styles.action,
        details
      );
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [ACTION] ${timestamp} ${action}`,
        LOG_CONFIG.styles.action
      );
    }
  },

  /**
   * Logs data-related events
   * @param {string} message - Message
   * @param {Object} [data] - Data object
   */
  data(message, data = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (data) {
      console.log(
        `%c${LOG_CONFIG.prefix} [DATA] ${timestamp} ${message}`,
        LOG_CONFIG.styles.data,
        data
      );
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [DATA] ${timestamp} ${message}`,
        LOG_CONFIG.styles.data
      );
    }
  },

  /**
   * Logs tangent-related events
   * @param {string} message - Message
   * @param {Object} [params] - Tangent parameters
   */
  tangent(message, params = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (params) {
      console.log(
        `%c${LOG_CONFIG.prefix} [TANGENT] ${timestamp} ${message}`,
        LOG_CONFIG.styles.tangent
      );
      console.table(params);
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [TANGENT] ${timestamp} ${message}`,
        LOG_CONFIG.styles.tangent
      );
    }
  },

  /**
   * Logs chart-related events
   * @param {string} message - Message
   * @param {Object} [details] - Chart details
   */
  chart(message, details = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (details) {
      console.log(
        `%c${LOG_CONFIG.prefix} [CHART] ${timestamp} ${message}`,
        LOG_CONFIG.styles.chart,
        details
      );
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [CHART] ${timestamp} ${message}`,
        LOG_CONFIG.styles.chart
      );
    }
  },

  /**
   * Logs file-related events
   * @param {string} message - Message
   * @param {Object} [details] - File details
   */
  file(message, details = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (details) {
      console.log(
        `%c${LOG_CONFIG.prefix} [FILE] ${timestamp} ${message}`,
        LOG_CONFIG.styles.file,
        details
      );
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [FILE] ${timestamp} ${message}`,
        LOG_CONFIG.styles.file
      );
    }
  },

  /**
   * Logs demo mode events
   * @param {string} message - Message
   * @param {Object} [details] - Demo details
   */
  demo(message, details = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    if (details) {
      console.log(
        `%c${LOG_CONFIG.prefix} [DEMO] ${timestamp} ${message}`,
        LOG_CONFIG.styles.demo,
        details
      );
    } else {
      console.log(
        `%c${LOG_CONFIG.prefix} [DEMO] ${timestamp} ${message}`,
        LOG_CONFIG.styles.demo
      );
    }
  },

  /**
   * Logs informational messages
   * @param {string} message - Message
   */
  info(message) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    console.log(
      `%c${LOG_CONFIG.prefix} [INFO] ${timestamp} ${message}`,
      LOG_CONFIG.styles.info
    );
  },

  /**
   * Logs errors
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  error(message, error = null) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    console.log(
      `%c${LOG_CONFIG.prefix} [ERROR] ${timestamp} ${message}`,
      LOG_CONFIG.styles.error
    );
    
    if (error) {
      console.error(error);
    }
  },

  /**
   * Logs a group of related messages
   * @param {string} title - Group title
   * @param {Function} callback - Function containing log calls
   */
  group(title, callback) {
    if (!LOG_CONFIG.enabled) return;
    
    console.group(`${LOG_CONFIG.prefix} ${title}`);
    callback();
    console.groupEnd();
  },

  /**
   * Logs tangent construction details in a formatted table
   * @param {number} tangentIndex - Tangent index (0 or 1)
   * @param {Object} params - Tangent parameters
   */
  tangentConstruction(tangentIndex, params) {
    if (!LOG_CONFIG.enabled) return;
    
    const tangentName = tangentIndex === 0 ? 'Касательная 1 (синяя)' : 'Касательная 2 (оранжевая)';
    const timestamp = this._getTimestamp();
    
    console.log(
      `%c${LOG_CONFIG.prefix} [TANGENT] ${timestamp} Построена: ${tangentName}`,
      LOG_CONFIG.styles.tangent
    );
    
    console.table({
      'Параметр': {
        'Наклон (slope)': params.slope,
        'Точка X (температура, °C)': params.x0,
        'Точка Y (сигнал DTA)': params.y0,
        'Уравнение': `y = ${params.slope.toFixed(6)} × (T - ${params.x0.toFixed(2)}) + ${params.y0.toFixed(4)}`
      }
    });
  },

  /**
   * Logs intersection calculation
   * @param {Object} intersection - Intersection point
   * @param {Object} tangent1 - First tangent params
   * @param {Object} tangent2 - Second tangent params
   */
  intersection(intersection, tangent1, tangent2) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    console.log(
      `%c${LOG_CONFIG.prefix} [TANGENT] ${timestamp} Вычислена точка пересечения`,
      LOG_CONFIG.styles.tangent
    );
    
    console.group('Детали пересечения');
    
    console.log('Касательная 1:', {
      slope: tangent1.slope,
      point: `(${tangent1.x0.toFixed(2)}, ${tangent1.y0.toFixed(4)})`
    });
    
    console.log('Касательная 2:', {
      slope: tangent2.slope,
      point: `(${tangent2.x0.toFixed(2)}, ${tangent2.y0.toFixed(4)})`
    });
    
    console.log(
      `%c>>> Температура перехода: ${intersection.x.toFixed(2)} °C <<<`,
      'color: #10b981; font-size: 14px; font-weight: bold'
    );
    
    console.groupEnd();
  },

  /**
   * Logs click event on derivative chart
   * @param {Object} clickData - Click event data
   */
  derivativeClick(clickData) {
    if (!LOG_CONFIG.enabled) return;
    
    const timestamp = this._getTimestamp();
    
    console.log(
      `%c${LOG_CONFIG.prefix} [ACTION] ${timestamp} Клик по графику производной`,
      LOG_CONFIG.styles.action
    );
    
    console.table({
      'Клик': {
        'Пиксель X': clickData.pixelX,
        'Пиксель Y': clickData.pixelY,
        'Температура (°C)': clickData.temperature,
        'Значение dDTA/dt': clickData.derivativeValue,
        'Градиент dT/dt': clickData.tempGradient,
        'Вычисленный наклон': clickData.calculatedSlope
      }
    });
  },

  /**
   * Returns formatted timestamp
   * @private
   * @returns {string}
   */
  _getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }
};