import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMobile } from '../contexts/MobileContext';
import { useNotifications } from '../contexts/NotificationContext';
import { NavIcon, UIIcon } from '../utils/muiIcons';

// Zaman formatı
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return date.toLocaleDateString('tr-TR');
};

const Topbar = ({ title }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isMobile, toggleSidebar } = useMobile();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  
  const [query, setQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Dışarı tıklayınca menüleri kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = () => {
    if (!user?.displayName) return 'U';
    const parts = user.displayName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.displayName.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Yönetici',
      manager: 'Müdür',
      user: 'Kullanıcı',
    };
    return labels[role] || role || 'Kullanıcı';
  };

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      setShowNotifications(false);
    }
  };

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
      document_uploaded: 'upload_file',
      customer_created: 'person_add',
      stock_low: 'inventory',
      system: 'notifications',
    };
    return icons[type] || 'notifications';
  };

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
      document_uploaded: 'var(--color-info)',
      customer_created: 'var(--color-primary)',
      stock_low: 'var(--color-warning)',
      system: 'var(--color-secondary)',
    };
    return colors[type] || 'var(--color-secondary)';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Menüyü aç"
          type="button"
        >
          <UIIcon name="menu" />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <span className="topbar-search-icon">
            <UIIcon name="search" />
          </span>
          <input
            type="search"
            placeholder="Ara..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Uygulama içi arama"
          />
        </div>

        {/* Notifications */}
        <div className="topbar-notifications" ref={notifRef}>
          <button
            className="topbar-notif-btn"
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Bildirimler"
          >
            <UIIcon name="notifications" />
            {unreadCount > 0 && (
              <span className="topbar-notif-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="topbar-notif-dropdown">
              <div className="topbar-notif-header">
                <span className="topbar-notif-title">
                  <UIIcon name="notifications" style={{ fontSize: 18, marginRight: 6 }} />
                  Bildirimler
                  {unreadCount > 0 && (
                    <span className="topbar-notif-count">{unreadCount} yeni</span>
                  )}
                </span>
                <div className="topbar-notif-actions">
                  {unreadCount > 0 && (
                    <button 
                      className="topbar-notif-action-btn"
                      onClick={markAllAsRead}
                      title="Tümünü okundu işaretle"
                    >
                      <UIIcon name="done_all" />
                    </button>
                  )}
                  <button 
                    className="topbar-notif-action-btn"
                    onClick={refreshNotifications}
                    title="Yenile"
                  >
                    <UIIcon name="refresh" />
                  </button>
                </div>
              </div>

              <div className="topbar-notif-list">
                {notifications.length === 0 ? (
                  <div className="topbar-notif-empty">
                    <UIIcon name="notifications_off" style={{ fontSize: 40, opacity: 0.3 }} />
                    <span>Bildirim bulunmuyor</span>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notif => (
                    <div
                      key={notif.id}
                      className={`topbar-notif-item ${!notif.read ? 'unread' : ''}`}
                    >
                      <div 
                        className="topbar-notif-icon"
                        style={{ background: `${getNotificationColor(notif.type)}20`, color: getNotificationColor(notif.type) }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <UIIcon name={getNotificationIcon(notif.type)} />
                      </div>
                      <div 
                        className="topbar-notif-content"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="topbar-notif-item-title">{notif.title}</div>
                        <div className="topbar-notif-message">{notif.message}</div>
                        <div className="topbar-notif-time">{formatTimeAgo(notif.createdAt)}</div>
                      </div>
                      {!notif.read && (
                        <button
                          className="topbar-notif-read-btn"
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          title="Okundu işaretle"
                        >
                          <UIIcon name="check" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="topbar-notif-footer">
                  <button 
                    className="topbar-notif-view-all"
                    onClick={() => { navigate('/bildirimler'); setShowNotifications(false); }}
                  >
                    Tüm bildirimleri görüntüle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="topbar-user-wrapper" ref={menuRef}>
          <button
            className="topbar-user"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="topbar-user-avatar">{getInitials()}</div>
            <div className="topbar-user-info">
              <div className="topbar-user-name">{user?.displayName || 'Kullanıcı'}</div>
              <div className="topbar-user-role">{getRoleLabel(user?.role)}</div>
            </div>
            <span className="topbar-user-chevron">
              <UIIcon name={showUserMenu ? 'expand_less' : 'expand_more'} />
            </span>
          </button>
          {showUserMenu && (
            <div className="topbar-user-menu">
              <div className="topbar-user-menu-header">
                <span className="topbar-user-menu-icon">
                  <UIIcon name="person" />
                </span>
                <div>
                  <div className="topbar-user-menu-name">{user?.displayName}</div>
                  <div className="topbar-user-menu-username">@{user?.username}</div>
                </div>
              </div>
              <div className="topbar-user-menu-divider"></div>
              <button
                className="topbar-user-menu-item"
                onClick={() => { navigate('/aktiviteler'); setShowUserMenu(false); }}
              >
                <NavIcon name="monitoring" />
                Aktivite Logları
              </button>
              <button
                className="topbar-user-menu-item"
                onClick={() => { navigate('/ayarlar'); setShowUserMenu(false); }}
              >
                <NavIcon name="settings" />
                Ayarlar
              </button>
              <div className="topbar-user-menu-divider"></div>
              <button
                className="topbar-user-menu-item danger"
                onClick={handleLogout}
              >
                <UIIcon name="logout" />
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
