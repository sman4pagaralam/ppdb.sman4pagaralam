import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus, getRegistrationByNo } from '../services/api';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../context/SettingsContext';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const extractFileId = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// ... (fungsi printProof dan printBuktiLulus sama seperti sebelumnya, tidak perlu diubah)

export default function CheckStatus() {
  const { settings } = useSettings();
  const [noPendaftaran, setNoPendaftaran] = useState('');
  const [nisn, setNisn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi kedua field harus diisi
    if (!noPendaftaran.trim() || !nisn.trim()) {
      setError('No Pendaftaran dan NISN harus diisi');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);
    setRegistrationData(null);
    
    try {
      // Kirim kedua parameter ke API
      const response = await checkStatus(noPendaftaran, nisn);
      
      if (response.status === 'success') {
        setResult(response.data);
        if (response.data.status === 'Proses') {
          const data = await getRegistrationByNo(noPendaftaran);
          if (data) setRegistrationData(data);
        }
      } else {
        setError(response.message || 'Data tidak ditemukan');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menghubungi server');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = (status: string, data?: any) => {
    if (status === 'Lulus') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="text-green-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">Selamat! Anda Lulus</h3>
          <p className="text-green-700 mb-4">Silakan lakukan daftar ulang sesuai jadwal yang ditentukan.</p>
          <button 
            onClick={() => printBuktiLulus(data, settings)} 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
          >
            <Printer className="inline mr-2" size={18} /> Cetak Bukti Kelulusan
          </button>
        </div>
      );
    }
    
    if (status === 'Tidak Lulus') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="text-red-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Tidak Lulus</h3>
          {data?.alasanPenolakan && <p className="text-red-700 mt-2">{data.alasanPenolakan}</p>}
          <p className="text-red-600 mt-4 text-sm">Terima kasih atas partisipasi Anda.</p>
        </div>
      );
    }
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <Clock className="text-amber-600 w-16 h-16 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-amber-800 mb-2">Data Sedang Diproses</h3>
        <p className="text-amber-700 mb-4">Status kelulusan akan segera diumumkan.</p>
        {registrationData && (
          <button 
            onClick={() => printProof(registrationData, settings)} 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
          >
            <Download className="inline mr-2" size={18} /> Unduh Bukti Pendaftaran
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition">
          <ArrowLeft size={16} className="mr-1" /> Kembali
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Cek Status Kelulusan</h2>
            <p className="text-blue-100 text-sm">Masukkan No Pendaftaran dan NISN</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSearch} className="mb-8 space-y-4">
              {/* No Pendaftaran */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nomor Pendaftaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noPendaftaran}
                  onChange={(e) => setNoPendaftaran(e.target.value.toUpperCase())}
                  placeholder="Contoh: PPDB-2026-001"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              
              {/* NISN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  NISN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Masukkan 10 digit NISN"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <p className="text-xs text-slate-400 mt-1">NISN terdiri dari 10 digit angka</p>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl mt-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : <Search className="mx-auto" size={20} />}
              </button>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4"
              >
                <p className="text-red-600 text-center">{error}</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 text-sm">No. Pendaftaran</span>
                      <span className="font-semibold text-slate-800">{result.noPendaftaran}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 text-sm">NISN</span>
                      <span className="font-semibold text-slate-800">{result.nisn || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Nama Lengkap</span>
                      <span className="font-semibold text-slate-800">{result.namaLengkap}</span>
                    </div>
                  </div>
                </div>
                {getStatusDisplay(result.status, result)}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Informasi tambahan */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Pastikan data yang dimasukkan sesuai dengan bukti pendaftaran</p>
          <p className="mt-1">Jika mengalami kendala, hubungi panitia PPDB</p>
        </div>
      </div>
    </div>
  );
}
