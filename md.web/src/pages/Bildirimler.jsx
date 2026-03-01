/**
 * Bildirimler Sayfası
 * Tüm bildirimleri listeler, filtreler ve yönetir
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { UIIcon } from '../utils/muiIcons';

// Zaman formatı
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Bildirim tipi etiketleri
const NOTIFICATION_TYPE_LABELS = {
  job_created: 'Yeni İş',
  job_completed: 'İş Tamamlandı',
  job_cancelled: 'İş İptal',
  payment_received: 'Ödeme',
  measure_scheduled: 'Ölçü Randevusu',
  measure_rescheduled: 'Ölçü Güncellendi',
  assembly_scheduled: 'Montaj Randevusu',
  assembly_completed: 'Montaj Tamamlandı',
  assembly_rescheduled: 'Montaj Güncellendi',
  offer_sent: 'Teklif Gönderildi',
  offer_approved: 'Teklif Onaylandı',
  offer_rejected: 'Teklif Reddedildi',
  production_started: 'Üretim Başladı',
  production_completed: 'Üretim Tamamlandı',
  stock_ready: 'Stok Hazır',
  stock_low: 'Düşük Stok',
  task_assigned: 'Görev Atandı',
  task_completed: 'Görev Tamamlandı',
  order_created: 'Sipariş Oluşturuldu',
  order_delivered: 'Sipariş Teslim',
  document_uploaded: 'Belge Yüklendi',
  customer_created: 'Yeni Müşteri',
  system: 'Sistem',
};

// Bildirim tipi renkleri
const getNotificationColor = (type) => {
  const colors = {
    job_created: 'var(--color-primary)',
    job_completed: 'var(--color-success)',
    job_cancelled: 'var(--color-danger)',
    payment_received: 'var(--color-success)',
    task_assigned: 'var(--color-info)',
    task_completed: 'var(--color-success)',
    order_created: 'var(--color-primary)',
    order_delivered: 'var(--color-success)',
    assembly_scheduled: 'var(--color-warning)',
    assembly_completed: 'var(--color-success)',
    measure_scheduled: 'var(--color-info)',
    document_uploaded: 'var(--color-info)',
    customer_created: 'var(--color-primary)',
    stock_low: 'var(--color-warning)',
    stock_ready: 'var(--color-success)',
    production_started: 'var(--color-warning)',
    production_completed: 'var(--color-success)',
    offer_sent: 'var(--color-primary)',
    offer_approved: 'var(--color-success)',
    offer_rejected: 'var(--color-danger)',
  };
  return colors[type] || 'var(--color-secondary)';
};

// Bildirim ikonu
const getNotificationIcon = (type) => {
  const icons = {
    job_created: 'assignment',
    job_completed: 'check_circle',
    job_cancelled: 'cancel',
    payment_received: 'payments',
    task_assigned: 'assignment_ind',
    task_completed: 'task_alt',
    order_created: 'shopping_cart',
    order_delivered: 'local_shipping',
    assembly_scheduled: 'event',
    assembly_completed: 'build',
    measure_scheduled: 'straighten',
    document_uploaded: 'upload_file',
    customer_created: 'person_add',
    stock_low: 'inventory',
    stock_ready: 'inventory_2',
    production_started: 'precision_manufacturing',
    production_completed: 'check_circle',
    offer_sent: 'request_quote',
    offer_approved: 'handshake',
    offer_rejected: 'thumb_down',
  };
  return icons[type] || 'notifications';
};

const Bildirimler = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    refreshNotifications 
  } = useNotifications();
  
  const [filter, setFilter] = useState('all'); // all, unread

  // Filtrelenmiş bildirimler
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  // Okunmamış sayısı
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, [notifications]);

  // Bildirimi tıkla
  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Okundu/okunmadı toggle
  const toggleRead = (e, notif) => {
    e.stopPropagation();
    if (notif.read) {
      // Okunmadı yap - şimdilik desteklenmıyor, API'de read: false göndermek gerekir
      // markAsRead(notif.id); // Bu sadece okundu yapar
    } else {
      markAsRead(notif.id);
    }
  };

  // Bildirimi sil
  const handleDelete = (e, id) => {
    e.stopPropagation();
    removeNotification(id);
  };

  return (
    <div className="bildirimler-page">
      {/* Header */}
      <div className="bildirimler-header">
        <div className="bildirimler-title-section">
          <h1 className="bildirimler-title">
            <UIIcon name="notifications" />
            Bildirimler
          </h1>
          {unreadCount > 0 && (
            <span className="bildirimler-badge">{unreadCount} okunmamış</span>
          )}
        </div>
        
        <div className="bildirimler-actions">
          <button 
            className="btn btn-outline"
            onClick={refreshNotifications}
            disabled={loading}
          >
            <UIIcon name="refresh" />
            Yenile
          </button>
          {unreadCount > 0 && (
            <button 
              className="btn btn-primary"
              onClick={markAllAsRead}
            >
              <UIIcon name="done_all" />
              Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bildirimler-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tümü ({notifications.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Okunmamış ({unreadCount})
        </button>
      </div>

      {/* Content */}
      <div className="bildirimler-content">
        {loading ? (
          <div className="bildirimler-loading">
            <div className="spinner" />
            <span>Yükleniyor...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bildirimler-empty">
            <UIIcon name="notifications_off" />
            <h3>Bildirim Yok</h3>
            <p>
              {filter === 'unread' 
                ? 'Tüm bildirimlerinizi okudunuz!' 
                : 'Henüz bildirim bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="bildirimler-list">
            {filteredNotifications.map(notif => {
              const color = getNotificationColor(notif.type);
              const icon = notif.icon || getNotificationIcon(notif.type);
              const typeLabel = NOTIFICATION_TYPE_LABELS[notif.type] || notif.type;
              
              return (
                <div
                  key={notif.id}
                  className={`bildirim-card ${!notif.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div 
                    className="bildirim-icon"
                    style={{ background: `${color}15`, color }}
                  >
                    <UIIcon name={icon} />
                  </div>
                  
                  <div className="bildirim-body">
                    <div className="bildirim-header">
                      <span className="bildirim-type" style={{ color }}>
                        {typeLabel}
                      </span>
                      <span className="bildirim-time">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <h4 className="bildirim-title">{notif.title}</h4>
                    <p className="bildirim-message">{notif.message}</p>
                    {notif.link && (
                      <span className="bildirim-link">
                        <UIIcon name="arrow_forward" /> Detayları Gör
                      </span>
                    )}
                  </div>
                  
                  <div className="bildirim-actions">
                    {!notif.read && (
                      <button
                        className="bildirim-action-btn"
                        onClick={(e) => toggleRead(e, notif)}
                        title="Okundu işaretle"
                      >
                        <UIIcon name="check" />
                      </button>
                    )}
                    <button
                      className="bildirim-action-btn delete"
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Sil"
                    >
                      <UIIcon name="delete" />
                    </button>
                  </div>
                  
                  {!notif.read && <div className="bildirim-unread-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bildirimler;
