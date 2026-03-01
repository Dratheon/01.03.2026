/**
 * Sistemdeki tüm izinlerin tanımları
 * Bu liste hem Roles.jsx hem Personnel.jsx'te kullanılır
 */
export const AVAILABLE_PERMISSIONS = [
  // === GENEL ===
  { value: '*', label: 'Tüm Yetkiler (Admin)', category: 'Genel', description: 'Sistemdeki tüm yetkilere sahip olur' },
  
  // === DASHBOARD ===
  { value: 'dashboard.view', label: 'Dashboard Görüntüle', category: 'Dashboard', description: 'Kontrol panelini görebilir' },
  { value: 'dashboard.finance', label: 'Finans Widget\'ları', category: 'Dashboard', description: 'Finans kartlarını ve özet bilgilerini görür' },
  { value: 'dashboard.production', label: 'Üretim Widget\'ları', category: 'Dashboard', description: 'Üretim durumu kartlarını görür' },
  { value: 'dashboard.assembly', label: 'Montaj Widget\'ları', category: 'Dashboard', description: 'Montaj durumu kartlarını görür' },
  { value: 'dashboard.stock', label: 'Stok Widget\'ları', category: 'Dashboard', description: 'Stok durumu ve kritik stok uyarılarını görür' },
  { value: 'dashboard.urgent', label: 'Acil İşler Bölümü', category: 'Dashboard', description: 'Bugün acil işler bölümünü görür' },
  
  // === İŞLER ===
  { value: 'jobs.*', label: 'Tüm İş Yetkileri', category: 'İşler', description: 'İşlerle ilgili tüm işlemleri yapabilir' },
  { value: 'jobs.list', label: 'İş Listesi Sayfası', category: 'İşler', description: 'İş listesi sayfasına erişebilir' },
  { value: 'jobs.view', label: 'İş Detayı Görüntüle', category: 'İşler', description: 'İş detaylarını görebilir' },
  { value: 'jobs.create', label: 'İş Oluştur', category: 'İşler', description: 'Yeni iş başlatabilir' },
  { value: 'jobs.update', label: 'İş Güncelle', category: 'İşler', description: 'İş bilgilerini düzenleyebilir' },
  { value: 'jobs.delete', label: 'İş Sil/İptal', category: 'İşler', description: 'İş silebilir veya iptal edebilir' },
  { value: 'jobs.approve', label: 'İş Onayla', category: 'İşler', description: 'İş onaylama işlemi yapabilir' },
  { value: 'jobs.measurement', label: 'Keşif/Ölçü Takvimi', category: 'İşler', description: 'Keşif ve ölçü takvimini görebilir/düzenleyebilir' },
  { value: 'jobs.offer', label: 'Teklif İşlemleri', category: 'İşler', description: 'Teklif gönderme, onaylama işlemleri' },
  { value: 'jobs.finance', label: 'İş Finans Bilgileri', category: 'İşler', description: 'İş içindeki finansal bilgileri görebilir' },
  
  // === ÜRETİM ===
  { value: 'production.*', label: 'Tüm Üretim Yetkileri', category: 'Üretim', description: 'Üretimle ilgili tüm işlemleri yapabilir' },
  { value: 'production.list', label: 'Üretim Emirleri Listesi', category: 'Üretim', description: 'Üretim emirleri sayfasına erişebilir' },
  { value: 'production.view', label: 'Üretim Emri Görüntüle', category: 'Üretim', description: 'Üretim emri detaylarını görebilir' },
  { value: 'production.create', label: 'Üretim Emri Oluştur', category: 'Üretim', description: 'Yeni üretim emri oluşturabilir' },
  { value: 'production.update', label: 'Üretim Emri Güncelle', category: 'Üretim', description: 'Üretim emrini düzenleyebilir' },
  { value: 'production.delivery', label: 'Üretim Teslimat Kaydet', category: 'Üretim', description: 'Üretim teslimat kaydı yapabilir' },
  { value: 'production.issues', label: 'Üretim Sorun Takip', category: 'Üretim', description: 'Üretim sorunlarını görebilir/çözebilir' },
  { value: 'production.plan', label: 'Üretim Planı Sayfası', category: 'Üretim', description: 'Üretim planı sayfasına erişebilir' },
  
  // === MONTAJ ===
  { value: 'assembly.*', label: 'Tüm Montaj Yetkileri', category: 'Montaj', description: 'Montajla ilgili tüm işlemleri yapabilir' },
  { value: 'assembly.calendar', label: 'Montaj Takvimi', category: 'Montaj', description: 'Montaj takvimi sayfasına erişebilir' },
  { value: 'assembly.today', label: 'Bugünkü Montajlar', category: 'Montaj', description: 'Bugünkü montajlar sayfasına erişebilir' },
  { value: 'assembly.planned', label: 'Planlanan Montajlar', category: 'Montaj', description: 'Planlanan montajlar listesini görebilir' },
  { value: 'assembly.view', label: 'Montaj Görevi Görüntüle', category: 'Montaj', description: 'Montaj görevi detaylarını görebilir' },
  { value: 'assembly.start', label: 'Montaj Başlat', category: 'Montaj', description: 'Montaj görevini başlatabilir' },
  { value: 'assembly.complete', label: 'Montaj Tamamla', category: 'Montaj', description: 'Montaj görevini tamamlayabilir' },
  { value: 'assembly.schedule', label: 'Montaj Planla', category: 'Montaj', description: 'Yeni montaj planlayabilir' },
  { value: 'assembly.reschedule', label: 'Montaj Yeniden Planla', category: 'Montaj', description: 'Montaj tarihini değiştirebilir' },
  { value: 'assembly.issues', label: 'Montaj Sorunları', category: 'Montaj', description: 'Montaj sorunlarını görebilir' },
  { value: 'assembly.reportIssue', label: 'Montaj Sorun Bildir', category: 'Montaj', description: 'Montaj sorunu bildirebilir' },
  
  // === GÖREVLER ===
  { value: 'tasks.*', label: 'Tüm Görev Yetkileri', category: 'Görevler', description: 'Görevlerle ilgili tüm işlemleri yapabilir' },
  { value: 'tasks.list', label: 'Görev Listesi', category: 'Görevler', description: 'Görev listesi sayfasına erişebilir' },
  { value: 'tasks.view', label: 'Görev Görüntüle', category: 'Görevler', description: 'Görev detaylarını görebilir' },
  { value: 'tasks.create', label: 'Görev Oluştur', category: 'Görevler', description: 'Yeni görev oluşturabilir' },
  { value: 'tasks.update', label: 'Görev Güncelle', category: 'Görevler', description: 'Görev bilgilerini düzenleyebilir' },
  { value: 'tasks.assign', label: 'Görev Ata', category: 'Görevler', description: 'Personele görev atayabilir' },
  { value: 'tasks.complete', label: 'Görev Tamamla', category: 'Görevler', description: 'Görev tamamlayabilir' },
  
  // === MÜŞTERİLER ===
  { value: 'customers.*', label: 'Tüm Müşteri Yetkileri', category: 'Müşteriler', description: 'Müşterilerle ilgili tüm işlemleri yapabilir' },
  { value: 'customers.list', label: 'Müşteri Listesi', category: 'Müşteriler', description: 'Müşteri listesi sayfasına erişebilir' },
  { value: 'customers.view', label: 'Müşteri Görüntüle', category: 'Müşteriler', description: 'Müşteri detaylarını görebilir' },
  { value: 'customers.create', label: 'Müşteri Oluştur', category: 'Müşteriler', description: 'Yeni müşteri ekleyebilir' },
  { value: 'customers.update', label: 'Müşteri Güncelle', category: 'Müşteriler', description: 'Müşteri bilgilerini düzenleyebilir' },
  { value: 'customers.delete', label: 'Müşteri Sil', category: 'Müşteriler', description: 'Müşteri silebilir' },
  
  // === PERSONEL & EKİPLER ===
  { value: 'personnel.*', label: 'Tüm Personel Yetkileri', category: 'Personel', description: 'Personelle ilgili tüm işlemleri yapabilir' },
  { value: 'personnel.list', label: 'Personel Listesi', category: 'Personel', description: 'Personel listesi sayfasına erişebilir' },
  { value: 'personnel.view', label: 'Personel Görüntüle', category: 'Personel', description: 'Personel detaylarını görebilir' },
  { value: 'personnel.create', label: 'Personel Oluştur', category: 'Personel', description: 'Yeni personel/kullanıcı ekleyebilir' },
  { value: 'personnel.update', label: 'Personel Güncelle', category: 'Personel', description: 'Personel bilgilerini düzenleyebilir' },
  { value: 'personnel.delete', label: 'Personel Sil', category: 'Personel', description: 'Personel silebilir' },
  { value: 'teams.*', label: 'Tüm Ekip Yetkileri', category: 'Ekipler', description: 'Ekiplerle ilgili tüm işlemleri yapabilir' },
  { value: 'teams.list', label: 'Ekip Listesi', category: 'Ekipler', description: 'Ekip listesi sayfasına erişebilir' },
  { value: 'teams.view', label: 'Ekip Görüntüle', category: 'Ekipler', description: 'Ekip detaylarını görebilir' },
  { value: 'teams.create', label: 'Ekip Oluştur', category: 'Ekipler', description: 'Yeni ekip oluşturabilir' },
  { value: 'teams.update', label: 'Ekip Güncelle', category: 'Ekipler', description: 'Ekip bilgilerini düzenleyebilir' },
  { value: 'roles.*', label: 'Rol Yönetimi (Tüm)', category: 'Roller', description: 'Rol ekleme/düzenleme/silme yapabilir' },
  { value: 'roles.view', label: 'Rolleri Görüntüle', category: 'Roller', description: 'Rol listesini görebilir' },
  
  // === STOK ===
  { value: 'stock.*', label: 'Tüm Stok Yetkileri', category: 'Stok', description: 'Stokla ilgili tüm işlemleri yapabilir' },
  { value: 'stock.list', label: 'Stok Listesi', category: 'Stok', description: 'Stok listesi sayfasına erişebilir' },
  { value: 'stock.view', label: 'Stok Görüntüle', category: 'Stok', description: 'Stok detaylarını görebilir' },
  { value: 'stock.create', label: 'Ürün Ekle', category: 'Stok', description: 'Yeni ürün ekleyebilir' },
  { value: 'stock.update', label: 'Stok Güncelle', category: 'Stok', description: 'Stok bilgilerini düzenleyebilir' },
  { value: 'stock.movements', label: 'Stok Hareketleri', category: 'Stok', description: 'Stok hareketlerini görebilir' },
  { value: 'stock.movement.create', label: 'Stok Hareketi Oluştur', category: 'Stok', description: 'Stok giriş/çıkış kaydı yapabilir' },
  { value: 'stock.critical', label: 'Kritik Stok', category: 'Stok', description: 'Kritik stok sayfasına erişebilir' },
  { value: 'stock.reservations', label: 'Stok Rezervasyonları', category: 'Stok', description: 'Rezervasyonları görebilir' },
  { value: 'stock.colors', label: 'Renk Yönetimi', category: 'Stok', description: 'Renkleri görebilir/düzenleyebilir' },
  
  // === SATINALMA ===
  { value: 'purchasing.*', label: 'Tüm Satınalma Yetkileri', category: 'Satınalma', description: 'Satınalmayla ilgili tüm işlemleri yapabilir' },
  { value: 'purchasing.orders', label: 'Sipariş Listesi', category: 'Satınalma', description: 'Satınalma siparişleri sayfasına erişebilir' },
  { value: 'purchasing.view', label: 'Sipariş Görüntüle', category: 'Satınalma', description: 'Sipariş detaylarını görebilir' },
  { value: 'purchasing.create', label: 'Sipariş Oluştur', category: 'Satınalma', description: 'Yeni satınalma siparişi oluşturabilir' },
  { value: 'purchasing.update', label: 'Sipariş Güncelle', category: 'Satınalma', description: 'Sipariş bilgilerini düzenleyebilir' },
  { value: 'purchasing.receive', label: 'Teslimat Al', category: 'Satınalma', description: 'Teslimat kaydı yapabilir' },
  { value: 'purchasing.delete', label: 'Sipariş Sil', category: 'Satınalma', description: 'Satınalma siparişi silebilir' },
  { value: 'purchasing.missing', label: 'Eksik Ürünler', category: 'Satınalma', description: 'Eksik ürünler sayfasına erişebilir' },
  { value: 'purchasing.suppliers', label: 'Tedarikçi Listesi', category: 'Satınalma', description: 'Tedarikçi listesine erişebilir' },
  { value: 'purchasing.supplier.create', label: 'Tedarikçi Ekle', category: 'Satınalma', description: 'Yeni tedarikçi ekleyebilir' },
  { value: 'purchasing.supplier.update', label: 'Tedarikçi Güncelle', category: 'Satınalma', description: 'Tedarikçi bilgilerini düzenleyebilir' },
  
  // === FİNANS ===
  { value: 'finance.*', label: 'Tüm Finans Yetkileri', category: 'Finans', description: 'Finansla ilgili tüm işlemleri yapabilir' },
  { value: 'finance.view', label: 'Finans Görüntüle', category: 'Finans', description: 'Finans bilgilerini görebilir' },
  { value: 'finance.payments', label: 'Ödemeler/Kasa Sayfası', category: 'Finans', description: 'Ödemeler ve kasa sayfasına erişebilir' },
  { value: 'finance.create', label: 'Ödeme/Tahsilat Oluştur', category: 'Finans', description: 'Ödeme veya tahsilat kaydı yapabilir' },
  { value: 'finance.update', label: 'Finans Güncelle', category: 'Finans', description: 'Finans kayıtlarını düzenleyebilir' },
  { value: 'finance.reports', label: 'Finans Raporları', category: 'Finans', description: 'Finans raporlarını görebilir' },
  
  // === EVRAK ===
  { value: 'documents.*', label: 'Tüm Evrak Yetkileri', category: 'Evrak', description: 'Evraklarla ilgili tüm işlemleri yapabilir' },
  { value: 'documents.view', label: 'Evrak Görüntüle', category: 'Evrak', description: 'Evrakları görebilir' },
  { value: 'documents.upload', label: 'Evrak Yükle', category: 'Evrak', description: 'Evrak yükleyebilir' },
  { value: 'documents.delete', label: 'Evrak Sil', category: 'Evrak', description: 'Evrak silebilir' },
  
  // === ARŞİV ===
  { value: 'archive.*', label: 'Tüm Arşiv Yetkileri', category: 'Arşiv', description: 'Dijital arşivle ilgili tüm işlemleri yapabilir' },
  { value: 'archive.view', label: 'Arşiv Görüntüle', category: 'Arşiv', description: 'Dijital arşivi görebilir' },
  { value: 'archive.upload', label: 'Arşive Yükle', category: 'Arşiv', description: 'Arşive belge yükleyebilir' },
  { value: 'archive.delete', label: 'Arşivden Sil', category: 'Arşiv', description: 'Arşivden belge silebilir' },
  
  // === RAPORLAR ===
  { value: 'reports.*', label: 'Tüm Rapor Yetkileri', category: 'Raporlar', description: 'Raporlarla ilgili tüm işlemleri yapabilir' },
  { value: 'reports.view', label: 'Rapor Görüntüle', category: 'Raporlar', description: 'Raporları görebilir' },
  { value: 'reports.export', label: 'Rapor Dışa Aktar', category: 'Raporlar', description: 'Raporları PDF/Excel olarak indirebilir' },
  
  // === SİSTEM ===
  { value: 'activities.view', label: 'Aktiviteleri Görüntüle', category: 'Sistem', description: 'Sistem aktivitelerini görebilir' },
  { value: 'settings.*', label: 'Tüm Ayar Yetkileri', category: 'Sistem', description: 'Sistem ayarlarıyla ilgili tüm işlemleri yapabilir' },
  { value: 'settings.view', label: 'Ayarları Görüntüle', category: 'Sistem', description: 'Sistem ayarlarını görebilir' },
  { value: 'settings.update', label: 'Ayarları Güncelle', category: 'Sistem', description: 'Sistem ayarlarını değiştirebilir' },
  { value: 'settings.jobroles', label: 'İş Kolları Yönetimi', category: 'Sistem', description: 'İş kollarını ekleyebilir/düzenleyebilir' },
];

/**
 * İzin kategorilerini getir
 */
export const getPermissionCategories = () => {
  return Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));
};

/**
 * Kategori bazlı izinleri getir
 */
export const getPermissionsByCategory = (category) => {
  return AVAILABLE_PERMISSIONS.filter(p => p.category === category);
};

/**
 * İzin label'ını getir
 */
export const getPermissionLabel = (permValue) => {
  const perm = AVAILABLE_PERMISSIONS.find(p => p.value === permValue);
  return perm ? perm.label : permValue;
};
