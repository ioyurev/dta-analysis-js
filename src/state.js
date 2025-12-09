/**
 * Central application state
 */

export const AppState = {
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
  eventHandlers: new Map(),
  
  currentSample: null,
  currentHintIndex: 0,
  isDemoRunning: false,
  isDataLoaded: false
};

/**
 * Reset state to initial values
 */
export function resetState() {
  AppState.tangents.data = [null, null];
  AppState.tangents.activeIndex = 0;
  AppState.data.main = null;
  AppState.data.derivative = null;
  AppState.currentHintIndex = 0;
  AppState.isDemoRunning = false;
  AppState.isDataLoaded = false;
}