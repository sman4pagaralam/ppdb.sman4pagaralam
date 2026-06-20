import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';

// Cek maintenance mode dari localStorage
const isMaintenanceMode = () => {
  const saved = localStorage.getItem('maintenanceMode');
  console.log('Maintenance mode dari localStorage:', saved); // Untuk debugging
  return saved === 'true';
};

// Cek apakah di halaman admin
const isAdminPage = () => {
  const isAdmin = window.location.pathname.startsWith('/admin');
  console.log('Apakah halaman admin?', isAdmin); // Untuk debugging
  return isAdmin;
};

// Tentukan komponen yang akan dirender
const getRootComponent = () => {
  const maintenanceActive = isMaintenanceMode();
  const adminPage = isAdminPage();
  
  console.log('Maintenance aktif?', maintenanceActive);
  console.log('Halaman admin?', adminPage);
  
  // Jika maintenance aktif dan BUKAN halaman admin, tampilkan MaintenancePage
  if (maintenanceActive && !adminPage) {
    console.log('Menampilkan MaintenancePage');
    return <MaintenancePage />;
  }
  
  console.log('Menampilkan App normal dengan SettingsProvider');
  // Selain itu tampilkan App normal dengan SettingsProvider
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
