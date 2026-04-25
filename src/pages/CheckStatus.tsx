import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus, getRegistrationByNo } from '../services/api';
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

// =================== BUKTI PENDAFTARAN LENGKAP ===================
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

  // DATA PRIBADI
  doc.setFillColor(200, 200, 200);
  doc.rect(14, y - 6, 182, 8, 'F');
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATA PRIBADI", 105, y - 1, { align: "center" });
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const excludeFields = ["No Pendaftaran", "Timestamp", "Status", "Koordinat Lokasi", "Jarak ke Sekolah (km)", "Alasan Penolakan"];
  const allFields = Object.keys(data).filter(key => !excludeFields.includes(key) && data[key] !== undefined && data[key] !== null && data[key] !== "");
  const mid = Math.ceil(allFields.length / 2);
  const leftCol = allFields.slice(0, mid);
  const rightCol = allFields.slice(mid);

  const drawField = (field: string, x: number, yPos: number) => {
    let value = data[field];
    if (field === "Tanggal Lahir") value = formatDate(value);
    const displayValue = (value === undefined || value === null || value === "") ? "-" : String(value);
    doc.setFont("helvetica", "bold");
    doc.text(`${field}:`, x, yPos);
    doc.setFont("helvetica", "normal");
    const splitVal = doc.splitTextToSize(displayValue, 70);
    doc.text(splitVal, x + 45, yPos);
    return splitVal.length * 5;
  };

  let leftY = y, rightY = y;
  leftCol.forEach(f => { leftY += Math.max(6, drawField(f, 20, leftY)); });
  rightCol.forEach(f => { rightY += Math.max(6, drawField(f, 115, rightY)); });
  y = Math.max(leftY, rightY) + 5;

  // LOKASI DAN JARAK
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    doc.setFillColor(200, 200, 200);
    doc.rect(14, y - 6, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("LOKASI DAN JARAK", 105, y - 1, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    if (data['Koordinat Lokasi']) {
      doc.text("Koordinat Rumah:", 20, y);
      doc.text(data['Koordinat Lokasi'], 70, y);
      y += 6;
    }
    if (data['Jarak ke Sekolah (km)']) {
      doc.text("Jarak ke Sekolah:", 20, y);
      doc.text(`${data['Jarak ke Sekolah (km)']} km`, 70, y);
      y += 6;
    }
    y += 5;
  }

  // STATUS
  doc.setFillColor(200, 200, 200);
  doc.rect(14, y - 6, 182, 8, 'F');
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS PENDAFTARAN", 105, y - 1, { align: "center" });
  y += 10;
  const status = data.Status || 'Proses';
  let statusColor = [255, 193, 7];
  if (status === 'Lulus') statusColor = [40, 167, 69];
  if (status === 'Tidak Lulus') statusColor = [220, 53, 69];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(70, y - 5, 70, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, 105, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
  doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, 287, { align: "center" });
  doc.save(`Bukti_Pendaftaran_${data['No Pendaftaran']}.pdf`);
};

// =================== BUKTI KELULUSAN ===================
const printBuktiLulus = (data: any, settings: any) => {
  if (!data) return;
  const doc = new jsPDF();
  let y = 20;
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI KELULUSAN PPDB", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 105, 32, { align: "center" });
  doc.text(`No. Pendaftaran: ${data.noPendaftaran}`, 105, 42, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y = 60;
  doc.setFontSize(12);
  doc.text("Dengan ini menyatakan bahwa:", 20, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Nama: ${data.namaLengkap}`, 20, y);
  y += 8;
  doc.text(`No. Pendaftaran: ${data.noPendaftaran}`, 20, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 167, 69);
  doc.text("Status: LULUS", 20, y);
  doc.setTextColor(0, 0, 0);
  y += 15;
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 20, 280);
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
      setError('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!result) return null;
    if (result.status === 'Lulus') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="text-green-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">Selamat! Anda Lulus</h3>
          <button onClick={() => printBuktiLulus(result, settings)} className="bg-green-600 text-white px-4 py-2 rounded-lg">Cetak Bukti Kelulusan</button>
        </div>
      );
    }
    if (result.status === 'Tidak Lulus') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="text-red-600 w-16 h-16 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Tidak Lulus</h3>
          {result.alasanPenolakan && <p className="text-red-700">{result.alasanPenolakan}</p>}
        </div>
      );
    }
    // Proses
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <Clock className="text-amber-600 w-16 h-16 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-amber-800 mb-2">Data Sedang Diproses</h3>
        {registrationData && (
          <button onClick={() => printProof(registrationData, settings)} className="bg-green-600 text-white px-4 py-2 rounded-lg mt-4">
            <Download className="inline mr-2" size={18} /> Unduh Bukti Pendaftaran
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="text-blue-600 inline-flex items-center mb-6"><ArrowLeft size={16} /> Kembali</Link>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Cek Status Kelulusan</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={noPendaftaran} onChange={e => setNoPendaftaran(e.target.value)} className="flex-1 border rounded-xl px-4 py-2" placeholder="No. Pendaftaran" />
            <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Cek</button>
          </form>
          {error && <div className="text-red-600 text-center mt-4">{error}</div>}
          {result && <div className="mt-6">{getStatusDisplay()}</div>}
        </div>
      </div>
    </div>
  );
}
