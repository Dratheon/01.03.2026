export const NAV_ITEMS = [
  {
    section: 'Kontrol',
    items: [{ icon: 'dashboard', label: 'Kontrol Paneli', path: '/dashboard', permission: 'dashboard.view' }],
  },
  {
    section: 'Operasyon',
    items: [
      {
        icon: 'assignment',
        label: 'İşler',
        path: '/isler',
        permission: 'jobs.list',
        collapsible: true,
        children: [
          { label: 'İş Listesi', path: '/isler/list', permission: 'jobs.list' },
          { label: 'Keşif/Ölçü Takvimi', path: '/isler/takvim', permission: 'jobs.measurement' },
          { label: 'Üretim Planı', path: '/isler/uretim-plani', permission: 'production.plan' },
          { label: 'Montaj Takvimi', path: '/isler/montaj-takvimi', permission: 'assembly.calendar' },
          { 
            label: 'Üretim Takip', 
            path: '/isler/uretim-takip',
            icon: 'factory',
            permission: 'production.list',
            children: [
              { label: 'Tüm Emirler', path: '/isler/uretim-takip/siparisler', permission: 'production.list' },
              { label: 'İç Üretim', path: '/isler/uretim-takip/ic-uretim', permission: 'production.list' },
              { label: 'Dış Üretim', path: '/isler/uretim-takip/dis-siparis', permission: 'production.list' },
              { label: 'Cam Emirleri', path: '/isler/uretim-takip/cam', permission: 'production.list' },
              { label: 'Sorun Takip', path: '/isler/uretim-takip/sorunlar', permission: 'production.issues' },
            ]
          },
          { 
            label: 'Montaj Takip', 
            path: '/isler/montaj-takip',
            icon: 'build',
            permission: 'assembly.view',
            children: [
              { label: 'Planlanan Montajlar', path: '/isler/montaj-takip/planlanan', permission: 'assembly.planned' },
              { label: 'Bugünkü Montajlar', path: '/isler/montaj-takip/bugun', permission: 'assembly.today' },
              { label: 'Bekleyen Sorunlar', path: '/isler/montaj-takip/sorunlar', permission: 'assembly.issues' },
            ]
          },
        ],
      },
      {
        icon: 'task_alt',
        label: 'Görevler',
        path: '/gorevler',
        permission: 'tasks.list',
        collapsible: true,
        children: [
          { label: 'Görev Listesi', path: '/gorevler/list', permission: 'tasks.list' },
          { label: 'Personel', path: '/gorevler/personel', permission: 'personnel.list' },
          { label: 'Ekipler', path: '/gorevler/ekipler', permission: 'teams.list' },
          { label: 'Roller', path: '/gorevler/roller', permission: 'roles.*' },
        ],
      },
      { icon: 'groups', label: 'Müşteriler', path: '/musteriler', permission: 'customers.list' },
    ],
  },
  {
    section: 'Stok & Satınalma',
    items: [
      {
        icon: 'inventory_2',
        label: 'Stok',
        path: '/stok',
        permission: 'stock.list',
        collapsible: true,
        children: [
          { label: 'Stok Listesi', path: '/stok/liste', permission: 'stock.list' },
          { label: 'Stok Hareketleri', path: '/stok/hareketler', permission: 'stock.movements' },
          { label: 'Kritik Stok', path: '/stok/kritik', permission: 'stock.critical' },
          { label: 'Rezervasyonlar', path: '/stok/rezervasyonlar', permission: 'stock.reservations' },
          { label: 'Renkler', path: '/stok/renkler', permission: 'stock.colors' },
        ],
      },
      {
        icon: 'shopping_cart',
        label: 'Satınalma',
        path: '/satinalma',
        permission: 'purchasing.orders',
        collapsible: true,
        children: [
          { label: 'Siparişler (PO)', path: '/satinalma/siparisler', permission: 'purchasing.orders' },
          { label: 'Eksik Ürünler', path: '/satinalma/eksik', permission: 'purchasing.missing' },
          { label: 'Bekleyen Teslimatlar', path: '/satinalma/bekleyen', permission: 'purchasing.orders' },
          { label: 'Tedarikçiler', path: '/satinalma/tedarikciler', permission: 'purchasing.suppliers' },
        ],
      },
    ],
  },
  {
    section: 'Finans & Evrak',
    items: [
      { icon: 'description', label: 'İrsaliye & Fatura', path: '/evrak/irsaliye-fatura', permission: 'documents.view' },
      { icon: 'account_balance_wallet', label: 'Ödemeler/Kasa', path: '/finans/odemeler-kasa', permission: 'finance.payments' },
    ],
  },
  {
    section: 'Dijital Arşiv & Rapor',
    items: [
      { icon: 'archive', label: 'Dijital Arşiv', path: '/arsiv', permission: 'archive.view' },
      { icon: 'bar_chart', label: 'Raporlar', path: '/raporlar', permission: 'reports.view' },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { icon: 'monitoring', label: 'Aktiviteler', path: '/aktiviteler', permission: 'activities.view' },
      { icon: 'settings', label: 'Ayarlar', path: '/ayarlar', permission: 'settings.view' },
    ],
  },
];

export const normalizePath = (path) => {
  if (!path) return '/';
  const cleaned = path.replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
};

export const findPageTitle = (pathname) => {
  const normalized = normalizePath(pathname);
  let title = 'İş Takip Paneli';

  NAV_ITEMS.forEach((section) => {
    section.items.forEach((item) => {
      if (normalizePath(item.path) === normalized) {
        title = item.label;
      }
      if (item.children) {
        item.children.forEach((child) => {
          if (normalizePath(child.path) === normalized) {
            title = child.label;
          }
          if (child.children) {
            child.children.forEach((grandchild) => {
              if (normalizePath(grandchild.path) === normalized) {
                title = grandchild.label;
              }
            });
          }
        });
      }
    });
  });

  return title;
};
