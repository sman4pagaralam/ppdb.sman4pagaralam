import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Download, Printer, CheckCircle, XCircle, Clock, FileText, Moon, Sun, Loader2, LogOut, Eye, X, Settings, LayoutDashboard, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getRegistrations, updateStatus, AdminData, updateSettings } from '../services/api';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const calculateAge = (dateString: string) => {
  if (!dateString) return '-';
  const birthDate = new Date(dateString);
  if (isNaN(birthDate.getTime())) return '-';
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} Tahun ${months} Bulan ${days} Hari`;
};

// Helper function untuk mengamankan string
const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '';
};

export default function AdminDashboard() {
  const { settings, refreshSettings } = useSettings();
  const [data, setData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'school' | 'form' | 'surat' | 'daftar-ulang' | 'kepala-sekolah' | 'panduan'>('school');
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const getFieldValue = useCallback((item: any, fieldId: string): string => {
    if (!item) return '';
    
    const field = settings?.formFields?.find(f => f.id === fieldId);
    if (field && item[field.label] !== undefined && item[field.label] !== null) {
      return safeToString(item[field.label]);
    }
    
    return safeToString(item[fieldId]);
  }, [settings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getRegistrations();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire('Error', 'Gagal mengambil data dari server', 'error');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar?',
      text: "Anda akan keluar dari sesi admin.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        sessionStorage.removeItem('isAdmin');
        navigate('/admin/login');
      }
    });
  };

  const handleUpdateStatus = async (noPendaftaran: string, newStatus: string) => {
    try {
      let alasan = undefined;
      
      if (newStatus === 'Tidak Lulus') {
        const { value: text, isConfirmed } = await Swal.fire({
          title: 'Alasan Tidak Lulus',
          input: 'textarea',
          inputLabel: 'Berikan alasan mengapa pendaftar tidak lulus',
          inputPlaceholder: 'Contoh: Usia belum mencukupi...',
          showCancelButton: true,
          confirmButtonText: 'Simpan',
          cancelButtonText: 'Batal',
          inputValidator: (value) => {
            if (!value) {
              return 'Alasan harus diisi!';
            }
          }
        });
        
        if (!isConfirmed) return;
        alasan = text;
      }

      Swal.fire({
        title: 'Memproses...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await updateStatus(noPendaftaran, newStatus, alasan);
      
      setData(prev => prev.map(item => 
        item && item['No Pendaftaran'] === noPendaftaran ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan } : item
      ));

      if (selectedStudent && selectedStudent['No Pendaftaran'] === noPendaftaran) {
        setSelectedStudent(prev => prev ? { ...prev, Status: newStatus as any, 'Alasan Penolakan': alasan } : null);
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Status berhasil diubah menjadi ${newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire('Error', 'Gagal mengupdate status', 'error');
    }
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    try {
      await updateSettings(localSettings);
      await refreshSettings();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Pengaturan berhasil disimpan',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      Swal.fire('Error', 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      Swal.fire('Info', 'Tidak ada data untuk diekspor', 'info');
      return;
    }
    
    const exportData = data.map(item => {
      const formattedItem: any = { ...item };
      
      const tglLahir = getFieldValue(item, 'Tanggal Lahir');
      if (tglLahir && tglLahir !== '-') {
        formattedItem['Tanggal Lahir'] = formatDate(tglLahir);
        formattedItem['Usia'] = calculateAge(tglLahir);
      }
      
      if (item && item['Koordinat Lokasi']) {
        formattedItem['Link Maps'] = `https://www.google.com/maps/search/?api=1&query=${item['Koordinat Lokasi']}`;
      }
      
      Object.keys(formattedItem).forEach(key => {
        if (typeof formattedItem[key] === 'string' && formattedItem[key].startsWith('data:')) {
          formattedItem[key] = 'File Terlampir (Lihat di Dashboard)';
        }
      });
      
      return formattedItem;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pendaftar");
    XLSX.writeFile(wb, `Data_PPDB_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printCard = (student: AdminData) => {
    if (!student) return;
    
    const doc = new jsPDF();
    
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PENDAFTARAN PPDB", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.namaSekolah || "Sekolah Dasar", 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    const startY = 60;
    const lineHeight = 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("No. Pendaftaran:", 20, startY);
    doc.setFont("helvetica", "normal");
    doc.text(safeToString(student['No Pendaftaran']), 70, startY);

    doc.setFont("helvetica", "bold");
    doc.text("Nama Lengkap:", 20, startY + lineHeight);
    doc.setFont("helvetica", "normal");
    doc.text(getFieldValue(student, 'Nama Lengkap') || '-', 70, startY + lineHeight);

    doc.setFont("helvetica", "bold");
    doc.text("NIK:", 20, startY + lineHeight * 2);
    doc.setFont("helvetica", "normal");
    doc.text(getFieldValue(student, 'NIK') || '-', 70, startY + lineHeight * 2);

    doc.setFont("helvetica", "bold");
    doc.text("TTL:", 20, startY + lineHeight * 3);
    doc.setFont("helvetica", "normal");
    const tempatLahir = getFieldValue(student, 'Tempat Lahir') || '-';
    const tanggalLahir = formatDate(getFieldValue(student, 'Tanggal Lahir'));
    doc.text(`${tempatLahir}, ${tanggalLahir}`, 70, startY + lineHeight * 3);

    doc.setFont("helvetica", "bold");
    doc.text("Usia:", 20, startY + lineHeight * 4);
    doc.setFont("helvetica", "normal");
    doc.text(calculateAge(getFieldValue(student, 'Tanggal Lahir')), 70, startY + lineHeight * 4);

    doc.setFont("helvetica", "bold");
    doc.text("Status:", 20, startY + lineHeight * 5);
    doc.setFont("helvetica", "normal");
    doc.text(safeToString(student.Status), 70, startY + lineHeight * 5);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, startY + lineHeight * 7, 190, startY + lineHeight * 7);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kartu ini adalah bukti sah pendaftaran PPDB ${settings?.namaSekolah || 'Sekolah'}.`, 105, startY + lineHeight * 8, { align: "center" });
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 105, startY + lineHeight * 8.5, { align: "center" });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 150);

    doc.save(`Kartu_PPDB_${student['No Pendaftaran']}.pdf`);
  };

  // PERBAIKAN UTAMA: Filter data dengan safeToString
  const filteredData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    if (searchTerm === '' && statusFilter === 'Semua') {
      return data;
    }
    
    const searchLower = safeToString(searchTerm).toLowerCase().trim();
    
    return data.filter(item => {
      if (!item) return false;
      
      const nama = safeToString(getFieldValue(item, 'Nama Lengkap')).toLowerCase();
      const nik = safeToString(getFieldValue(item, 'NIK'));
      const noPendaftaran = safeToString(item['No Pendaftaran']).toLowerCase();
      
      let matchesSearch = true;
      if (searchLower !== '') {
        matchesSearch = nama.includes(searchLower) || 
                        nik.includes(searchLower) ||
                        noPendaftaran.includes(searchLower);
      }
      
      let matchesFilter = true;
      if (statusFilter !== 'Semua') {
        matchesFilter = safeToString(item.Status) === statusFilter;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [data, searchTerm, statusFilter, getFieldValue]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    const safeStatus = safeToString(status);
    
    switch (safeStatus) {
      case 'Lulus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} /> Lulus</span>;
      case 'Tidak Lulus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={12} /> Tidak Lulus</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={12} /> Proses</span>;
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
            <p className={cn("mt-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>Kelola data pendaftaran PPDB {settings?.namaSekolah || 'Sekolah'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn("p-2 rounded-full transition-colors", isDarkMode ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200")}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6 border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'dashboard' 
                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <LayoutDashboard size={18} /> Data Pendaftar
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'settings' 
                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Settings size={18} /> Pengaturan
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Pendaftar', value: Array.isArray(data) ? data.length : 0, color: 'bg-blue-500 text-white border-blue-600 shadow-md' },
                { label: 'Lulus', value: Array.isArray(data) ? data.filter(item => item && safeToString(item.Status) === 'Lulus').length : 0, color: 'bg-green-500 text-white border-green-600 shadow-md' },
                { label: 'Tidak Lulus', value: Array.isArray(data) ? data.filter(item => item && safeToString(item.Status) === 'Tidak Lulus').length : 0, color: 'bg-red-500 text-white border-red-600 shadow-md' },
                { label: 'Laki-laki', value: Array.isArray(data) ? data.filter(item => { 
                  const jk = item ? safeToString(getFieldValue(item, 'Jenis Kelamin')).toLowerCase() : ''; 
                  return jk.includes('laki'); 
                }).length : 0, color: 'bg-indigo-500 text-white border-indigo-600 shadow-md' },
                { label: 'Perempuan', value: Array.isArray(data) ? data.filter(item => { 
                  const jk = item ? safeToString(getFieldValue(item, 'Jenis Kelamin')).toLowerCase() : ''; 
                  return jk.includes('perempuan'); 
                }).length : 0, color: 'bg-pink-500 text-white border-pink-600 shadow-md' },
              ].map((stat, idx) => (
                <div key={idx} className={cn("p-4 rounded-xl border flex flex-col items-center justify-center text-center", stat.color)}>
                  <span className="text-sm font-medium opacity-90 mb-1">{stat.label}</span>
                  <span className="text-3xl font-bold">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Filters & Search */}
            <div className={cn("rounded-xl shadow-sm border p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className={isDarkMode ? "text-slate-400" : "text-slate-400"} />
                </div>
                <input
                  type="text"
                  placeholder="Cari Nama, NIK, atau No. Pendaftaran..."
                  value={searchTerm}
                  onChange={(e) => { 
                    setSearchTerm(e.target.value); 
                    setCurrentPage(1); 
                  }}
                  className={cn("block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors", 
                    isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={18} className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className={cn("block w-full py-2 pl-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Proses">Proses</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Tidak Lulus">Tidak Lulus</option>
                  </select>
                </div>
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap disabled:opacity-70"
                >
                  <RefreshCw size={16} className={cn(isLoading && "animate-spin")} /> Segarkan
                </button>
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                >
                  <Download size={16} /> Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={cn("rounded-xl shadow-sm border overflow-hidden", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className={isDarkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-blue-800"}>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">No. Pendaftaran</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Nama Lengkap</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Usia</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Jarak</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">NIK</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDarkMode ? "divide-slate-700" : "divide-slate-200")}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
                          <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Memuat data...</p>
                        </td>
                      </tr>
                    ) : !currentData || currentData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="mx-auto h-12 w-12 text-slate-400 mb-4"><FileText size={48} /></div>
                          <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                            {searchTerm || statusFilter !== 'Semua' 
                              ? "Tidak ada data yang sesuai dengan pencarian" 
                              : "Tidak ada data ditemukan"}
                          </p>
                          {(searchTerm || statusFilter !== 'Semua') && (
                            <button 
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('Semua');
                              }}
                              className="mt-2 text-blue-500 hover:underline text-sm"
                            >
                              Reset filter
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      currentData.map((item, idx) => (
                        <motion.tr 
                          key={item?.['No Pendaftaran'] || idx} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className={cn("hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors")}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                            {safeToString(item?.['No Pendaftaran'])}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium">{getFieldValue(item, 'Nama Lengkap') || '-'}</div>
                            <div className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              {getFieldValue(item, 'Tempat Lahir') || '-'}, {formatDate(getFieldValue(item, 'Tanggal Lahir'))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {calculateAge(getFieldValue(item, 'Tanggal Lahir'))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {item?.['Jarak ke Sekolah (km)'] ? `${item['Jarak ke Sekolah (km)']} km` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {getFieldValue(item, 'NIK') || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(item?.Status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedStudent(item)} 
                                className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors" 
                                title="Lihat Detail"
                              >
                                <Eye size={18} />
                              </button>
                              {safeToString(item?.Status) !== 'Lulus' && (
                                <button 
                                  onClick={() => handleUpdateStatus(item['No Pendaftaran'], 'Lulus')} 
                                  className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 px-2 py-1 rounded transition-colors" 
                                  title="Ubah ke Lulus"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              {safeToString(item?.Status) !== 'Tidak Lulus' && (
                                <button 
                                  onClick={() => handleUpdateStatus(item['No Pendaftaran'], 'Tidak Lulus')} 
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-2 py-1 rounded transition-colors" 
                                  title="Ubah ke Tidak Lulus"
                                >
                                  <XCircle size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => printCard(item)} 
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-2 py-1 rounded transition-colors" 
                                title="Cetak Kartu"
                              >
                                <Printer size={18} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {!isLoading && filteredData.length > 0 && (
                <div className={cn("px-6 py-4 border-t flex items-center justify-between", isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white")}>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-medium">{filteredData.length}</span> data
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && localSettings && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={cn("rounded-xl shadow-sm border p-6", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <p className="text-center text-slate-500">Pengaturan tersedia di sini (sesuaikan dengan kebutuhan Anda)</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail Modal - Simplified */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl", isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900")}
            >
              <div className={cn("sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                <h2 className="text-xl font-bold">Detail Pendaftar</h2>
                <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p>Detail pendaftar: {safeToString(selectedStudent['No Pendaftaran'])} - {getFieldValue(selectedStudent, 'Nama Lengkap')}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
