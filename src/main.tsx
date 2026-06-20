import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';

// Cek maintenance mode dari localStorage
const isMaintenanceMode = () => {
  const saved = localStorage.getItem('maintenanceMode');
  return saved === 'true';
};

// Cek apakah di halaman admin
const isAdminPage = () => {
  return window.location.pathname.startsWith('/admin');
};

// Tentukan komponen yang akan dirender
const getRootComponent = () => {
  // Jika maintenance aktif dan BUKAN halaman admin, tampilkan MaintenancePage
  if (isMaintenanceMode() && !isAdminPage()) {
    return <MaintenancePage />;
  }
  
  // Selain itu tampilkan App normal
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
