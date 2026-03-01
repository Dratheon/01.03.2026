import { Outlet, useLocation } from 'react-router-dom';
import { findPageTitle } from '../constants/navigation';
import { MobileProvider, useMobile } from '../contexts/MobileContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const LayoutContent = () => {
  const location = useLocation();
  const title = findPageTitle(location.pathname);
  const { sidebarOpen, closeSidebar } = useMobile();

  return (
    <div id="app">
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />
      
      <Sidebar />
      
      <div className="main-content">
        <Topbar title={title} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const Layout = () => {
  return (
    <MobileProvider>
      <LayoutContent />
    </MobileProvider>
  );
};

export default Layout;
