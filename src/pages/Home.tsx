import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Building2, Trophy, ChevronRight, Calendar, FileText, CheckCircle, Clock, Upload } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';

// Komponen foto bergerak naik-turun
function AnimatedImage({ src, alt, delay = 0 }: { src: string; alt: string; delay?: number }) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [0, -15, 0] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay
      }}
      className="overflow-hidden rounded-2xl shadow-lg"
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
      />
    </motion.div>
  );
}

export default function Home() {
  const { settings } = useSettings();

  // Daftar foto yang akan ditampilkan (ganti dengan URL foto Anda)
  const galleryImages = [
    {
      src: '/images/image1.jpg',
      alt: 'Kepala Sekolah SMAN 4 Pagar Alam',
      delay: 0
    },
    {
      src: '/images/image2.jpg',
      alt: 'Guru dan Staf SMAN 4 Pagar Alam',
      delay: 0.5
    },
    {
      src: '/images/image3.jpg',
      alt: 'Siswa SMAN 4 Pagar Alam',
      delay: 1
    },
    {
      src: '/images/image4.jpg',
      alt: 'Kegiatan Sekolah SMAN 4 Pagar Alam',
      delay: 1.5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className={cn(
        "relative overflow-hidden py-20 lg:py-32",
        "bg-gradient-to-br from-blue-50 via-white to-blue-50"
      )}>
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4">
                <Calendar size={14} />
                Pendaftaran PPDB 2026 Telah Dibuka
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Membangun Generasi
                <span className="text-blue-600 block">Cerdas & Berkarakter</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
                Bergabunglah bersama SMAN 4 PAGAR ALAM. Kami berkomitmen memberikan pendidikan terbaik
                dengan fasilitas modern dan tenaga pendidik profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/daftar"
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Daftar Sekarang
                  <ChevronRight size={18} />
                </Link>
                <Link
                  to="/cek-kelulusan"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-xl font-semibold border border-slate-200 transition-all shadow-sm"
                >
                  Cek Kelulusan
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Galeri Foto Bergerak - 4 Kolom */}
          <div className="mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-10"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Galeri Sekolah</h2>
              <p className="text-slate-500">Momen kebersamaan dan prestasi SMAN 4 Pagar Alam</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {galleryImages.map((image, index) => (
                <AnimatedImage
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  delay={image.delay}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Keunggulan Sekolah</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Berbagai fasilitas dan program unggulan untuk mendukung perkembangan siswa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-blue-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen size={32} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Kurikulum Modern</h3>
              <p className="text-slate-600">
                Menerapkan kurikulum merdeka belajar yang adaptif dengan perkembangan zaman dan teknologi.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-green-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Guru Profesional</h3>
              <p className="text-slate-600">
                Dididik oleh tenaga pengajar tersertifikasi, berpengalaman, dan berdedikasi tinggi pada pendidikan.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-purple-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 size={32} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Fasilitas Lengkap</h3>
              <p className="text-slate-600">
                Ruang kelas nyaman, perpustakaan digital, lab komputer, dan fasilitas olahraga yang memadai.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Registration Steps */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Alur Pendaftaran PPDB</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Ikuti langkah-langkah mudah berikut untuk mendaftarkan putra/putri Anda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: "Isi Formulir", desc: "Lengkapi data diri calon siswa dan orang tua secara online.", step: "01" },
              { icon: Upload, title: "Upload Berkas", desc: "Unggah dokumen persyaratan (Foto, KK, Akta Kelahiran).", step: "02" },
              { icon: CheckCircle, title: "Verifikasi", desc: "Panitia akan memverifikasi data dan dokumen yang diunggah.", step: "03" },
              { icon: Clock, title: "Pengumuman", desc: "Cek status kelulusan dan cetak bukti pendaftaran.", step: "04" },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="absolute -top-3 left-6 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                  <step.icon size={28} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
