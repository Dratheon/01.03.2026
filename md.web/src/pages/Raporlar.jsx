import { useEffect, useState } from 'react';
import DateInput from '../components/DateInput';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { StatusIcon } from '../utils/muiIcons';
import {
  getProductionReport,
  getFinanceReport,
  getPerformanceReport,
  getSuppliersReport,
  getSupplierDetailReport,
  getCustomersAnalysisReport,
  getCancellationsReport,
  getPeriodComparisonReport,
  getPersonnelPerformanceReport,
  getProcessTimeReport,
  getPersonnelDetailReport,
  getCustomerDetailReport,
  getInquiryConversionReport,
} from '../services/dataService';
import { exportToExcel, exportToPDF, createTableHTML, createStatsHTML, createSectionHTML } from '../utils/exportUtils';

// Para formatı
const formatNumber = (value) => new Intl.NumberFormat('tr-TR').format(value || 0);
const formatMoney = (value) => {
  const num = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  return `${num} ₺`;
};

const TABS = [
  { id: 'performance', label: 'Genel', icon: 'bar_chart', printTitle: 'Genel Performans Raporu' },
  { id: 'inquiry', label: 'Fiyat Sorgusu', icon: 'request_quote', printTitle: 'Fiyat Sorgusu Dönüşüm Raporu' },
  { id: 'suppliers', label: 'Tedarikçi', icon: 'local_shipping', printTitle: 'Tedarikçi Performans Raporu' },
  { id: 'customers', label: 'Müşteri', icon: 'person', printTitle: 'Müşteri Analiz Raporu' },
  { id: 'cancellations', label: 'İptal/Red', icon: 'cancel', printTitle: 'İptal Analiz Raporu' },
  { id: 'personnel', label: 'Personel', icon: 'groups', printTitle: 'Personel Verimlilik Raporu' },
  { id: 'process', label: 'Süreç', icon: 'schedule', printTitle: 'Süreç Analiz Raporu' },
  { id: 'comparison', label: 'Karşılaştırma', icon: 'compare_arrows', printTitle: 'Dönemsel Karşılaştırma' },
  { id: 'production', label: 'Üretim', icon: 'factory', printTitle: 'Üretim Raporu' },
  { id: 'finance', label: 'Finansal', icon: 'payments', printTitle: 'Finansal Rapor' },
];

// Print CSS
const printStyles = `
  @media print {
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif !important; font-size: 11pt !important; }
    .sidebar, .navbar, .no-print, button { display: none !important; }
    .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    .print-header { display: block !important; text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .print-header h1 { font-size: 18pt !important; margin: 0 0 5px 0; }
    .print-header .print-meta { font-size: 10pt; color: #666; }
    .card { border: 1px solid #ddd !important; box-shadow: none !important; break-inside: avoid; margin-bottom: 15px !important; }
    .card-header { background: #f5f5f5 !important; border-bottom: 1px solid #ddd !important; }
    .report-table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
    .report-table th, .report-table td { border: 1px solid #ccc !important; padding: 8px 10px !important; }
    .report-table th { background: #f0f0f0 !important; font-weight: 600 !important; }
    .col-money, .col-number { text-align: right !important; font-family: 'Consolas', monospace !important; }
    .badge { border: 1px solid #999 !important; background: #f5f5f5 !important; color: #000 !important; }
  }
`;

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <div className="card no-break" style={{ margin: 0 }}>
    <div className="card-body" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div className="no-print" style={{ 
        width: 48, height: 48, borderRadius: 12,
        background: `var(--color-${color}-bg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24
      }}>
        {typeof icon === 'string' ? <StatusIcon icon={icon} style={{ fontSize: 24 }} /> : icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: `var(--color-${color})` }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{subtitle}</div>}
      </div>
    </div>
  </div>
);

const ProgressBar = ({ value, max, color = 'primary', label }) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>%{percentage}</span>
      </div>
      <div style={{ height: 10, background: 'var(--color-bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: `var(--color-${color})`, borderRadius: 4 }} />
      </div>
    </div>
  );
};

const ReportTable = ({ columns, data, emptyText = 'Veri bulunamadı' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx} style={{ 
              padding: '12px 16px', textAlign: col.align || 'left',
              background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border)',
              fontWeight: 600, whiteSpace: 'nowrap', minWidth: col.minWidth || 'auto', width: col.width || 'auto'
            }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{emptyText}</td></tr>
        ) : (
          data.map((row, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={col.type === 'money' ? 'col-money' : col.type === 'number' ? 'col-number' : ''} style={{ 
                  padding: '10px 16px', textAlign: col.align || (col.type === 'money' || col.type === 'number' ? 'right' : 'left'),
                  whiteSpace: col.type === 'money' ? 'nowrap' : 'normal',
                  fontFamily: col.type === 'money' || col.type === 'number' ? "'Consolas', monospace" : 'inherit',
                  minWidth: col.minWidth || 'auto'
                }}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const Raporlar = () => {
  const [activeTab, setActiveTab] = useState('performance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tarih filtreleri
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Dönemsel karşılaştırma için
  const [period1Start, setPeriod1Start] = useState('');
  const [period1End, setPeriod1End] = useState('');
  const [period2Start, setPeriod2Start] = useState('');
  const [period2End, setPeriod2End] = useState('');
  
  // Rapor verileri
  const [performanceData, setPerformanceData] = useState(null);
  const [productionData, setProductionData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [suppliersData, setSuppliersData] = useState(null);
  const [supplierDetailData, setSupplierDetailData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [cancellationsData, setCancellationsData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [personnelData, setPersonnelData] = useState(null);
  const [processData, setProcessData] = useState(null);
  const [inquiryData, setInquiryData] = useState(null);
  
  // Tedarikçi modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  
  // Personel modal
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(null);
  const [personnelDetailData, setPersonnelDetailData] = useState(null);
  
  // Müşteri modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetailData, setCustomerDetailData] = useState(null);

  const loadReport = async (tab) => {
    setLoading(true);
    setError('');
    try {
      switch (tab) {
        case 'performance':
          setPerformanceData(await getPerformanceReport(startDate, endDate));
          break;
        case 'production':
          setProductionData(await getProductionReport(startDate, endDate));
          break;
        case 'finance':
          setFinanceData(await getFinanceReport(startDate, endDate));
          break;
        case 'suppliers':
          setSuppliersData(await getSuppliersReport(startDate, endDate));
          break;
        case 'customers':
          setCustomersData(await getCustomersAnalysisReport(startDate, endDate));
          break;
        case 'cancellations':
          setCancellationsData(await getCancellationsReport(startDate, endDate));
          break;
        case 'comparison':
          if (period1Start && period1End && period2Start && period2End) {
            setComparisonData(await getPeriodComparisonReport(period1Start, period1End, period2Start, period2End));
          }
          break;
        case 'personnel':
          setPersonnelData(await getPersonnelPerformanceReport(startDate, endDate));
          break;
        case 'process':
          setProcessData(await getProcessTimeReport(startDate, endDate));
          break;
        case 'inquiry':
          setInquiryData(await getInquiryConversionReport(startDate, endDate));
          break;
      }
    } catch (err) {
      setError(err.message || 'Rapor yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'comparison') {
      loadReport(activeTab);
    }
  }, [activeTab, startDate, endDate]);

  const handlePrint = () => window.print();

  // Tedarikçi raporunu yeni pencerede aç ve yazdır
  const handlePrintSupplierReport = () => {
    if (!supplierDetailData || supplierDetailData.error) return;
    
    const { reportDate, periodStart, periodEnd, supplier, summary, delayedOrders, problemOrders } = supplierDetailData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup engelleyici aktif olabilir. Lütfen izin verin.');
      return;
    }
    
    const delayedOrdersHTML = delayedOrders?.length > 0 ? `
      <div class="section">
        <h3>⏰ Geciken Siparişler</h3>
        <table>
          <thead>
            <tr>
              <th>Sipariş No</th>
              <th>Müşteri</th>
              <th>Anlaşılan Tarih</th>
              <th>Teslim Tarihi</th>
              <th style="text-align:right">Gecikme</th>
              <th style="text-align:right">Adet</th>
            </tr>
          </thead>
          <tbody>
            ${delayedOrders.map(o => `
              <tr>
                <td>${o.orderId}</td>
                <td>${o.customerName}</td>
                <td>${o.estimatedDelivery || '-'}</td>
                <td>${o.actualDelivery || '-'}</td>
                <td style="text-align:right;color:#dc2626;font-weight:600">${o.delayDays} gün</td>
                <td style="text-align:right">${o.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';
    
    const problemOrdersHTML = problemOrders?.length > 0 ? `
      <div class="section">
        <h3>⚠️ Sorunlu Teslimatlar</h3>
        <table>
          <thead>
            <tr>
              <th>Sipariş No</th>
              <th>Müşteri</th>
              <th>Ürün</th>
              <th>Sorun Tipi</th>
              <th style="text-align:right">Sorunlu Adet</th>
            </tr>
          </thead>
          <tbody>
            ${problemOrders.map(o => `
              <tr>
                <td>${o.orderId}</td>
                <td>${o.customerName}</td>
                <td>${o.itemName || '-'}</td>
                <td>${o.problemType || '-'}</td>
                <td style="text-align:right;color:#dc2626">${o.problemQty}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';
    
    const evaluationColor = summary.onTimeRate >= 80 ? '#dcfce7' : '#fef9c3';
    const evaluationBorder = summary.onTimeRate >= 80 ? '#86efac' : '#fde047';
    const evaluationText = summary.onTimeRate >= 80 
      ? `Bu dönemde %${summary.onTimeRate} zamanında teslim oranı ile anlaşma şartları karşılanmıştır.`
      : `Bu dönemde %${summary.onTimeRate} zamanında teslim oranı ile anlaşma şartlarının altında performans gösterilmiştir. Gecikmelerin önlenmesi için gerekli tedbirlerin alınmasını rica ederiz.`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Tedarikçi Performans Raporu - ${supplier.name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333; padding: 20mm; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 18pt; margin-bottom: 10px; }
          .header .subtitle { font-size: 14pt; color: #555; }
          .header .meta { font-size: 10pt; color: #777; margin-top: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .summary-box { padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: center; }
          .summary-box .value { font-size: 22pt; font-weight: 700; }
          .summary-box .label { font-size: 10pt; color: #666; margin-top: 5px; }
          .summary-box .value.green { color: #22c55e; }
          .summary-box .value.yellow { color: #eab308; }
          .summary-box .value.red { color: #ef4444; }
          .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
          .stat-box { padding: 12px 15px; border-radius: 8px; }
          .stat-box.warning { background: #fef3c7; border: 1px solid #fcd34d; }
          .stat-box.danger { background: #fee2e2; border: 1px solid #fca5a5; }
          .stat-box .row { display: flex; justify-content: space-between; }
          .stat-box .detail { font-size: 10pt; color: #92400e; margin-top: 5px; }
          .section { margin-bottom: 25px; }
          .section h3 { font-size: 12pt; margin-bottom: 12px; color: #333; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
          th { background: #f0f0f0; font-weight: 600; }
          .evaluation { padding: 15px; border-radius: 8px; margin-top: 25px; }
          .evaluation strong { display: block; margin-bottom: 8px; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 9pt; color: #888; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TEDARİKÇİ PERFORMANS RAPORU</h1>
          <div class="subtitle"><strong>${supplier.name}</strong> - ${supplier.category || 'Tedarikçi'}</div>
          <div class="meta">Dönem: ${periodStart} - ${periodEnd} | Rapor Tarihi: ${reportDate}</div>
        </div>
        
        <div class="summary-grid">
          <div class="summary-box">
            <div class="value">${summary.totalOrders}</div>
            <div class="label">Toplam Sipariş</div>
          </div>
          <div class="summary-box">
            <div class="value">${summary.totalQuantity}</div>
            <div class="label">Toplam Adet</div>
          </div>
          <div class="summary-box">
            <div class="value ${summary.onTimeRate >= 80 ? 'green' : 'yellow'}">%${summary.onTimeRate}</div>
            <div class="label">Zamanında Teslim</div>
          </div>
          <div class="summary-box">
            <div class="value ${summary.problemRate > 5 ? 'red' : 'green'}">%${summary.problemRate}</div>
            <div class="label">Sorun Oranı</div>
          </div>
        </div>
        
        <div class="stats-row">
          <div class="stat-box warning">
            <div class="row">
              <span>Gecikmeli Teslimat:</span>
              <strong>${summary.delayedCount} adet</strong>
            </div>
            ${summary.delayedCount > 0 ? `<div class="detail">Ortalama Gecikme: <strong>${summary.avgDelayDays} gün</strong></div>` : ''}
          </div>
          <div class="stat-box danger">
            <div class="row">
              <span>Sorunlu Teslimat:</span>
              <strong>${summary.problemQuantity} adet</strong>
            </div>
          </div>
        </div>
        
        ${delayedOrdersHTML}
        ${problemOrdersHTML}
        
        <div class="evaluation" style="background:${evaluationColor};border:1px solid ${evaluationBorder}">
          <strong>📋 Değerlendirme:</strong>
          <p>${evaluationText}${summary.problemQuantity > 0 ? ` Ayrıca ${summary.problemQuantity} adet sorunlu teslimat tespit edilmiştir.` : ''}</p>
        </div>
        
        <div class="footer">
          Bu rapor otomatik olarak oluşturulmuştur.
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const loadSupplierDetail = async (supplierId) => {
    setSelectedSupplierId(supplierId);
    setShowSupplierModal(true);
    try {
      const data = await getSupplierDetailReport(supplierId, startDate, endDate);
      setSupplierDetailData(data);
    } catch (err) {
      setSupplierDetailData({ error: err.message });
    }
  };
  
  const loadPersonnelDetail = async (personId) => {
    setSelectedPersonnelId(personId);
    setShowPersonnelModal(true);
    setPersonnelDetailData(null);
    try {
      const data = await getPersonnelDetailReport(personId, startDate, endDate);
      setPersonnelDetailData(data);
    } catch (err) {
      setPersonnelDetailData({ error: err.message });
    }
  };
  
  const loadCustomerDetail = async (customerId) => {
    setSelectedCustomerId(customerId);
    setShowCustomerModal(true);
    setCustomerDetailData(null);
    try {
      const data = await getCustomerDetailReport(customerId, startDate, endDate);
      setCustomerDetailData(data);
    } catch (err) {
      setCustomerDetailData({ error: err.message });
    }
  };

  const currentTabInfo = TABS.find(t => t.id === activeTab);
  const dateRangeText = startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'Tüm Zamanlar';

  // ==================== EXPORT FONKSİYONLARI ====================
  
  const handleExportExcel = () => {
    let data = [];
    let columns = [];
    let filename = currentTabInfo?.printTitle || 'rapor';
    
    switch (activeTab) {
      case 'suppliers':
        if (suppliersData?.suppliers) {
          data = suppliersData.suppliers;
          columns = [
            { label: 'Tedarikçi', accessor: 'supplierName' },
            { label: 'Kategori', accessor: 'category' },
            { label: 'Tip', accessor: 'supplyType' },
            { label: 'Üretim Sipariş', accessor: 'productionOrderCount', format: 'number' },
            { label: 'Satınalma Sipariş', accessor: 'purchaseOrderCount', format: 'number' },
            { label: 'Toplam Sipariş', accessor: 'orderCount', format: 'number' },
            { label: 'Toplam Adet', accessor: 'totalQuantity', format: 'number' },
            { label: 'Zamanında', accessor: 'onTime', format: 'number' },
            { label: 'Gecikmeli', accessor: 'delayed', format: 'number' },
            { label: 'Zamanında %', accessor: 'onTimeRate', format: 'percent' },
            { label: 'Sorunlu Adet', accessor: 'problemQuantity', format: 'number' },
          ];
        }
        break;
      case 'customers':
        if (customersData?.customers) {
          data = customersData.customers;
          columns = [
            { label: 'Müşteri', accessor: 'customerName' },
            { label: 'Segment', accessor: 'performanceSegment' },
            { label: 'İş Sayısı', accessor: 'jobCount', format: 'number' },
            { label: 'Toplam Ciro', accessor: 'totalOffer', format: 'money' },
            { label: 'Tahsilat', accessor: 'totalCollected', format: 'money' },
            { label: 'Kalan', accessor: 'remaining', format: 'money' },
            { label: 'Tahsilat %', accessor: 'collectionRate', format: 'percent' },
          ];
        }
        break;
      case 'personnel':
        if (personnelData?.personnel) {
          data = personnelData.personnel;
          columns = [
            { label: 'Personel', accessor: 'personName' },
            { label: 'Ekip', accessor: 'teamName' },
            { label: 'Unvan', accessor: 'role' },
            { label: 'Genel Görev', accessor: 'generalTaskCount', format: 'number' },
            { label: 'Genel Tamamlanan', accessor: 'generalCompletedCount', format: 'number' },
            { label: 'Montaj Görev', accessor: 'assemblyTaskCount', format: 'number' },
            { label: 'Montaj Tamamlanan', accessor: 'assemblyCompletedCount', format: 'number' },
            { label: 'Toplam Görev', accessor: 'taskCount', format: 'number' },
            { label: 'Tamamlanan', accessor: 'completedCount', format: 'number' },
            { label: 'Tamamlanma %', accessor: 'completionRate', format: 'percent' },
            { label: 'Sorun', accessor: 'issueCount', format: 'number' },
            { label: 'Gecikme', accessor: 'delayCount', format: 'number' },
            { label: 'Performans', accessor: 'performance' },
          ];
        }
        break;
      case 'cancellations':
        if (cancellationsData?.allCancelled) {
          data = cancellationsData.allCancelled;
          columns = [
            { label: 'Tarih', accessor: 'date' },
            { label: 'İş', accessor: 'title' },
            { label: 'Müşteri', accessor: 'customerName' },
            { label: 'Neden', accessor: 'reason' },
            { label: 'Tutar', accessor: 'offerTotal', format: 'money' },
          ];
        }
        break;
      case 'inquiry':
        if (inquiryData?.inquiries) {
          data = inquiryData.inquiries;
          columns = [
            { label: 'Tarih', accessor: 'createdAt' },
            { label: 'Müşteri', accessor: 'customerName' },
            { label: 'İş Başlığı', accessor: 'title' },
            { label: 'Teklif Tutarı', accessor: 'offerTotal', format: 'money' },
            { label: 'Karar', accessor: 'decision' },
            { label: 'Karar Tarihi', accessor: 'decisionDate' },
            { label: 'Red Nedeni', accessor: 'cancelReason' },
          ];
        }
        break;
      case 'finance':
        if (financeData?.jobs) {
          data = financeData.jobs.filter(j => j.remaining > 0).slice(0, 50);
          columns = [
            { label: 'İş', accessor: 'title' },
            { label: 'Müşteri', accessor: 'customerName' },
            { label: 'Durum', accessor: 'status' },
            { label: 'Teklif', accessor: 'offerTotal', format: 'money' },
            { label: 'Tahsilat', accessor: 'collected', format: 'money' },
            { label: 'Kalan', accessor: 'remaining', format: 'money' },
          ];
        }
        break;
      case 'process':
        if (processData?.transitions) {
          data = processData.transitions;
          columns = [
            { label: 'Aşama Geçişi', accessor: 'label' },
            { label: 'Örnek Sayısı', accessor: 'sampleCount', format: 'number' },
            { label: 'Ort. Süre (gün)', accessor: 'avgDays', format: 'number' },
            { label: 'Min Süre (gün)', accessor: 'minDays', format: 'number' },
            { label: 'Max Süre (gün)', accessor: 'maxDays', format: 'number' },
            { label: 'Hedef (gün)', accessor: 'targetDays', format: 'number' },
            { label: 'Sapma (gün)', accessor: 'deviation', format: 'number' },
            { label: 'Durum', accessor: 'status' },
          ];
        }
        break;
      default:
        alert('Bu rapor için Excel export henüz desteklenmiyor');
        return;
    }
    
    if (data.length > 0) {
      exportToExcel(data, columns, filename.replace(/\s+/g, '_'));
    } else {
      alert('Export edilecek veri bulunamadı');
    }
  };

  const handleExportPDF = () => {
    let content = '';
    const title = currentTabInfo?.printTitle || 'Rapor';
    
    switch (activeTab) {
      case 'suppliers':
        if (suppliersData) {
          const { summary, suppliers } = suppliersData;
          content = createStatsHTML([
            { label: 'Toplam Tedarikçi', value: summary.totalSuppliers, color: 'primary' },
            { label: 'Toplam Sipariş', value: summary.totalOrders },
            { label: 'Zamanında Teslim', value: `%${summary.overallOnTimeRate}`, color: 'success' },
            { label: 'Sorun Oranı', value: `%${summary.overallProblemRate}`, color: 'danger' },
          ]);
          content += createSectionHTML('Tedarikçi Listesi', createTableHTML(suppliers, [
            { label: 'Tedarikçi', accessor: 'supplierName' },
            { label: 'Kategori', accessor: 'category' },
            { label: 'Sipariş', accessor: 'orderCount', format: 'number', align: 'right' },
            { label: 'Adet', accessor: 'totalQuantity', format: 'number', align: 'right' },
            { label: 'Zamanında %', accessor: 'onTimeRate', format: 'percent', align: 'right' },
            { label: 'Sorunlu', accessor: 'problemQuantity', format: 'number', align: 'right' },
          ]));
        }
        break;
      case 'customers':
        if (customersData) {
          const { summary, customers } = customersData;
          content = createStatsHTML([
            { label: 'Toplam Müşteri', value: summary.totalCustomers, color: 'primary' },
            { label: 'Toplam Ciro', value: formatMoney(summary.totalOffer) },
            { label: 'Tahsilat', value: formatMoney(summary.totalCollected), color: 'success' },
            { label: 'VIP Müşteri', value: summary.vipCount, color: 'warning' },
          ]);
          content += createSectionHTML('Müşteri Listesi', createTableHTML(customers, [
            { label: 'Müşteri', accessor: 'customerName' },
            { label: 'Segment', accessor: 'performanceSegment' },
            { label: 'İş', accessor: 'jobCount', format: 'number', align: 'right' },
            { label: 'Ciro', accessor: 'totalOffer', format: 'money', align: 'right' },
            { label: 'Tahsilat', accessor: 'totalCollected', format: 'money', align: 'right' },
            { label: 'Tahsilat %', accessor: 'collectionRate', format: 'percent', align: 'right' },
          ]));
        }
        break;
      case 'personnel':
        if (personnelData) {
          const { summary, personnel } = personnelData;
          content = createStatsHTML([
            { label: 'Toplam Personel', value: summary.totalPersonnel, color: 'primary' },
            { label: 'Aktif Personel', value: summary.activePersonnel || 0, color: 'success' },
            { label: 'Toplam Sorun', value: summary.totalIssues, color: 'warning' },
            { label: 'Toplam Gecikme', value: summary.totalDelays, color: 'danger' },
          ]);
          content += createSectionHTML('Personel Listesi', createTableHTML(personnel, [
            { label: 'Personel', accessor: 'personName' },
            { label: 'Ekip', accessor: 'teamName' },
            { label: 'Unvan', accessor: 'role' },
            { label: 'Görev', accessor: 'taskCount', format: 'number', align: 'right' },
            { label: 'Tamamlanan', accessor: 'completedCount', format: 'number', align: 'right' },
            { label: 'Tamamlanma %', accessor: 'completionRate', format: 'percent', align: 'right' },
            { label: 'Performans', accessor: 'performance' },
          ]));
        }
        break;
      default:
        // Fallback to print
        window.print();
        return;
    }
    
    exportToPDF(title, content, {
      dateRange: dateRangeText,
      orientation: activeTab === 'suppliers' || activeTab === 'personnel' ? 'landscape' : 'portrait',
    });
  };

  // ==================== RENDER FONKSİYONLARI ====================

  const renderInquiry = () => {
    if (!inquiryData) return null;
    const { summary, rejectionReasons, inquiries } = inquiryData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Özet Kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatCard icon="assignment" title="Toplam Sorgu" value={formatNumber(summary.totalInquiries)} color="primary" />
          <StatCard icon="check_circle" title="Onaylanan" value={formatNumber(summary.approved)} subtitle={formatMoney(summary.approvedOfferAmount)} color="success" />
          <StatCard icon="cancel" title="Reddedilen" value={formatNumber(summary.rejected)} subtitle={formatMoney(summary.rejectedOfferAmount)} color="danger" />
          <StatCard icon="schedule" title="Bekleyen" value={formatNumber(summary.pending)} color="warning" />
          <StatCard icon="pie_chart" title="Dönüşüm Oranı" value={`%${summary.conversionRate}`} color="info" />
        </div>

        {/* Dönüşüm Grafiği */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h4 className="card-title"><StatusIcon icon="pie_chart" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Dönüşüm Özeti</h4>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <ProgressBar 
                  value={summary.approved} 
                  max={summary.totalInquiries} 
                  color="success" 
                  label={`Onaylanan: ${summary.approved} (${summary.totalInquiries > 0 ? Math.round(summary.approved / summary.totalInquiries * 100) : 0}%)`} 
                />
                <div style={{ height: 8 }} />
                <ProgressBar 
                  value={summary.rejected} 
                  max={summary.totalInquiries} 
                  color="danger" 
                  label={`Reddedilen: ${summary.rejected} (${summary.totalInquiries > 0 ? Math.round(summary.rejected / summary.totalInquiries * 100) : 0}%)`} 
                />
                <div style={{ height: 8 }} />
                <ProgressBar 
                  value={summary.pending} 
                  max={summary.totalInquiries} 
                  color="warning" 
                  label={`Bekleyen: ${summary.pending} (${summary.totalInquiries > 0 ? Math.round(summary.pending / summary.totalInquiries * 100) : 0}%)`} 
                />
              </div>
              <div style={{ 
                width: 150, 
                height: 150, 
                borderRadius: '50%', 
                background: `conic-gradient(
                  #22c55e 0deg ${summary.approved / Math.max(summary.totalInquiries, 1) * 360}deg,
                  #ef4444 ${summary.approved / Math.max(summary.totalInquiries, 1) * 360}deg ${(summary.approved + summary.rejected) / Math.max(summary.totalInquiries, 1) * 360}deg,
                  #eab308 ${(summary.approved + summary.rejected) / Math.max(summary.totalInquiries, 1) * 360}deg 360deg
                )`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success)' }}>%{summary.conversionRate}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Dönüşüm</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Red Nedenleri Dağılımı */}
        {rejectionReasons?.length > 0 && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <h4 className="card-title"><StatusIcon icon="cancel" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Red Nedenleri</h4>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <ReportTable
                columns={[
                  { label: 'Red Nedeni', accessor: 'reason', width: '250px' },
                  { label: 'Sayı', accessor: 'count', type: 'number', align: 'right', minWidth: '80px' },
                  { label: 'Tutar', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.totalOffer) },
                  { label: 'Oran', align: 'right', minWidth: '80px', render: (row) => (
                    <span>{Math.round(row.count / Math.max(summary.rejected, 1) * 100)}%</span>
                  )},
                ]}
                data={rejectionReasons}
              />
            </div>
          </div>
        )}

        {/* Son Fiyat Sorguları */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h4 className="card-title"><StatusIcon icon="list_alt" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Son Fiyat Sorguları</h4>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Tarih', accessor: 'createdAt', width: '100px' },
                { label: 'Müşteri', accessor: 'customerName', width: '150px' },
                { label: 'İş Başlığı', accessor: 'title', width: '180px' },
                { label: 'İş Kolları', width: '150px', render: (row) => (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {row.roles?.map((r, i) => <span key={i} className="badge badge-secondary" style={{ fontSize: 10 }}>{r}</span>)}
                  </div>
                )},
                { label: 'Teklif', type: 'money', align: 'right', minWidth: '100px', render: (row) => formatMoney(row.offerTotal) },
                { label: 'Karar', width: '120px', render: (row) => {
                  const color = row.decision === 'Onaylandı' ? 'success' : row.decision === 'Reddedildi' ? 'danger' : 'warning';
                  return <span className={`badge badge-${color}`}>{row.decision}</span>;
                }},
                { label: 'Karar Tarihi', accessor: 'decisionDate', width: '100px' },
                { label: 'Red Nedeni', accessor: 'cancelReason', width: '150px' },
              ]}
              data={inquiries || []}
              emptyText="Fiyat sorgusu bulunamadı"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPerformance = () => {
    if (!performanceData) return null;
    const { summary, production, assembly, monthlyTrend } = performanceData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatCard icon="assignment" title="Toplam İş" value={formatNumber(summary.totalJobs)} color="primary" />
          <StatCard icon="sync" title="Aktif İşler" value={formatNumber(summary.activeJobs)} color="info" />
          <StatCard icon="check_circle" title="Tamamlanan" value={formatNumber(summary.completedJobs)} color="success" />
          <StatCard icon="cancel" title="İptal" value={formatNumber(summary.cancelledJobs)} color="danger" />
          <StatCard icon="schedule" title="Ort. Süre" value={`${summary.avgJobDuration} gün`} color="warning" />
        </div>

        <div className="grid grid-3" style={{ gap: 20 }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="factory" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Üretim Durumu</h4></div>
            <div className="card-body">
              <ProgressBar value={production.completed} max={production.total} color="success" label={`Tamamlanan: ${production.completed} / ${production.total}`} />
              <div className="metric-row"><span>Bekleyen Siparişler</span><span className="badge badge-warning">{production.pending}</span></div>
            </div>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="build" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Montaj Durumu</h4></div>
            <div className="card-body">
              <ProgressBar value={assembly.completed} max={assembly.total} color="info" label={`Tamamlanan: ${assembly.completed} / ${assembly.total}`} />
              <div className="metric-row"><span>Bekleyen Görevler</span><span className="badge badge-warning">{assembly.pending}</span></div>
            </div>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="inventory_2" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Teslim Tipi</h4></div>
            <div className="card-body">
              <div className="metric-row" style={{ marginBottom: 8 }}>
                <span><StatusIcon icon="local_shipping" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Montajlı Teslim</span>
                <span className="badge badge-success">{summary.montajliJobs || 0}</span>
              </div>
              <div className="metric-row">
                <span><StatusIcon icon="inventory_2" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }} /> Demonte Teslim</span>
                <span className="badge badge-info">{summary.demonteJobs || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {monthlyTrend?.length > 0 && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="trending_up" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Aylık İş Trendi</h4></div>
            <div className="card-body">
              <ReportTable
                columns={[
                  { label: 'Ay', accessor: 'month', width: '150px' },
                  { label: 'İş Sayısı', accessor: 'count', type: 'number', align: 'right' },
                ]}
                data={monthlyTrend}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSuppliers = () => {
    if (!suppliersData) return null;
    const { summary, suppliers } = suppliersData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <StatCard icon="business" title="Tedarikçi" value={formatNumber(summary.totalSuppliers)} subtitle={`${summary.suppliersWithOrders || 0} aktif`} color="primary" />
          <StatCard icon="inventory_2" title="Toplam Sipariş" value={formatNumber(summary.totalOrders)} color="info" />
          <StatCard icon="factory" title="Üretim Siparişi" value={formatNumber(summary.totalProductionOrders || 0)} color="warning" />
          <StatCard icon="shopping_cart" title="Satınalma" value={formatNumber(summary.totalPurchaseOrders || 0)} color="secondary" />
          <StatCard icon="check_circle" title="Zamanında" value={`%${summary.overallOnTimeRate}`} color="success" />
          <StatCard icon="warning" title="Sorunlu" value={`%${summary.overallProblemRate}`} color="danger" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h4 className="card-title"><StatusIcon icon="local_shipping" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Tedarikçi Performans Listesi</h4>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Tedarikçi', width: '180px', render: (row) => (
                  <button 
                    className="btn btn-link" 
                    style={{ padding: 0, textAlign: 'left', opacity: row.hasData ? 1 : 0.6 }} 
                    onClick={() => loadSupplierDetail(row.supplierId)}
                    disabled={!row.hasData}
                  >
                    <strong>{row.supplierName}</strong>
                    {!row.hasData && <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--color-text-muted)' }}>(Veri Yok)</span>}
                  </button>
                )},
                { label: 'Kategori', accessor: 'category', width: '100px' },
                { label: 'Tip', accessor: 'supplyType', width: '100px' },
                { label: 'Üretim', accessor: 'productionOrderCount', type: 'number', align: 'right', minWidth: '70px' },
                { label: 'Satınalma', accessor: 'purchaseOrderCount', type: 'number', align: 'right', minWidth: '80px' },
                { label: 'Toplam', accessor: 'orderCount', type: 'number', align: 'right', minWidth: '70px' },
                { label: 'Adet', accessor: 'totalQuantity', type: 'number', align: 'right', minWidth: '70px' },
                { label: 'Zamanında', accessor: 'onTime', type: 'number', align: 'right', minWidth: '80px' },
                { label: 'Gecikmeli', accessor: 'delayed', type: 'number', align: 'right', minWidth: '80px' },
                { label: '%', align: 'right', minWidth: '60px', render: (row) => row.hasData ? (
                  <span style={{ color: row.onTimeRate >= 80 ? '#22c55e' : row.onTimeRate >= 60 ? '#eab308' : '#ef4444', fontWeight: 600 }}>
                    %{row.onTimeRate}
                  </span>
                ) : '-' },
                { label: 'Sorunlu', accessor: 'problemQuantity', type: 'number', align: 'right', minWidth: '70px' },
              ]}
              data={suppliers || []}
              emptyText="Tedarikçi verisi yok"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCustomers = () => {
    if (!customersData) return null;
    const { summary, segmentDistribution, customers } = customersData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatCard icon="person" title="Müşteri" value={formatNumber(summary.totalCustomers)} color="primary" />
          <StatCard icon="payments" title="Toplam Ciro" value={formatMoney(summary.totalOffer)} color="info" />
          <StatCard icon="check_circle" title="Tahsilat" value={formatMoney(summary.totalCollected)} color="success" />
          <StatCard icon="star" title="VIP" value={formatNumber(summary.vipCount)} color="warning" />
          <StatCard icon="warning" title="Riskli" value={formatNumber(summary.riskyCount)} color="danger" />
        </div>

        {/* Segment Dağılımı */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="pie_chart" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Segment Dağılımı</h4></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {segmentDistribution.map((seg, idx) => (
                <div key={idx} style={{ 
                  flex: '1 1 150px', padding: 16, borderRadius: 8, 
                  background: 'var(--color-bg-secondary)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 28, display: 'flex', justifyContent: 'center' }}><StatusIcon icon={seg.icon} style={{ fontSize: 28 }} /></div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{seg.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{seg.segment}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatMoney(seg.totalOffer)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="people" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Müşteri Listesi</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Müşteri', width: '180px', render: (row) => (
                  <button className="btn btn-link" style={{ padding: 0, textAlign: 'left' }} onClick={() => loadCustomerDetail(row.customerId)}>
                    <strong>{row.customerName}</strong>
                  </button>
                )},
                { label: 'Segment', width: '100px', render: (row) => {
                  const icons = { VIP: 'star', Normal: 'person', Riskli: 'warning', 'Kara Liste': 'block', Yeni: 'person_add' };
                  const colors = { VIP: 'var(--color-warning)', Normal: 'var(--color-text-secondary)', Riskli: 'var(--color-danger)', 'Kara Liste': 'var(--color-danger)', Yeni: 'var(--color-success)' };
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon icon={icons[row.performanceSegment] || 'person'} style={{ fontSize: 14, color: colors[row.performanceSegment] }} />
                      {row.performanceSegment}
                    </span>
                  );
                }},
                { label: 'İş', accessor: 'jobCount', type: 'number', align: 'right', minWidth: '60px' },
                { label: 'Ciro', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.totalOffer) },
                { label: 'Tahsilat', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.totalCollected) },
                { label: 'Bakiye', type: 'money', align: 'right', minWidth: '120px', render: (row) => (
                  <span style={{ color: row.remaining > 0 ? 'var(--color-danger)' : 'inherit' }}>{formatMoney(row.remaining)}</span>
                )},
                { label: 'Tahsilat %', align: 'right', minWidth: '90px', render: (row) => (
                  <span style={{ color: row.collectionRate >= 80 ? '#22c55e' : row.collectionRate >= 50 ? '#eab308' : '#ef4444', fontWeight: 600 }}>
                    %{row.collectionRate}
                  </span>
                )},
              ]}
              data={customers || []}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCancellations = () => {
    if (!cancellationsData) return null;
    const { summary, byReason, allCancelled } = cancellationsData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <StatCard icon="cancel" title="İptal Edilen" value={formatNumber(summary.totalCancelled)} color="danger" />
          <StatCard icon="money_off" title="Kaybedilen Ciro" value={formatMoney(summary.totalLostRevenue)} color="warning" />
          <StatCard icon="bar_chart" title="Ort. Kayıp/İş" value={formatMoney(summary.avgLostPerJob)} color="info" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="pie_chart" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />İptal Nedenleri Dağılımı</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Neden', width: '200px', render: (row) => <span>{row.icon} {row.reasonName}</span> },
                { label: 'Adet', accessor: 'count', type: 'number', align: 'right', minWidth: '80px' },
                { label: 'Oran', align: 'right', minWidth: '80px', render: (row) => `%${row.percentage}` },
                { label: 'Kaybedilen Ciro', type: 'money', align: 'right', minWidth: '140px', render: (row) => formatMoney(row.lostRevenue) },
              ]}
              data={byReason || []}
            />
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="list_alt" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />İptal Edilen İşler</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Tarih', accessor: 'date', width: '100px' },
                { label: 'İş', accessor: 'title', width: '180px' },
                { label: 'Müşteri', accessor: 'customerName', width: '150px' },
                { label: 'Neden', accessor: 'reason', width: '150px' },
                { label: 'Tutar', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.offerTotal) },
              ]}
              data={allCancelled || []}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPersonnel = () => {
    if (!personnelData) return null;
    const { summary, performanceDistribution, personnel } = personnelData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <StatCard icon="groups" title="Toplam Personel" value={formatNumber(summary.totalPersonnel)} color="primary" />
          <StatCard icon="check_circle" title="Aktif Personel" value={formatNumber(summary.activePersonnel || 0)} color="success" />
          <StatCard icon="assignment" title="Genel Görev" value={formatNumber(summary.totalGeneralTasks || 0)} color="info" />
          <StatCard icon="build" title="Montaj Görevi" value={formatNumber(summary.totalAssemblyTasks || 0)} color="secondary" />
          <StatCard icon="warning" title="Toplam Sorun" value={formatNumber(summary.totalIssues)} color="warning" />
          <StatCard icon="schedule" title="Toplam Gecikme" value={formatNumber(summary.totalDelays)} color="danger" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="analytics" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Performans Dağılımı</h4></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 20 }}>
              {performanceDistribution.map((perf, idx) => (
                <div key={idx} style={{ flex: 1, padding: 16, borderRadius: 8, background: 'var(--color-bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, display: 'flex', justifyContent: 'center' }}><StatusIcon icon={perf.icon} style={{ fontSize: 28 }} /></div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{perf.count}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{perf.level}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="people" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Personel Listesi</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Personel', width: '140px', render: (row) => (
                  <button className="btn btn-link" style={{ padding: 0, textAlign: 'left' }} onClick={() => loadPersonnelDetail(row.personId)}>
                    <strong>{row.personName}</strong>
                  </button>
                )},
                { label: 'Ekip', accessor: 'teamName', width: '110px' },
                { label: 'Unvan', accessor: 'role', width: '100px' },
                { label: 'Genel', type: 'number', align: 'right', minWidth: '60px', render: (row) => (
                  <span title="Genel Görevler">{row.generalCompletedCount || 0}/{row.generalTaskCount || 0}</span>
                )},
                { label: 'Montaj', type: 'number', align: 'right', minWidth: '60px', render: (row) => (
                  <span title="Montaj Görevleri">{row.assemblyCompletedCount || 0}/{row.assemblyTaskCount || 0}</span>
                )},
                { label: 'Toplam', type: 'number', align: 'right', minWidth: '70px', render: (row) => (
                  <span>{row.completedCount}/{row.taskCount}</span>
                )},
                { label: '%', align: 'right', minWidth: '60px', render: (row) => (
                  <span style={{ 
                    color: row.taskCount === 0 ? '#6b7280' : row.completionRate >= 80 ? '#22c55e' : row.completionRate >= 50 ? '#eab308' : '#ef4444', 
                    fontWeight: 600 
                  }}>
                    {row.taskCount === 0 ? '-' : `%${row.completionRate}`}
                  </span>
                )},
                { label: 'Sorun', accessor: 'issueCount', type: 'number', align: 'right', minWidth: '60px' },
                { label: 'Gecikme', accessor: 'delayCount', type: 'number', align: 'right', minWidth: '70px' },
                { label: 'Performans', width: '100px', render: (row) => {
                  const icons = { 'İyi': '⭐', 'Gelişmeli': '⚠️', 'Düşük': '🔴', 'Yeni': '🆕' };
                  const colors = { 'İyi': '#22c55e', 'Gelişmeli': '#eab308', 'Düşük': '#ef4444', 'Yeni': '#6b7280' };
                  return <span style={{ color: colors[row.performance], display: 'flex', alignItems: 'center', gap: 4 }}><StatusIcon icon={icons[row.performance]} style={{ fontSize: 14 }} /> {row.performance}</span>;
                }},
              ]}
              data={personnel || []}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderProcess = () => {
    if (!processData) return null;
    const { summary, transitions } = processData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <StatCard icon="schedule" title="Toplam Ort. Süre" value={`${summary.totalAvgDays} gün`} color="primary" />
          <StatCard icon="error" title="Darboğaz" value={summary.bottleneck} color="danger" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="timeline" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Aşama Süreleri</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Aşama Geçişi', accessor: 'label', width: '200px' },
                { label: 'Örnek Sayısı', accessor: 'sampleCount', type: 'number', align: 'right', minWidth: '100px' },
                { label: 'Ort. Süre', align: 'right', minWidth: '90px', render: (row) => `${row.avgDays} gün` },
                { label: 'Min', align: 'right', minWidth: '70px', render: (row) => `${row.minDays} gün` },
                { label: 'Max', align: 'right', minWidth: '70px', render: (row) => `${row.maxDays} gün` },
                { label: 'Hedef', align: 'right', minWidth: '70px', render: (row) => `${row.targetDays} gün` },
                { label: 'Sapma', align: 'right', minWidth: '80px', render: (row) => (
                  <span style={{ color: row.deviation <= 0 ? '#22c55e' : row.deviation <= 2 ? '#eab308' : '#ef4444' }}>
                    {row.deviation > 0 ? '+' : ''}{row.deviation} gün
                  </span>
                )},
                { label: 'Durum', width: '100px', render: (row) => {
                  const colors = { Normal: 'success', Uzun: 'warning', Darboğaz: 'danger' };
                  return <span className={`badge badge-${colors[row.status]}`}>{row.status}</span>;
                }},
              ]}
              data={transitions || []}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Dönem Seçimi */}
        <div className="card no-print" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="date_range" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Dönem Seçimi</h4></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>1. Dönem (Karşılaştırılacak)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <DateInput value={period1Start} onChange={setPeriod1Start} placeholder="Başlangıç" />
                  <span>-</span>
                  <DateInput value={period1End} onChange={setPeriod1End} placeholder="Bitiş" />
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>2. Dönem (Baz Dönem)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <DateInput value={period2Start} onChange={setPeriod2Start} placeholder="Başlangıç" />
                  <span>-</span>
                  <DateInput value={period2End} onChange={setPeriod2End} placeholder="Bitiş" />
                </div>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: 16 }}
              onClick={() => loadReport('comparison')}
              disabled={!period1Start || !period1End || !period2Start || !period2End}
            >
              Karşılaştır
            </button>
          </div>
        </div>

        {comparisonData && (
          <>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header"><h4 className="card-title"><StatusIcon icon="compare_arrows" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Dönemsel Karşılaştırma</h4></div>
              <div className="card-body" style={{ padding: 0 }}>
                <ReportTable
                  columns={[
                    { label: 'Metrik', accessor: 'metric', width: '180px', render: (row) => <strong>{row.metric}</strong> },
                    { label: `${comparisonData.period1.start} - ${comparisonData.period1.end}`, align: 'right', minWidth: '150px', render: (row) => 
                      row.unit === '₺' ? formatMoney(row.period1Value) : `${formatNumber(row.period1Value)} ${row.unit}`
                    },
                    { label: `${comparisonData.period2.start} - ${comparisonData.period2.end}`, align: 'right', minWidth: '150px', render: (row) => 
                      row.unit === '₺' ? formatMoney(row.period2Value) : `${formatNumber(row.period2Value)} ${row.unit}`
                    },
                    { label: 'Değişim', align: 'right', minWidth: '100px', render: (row) => (
                      <span style={{ 
                        color: row.metric === 'İptal Edilen' 
                          ? (row.change < 0 ? '#22c55e' : row.change > 0 ? '#ef4444' : '#64748b')
                          : (row.change > 0 ? '#22c55e' : row.change < 0 ? '#ef4444' : '#64748b'),
                        fontWeight: 600 
                      }}>
                        {row.change > 0 ? '↑' : row.change < 0 ? '↓' : '→'} %{Math.abs(row.change)}
                      </span>
                    )},
                  ]}
                  data={comparisonData.comparison || []}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderProduction = () => {
    if (!productionData) return null;
    const { summary } = productionData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard icon="inventory_2" title="Toplam Sipariş" value={formatNumber(summary.total)} color="primary" />
          <StatCard icon="home" title="İç Üretim" value={formatNumber(summary.internal.count)} subtitle={`Ort: ${summary.internal.avgDays} gün`} color="info" />
          <StatCard icon="local_shipping" title="Dış Üretim" value={formatNumber(summary.external.count)} subtitle={`Ort: ${summary.external.avgDays} gün`} color="warning" />
          <StatCard icon="window" title="Cam Sipariş" value={formatNumber(summary.glass.count)} subtitle={`Ort: ${summary.glass.avgDays} gün`} color="success" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="bar_chart" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Üretim Türü Karşılaştırması</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'Üretim Türü', width: '180px', render: (row) => (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusIcon icon={row.icon} style={{ fontSize: 16 }} />
                    {row.typeName}
                  </span>
                )},
                { label: 'Toplam', accessor: 'count', type: 'number', align: 'right' },
                { label: 'Tamamlanan', accessor: 'completed', type: 'number', align: 'right' },
                { label: 'Min Süre', align: 'right', render: (row) => `${row.minDays} gün` },
                { label: 'Max Süre', align: 'right', render: (row) => `${row.maxDays} gün` },
                { label: 'Ort. Süre', align: 'right', render: (row) => `${row.avgDays} gün` },
                { label: 'Sorunlu', accessor: 'withIssues', type: 'number', align: 'right' },
                { label: 'Gecikmeli', accessor: 'delayed', type: 'number', align: 'right' },
              ]}
              data={[
                { typeName: 'İç Üretim', icon: '🏠', ...summary.internal },
                { typeName: 'Dış Üretim', icon: '🚚', ...summary.external },
                { typeName: 'Cam Sipariş', icon: '🪟', ...summary.glass },
              ]}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderFinance = () => {
    if (!financeData) return null;
    const { summary, byMonth, jobs, paymentBreakdown } = financeData;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard icon="assignment" title="Toplam İş" value={formatNumber(summary.totalJobs)} color="primary" />
          <StatCard icon="payments" title="Toplam Teklif" value={formatMoney(summary.totalOffer)} color="info" />
          <StatCard icon="check_circle" title="Tahsil Edilen" value={formatMoney(summary.totalCollected)} color="success" />
          <StatCard icon="schedule" title="Kalan Bakiye" value={formatMoney(summary.totalRemaining)} color="danger" />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="bar_chart" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Tahsilat Oranı</h4></div>
          <div className="card-body">
            <ProgressBar value={summary.totalCollected} max={summary.totalOffer} color="success" label={`Tahsilat: ${formatMoney(summary.totalCollected)} / ${formatMoney(summary.totalOffer)}`} />
            <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, color: 'var(--color-success)', marginTop: 16 }}>%{summary.collectionRate}</div>
          </div>
        </div>

        {/* Ödeme Tipi Dağılımı */}
        {paymentBreakdown?.length > 0 && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="credit_card" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Ödeme Tipi Dağılımı</h4></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                {paymentBreakdown.map((pt, idx) => (
                  <div key={idx} style={{ 
                    padding: 16, 
                    borderRadius: 8, 
                    background: 'var(--color-bg-secondary)', 
                    textAlign: 'center',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: 28, display: 'flex', justifyContent: 'center' }}><StatusIcon icon={pt.icon} style={{ fontSize: 28 }} /></div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{formatMoney(pt.amount)}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{pt.label}</div>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: 'var(--color-primary)', 
                      marginTop: 8,
                      padding: '4px 8px',
                      background: 'var(--color-primary-bg)',
                      borderRadius: 4
                    }}>
                      %{pt.percentage}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {pt.count} işlem
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {byMonth?.length > 0 && (
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h4 className="card-title"><StatusIcon icon="trending_up" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Aylık Ciro &amp; Tahsilat</h4></div>
            <div className="card-body" style={{ padding: 0 }}>
              <ReportTable
                columns={[
                  { label: 'Ay', accessor: 'month', width: '100px', render: (row) => <strong>{row.month}</strong> },
                  { label: 'İş', accessor: 'count', type: 'number', align: 'right' },
                  { label: 'Teklif', type: 'money', align: 'right', minWidth: '130px', render: (row) => formatMoney(row.offer) },
                  { label: 'Tahsilat', type: 'money', align: 'right', minWidth: '130px', render: (row) => formatMoney(row.collected) },
                  { label: 'Oran', align: 'right', render: (row) => (
                    <span style={{ color: row.offer > 0 && (row.collected / row.offer) >= 0.8 ? '#22c55e' : '#eab308', fontWeight: 600 }}>
                      %{row.offer > 0 ? Math.round(row.collected / row.offer * 100) : 0}
                    </span>
                  )},
                ]}
                data={byMonth}
              />
            </div>
          </div>
        )}

        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h4 className="card-title"><StatusIcon icon="warning" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />En Yüksek Bakiyeli İşler</h4></div>
          <div className="card-body" style={{ padding: 0 }}>
            <ReportTable
              columns={[
                { label: 'İş', accessor: 'title', width: '180px' },
                { label: 'Müşteri', accessor: 'customerName', width: '150px' },
                { label: 'Durum', width: '100px', render: (row) => <span className="badge badge-secondary">{row.status}</span> },
                { label: 'Teklif', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.offerTotal) },
                { label: 'Tahsilat', type: 'money', align: 'right', minWidth: '120px', render: (row) => formatMoney(row.collected) },
                { label: 'Kalan', type: 'money', align: 'right', minWidth: '120px', render: (row) => (
                  <strong style={{ color: 'var(--color-danger)' }}>{formatMoney(row.remaining)}</strong>
                )},
              ]}
              data={(jobs || []).filter(j => j.remaining > 0).slice(0, 20)}
            />
          </div>
        </div>
      </div>
    );
  };

  // ==================== SUPPLIER DETAIL MODAL ====================

  const renderSupplierDetailModal = () => {
    if (!supplierDetailData) return <Loader text="Yükleniyor..." />;
    if (supplierDetailData.error) return <div className="error-text">{supplierDetailData.error}</div>;
    
    const { reportDate, periodStart, periodEnd, supplier, summary, delayedOrders, problemOrders, allOrders } = supplierDetailData;
    
    const orderTypeLabels = { glass: 'Cam', external: 'Dış Üretim', purchase: 'Satınalma' };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Rapor Başlığı */}
        <div style={{ textAlign: 'center', padding: 20, borderBottom: '2px solid var(--color-border)', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>TEDARİKÇİ PERFORMANS RAPORU</h2>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8 }}>
            <strong>{supplier.name}</strong> - {supplier.category} {supplier.supplyType && `(${supplier.supplyType})`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Dönem: {periodStart} - {periodEnd} | Rapor Tarihi: {reportDate}
          </div>
        </div>

        {/* Özet */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.totalOrders}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Toplam Sipariş</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Üretim: {summary.productionOrderCount || 0} | Satınalma: {summary.purchaseOrderCount || 0}
            </div>
          </div>
          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatNumber(summary.totalQuantity)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Toplam Adet</div>
          </div>
          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatMoney(summary.totalAmount || 0)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Toplam Tutar</div>
          </div>
          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.onTimeRate >= 80 ? '#22c55e' : '#eab308' }}>%{summary.onTimeRate}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Zamanında Teslim</div>
          </div>
          <div style={{ padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.problemRate > 5 ? '#ef4444' : '#22c55e' }}>%{summary.problemRate}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Sorun Oranı</div>
          </div>
        </div>

        {/* Detay İstatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gecikmeli Teslimat:</span>
              <strong>{summary.delayedCount} adet</strong>
            </div>
            {summary.delayedCount > 0 && (
              <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                Ortalama Gecikme: <strong>{summary.avgDelayDays} gün</strong>
              </div>
            )}
          </div>
          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, border: '1px solid #fca5a5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sorunlu Teslimat:</span>
              <strong>{summary.problemQuantity} adet</strong>
            </div>
          </div>
        </div>

        {/* Geciken Siparişler */}
        {delayedOrders?.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}><StatusIcon icon="schedule" style={{ fontSize: 18 }} /> Geciken Siparişler</h4>
            <ReportTable
              columns={[
                { label: 'Sipariş', accessor: 'orderId', width: '100px' },
                { label: 'Tip', width: '80px', render: (row) => orderTypeLabels[row.orderType] || row.orderType },
                { label: 'Müşteri', accessor: 'customerName', width: '140px' },
                { label: 'Anlaşılan', accessor: 'estimatedDelivery', width: '100px' },
                { label: 'Teslim', accessor: 'actualDelivery', width: '100px' },
                { label: 'Gecikme', align: 'right', minWidth: '80px', render: (row) => (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>{row.delayDays} gün</span>
                )},
                { label: 'Adet', accessor: 'quantity', type: 'number', align: 'right' },
              ]}
              data={delayedOrders}
            />
          </div>
        )}

        {/* Sorunlu Teslimatlar */}
        {problemOrders?.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}><StatusIcon icon="warning" style={{ fontSize: 18 }} /> Sorunlu Teslimatlar</h4>
            <ReportTable
              columns={[
                { label: 'Sipariş', accessor: 'orderId', width: '100px' },
                { label: 'Tip', width: '80px', render: (row) => orderTypeLabels[row.orderType] || row.orderType },
                { label: 'Müşteri', accessor: 'customerName', width: '140px' },
                { label: 'Ürün', accessor: 'itemName', width: '150px' },
                { label: 'Sorun Tipi', accessor: 'problemType', width: '120px' },
                { label: 'Sorunlu Adet', accessor: 'problemQty', type: 'number', align: 'right' },
              ]}
              data={problemOrders}
            />
          </div>
        )}

        {/* Değerlendirme */}
        <div style={{ padding: 16, background: summary.onTimeRate >= 80 ? '#dcfce7' : '#fef9c3', borderRadius: 8, border: `1px solid ${summary.onTimeRate >= 80 ? '#86efac' : '#fde047'}` }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}><StatusIcon icon="assignment" style={{ fontSize: 16 }} /> Değerlendirme:</strong>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>
            {summary.onTimeRate >= 80 
              ? `Bu dönemde %${summary.onTimeRate} zamanında teslim oranı ile anlaşma şartları karşılanmıştır.`
              : `Bu dönemde %${summary.onTimeRate} zamanında teslim oranı ile anlaşma şartlarının altında performans gösterilmiştir. Gecikmelerin önlenmesi için gerekli tedbirlerin alınmasını rica ederiz.`
            }
            {summary.problemQuantity > 0 && ` Ayrıca ${summary.problemQuantity} adet sorunlu teslimat tespit edilmiştir.`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div>
      <style>{printStyles}</style>
      
      {/* Print Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>{currentTabInfo?.printTitle || 'Rapor'}</h1>
        <div className="print-meta">Dönem: {dateRangeText} | Oluşturulma: {new Date().toLocaleDateString('tr-TR')}</div>
      </div>

      <PageHeader 
        title={<><StatusIcon icon="bar_chart" style={{ fontSize: 24, marginRight: 8, verticalAlign: 'middle' }} />Raporlar</>}
        subtitle="Detaylı analiz ve performans raporları"
        actions={
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success" onClick={handleExportExcel} title="Excel olarak indir">
              <StatusIcon icon="table_chart" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Excel
            </button>
            <button className="btn btn-info" onClick={handleExportPDF} title="PDF olarak indir">
              <StatusIcon icon="picture_as_pdf" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> PDF
            </button>
            <button className="btn btn-secondary" onClick={handlePrint} title="Yazdır">
              <StatusIcon icon="print" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Yazdır
            </button>
          </div>
        }
      />

      {/* Tarih Filtreleri */}
      {activeTab !== 'comparison' && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Tarih:</span>
              <DateInput value={startDate} onChange={setStartDate} placeholder="Başlangıç" />
              <span>-</span>
              <DateInput value={endDate} onChange={setEndDate} placeholder="Bitiş" />
            </div>
            {(startDate || endDate) && (
              <button className="btn btn-secondary btn-small" onClick={() => { setStartDate(''); setEndDate(''); }}>Temizle</button>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigasyon */}
      <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <StatusIcon icon={tab.icon} style={{ fontSize: 16 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}><Loader text="Rapor yükleniyor..." /></div>
      ) : error ? (
        <div className="card" style={{ padding: 20, border: '1px solid var(--color-danger)' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><StatusIcon icon="cancel" style={{ fontSize: 16 }} /> Hata: {error}</div>
        </div>
      ) : (
        <>
          {activeTab === 'performance' && renderPerformance()}
          {activeTab === 'inquiry' && renderInquiry()}
          {activeTab === 'suppliers' && renderSuppliers()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'cancellations' && renderCancellations()}
          {activeTab === 'personnel' && renderPersonnel()}
          {activeTab === 'process' && renderProcess()}
          {activeTab === 'comparison' && renderComparison()}
          {activeTab === 'production' && renderProduction()}
          {activeTab === 'finance' && renderFinance()}
        </>
      )}

      {/* Tedarikçi Detay Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); setSupplierDetailData(null); }}
        title={<><StatusIcon icon="local_shipping" style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />Tedarikçi Performans Detayı</>}
        size="lg"
      >
        {renderSupplierDetailModal()}
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={handlePrintSupplierReport}><StatusIcon icon="print" style={{ fontSize: 16, marginRight: 4, verticalAlign: 'middle' }} /> Raporu Yazdır</button>
        </div>
      </Modal>

      {/* Personel Detay Modal */}
      <Modal
        isOpen={showPersonnelModal}
        onClose={() => { setShowPersonnelModal(false); setPersonnelDetailData(null); }}
        title={<><StatusIcon icon="person" style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />Personel Performans Detayı</>}
        size="lg"
      >
        {personnelDetailData ? (
          personnelDetailData.error ? (
            <div className="alert alert-danger">{personnelDetailData.error}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Personel Bilgileri */}
              <div className="card" style={{ margin: 0 }}>
                <div className="card-header"><h4 className="card-title"><StatusIcon icon="assignment" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Personel Bilgileri</h4></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div><strong>Ad Soyad:</strong> {personnelDetailData.person?.name}</div>
                    <div><strong>E-posta:</strong> {personnelDetailData.person?.email || '-'}</div>
                    <div><strong>Telefon:</strong> {personnelDetailData.person?.phone || '-'}</div>
                    <div><strong>Unvan:</strong> {personnelDetailData.person?.role || '-'}</div>
                    <div><strong>Durum:</strong> {personnelDetailData.person?.active ? <><StatusIcon icon="check_circle" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Aktif</> : <><StatusIcon icon="hourglass_empty" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Pasif</>}</div>
                    <div><strong>Ekipler:</strong> {personnelDetailData.teams?.map(t => t.name).join(', ') || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Özet */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Genel Görev</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{personnelDetailData.summary?.generalCompletedCount || 0}/{personnelDetailData.summary?.generalTaskCount || 0}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Montaj Görev</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{personnelDetailData.summary?.assemblyCompletedCount || 0}/{personnelDetailData.summary?.assemblyTaskCount || 0}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Sorun</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: personnelDetailData.summary?.issueCount > 0 ? '#ef4444' : 'inherit' }}>{personnelDetailData.summary?.issueCount || 0}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Gecikme</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: personnelDetailData.summary?.delayCount > 0 ? '#eab308' : 'inherit' }}>{personnelDetailData.summary?.delayCount || 0}</div>
                </div>
              </div>

              {/* Montaj Görevleri */}
              {personnelDetailData.assemblyTasks?.length > 0 && (
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header"><h4 className="card-title"><StatusIcon icon="construction" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Son Montaj Görevleri</h4></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <table className="report-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>İş</th>
                          <th>Aşama</th>
                          <th>Durum</th>
                          <th>Planlanan</th>
                          <th>Tamamlanan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personnelDetailData.assemblyTasks.map((task, idx) => (
                          <tr key={idx}>
                            <td>{task.jobTitle}</td>
                            <td>{task.stageName}</td>
                            <td>
                              <span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'secondary'}`}>
                                {task.status === 'completed' ? <><StatusIcon icon="check_circle" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Tamamlandı</> : task.status === 'in_progress' ? <><StatusIcon icon="sync" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Devam</> : <><StatusIcon icon="hourglass_empty" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Beklemede</>}
                              </span>
                            </td>
                            <td>{task.plannedDate || '-'}</td>
                            <td>{task.completedAt?.split('T')[0] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sorunlar */}
              {personnelDetailData.issues?.length > 0 && (
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header"><h4 className="card-title"><StatusIcon icon="warning" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Atfedilen Sorunlar</h4></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <table className="report-table" style={{ width: '100%' }}>
                      <thead><tr><th>İş</th><th>Tip</th><th>Not</th><th>Tarih</th></tr></thead>
                      <tbody>
                        {personnelDetailData.issues.map((issue, idx) => (
                          <tr key={idx}>
                            <td>{issue.jobTitle}</td>
                            <td>{issue.type}</td>
                            <td>{issue.note || '-'}</td>
                            <td>{issue.date?.split('T')[0] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <Loader text="Personel bilgileri yükleniyor..." />
        )}
      </Modal>

      {/* Müşteri Detay Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setCustomerDetailData(null); }}
        title={<><StatusIcon icon="person" style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />Müşteri Detayı</>}
        size="lg"
      >
        {customerDetailData ? (
          customerDetailData.error ? (
            <div className="alert alert-danger">{customerDetailData.error}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Müşteri Bilgileri */}
              <div className="card" style={{ margin: 0 }}>
                <div className="card-header"><h4 className="card-title"><StatusIcon icon="assignment" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Müşteri Bilgileri</h4></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    <div><strong>Ad:</strong> {customerDetailData.customer?.name}</div>
                    <div><strong>İletişim:</strong> {customerDetailData.customer?.contact || '-'}</div>
                    <div><strong>Konum:</strong> {customerDetailData.customer?.location || '-'}</div>
                    <div><strong>Müşteri Tipi:</strong> {customerDetailData.customer?.customerSegment || '-'}</div>
                    <div><strong>Performans Segmenti:</strong> {customerDetailData.customer?.performanceSegment || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Özet */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Toplam İş</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{customerDetailData.summary?.totalJobs || 0}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Ciro</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(customerDetailData.summary?.totalOffer || 0)}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Tahsilat</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{formatMoney(customerDetailData.summary?.totalCollected || 0)}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Bakiye</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: customerDetailData.summary?.remaining > 0 ? '#ef4444' : 'inherit' }}>{formatMoney(customerDetailData.summary?.remaining || 0)}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
                Tahsilat Oranı: %{customerDetailData.summary?.collectionRate || 0}
              </div>

              {/* İşler */}
              {customerDetailData.jobs?.length > 0 && (
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header"><h4 className="card-title"><StatusIcon icon="assignment" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />İşler</h4></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <table className="report-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>İş</th>
                          <th>Durum</th>
                          <th>Teklif</th>
                          <th>Tahsilat</th>
                          <th>Bakiye</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetailData.jobs.map((job, idx) => (
                          <tr key={idx}>
                            <td>{job.title}</td>
                            <td><span className="badge badge-secondary">{job.status}</span></td>
                            <td style={{ textAlign: 'right' }}>{formatMoney(job.offer)}</td>
                            <td style={{ textAlign: 'right', color: '#22c55e' }}>{formatMoney(job.collected)}</td>
                            <td style={{ textAlign: 'right', color: job.remaining > 0 ? '#ef4444' : 'inherit' }}>{formatMoney(job.remaining)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ödemeler */}
              {customerDetailData.payments?.length > 0 && (
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header"><h4 className="card-title"><StatusIcon icon="attach_money" style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle' }} />Son Ödemeler</h4></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <table className="report-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>İş</th>
                          <th>Tutar</th>
                          <th>Tip</th>
                          <th>Tarih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetailData.payments.map((payment, idx) => (
                          <tr key={idx}>
                            <td>{payment.jobTitle}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>{formatMoney(payment.amount)}</td>
                            <td>{payment.type}</td>
                            <td>{payment.date || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <Loader text="Müşteri bilgileri yükleniyor..." />
        )}
      </Modal>
    </div>
  );
};

export default Raporlar;
