/**
 * Notification Context
 * Bildirim yönetimi ve yeni bildirim tespiti
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/dataService';

const NotificationContext = createContext(null);

// Polling interval (15 saniye - daha hızlı yeni bildirim tespiti için)
const POLL_INTERVAL = 15000;

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const pollRef = useRef(null);
  const lastNotificationIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Bildirimleri yükle
  const loadNotifications = useCallback(async (showToasts = false) => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const [notifs, countData] = await Promise.all([
        getNotifications({ limit: 50 }),
        getUnreadNotificationCount(),
      ]);
      
      const newNotifications = notifs || [];
      
      // Yeni bildirim tespiti (ilk yükleme değilse ve toast gösterilecekse)
      if (showToasts && !isFirstLoadRef.current && newNotifications.length > 0) {
        const lastKnownId = lastNotificationIdRef.current;
        
        // En yeni bildirimin ID'sini karşılaştır
        if (lastKnownId && newNotifications[0].id !== lastKnownId) {
          // Yeni bildirimler var
          const lastIndex = newNotifications.findIndex(n => n.id === lastKnownId);
          const brandNewNotifications = lastIndex > 0 
            ? newNotifications.slice(0, lastIndex)
            : newNotifications.slice(0, 3); // Max 3 toast
          
          // Her yeni bildirim için toast göster
          brandNewNotifications.reverse().forEach((notif, index) => {
            setTimeout(() => {
              toast?.showNotificationToast?.(notif);
            }, index * 300); // Ardışık toastlar için küçük gecikme
          });
        }
      }
      
      // En son bildirim ID'sini kaydet
      if (newNotifications.length > 0) {
        lastNotificationIdRef.current = newNotifications[0].id;
      }
      
      // İlk yükleme bayrağını kaldır
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
      }
      
      setNotifications(newNotifications);
      setUnreadCount(countData?.count || 0);
      setError(null);
    } catch (err) {
      console.error('Notifications load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Polling için bildirim kontrolü
  const checkForNewNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // Sadece yeni bildirimleri kontrol et
      const [notifs, countData] = await Promise.all([
        getNotifications({ limit: 10 }),
        getUnreadNotificationCount(),
      ]);
      
      const newNotifications = notifs || [];
      const newUnreadCount = countData?.count || 0;
      
      // Yeni bildirim var mı?
      if (newNotifications.length > 0 && lastNotificationIdRef.current) {
        const latestId = newNotifications[0].id;
        
        if (latestId !== lastNotificationIdRef.current) {
          // Yeni bildirim(ler) var - tam yükleme yap ve toast göster
          await loadNotifications(true);
          return;
        }
      }
      
      // Sadece count güncelle
      setUnreadCount(newUnreadCount);
    } catch (err) {
      console.error('Check notifications error:', err);
    }
  }, [isAuthenticated, loadNotifications]);

  // Tek bildirimi okundu işaretle
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  }, []);

  // Tümünü okundu işaretle
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast?.success?.('Tüm bildirimler okundu işaretlendi');
    } catch (err) {
      console.error('Mark all read error:', err);
      toast?.error?.('Bildirimler işaretlenirken hata oluştu');
    }
  }, [toast]);

  // Bildirimi sil
  const removeNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      
      const notif = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
      toast?.error?.('Bildirim silinirken hata oluştu');
    }
  }, [notifications, toast]);

  // Polling başlat
  useEffect(() => {
    if (isAuthenticated) {
      // İlk yükleme (toast gösterme)
      isFirstLoadRef.current = true;
      loadNotifications(false);
      
      // Polling başlat
      pollRef.current = setInterval(checkForNewNotifications, POLL_INTERVAL);
      
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      };
    } else {
      // Logout olunca temizle
      setNotifications([]);
      setUnreadCount(0);
      lastNotificationIdRef.current = null;
      isFirstLoadRef.current = true;
    }
  }, [isAuthenticated, loadNotifications, checkForNewNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications: () => loadNotifications(false),
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications: () => loadNotifications(false),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
