/**
 * General utility functions
 */

/**
 * Creates a throttled version of a function
 * @param {Function} func - Function to throttle
 * @param {number} delay - Throttle delay in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
  let lastCall = 0;
  let timeoutId = null;
  
  return function throttled(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    
    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      func.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Formats a number for display
 * @param {number} value - Value to format
 * @param {number} [decimals=4] - Number of decimal places
 * @returns {string} Formatted string
 */
export function formatNumber(value, decimals = 4) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

/**
 * Announces a message to screen readers
 * @param {string} message - Message to announce
 */
export function announceToScreenReader(message) {
  const status = document.getElementById('a11yStatus');
  if (status) {
    status.textContent = '';
    void status.offsetHeight;
    status.textContent = message;
  }
}

/**
 * Promise-based delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}