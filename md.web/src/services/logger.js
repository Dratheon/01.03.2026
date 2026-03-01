/**
 * Error Logger Service
 * Hata ve aktivite loglarını yönetir
 * Production'da backend'e gönderir
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Ortam bazlı ayarlar
const isDev = import.meta.env.DEV;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Log kuyruğu - batch gönderim için
let logQueue = [];
let flushTimeout = null;
const FLUSH_INTERVAL = 5000; // 5 saniye
const MAX_QUEUE_SIZE = 20;

/**
 * Log kaydı oluştur
 */
const createLogEntry = (level, message, data = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    url: window.location.href,
    userAgent: navigator.userAgent,
    userId: localStorage.getItem('userId') || null,
  };
};

/**
 * Logları backend'e gönder
 */
const flushLogs = async () => {
  if (logQueue.length === 0) return;

  const logsToSend = [...logQueue];
  logQueue = [];

  try {
    const token = localStorage.getItem('authToken');
    await fetch(`${API_BASE}/logs/client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ logs: logsToSend }),
    });
  } catch (err) {
    // Backend'e gönderilemezse console'a yaz
    if (isDev) {
      console.warn('[Logger] Backend\'e gönderilemedi:', err);
    }
    // Logları geri kuyruğa ekle (max 50)
    logQueue = [...logsToSend, ...logQueue].slice(0, 50);
  }
};

/**
 * Log kuyruğuna ekle
 */
const queueLog = (entry) => {
  logQueue.push(entry);

  // Max boyuta ulaşıldıysa hemen gönder
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    flushLogs();
    return;
  }

  // Timeout ile batch gönderim
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushLogs();
      flushTimeout = null;
    }, FLUSH_INTERVAL);
  }
};

/**
 * Logger ana objesi
 */
const logger = {
  /**
   * Debug log - sadece development'ta
   */
  debug: (message, data = {}) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },

  /**
   * Info log
   */
  info: (message, data = {}) => {
    const entry = createLogEntry('INFO', message, data);
    if (isDev) {
      console.info(`[INFO] ${message}`, data);
    }
    queueLog(entry);
  },

  /**
   * Warning log
   */
  warn: (message, data = {}) => {
    const entry = createLogEntry('WARN', message, data);
    if (isDev) {
      console.warn(`[WARN] ${message}`, data);
    }
    queueLog(entry);
  },

  /**
   * Error log - her zaman kaydedilir
   */
  error: (message, error = null, data = {}) => {
    const errorData = {
      ...data,
      errorMessage: error?.message || null,
      errorStack: error?.stack || null,
      errorName: error?.name || null,
    };

    const entry = createLogEntry('ERROR', message, errorData);

    // Her zaman console'a yaz
    console.error(`[ERROR] ${message}`, error, data);

    // Hemen gönder (error önemli)
    logQueue.push(entry);
    flushLogs();
  },

  /**
   * API hata logu
   */
  apiError: (endpoint, status, message, responseData = null) => {
    logger.error(`API Hatası: ${endpoint}`, null, {
      endpoint,
      status,
      responseMessage: message,
      responseData,
    });
  },

  /**
   * Kullanıcı aksiyonu logu
   */
  action: (action, details = {}) => {
    logger.info(`Kullanıcı Aksiyonu: ${action}`, { action, ...details });
  },

  /**
   * Sayfa gezinme logu
   */
  pageView: (page) => {
    logger.info(`Sayfa Görüntülendi: ${page}`, { page });
  },

  /**
   * Sayfa kapanırken logları gönder
   */
  flush: flushLogs,
};

// Sayfa kapanırken logları gönder
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logQueue.length > 0) {
      // Sync request (son çare)
      const token = localStorage.getItem('authToken');
      navigator.sendBeacon(
        `${API_BASE}/logs/client`,
        JSON.stringify({ logs: logQueue })
      );
    }
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    logger.error('Uncaught Error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', event.reason, {
      type: 'unhandledrejection',
    });
  });
}

export default logger;
