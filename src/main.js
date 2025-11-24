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

// Global variables
let myChart = null;
let derivativeChart = null;
// Храним данные о двух касательных (0 и 1)
let tangentsData = [null, null]; 
// Индекс текущей активной касательной (0 or 1)
let activeTangentIndex = 0; 
let mainChartData = null;

// DOM элементы
let csvInput, resetZoomBtn, errorContainer, errorText, placeholderText, placeholderDerivative, coordinatesDisplay;
let tangent1Btn, tangent2Btn, currentTangentSpan;

// Цвета для графиков
const colors = [
  'rgba(59, 130, 246, 1)',   // Blue
  'rgba(239, 68, 68, 1)'     // Red
];

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  // Инициализация DOM элементов
 csvInput = document.getElementById('csvInput');
  resetZoomBtn = document.getElementById('resetZoomBtn');
  errorContainer = document.getElementById('errorMessage');
  errorText = document.getElementById('errorText');
  placeholderText = document.getElementById('placeholderText');
  placeholderDerivative = document.getElementById('placeholderTextDerivative');
  coordinatesDisplay = document.getElementById('coordinatesDisplay');
  
  // Элементы управления касательными
  tangent1Btn = document.getElementById('tangent1Btn');
  tangent2Btn = document.getElementById('tangent2Btn');
  currentTangentSpan = document.getElementById('currentTangent');

  // Назначаем обработчики
  csvInput.addEventListener('change', handleFileUpload);
  resetZoomBtn.addEventListener('click', handleResetZoom);
  
  // Обработчики для кнопок касательных
  if (tangent1Btn && tangent2Btn) {
    tangent1Btn.addEventListener('click', () => switchTangent(0));
    tangent2Btn.addEventListener('click', () => switchTangent(1));
  }
});

// Функция для переключения активной касательной
function switchTangent(index) {
  activeTangentIndex = index;
  
  // Обновляем UI
  if (tangent1Btn && tangent2Btn) {
    tangent1Btn.classList.toggle('active', index === 0);
    tangent2Btn.classList.toggle('active', index === 1);
    
    const tangentNames = ['Линия 1 (Красная)', 'Линия 2 (Зеленая)'];
    currentTangentSpan.textContent = `Активна: ${tangentNames[index]}`;
  }
  
  // Обновляем отображение координат
  if (myChart && myChart.tooltip.getActiveElements().length > 0) {
    const tooltip = myChart.tooltip;
    const temp = myChart.scales.x.getValueForPixel(tooltip.caretX);
    const signal = myChart.scales.y.getValueForPixel(tooltip.caretY);
    updateCoordinatesDisplay(temp, signal);
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  hideError();
  resetZoomBtn.disabled = true;
  
  // Show placeholders
  placeholderText.classList.remove('is-hidden');
  placeholderDerivative.classList.remove('is-hidden');

  // Destroy existing charts properly
  if (myChart) { myChart.destroy(); myChart = null; }
  if (derivativeChart) { derivativeChart.destroy(); derivativeChart = null; }
  
  // Reset tangent data for new file
  tangentsData = [null, null];
  activeTangentIndex = 0;

  // Clear canvas
  clearCanvas('myChart');
  clearCanvas('derivativeChart');

  Papa.parse(file, {
    download: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: function(results) {
      if (results.errors.length > 0) {
        showError('Ошибка чтения CSV файла: ' + results.errors[0].message);
        return;
      }
      if (results.data.length < 2) {
        showError('Файл пуст or contains недостаточно данных.');
        return;
      }
      processDataAndRender(results.data);
    },
    error: function() {
      showError('Не удалось прочитать файл.');
    }
  });
}

function handleResetZoom() {
  if (myChart) {
    // Сохраняем касательные
    const tangents = myChart.data.datasets.filter(d => d.isTangent);
    // Оставляем только основные данные
    myChart.data.datasets = myChart.data.datasets.filter(d => !d.isTangent);
    
    // Сбрасываем зум по основным данным
    myChart.resetZoom();
    
    // Возвращаем касательные обратно
    myChart.data.datasets.push(...tangents);
    myChart.update('none');
  }
  if (derivativeChart) {
    derivativeChart.resetZoom();
    delete derivativeChart.options.scales.y.min;
    delete derivativeChart.options.scales.y.max;
    derivativeChart.update();
  }
}

function clearCanvas(id) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    showError('Неверный формат. Требуется 3 колонки: Time, Temperature, DTA.');
    return;
  }

  const chartPoints = [];
  const derivativePoints = [];
  const startIndex = hasHeader ? 1 : 0;
  
  // Arrays for calculation
  const timeArray = [];
  const tempArray = [];
  const dtaArray = [];
  
  // Parse Data
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    // Ensure we have numbers
    if (typeof row[0] === 'number' && typeof row[1] === 'number' && typeof row[2] === 'number') {
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
    borderColor: colors[0],
    borderWidth: 1.5, 
    pointRadius: 0,   
    pointHoverRadius: 0,
    fill: false,
    tension: 0,
    showLine: true 
  };

  renderMainChart([dataset], xLabel, yLabel, derivativePoints);
}

function renderMainChart(datasets, xLabel, yLabel, derivativePoints) {
  const ctx = document.getElementById('myChart').getContext('2d');
  placeholderText.classList.add('is-hidden');
  // Показываем canvas добавляя класс graph-loaded
  const mainChartContainer = document.querySelector('.chart-container');
  if (mainChartContainer) {
    mainChartContainer.classList.add('graph-loaded');
  }
  resetZoomBtn.disabled = false;

  // Store data for tangent calc
  mainChartData = datasets[0].data;
  
  myChart = new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      normalized: true,
      parsing: false, // Critical for performance
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
          enabled: false // Полностью отключаем тултип
        },
        decimation: {
          enabled: true,
          algorithm: 'lttb', // Or 'min-max'
          samples: 1500,
          threshold: 3000
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

  renderDerivativeChart(derivativePoints);
  setupCoordinatesTracking();
}

function renderDerivativeChart(derivativePoints) {
  const ctx = document.getElementById('derivativeChart').getContext('2d');
  placeholderDerivative.classList.add('is-hidden');
  
  // Показываем canvas производной добавляя класс graph-loaded
  const derivativeChartContainer = document.querySelector('.chart-container.derivative-container');
  if (derivativeChartContainer) {
    derivativeChartContainer.classList.add('graph-loaded');
  }

  derivativeChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'dDTA/dt',
        data: derivativePoints,
        borderColor: colors[1],
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
        decimation: { enabled: true, algorithm: 'lttb', samples: 1500 },
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

  setupDerivativeChartClickHandler(derivativePoints);
}

// --- Sync Logic ---
function syncChartsZoom() {
  if (!myChart || !derivativeChart) return;

  // Sync X axis only usually makes sense for DTA
  const mainX = myChart.scales['x'];
  
  // Apply bounds to derivative chart
  derivativeChart.options.scales.x.min = mainX.min;
  derivativeChart.options.scales.x.max = mainX.max;
  
  calculateDynamicYScaling(mainX.min, mainX.max);
  derivativeChart.update('none');
}

function calculateDynamicYScaling(xMin, xMax) {
  const dataset = derivativeChart.data.datasets[0].data;
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
    const padding = (maxY - minY) * 0.1; // 10% padding
    derivativeChart.options.scales.y.min = minY - padding;
    derivativeChart.options.scales.y.max = maxY + padding;
  }
}

// --- Interaction Logic ---
function setupCoordinatesTracking() {
  const canvas = document.getElementById('myChart');
  canvas.onmousemove = function(event) {
    if (!myChart) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const temp = myChart.scales.x.getValueForPixel(x);
    const signal = myChart.scales.y.getValueForPixel(y);
    
    updateCoordinatesDisplay(temp, signal);
  };
  
  canvas.onmouseleave = () => updateCoordinatesDisplay(null, null);
}

function updateCoordinatesDisplay(temp, signal) {
  if (temp !== null && signal !== null) {
    const nextLine = activeTangentIndex === 0 ? 'Линия 1 (Красная)' : 'Линия 2 (Зеленая)';
    const text = `T: ${temp.toFixed(2)}°C, DTA: ${signal.toFixed(4)} | Следующая: ${nextLine}`;
    
    coordinatesDisplay.textContent = text;
    coordinatesDisplay.className = '';
  } else {
    coordinatesDisplay.textContent = 'Координаты курсора: неактивно';
    coordinatesDisplay.className = '';
  }
}

function setupDerivativeChartClickHandler(derivativePoints) {
  const canvas = document.getElementById('derivativeChart');
  canvas.onclick = function(event) {
    if (!derivativeChart || !myChart) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = derivativeChart.scales.x.getValueForPixel(event.clientX - rect.left);
    
    // Find nearest point by X
    const nearest = derivativePoints.reduce((prev, curr) => 
      Math.abs(curr.x - clickX) < Math.abs(prev.x - clickX) ? curr : prev
    );

    if (nearest && nearest.tempGradient && Math.abs(nearest.x - clickX) < 5) {
      // Calculate dSignal/dTemp = (dSignal/dt) / (dTemp/dt)
      const slope = nearest.y / nearest.tempGradient;
      
      // Find exact Y on main chart for this X
      const mainPoint = mainChartData.reduce((prev, curr) => 
        Math.abs(curr.x - nearest.x) < Math.abs(prev.x - nearest.x) ? curr : prev
      );

      drawTangent(slope, mainPoint.x, mainPoint.y);
    }
  };
}

function drawTangent(slope, x0, y0) {
  // Берем границы из данных, чтобы линия была бесконечной при зуме
  // Если данные отсортированы, берем первый и последний элемент
  const firstPoint = mainChartData[0];
  const lastPoint = mainChartData[mainChartData.length - 1];
  
  // Добавляем небольшой запас (например 10%), чтобы линия точно уходила за края
  const span = lastPoint.x - firstPoint.x;
  const startX = firstPoint.x - (span * 0.1); 
  const endX = lastPoint.x + (span * 0.1);

  // Уравнение прямой: y = m(x - x0) + y0
  const p1 = { x: startX, y: slope * (startX - x0) + y0 };
  const p2 = { x: endX, y: slope * (endX - x0) + y0 };

  // Настройки цветов для двух разных линий (Красная and Зеленая)
  const styles = [
    { color: 'rgba(239, 68, 68, 0.9)', label: 'Касательная 1' },
    { color: 'rgba(16, 185, 129, 0.9)', label: 'Касательная 2' }
  ];
  const currentStyle = styles[activeTangentIndex];

  // Формируем объект датасета
  const newTangentDataset = {
    label: currentStyle.label,
    tangentId: activeTangentIndex, // Метка, чтобы различать их
    isTangent: true,
    slopeVal: slope,
    params: { m: slope, x: x0, y: y0 }, // Сохраняем параметры
    data: [p1, p2],
    borderColor: currentStyle.color,
    backgroundColor: currentStyle.color,
    borderDash: [6, 4],
    borderWidth: 2,
    pointRadius: 0,
    showLine: true,
    parsing: false
  };

  // 1. Удаляем старую касательную с ТАКИМ ЖЕ индексом, если она есть
  myChart.data.datasets = myChart.data.datasets.filter(d => d.tangentId !== activeTangentIndex);

  // 2. Добавляем новую
  myChart.data.datasets.push(newTangentDataset);
  
  // 3. Сохраняем параметры в глобальный массив
  tangentsData[activeTangentIndex] = newTangentDataset;

  // 4. Обновляем график
  myChart.update('none');

  // 5. Переключаем индекс для следующего клика (0 -> 1 -> 0 ...)
  activeTangentIndex = (activeTangentIndex + 1) % 2;
}

function showError(msg) {
  errorText.textContent = msg;
  errorContainer.classList.add('has-content');
  placeholderText.classList.remove('hidden');
}

function hideError() { 
 errorContainer.classList.remove('has-content');
  errorText.textContent = '';
}
