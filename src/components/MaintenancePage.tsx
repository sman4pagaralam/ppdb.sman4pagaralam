import React from 'react';
import { motion } from 'motion/react';
import { Wrench, Clock, Mail, Phone, Building2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function MaintenancePage() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Wrench size={48} className="text-blue-600" />
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          🔧 Website Sedang Dalam Pemeliharaan
        </h1>
        
        <p className="text-slate-600 mb-6">
          Mohon maaf, website <strong>{settings?.namaSekolah || 'SMAN 4 Pagar Alam'}</strong> sedang dalam perbaikan 
          untuk memberikan layanan yang lebih baik. Kami akan segera kembali!
        </p>

        <div className="flex items-center justify-center gap-2 text-blue-600 mb-8">
          <Clock size={20} />
          <span className="font-medium">Estimasi selesai: Segera</span>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500 mb-3">Butuh bantuan? Hubungi kami:</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={`mailto:${settings?.email || 'info@sman4pagaralam.sch.id'}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Mail size={18} />
              {settings?.email || 'info@sman4pagaralam.sch.id'}
            </a>
            <a 
              href={`tel:${settings?.telepon || '(0711) 123456'}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Phone size={18} />
              {settings?.telepon || '(0711) 123456'}
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            {settings?.alamat || 'Jl. Pendidikan No. 123, Pagar Alam'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
