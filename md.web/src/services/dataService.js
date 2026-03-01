import logger from './logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Pydantic validation hatalarını Türkçeleştir
const translateValidationError = (detail) => {
  if (!detail) return 'Bilinmeyen hata';
  
  // String ise direkt döndür
  if (typeof detail === 'string') return detail;
  
  // Pydantic validation error array ise
  if (Array.isArray(detail)) {
    const fieldErrors = detail.map((err) => {
      const field = err.loc?.slice(-1)[0] || 'alan';
      const fieldNames = {
        productCode: 'Ürün Kodu',
        colorCode: 'Renk Kodu',
        name: 'Ürün Adı',
        unit: 'Birim',
        supplierId: 'Tedarikçi',
        supplierName: 'Tedarikçi Adı',
        qty: 'Miktar',
        quantity: 'Miktar',
        itemId: 'Ürün',
        critical: 'Kritik Seviye',
        email: 'E-posta',
        ad: 'Ad',
        soyad: 'Soyad',
        baslik: 'Başlık',
      };
      const turkishField = fieldNames[field] || field;
      
      const typeErrors = {
        'value_error.missing': 'gerekli',
        'type_error.none.not_allowed': 'boş olamaz',
        'type_error.integer': 'sayı olmalı',
        'type_error.float': 'sayı olmalı',
        'type_error.string': 'metin olmalı',
      };
      const turkishType = typeErrors[err.type] || err.msg || 'hatalı';
      
      return `${turkishField} ${turkishType}`;
    });
    return fieldErrors.join(', ');
  }
  
  return String(detail);
};

const fetchJson = async (path, options = {}) => {
  const baseHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Auth token ekle (varsa)
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    baseHeaders['Authorization'] = `Bearer ${authToken}`;
  }
  
  // Headers'ları birleştir (options.headers varsa üzerine yaz)
  const mergedHeaders = {
    ...baseHeaders,
    ...(options.headers || {}),
  };
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: mergedHeaders,
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = translateValidationError(err.detail) || response.statusText;
      
      // API hatasını logla
      logger.apiError(path, response.status, message, err);
      
      throw new Error(message);
    }
    
    return response.json();
  } catch (error) {
    // Network hatası veya diğer hatalar
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      logger.error('Network Hatası', error, { path, method: options.method || 'GET' });
      throw new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    }
    throw error;
  }
};

// ========== AUTH API ==========

// Token yönetimi
const getAuthToken = () => localStorage.getItem('authToken');
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Auth header ekle
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Auth ile fetch
const fetchJsonWithAuth = async (path, options = {}) => {
  const authHeaders = getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  };
  return fetchJson(path, mergedOptions);
};

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (data.success && data.token) {
    setAuthToken(data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
  }
  return data;
};

export const logout = async () => {
  try {
    await fetchJsonWithAuth('/auth/logout', { method: 'POST' });
  } catch (e) {
    // ignore
  }
  setAuthToken(null);
  localStorage.removeItem('currentUser');
};

export const getMe = async () => fetchJsonWithAuth('/auth/me');

export const checkSession = async () => fetchJsonWithAuth('/auth/check');

export const getCurrentUser = () => {
  const stored = localStorage.getItem('currentUser');
  return stored ? JSON.parse(stored) : null;
};

export const isAuthenticated = () => !!getAuthToken();

// ========== USERS API ==========

export const getUsers = async () => fetchJsonWithAuth('/users');

export const getUser = async (id) => fetchJsonWithAuth(`/users/${id}`);

export const createUser = async (data) =>
  fetchJsonWithAuth('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateUser = async (id, data) =>
  fetchJsonWithAuth(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const changeUserPassword = async (id, newPassword) =>
  fetchJsonWithAuth(`/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });

export const deleteUser = async (id) =>
  fetchJsonWithAuth(`/users/${id}`, { method: 'DELETE' });

// ========== ACTIVITIES API ==========

export const getActivities = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  if (params.userId) query.set('userId', params.userId);
  if (params.action) query.set('action', params.action);
  if (params.targetType) query.set('targetType', params.targetType);
  if (params.targetId) query.set('targetId', params.targetId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  return fetchJsonWithAuth(`/activities?${query.toString()}`);
};

export const getActivitySummary = async (days = 7) =>
  fetchJsonWithAuth(`/activities/summary?days=${days}`);

export const getActivitiesByTarget = async (targetType, targetId, limit = 20) =>
  fetchJsonWithAuth(`/activities/by-target/${targetType}/${targetId}?limit=${limit}`);

export const getActivitiesByUser = async (userId, limit = 50) =>
  fetchJsonWithAuth(`/activities/by-user/${userId}?limit=${limit}`);

export const getDashboardData = async () => {
  // Dashboard widget'ları artık ayrı ayrı API'lerden çekiliyor
  // Bu fonksiyon sadece geriye uyumluluk için kaldı
  try {
    const [overview, measure, production] = await Promise.all([
      getWidgetOverview().catch(() => ({})),
      getWidgetMeasureStatus().catch(() => ({})),
      getWidgetProductionStatus().catch(() => ({})),
    ]);
    return {
      stats: overview,
      activities: [],
      priorityJobs: [],
      weekOverview: {},
      paymentStatus: {},
      teamStatus: {},
    };
  } catch (e) {
    console.warn('Dashboard data failed', e);
    return {
      stats: {},
      activities: [],
      priorityJobs: [],
      weekOverview: {},
      paymentStatus: {},
      teamStatus: {},
    };
  }
};

export const getJobs = async (includeDeleted = false) => {
  const params = includeDeleted ? '?include_deleted=true' : '';
  return fetchJson(`/jobs${params}`);
};

export const getJob = async (id) => fetchJson(`/jobs/${id}`);

export const createJob = async (payload) =>
  fetchJson('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateJobMeasure = async (id, payload) =>
  fetchJson(`/jobs/${id}/measure`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateJobRoles = async (id, roles) =>
  fetchJson(`/jobs/${id}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });

export const reportMeasureIssue = async (jobId, payload) =>
  fetchJson(`/jobs/${jobId}/measure/issue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resolveMeasureIssue = async (jobId, issueId) =>
  fetchJson(`/jobs/${jobId}/measure/issue/${issueId}/resolve`, {
    method: 'POST',
  });

export const updateJobOffer = async (id, payload) =>
  fetchJson(`/jobs/${id}/offer`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const startJobApproval = async (id, payload) =>
  fetchJson(`/jobs/${id}/approval/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateJobPayment = async (id, paymentPlan) =>
  fetchJson(`/jobs/${id}/approval/payment`, {
    method: 'PUT',
    body: JSON.stringify({ paymentPlan }),
  });

export const updateStockStatus = async (id, payload) =>
  fetchJson(`/jobs/${id}/stock`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateProductionStatus = async (id, payload) =>
  fetchJson(`/jobs/${id}/production`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const scheduleAssembly = async (id, payload) =>
  fetchJson(`/jobs/${id}/assembly/schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateEstimatedAssembly = async (id, payload) =>
  fetchJson(`/jobs/${id}/estimated-assembly`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const completeAssembly = async (id, payload) =>
  fetchJson(`/jobs/${id}/assembly/complete`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const closeFinance = async (id, payload) =>
  fetchJson(`/jobs/${id}/finance/close`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const getTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.durum) params.append('durum', filters.durum);
  if (filters.oncelik) params.append('oncelik', filters.oncelik);
  if (filters.assigneeType) params.append('assigneeType', filters.assigneeType);
  if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
  const query = params.toString();
  return fetchJson(`/tasks${query ? `?${query}` : ''}`);
};

export const getTask = async (taskId) => fetchJson(`/tasks/${taskId}`);

export const createTask = async (payload) =>
  fetchJson('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTask = async (taskId, payload) =>
  fetchJson(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateTaskStatus = async (taskId, durum) =>
  fetchJson(`/tasks/${taskId}/durum?durum=${durum}`, {
    method: 'PATCH',
  });

export const softDeleteTask = async (taskId) =>
  fetchJson(`/tasks/${taskId}`, { method: 'DELETE' });

export const assignTask = async (taskId, payload) =>
  fetchJson(`/tasks/${taskId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const unassignTask = async (taskId) =>
  fetchJson(`/tasks/${taskId}/assign`, { method: 'DELETE' });

// ========== PERSONNEL API ==========

export const getPersonnel = async (aktifMi = null) => {
  const params = aktifMi !== null ? `?aktifMi=${aktifMi}` : '';
  return fetchJson(`/personnel${params}`);
};

export const getPerson = async (personnelId) => fetchJson(`/personnel/${personnelId}`);

export const createPersonnel = async (payload) =>
  fetchJson('/personnel', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updatePersonnel = async (personnelId, payload) =>
  fetchJson(`/personnel/${personnelId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const togglePersonnelStatus = async (personnelId, aktifMi) =>
  fetchJson(`/personnel/${personnelId}/aktif?aktifMi=${aktifMi}`, {
    method: 'PATCH',
  });

export const softDeletePersonnel = async (personnelId) =>
  fetchJson(`/personnel/${personnelId}`, { method: 'DELETE' });

// ========== ROLES API ==========

export const getRoles = async (aktifMi = null) => {
  const params = aktifMi !== null ? `?aktifMi=${aktifMi}` : '';
  return fetchJson(`/roles${params}`);
};

export const getRole = async (roleId) => fetchJson(`/roles/${roleId}`);

export const createRole = async (payload) =>
  fetchJson('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateRole = async (roleId, payload) =>
  fetchJson(`/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const softDeleteRole = async (roleId) =>
  fetchJson(`/roles/${roleId}`, { method: 'DELETE' });

// ========== TEAMS API ==========

export const getTeams = async (aktifMi = null) => {
  const params = aktifMi !== null ? `?aktifMi=${aktifMi}` : '';
  return fetchJson(`/teams${params}`);
};

export const getTeam = async (teamId) => fetchJson(`/teams/${teamId}`);

export const createTeam = async (payload) =>
  fetchJson('/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTeam = async (teamId, payload) =>
  fetchJson(`/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const softDeleteTeam = async (teamId) =>
  fetchJson(`/teams/${teamId}`, { method: 'DELETE' });

export const getTeamMembers = async (teamId) => fetchJson(`/teams/${teamId}/members`);

export const addTeamMember = async (teamId, personnelId) =>
  fetchJson(`/teams/${teamId}/members?personnel_id=${personnelId}`, {
    method: 'POST',
  });

export const removeTeamMember = async (teamId, personnelId) =>
  fetchJson(`/teams/${teamId}/members/${personnelId}`, { method: 'DELETE' });

export const getCustomers = async () => {
  return fetchJson('/customers');
};

export const createCustomer = async (payload) => {
  return fetchJson('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateCustomer = async (id, payload) => {
  return fetchJson(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const softDeleteCustomer = async (id) => {
  return fetchJson(`/customers/${id}`, {
    method: 'DELETE',
  });
};

export const getPlanningEvents = async () => {
  try {
    return await fetchJson('/assembly/tasks');
  } catch (e) {
    console.warn('API planning events failed', e);
    return [];
  }
};

export const getStockItems = async () => {
  try {
    return await fetchJson('/stock/items');
  } catch (e) {
    console.warn('API stock items failed', e);
    return [];
  }
};

export const createStockItem = async (payload) =>
  fetchJson('/stock/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateStockItem = async (id, payload) =>
  fetchJson(`/stock/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteStockItem = async (id) =>
  fetchJson(`/stock/items/${id}`, {
    method: 'DELETE',
  });

export const createStockMovement = async (payload) =>
  fetchJson('/stock/movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getStockMovements = async () => {
  try {
    return await fetchJson('/stock/movements');
  } catch (e) {
    console.warn('API stock movements failed', e);
    return [];
  }
};

export const getReservations = async () => {
  try {
    return await fetchJson('/stock/reservations');
  } catch (e) {
    console.warn('API reservations failed', e);
    return [];
  }
};

export const getJobLogs = async (jobId) => {
  // Loglar artık job içinde tutuluyor
  try {
    const job = await fetchJson(`/jobs/${jobId}`);
    return job.logs || [];
  } catch (e) {
    console.warn('Job logs failed', e);
    return [];
  }
};

export const addJobLog = async (payload) => {
  // Loglar artık job endpoint'leri üzerinden ekleniyor
  // Bu fonksiyon geriye uyumluluk için kaldı
  console.warn('addJobLog deprecated - logs are added via job endpoints');
  return payload;
};

export const updateJobStatus = async (id, payload) =>
  fetchJson(`/jobs/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteJob = async (jobId) =>
  fetchJsonWithAuth(`/jobs/${jobId}`, {
    method: 'DELETE',
  });

// Fiyat Sorgusu (Müşteri Ölçüsü) Onay/Red kararı
export const submitInquiryDecision = async (id, payload) =>
  fetchJson(`/jobs/${id}/inquiry-decision`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const getJobRoles = async () => {
  try {
    return await fetchJson('/settings/job-roles');
  } catch (e) {
    console.warn('API job roles failed', e);
    return [];
  }
};

export const createJobRole = async (payload) =>
  fetchJson('/settings/job-roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateJobRole = async (id, payload) =>
  fetchJson(`/settings/job-roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteJobRole = async (id) =>
  fetchJson(`/settings/job-roles/${id}`, {
    method: 'DELETE',
  });

export const getColors = async () => fetchJson('/colors/');

export const createColor = async (payload) =>
  fetchJson('/colors/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteColor = async (id) =>
  fetchJson(`/colors/${id}`, {
    method: 'DELETE',
  });

export const getPurchaseOrders = async () => {
  try {
    return await fetchJson('/purchase/orders');
  } catch (e) {
    console.warn('API purchase orders failed', e);
    return [];
  }
};

export const getSuppliers = async () => {
  try {
    return await fetchJson('/suppliers/');
  } catch (e) {
    console.warn('API suppliers failed', e);
    return [];
  }
};

export const getRequests = async () => {
  try {
    return await fetchJson('/purchase/requests');
  } catch (e) {
    console.warn('API requests failed', e);
    return [];
  }
};

export const getInvoices = async () => {
  try {
    return await fetchJson('/purchase/invoices');
  } catch (e) {
    console.warn('API invoices failed', e);
    return [];
  }
};

export const getPayments = async () => {
  try {
    return await fetchJson('/payments/');
  } catch (e) {
    console.warn('API payments failed', e);
    return [];
  }
};

export const getArchiveFiles = async () => {
  try {
    return await fetchJson('/documents/');
  } catch (e) {
    console.warn('API archive files failed', e);
    return [];
  }
};

export const getReports = async () => fetchJson('/reports');

export const getProductionReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/production${params.toString() ? '?' + params.toString() : ''}`);
};

export const getAssemblyReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/assembly${params.toString() ? '?' + params.toString() : ''}`);
};

export const getDelaysReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/delays${params.toString() ? '?' + params.toString() : ''}`);
};

export const getFinanceReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/finance${params.toString() ? '?' + params.toString() : ''}`);
};

export const getIssuesReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/issues${params.toString() ? '?' + params.toString() : ''}`);
};

export const getPerformanceReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/performance${params.toString() ? '?' + params.toString() : ''}`);
};

// Yeni Detaylı Raporlar
export const getSuppliersReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/suppliers${params.toString() ? '?' + params.toString() : ''}`);
};

export const getSupplierDetailReport = async (supplierId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/supplier/${supplierId}${params.toString() ? '?' + params.toString() : ''}`);
};

export const getCustomersAnalysisReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/customers-analysis${params.toString() ? '?' + params.toString() : ''}`);
};

export const getCancellationsReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/cancellations${params.toString() ? '?' + params.toString() : ''}`);
};

export const getPeriodComparisonReport = async (period1Start, period1End, period2Start, period2End) => {
  const params = new URLSearchParams();
  params.append('period1_start', period1Start);
  params.append('period1_end', period1End);
  params.append('period2_start', period2Start);
  params.append('period2_end', period2End);
  return fetchJson(`/reports/period-comparison?${params.toString()}`);
};

export const getPersonnelPerformanceReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/personnel-performance${params.toString() ? '?' + params.toString() : ''}`);
};

export const getProcessTimeReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/process-time${params.toString() ? '?' + params.toString() : ''}`);
};

// Fiyat Sorgusu Dönüşüm Raporu
export const getInquiryConversionReport = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/inquiry-conversion${params.toString() ? '?' + params.toString() : ''}`);
};

export const getPersonnelDetailReport = async (personId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/personnel/${personId}${params.toString() ? '?' + params.toString() : ''}`);
};

export const getCustomerDetailReport = async (customerId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchJson(`/reports/customer/${customerId}${params.toString() ? '?' + params.toString() : ''}`);
};

export const getSettings = async () => {
  try {
    return await fetchJson('/settings/');
  } catch (e) {
    console.warn('API settings failed', e);
    return [];
  }
};

// Document Management
export const getDocuments = async (jobId = null, docType = null) => {
  let url = '/documents';
  const params = new URLSearchParams();
  if (jobId) params.append('job_id', jobId);
  if (docType) params.append('doc_type', docType);
  if (params.toString()) url += `?${params.toString()}`;
  return fetchJson(url);
};

export const getJobDocuments = async (jobId) => fetchJson(`/documents/job/${jobId}`);

export const uploadDocument = async (file, jobId, docType, description = '', folderId = null, supplierId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('docType', docType);
  if (jobId) formData.append('jobId', jobId);
  if (description) formData.append('description', description);
  if (folderId) formData.append('folderId', folderId);
  if (supplierId) formData.append('supplierId', supplierId);

  // Auth header ekle
  const authToken = localStorage.getItem('authToken');
  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Dosya yüklenemedi');
  }

  return response.json();
};

export const deleteDocument = async (docId) =>
  fetchJson(`/documents/${docId}`, { method: 'DELETE' });

export const getDocumentDownloadUrl = (docId) => `${API_BASE}/documents/${docId}/download`;

// ========== FOLDER (KLASÖR) API ==========

export const getFolders = async () => fetchJson('/folders');

export const getFolder = async (folderId) => fetchJson(`/folders/${folderId}`);

export const createFolder = async (data) =>
  fetchJson('/folders', { method: 'POST', body: JSON.stringify(data) });

export const updateFolder = async (folderId, data) =>
  fetchJson(`/folders/${folderId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteFolder = async (folderId) =>
  fetchJson(`/folders/${folderId}`, { method: 'DELETE' });

export const getFolderDocuments = async (folderId) =>
  fetchJson(`/folders/${folderId}/documents`);

// ========== STOK API ==========

export const searchStockItems = async (query = '', supplierId = '') => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (supplierId) params.append('supplierId', supplierId);
  return fetchJson(`/stock/items/search?${params.toString()}`);
};

export const getStockItemByCode = async (productCode, colorCode) =>
  fetchJson(`/stock/items/by-code/${productCode}/${colorCode}`);

export const getCriticalStock = async () => fetchJson('/stock/critical');

export const checkStockAvailability = async (items) => {
  // items: [{itemId, qty}, ...]
  const itemsStr = items.map((i) => `${i.itemId}:${i.qty}`).join(',');
  return fetchJson(`/stock/availability-check?items=${itemsStr}`);
};

export const bulkReserveStock = async (payload) =>
  fetchJson('/stock/bulk-reserve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getStockReservations = async (jobId = null) => {
  try {
    const params = jobId ? `?jobId=${jobId}` : '';
    return await fetchJson(`/stock/reservations${params}`);
  } catch (e) {
    console.warn('API stock reservations failed', e);
    return [];
  }
};

export const releaseReservation = async (reservationId) =>
  fetchJson(`/stock/reservations/${reservationId}/release`, { method: 'PUT' });

// ========== SATIN ALMA (PURCHASE) API ==========

export const getPurchaseOrdersFromAPI = async (status = null, supplierId = null) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (supplierId) params.append('supplierId', supplierId);
  return fetchJson(`/purchase/orders?${params.toString()}`);
};

export const getPurchaseOrder = async (orderId) =>
  fetchJson(`/purchase/orders/${orderId}`);

export const createPurchaseOrder = async (payload) =>
  fetchJson('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updatePurchaseOrder = async (orderId, payload) =>
  fetchJson(`/purchase/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const addItemsToPurchaseOrder = async (orderId, payload) =>
  fetchJson(`/purchase/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const sendPurchaseOrder = async (orderId) =>
  fetchJson(`/purchase/orders/${orderId}/send`, { method: 'PUT' });

export const receivePurchaseDelivery = async (orderId, payload) =>
  fetchJson(`/purchase/orders/${orderId}/receive`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deletePurchaseOrder = async (orderId) =>
  fetchJson(`/purchase/orders/${orderId}`, { method: 'DELETE' });

export const getMissingItems = async () => fetchJson('/purchase/missing-items');

export const createOrderFromMissing = async (supplierId) =>
  fetchJson(`/purchase/create-from-missing?supplier_id=${supplierId}`, { method: 'POST' });

// ========== TEDARİKÇİ API ==========

export const getSuppliersFromAPI = async (type = null) => {
  try {
    const params = type ? `?type=${type}` : '';
    return await fetchJson(`/suppliers/${params}`);
  } catch (e) {
    console.warn('API suppliers failed', e);
    return [];
  }
};

export const getSupplier = async (supplierId) =>
  fetchJson(`/suppliers/${supplierId}`);

export const createSupplier = async (payload) =>
  fetchJson('/suppliers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateSupplier = async (supplierId, payload) =>
  fetchJson(`/suppliers/${supplierId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteSupplier = async (supplierId) =>
  fetchJson(`/suppliers/${supplierId}`, { method: 'DELETE' });

export const getSupplierTransactions = async (supplierId, type = null) => {
  const params = type ? `?type=${type}` : '';
  return fetchJson(`/suppliers/${supplierId}/transactions${params}`);
};

export const createSupplierTransaction = async (supplierId, payload) =>
  fetchJson(`/suppliers/${supplierId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteSupplierTransaction = async (supplierId, transactionId) =>
  fetchJson(`/suppliers/${supplierId}/transactions/${transactionId}`, { method: 'DELETE' });

export const getSupplierBalance = async (supplierId) =>
  fetchJson(`/suppliers/${supplierId}/balance`);

export const getSupplierProducts = async (supplierId) =>
  fetchJson(`/suppliers/${supplierId}/products`);

export const getSupplierOrders = async (supplierId, status = null) => {
  const params = status ? `?status=${status}` : '';
  return fetchJson(`/suppliers/${supplierId}/orders${params}`);
};

// ========== ÜRETİM & TEDARİK SİPARİŞLERİ API ==========

export const getProductionOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.jobId) params.append('jobId', filters.jobId);
  if (filters.roleId) params.append('roleId', filters.roleId);
  if (filters.orderType) params.append('orderType', filters.orderType);
  if (filters.status) params.append('status', filters.status);
  if (filters.supplierId) params.append('supplierId', filters.supplierId);
  if (filters.overdue) params.append('overdue', 'true');
  const queryStr = params.toString();
  return fetchJson(`/production/${queryStr ? '?' + queryStr : ''}`);
};

export const getProductionOrdersByJob = async (jobId) =>
  fetchJson(`/production/by-job/${jobId}`);

export const getProductionOrder = async (orderId) =>
  fetchJson(`/production/${orderId}`);

export const createProductionOrder = async (payload) =>
  fetchJson('/production/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateProductionOrder = async (orderId, payload) =>
  fetchJson(`/production/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateProductionPlan = async (orderId, payload) =>
  fetchJson(`/production/${orderId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updateProductionDates = async (orderId, payload) =>
  fetchJson(`/production/${orderId}/dates`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteProductionOrder = async (orderId) =>
  fetchJson(`/production/${orderId}`, { method: 'DELETE' });

export const recordProductionDelivery = async (orderId, payload) =>
  fetchJson(`/production/${orderId}/delivery`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resolveProductionIssue = async (orderId, issueId, payload) =>
  fetchJson(`/production/${orderId}/issues/${issueId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getProductionSummary = async () =>
  fetchJson('/production/summary');

export const getProductionAlerts = async () =>
  fetchJson('/production/alerts');

export const getProductionCombinations = async () =>
  fetchJson('/production/combinations');

// ========== AYARLAR (SETTINGS) API ==========

export const getSettingsAll = async () => fetchJson('/settings');

export const getGeneralSettings = async () => fetchJson('/settings/general');

export const updateCompanyInfo = async (payload) =>
  fetchJson('/settings/company', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const updateGeneralSetting = async (settingId, payload) =>
  fetchJson(`/settings/general/${settingId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const getJobRolesConfig = async (activeOnly = false) => {
  const params = activeOnly ? '?active_only=true' : '';
  return fetchJson(`/settings/job-roles${params}`);
};

export const getJobRoleConfig = async (roleId) =>
  fetchJson(`/settings/job-roles/${roleId}`);

export const createJobRoleConfig = async (payload) =>
  fetchJson('/settings/job-roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateJobRoleConfig = async (roleId, payload) =>
  fetchJson(`/settings/job-roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteJobRoleConfig = async (roleId) =>
  fetchJson(`/settings/job-roles/${roleId}`, { method: 'DELETE' });

export const getGlassTypes = async () => fetchJson('/settings/glass-types');

export const createGlassType = async (payload) =>
  fetchJson('/settings/glass-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateGlassType = async (glassId, payload) =>
  fetchJson(`/settings/glass-types/${glassId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteGlassType = async (glassId) =>
  fetchJson(`/settings/glass-types/${glassId}`, { method: 'DELETE' });

export const getCombinationTypes = async () =>
  fetchJson('/settings/combination-types');

// ========== Issue Types (Sorun Tipleri) ==========
export const getIssueTypes = async () => fetchJson('/settings/issue-types');

export const createIssueType = async (payload) =>
  fetchJson('/settings/issue-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateIssueType = async (id, payload) =>
  fetchJson(`/settings/issue-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteIssueType = async (id) =>
  fetchJson(`/settings/issue-types/${id}`, { method: 'DELETE' });

// ========== Fault Sources (Hata Kaynakları) ==========
export const getFaultSources = async () => fetchJson('/settings/fault-sources');

export const createFaultSource = async (payload) =>
  fetchJson('/settings/fault-sources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateFaultSource = async (id, payload) =>
  fetchJson(`/settings/fault-sources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteFaultSource = async (id) =>
  fetchJson(`/settings/fault-sources/${id}`, { method: 'DELETE' });

// ========== Cancel Reasons (İptal Nedenleri) ==========
export const getCancelReasons = async () => fetchJson('/settings/cancel-reasons');

export const createCancelReason = async (payload) =>
  fetchJson('/settings/cancel-reasons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCancelReason = async (id, payload) =>
  fetchJson(`/settings/cancel-reasons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteCancelReason = async (id) =>
  fetchJson(`/settings/cancel-reasons/${id}`, { method: 'DELETE' });

// ========== Delay Reasons (Gecikme Nedenleri) ==========
export const getDelayReasons = async () => fetchJson('/settings/delay-reasons');

export const createDelayReason = async (payload) =>
  fetchJson('/settings/delay-reasons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateDelayReason = async (id, payload) =>
  fetchJson(`/settings/delay-reasons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteDelayReason = async (id) =>
  fetchJson(`/settings/delay-reasons/${id}`, { method: 'DELETE' });

// ========== Supplier Categories (Tedarikçi Kategorileri) ==========

export const getSupplierCategories = async () => 
  fetchJson('/settings/supplier-categories');

export const createSupplierCategory = async (payload) =>
  fetchJson('/settings/supplier-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateSupplierCategory = async (id, payload) =>
  fetchJson(`/settings/supplier-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteSupplierCategory = async (id) =>
  fetchJson(`/settings/supplier-categories/${id}`, { method: 'DELETE' });

export const getJobsByCustomerId = async (customerId) => {
  const jobs = await getJobs();
  return jobs.filter((j) => j.customerId === customerId);
};

// ========== Assembly (Montaj Takip) ==========

export const getAssemblyTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.jobId) params.append('jobId', filters.jobId);
  if (filters.roleId) params.append('roleId', filters.roleId);
  if (filters.teamId) params.append('teamId', filters.teamId);
  if (filters.status) params.append('status', filters.status);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.overdue) params.append('overdue', 'true');
  const query = params.toString();
  return fetchJson(`/assembly/tasks${query ? '?' + query : ''}`);
};

export const getAssemblyTasksToday = async (teamId = null) => {
  const query = teamId ? `?teamId=${teamId}` : '';
  return fetchJson(`/assembly/tasks/today${query}`);
};

export const getAssemblyTasksByJob = async (jobId) =>
  fetchJson(`/assembly/tasks/by-job/${jobId}`);

export const getAssemblyTask = async (taskId) =>
  fetchJson(`/assembly/tasks/${taskId}`);

export const createAssemblyTask = async (payload) =>
  fetchJson('/assembly/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createAssemblyTasksForJob = async (jobId) =>
  fetchJson(`/assembly/tasks/create-for-job/${jobId}`, { method: 'POST' });

export const updateAssemblyTask = async (taskId, payload) =>
  fetchJson(`/assembly/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const startAssemblyTask = async (taskId, payload = {}) =>
  fetchJson(`/assembly/tasks/${taskId}/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const completeAssemblyTask = async (taskId, payload = {}) =>
  fetchJson(`/assembly/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const completeAllAssemblyTasks = async (jobId, payload = {}) =>
  fetchJson(`/assembly/tasks/complete-all/${jobId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const reportAssemblyIssue = async (taskId, payload) =>
  fetchJson(`/assembly/tasks/${taskId}/issue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resolveAssemblyIssue = async (taskId, issueId) =>
  fetchJson(`/assembly/tasks/${taskId}/issues/${issueId}/resolve`, {
    method: 'POST',
  });

export const getAssemblySummary = async () =>
  fetchJson('/assembly/summary');

export const checkTeamAvailability = async (teamId, date) =>
  fetchJson(`/assembly/team-availability?teamId=${teamId}&date=${date}`);

// ========== GECİKME & YENİDEN PLANLAMA API ==========

/**
 * Montaj görevi gecikme kaydı
 */
export const recordAssemblyDelay = async (taskId, payload) =>
  fetchJson(`/assembly/tasks/${taskId}/delay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Montaj görevi yeniden planlama (gecikme kontrolü ile)
 */
export const rescheduleAssemblyTask = async (taskId, payload) =>
  fetchJson(`/assembly/tasks/${taskId}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

/**
 * Montaj gecikme raporu
 */
export const getAssemblyDelayReport = async (dateFrom = null, dateTo = null) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  return fetchJson(`/assembly/delay-report?${params}`);
};

// ========== DASHBOARD WIDGETS API ==========

export const getWidgetOverview = async () => fetchJson('/dashboard/widgets/overview');
export const getWidgetMeasureStatus = async () => fetchJson('/dashboard/widgets/measure-status');
export const getWidgetProductionStatus = async () => fetchJson('/dashboard/widgets/production-status');
export const getWidgetAssemblyStatus = async () => fetchJson('/dashboard/widgets/assembly-status');
export const getWidgetStockAlerts = async () => fetchJson('/dashboard/widgets/stock-alerts');
export const getWidgetPendingOrders = async () => fetchJson('/dashboard/widgets/pending-orders');
export const getWidgetWeeklySummary = async () => fetchJson('/dashboard/widgets/weekly-summary');
export const getWidgetFinancialSummary = async () => fetchJson('/dashboard/widgets/financial-summary');
export const getWidgetTasksSummary = async () => fetchJson('/dashboard/widgets/tasks-summary');
export const getWidgetInquiryStats = async () => fetchJson('/dashboard/widgets/inquiry-stats');
export const getWidgetRecentActivities = async () => fetchJson('/dashboard/widgets/recent-activities');

/**
 * Üretim siparişi yeniden planlama (gecikme kontrolü ile)
 */
export const rescheduleProductionOrder = async (orderId, payload) =>
  fetchJson(`/production/${orderId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Üretim başlatma
 */
export const startProduction = async (orderId, payload = {}) =>
  fetchJson(`/production/${orderId}/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ========== NOTIFICATIONS API ==========

/**
 * Bildirimleri getir
 */
export const getNotifications = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.userId) query.append('userId', params.userId);
  if (params.unreadOnly) query.append('unreadOnly', 'true');
  if (params.limit) query.append('limit', params.limit);
  
  const queryStr = query.toString();
  return fetchJsonWithAuth(`/notifications${queryStr ? `?${queryStr}` : ''}`);
};

/**
 * Okunmamış bildirim sayısı
 */
export const getUnreadNotificationCount = async (userId = null) => {
  const query = userId ? `?userId=${userId}` : '';
  return fetchJsonWithAuth(`/notifications/unread-count${query}`);
};

/**
 * Bildirim oluştur
 */
export const createNotification = async (payload) =>
  fetchJsonWithAuth('/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Bildirimi okundu olarak işaretle
 */
export const markNotificationRead = async (notificationId) =>
  fetchJsonWithAuth(`/notifications/${notificationId}`, {
    method: 'PUT',
    body: JSON.stringify({ read: true }),
  });

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export const markAllNotificationsRead = async (userId = null) => {
  const query = userId ? `?userId=${userId}` : '';
  return fetchJsonWithAuth(`/notifications/mark-all-read${query}`, {
    method: 'PUT',
    body: JSON.stringify({}),
  });
};

/**
 * Bildirimi sil
 */
export const deleteNotification = async (notificationId) =>
  fetchJsonWithAuth(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });

/**
 * Tüm bildirimleri temizle
 */
export const clearAllNotifications = async (userId = null) => {
  const query = userId ? `?userId=${userId}` : '';
  return fetchJsonWithAuth(`/notifications${query}`, {
    method: 'DELETE',
  });
};
