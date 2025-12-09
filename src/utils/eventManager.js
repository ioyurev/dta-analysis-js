/**
 * Event handler management with tracking
 */

import { AppState } from '../state.js';

export const EventManager = {
  /**
   * Adds an event handler with tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {AddEventListenerOptions} [options] - Event options
   */
  add(element, event, handler, options = {}) {
    if (!element || !element.addEventListener) return;
    
    const key = `${element.id || 'anonymous'}_${event}`;
    this.remove(element, event);
    
    element.addEventListener(event, handler, options);
    AppState.eventHandlers.set(key, { element, event, handler, options });
  },

  /**
   * Removes a tracked event handler
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   */
  remove(element, event) {
    if (!element) return;
    
    const key = `${element.id || 'anonymous'}_${event}`;
    const stored = AppState.eventHandlers.get(key);
    
    if (stored) {
      element.removeEventListener(event, stored.handler, stored.options);
      AppState.eventHandlers.delete(key);
    }
  },

  /**
   * Removes all tracked event handlers
   */
  removeAll() {
    AppState.eventHandlers.forEach(({ element, event, handler, options }) => {
      if (element) {
        element.removeEventListener(event, handler, options);
      }
    });
    AppState.eventHandlers.clear();
  }
};