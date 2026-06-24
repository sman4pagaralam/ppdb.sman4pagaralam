import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText, UserCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus, getRegistrationByNo } from '../services/api';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
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

// Helper: ekstrak fileId dari URL Google Drive
const extractFileId = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// Helper: format tanggal pengumuman dengan aman
const formatTanggalPengumuman = (date: any): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  return String(date);
};

// Helper: cek apakah sudah melewati tanggal pengumuman
const isAfterPengumuman = (settings: any): boolean => {
  const tanggalPengumuman = settings?.tanggalPengumuman;
  if (!tanggalPengumuman) return true;
  
  let dateStr = '';
  if (typeof tanggalPengumuman === 'string') {
    dateStr = tanggalPengumuman;
  } else if (tanggalPengumuman instanceof Date) {
    const d = tanggalPengumuman;
    dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } else {
    dateStr = String(tanggalPengumuman);
  }
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return true;
  
  const announceDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  announceDate.setHours(0, 0, 0, 0);
  
  return today >= announceDate;
};

// Helper: dapatkan status yang benar berdasarkan tanggal pengumuman
const getDisplayStatus = (originalStatus: string, settings: any): { status: string; message: string } => {
  // Jika status asli bukan Lulus/Tidak Lulus, kembalikan apa adanya
  if (originalStatus !== 'Lulus' && originalStatus !== 'Tidak Lulus') {
    return { status: originalStatus, message: '' };
  }
  
  // Jika BELUM melewati tanggal pengumuman, ubah menjadi "Proses"
  if (!isAfterPengumuman(settings)) {
    const tanggal = formatTanggalPengumuman(settings?.tanggalPengumuman);
    return { 
      status: 'Proses', 
    };
  }
  
  // Sudah melewati tanggal pengumuman, tampilkan status asli
  return { status: originalStatus, message: '' };
};

// ========== BUKTI PENDAFTARAN (F4 - 210x330mm) ==========
const printProof = async (data: any, settings: any) => {
  if (!data) return;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [210, 330]
  });
  
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  
  const fotoField = data['Foto Siswa'] || data['File Pas Foto'] || data['Pas Foto'];
  let fotoBase64 = null;

  if (fotoField && typeof fotoField === 'string') {
    const fileId = extractFileId(fotoField);
    if (fileId) {
      try {
        const proxyUrl = '/api/gas-proxy';
        const response = await fetch(`${proxyUrl}?action=getImage&fileId=${fileId}&t=${Date.now()}`);
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          fotoBase64 = `data:${result.mimeType};base64,${result.data}`;
        }
      } catch (error) {
        console.error('Error fetching image:', error);
      }
    }
  }

  let y = 15;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 65, 'F');

  if (fotoBase64) {
    try {
      doc.addImage(fotoBase64, 'JPEG', 14, 8, 35, 45);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(14, 8, 35, 45);
    } catch (e) {
      drawPlaceholder(doc);
    }
  } else {
    drawPlaceholder(doc);
  }

  function drawPlaceholder(doc: any) {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 8, 35, 45, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Foto", 31, 30, { align: "center" });
    doc.text("3x4", 31, 38, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PENDAFTARAN SPMB", 115, 22, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 115, 34, { align: "center" });
  doc.text(`No. Pendaftaran: ${data['No Pendaftaran'] || '-'}`, 115, 46, { align: "center" });

  y = 62;
  
  // JALUR (center)
  const jalur = data['Jalur'] || '-';
  
  doc.setDrawColor(0, 0, 0);
  doc.line(14, y - 2, 196, y - 2);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("JALUR", 105, y + 6, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text(String(jalur), 105, y + 18, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  let garisBawahY = y + 28;
  doc.line(14, garisBawahY, 196, garisBawahY);
  y = garisBawahY + 12;

  // ========== DATA PRIBADI (LABEL, TITIK DUA, VALUE DI KOLOM TERPISAH) ==========
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Posisi kolom
  const colLabelKiri = 20;
  const colTitikDuaKiri = 50;
  const colValueKiri = 53;
  const colLabelKanan = 115;
  const colTitikDuaKanan = 156;
  const colValueKanan = 158;

  // Helper untuk memastikan string
  const toStr = (val: any): string => {
    if (val === null || val === undefined) return '-';
    return String(val);
  };

  // Data untuk kolom kiri
  const leftLabels = [
    "Nama Lengkap",
    "NIK",
    "NISN",
    "Tempat Lahir",
    "Tanggal Lahir",
    "Jenis Kelamin",
    "Golongan Darah",
    "Tinggi Badan",
    "Berat Badan",
    "Asal Sekolah",
  ];

  const leftValues = [
    toStr(data['Nama Lengkap']),
    toStr(data['NIK']),
    toStr(data['NISN']),
    toStr(data['Tempat Lahir']),
    toStr(formatDate(data['Tanggal Lahir'])),
    toStr(data['Jenis Kelamin']),
    toStr(data['Golongan Darah']),
    toStr(`${data['Tinggi Badan'] || '-'} cm`),
    toStr(`${data['Berat Badan'] || '-'} kg`),
    toStr(data['Asal Sekolah']),
  ];

  // Data untuk kolom kanan
  const rightLabels = [
    "Nomor WA Aktif",
    "No WA Aktif Orang Tua",
    "Nama Ayah",
    "Pekerjaan Ayah",
    "Nama Ibu",
    "Pekerjaan Ibu",
    "Rata-Rata Nilai Akhir",
  ];

  const rightValues = [
    toStr(data['Nomor WA Aktif']),
    toStr(data['No WA Aktif Orang Tua']),
    toStr(data['Nama Ayah']),
    toStr(data['Pekerjaan Ayah']),
    toStr(data['Nama Ibu']),
    toStr(data['Pekerjaan Ibu']),
    toStr(data['Rata-Rata Nilai Akhir']),
  ];

  // Cetak kolom kiri
  let startY = y;
  for (let i = 0; i < leftLabels.length; i++) {
    doc.setFont("helvetica", "bold");
    doc.text(leftLabels[i], colLabelKiri, startY);
    doc.setFont("helvetica", "normal");
    doc.text(":", colTitikDuaKiri, startY);
    doc.text(leftValues[i], colValueKiri, startY);
    startY += 6;
  }

  // Cetak kolom kanan
  let startYRight = y;
  for (let i = 0; i < rightLabels.length; i++) {
    doc.setFont("helvetica", "bold");
    doc.text(rightLabels[i], colLabelKanan, startYRight);
    doc.setFont("helvetica", "normal");
    doc.text(":", colTitikDuaKanan, startYRight);
    doc.text(rightValues[i], colValueKanan, startYRight);
    startYRight += 6;
  }

  y = Math.max(startY, startYRight) + 10;

  // ========== ALAMAT ==========
  doc.setFont("helvetica", "bold");
  doc.text("Alamat Domisli", colLabelKiri, y);
  doc.setFont("helvetica", "normal");
  doc.text(":", colTitikDuaKiri, y);
  y += 5;
  const alamat = toStr(data['Alamat Domisili Lengkap']);
  const splitAlamat = doc.splitTextToSize(alamat, pageWidth - colValueKiri - 10);
  doc.text(splitAlamat, colValueKiri, y);
  y += splitAlamat.length * 5 + 10;

  // ========== LOKASI DAN JARAK ==========
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("LOKASI DAN JARAK", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    if (data['Koordinat Lokasi']) {
      doc.setFont("helvetica", "bold");
      doc.text("Koordinat Rumah", colLabelKiri, y);
      doc.setFont("helvetica", "normal");
      doc.text(":", colTitikDuaKiri, y);
      const koordinat = toStr(data['Koordinat Lokasi']);
      const splitKoor = doc.splitTextToSize(koordinat, 100);
      doc.text(splitKoor, colValueKiri, y);
      y += Math.max(6, splitKoor.length * 5);
    }
    
    if (data['Jarak ke Sekolah (km)']) {
      doc.setFont("helvetica", "bold");
      doc.text("Jarak ke Sekolah", colLabelKiri, y);
      doc.setFont("helvetica", "normal");
      doc.text(":", colTitikDuaKiri, y);
      const jarak = toStr(data['Jarak ke Sekolah (km)']);
      doc.text(`${jarak} km`, colValueKiri, y);
      y += 10;
    }
  }

  // ========== STATUS PENDAFTARAN ==========
  doc.setDrawColor(200, 200, 200);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS PENDAFTARAN", pageWidth / 2, y, { align: "center" });
  y += 10;
  
  // ✅ PERBAIKAN: Gunakan proteksi status berdasarkan tanggal pengumuman
  const originalStatus = toStr(data['Status'] || 'Proses');
  const displayInfo = getDisplayStatus(originalStatus, settings);
  const status = displayInfo.status;
  const statusMessage = displayInfo.message;
  
  let statusColor = [255, 193, 7]; // Kuning untuk Proses
  if (status === 'Lulus') statusColor = [40, 167, 69];   // Hijau
  if (status === 'Tidak Lulus') statusColor = [220, 53, 69]; // Merah
  
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(70, y - 5, 70, 10, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, pageWidth / 2, y + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  // ✅ Tambahkan pesan jika belum waktunya pengumuman
  if (statusMessage) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    const splitMsg = doc.splitTextToSize(statusMessage, pageWidth - 40);
    doc.text(splitMsg, pageWidth / 2, y, { align: "center" });
    y += splitMsg.length * 5 + 5;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, pageWidth / 2, y + 10, { align: "center" });
  doc.text("Simpan bukti ini untuk mengecek status kelulusan.", pageWidth / 2, y + 17, { align: "center" });

  doc.save(`Bukti_Pendaftaran_${toStr(data['No Pendaftaran'])}.pdf`);
};

// ========== BUKTI KELULUSAN (TEMPLATE GAMBAR + OVERLAY TEKS) ==========
const printBuktiLulus = async (data: any, fullData: any, settings: any) => {
  if (!data) return;
  
  // ✅ CEK APAKAH SUDAH MELEWATI TANGGAL PENGUMUMAN
  if (!isAfterPengumuman(settings)) {
    alert(`⚠️ Pengumuman kelulusan belum tersedia. Tunggu tanggal ${formatTanggalPengumuman(settings?.tanggalPengumuman)}`);
    return;
  }
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const loadImageToBase64 = async (path: string): Promise<string | null> => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Error loading image ${path}:`, error);
      return null;
    }
  };
  
  const templateImg = await loadImageToBase64('/images/template_surat_lulus.jpg');
  
  if (templateImg) {
    doc.addImage(templateImg, 'JPEG', 0, 0, 210, 297);
  } else {
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("Gambar template tidak ditemukan", 105, 50, { align: "center" });
  }
  
  const namaSiswa = fullData?.['Nama Lengkap'] || data.namaLengkap || '-';
  const nisn = fullData?.['NISN'] || data.nisn || '-';
  const asalSekolah = fullData?.['Asal Sekolah'] || '-';
  
  doc.setFontSize(11);
  doc.setFont("times", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(namaSiswa, 70, 87);
  doc.text(nisn, 70, 94);
  doc.text(asalSekolah, 70, 100.3);
  
  doc.setFontSize(7);
  doc.setFont("times", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 105, 285, { align: "center" });
  
  doc.save(`Surat_Keterangan_Lulus_${data.noPendaftaran}.pdf`);
};

export default function CheckStatus() {
  const { settings } = useSettings();
  const [nisn, setNisn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nisn.trim()) {
      setError('NISN harus diisi');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);
    setRegistrationData(null);
    
    try {
      const response = await checkStatus(nisn);
      console.log("Response dari API:", response);
      
      if (response.status === 'success') {
        const fullData = await getRegistrationByNo(response.data.noPendaftaran);
        if (fullData) {
          setRegistrationData(fullData);
        }
        
        // ✅ Dapatkan status yang benar berdasarkan tanggal pengumuman
        const displayInfo = getDisplayStatus(response.data.status, settings);
        
        setResult({
          ...response.data,
          status: displayInfo.status,
          statusMessage: displayInfo.message,
          asalSekolah: fullData?.['Asal Sekolah'] || '-',
        });
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
    // Jika status "Proses" dan ada pesan (belum waktu pengumuman)
    if (status === 'Proses' && data?.statusMessage) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Clock className="text-amber-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-amber-800 mb-2">⏳ Menunggu Pengumuman</h3>
          <p className="text-amber-700 text-lg font-semibold">{data.statusMessage}</p>
          <p className="text-amber-600 mt-4 text-sm">
            Status saat ini: <strong>Proses</strong>
          </p>
          {registrationData && (
            <button 
              onClick={() => printProof(registrationData, settings)} 
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
            >
              <Download className="inline mr-2" size={18} /> Unduh Bukti Pendaftaran
            </button>
          )}
        </div>
      );
    }

    // Jika status "Proses" (normal, tanpa pesan)
    if (status === 'Proses') {
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
    }
    
    if (status === 'Lulus') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="text-green-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">🎉 TOMAT DIMAKAN PELUS SELAMAT! ANDA LULUS</h3>
          <p className="text-green-700 mb-4">Silakan lakukan daftar ulang sesuai jadwal yang ditentukan.</p>
          <button 
            onClick={() => printBuktiLulus(data, registrationData, settings)} 
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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <AlertCircle className="text-slate-400 w-16 h-16 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">Status Tidak Diketahui</h3>
        <p className="text-slate-500">Silakan hubungi panitia SPMB.</p>
      </div>
    );
  };

  const tanggalPengumuman = formatTanggalPengumuman(settings?.tanggalPengumuman);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition">
          <ArrowLeft size={16} className="mr-1" /> Kembali
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Cek Status Kelulusan</h2>
            <p className="text-blue-100 text-sm">Masukkan NISN Anda</p>
          </div>
          
          <div className="p-8">
            {tanggalPengumuman && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-700">
                </p>
              </div>
            )}
            
            <form onSubmit={handleSearch} className="mb-8 space-y-4">
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
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500 text-sm">Nama Lengkap</span>
                      <span className="font-semibold text-slate-800">{result.namaLengkap}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Asal Sekolah</span>
                      <span className="font-semibold text-slate-800">{result.asalSekolah || '-'}</span>
                    </div>
                  </div>
                </div>
                {getStatusDisplay(result.status, result)}
              </motion.div>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>Pastikan NISN yang dimasukkan sesuai dengan data pendaftaran</p>
          <p className="mt-1">Jika mengalami kendala, hubungi panitia SPMB</p>
        </div>
      </div>
    </div>
  );
}
