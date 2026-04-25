import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, AlertCircle, FileText, Loader2, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { submitRegistration, RegistrationData } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MapPicker from '../components/MapPicker';
import { calculateDistance } from '../utils/distance';

// Helper format tanggal
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper deteksi base64 image
const isBase64Image = (str: string) => {
  return str && (str.startsWith('data:image') || str.startsWith('/9j/'));
};

// Helper ekstrak fileId dari URL Google Drive (jika nanti foto URL)
const extractFileId = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export default function RegistrationForm() {
  const { settings } = useSettings();
  const isClosed = settings?.statusPendaftaran === 'Tutup';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // ========== VALIDASI ==========
  const validateNIK = (nik: string): boolean => /^\d{16}$/.test(nik);
  const validateNISN = (nisn: string): boolean => /^\d{10}$/.test(nisn);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'NIK') {
      const angkaOnly = value.replace(/\D/g, '');
      if (angkaOnly.length <= 16) setFormData(prev => ({ ...prev, [name]: angkaOnly }));
      return;
    }
    if (name === 'NISN') {
      const angkaOnly = value.replace(/\D/g, '');
      if (angkaOnly.length <= 10) setFormData(prev => ({ ...prev, [name]: angkaOnly }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'File Terlalu Besar', text: 'Ukuran maksimal file adalah 2MB', confirmButtonColor: '#3b82f6' });
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, [fieldId]: base64String }));
      setPreviews(prev => ({ ...prev, [fieldId]: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setMapLocation({ lat, lng });
    setFormData(prev => ({ ...prev, 'Koordinat Lokasi': `${lat}, ${lng}` }));
    if (settings?.koordinatSekolah) {
      const [schoolLat, schoolLng] = settings.koordinatSekolah.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(schoolLat) && !isNaN(schoolLng)) {
        const dist = calculateDistance(lat, lng, schoolLat, schoolLng);
        setDistance(dist);
        setFormData(prev => ({ ...prev, 'Jarak ke Sekolah (km)': dist.toFixed(2) }));
      }
    }
  };

  // ========== BUKTI PENDAFTARAN (sama dengan di CheckStatus) ==========
  const printProof = async (noPendaftaran: string) => {
    if (!formData) return;
    const data = { ...formData, 'No Pendaftaran': noPendaftaran };
    const doc = new jsPDF();
    const fotoField = data['Foto Siswa'] || data['File Pas Foto'] || data['Pas Foto'];
    let fotoBase64 = null;
    if (fotoField && typeof fotoField === 'string' && isBase64Image(fotoField)) {
      fotoBase64 = fotoField;
    } else if (fotoField && typeof fotoField === 'string' && fotoField.startsWith('http')) {
      const fileId = extractFileId(fotoField);
      if (fileId) {
        try {
          const proxyUrl = '/api/gas-proxy';
          const response = await fetch(`${proxyUrl}?action=getImage&fileId=${fileId}&t=${Date.now()}`);
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            fotoBase64 = `data:${result.mimeType};base64,${result.data}`;
          }
        } catch (err) { console.warn(err); }
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
      } catch (e) { drawPlaceholder(doc); }
    } else { drawPlaceholder(doc); }

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
    doc.text("BUKTI PENDAFTARAN PPDB", 115, 22, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.namaSekolah || "SMAN 4 PAGAR ALAM", 115, 34, { align: "center" });
    doc.text(`No. Pendaftaran: ${noPendaftaran}`, 115, 46, { align: "center" });

    y = 72;
    const jenisSeleksi = data['Jenis Seleksi'] || '-';
    doc.setDrawColor(0, 0, 0);
    doc.line(14, y - 2, 196, y - 2);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("JENIS SELEKSI", 105, y + 6, { align: "center" });
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "bold");
    doc.text(jenisSeleksi, 105, y + 22, { align: "center" });
    doc.setTextColor(0, 0, 0);
    let garisBawahY = y + 30;
    doc.line(14, garisBawahY, 196, garisBawahY);
    y = garisBawahY + 12;

    const leftFields = [
      "Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir",
      "Jenis Kelamin", "Golongan Darah", "Tinggi Badan", "Berat Badan", "Nomor WA Aktif", "Alamat Domisili Lengkap"
    ];
    const rightFields = [
      "NISN", "Asal Sekolah",
      "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu",
      "Prestasi Akademik", "Prestasi Non Akademik", "No WA Aktif Orang Tua"
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

    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    finalY += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("STATUS PENDAFTARAN", 105, finalY, { align: "center" });
    finalY += 10;
    doc.setFillColor(255, 193, 7);
    doc.roundedRect(70, finalY - 5, 70, 10, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Proses", 105, finalY + 2, { align: "center" });
    doc.setTextColor(0, 0, 0);
    finalY += 15;
    if (finalY < 260) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, 190, 270);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
      doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, 287, { align: "center" });
    }
    doc.save(`Bukti_Pendaftaran_${noPendaftaran}.pdf`);
  };

  // ========== SUBMIT ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) {
      Swal.fire({ icon: 'warning', title: 'Pernyataan Belum Disetujui', text: 'Anda harus menyetujui pernyataan kebenaran data sebelum mengirim formulir.', confirmButtonColor: '#3b82f6' });
      return;
    }
    const nikValue = formData['NIK'] || '';
    if (!validateNIK(nikValue)) {
      Swal.fire({ icon: 'error', title: 'NIK Tidak Valid', text: 'NIK harus terdiri dari 16 digit angka (0-9). Contoh: 3173010101010001', confirmButtonColor: '#3b82f6' });
      return;
    }
    const nisnField = settings?.formFields?.find(f => f.id === 'NISN' || f.label === 'NISN');
    if (nisnField && nisnField.required) {
      const nisnValue = formData['NISN'] || '';
      if (!nisnValue) {
        Swal.fire({ icon: 'error', title: 'NISN Wajib Diisi', text: 'Silakan isi NISN dengan benar.', confirmButtonColor: '#3b82f6' });
        return;
      }
      if (!validateNISN(nisnValue)) {
        Swal.fire({ icon: 'error', title: 'NISN Tidak Valid', text: 'NISN harus terdiri dari 10 digit angka (0-9). Contoh: 1234567890', confirmButtonColor: '#3b82f6' });
        return;
      }
    }
    const missingFiles = settings?.formFields?.filter(f => f.type === 'file' && f.required && !formData[f.label]);
    if (missingFiles && missingFiles.length > 0) {
      Swal.fire({ icon: 'warning', title: 'Berkas Belum Lengkap', text: `Mohon unggah dokumen: ${missingFiles.map(f => f.label).join(', ')}`, confirmButtonColor: '#3b82f6' });
      return;
    }
    if (!mapLocation) {
      Swal.fire({ icon: 'warning', title: 'Lokasi Belum Ditandai', text: 'Mohon tandai lokasi rumah Anda di peta.', confirmButtonColor: '#3b82f6' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await submitRegistration(formData);
      if (response.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Pendaftaran Berhasil!',
          html: `Nomor Pendaftaran Anda:<br><b style="font-size: 1.5rem; color: #2563eb;">${response.noPendaftaran}</b><br><br>Simpan nomor ini untuk mengecek status kelulusan.`,
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'Unduh Bukti Pendaftaran',
          showCancelButton: true,
          cancelButtonText: 'Tutup',
          allowOutsideClick: false
        }).then((result) => {
          if (result.isConfirmed) {
            printProof(response.noPendaftaran);
          }
          window.location.href = '/';
        });
      } else {
        let errorMessage = response.message || 'Terjadi kesalahan. Silakan coba lagi.';
        if (errorMessage.includes('NIK') && errorMessage.includes('sudah terdaftar')) {
          Swal.fire({ icon: 'error', title: 'NIK Sudah Terdaftar!', html: `${errorMessage}<br><br>Jika Anda sudah mendaftar sebelumnya, silakan cek status pendaftaran Anda.`, confirmButtonColor: '#3b82f6' });
        } else if (errorMessage.includes('NISN') && errorMessage.includes('sudah terdaftar')) {
          Swal.fire({ icon: 'error', title: 'NISN Sudah Terdaftar!', html: `${errorMessage}<br><br>Jika Anda sudah mendaftar sebelumnya, silakan cek status pendaftaran Anda.`, confirmButtonColor: '#3b82f6' });
        } else {
          Swal.fire({ icon: 'error', title: 'Pendaftaran Gagal', text: errorMessage, confirmButtonColor: '#3b82f6' });
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Swal.fire({ icon: 'error', title: 'Oops...', text: error?.message || 'Terjadi kesalahan saat mengirim data. Silakan coba lagi.', confirmButtonColor: '#3b82f6' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field form
  const renderField = (field: any) => {
    const commonClasses = "w-full px-3 py-2 sm:px-4 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base";
    if (field.id === 'NIK') {
      return <input type="text" name={field.label} required={field.required} value={formData[field.label] || ''} onChange={handleChange} className={commonClasses} placeholder="16 digit angka (contoh: 3173010101010001)" maxLength={16} minLength={16} pattern="\d{16}" title="NIK harus 16 digit angka" />;
    }
    if (field.id === 'NISN') {
      return <input type="text" name={field.label} required={field.required} value={formData[field.label] || ''} onChange={handleChange} className={commonClasses} placeholder="10 digit angka (contoh: 1234567890)" maxLength={10} minLength={10} pattern="\d{10}" title="NISN harus 10 digit angka" />;
    }
    switch (field.type) {
      case 'textarea':
        return <textarea name={field.label} required={field.required} rows={3} value={formData[field.label] || ''} onChange={handleChange} className={`${commonClasses} resize-none`} placeholder={field.label} />;
      case 'select':
        return <select name={field.label} required={field.required} value={formData[field.label] || ''} onChange={handleChange} className={`${commonClasses} bg-white`}><option value="">Pilih {field.label}</option>{field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}</select>;
      case 'file':
        return (
          <div className="relative flex-grow border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 transition-colors bg-slate-50 group overflow-hidden h-32 sm:h-40">
            <input type="file" accept="image/jpeg, image/png, application/pdf" required={field.required} onChange={(e) => handleFileChange(e, field.label)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            {previews[field.label] ? (
              <div className="absolute inset-0">
                {previews[field.label].startsWith('data:image') ? <img src={previews[field.label]} alt="Preview" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full p-2 text-center bg-blue-50"><FileText className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500 mb-1" /><span className="text-xs sm:text-sm text-blue-700 font-medium">File Terpilih</span></div>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs sm:text-sm font-medium">Ubah File</span></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-2 text-center"><Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors" /><span className="text-xs sm:text-sm text-slate-500 group-hover:text-blue-600">Klik atau Drag file</span></div>
            )}
          </div>
        );
      default:
        return <input type={field.type} name={field.label} required={field.required} value={formData[field.label] || ''} onChange={handleChange} className={commonClasses} placeholder={field.label} />;
    }
  };

  const textFields = settings?.formFields?.filter(f => f.type !== 'file') || [];
  const fileFields = settings?.formFields?.filter(f => f.type === 'file') || [];

  if (isClosed) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl text-center p-8">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Pendaftaran Ditutup</h2>
          <p className="text-slate-600 mb-8">Mohon maaf, pendaftaran peserta didik baru saat ini sedang ditutup.</p>
          <Link to="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:py-12 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-6 sm:px-8 sm:py-10 text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Formulir Pendaftaran PPDB</h2>
            <p className="text-blue-100 text-sm sm:text-base">Lengkapi data diri calon peserta didik dengan benar dan valid.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            {textFields.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-7 h-7 rounded-full flex items-center justify-center text-sm">1</span>
                  Data Pendaftar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {textFields.map(field => (
                    <div key={field.id} className={field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      {renderField(field)}
                      {field.id === 'NIK' && (
                        <p className="text-xs text-slate-400 mt-1">* Harus 16 digit angka</p>
                      )}
                      {field.id === 'NISN' && (
                        <p className="text-xs text-slate-400 mt-1">* Harus 10 digit angka</p>
                      )}
                    </div>
                  ))}
                  <div className="col-span-1 md:col-span-2 mt-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <MapPin size={18} className="text-blue-600" />
                      Tandai Lokasi Rumah di Peta
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Klik pada peta untuk menandai lokasi rumah Anda. Jarak ke sekolah akan dihitung secara otomatis.
                    </p>
                    <MapPicker onLocationSelect={handleLocationSelect} autoLocate={true} />
                    {distance !== null && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-slate-700">Jarak ke Sekolah:</span>
                        <span className="font-bold text-blue-700">{distance.toFixed(2)} km</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {fileFields.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
                  Upload Berkas
                </h3>
                <p className="text-sm text-slate-500 mb-4 sm:mb-6 flex items-center gap-2 bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-100">
                  <AlertCircle size={16} className="text-blue-500 shrink-0" />
                  Format file: JPG/PNG/PDF. Ukuran maksimal: 2MB per file.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {fileFields.map(field => (
                    <div key={field.id} className="flex flex-col">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {field.label} {field.required && '*'}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
              <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
                <div className="text-xs sm:text-sm text-slate-700">
                  <span className="font-semibold block mb-1">Pernyataan Kebenaran Data</span>
                  Saya menyatakan bahwa data yang saya isikan dalam formulir pendaftaran ini adalah benar dan dapat dipertanggungjawabkan. Apabila di kemudian hari ditemukan data yang tidak sesuai, saya bersedia menerima sanksi sesuai ketentuan yang berlaku.
                </div>
              </label>
            </div>

            <div className="pt-2 sm:pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Memproses...
                  </>
                ) : (
                  'Kirim Pendaftaran'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
