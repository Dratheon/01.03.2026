import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import AutocompleteInput from '../components/AutocompleteInput';
import DateInput from '../components/DateInput';
import NumberInput from '../components/NumberInput';
import { StatusIcon } from '../utils/muiIcons';
import {
  getStockItems,
  getStockMovements,
  createStockMovement,
  getJobs,
} from '../services/dataService';

// Hareket Tipleri
const MOVEMENT_TYPES = {
  stockIn: { label: 'Stok Girişi', icon: 'add_circle', color: 'var(--color-success)', tone: 'success' },
  stockOut: { label: 'Stok Çıkışı', icon: 'remove_circle', color: 'var(--color-danger)', tone: 'danger' },
  reserve: { label: 'Rezerve', icon: 'lock', color: 'var(--color-warning)', tone: 'warning' },
  release: { label: 'Serbest Bırak', icon: 'lock_open', color: 'var(--color-info)', tone: 'info' },
  consume: { label: 'Üretim Kullanımı', icon: 'precision_manufacturing', color: 'var(--color-primary)', tone: 'primary' },
};

const formatNumber = (value) => new Intl.NumberFormat('tr-TR').format(value || 0);
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const defaultForm = {
  stockItemId: '',
  item: '',
  productCode: '',
  colorCode: '',
  type: 'stockIn',
  change: '',
  reason: '',
  date: new Date().toISOString().split('T')[0],
  jobId: '',
  jobSearch: '', // İş arama için
};

const StokHareketler = () => {
  const [movements, setMovements] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [movementsPayload, stockPayload, jobsPayload] = await Promise.all([
        getStockMovements(),
        getStockItems(),
        getJobs().catch(() => []),
      ]);
      setMovements(movementsPayload);
      setStockItems(stockPayload);
      setJobs(jobsPayload);
    } catch (err) {
      setError(err.message || 'Stok hareketleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Stock item options (autocomplete)
  const stockOptions = useMemo(() => {
    return stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      productCode: item.productCode,
      colorCode: item.colorCode,
      displayName: `${item.productCode}-${item.colorCode} (${item.name})`,
    }));
  }, [stockItems]);

  // Job options (autocomplete) - Aktif işler
  const jobOptions = useMemo(() => {
    const activeStatuses = [
      'ANLASMA_TAMAMLANDI',
      'URETIME_HAZIR',
      'URETIMDE',
      'SONRA_URETILECEK',
      'MONTAJA_HAZIR',
      'MONTAJ_TERMIN'
    ];
    return jobs
      .filter((job) => activeStatuses.includes(job.status))
      .map((job) => ({
        id: job.id,
        name: job.title,
        customer: job.customerName,
        displayName: `#${job.id} - ${job.title} (${job.customerName})`,
      }));
  }, [jobs]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    let data = [...movements];
    const query = search.trim().toLowerCase();

    // Text search
    if (query) {
      data = data.filter(
        (m) =>
          (m.item || '').toLowerCase().includes(query) ||
          (m.productCode || '').toLowerCase().includes(query) ||
          (m.colorCode || '').toLowerCase().includes(query) ||
          (m.reason || '').toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      data = data.filter((m) => m.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'custom':
          if (customDateStart) {
            startDate = new Date(customDateStart);
          }
          break;
        default:
          break;
      }

      if (startDate) {
        data = data.filter((m) => {
          const moveDate = new Date(m.date);
          return moveDate >= startDate;
        });
      }

      if (dateFilter === 'custom' && customDateEnd) {
        const endDate = new Date(customDateEnd);
        endDate.setHours(23, 59, 59, 999);
        data = data.filter((m) => new Date(m.date) <= endDate);
      }
    }

    // Sort by date descending
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    return data;
  }, [movements, search, typeFilter, dateFilter, customDateStart, customDateEnd]);

  // Summary
  const summary = useMemo(() => {
    const totalIn = movements
      .filter((m) => m.type === 'stockIn')
      .reduce((sum, m) => sum + Math.abs(m.change || 0), 0);
    const totalOut = movements
      .filter((m) => m.type === 'stockOut' || m.type === 'consume')
      .reduce((sum, m) => sum + Math.abs(m.change || 0), 0);
    const reserveCount = movements.filter((m) => m.type === 'reserve').length;
    const totalCount = movements.length;

    return { totalIn, totalOut, reserveCount, totalCount };
  }, [movements]);

  // Open form modal
  const openCreate = () => {
    setForm(defaultForm);
    setFormErrors({});
    setFormOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!form.stockItemId) errors.stockItemId = 'Ürün seçilmeli';
    if (!form.type) errors.type = 'Hareket tipi seçilmeli';
    if (!form.change || Number(form.change) === 0) errors.change = 'Miktar gerekli';
    if (!form.reason.trim()) errors.reason = 'Açıklama gerekli';
    if (!form.date) errors.date = 'Tarih gerekli';

    // For reserve/consume, job might be required
    if ((form.type === 'reserve' || form.type === 'consume') && !form.jobId) {
      errors.jobId = 'İş seçilmeli';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save movement
  const saveForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Backend expects: itemId, qty, type, reason, jobId
    const qtyValue = Math.abs(Number(form.change));

    const payload = {
      itemId: form.stockItemId,  // Backend itemId bekliyor
      qty: qtyValue,             // Backend qty bekliyor
      type: form.type,
      reason: form.reason.trim(),
      jobId: form.jobId || null,
    };

    try {
      setSubmitting(true);
      setError('');
      const created = await createStockMovement(payload);
      // API'den dönen veriyi movements listesine ekle
      const movementWithDetails = {
        ...created,
        item: form.item,
        productCode: form.productCode,
        colorCode: form.colorCode,
        change: ['stockOut', 'consume'].includes(form.type) ? -qtyValue : qtyValue,
        date: form.date,
      };
      setMovements((prev) => [movementWithDetails, ...prev]);
      setFormOpen(false);
      // Reload stock items to reflect changes
      loadData();
    } catch (err) {
      setError(err.message || 'Hareket kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle stock item select
  const handleStockItemSelect = (option) => {
    if (option) {
      setForm((prev) => ({
        ...prev,
        stockItemId: option.id,
        item: option.name,
        productCode: option.productCode,
        colorCode: option.colorCode,
      }));
    }
  };

  // Handle job select
  const handleJobSelect = (option) => {
    if (option) {
      setForm((prev) => ({
        ...prev,
        jobId: option.id,
        jobSearch: option.displayName || '',
      }));
    }
  };

  // Export CSV
  const exportCsv = () => {
    const header = ['Tarih', 'Ürün', 'Ürün Kodu', 'Renk Kodu', 'Hareket Tipi', 'Miktar', 'Açıklama'];
    const rows = filteredMovements.map((m) => [
      formatDate(m.date),
      m.item,
      m.productCode,
      m.colorCode,
      MOVEMENT_TYPES[m.type]?.label || m.type,
      m.change,
      m.reason,
    ].map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stok-hareketleri.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Stok Hareketleri"
        subtitle="Stok giriş, çıkış ve rezervasyon kayıtları"
        actions={
          <>
            <button className="btn btn-secondary" type="button" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusIcon icon="download" style={{ fontSize: 16 }} />
              CSV Dışa Aktar
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusIcon icon="add" style={{ fontSize: 16 }} />
              Yeni Hareket
            </button>
          </>
        }
      />

      {/* KPI Kartları */}
      <div className="kpi-cards-container">
        <div
          className={`kpi-card ${typeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTypeFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
            <StatusIcon icon="swap_horiz" />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Toplam Hareket</div>
            <div className="kpi-value">{formatNumber(summary.totalCount)}</div>
          </div>
        </div>

        <div
          className={`kpi-card ${typeFilter === 'stockIn' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'stockIn' ? 'all' : 'stockIn')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <StatusIcon icon="add_circle" />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Toplam Giriş</div>
            <div className="kpi-value">+{formatNumber(summary.totalIn)}</div>
          </div>
        </div>

        <div
          className={`kpi-card ${typeFilter === 'stockOut' || typeFilter === 'consume' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'stockOut' ? 'all' : 'stockOut')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <StatusIcon icon="remove_circle" />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Toplam Çıkış</div>
            <div className="kpi-value">-{formatNumber(summary.totalOut)}</div>
          </div>
        </div>

        <div
          className={`kpi-card ${typeFilter === 'reserve' ? 'active' : ''}`}
          onClick={() => setTypeFilter(typeFilter === 'reserve' ? 'all' : 'reserve')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <StatusIcon icon="lock" />
          </div>
          <div className="kpi-info">
            <div className="kpi-label">Rezervasyon</div>
            <div className="kpi-value">{formatNumber(summary.reserveCount)}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <StatusIcon icon="search" style={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
          <input
            type="search"
            placeholder="Ürün, kod, açıklama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 250, border: 'none', background: 'transparent', padding: '8px 0', fontSize: 14 }}
          />
        </div>

        <div className="filter-toggle-group">
          {Object.entries(MOVEMENT_TYPES).map(([key, val]) => (
            <button
              key={key}
              className={`filter-toggle-btn ${typeFilter === key ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <StatusIcon icon={val.icon} style={{ fontSize: 14 }} />
              {val.label}
            </button>
          ))}
        </div>

        <div className="filter-toggle-group">
          {[
            { key: 'today', label: 'Bugün' },
            { key: 'week', label: 'Son 7 Gün' },
            { key: 'month', label: 'Son 30 Gün' },
          ].map((opt) => (
            <button
              key={opt.key}
              className={`filter-toggle-btn ${dateFilter === opt.key ? 'active' : ''}`}
              onClick={() => setDateFilter(dateFilter === opt.key ? 'all' : opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          {filteredMovements.length} / {movements.length}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="card error-card" style={{ marginBottom: 16 }}>
          <div className="error-title">
            <StatusIcon icon="error" style={{ marginRight: 8 }} />
            Hata
          </div>
          <div className="error-message">{error}</div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Loader text="Stok hareketleri yükleniyor..." />
      ) : (
        <div className="card">
          <DataTable
            columns={[
              {
                label: 'Tarih',
                accessor: 'date',
                render: (val) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{formatDate(val)}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {new Date(val).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ),
              },
              {
                label: 'Ürün',
                accessor: 'item',
                render: (_, row) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.item}</div>
                    <div className="text-muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon icon="qr_code" style={{ fontSize: 12 }} />
                      {row.productCode}-{row.colorCode}
                    </div>
                  </div>
                ),
              },
              {
                label: 'Hareket Tipi',
                accessor: 'type',
                render: (val) => {
                  const info = MOVEMENT_TYPES[val] || { label: val, icon: 'help', tone: 'secondary' };
                  return (
                    <span className={`badge badge-${info.tone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon icon={info.icon} style={{ fontSize: 14 }} />
                      {info.label}
                    </span>
                  );
                },
              },
              {
                label: 'Miktar',
                accessor: 'change',
                render: (val) => (
                  <span
                    style={{
                      fontWeight: 700,
                      color: val >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {val >= 0 ? '+' : ''}{formatNumber(val)}
                  </span>
                ),
              },
              {
                label: 'Açıklama',
                accessor: 'reason',
                render: (val) => val || '-',
              },
              {
                label: 'İş',
                accessor: 'jobId',
                render: (val) => {
                  if (!val) return <span className="text-muted">-</span>;
                  const job = jobs.find((j) => j.id === val);
                  return (
                    <a href={`/isler?job=${val}`} className="link" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon icon="work" style={{ fontSize: 14 }} />
                      #{val.slice(-6)}
                      {job && <span className="text-muted" style={{ fontSize: 11 }}> ({job.title})</span>}
                    </a>
                  );
                },
              },
            ]}
            rows={filteredMovements}
            emptyText="Henüz stok hareketi yok"
          />
        </div>
      )}

      {/* New Movement Modal */}
      <Modal
        open={formOpen}
        title="Yeni Stok Hareketi"
        icon="swap_horiz"
        size="medium"
        onClose={() => setFormOpen(false)}
        actions={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setFormOpen(false)}>
              İptal
            </button>
            <button className="btn btn-primary" type="submit" form="movement-form" disabled={submitting}>
              <StatusIcon icon={submitting ? 'hourglass_empty' : 'check'} style={{ fontSize: 18 }} />
              {submitting ? 'Kaydediliyor...' : 'Hareketi Kaydet'}
            </button>
          </>
        }
      >
        <form id="movement-form" onSubmit={saveForm}>
          {/* Hareket Tipi Seçimi - Görsel Kartlar */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>
              Hareket Tipi <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {Object.entries(MOVEMENT_TYPES).map(([key, val]) => {
                const isSelected = form.type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: key }))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '14px 12px',
                      borderRadius: 10,
                      border: isSelected ? `2px solid ${val.color}` : '2px solid var(--color-border)',
                      background: isSelected ? `${val.color}15` : 'var(--color-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected 
                        ? `0 4px 14px ${val.color}40` 
                        : '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isSelected ? val.color : 'var(--color-surface-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#fff' : val.color,
                      transition: 'all 0.2s ease',
                    }}>
                      <StatusIcon icon={val.icon} style={{ fontSize: 20 }} />
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? val.color : 'var(--color-text)',
                    }}>
                      {val.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {formErrors.type && <div className="form-error" style={{ marginTop: 8 }}>{formErrors.type}</div>}
          </div>

          {/* Seçilen Ürün Kartı */}
          {form.stockItemId && (
            <div style={{ 
              padding: 14, 
              marginBottom: 20, 
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  <StatusIcon icon="inventory_2" style={{ fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{form.item}</div>
                  <div className="text-muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StatusIcon icon="qr_code" style={{ fontSize: 12 }} />
                    {form.productCode}-{form.colorCode}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setForm((p) => ({ ...p, stockItemId: '', item: '', productCode: '', colorCode: '' }))}
                style={{ padding: 8, borderRadius: 8 }}
                title="Ürünü Değiştir"
              >
                <StatusIcon icon="close" style={{ fontSize: 18 }} />
              </button>
            </div>
          )}

          {/* Ürün Seçimi - Sadece seçili değilse göster */}
          {!form.stockItemId && (
            <div style={{ marginBottom: 20 }}>
              <AutocompleteInput
                label="Ürün Ara"
                required
                value={form.item}
                onChange={(val) => setForm((p) => ({ ...p, item: val, stockItemId: '' }))}
                onSelect={handleStockItemSelect}
                options={stockOptions}
                displayKey="displayName"
                valueKey="id"
                placeholder="Ürün adı veya kodu yazarak arayın..."
                renderOption={(opt) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: 'var(--color-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                    }}>
                      <StatusIcon icon="inventory_2" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.name}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{opt.productCode}-{opt.colorCode}</div>
                    </div>
                  </div>
                )}
                error={formErrors.stockItemId}
              />
            </div>
          )}

          {/* Form Alanları */}
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Miktar */}
            <NumberInput
              label="Miktar"
              required
              value={form.change}
              onChange={(val) => setForm((p) => ({ ...p, change: val }))}
              min={0}
              step={1}
              placeholder="0"
              error={formErrors.change}
            />

            {/* Tarih */}
            <DateInput
              label="Tarih"
              required
              value={form.date}
              onChange={(val) => setForm((p) => ({ ...p, date: val }))}
              error={formErrors.date}
            />

            {/* İş Seçimi (Reserve/Consume/Release için) */}
            {(form.type === 'reserve' || form.type === 'consume' || form.type === 'release') && (
              <div style={{ gridColumn: '1 / -1' }}>
                <AutocompleteInput
                  label="İlişkili İş"
                  required={form.type === 'reserve' || form.type === 'consume'}
                  value={form.jobId ? (jobOptions.find((j) => j.id === form.jobId)?.displayName || form.jobSearch) : form.jobSearch}
                  onChange={(val) => setForm((p) => ({ ...p, jobSearch: val, jobId: '' }))}
                  onSelect={handleJobSelect}
                  options={jobOptions}
                  displayKey="displayName"
                  valueKey="id"
                  placeholder="İş kodunu veya müşteri adını yazın..."
                  renderOption={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: 'var(--color-warning-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-warning)',
                      }}>
                        <StatusIcon icon="work" style={{ fontSize: 16 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>#{opt.id} - {opt.name}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{opt.customer}</div>
                      </div>
                    </div>
                  )}
                  error={formErrors.jobId}
                />
              </div>
            )}

            {/* Açıklama */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                Açıklama <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                className={`form-textarea ${formErrors.reason ? 'input-error' : ''}`}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Hareket nedeni veya detayı yazın..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
              {formErrors.reason && <div className="form-error">{formErrors.reason}</div>}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StokHareketler;
