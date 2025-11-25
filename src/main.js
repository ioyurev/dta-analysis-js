// Импорты
import {
  Chart,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import Papa from 'papaparse';
import './styles.css';

// Регистрация Chart.js компонентов
Chart.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

// Настройка Chart.js defaults
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';

// Конфигурация приложения
const CONFIG = {
  TOLERANCE_PIXELS: 5,
  CHART_PADDING_PERCENT: 0.1,
  TANGENT_SPAN_PERCENT: 0.1,
  MIN_DATA_POINTS: 2,
  DECIMATION_SAMPLES: 1500,
  DECIMATION_THRESHOLD: 3000,
  COLORS: {
    MAIN_CHART: 'rgba(59, 130, 246, 1)',
    DERIVATIVE_CHART: 'rgba(239, 68, 68, 1)',
    TANGENT_1: 'rgba(239, 68, 68, 0.9)',
    TANGENT_2: 'rgba(16, 185, 129, 0.9)'
  },
  TANGENT_NAMES: ['Линия 1 (Красная)', 'Линия 2 (Зеленая)']
};

// Центральное состояние приложения
const AppState = {
  charts: {
    main: null,
    derivative: null
  },
  tangents: {
    data: [null, null],
    activeIndex: 0
  },
  data: {
    main: null,
    derivative: null
  },
  elements: {},
  handlers: {}
};

// Модуль валидации данных
const DataValidator = {
  isValidNumber(value) {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) && 
           value !== null;
  },
  
  validateDataRow(row) {
    if (!Array.isArray(row) || row.length < 3) {
      return false;
    }
    return row.every(this.isValidNumber);
  },
  
  sanitizeData(data) {
    return data.filter(row => {
      if (!Array.isArray(row) || row.length < 3) return false;
      return row.every(this.isValidNumber);
    });
  }
};

// Модуль обработки ошибок
const ErrorHandler = {
  showError(message) {
    const errorText = document.getElementById('errorText');
    const errorContainer = document.getElementById('errorMessage');
    if (errorText && errorContainer) {
      errorText.textContent = message;
      errorContainer.classList.add('has-content');
      // Показываем placeholder если он есть
      const placeholderText = document.getElementById('placeholderText');
      if (placeholderText) {
        placeholderText.classList.remove('hidden');
      }
    }
  },
  
  hideError() {
    const errorContainer = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorContainer && errorText) {
      errorContainer.classList.remove('has-content');
      errorText.textContent = '';
    }
  }
};


// Модуль управления событиями
const EventHandlerManager = {
  addHandler(canvas, event, handler, options = {}) {
    const key = `${canvas.id}_${event}`;
    if (AppState.handlers[key]) {
      this.removeHandler(canvas, event);
    }
    canvas.addEventListener(event, handler, options);
    AppState.handlers[key] = { handler, options };
  },
  
  removeHandler(canvas, event) {
    const key = `${canvas.id}_${event}`;
    if (AppState.handlers[key]) {
      canvas.removeEventListener(event, AppState.handlers[key].handler, AppState.handlers[key].options);
      delete AppState.handlers[key];
    }
  },
  
  removeAllHandlers() {
    Object.keys(AppState.handlers).forEach(key => {
      const [canvasId, event] = key.split('_');
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        this.removeHandler(canvas, event);
      }
    });
    AppState.handlers = {};
  }
};

// Модуль отрисовки графиков
const ChartRenderer = {
  clearCanvas(id) {
    const canvas = document.getElementById(id);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

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

  renderMainChart(datasets, xLabel, yLabel, derivativePoints) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const placeholderText = document.getElementById('placeholderText');
    if (placeholderText) {
      placeholderText.classList.add('is-hidden');
    }
    
    const mainChartContainer = document.querySelector('.chart-container');
    if (mainChartContainer) {
      mainChartContainer.classList.add('graph-loaded');
    }
    
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
      resetZoomBtn.disabled = false;
    }

    // Store data for tangent calc
    AppState.data.main = datasets[0].data;
    
    AppState.charts.main = new Chart(ctx, {
      type: 'line',
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        parsing: false,
        interaction: { 
          mode: 'nearest', 
          axis: 'x', 
          intersect: false 
        },
        elements: {
          point: { radius: 0, hoverRadius: 0 },
          line: { tension: 0, borderWidth: 1.5 }
        },
        plugins: {
          legend: { display: false },
          tooltip: { 
            enabled: false
          },
          decimation: {
            enabled: true,
            algorithm: 'lttb',
            samples: CONFIG.DECIMATION_SAMPLES,
            threshold: CONFIG.DECIMATION_THRESHOLD
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'ctrl',
              onPanComplete: syncChartsZoom
            },
            zoom: {
              wheel: { enabled: false },
              pinch: { enabled: false },
              drag: {
                enabled: true,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 1,
                threshold: 10
              },
              mode: 'xy',
              onZoomComplete: syncChartsZoom
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            display: true,
            title: { display: true, text: xLabel, font: { weight: 'bold' } }
          },
          y: {
            display: true,
            title: { display: true, text: yLabel, font: { weight: 'bold' } }
          }
        }
      }
    });

    this.renderDerivativeChart(derivativePoints);
    this.setupCoordinatesTracking();
  },

  renderDerivativeChart(derivativePoints) {
    const ctx = document.getElementById('derivativeChart').getContext('2d');
    const placeholderDerivative = document.getElementById('placeholderTextDerivative');
    if (placeholderDerivative) {
      placeholderDerivative.classList.add('is-hidden');
    }
    
    const derivativeChartContainer = document.querySelector('.chart-container.derivative-container');
    if (derivativeChartContainer) {
      derivativeChartContainer.classList.add('graph-loaded');
    }

    AppState.charts.derivative = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'dDTA/dt',
          data: derivativePoints,
          borderColor: CONFIG.COLORS.DERIVATIVE_CHART,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        parsing: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        elements: { point: { radius: 0 }, line: { tension: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          decimation: { 
            enabled: true, 
            algorithm: 'lttb', 
            samples: CONFIG.DECIMATION_SAMPLES 
          },
          zoom: {
            pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
            zoom: {
              drag: {
                enabled: true,
                backgroundColor: 'rgba(239, 68, 68, 0.2)'
              },
              mode: 'xy' 
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Temperature (°C)', font: { weight: 'bold' } }
          },
          y: {
            title: { display: true, text: 'dDTA/dt (a.u./s)', font: { weight: 'bold' } }
          }
        }
      }
    });

    this.setupDerivativeChartClickHandler(derivativePoints);
  },

  setupCoordinatesTracking() {
    const canvas = document.getElementById('myChart');
    if (!canvas) return;

    // Удаляем старые обработчики
    EventHandlerManager.removeHandler(canvas, 'mousemove');
    EventHandlerManager.removeHandler(canvas, 'mouseleave');

    const mouseMoveHandler = (event) => {
      if (!AppState.charts.main) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const temp = AppState.charts.main.scales.x.getValueForPixel(x);
      const signal = AppState.charts.main.scales.y.getValueForPixel(y);
      
      updateCoordinatesDisplay(temp, signal);
    };

    const mouseLeaveHandler = () => updateCoordinatesDisplay(null, null);

    EventHandlerManager.addHandler(canvas, 'mousemove', mouseMoveHandler);
    EventHandlerManager.addHandler(canvas, 'mouseleave', mouseLeaveHandler);
  },

  setupDerivativeChartClickHandler(derivativePoints) {
    const canvas = document.getElementById('derivativeChart');
    if (!canvas) return;

    // Удаляем старый обработчик
    EventHandlerManager.removeHandler(canvas, 'click');

    const clickHandler = (event) => {
      if (!AppState.charts.derivative || !AppState.charts.main) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickX = AppState.charts.derivative.scales.x.getValueForPixel(event.clientX - rect.left);
      
      const nearest = derivativePoints.reduce((prev, curr) => 
        Math.abs(curr.x - clickX) < Math.abs(prev.x - clickX) ? curr : prev
      );

      if (nearest && nearest.tempGradient && Math.abs(nearest.x - clickX) < CONFIG.TOLERANCE_PIXELS) {
        const slope = nearest.y / nearest.tempGradient;
        
        const mainPoint = AppState.data.main.reduce((prev, curr) => 
          Math.abs(curr.x - nearest.x) < Math.abs(prev.x - nearest.x) ? curr : prev
        );

        drawTangent(slope, mainPoint.x, mainPoint.y);
      }
    };

    EventHandlerManager.addHandler(canvas, 'click', clickHandler);
  }
};

// Модуль управления касательными
const TangentManager = {
  drawTangent(slope, x0, y0) {
    if (!AppState.data.main || AppState.data.main.length === 0) return;
    if (!AppState.charts.main) return;

    // ✅ ПРАВИЛЬНО: читаем текущие границы из scales графика
    const currentXMin = AppState.charts.main.scales.x.min;
    const currentXMax = AppState.charts.main.scales.x.max;
    const currentYMin = AppState.charts.main.scales.y.min;
    const currentYMax = AppState.charts.main.scales.y.max;

    const firstPoint = AppState.data.main[0];
    const lastPoint = AppState.data.main[AppState.data.main.length - 1];
    
    const span = lastPoint.x - firstPoint.x;
    const startX = firstPoint.x - (span * CONFIG.TANGENT_SPAN_PERCENT);
    const endX = lastPoint.x + (span * CONFIG.TANGENT_SPAN_PERCENT);

    const p1 = { x: startX, y: slope * (startX - x0) + y0 };
    const p2 = { x: endX, y: slope * (endX - x0) + y0 };

    const styles = [
      { color: CONFIG.COLORS.TANGENT_1, label: 'Касательная 1' },
      { color: CONFIG.COLORS.TANGENT_2, label: 'Касательная 2' }
    ];
    const currentStyle = styles[AppState.tangents.activeIndex];

    const newTangentDataset = {
      label: currentStyle.label,
      tangentId: AppState.tangents.activeIndex,
      isTangent: true,
      slopeVal: slope,
      params: { m: slope, x: x0, y: y0 },
      data: [p1, p2],
      borderColor: currentStyle.color,
      backgroundColor: currentStyle.color,
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      parsing: false,
      clip: true  // ✅ Исключить из расчёта границ осей
    };

    // Удаляем старую касательную с текущего индекса
    AppState.charts.main.data.datasets = AppState.charts.main.data.datasets
      .filter(d => d.tangentId !== AppState.tangents.activeIndex);
    
    // Добавляем новую
    AppState.charts.main.data.datasets.push(newTangentDataset);
    
    // ✅ ПРИНУДИТЕЛЬНО устанавливаем границы осей
    AppState.charts.main.options.scales.x.min = currentXMin;
    AppState.charts.main.options.scales.x.max = currentXMax;
    AppState.charts.main.options.scales.y.min = currentYMin;
    AppState.charts.main.options.scales.y.max = currentYMax;
    
    // Обновляем без анимации
    AppState.charts.main.update('none');
    
    AppState.tangents.data[AppState.tangents.activeIndex] = newTangentDataset;
  }
};

// Модуль управления интерфейсом
const UIController = {
  initializeElements() {
    AppState.elements.csvInput = document.getElementById('csvInput');
    AppState.elements.resetZoomBtn = document.getElementById('resetZoomBtn');
    AppState.elements.errorContainer = document.getElementById('errorMessage');
    AppState.elements.errorText = document.getElementById('errorText');
    AppState.elements.placeholderText = document.getElementById('placeholderText');
    AppState.elements.placeholderDerivative = document.getElementById('placeholderTextDerivative');
    AppState.elements.coordinatesDisplay = document.getElementById('coordinatesDisplay');
    AppState.elements.tangent1Btn = document.getElementById('tangent1Btn');
    AppState.elements.tangent2Btn = document.getElementById('tangent2Btn');
    AppState.elements.currentTangentSpan = document.getElementById('currentTangent');
  },

  initializeEventListeners() {
    if (AppState.elements.csvInput) {
      AppState.elements.csvInput.addEventListener('change', handleFileUpload);
    }
    if (AppState.elements.resetZoomBtn) {
      AppState.elements.resetZoomBtn.addEventListener('click', handleResetZoom);
    }
    if (AppState.elements.tangent1Btn && AppState.elements.tangent2Btn) {
      AppState.elements.tangent1Btn.addEventListener('click', () => switchTangent(0));
      AppState.elements.tangent2Btn.addEventListener('click', () => switchTangent(1));
    }
  },

  switchTangent(index) {
    AppState.tangents.activeIndex = index;
    
    if (AppState.elements.tangent1Btn && AppState.elements.tangent2Btn) {
      AppState.elements.tangent1Btn.classList.toggle('active', index === 0);
      AppState.elements.tangent2Btn.classList.toggle('active', index === 1);
      
      const tangentNames = CONFIG.TANGENT_NAMES;
      if (AppState.elements.currentTangentSpan) {
        AppState.elements.currentTangentSpan.textContent = `Активна: ${tangentNames[index]}`;
      }
    }
    
    if (AppState.charts.main && AppState.charts.main.tooltip.getActiveElements().length > 0) {
      const tooltip = AppState.charts.main.tooltip;
      const temp = AppState.charts.main.scales.x.getValueForPixel(tooltip.caretX);
      const signal = AppState.charts.main.scales.y.getValueForPixel(tooltip.caretY);
      updateCoordinatesDisplay(temp, signal);
    }
  },

  updateCoordinatesDisplay(temp, signal) {
    if (AppState.elements.coordinatesDisplay) {
      if (temp !== null && signal !== null) {
        const currentLine = CONFIG.TANGENT_NAMES[AppState.tangents.activeIndex];
        const text = `T: ${temp.toFixed(2)}°C, DTA: ${signal.toFixed(4)} | Активна: ${currentLine}`;
        
        AppState.elements.coordinatesDisplay.textContent = text;
        AppState.elements.coordinatesDisplay.className = '';
      } else {
        AppState.elements.coordinatesDisplay.textContent = 'Координаты курсора: неактивно';
        AppState.elements.coordinatesDisplay.className = '';
      }
    }
  }
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  UIController.initializeElements();
  UIController.initializeEventListeners();
});

// Функция для переключения активной касательной
function switchTangent(index) {
  UIController.switchTangent(index);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  ErrorHandler.hideError();
  if (AppState.elements.resetZoomBtn) {
    AppState.elements.resetZoomBtn.disabled = true;
  }
  
  // Show placeholders
  const placeholderText = document.getElementById('placeholderText');
  const placeholderDerivative = document.getElementById('placeholderTextDerivative');
  if (placeholderText) placeholderText.classList.remove('is-hidden');
  if (placeholderDerivative) placeholderDerivative.classList.remove('is-hidden');

  // Destroy existing charts properly
  ChartRenderer.destroyCharts();
  
  // Reset tangent data for new file
  AppState.tangents.data = [null, null];
  AppState.tangents.activeIndex = 0;

  // Clear canvas
  ChartRenderer.clearCanvas('myChart');
  ChartRenderer.clearCanvas('derivativeChart');

  Papa.parse(file, {
    download: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: function(results) {
      if (results.errors.length > 0) {
        ErrorHandler.showError('Ошибка чтения CSV файла: ' + results.errors[0].message);
        return;
      }
      if (results.data.length < CONFIG.MIN_DATA_POINTS) {
        ErrorHandler.showError('Файл пуст или содержит недостаточно данных.');
        return;
      }
      processDataAndRender(results.data);
    },
    error: function() {
      ErrorHandler.showError('Не удалось прочитать файл.');
    }
  });
}

function handleResetZoom() {
  if (AppState.charts.main) {
    // Сохраняем касательные
    const tangents = AppState.charts.main.data.datasets.filter(d => d.isTangent);
    // Оставляем только основные данные
    AppState.charts.main.data.datasets = AppState.charts.main.data.datasets.filter(d => !d.isTangent);
    
    // Сбрасываем зум по основным данным
    AppState.charts.main.resetZoom();
    
    // Возвращаем касательные обратно
    AppState.charts.main.data.datasets.push(...tangents);
    AppState.charts.main.update('none');
  }
  if (AppState.charts.derivative) {
    AppState.charts.derivative.resetZoom();
    delete AppState.charts.derivative.options.scales.y.min;
    delete AppState.charts.derivative.options.scales.y.max;
    AppState.charts.derivative.update();
  }
}


function processDataAndRender(data) {
  // Detect header logic
  let hasHeader = false;
  const firstRow = data[0];
  if (data.length > 1 && 
      firstRow && typeof firstRow[1] === 'string' && 
      data[1] && typeof data[1][1] === 'number') {
    hasHeader = true;
  }

  if (firstRow.length < 3) {
    ErrorHandler.showError('Неверный формат. Требуется 3 колонки: Time, Temperature, DTA.');
    return;
  }

  const chartPoints = [];
  const derivativePoints = [];
  const startIndex = hasHeader ? 1 : 0;
  
  // Arrays for calculation
  const timeArray = [];
  const tempArray = [];
  const dtaArray = [];
  
  // Parse Data with validation
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    // Use the new validation
    if (DataValidator.validateDataRow(row)) {
      timeArray.push(row[0]);
      tempArray.push(row[1]);
      dtaArray.push(row[2]);
      chartPoints.push({ x: row[1], y: row[2] });
    }
  }

  // Calculate derivative dDTA/dTime and Gradient
  for (let i = 0; i < dtaArray.length - 1; i++) {
    const dt = timeArray[i+1] - timeArray[i];
    if (dt === 0) continue; // Avoid division by zero

    const dDTA = dtaArray[i+1] - dtaArray[i];
    const dTemp = tempArray[i+1] - tempArray[i];
    
    const dtaDerivative = dDTA / dt; // dSignal/dt
    const tempGradient = dTemp / dt; // dTemp/dt
    
    derivativePoints.push({ 
      x: tempArray[i], 
      y: dtaDerivative,
      tempGradient: tempGradient
    });
  }

  // Labels
  const xLabel = hasHeader ? firstRow[1] : 'Temperature (°C)';
  const yLabel = hasHeader ? firstRow[2] : 'DTA Signal';

  const dataset = {
    label: 'Signal',
    data: chartPoints,
    borderColor: CONFIG.COLORS.MAIN_CHART,
    borderWidth: 1.5, 
    pointRadius: 0,   
    pointHoverRadius: 0,
    fill: false,
    tension: 0,
    showLine: true 
  };

  ChartRenderer.renderMainChart([dataset], xLabel, yLabel, derivativePoints);
}

// --- Sync Logic ---
function syncChartsZoom() {
  if (!AppState.charts.main || !AppState.charts.derivative) return;

  // Sync X axis only usually makes sense for DTA
  const mainX = AppState.charts.main.scales['x'];
  
  // Apply bounds to derivative chart
  AppState.charts.derivative.options.scales.x.min = mainX.min;
  AppState.charts.derivative.options.scales.x.max = mainX.max;
  
  calculateDynamicYScaling(mainX.min, mainX.max);
  AppState.charts.derivative.update('none');
}

function calculateDynamicYScaling(xMin, xMax) {
  if (!AppState.charts.derivative) return;
  
  const dataset = AppState.charts.derivative.data.datasets[0].data;
  if (!dataset) return;

  // Find points visible in the new X range
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  // Using a simple loop is faster than filter for scaling calc
  for(let i = 0; i < dataset.length; i++) {
    const pt = dataset[i];
    if (pt.x >= xMin && pt.x <= xMax) {
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
      found = true;
    }
  }

  if (found) {
    const padding = (maxY - minY) * CONFIG.CHART_PADDING_PERCENT; // Using config constant
    AppState.charts.derivative.options.scales.y.min = minY - padding;
    AppState.charts.derivative.options.scales.y.max = maxY + padding;
  }
}

// --- Interaction Logic ---

function updateCoordinatesDisplay(temp, signal) {
  UIController.updateCoordinatesDisplay(temp, signal);
}
function drawTangent(slope, x0, y0) {
  TangentManager.drawTangent(slope, x0, y0);
}
