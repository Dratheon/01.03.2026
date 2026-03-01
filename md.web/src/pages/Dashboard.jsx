import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardWidget from '../components/DashboardWidget';
import Modal from '../components/Modal';
import { StatusIcon } from '../utils/muiIcons';
import { useAuth } from '../contexts/AuthContext';
import {
  getWidgetOverview,
  getWidgetMeasureStatus,
  getWidgetProductionStatus,
  getWidgetAssemblyStatus,
  getWidgetStockAlerts,
  getWidgetWeeklySummary,
  getWidgetFinancialSummary,
  getWidgetTasksSummary,
  getWidgetRecentActivities,
} from '../services/dataService';

// Widget Tanimlari - Her widget'in hangi izni gerektirdigini belirtiyoruz
const WIDGET_DEFINITIONS = {
  overview: {
    id: 'overview',
    title: 'Genel Bakis',
    icon: '📊',
    category: 'yonetici',
    defaultSize: 'wide',
    color: 'primary',
    description: 'Aktif isler, musteriler ve randevular',
    permission: 'dashboard.view', // Herkes gorebilir
  },
  measureStatus: {
    id: 'measureStatus',
    title: 'Olcu Durumu',
    icon: '📐',
    category: 'organizator',
    defaultSize: 'small',
    color: 'info',
    description: 'Olcu asamasindaki islerin durumu',
    permission: 'jobs.list', // Is listesi yetkisi olan gorebilir
  },
  productionStatus: {
    id: 'productionStatus',
    title: 'Uretim Durumu',
    icon: '🏭',
    category: 'organizator',
    defaultSize: 'small',
    color: 'warning',
    description: 'Uretim siparislerinin durumu',
    permission: 'dashboard.production', // Uretim widget yetkisi
  },
  assemblyStatus: {
    id: 'assemblyStatus',
    title: 'Montaj Durumu',
    icon: '🔧',
    category: 'organizator',
    defaultSize: 'small',
    color: 'success',
    description: 'Montaj gorevlerinin durumu',
    permission: 'dashboard.assembly', // Montaj widget yetkisi
  },
  stockAlerts: {
    id: 'stockAlerts',
    title: 'Stok Uyarilari',
    icon: '📦',
    category: 'stok',
    defaultSize: 'medium',
    color: 'danger',
    description: 'Kritik ve dusuk stok uyarilari',
    permission: 'dashboard.stock', // Stok widget yetkisi
  },
  weeklySummary: {
    id: 'weeklySummary',
    title: 'Haftalik Ozet',
    icon: '📈',
    category: 'yonetici',
    defaultSize: 'medium',
    color: 'success',
    description: 'Bu hafta yapilan isler',
    permission: 'dashboard.view', // Herkes gorebilir
  },
  financialSummary: {
    id: 'financialSummary',
    title: 'Finansal Ozet',
    icon: '💰',
    category: 'muhasebe',
    defaultSize: 'medium',
    color: 'primary',
    description: 'Gelir ve tahsilat durumu',
    permission: 'dashboard.finance', // Finans widget yetkisi - KRITIK
  },
  tasksSummary: {
    id: 'tasksSummary',
    title: 'Gorev Durumu',
    icon: '✅',
    category: 'yonetici',
    defaultSize: 'small',
    color: 'info',
    description: 'Genel gorev istatistikleri',
    permission: 'dashboard.view', // Herkes gorebilir
  },
  recentActivities: {
    id: 'recentActivities',
    title: 'Son Aktiviteler',
    icon: '🕐',
    category: 'yonetici',
    defaultSize: 'large',
    color: 'default',
    description: 'Son is hareketleri',
    permission: 'activities.view', // Aktivite yetkisi
  },
};

const WIDGET_CATEGORIES = [
  { id: 'all', name: 'Tumu' },
  { id: 'yonetici', name: 'Yonetici' },
  { id: 'organizator', name: 'Organizator' },
  { id: 'muhasebe', name: 'Muhasebe' },
  { id: 'stok', name: 'Stok' },
];

// Default widget layout
const DEFAULT_LAYOUT = [
  { id: 'overview', size: 'wide' },
  { id: 'measureStatus', size: 'small' },
  { id: 'productionStatus', size: 'small' },
  { id: 'assemblyStatus', size: 'small' },
  { id: 'tasksSummary', size: 'small' },
  { id: 'stockAlerts', size: 'medium' },
  { id: 'weeklySummary', size: 'medium' },
  { id: 'financialSummary', size: 'medium' },
  { id: 'recentActivities', size: 'large' },
];

const STORAGE_KEY = 'dashboard_layout';

// Para formatlama
const formatMoney = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 });
};

// Tarih formatlama
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} dk once`;
  if (diffHours < 24) return `${diffHours} saat once`;
  if (diffDays === 0) return 'Bugun';
  if (diffDays === 1) return 'Dun';
  return `${diffDays} gun once`;
};

const Dashboard = () => {
  const { hasPermission } = useAuth();
  
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const [widgetData, setWidgetData] = useState({});
  const [loadingWidgets, setLoadingWidgets] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Layout kaydet
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  // Widget verilerini yukle
  const loadWidgetData = useCallback(async (widgetId) => {
    setLoadingWidgets((prev) => ({ ...prev, [widgetId]: true }));
    try {
      let data = null;
      switch (widgetId) {
        case 'overview':
          data = await getWidgetOverview();
          break;
        case 'measureStatus':
          data = await getWidgetMeasureStatus();
          break;
        case 'productionStatus':
          data = await getWidgetProductionStatus();
          break;
        case 'assemblyStatus':
          data = await getWidgetAssemblyStatus();
          break;
        case 'stockAlerts':
          data = await getWidgetStockAlerts();
          break;
        case 'weeklySummary':
          data = await getWidgetWeeklySummary();
          break;
        case 'financialSummary':
          data = await getWidgetFinancialSummary();
          break;
        case 'tasksSummary':
          data = await getWidgetTasksSummary();
          break;
        case 'recentActivities':
          data = await getWidgetRecentActivities();
          break;
        default:
          data = {};
      }
      setWidgetData((prev) => ({ ...prev, [widgetId]: data }));
    } catch (err) {
      console.error(`Widget ${widgetId} yukleme hatasi:`, err);
      setWidgetData((prev) => ({ ...prev, [widgetId]: { error: err.message } }));
    } finally {
      setLoadingWidgets((prev) => ({ ...prev, [widgetId]: false }));
    }
  }, []);

  // Tum widgetlari yukle
  const refreshAll = useCallback(() => {
    const uniqueIds = [...new Set(layout.map((w) => w.id))];
    uniqueIds.forEach((id) => loadWidgetData(id));
    setLastRefresh(new Date());
  }, [layout, loadWidgetData]);

  // Ilk yukleme + 30 saniyede bir otomatik yenileme
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Widget ekle
  const addWidget = (widgetId) => {
    const def = WIDGET_DEFINITIONS[widgetId];
    if (!def) return;
    if (layout.some((w) => w.id === widgetId)) {
      alert('Bu widget zaten ekli!');
      return;
    }
    setLayout((prev) => [...prev, { id: widgetId, size: def.defaultSize }]);
    setShowAddModal(false);
  };

  // Widget kaldir
  const removeWidget = (widgetId) => {
    setLayout((prev) => prev.filter((w) => w.id !== widgetId));
  };

  // Widget boyut degistir
  const resizeWidget = (widgetId, newSize) => {
    setLayout((prev) => prev.map((w) => (w.id === widgetId ? { ...w, size: newSize } : w)));
  };

  // Surukleme islemleri
  const handleDrop = (draggedId, targetId) => {
    const draggedIndex = layout.findIndex((w) => w.id === draggedId);
    const targetIndex = layout.findIndex((w) => w.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const newLayout = [...layout];
    const [removed] = newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, removed);
    setLayout(newLayout);
  };

  // Layoutu sifirla
  const resetLayout = () => {
    if (window.confirm('Layout varsayilana sifirlanacak. Emin misiniz?')) {
      setLayout(DEFAULT_LAYOUT);
    }
  };

  // Mevcut widgetlarin IDleri
  const activeWidgetIds = useMemo(() => new Set(layout.map((w) => w.id)), [layout]);

  // Filtrelenmis widget tanimlari (ekleme modali icin) - Permission kontrolu ile
  const filteredDefinitions = useMemo(() => {
    return Object.values(WIDGET_DEFINITIONS).filter((def) => {
      // Permission kontrolu - izni yoksa gosterme
      if (def.permission && !hasPermission(def.permission)) return false;
      if (categoryFilter !== 'all' && def.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, hasPermission]);

  // Widget iceriklerini renderla
  const renderWidgetContent = (widgetId) => {
    const data = widgetData[widgetId];
    const loading = loadingWidgets[widgetId];

    if (loading) return null;
    if (!data) return <div className="widget-empty"><div className="widget-empty-text">Veri bekleniyor...</div></div>;
    if (data.error) return null;

    switch (widgetId) {
      case 'overview':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div className="widget-stat">
              <div className="widget-stat-icon primary"><StatusIcon icon="assignment" /></div>
              <div className="widget-stat-content">
                <div className="widget-stat-value">{data.activeJobs || 0}</div>
                <div className="widget-stat-label">Aktif Is</div>
              </div>
            </div>
            <div className="widget-stat">
              <div className="widget-stat-icon success"><StatusIcon icon="trending_up" /></div>
              <div className="widget-stat-content">
                <div className="widget-stat-value">{data.monthJobs || 0}</div>
                <div className="widget-stat-label">Bu Ay Yeni</div>
              </div>
            </div>
            <div className="widget-stat">
              <div className="widget-stat-icon info"><StatusIcon icon="groups" /></div>
              <div className="widget-stat-content">
                <div className="widget-stat-value">{data.totalCustomers || 0}</div>
                <div className="widget-stat-label">Toplam Musteri</div>
              </div>
            </div>
            <div className="widget-stat">
              <div className="widget-stat-icon warning"><StatusIcon icon="event" /></div>
              <div className="widget-stat-content">
                <div className="widget-stat-value">{data.todayAppointments || 0}</div>
                <div className="widget-stat-label">Bugun Randevu</div>
              </div>
            </div>
          </div>
        );

      case 'measureStatus':
        const measureCounts = data.counts || {};
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="phone" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Randevu Bekliyor</span>
              <span className="badge badge-warning">{measureCounts.randevu_bekliyor || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="event" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Randevu Alindi</span>
              <span className="badge badge-info">{measureCounts.randevu_alindi || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="straighten" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Olcu Alindi</span>
              <span className="badge badge-success">{measureCounts.olcu_alindi || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="straighten" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Teknik Cizim</span>
              <span className="badge badge-primary">{measureCounts.teknik_cizim || 0}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Toplam</span>
              <span style={{ fontWeight: 700 }}>{data.total || 0}</span>
            </div>
          </div>
        );

      case 'productionStatus':
        const prodCounts = data.counts || {};
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="hourglass_empty" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Bekleyen</span>
              <span className="badge badge-secondary">{prodCounts.pending || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="inventory_2" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Siparis Verildi</span>
              <span className="badge badge-info">{prodCounts.ordered || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="precision_manufacturing" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Uretimde</span>
              <span className="badge badge-primary">{prodCounts.in_production || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="check_circle" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Teslim Edildi</span>
              <span className="badge badge-success">{prodCounts.delivered || 0}</span>
            </div>
            {(prodCounts.overdue || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-danger)' }}>
                <span><StatusIcon icon="warning" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Geciken</span>
                <span className="badge badge-danger">{prodCounts.overdue}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Toplam</span>
              <span style={{ fontWeight: 700 }}>{data.total || 0}</span>
            </div>
          </div>
        );

      case 'assemblyStatus':
        const asmCounts = data.counts || {};
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="hourglass_empty" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Bekleyen</span>
              <span className="badge badge-secondary">{asmCounts.pending || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="event" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Planlandi</span>
              <span className="badge badge-info">{asmCounts.scheduled || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="build" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Devam Ediyor</span>
              <span className="badge badge-primary">{asmCounts.in_progress || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="check_circle" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Tamamlandi</span>
              <span className="badge badge-success">{asmCounts.completed || 0}</span>
            </div>
            {(asmCounts.delayed || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-danger)' }}>
                <span><StatusIcon icon="warning" sx={{ mr: 0.5, verticalAlign: 'middle' }} /> Geciken</span>
                <span className="badge badge-danger">{asmCounts.delayed}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Toplam</span>
              <span style={{ fontWeight: 700 }}>{data.total || 0}</span>
            </div>
          </div>
        );

      case 'stockAlerts':
        const criticalItems = data.critical || [];
        if (criticalItems.length === 0) {
          return <div className="widget-empty"><div className="widget-empty-icon"><StatusIcon icon="check_circle" /></div><div className="widget-empty-text">Kritik stok yok</div></div>;
        }
        return (
          <div className="widget-list">
            {criticalItems.slice(0, 5).map((item, idx) => (
              <Link key={idx} to="/stok/kritik" className="widget-list-item">
                <div className="widget-list-item-left">
                  <div className="widget-list-item-icon" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}><StatusIcon icon="warning" /></div>
                  <div className="widget-list-item-content">
                    <div className="widget-list-item-title">{item.name}</div>
                    <div className="widget-list-item-subtitle">Mevcut: {item.current}</div>
                  </div>
                </div>
                <div className="widget-list-item-right">
                  <span className="badge badge-danger">Kritik</span>
                </div>
              </Link>
            ))}
            {data.criticalCount > 5 && (
              <Link to="/stok/kritik" className="widget-list-item" style={{ justifyContent: 'center', color: 'var(--color-primary)' }}>
                +{data.criticalCount - 5} daha...
              </Link>
            )}
          </div>
        );

      case 'weeklySummary':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-success-bg)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)' }}>{data.completedJobs || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>Tamamlanan Is</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-info-bg)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-info)' }}>{data.measuresTaken || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>Alinan Olcu</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-warning-bg)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-warning)' }}>{data.deliveredProduction || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>Gelen Uretim</div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-primary-bg)', borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>{data.completedAssembly || 0}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>Biten Montaj</div>
            </div>
          </div>
        );

      case 'financialSummary':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 10 }}>
              <span style={{ color: 'var(--color-text-light)' }}>Bu Ay Ciro</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(data.monthRevenue || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-success-bg)', borderRadius: 10 }}>
              <span style={{ color: 'var(--color-success)' }}>Tahsil Edilen</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>{formatMoney(data.collected || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-warning-bg)', borderRadius: 10 }}>
              <span style={{ color: 'var(--color-warning)' }}>Bekleyen</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-warning)' }}>{formatMoney(data.pending || 0)}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-light)' }}>Tahsilat Orani</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{data.collectionRate || 0}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--color-bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.collectionRate || 0}%`, background: 'linear-gradient(90deg, var(--color-success), #4ade80)', borderRadius: 4 }}></div>
              </div>
            </div>
          </div>
        );

      case 'tasksSummary':
        const byStatus = data.byStatus || {};
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="hourglass_empty" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Bekleyen</span>
              <span className="badge badge-warning">{byStatus.todo || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="play_circle" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Devam Eden</span>
              <span className="badge badge-primary">{byStatus.in_progress || 0}</span>
            </div>
            {(byStatus.blocked || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-danger)' }}>
                <span><StatusIcon icon="block" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Bloke</span>
                <span className="badge badge-danger">{byStatus.blocked}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusIcon icon="check_circle" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Tamamlanan</span>
              <span className="badge badge-success">{byStatus.done || 0}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Toplam</span>
              <span style={{ fontWeight: 700 }}>{data.total || 0}</span>
            </div>
          </div>
        );

      case 'recentActivities':
        const activities = data.activities || [];
        if (activities.length === 0) {
          return <div className="widget-empty"><div className="widget-empty-icon"><StatusIcon icon="assignment" /></div><div className="widget-empty-text">Son aktivite yok</div></div>;
        }
        return (
          <div className="widget-list">
            {activities.map((act, idx) => (
              <Link key={idx} to={`/isler/list?job=${act.id}`} className="widget-list-item">
                <div className="widget-list-item-left">
                  <div className="widget-list-item-icon"><StatusIcon icon="assignment" /></div>
                  <div className="widget-list-item-content">
                    <div className="widget-list-item-title">{act.title}</div>
                    <div className="widget-list-item-subtitle">{act.customer}</div>
                  </div>
                </div>
                <div className="widget-list-item-right">
                  <span style={{ fontSize: 11, color: 'var(--color-text-light)' }}>{formatTimeAgo(act.time)}</span>
                </div>
              </Link>
            ))}
          </div>
        );

      default:
        return <div className="widget-empty"><div className="widget-empty-text">Widget icerigi bulunamadi</div></div>;
    }
  };

  return (
    <div>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1 className="dashboard-title">Kontrol Paneli</h1>
          <p className="dashboard-subtitle">Hos geldiniz! Is sureclerinizin genel durumunu goruntuleyebilirsiniz.</p>
        </div>
        <div className="dashboard-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: 'var(--color-text-light)', marginRight: 4 }}>
              Son: {lastRefresh.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {hasPermission('jobs.create') && (
            <Link
              to="/isler/list?openNew=true"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <StatusIcon icon="add" style={{ fontSize: 16 }} /> Yeni İş Başlat
            </Link>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshAll}
            title="Verileri yenile"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <StatusIcon icon="refresh" style={{ fontSize: 16 }} /> Yenile
          </button>
          <button
            type="button"
            className={`btn ${editMode ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <><StatusIcon icon="check" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Duzenlemeyi Bitir</> : <><StatusIcon icon="settings" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Duzenle</>}
          </button>
          {editMode && (
            <>
              <button type="button" className="btn btn-secondary" onClick={resetLayout}>
                <StatusIcon icon="restart_alt" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Sifirla
              </button>
              <button type="button" className="add-widget-btn" onClick={() => setShowAddModal(true)}>
                + Widget Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="dashboard-grid">
        {layout.map((item) => {
          const def = WIDGET_DEFINITIONS[item.id];
          if (!def) return null;
          
          // Permission kontrolü - widget'ın gerektirdiği izne sahip değilse gösterme
          if (def.permission && !hasPermission(def.permission)) return null;

          return (
            <DashboardWidget
              key={item.id}
              id={item.id}
              title={def.title}
              icon={def.icon}
              size={item.size}
              color={def.color}
              loading={loadingWidgets[item.id]}
              error={widgetData[item.id]?.error}
              onRemove={editMode ? removeWidget : null}
              onResize={editMode ? resizeWidget : null}
              draggable={editMode}
              onDrop={handleDrop}
            >
              {renderWidgetContent(item.id)}
            </DashboardWidget>
          );
        })}
      </div>

      {/* Widget Ekleme Modali */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Widget Ekle"
        size="large"
      >
        {/* Kategori Filtresi */}
        <div className="widget-category-tabs">
          {WIDGET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`widget-category-tab ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Widget Listesi */}
        <div className="widget-picker">
          {filteredDefinitions.map((def) => {
            const isActive = activeWidgetIds.has(def.id);
            return (
              <div
                key={def.id}
                className={`widget-picker-item ${isActive ? 'disabled' : ''}`}
                onClick={() => !isActive && addWidget(def.id)}
              >
                <div className="widget-picker-icon"><StatusIcon icon={def.icon} /></div>
                <div className="widget-picker-name">{def.title}</div>
                <div className="widget-picker-desc">{def.description}</div>
                {isActive && <span className="badge badge-secondary">Ekli</span>}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
