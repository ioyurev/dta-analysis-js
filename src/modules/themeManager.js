/**
 * Theme management module
 */

import { Logger } from '../utils/index.js';

const THEME_KEY = 'dta-trainer-theme';

export const ThemeManager = {
  /**
   * Available themes
   */
  themes: ['light', 'dark', 'auto'],

  /**
   * Current theme
   */
  currentTheme: 'auto',

  /**
   * Initialize theme from localStorage or system preference
   */
  init() {
    const saved = localStorage.getItem(THEME_KEY);
    
    if (saved && this.themes.includes(saved)) {
      this.currentTheme = saved;
      this._applyTheme(saved);
    } else {
      // Автоматическое определение по системным настройкам
      this.currentTheme = 'auto';
      this._applyTheme('auto');
    }

    // Слушаем изменения системной темы
    this._watchSystemTheme();

    Logger.info(`Тема инициализирована: ${this.currentTheme}`);
  },

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const html = document.documentElement;
    const currentApplied = html.dataset.theme;
    
    let newTheme;
    
    if (this.currentTheme === 'auto') {
      // Если авто — определяем текущую системную и переключаем на противоположную
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      newTheme = systemDark ? 'light' : 'dark';
    } else {
      // Переключаем между light и dark
      newTheme = currentApplied === 'dark' ? 'light' : 'dark';
    }
    
    this.setTheme(newTheme);
  },

  /**
   * Set specific theme
   * @param {'light' | 'dark' | 'auto'} theme
   */
  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      Logger.error(`Неизвестная тема: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this._applyTheme(theme);

    Logger.action(`Тема изменена на: ${theme}`);
  },

  /**
   * Get current effective theme (resolves 'auto')
   * @returns {'light' | 'dark'}
   */
  getEffectiveTheme() {
    if (this.currentTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  },

  /**
   * Apply theme to document
   * @private
   * @param {'light' | 'dark' | 'auto'} theme
   */
  _applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'auto') {
      // Удаляем data-theme, чтобы работал @media (prefers-color-scheme)
      delete html.dataset.theme;
    } else {
      html.dataset.theme = theme;
    }

    // Обновляем цвета графиков Chart.js
    this._updateChartColors();
  },

  /**
   * Update Chart.js colors based on current theme
   * @private
   */
  _updateChartColors() {
    // Импортируем динамически чтобы избежать циклических зависимостей
    import('../state.js').then(({ AppState }) => {
      // Цвета берутся из CSS-переменных, поэтому просто обновляем графики
      // чтобы они перечитали стили
      
      // Обновляем основной график
      if (AppState.charts.main) {
        const mainDataset = AppState.charts.main.data.datasets.find(d => !d._isTangent);
        if (mainDataset) {
          // Получаем цвет из CSS-переменной
          const chartColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-chart-main').trim();
          mainDataset.borderColor = chartColor;
        }

        // Обновляем цвета осей из CSS-переменных
        const textColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-text-primary').trim() || '#e5e7eb';
        const borderColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-border').trim() || '#334155';

        AppState.charts.main.options.scales.x.grid = { color: borderColor };
        AppState.charts.main.options.scales.y.grid = { color: borderColor };
        AppState.charts.main.options.scales.x.ticks = { color: '#e5e7eb' };
        AppState.charts.main.options.scales.y.ticks = { color: '#e5e7eb' };

        AppState.charts.main.update('none');
      }

      // Обновляем график производной
      if (AppState.charts.derivative) {
        const derivDataset = AppState.charts.derivative.data.datasets[0];
        if (derivDataset) {
          // Получаем цвет из CSS-переменной
          const derivativeColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-chart-derivative').trim();
          derivDataset.borderColor = derivativeColor;
        }

        // Используем те же цвета для осей
        const textColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-text-primary').trim() || '#e5e7eb';
        const borderColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-border').trim() || '#334155';

        AppState.charts.derivative.options.scales.x.grid = { color: borderColor };
        AppState.charts.derivative.options.scales.y.grid = { color: borderColor };
        AppState.charts.derivative.options.scales.x.ticks = { color: '#e5e7eb' };
        AppState.charts.derivative.options.scales.y.ticks = { color: '#e5e7eb' };

        AppState.charts.derivative.update('none');
      }
    });
  },

  /**
   * Watch for system theme changes
   * @private
   */
  _watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      if (this.currentTheme === 'auto') {
        Logger.info(`Системная тема изменена на: ${e.matches ? 'dark' : 'light'}`);
        this._updateChartColors();
      }
    });
  }
};
