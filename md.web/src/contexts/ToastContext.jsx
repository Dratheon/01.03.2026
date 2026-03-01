/**
 * Toast Notification Context
 * Anlık bildirimler için global context
 * - 5 saniye görünüp kaybolan toast
 * - Bildirim sesi
 * - Üst ortada konumlanma
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UIIcon } from '../utils/muiIcons';

const ToastContext = createContext(null);

// Bildirim sesi URL (ücretsiz ses)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// Toast türlerine göre ikonlar ve renkler
const TOAST_TYPES = {
  success: { icon: 'check_circle', color: 'var(--color-success)', bgColor: 'rgba(34, 197, 94, 0.1)' },
  error: { icon: 'error', color: 'var(--color-danger)', bgColor: 'rgba(239, 68, 68, 0.1)' },
  warning: { icon: 'warning', color: 'var(--color-warning)', bgColor: 'rgba(245, 158, 11, 0.1)' },
  info: { icon: 'info', color: 'var(--color-info)', bgColor: 'rgba(59, 130, 246, 0.1)' },
  notification: { icon: 'notifications', color: 'var(--color-primary)', bgColor: 'rgba(37, 99, 235, 0.1)' },
};

// Bildirim tiplerine göre toast türü
const getToastTypeFromNotificationType = (notifType) => {
  const successTypes = ['job_completed', 'payment_received', 'task_completed', 'assembly_completed', 'production_completed', 'stock_ready', 'order_delivered', 'offer_approved'];
  const warningTypes = ['stock_low', 'measure_rescheduled', 'assembly_rescheduled', 'order_rescheduled'];
  const errorTypes = ['job_cancelled', 'offer_rejected'];
  const infoTypes = ['task_assigned', 'document_uploaded', 'measure_scheduled', 'assembly_scheduled'];
  
  if (successTypes.includes(notifType)) return 'success';
  if (warningTypes.includes(notifType)) return 'warning';
  if (errorTypes.includes(notifType)) return 'error';
  if (infoTypes.includes(notifType)) return 'info';
  return 'notification';
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const audioRef = useRef(null);
  const toastIdCounter = useRef(0);

  // Ses elementini oluştur
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Ses çal
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay engellendi, sessiz devam et
      });
    }
  }, []);

  // Toast ekle
  const addToast = useCallback((message, options = {}) => {
    const {
      type = 'notification',
      title = null,
      duration = 5000,
      playNotificationSound = true,
      link = null,
      icon = null,
    } = options;

    const id = ++toastIdCounter.current;
    const toastType = TOAST_TYPES[type] || TOAST_TYPES.notification;

    const newToast = {
      id,
      message,
      title,
      type,
      icon: icon || toastType.icon,
      color: toastType.color,
      bgColor: toastType.bgColor,
      link,
      createdAt: Date.now(),
    };

    setToasts(prev => [...prev, newToast]);

    // Ses çal
    if (playNotificationSound) {
      playSound();
    }

    // Otomatik kaldır
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [playSound]);

  // Toast kaldır
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Bildirimden toast oluştur
  const showNotificationToast = useCallback((notification) => {
    const type = getToastTypeFromNotificationType(notification.type);
    
    addToast(notification.message, {
      type,
      title: notification.title,
      link: notification.link,
      icon: notification.icon,
      playNotificationSound: true,
    });
  }, [addToast]);

  // Kısa yol fonksiyonları
  const success = useCallback((message, options = {}) => 
    addToast(message, { ...options, type: 'success' }), [addToast]);
  
  const error = useCallback((message, options = {}) => 
    addToast(message, { ...options, type: 'error' }), [addToast]);
  
  const warning = useCallback((message, options = {}) => 
    addToast(message, { ...options, type: 'warning' }), [addToast]);
  
  const info = useCallback((message, options = {}) => 
    addToast(message, { ...options, type: 'info' }), [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    showNotificationToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container Bileşeni - BrowserRouter içinde olduğu için useNavigate kullanabilir
const ToastContainer = ({ toasts, removeToast }) => {
  const navigate = useNavigate();

  const handleClick = (toast) => {
    if (toast.link) {
      navigate(toast.link);
    }
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast-item"
          style={{ '--toast-color': toast.color, '--toast-bg': toast.bgColor }}
          onClick={() => handleClick(toast)}
        >
          <div className="toast-icon">
            <UIIcon name={toast.icon} />
          </div>
          <div className="toast-content">
            {toast.title && <div className="toast-title">{toast.title}</div>}
            <div className="toast-message">{toast.message}</div>
          </div>
          <button 
            className="toast-close"
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
          >
            <UIIcon name="close" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export default ToastContext;
