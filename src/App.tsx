/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettings } from './context/SettingsContext';
import MaintenancePage from './components/MaintenancePage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Guide from './pages/Guide';
import RegistrationForm from './pages/RegistrationForm';
import AdminDashboard from './pages/AdminDashboard';
import CheckStatus from './pages/CheckStatus';
import AdminLogin from './pages/AdminLogin';

function RouteHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home on initial load/reload if not on home or admin pages
    if (location.pathname !== '/' && !location.pathname.startsWith('/admin')) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this only runs once on app mount (reload)

  return null;
}

// Komponen utama dengan maintenance mode
function AppContent() {
  const { settings, isLoading } = useSettings();

  // Tampilkan loading sambil fetch settings
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

  // Jika maintenance mode aktif, tampilkan halaman maintenance
  // KECUALI jika sedang di halaman admin (agar admin bisa login dan menonaktifkan)
  const location = window.location.pathname;
  const isAdminPage = location.startsWith('/admin');
  
  if (settings?.maintenanceMode === true && !isAdminPage) {
    return <MaintenancePage />;
  }

  // Tampilan normal dengan Navbar & Footer
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/panduan" element={<Guide />} />
          <Route path="/daftar" element={<RegistrationForm />} />
          <Route path="/cek-kelulusan" element={<CheckStatus />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteHandler />
      <AppContent />
    </BrowserRouter>
  );
}
