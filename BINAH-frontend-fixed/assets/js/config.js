// Configuration file for BINAH Frontend
export const CONFIG = {
  // API Configuration
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api',
  
  // Cache settings
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  
  // Search settings
  SEARCH_DEBOUNCE_DELAY: 300, // milliseconds
  SEARCH_MIN_CHARS: 2,
  LIVE_SEARCH_DELAY: 150,
  
  // UI settings
  ANIMATION_DURATION: 300,
  LOADING_TIMEOUT: 10000, // 10 seconds
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Local storage keys
  STORAGE_KEYS: {
    TOPICS: 'binah_topics',
    USER_PREFERENCES: 'binah_preferences',
    CACHE_TIMESTAMP: 'binah_cache_timestamp'
  },
  
  // Feature flags
  FEATURES: {
    DRAG_AND_DROP: true,
    REAL_TIME_SEARCH: true,
    OFFLINE_MODE: true,
    PERFORMANCE_MONITORING: true
  },
  
  // Categories configuration
  CATEGORIES: Object.freeze([
    { id: 'Máquinas', icon: '⚙️', color: '#3b82f6' },
    { id: 'Dosadoras', icon: '💧', color: '#06b6d4' },
    { id: 'Manutenção', icon: '🔧', color: '#10b981' },
    { id: 'Erros', icon: '⚠️', color: '#f59e0b' },
    { id: 'Procedimentos', icon: '📋', color: '#8b5cf6' }
  ]),
  
  // Theme configuration
  THEMES: {
    default: {
      primary: '#6366f1',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    }
  },
  
  // Error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
    API_ERROR: 'Erro no servidor. Tente novamente.',
    VALIDATION_ERROR: 'Dados inválidos. Verifique os campos.',
    NOT_FOUND: 'Conteúdo não encontrado.',
    TIMEOUT: 'Operação expirou. Tente novamente.'
  }
};

// Environment detection
export const ENV = {
  isDevelopment: window.location.hostname === 'localhost',
  isProduction: window.location.hostname !== 'localhost',
  version: '1.0.0'
};