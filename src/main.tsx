import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';
import { getSettings } from './services/api.ts';

function MainApp() {
  // 1. Baca dari localStorage DULU (langsung tampil, tanpa loading)
  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    return localStorage.getItem('maintenanceMode') === 'true';
  });
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 2. Ambil dari server di BACKGROUND (tidak nge-blok tampilan)
    async function syncFromServer() {
      try {
        const settings = await getSettings();
        const serverValue = settings.maintenanceMode || false;
        
        // Update localStorage & state
        localStorage.setItem('maintenanceMode', String(serverValue));
        setMaintenanceMode(serverValue);
      } catch (error) {
        console.warn('Gagal sync dari server, pakai localStorage:', error);
      } finally {
        setIsReady(true);
      }
    }
    
    syncFromServer();
  }, []);

  // Tampilkan loading hanya jika belum siap dan localStorage kosong
  // Tapi maksimal 1 detik
  if (!isReady && localStorage.getItem('maintenanceMode') === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  const isAdminPage = window.location.pathname.startsWith('/admin');

  if (maintenanceMode && !isAdminPage) {
    return (
      <SettingsProvider>
        <MaintenancePage />
      </SettingsProvider>
    );
  }

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
