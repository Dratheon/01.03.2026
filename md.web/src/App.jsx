import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Arsiv from './pages/Arsiv';
import Ayarlar from './pages/Ayarlar';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import EvrakIrsaliyeFatura from './pages/EvrakIrsaliyeFatura';
import FinansOdemelerKasa from './pages/FinansOdemelerKasa';
import Gorevler from './pages/Gorevler';
import Personnel from './pages/Personnel';
import Teams from './pages/Teams';
import Roles from './pages/Roles';
import JobNew from './pages/JobNew';
import JobsList from './pages/JobsList';
import IslerTakvim from './pages/IslerTakvim';
import IslerUretimPlani from './pages/IslerUretimPlani';
import NotFound from './pages/NotFound';
import Raporlar from './pages/Raporlar';
import Satinalma from './pages/Satinalma';
import SatinalmaSiparisler from './pages/SatinalmaSiparisler';
import SatinalmaTedarikciler from './pages/SatinalmaTedarikciler';
import SatinalmaEksik from './pages/SatinalmaEksik';
import SatinalmaBekleyen from './pages/SatinalmaBekleyen';
import Stok from './pages/Stok';
import StokHareketler from './pages/StokHareketler';
import StokKritik from './pages/StokKritik';
import StokList from './pages/StokList';
import StokRezervasyonlar from './pages/StokRezervasyonlar';
import Renkler from './pages/Renkler';
import UretimSiparisler from './pages/UretimSiparisler';
import MontajPlanlanan from './pages/MontajPlanlanan';
import MontajBugun from './pages/MontajBugun';
import MontajTakvim from './pages/MontajTakvim';
import MontajSorunlar from './pages/MontajSorunlar';
import Aktiviteler from './pages/Aktiviteler';
import Bildirimler from './pages/Bildirimler';
import { ToastProvider } from './contexts/ToastContext';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <Routes>
        {/* Login sayfası - auth gerektirmez */}
        <Route path="/login" element={<Login />} />
        
        {/* Korumalı rotalar */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <ProtectedRoute requiredPermission="dashboard.view">
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* İşler */}
          <Route path="isler">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={
              <ProtectedRoute requiredPermission="jobs.list">
                <JobsList />
              </ProtectedRoute>
            } />
            <Route path="yeni" element={
              <ProtectedRoute requiredPermission="jobs.create">
                <JobNew />
              </ProtectedRoute>
            } />
            <Route path="takvim" element={
              <ProtectedRoute requiredPermission="jobs.measurement">
                <IslerTakvim />
              </ProtectedRoute>
            } />
            <Route path="uretim-plani" element={
              <ProtectedRoute requiredPermission="production.plan">
                <IslerUretimPlani />
              </ProtectedRoute>
            } />
            <Route path="montaj-takvimi" element={
              <ProtectedRoute requiredPermission="assembly.calendar">
                <MontajTakvim />
              </ProtectedRoute>
            } />
            {/* Üretim Takip - İşler altında */}
            <Route path="uretim-takip">
              <Route index element={<Navigate to="siparisler" replace />} />
              <Route path="siparisler" element={
                <ProtectedRoute requiredPermission="production.list">
                  <UretimSiparisler />
                </ProtectedRoute>
              } />
              <Route path="ic-uretim" element={
                <ProtectedRoute requiredPermission="production.list">
                  <UretimSiparisler orderType="internal" />
                </ProtectedRoute>
              } />
              <Route path="dis-siparis" element={
                <ProtectedRoute requiredPermission="production.list">
                  <UretimSiparisler orderType="external" />
                </ProtectedRoute>
              } />
              <Route path="cam" element={
                <ProtectedRoute requiredPermission="production.list">
                  <UretimSiparisler orderType="glass" />
                </ProtectedRoute>
              } />
              <Route path="sorunlar" element={
                <ProtectedRoute requiredPermission="production.issues">
                  <UretimSiparisler showIssues />
                </ProtectedRoute>
              } />
            </Route>
            {/* Montaj Takip - İşler altında */}
            <Route path="montaj-takip">
              <Route index element={<Navigate to="planlanan" replace />} />
              <Route path="planlanan" element={
                <ProtectedRoute requiredPermission="assembly.planned">
                  <MontajPlanlanan />
                </ProtectedRoute>
              } />
              <Route path="bugun" element={
                <ProtectedRoute requiredPermission="assembly.today">
                  <MontajBugun />
                </ProtectedRoute>
              } />
              <Route path="sorunlar" element={
                <ProtectedRoute requiredPermission="assembly.issues">
                  <MontajSorunlar />
                </ProtectedRoute>
              } />
            </Route>
          </Route>
          
          {/* Görevler */}
          <Route path="gorevler">
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={
              <ProtectedRoute requiredPermission="tasks.list">
                <Gorevler />
              </ProtectedRoute>
            } />
            <Route path="personel" element={
              <ProtectedRoute requiredPermission="personnel.list">
                <Personnel />
              </ProtectedRoute>
            } />
            <Route path="ekipler" element={
              <ProtectedRoute requiredPermission="teams.list">
                <Teams />
              </ProtectedRoute>
            } />
            <Route path="roller" element={
              <ProtectedRoute requiredPermission="roles.*">
                <Roles />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Müşteriler */}
          <Route path="musteriler" element={
            <ProtectedRoute requiredPermission="customers.list">
              <Customers />
            </ProtectedRoute>
          } />
          
          {/* Stok */}
          <Route path="stok">
            <Route index element={
              <ProtectedRoute requiredPermission="stock.list">
                <Stok />
              </ProtectedRoute>
            } />
            <Route path="liste" element={
              <ProtectedRoute requiredPermission="stock.list">
                <StokList />
              </ProtectedRoute>
            } />
            <Route path="hareketler" element={
              <ProtectedRoute requiredPermission="stock.movements">
                <StokHareketler />
              </ProtectedRoute>
            } />
            <Route path="kritik" element={
              <ProtectedRoute requiredPermission="stock.critical">
                <StokKritik />
              </ProtectedRoute>
            } />
            <Route path="rezervasyonlar" element={
              <ProtectedRoute requiredPermission="stock.reservations">
                <StokRezervasyonlar />
              </ProtectedRoute>
            } />
            <Route path="renkler" element={
              <ProtectedRoute requiredPermission="stock.colors">
                <Renkler />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Eski /uretim yolundan redirect */}
          <Route path="uretim/*" element={<Navigate to="/isler/uretim-takip" replace />} />
          
          {/* Satınalma */}
          <Route path="satinalma">
            <Route index element={
              <ProtectedRoute requiredPermission="purchasing.orders">
                <Satinalma />
              </ProtectedRoute>
            } />
            <Route path="siparisler" element={
              <ProtectedRoute requiredPermission="purchasing.orders">
                <SatinalmaSiparisler />
              </ProtectedRoute>
            } />
            <Route path="eksik" element={
              <ProtectedRoute requiredPermission="purchasing.missing">
                <SatinalmaEksik />
              </ProtectedRoute>
            } />
            <Route path="bekleyen" element={
              <ProtectedRoute requiredPermission="purchasing.orders">
                <SatinalmaBekleyen />
              </ProtectedRoute>
            } />
            <Route path="tedarikciler" element={
              <ProtectedRoute requiredPermission="purchasing.suppliers">
                <SatinalmaTedarikciler />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Finans & Evrak */}
          <Route path="evrak/irsaliye-fatura" element={
            <ProtectedRoute requiredPermission="documents.view">
              <EvrakIrsaliyeFatura />
            </ProtectedRoute>
          } />
          <Route path="finans/odemeler-kasa" element={
            <ProtectedRoute requiredPermission="finance.payments">
              <FinansOdemelerKasa />
            </ProtectedRoute>
          } />
          
          {/* Arşiv & Raporlar */}
          <Route path="arsiv" element={
            <ProtectedRoute requiredPermission="archive.view">
              <Arsiv />
            </ProtectedRoute>
          } />
          <Route path="raporlar" element={
            <ProtectedRoute requiredPermission="reports.view">
              <Raporlar />
            </ProtectedRoute>
          } />
          
          {/* Sistem */}
          <Route path="aktiviteler" element={
            <ProtectedRoute requiredPermission="activities.view">
              <Aktiviteler />
            </ProtectedRoute>
          } />
          <Route path="ayarlar" element={
            <ProtectedRoute requiredPermission="settings.view">
              <Ayarlar />
            </ProtectedRoute>
          } />
          
          {/* Bildirimler */}
          <Route path="bildirimler" element={
            <ProtectedRoute>
              <Bildirimler />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
