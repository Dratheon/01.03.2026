/**
 * Export Utilities - PDF ve Excel export fonksiyonları
 */

// Para formatı
const formatMoney = (value) => {
  const num = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  return `${num} ₺`;
};

const formatNumber = (value) => new Intl.NumberFormat('tr-TR').format(value || 0);

/**
 * Excel Export - CSV formatında indirir
 * @param {Array} data - Export edilecek veri dizisi
 * @param {Array} columns - Sütun tanımları [{key, label, format}]
 * @param {string} filename - Dosya adı
 */
export const exportToExcel = (data, columns, filename = 'rapor') => {
  if (!data || data.length === 0) {
    alert('Export edilecek veri bulunamadı');
    return;
  }

  // CSV separator (Excel için ; kullanıyoruz Türkçe locale için)
  const separator = ';';
  
  // Header row
  const headers = columns.map(col => `"${col.label}"`).join(separator);
  
  // Data rows
  const rows = data.map(row => {
    return columns.map(col => {
      let value = col.accessor ? row[col.accessor] : (col.render ? col.render(row) : '');
      
      // Custom formatter
      if (col.format === 'money') {
        value = formatMoney(row[col.accessor]);
      } else if (col.format === 'number') {
        value = formatNumber(row[col.accessor]);
      } else if (col.format === 'date') {
        value = row[col.accessor] || '';
      } else if (col.format === 'percent') {
        value = `%${row[col.accessor] || 0}`;
      }
      
      // Clean value for CSV
      if (value === null || value === undefined) value = '';
      value = String(value).replace(/"/g, '""');
      
      return `"${value}"`;
    }).join(separator);
  });
  
  // Combine header and rows
  const csvContent = '\uFEFF' + [headers, ...rows].join('\n'); // BOM for UTF-8
  
  // Create and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * PDF Export - Yeni pencerede yazdırma için HTML oluşturur
 * @param {string} title - Rapor başlığı
 * @param {string} content - HTML içerik
 * @param {Object} options - Ek seçenekler
 */
export const exportToPDF = (title, content, options = {}) => {
  const {
    subtitle = '',
    dateRange = '',
    orientation = 'portrait', // 'portrait' | 'landscape'
    autoPrint = true,
  } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup engelleyici aktif olabilir. Lütfen izin verin.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 ${orientation};
          margin: 15mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          font-size: 11pt;
          color: #1e293b;
          background: white;
          padding: 0;
          line-height: 1.5;
        }
        
        .report-container {
          max-width: 100%;
          margin: 0 auto;
        }
        
        /* Header */
        .report-header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 2px solid #1e293b;
          margin-bottom: 24px;
        }
        
        .report-logo {
          font-size: 14pt;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        
        .report-title {
          font-size: 18pt;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .report-subtitle {
          font-size: 12pt;
          color: #64748b;
          margin-bottom: 4px;
        }
        
        .report-meta {
          font-size: 10pt;
          color: #94a3b8;
        }
        
        /* Content */
        .report-content {
          padding: 0;
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .stat-box {
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 20pt;
          font-weight: 700;
          color: #1e293b;
        }
        
        .stat-value.primary { color: #2563eb; }
        .stat-value.success { color: #16a34a; }
        .stat-value.warning { color: #f59e0b; }
        .stat-value.danger { color: #dc2626; }
        
        .stat-label {
          font-size: 10pt;
          color: #64748b;
          margin-top: 4px;
        }
        
        /* Section */
        .report-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 12pt;
          font-weight: 600;
          color: #1e293b;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 12px;
        }
        
        /* Table */
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-bottom: 16px;
        }
        
        .report-table th,
        .report-table td {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          text-align: left;
        }
        
        .report-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
        }
        
        .report-table td {
          color: #1e293b;
        }
        
        .report-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .report-table .text-right {
          text-align: right;
        }
        
        .report-table .text-center {
          text-align: center;
        }
        
        .report-table .money {
          text-align: right;
          font-family: 'Consolas', 'Monaco', monospace;
          white-space: nowrap;
        }
        
        .report-table .number {
          text-align: right;
          font-family: 'Consolas', 'Monaco', monospace;
        }
        
        /* Status Badges */
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 500;
        }
        
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c3; color: #854d0e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-secondary { background: #f1f5f9; color: #475569; }
        
        /* Info Boxes */
        .info-box {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .info-box.success { background: #dcfce7; border: 1px solid #86efac; }
        .info-box.warning { background: #fef3c3; border: 1px solid #fde047; }
        .info-box.danger { background: #fee2e2; border: 1px solid #fca5a5; }
        .info-box.info { background: #dbeafe; border: 1px solid #93c5fd; }
        
        /* Footer */
        .report-footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9pt;
          color: #94a3b8;
          text-align: center;
        }
        
        /* Print Specific */
        @media print {
          body { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="report-header">
          <div class="report-logo">İŞ TAKİP SİSTEMİ</div>
          <h1 class="report-title">${title}</h1>
          ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
          <div class="report-meta">
            ${dateRange ? `Dönem: ${dateRange} | ` : ''}Rapor Tarihi: ${currentDate}
          </div>
        </div>
        
        <div class="report-content">
          ${content}
        </div>
        
        <div class="report-footer">
          Bu rapor İş Takip Sistemi tarafından otomatik olarak oluşturulmuştur.
        </div>
      </div>
      
      ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * HTML Table oluşturur - PDF export için
 */
export const createTableHTML = (data, columns, options = {}) => {
  const { emptyText = 'Veri bulunamadı' } = options;
  
  if (!data || data.length === 0) {
    return `<p style="text-align: center; color: #64748b; padding: 20px;">${emptyText}</p>`;
  }
  
  const headers = columns.map(col => 
    `<th class="${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}">${col.label}</th>`
  ).join('');
  
  const rows = data.map(row => {
    const cells = columns.map(col => {
      let value = col.accessor ? row[col.accessor] : '';
      let className = '';
      
      if (col.format === 'money') {
        value = formatMoney(row[col.accessor]);
        className = 'money';
      } else if (col.format === 'number') {
        value = formatNumber(row[col.accessor]);
        className = 'number';
      } else if (col.format === 'percent') {
        value = `%${row[col.accessor] || 0}`;
        className = 'text-right';
      } else if (col.render) {
        value = col.render(row);
      }
      
      if (col.align === 'right') className += ' text-right';
      if (col.align === 'center') className += ' text-center';
      
      return `<td class="${className}">${value !== null && value !== undefined ? value : '-'}</td>`;
    }).join('');
    
    return `<tr>${cells}</tr>`;
  }).join('');
  
  return `
    <table class="report-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

/**
 * Stats Grid HTML oluşturur
 */
export const createStatsHTML = (stats) => {
  if (!stats || stats.length === 0) return '';
  
  const items = stats.map(stat => `
    <div class="stat-box">
      <div class="stat-value ${stat.color || ''}">${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
    </div>
  `).join('');
  
  return `<div class="stats-grid">${items}</div>`;
};

/**
 * Section HTML oluşturur
 */
export const createSectionHTML = (title, content) => {
  return `
    <div class="report-section">
      <h3 class="section-title">${title}</h3>
      ${content}
    </div>
  `;
};

export default {
  exportToExcel,
  exportToPDF,
  createTableHTML,
  createStatsHTML,
  createSectionHTML,
};
