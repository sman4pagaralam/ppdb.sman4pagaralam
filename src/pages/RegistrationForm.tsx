import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, AlertCircle, FileText, Image as ImageIcon, Loader2, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { submitRegistration, RegistrationData } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import jsPDF from 'jspdf';
import MapPicker from '../components/MapPicker';
import { calculateDistance } from '../utils/distance';

export default function RegistrationForm() {
  const { settings } = useSettings();
  const isClosed = settings?.statusPendaftaran === 'Tutup';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Terlalu Besar',
        text: 'Ukuran maksimal file adalah 2MB',
        confirmButtonColor: '#3b82f6'
      });
      e.target.value = '';
      return;
    }

    // Convert to Base64
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

  const printProof = (noPendaftaran: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BUKTI PENDAFTARAN PPDB", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.namaSekolah || "SDN Harapan Bangsa", 105, 30, { align: "center" });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    let startY = 60;
    const lineHeight = 10;
    
    const formatDate = (dateString: string) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    doc.setFont("helvetica", "bold");
    doc.text("No. Pendaftaran", 20, startY);
    doc.text(":", 70, startY);
    doc.text(noPendaftaran, 75, startY);
    startY += lineHeight;

    doc.setFont("helvetica", "normal");
    
    settings?.formFields?.forEach(field => {
      if (field.type !== 'file') {
        doc.text(field.label, 20, startY);
        doc.text(":", 70, startY);
        let value = formData[field.label] || '-';
        if (field.type === 'date') {
          value = formatDate(value);
        }
        
        // Handle long text
        const splitText = doc.splitTextToSize(value, 115);
        doc.text(splitText, 75, startY);
        startY += lineHeight * splitText.length;
      }
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Simpan bukti pendaftaran ini untuk mengecek status kelulusan.", 105, 280, { align: "center" });
    
    doc.save(`Bukti_Pendaftaran_${noPendaftaran}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAgreed) {
      Swal.fire({
        icon: 'warning',
        title: 'Pernyataan Belum Disetujui',
        text: 'Anda harus menyetujui pernyataan kebenaran data sebelum mengirim formulir.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Basic validation for files
    const missingFiles = settings?.formFields?.filter(f => f.type === 'file' && f.required && !formData[f.label]);
    if (missingFiles && missingFiles.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Berkas Belum Lengkap',
        text: `Mohon unggah dokumen: ${missingFiles.map(f => f.label).join(', ')}`,
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    if (!mapLocation) {
      Swal.fire({
        icon: 'warning',
        title: 'Lokasi Belum Ditandai',
        text: 'Mohon tandai lokasi rumah Anda di peta.',
        confirmButtonColor: '#3b82f6'
      });
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
          // Reset form
          window.location.href = '/';
        });
      } else {
        throw new Error(response.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Terjadi kesalahan saat mengirim data. Silakan coba lagi.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isClosed) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 text-center p-8">
          <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Pendaftaran Ditutup</h2>
          <p className="text-slate-600 mb-8">
            Mohon maaf, pendaftaran peserta didik baru saat ini sedang ditutup. Silakan kembali lagi nanti atau hubungi pihak sekolah untuk informasi lebih lanjut.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const renderField = (field: any) => {
    const commonClasses = "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.label}
            required={field.required}
            rows={3}
            value={formData[field.label] || ''}
            onChange={handleChange}
            className={`${commonClasses} resize-none`}
            placeholder={field.label}
          />
        );
      case 'select':
        return (
          <select
            name={field.label}
            required={field.required}
            value={formData[field.label] || ''}
            onChange={handleChange}
            className={`${commonClasses} bg-white`}
          >
            <option value="">Pilih {field.label}</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'file':
        return (
          <div className="relative flex-grow border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 transition-colors bg-slate-50 group overflow-hidden h-40">
            <input
              type="file"
              accept="image/jpeg, image/png, application/pdf"
              required={field.required}
              onChange={(e) => handleFileChange(e, field.label)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {previews[field.label] ? (
              <div className="absolute inset-0">
                {previews[field.label].startsWith('data:image') ? (
                  <img src={previews[field.label]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-blue-50">
                    <FileText className="w-12 h-12 text-blue-500 mb-2" />
                    <span className="text-sm text-blue-700 font-medium">File Terpilih</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">Ubah File</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm text-slate-500 group-hover:text-blue-600">Klik atau Drag file</span>
              </div>
            )}
          </div>
        );
      default:
        return (
          <input
            type={field.type}
            name={field.label}
            required={field.required}
            value={formData[field.label] || ''}
            onChange={handleChange}
            className={commonClasses}
            placeholder={field.label}
          />
        );
    }
  };

  const textFields = settings?.formFields?.filter(f => f.type !== 'file') || [];
  const fileFields = settings?.formFields?.filter(f => f.type === 'file') || [];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-10 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Formulir Pendaftaran PPDB</h2>
            <p className="text-blue-100">Lengkapi data diri calon peserta didik dengan benar dan valid.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {textFields.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-6 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  Data Pendaftar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {textFields.map(field => (
                    <div key={field.id} className={field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                  
                  <div className="col-span-1 md:col-span-2 mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <MapPin size={18} className="text-blue-600" />
                      Tandai Lokasi Rumah di Peta
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Klik pada peta untuk menandai lokasi rumah Anda. Jarak ke sekolah akan dihitung secara otomatis.
                    </p>
                    <MapPicker onLocationSelect={handleLocationSelect} />
                    
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
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-6 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  Upload Berkas
                </h3>
                <p className="text-sm text-slate-500 mb-6 flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <AlertCircle size={16} className="text-blue-500 shrink-0" />
                  Format file: JPG/PNG/PDF. Ukuran maksimal: 2MB per file.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* Pernyataan Kebenaran Data */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm text-slate-700">
                  <span className="font-semibold block mb-1">Pernyataan Kebenaran Data</span>
                  Saya menyatakan bahwa data yang saya isikan dalam formulir pendaftaran ini adalah benar dan dapat dipertanggungjawabkan. Apabila di kemudian hari ditemukan data yang tidak sesuai, saya bersedia menerima sanksi sesuai ketentuan yang berlaku.
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={24} />
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
