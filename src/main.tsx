import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';
import { getSettings } from './services/api.ts';

function MainApp() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkMaintenance() {
      try {
        // 1. AMBIL DARI SERVER DULU
        console.log('📥 Fetching settings from server...');
        const settings = await getSettings();
        console.log('📥 Settings dari server:', settings);
        
        const serverMaintenance = settings.maintenanceMode || false;
        console.log('🔍 maintenanceMode dari server:', serverMaintenance);
        
        // 2. SIMPAN KE LOCALSTORAGE (cache)
        localStorage.setItem('maintenanceMode', String(serverMaintenance));
        console.log('✅ localStorage diupdate ke:', serverMaintenance);
        
        setMaintenanceMode(serverMaintenance);
      } catch (error) {
        console.warn('⚠️ Gagal ambil dari server, pakai localStorage:', error);
        // 3. FALLBACK KE LOCALSTORAGE
        const saved = localStorage.getItem('maintenanceMode');
        console.log('🔍 Fallback ke localStorage:', saved);
        setMaintenanceMode(saved === 'true');
      } finally {
        setIsLoading(false);
      }
    }

    checkMaintenance();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  const isAdminPage = window.location.pathname.startsWith('/admin');
  console.log('🔍 [MainApp] maintenanceMode:', maintenanceMode);
  console.log('🔍 [MainApp] isAdminPage:', isAdminPage);
  console.log('🔍 [MainApp] pathname:', window.location.pathname);

  if (maintenanceMode && !isAdminPage) {
    console.log('✅ Menampilkan MaintenancePage');
    return (
      <SettingsProvider>
        <MaintenancePage />
      </SettingsProvider>
    );
  }

  console.log('✅ Menampilkan App normal');
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainApp />
  </StrictMode>
);
