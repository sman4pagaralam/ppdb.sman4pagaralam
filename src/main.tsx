import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';

// Cek maintenance mode dari localStorage ATAU API
const isMaintenanceMode = () => {
  // Cek dari localStorage dulu (cepat)
  const saved = localStorage.getItem('maintenanceMode');
  if (saved !== null) {
    return saved === 'true';
  }
  // Fallback ke default
  return false;
};

// Cek apakah di halaman admin
const isAdminPage = () => {
  return window.location.pathname.startsWith('/admin');
};

// Tentukan komponen yang akan dirender
const getRootComponent = () => {
  const maintenanceActive = isMaintenanceMode();
  const adminPage = isAdminPage();
  
  console.log('🔍 [main.tsx] Maintenance aktif?', maintenanceActive);
  console.log('🔍 [main.tsx] Halaman admin?', adminPage);
  console.log('🔍 [main.tsx] Path:', window.location.pathname);
  
  // Jika maintenance aktif dan BUKAN halaman admin
  if (maintenanceActive && !adminPage) {
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
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {getRootComponent()}
  </StrictMode>
);
