import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';
import MaintenancePage from './components/MaintenancePage.tsx';

const isMaintenanceMode = () => {
  const saved = localStorage.getItem('maintenanceMode');
  return saved === 'true';
};

const isAdminPage = () => {
  return window.location.pathname.startsWith('/admin');
};

const getRootComponent = () => {
  if (isMaintenanceMode() && !isAdminPage()) {
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
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {getRootComponent()}
  </StrictMode>
);
