import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText } from 'lucide-react';
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

// ========== BUKTI PENDAFTARAN (untuk status Proses) ==========
const printProof = (data: any, settings: any) => {
  if (!data) return;
  const doc = new jsPDF();
  let y = 15; // Mulai lebih tinggi

  // HEADER - DINAILKAN POSISINYA
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 55, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PENDAFTARAN PPDB", 105, 25, { align: "center" }); // Naik dari 28 ke 25
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 105, 37, { align: "center" }); // Naik dari 40 ke 37
  doc.text(`No. Pendaftaran: ${data['No Pendaftaran'] || '-'}`, 105, 47, { align: "center" }); // Naik dari 50 ke 47
  doc.setTextColor(0, 0, 0);
  y = 70; // Naik dari 68 ke 70

  // JENIS SELEKSI - Desain lebih rapi
  const jenisSeleksi = data['Jenis Seleksi'] || '-';
  
  // Garis atas
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, y - 2, 196, y - 2);
  
  // Label JENIS SELEKSI
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("JENIS SELEKSI", 105, y + 4, { align: "center" });
  
  // Value Jenis Seleksi (warna biru, font lebih besar)
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.setFont("helvetica", "bold");
  doc.text(jenisSeleksi, 105, y + 16, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  // Garis bawah - DITURUNKAN AGAR TIDAK KENA TULISAN
  y = y + 28; // Geser posisi garis bawah (dari 22 ke 28)
  doc.line(14, y, 196, y);
  y = y + 12; // Jarak setelah garis

  // ========== TABEL DATA PRIBADI ==========
  const leftFields = [
    "Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir",
    "Jenis Kelamin", "Golongan Darah", "Tinggi Badan", "Berat Badan"
  ];
  const rightFields = [
    "NISN", "Asal Sekolah",
    "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu",
    "Prestasi Akademik", "Prestasi Non Akademik"
  ];

  const formatValue = (field: string, val: any) => {
    if (field === "Tanggal Lahir") return formatDate(val);
    if (val === undefined || val === null || val === "") return "-";
    // Singkat URL jika ada
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
    styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
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

  // ALAMAT
  if (data['Alamat Domisili Lengkap']) {
    doc.setFont("helvetica", "bold");
    doc.text("Alamat Domisili Lengkap:", 20, finalY);
    finalY += 6;
    doc.setFont("helvetica", "normal");
    const alamat = String(data['Alamat Domisili Lengkap']);
    const splitAlamat = doc.splitTextToSize(alamat, 160);
    doc.text(splitAlamat, 22, finalY);
    finalY += splitAlamat.length * 5 + 8;
  }

  // NOMOR WA
  if (data['Nomor WA Aktif']) {
    doc.setFont("helvetica", "bold");
    doc.text("Nomor WA Aktif:", 20, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(String(data['Nomor WA Aktif']), 70, finalY);
    finalY += 12;
  }

  // LOKASI DAN JARAK
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    // Garis pemisah
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
  finalY += 15;

  // FOOTER
  if (finalY < 260) {
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 270, 190, 270);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
    doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, 287, { align: "center" });
  }

  doc.save(`Bukti_Pendaftaran_${data['No Pendaftaran']}.pdf`);
};

// ========== BUKTI KELULUSAN (untuk status Lulus) - Versi Sederhana ==========
const printBuktiLulus = (data: any, settings: any) => {
  if (!data) return;
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI KELULUSAN PPDB", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 105, 30, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y = 55;

  // Isi
  doc.setFontSize(11);
  doc.text(`No. Pendaftaran: ${data.noPendaftaran || '-'}`, 20, y);
  y += 8;
  doc.text(`Nama Lengkap: ${data.namaLengkap || '-'}`, 20, y);
  y += 8;
  doc.text(`Status: LULUS`, 20, y);
  y += 15;

  doc.text("Persyaratan Daftar Ulang:", 20, y);
  y += 6;
  const reqText = settings?.persyaratanDaftarUlang || '1. Bukti Kelulusan ini (dicetak)\n2. Fotokopi Akta Kelahiran\n3. Fotokopi Kartu Keluarga\n4. Pas Foto 3x4\n5. Melakukan pembayaran administrasi awal';
  const splitReq = doc.splitTextToSize(reqText, 170);
  doc.text(splitReq, 25, y);
  y += splitReq.length * 6 + 15;

  // Tanda tangan
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  doc.text(`Dicetak pada: ${dateStr}`, 20, y + 20);
  doc.text("Kepala Sekolah", 140, y);
  doc.text(settings?.namaKepalaSekolah || 'Kepala Sekolah', 140, y + 40);
  
  doc.save(`Bukti_Kelulusan_${data.noPendaftaran}.pdf`);
};

export default function CheckStatus() {
  const { settings } = useSettings();
  const [noPendaftaran, setNoPendaftaran] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
          <button onClick={() => printBuktiLulus(data, settings)} className="bg-green-600 text-white px-6 py-3 rounded-lg mt-4">
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
          {data?.alasanPenolakan && <p className="text-red-700">{data.alasanPenolakan}</p>}
        </div>
      );
    }
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <Clock className="text-amber-600 w-16 h-16 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-amber-800 mb-2">Data Sedang Diproses</h3>
        {registrationData && (
          <button onClick={() => printProof(registrationData, settings)} className="bg-green-600 text-white px-6 py-3 rounded-lg mt-4">
            <Download className="inline mr-2" size={18} /> Unduh Bukti Pendaftaran
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center text-blue-600 mb-6">
          <ArrowLeft size={16} className="mr-1" /> Kembali
        </Link>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Cek Status Kelulusan</h2>
          </div>
          <div className="p-8">
            <form onSubmit={handleSearch} className="mb-8">
              <input type="text" required value={noPendaftaran} onChange={(e) => setNoPendaftaran(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="PPDB-2024-001" />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-xl mt-4">
                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : <Search className="mx-auto" />}
              </button>
            </form>
            {error && <div className="text-red-600 text-center">{error}</div>}
            {result && (
              <div>
                <div className="border rounded-xl p-4 mb-4">
                  <p><strong>No. Pendaftaran:</strong> {result.noPendaftaran}</p>
                  <p><strong>Nama:</strong> {result.namaLengkap}</p>
                </div>
                {getStatusDisplay(result.status, result)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
