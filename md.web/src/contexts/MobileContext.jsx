import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const MobileContext = createContext(null);

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

export const MobileProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [isTablet, setIsTablet] = useState(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
      setIsTablet(width < TABLET_BREAKPOINT && width >= MOBILE_BREAKPOINT);
      
      // Geniş ekranda sidebar'ı otomatik kapat
      if (width >= MOBILE_BREAKPOINT) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const value = {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within MobileProvider');
  }
  return context;
};

export default MobileContext;
