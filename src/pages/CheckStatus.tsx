import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus, getRegistrationByNo } from '../services/api';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

// ========== BUKTI PENDAFTARAN (untuk status Proses) ==========
const printProof = (data: any, settings: any) => {
  if (!data) return;
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PENDAFTARAN PPDB", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 105, 32, { align: "center" });
  doc.text(`No. Pendaftaran: ${data['No Pendaftaran'] || '-'}`, 105, 42, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y = 60;

  // Field kiri dan kanan
  const leftFields = [
    "Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir",
    "Jenis Kelamin", "Golongan Darah", "Tinggi Badan", "Berat Badan",
    "Alamat Domisili Lengkap", "Nomor WA Aktif"
  ];
  const rightFields = [
    "NISN", "Asal Sekolah", "Jenis Seleksi",
    "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu",
    "Prestasi Akademik", "Prestasi Non Akademik"
  ];

  const formatValue = (field: string, val: any) => {
    if (field === "Tanggal Lahir") return formatDate(val);
    if (val === undefined || val === null || val === "") return "-";
    return String(val);
  };

  const tableBody = [];
  const maxRows = Math.max(leftFields.length, rightFields.length);
  for (let i = 0; i < maxRows; i++) {
    const leftLabel = leftFields[i] || "";
    const leftValue = leftLabel ? formatValue(leftLabel, data[leftLabel]) : "";
    const rightLabel = rightFields[i] || "";
    const rightValue = rightLabel ? formatValue(rightLabel, data[rightLabel]) : "";
    tableBody.push([`${leftLabel}:`, leftValue, `${rightLabel}:`, rightValue]);
  }

  (doc as any).autoTable({
    startY: y,
    head: [],
    body: tableBody,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 70 },
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  let finalY = (doc as any).lastAutoTable.finalY + 5;

  // Lokasi dan Jarak
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    doc.setFillColor(200, 200, 200);
    doc.rect(14, finalY - 6, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("LOKASI DAN JARAK", 105, finalY - 1, { align: "center" });
    finalY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (data['Koordinat Lokasi']) {
      doc.setFont("helvetica", "bold");
      doc.text("Koordinat Rumah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(data['Koordinat Lokasi'], 70, finalY);
      finalY += 6;
    }
    if (data['Jarak ke Sekolah (km)']) {
      doc.setFont("helvetica", "bold");
      doc.text("Jarak ke Sekolah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`${data['Jarak ke Sekolah (km)']} km`, 70, finalY);
      finalY += 6;
    }
    finalY += 5;
  }

  // Status
  doc.setFillColor(200, 200, 200);
  doc.rect(14, finalY - 6, 182, 8, 'F');
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS PENDAFTARAN", 105, finalY - 1, { align: "center" });
  finalY += 10;
  const status = data.Status || 'Proses';
  let statusColor = [255, 193, 7];
  if (status === 'Lulus') statusColor = [40, 167, 69];
  if (status === 'Tidak Lulus') statusColor = [220, 53, 69];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(70, finalY - 5, 70, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, 105, finalY, { align: "center" });
  doc.setTextColor(0, 0, 0);
  finalY += 12;

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
  doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, 287, { align: "center" });
  doc.save(`Bukti_Pendaftaran_${data['No Pendaftaran']}.pdf`);
};

// ========== BUKTI KELULUSAN (untuk status Lulus) ==========
const printBuktiLulus = (data: any, settings: any) => {
  if (!data) return;
  const doc = new jsPDF();
  let currentY = 20;

  // Header/Kop Surat
  if (settings?.kopSurat) {
    try {
      doc.addImage(settings.kopSurat, 'JPEG', 20, 10, 170, 30);
      currentY = 45;
      doc.line(20, currentY, 190, currentY);
      currentY += 10;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('BUKTI KELULUSAN PPDB', 105, currentY, { align: 'center' });
      currentY += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, 105, currentY, { align: 'center' });
      currentY += 6;
      if (settings?.nomorSurat) {
        doc.setFontSize(11);
        doc.text(`Nomor: ${settings.nomorSurat}`, 105, currentY, { align: 'center' });
        currentY += 6;
      }
      currentY += 4;
    } catch (e) {
      // fallback
      fallbackHeader(doc, currentY);
      currentY += 20;
    }
  } else {
    fallbackHeader(doc, currentY);
    currentY += 20;
  }

  function fallbackHeader(doc: any, y: number) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKTI KELULUSAN PPDB', 105, y, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, 105, y + 8, { align: 'center' });
    if (settings?.nomorSurat) {
      doc.setFontSize(11);
      doc.text(`Nomor: ${settings.nomorSurat}`, 105, y + 14, { align: 'center' });
    }
    doc.line(20, y + 20, 190, y + 20);
  }

  // Isi
  doc.setFontSize(11);
  doc.text('Berdasarkan hasil seleksi Penerimaan Peserta Didik Baru (PPDB),', 20, currentY);
  currentY += 7;
  doc.text('menyatakan bahwa:', 20, currentY);
  currentY += 13;

  const lineSpacing = 8;
  doc.setFont('helvetica', 'bold');
  doc.text('No. Pendaftaran', 30, currentY);
  doc.text(':', 70, currentY);
  doc.text(data.noPendaftaran || '-', 75, currentY);

  doc.setFont('helvetica', 'normal');
  doc.text('Nama Lengkap', 30, currentY + lineSpacing);
  doc.text(':', 70, currentY + lineSpacing);
  doc.text(data.namaLengkap || '-', 75, currentY + lineSpacing);

  doc.text('Status', 30, currentY + lineSpacing * 2);
  doc.text(':', 70, currentY + lineSpacing * 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0);
  doc.text('LULUS', 75, currentY + lineSpacing * 2);
  doc.setTextColor(0, 0, 0);

  currentY += lineSpacing * 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Diharapkan segera melakukan daftar ulang dengan membawa persyaratan berikut:', 20, currentY);
  currentY += lineSpacing;
  const reqText = settings?.persyaratanDaftarUlang || '1. Bukti Kelulusan ini (dicetak)\n2. Fotokopi Akta Kelahiran (2 lembar)\n3. Fotokopi Kartu Keluarga (2 lembar)\n4. Pas Foto 3x4 (4 lembar)\n5. Melakukan pembayaran administrasi awal';
  const splitReq = doc.splitTextToSize(reqText, 160);
  doc.text(splitReq, 25, currentY);
  currentY += splitReq.length * 6 + 20;

  // Tanda tangan
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const tempat = settings?.tempatSurat || '....................';
  const tanggal = settings?.tanggalSurat || dateStr;
  doc.text(`${tempat}, ${tanggal}`, 140, currentY);
  doc.text('Kepala Sekolah', 140, currentY + 6);
  if (settings?.stempelSekolah) {
    try { doc.addImage(settings.stempelSekolah, 'PNG', 120, currentY + 8, 30, 30); } catch(e) {}
  }
  if (settings?.tandaTanganKepalaSekolah) {
    try { doc.addImage(settings.tandaTanganKepalaSekolah, 'PNG', 140, currentY + 10, 40, 20); } catch(e) {}
  }
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.namaKepalaSekolah || 'Kepala Sekolah', 140, currentY + 35);
  if (settings?.nipKepalaSekolah) {
    doc.text(`NIP. ${settings.nipKepalaSekolah}`, 140, currentY + 40);
  }
  if (settings?.catatanTambahan) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const splitCatatan = doc.splitTextToSize(`Catatan: ${settings.catatanTambahan}`, 170);
    doc.text(splitCatatan, 20, 260);
  }
  doc.setFontSize(9);
  doc.text(`Dicetak pada: ${dateStr}`, 20, 280);
  doc.save(`Bukti_Kelulusan_${data.noPendaftaran}.pdf`);
};

export default function CheckStatus() {
  const { settings } = useSettings();
  const [noPendaftaran, setNoPendaftaran] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    noPendaftaran: string;
    namaLengkap: string;
    status: string;
    alasanPenolakan?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noPendaftaran.trim()) return;
    setIsLoading(true);
    setError('');
    setResult(null);
    setRegistrationData(null);
    try {
      const response = await checkStatus(noPendaftaran);
      if (response.status === 'success') {
        setResult(response.data);
        if (response.data.status === 'Proses') {
          await fetchRegistrationData(noPendaftaran);
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

  const fetchRegistrationData = async (noReg: string) => {
    setIsLoadingForm(true);
    try {
      const data = await getRegistrationByNo(noReg);
      if (data) setRegistrationData(data);
    } catch (error) {
      console.error('Error fetching registration data:', error);
    } finally {
      setIsLoadingForm(false);
    }
  };

  const getStatusDisplay = (status: string, data?: any) => {
    let displayStatus = status;
    if (settings?.tanggalPengumuman) {
      const pengumumanDate = new Date(settings.tanggalPengumuman);
      const now = new Date();
      pengumumanDate.setHours(0, 0, 0, 0);
      if (now < pengumumanDate) displayStatus = 'Proses';
    }
    switch (displayStatus) {
      case 'Lulus':
        return (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">Selamat! Anda Lulus</h3>
            <p className="text-green-700 mb-4">Silakan cetak bukti kelulusan dan lakukan daftar ulang.</p>
            <div className="bg-white rounded-lg p-4 border border-green-100 text-left mb-4">
              <h4 className="font-semibold text-green-800 mb-2 text-sm">Persyaratan Daftar Ulang:</h4>
              {settings?.tanggalDaftarUlang && <p className="text-sm text-green-700 mb-2">Tanggal: {new Date(settings.tanggalDaftarUlang).toLocaleDateString('id-ID')}</p>}
              <div className="text-sm text-green-700 whitespace-pre-line">
                {settings?.persyaratanDaftarUlang || '1. Bukti Kelulusan ini (dicetak)\n2. Fotokopi Akta Kelahiran (2 lembar)\n3. Fotokopi Kartu Keluarga (2 lembar)\n4. Pas Foto 3x4 (4 lembar)\n5. Melakukan pembayaran administrasi awal'}
              </div>
            </div>
            <button onClick={() => printBuktiLulus(data, settings)} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <Printer size={20} /> Cetak Bukti Kelulusan
            </button>
          </div>
        );
      case 'Tidak Lulus':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Tidak Lulus</h3>
            <p className="text-red-700 mb-4">Tetap semangat dan jangan menyerah.</p>
            {data?.alasanPenolakan && (
              <div className="bg-white rounded-lg p-4 text-left border border-red-100">
                <h4 className="font-semibold text-red-800 mb-1">Alasan:</h4>
                <p className="text-sm text-red-700">{data.alasanPenolakan}</p>
              </div>
            )}
          </div>
        );
      default:
        const isBeforePengumuman = settings?.tanggalPengumuman && new Date() < new Date(settings.tanggalPengumuman);
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="text-amber-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-amber-800 mb-2">Data Sedang Diproses</h3>
            <p className="text-amber-700">
              {isBeforePengumuman 
                ? `Pengumuman kelulusan akan dibuka pada tanggal ${new Date(settings.tanggalPengumuman!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.` 
                : 'Berkas Anda sedang dalam tahap verifikasi panitia.'}
            </p>
            {registrationData && (
              <div className="mt-6 pt-4 border-t border-amber-200">
                <div className="flex items-center gap-2 text-amber-700 mb-3 justify-center">
                  <FileText size={18} />
                  <span className="font-semibold">Unduh Bukti Pendaftaran</span>
                </div>
                <p className="text-amber-600 text-sm mb-4">
                  Anda dapat mengunduh Bukti Pendaftaran lengkap yang mencakup data diri, koordinat rumah, dan jarak ke sekolah.
                </p>
                <button
                  onClick={() => printProof(registrationData, settings)}
                  disabled={isLoadingForm}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Download size={18} />
                  {isLoadingForm ? 'Memuat Data...' : 'Unduh Bukti Pendaftaran'}
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6">
          <ArrowLeft size={16} className="mr-1" /> Kembali ke Beranda
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Cek Status Kelulusan</h2>
            <p className="text-blue-100 text-sm">Masukkan nomor pendaftaran Anda untuk melihat hasil seleksi PPDB.</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSearch} className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nomor Pendaftaran</label>
              <div className="flex gap-2">
                <input type="text" required value={noPendaftaran} onChange={(e) => setNoPendaftaran(e.target.value)} className="flex-grow px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Contoh: PPDB-2024-001" />
                <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center justify-center">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>
            </form>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center border border-red-100">{error}</div>}
            {result && (
              <div className="space-y-6">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="block text-slate-500 mb-1">No. Pendaftaran</span><span className="font-semibold text-slate-900">{result.noPendaftaran}</span></div>
                    <div><span className="block text-slate-500 mb-1">Nama Lengkap</span><span className="font-semibold text-slate-900">{result.namaLengkap}</span></div>
                  </div>
                </div>
                {getStatusDisplay(result.status, result)}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
