import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, normalizePath } from '../constants/navigation';
import { NavIcon } from '../utils/muiIcons';
import { useAuth, checkPermission } from '../contexts/AuthContext';
import { useMobile } from '../contexts/MobileContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isMobile, sidebarOpen, closeSidebar } = useMobile();
  const activePath = useMemo(() => normalizePath(location.pathname), [location.pathname]);

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const [openGroups, setOpenGroups] = useState(() => {
    const stored = localStorage.getItem('navOpenGroups');
    return stored ? JSON.parse(stored) : {};
  });

  // Mobilde sayfa değişince sidebar'ı kapat
  useEffect(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [location.pathname, isMobile, closeSidebar]);

  // Filtrelenmiş navigation items - immutable ve doğru dependency ile
  const filteredNavItems = useMemo(() => {
    // useMemo içinde hesapla - her render'da yeniden array oluşturmayı önle
    const permissions = user?.permissions || [];
    const role = user?.role || 'user';
    
    // Permission kontrolü için helper (useMemo içinde tanımlı)
    const hasPermission = (permission) => {
      if (!permission) return true;
      if (!user) return false;
      return checkPermission(permissions, role, permission);
    };

    // Menü öğelerini yetkilere göre filtrele (immutable)
    const filterItems = (items) => {
      const result = [];
      for (const item of items) {
        // Ana öğe yetkisi var mı?
        if (!hasPermission(item.permission)) continue;
        
        // Children varsa onları da filtrele
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterItems(item.children);
          // Hiç child kalmadıysa parent'ı da gösterme
          if (filteredChildren.length === 0) continue;
          // Immutable: yeni obje oluştur
          result.push({ ...item, children: filteredChildren });
        } else {
          // Immutable: yeni obje oluştur
          result.push({ ...item });
        }
      }
      return result;
    };

    // NAV_ITEMS'ı filtrele
    return NAV_ITEMS.map(section => ({
      ...section,
      items: filterItems(section.items)
    })).filter(section => section.items.length > 0);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed);
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem('navOpenGroups', JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const parentPaths = findParentPaths(activePath);
    if (parentPaths.length > 0) {
      setOpenGroups((prev) => {
        const newGroups = { ...prev };
        parentPaths.forEach(p => { newGroups[p] = true; });
        return newGroups;
      });
    }
  }, [activePath]);

  const toggleGroup = (path) => {
    setOpenGroups((prev) => {
      const newGroups = { ...prev };
      // Aktif child varsa, kapatmayı engelleme (kullanıcı manuel toggle edebilir)
      // Ama açıldığında açık kalsın
      newGroups[path] = !newGroups[path];
      return newGroups;
    });
  };

  // Sidebar class name
  const sidebarClass = useMemo(() => {
    const classes = ['sidebar'];
    if (collapsed) classes.push('collapsed');
    if (isMobile && sidebarOpen) classes.push('mobile-open');
    return classes.join(' ');
  }, [collapsed, isMobile, sidebarOpen]);

  return (
    <aside className={sidebarClass} id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">İT</div>
          <div className="sidebar-logo-text">İş Takip Paneli</div>
        </div>
        <button
          className="sidebar-toggle"
          id="sidebarToggle"
          type="button"
          onClick={() => {
            if (isMobile) {
              closeSidebar();
            } else {
              setCollapsed((value) => !value);
            }
          }}
          aria-label={isMobile ? "Menüyü kapat" : "Kenar çubuğunu küçült"}
        >
          {isMobile ? '✕' : '☰'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {filteredNavItems.map((section) => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) =>
              item.collapsible ? (
                <CollapsibleItem
                  key={item.path}
                  item={item}
                  openGroups={openGroups}
                  activePath={activePath}
                  onToggle={toggleGroup}
                  level={1}
                />
              ) : (
                <NavLink key={item.path} item={item} isActive={activePath === normalizePath(item.path)} />
              )
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

const NavLink = ({ item, isActive }) => (
  <div className="nav-item">
    <Link
      to={item.path}
      className={`nav-link ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="nav-link-icon">
        <NavIcon name={item.icon} />
      </span>
      <span className="nav-link-text">{item.label}</span>
    </Link>
  </div>
);

const CollapsibleItem = ({ item, openGroups, activePath, onToggle, level = 1 }) => {
  const isParentActive = normalizePath(item.path) === activePath;
  const hasActiveChild = checkActiveDescendant(item, activePath);
  
  // Kullanıcı manuel toggle etmişse onu kullan, yoksa aktif child varsa otomatik açık olsun
  const userToggled = openGroups[item.path] !== undefined;
  const shouldAutoOpen = hasActiveChild || isParentActive;
  const open = userToggled ? openGroups[item.path] : shouldAutoOpen;

  return (
    <div className={`nav-collapsible ${open ? 'open' : ''}`} style={{ marginLeft: level > 1 ? 8 : 0 }}>
      <button
        type="button"
        className={`nav-collapsible-trigger ${isParentActive ? 'active' : ''}`}
        onClick={() => onToggle(item.path)}
        aria-expanded={open}
        style={{ paddingLeft: level > 1 ? 24 : undefined }}
      >
        <span className="nav-collapsible-icon">
          {item.icon ? <NavIcon name={item.icon} /> : (level > 1 ? '◦' : '•')}
        </span>
        <span className="nav-collapsible-text">{item.label}</span>
        <span className="nav-collapsible-arrow">▸</span>
      </button>
      {open && (
        <div className="nav-collapsible-content">
          {item.children?.map((child) => {
            // Eğer child'ın da children'ı varsa, nested collapsible yap
            if (child.children && child.children.length > 0) {
              return (
                <CollapsibleItem
                  key={child.path}
                  item={child}
                  openGroups={openGroups}
                  activePath={activePath}
                  onToggle={onToggle}
                  level={level + 1}
                />
              );
            }
            
            const childActive = normalizePath(child.path) === activePath;
            return (
              <div className="nav-item" key={child.path}>
                <Link
                  to={child.path}
                  className={`nav-link ${childActive ? 'active' : ''}`}
                  aria-current={childActive ? 'page' : undefined}
                  style={{ paddingLeft: level > 1 ? 32 : undefined }}
                >
                  <span className="nav-link-icon">{level > 1 ? '›' : '•'}</span>
                  <span className="nav-link-text">{child.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Aktif child veya grandchild var mı kontrol et
const checkActiveDescendant = (item, activePath) => {
  if (!item.children) return false;
  
  for (const child of item.children) {
    if (normalizePath(child.path) === activePath) return true;
    if (child.children && checkActiveDescendant(child, activePath)) return true;
  }
  return false;
};

// Tüm parent path'leri bul (3 seviye için)
const findParentPaths = (path) => {
  const normalized = normalizePath(path);
  const parents = [];

  NAV_ITEMS.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          if (normalizePath(child.path) === normalized) {
            parents.push(item.path);
          }
          if (child.children) {
            child.children.forEach((grandchild) => {
              if (normalizePath(grandchild.path) === normalized) {
                parents.push(item.path);
                parents.push(child.path);
              }
            });
          }
        });
      }
    });
  });

  return parents;
};

export default Sidebar;
