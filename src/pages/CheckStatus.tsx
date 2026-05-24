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

// Helper: ekstrak fileId dari URL Google Drive
const extractFileId = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// ========== BUKTI PENDAFTARAN (F4 - 210x330mm) ==========
const printProof = async (data: any, settings: any) => {
  if (!data) return;
  
  // F4: lebar 210mm, tinggi 330mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [210, 330]
  });
  
  // Ambil URL foto
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

  // HEADER
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 65, 'F');

  // Tempat foto (kiri)
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

  // Teks judul di sebelah kanan foto
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PENDAFTARAN PPDB", 115, 22, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 115, 34, { align: "center" });
  doc.text(`No. Pendaftaran: ${data['No Pendaftaran'] || '-'}`, 115, 46, { align: "center" });

  y = 62;
  const jalur1 = data['Jalur 1'] || '-';
  const jalur2 = data['Jalur 2'] || '-';
  
  // Garis atas
  doc.setDrawColor(0, 0, 0);
  doc.line(14, y - 2, 196, y - 2);
  
  // Dua kolom Jalur
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("JALUR 1", 55, y + 6, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text(jalur1, 55, y + 18, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("JALUR 2", 155, y + 6, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text(jalur2, 155, y + 18, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  let garisBawahY = y + 28;
  doc.line(14, garisBawahY, 196, garisBawahY);
  y = garisBawahY + 8;

  // TABEL DATA PRIBADI
  const leftFields = [
    "Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir",
    "Jenis Kelamin", "Golongan Darah", "Tinggi Badan", "Berat Badan", "Nomor WA Aktif", "No WA Aktif Orang Tua"
  ];
  const rightFields = [
    "NISN", "Asal Sekolah",
    "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu",
    "Prestasi Akademik Jika Ada", "Prestasi Non Akademik Jika Ada", "Rata-Rata Nilai Akhir", "Alamat Domisili Lengkap"
  ];

  const formatValue = (field: string, val: any) => {
    if (field === "Tanggal Lahir") return formatDate(val);
    if (val === undefined || val === null || val === "") return "-";
    if (typeof val === "string" && val.startsWith("http")) return "File terupload";
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

  autoTable(doc, {
    startY: y,
    head: [],
    body: tableBody,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 25, fontStyle: 'bold' },
      3: { cellWidth: 'auto' },
    },
    margin: { left: 12, right: 12 },
    tableWidth: 'auto',
  });

  let finalY = (doc as any).lastAutoTable.finalY + 5;

  // LOKASI DAN JARAK
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("LOKASI DAN JARAK", 105, finalY, { align: "center" });
    finalY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (data['Koordinat Lokasi']) {
      doc.setFont("helvetica", "bold");
      doc.text("Koordinat Rumah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      const koordinat = String(data['Koordinat Lokasi']);
      const splitKoor = doc.splitTextToSize(koordinat, 100);
      doc.text(splitKoor, 70, finalY);
      finalY += Math.max(6, splitKoor.length * 5);
    }
    if (data['Jarak ke Sekolah (km)']) {
      doc.setFont("helvetica", "bold");
      doc.text("Jarak ke Sekolah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`${data['Jarak ke Sekolah (km)']} km`, 70, finalY);
      finalY += 10;
    }
  }

  // STATUS PENDAFTARAN
  doc.setDrawColor(200, 200, 200);
  doc.line(14, finalY, 196, finalY);
  finalY += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS PENDAFTARAN", 105, finalY, { align: "center" });
  finalY += 10;
  const status = data.Status || 'Proses';
  let statusColor = [255, 193, 7];
  if (status === 'Lulus') statusColor = [40, 167, 69];
  if (status === 'Tidak Lulus') statusColor = [220, 53, 69];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(70, finalY - 5, 70, 10, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, 105, finalY + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  finalY += 20;

  // FOOTER
  doc.setDrawColor(200, 200, 200);
  doc.line(20, finalY, 190, finalY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, finalY + 10, { align: "center" });
  doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, finalY + 17, { align: "center" });

  doc.save(`Bukti_Pendaftaran_${data['No Pendaftaran']}.pdf`);
};

// ========== BUKTI KELULUSAN (HARDCODE - DESAIN SURAT RESMI) ==========
const printBuktiLulus = (data: any, settings: any) => {
  if (!data) return;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  let y = 25;

  // ==================== KOP SURAT ====================
  // Garis tepi atas
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y - 5, pageWidth - marginRight, y - 5);
  
  // Nama Sekolah (HARDCODE - GANTI DENGAN SEKOLAH ANDA)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("SMAN 4 PAGAR ALAM", pageWidth / 2, y, { align: "center" });
  
  // Alamat Sekolah (HARDCODE - GANTI DENGAN ALAMAT SEKOLAH ANDA)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Jl. Pendidikan No. 123, Kota Pagar Alam, Sumatera Selatan 31511", pageWidth / 2, y + 5, { align: "center" });
  
  // Telepon/Email (HARDCODE - GANTI DENGAN KONTAK SEKOLAH ANDA)
  doc.text("Telp: (0730) 12345 | Email: sman4@pagaralam.sch.id", pageWidth / 2, y + 10, { align: "center" });
  
  // Garis bawah kop
  doc.setLineWidth(1);
  doc.line(marginLeft, y + 15, pageWidth - marginRight, y + 15);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y + 16, pageWidth - marginRight, y + 16);
  
  y += 30;
  
  // ==================== NOMOR SURAT ====================
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nomor : 421.3/${data.noPendaftaran}/PPDB/${new Date().getFullYear()}`, marginLeft, y);
  y += 8;
  
  // Lampiran dan Perihal
  doc.text(`Lampiran : 1 (satu) berkas`, marginLeft, y);
  y += 8;
  doc.text(`Perihal : Bukti Kelulusan PPDB`, marginLeft, y);
  y += 15;
  
  // Tempat dan Tanggal
  const today = new Date();
  const tanggal = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  doc.text(`Pagar Alam, ${tanggal}`, pageWidth - marginRight, y - 12, { align: "right" });
  
  // ==================== ISI SURAT ====================
  y += 10;
  
  // Salam pembuka
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Kepada Yth.", marginLeft, y);
  y += 7;
  doc.text(`Calon Peserta Didik Baru`, marginLeft, y);
  y += 7;
  doc.text(`di -`, marginLeft, y);
  y += 7;
  doc.text(`Pagar Alam`, marginLeft, y);
  y += 15;
  
  doc.text("Dengan hormat,", marginLeft, y);
  y += 10;
  
  // Paragraf 1
  const namaSiswa = data.namaLengkap || '-';
  const noPendaftaran = data.noPendaftaran || '-';
  const nisn = data.nisn || '-';
  
  const paragraf1 = `Berdasarkan hasil seleksi Penerimaan Peserta Didik Baru (PPDB) Tahun ${new Date().getFullYear()} SMAN 4 PAGAR ALAM, dengan ini menyatakan bahwa:`;
  const splitPar1 = doc.splitTextToSize(paragraf1, pageWidth - marginLeft - marginRight);
  doc.text(splitPar1, marginLeft, y);
  y += splitPar1.length * 6 + 8;
  
  // Kotak informasi siswa
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(marginLeft, y - 3, pageWidth - marginLeft - marginRight, 35, 3, 3, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(marginLeft, y - 3, pageWidth - marginLeft - marginRight, 35, 3, 3, 'D');
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Nama Lengkap", marginLeft + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${namaSiswa}`, marginLeft + 45, y + 5);
  
  doc.setFont("helvetica", "bold");
  doc.text("No. Pendaftaran", marginLeft + 5, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${noPendaftaran}`, marginLeft + 45, y + 13);
  
  doc.setFont("helvetica", "bold");
  doc.text("NISN", marginLeft + 5, y + 21);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${nisn}`, marginLeft + 45, y + 21);
  
  doc.setFont("helvetica", "bold");
  doc.text("Status", marginLeft + 5, y + 29);
  doc.setFont("helvetica", "normal");
  doc.text(`: LULUS`, marginLeft + 45, y + 29);
  
  y += 38;
  
  // Paragraf 2
  const paragraf2 = `Dinyatakan LULUS dan berhak mengikuti kegiatan Daftar Ulang sebagai peserta didik baru SMAN 4 PAGAR ALAM Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear() + 1}.`;
  const splitPar2 = doc.splitTextToSize(paragraf2, pageWidth - marginLeft - marginRight);
  doc.text(splitPar2, marginLeft, y);
  y += splitPar2.length * 6 + 12;
  
  // Persyaratan Daftar Ulang
  doc.setFont("helvetica", "bold");
  doc.text("Persyaratan Daftar Ulang:", marginLeft, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  
  const persyaratan = 
    "1. Bukti Kelulusan ini (dicetak dan ditandatangani)\n" +
    "2. Fotokopi Akta Kelahiran (2 lembar)\n" +
    "3. Fotokopi Kartu Keluarga (2 lembar)\n" +
    "4. Pas foto 3x4 (4 lembar, background merah)\n" +
    "5. Fotokopi Ijazah/SKL (2 lembar)\n" +
    "6. Fotokopi Piagam Penghargaan (jika ada)\n" +
    "7. Membawa orang tua/wali saat daftar ulang\n" +
    "8. Melakukan pembayaran administrasi awal sebesar Rp 500.000";
  
  const splitReq = doc.splitTextToSize(persyaratan, pageWidth - marginLeft - marginRight - 5);
  doc.text(splitReq, marginLeft + 5, y);
  y += splitReq.length * 5 + 15;
  
  // Jadwal Daftar Ulang
  doc.setFont("helvetica", "bold");
  doc.text("Jadwal Daftar Ulang:", marginLeft, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("Tanggal: 10 - 15 Juli 2025", marginLeft + 5, y);
  y += 5;
  doc.text("Pukul: 08.00 - 15.00 WIB", marginLeft + 5, y);
  y += 5;
  doc.text("Tempat: Ruang Tata Usaha SMAN 4 Pagar Alam", marginLeft + 5, y);
  y += 15;
  
  // Catatan Penting
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 0, 0);
  doc.text("Catatan Penting:", marginLeft, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const catatan = 
    "✓ Apabila tidak melakukan daftar ulang pada jadwal yang ditentukan, maka dinyatakan mengundurkan diri\n" +
    "✓ Berkas yang tidak lengkap akan memperlambat proses daftar ulang\n" +
    "✓ Harap membawa dokumen ASLI untuk diperlihatkan";
  const splitCatatan = doc.splitTextToSize(catatan, pageWidth - marginLeft - marginRight);
  doc.text(splitCatatan, marginLeft + 5, y);
  y += splitCatatan.length * 5 + 20;
  
  // Penutup
  const penutup = `Demikian surat keterangan kelulusan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.`;
  const splitPenutup = doc.splitTextToSize(penutup, pageWidth - marginLeft - marginRight);
  doc.text(splitPenutup, marginLeft, y);
  y += splitPenutup.length * 6 + 20;
  
  // ==================== TANDA TANGAN ====================
  const tandaTanganY = y;
  
  doc.text("Hormat Kami,", pageWidth - marginRight - 40, tandaTanganY);
  
  // Kepala Sekolah (HARDCODE - GANTI DENGAN NAMA KEPSEK ANDA)
  doc.setFont("helvetica", "bold");
  doc.text("Drs. H. AHMAD RIFAI, M.Pd", pageWidth - marginRight - 40, tandaTanganY + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NIP. 19751225 200312 1 001", pageWidth - marginRight - 40, tandaTanganY + 25);
  
  // Garis tanda tangan
  doc.setLineWidth(0.5);
  doc.line(pageWidth - marginRight - 70, tandaTanganY + 18, pageWidth - marginRight - 10, tandaTanganY + 18);
  
  // ==================== TEMBAHAN ====================
  y = tandaTanganY + 45;
  
  // Tembusan
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Tembusan:", marginLeft, y);
  y += 4;
  doc.text("1. Arsip Sekolah", marginLeft + 5, y);
  y += 4;
  doc.text("2. Yang Bersangkutan", marginLeft + 5, y);
  y += 4;
  doc.text("3. Dinas Pendidikan Kota Pagar Alam", marginLeft + 5, y);
  y += 10;
  
  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
  doc.text("Dokumen ini adalah bukti resmi kelulusan dan tidak dapat diganti jika hilang", pageWidth / 2, y + 4, { align: "center" });
  
  // Simpan PDF
  doc.save(`Bukti_Kelulusan_${data.noPendaftaran}.pdf`);
};

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
