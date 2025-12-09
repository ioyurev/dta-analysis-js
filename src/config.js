/**
 * Application configuration
 */

export const CONFIG = Object.freeze({
  TOLERANCE_PIXELS: 10,
  CHART_PADDING_PERCENT: 0.05,
  TANGENT_SPAN_PERCENT: 0.15,
  MIN_DATA_POINTS: 3,
  
  DECIMATION: Object.freeze({
    SAMPLES: 1500,
    THRESHOLD: 3000
  }),
  
  THROTTLE_DELAY: 16,
  
  // NOTE: Colors are now defined as CSS variables in src/styles/variables.css
  // This object is kept for backward compatibility but colors are theme-aware
  COLORS: Object.freeze({
    // These are fallback colors for light theme
    MAIN_CHART: '#3b82f6',
    DERIVATIVE_CHART: '#ef4444',
    TANGENT_1: '#3b82f6',
    TANGENT_2: '#f59e0b',
    ZOOM_BG: 'rgba(59, 130, 246, 0.15)',
    ZOOM_BORDER: 'rgba(59, 130, 246, 0.4)',
    CLICK_FEEDBACK: '#3b82f6',
    INTERSECTION: '#10b981'
  }),
  
  TANGENT_NAMES: Object.freeze(['Касательная 1', 'Касательная 2']),
  
  SAMPLES: Object.freeze({
    'sample': {
      url: './sample.csv',
      name: 'Плавление образца Al-Si',
      expectedTemp: 630
    }
  }),
  
  DEMO: Object.freeze({
    STEP_DELAY: 2000,
    HIGHLIGHT_DURATION: 1500,
    CLICK_DELAY: 800
  }),
  
  HINTS: Object.freeze([
    '1. Изучите график производной. Найдите область резкого изменения сигнала — это область теплового эффекта.',
    '2. Первую касательную нужно провести на участке ДО пика, где кривая еще не отклоняется от базовой линии.',
    '3. Кликните по базовой линии — там, где производная еще не изменяет своего значения.',
    '4. Теперь переключитесь на "Касательная 2" и проведите вторую касательную.',
    '5. Кликните в области максимума производной для построения второй касательной.',
    '6. Готово! Точка пересечения касательных — это температура фазового перехода.'
  ])
});
