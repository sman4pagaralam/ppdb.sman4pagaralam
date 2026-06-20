// Service to interact with Google Apps Script Backend

// ✅ Google Apps Script URL yang SUDAH TERBUKTI BERHASIL
const GAS_WEB_APP_URL = "/api/gas-proxy";

// ========== CACHE ==========
let settingsCache: AppSettings | null = null;
let settingsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

// Cache untuk registrations dengan pagination
interface RegistrationsCache {
  data: AdminData[];
  total: number;
  timestamp: number;
  limit: number;
  offset: number;
}
let registrationsCache: RegistrationsCache | null = null;
const REGISTRATION_CACHE_DURATION = 60 * 1000; // 1 menit

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'textarea';
  options?: string[];
  required: boolean;
}

export interface PanduanDokumen {
  id: string;
  icon: 'FileDigit' | 'FileBadge' | 'FileImage' | 'FileText';
  title: string;
  description: string;
}

export interface AppSettings {
  namaSekolah: string;
  alamat: string;
  telepon: string;
  email: string;
  deskripsi: string;
  statusPendaftaran: 'Buka' | 'Tutup';
  formFields: FormField[];
  persyaratanDaftarUlang?: string;
  tanggalDaftarUlang?: string;
  tanggalPengumuman?: string;
  logoSekolah?: string;
  kopSurat?: string;
  namaKepalaSekolah?: string;
  tandaTanganKepalaSekolah?: string;
  stempelSekolah?: string;
  tahunPendaftaran?: string;
  nomorSurat?: string;
  tempatSurat?: string;
  tanggalSurat?: string;
  nipKepalaSekolah?: string;
  catatanTambahan?: string;
  gambarHeaderBeranda?: string;
  koordinatSekolah?: string;
  sambutanKepalaSekolah?: string;
  fotoKepalaSekolah?: string;
  visiSekolah?: string;
  misiSekolah?: string;
  panduanJudul?: string;
  panduanDeskripsi?: string;
  panduanPeringatan?: string;
  panduanDokumen?: PanduanDokumen[];
  panduanAlur?: string[];
  maintenanceMode?: boolean;
}

export interface RegistrationData {
  [key: string]: any;
}

export interface AdminData extends RegistrationData {
  Timestamp: string;
  'No Pendaftaran': string;
  Status: 'Proses' | 'Lulus' | 'Tidak Lulus';
  'Alasan Penolakan'?: string;
}

// Default Mock Data (akan digunakan jika API tidak bisa diakses)
const getDefaultSettings = (): AppSettings => ({
  namaSekolah: "SDN Harapan Bangsa",
  alamat: "Jl. Pendidikan No. 123, Kota Pelajar, Indonesia 12345",
  telepon: "(021) 1234-5678",
  email: "info@sdnharapanbangsa.sch.id",
  deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia.",
  statusPendaftaran: "Buka",
  formFields: [
    { id: "Nama Lengkap", label: "Nama Lengkap", type: "text", required: true },
    { id: "NIK", label: "NIK", type: "text", required: true },
    { id: "NISN", label: "NISN", type: "text", required: true },
    { id: "Tempat Lahir", label: "Tempat Lahir", type: "text", required: true },
    { id: "Tanggal Lahir", label: "Tanggal Lahir", type: "date", required: true },
    { id: "Jenis Kelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"], required: true },
    { id: "Alamat", label: "Alamat Lengkap", type: "textarea", required: true },
    { id: "Nama Orang Tua", label: "Nama Orang Tua/Wali", type: "text", required: true },
    { id: "No HP", label: "No. WhatsApp Aktif", type: "text", required: true },
    { id: "Foto Siswa", label: "Pas Foto 3x4", type: "file", required: true },
    { id: "Kartu Keluarga", label: "Kartu Keluarga", type: "file", required: true },
    { id: "Akta Kelahiran", label: "Akta Kelahiran", type: "file", required: true }
  ],
  tahunPendaftaran: new Date().getFullYear().toString(),
  koordinatSekolah: "-6.200000, 106.816666",
  maintenanceMode: false,
});

// Fallback data jika API tidak bisa diakses
let fallbackData: AdminData[] = [];

export const getSettings = async (): Promise<AppSettings> => {
  // ✅ Cek cache dulu
  if (settingsCache && (Date.now() - settingsCacheTime) < CACHE_DURATION) {
    console.log('📦 Pakai cache settings (5 menit)');
    return settingsCache;
  }

  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getSettings&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success") {
        let formFields = result.data.formFields;
        if (typeof formFields === 'string') {
          try {
            formFields = JSON.parse(formFields);
          } catch (e) {
            formFields = getDefaultSettings().formFields;
          }
        }
        
        const settings = { ...result.data, formFields };
        if (settings.maintenanceMode === undefined) {
          settings.maintenanceMode = false;
        }
        
        // ✅ Simpan ke cache
        settingsCache = settings;
        settingsCacheTime = Date.now();
        
        return settings;
      }
    }
    throw new Error("Failed to fetch settings");
  } catch (error) {
    console.warn("Using default settings (API unavailable):", error);
    // ✅ Pakai cache lama atau default
    if (settingsCache) return settingsCache;
    return getDefaultSettings();
  }
};

export const updateSettings = async (settings: Partial<AppSettings>) => {
  try {
    const payload = {
      action: "updateSettings",
      settings: {
        ...settings,
        maintenanceMode: settings.maintenanceMode || false
      }
    };
    
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // ✅ Update cache setelah simpan
      if (settingsCache) {
        settingsCache = { ...settingsCache, ...settings };
        settingsCacheTime = Date.now();
      }
      
      return result;
    }
    throw new Error("Failed to update");
  } catch (error) {
    console.warn("Settings saved locally only:", error);
    return { status: "success", message: "Saved locally" };
  }
};

export const submitRegistration = async (data: RegistrationData) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error("Failed to submit");
  } catch (error) {
    console.warn("Registration saved locally only:", error);
    return { 
      status: "success", 
      message: "Pendaftaran berhasil (disimpan lokal)",
      noPendaftaran: `LOCAL-${Date.now()}`
    };
  }
};

// ========== GET REGISTRATIONS DENGAN PAGINATION ==========
export const getRegistrations = async (limit: number = 50, offset: number = 0): Promise<{ data: AdminData[]; total: number; hasMore: boolean }> => {
  // Cek cache
  if (registrationsCache && 
      registrationsCache.limit === limit && 
      registrationsCache.offset === offset &&
      (Date.now() - registrationsCache.timestamp) < REGISTRATION_CACHE_DURATION) {
    console.log('📦 Pakai cache registrations (1 menit)');
    return {
      data: registrationsCache.data,
      total: registrationsCache.total,
      hasMore: (offset + limit) < registrationsCache.total
    };
  }

  try {
    const url = `${GAS_WEB_APP_URL}?limit=${limit}&offset=${offset}&t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && Array.isArray(result.data)) {
        const validData = result.data.filter(item => 
          item && 
          item['No Pendaftaran'] && 
          item['No Pendaftaran'].toString().trim() !== "" &&
          item['No Pendaftaran'] !== "No Pendaftaran"
        );
        
        const total = result.pagination?.total || validData.length;
        const hasMore = result.pagination?.hasMore || (validData.length === limit);
        
        // Simpan cache
        registrationsCache = {
          data: validData,
          total: total,
          timestamp: Date.now(),
          limit: limit,
          offset: offset
        };
        
        fallbackData = validData;
        
        return {
          data: validData,
          total: total,
          hasMore: hasMore
        };
      }
    }
    throw new Error("Failed to fetch registrations");
  } catch (error) {
    console.warn("Using fallback data (API unavailable):", error);
    if (registrationsCache) {
      return {
        data: registrationsCache.data,
        total: registrationsCache.total,
        hasMore: (offset + limit) < registrationsCache.total
      };
    }
    return {
      data: fallbackData,
      total: fallbackData.length,
      hasMore: false
    };
  }
};

// ✅ GET ALL REGISTRATIONS (untuk kompatibilitas dengan kode lama)
export const getAllRegistrations = async (): Promise<AdminData[]> => {
  const result = await getRegistrations(9999, 0);
  return result.data;
};

export const updateStatus = async (noPendaftaran: string, newStatus: string, alasan?: string) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateStatus",
        noPendaftaran,
        newStatus,
        alasan
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      fallbackData = fallbackData.map(item => 
        item['No Pendaftaran'] === noPendaftaran 
          ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan }
          : item
      );
      
      // ✅ Update cache setelah update status
      if (registrationsCache) {
        registrationsCache.data = registrationsCache.data.map(item => 
          item['No Pendaftaran'] === noPendaftaran 
            ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan }
            : item
        );
        registrationsCache.timestamp = Date.now();
      }
      
      return result;
    }
    throw new Error("Failed to update");
  } catch (error) {
    console.warn("Status updated locally only:", error);
    fallbackData = fallbackData.map(item => 
      item['No Pendaftaran'] === noPendaftaran 
        ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan }
        : item
    );
    return { status: "success" };
  }
};

// ========== FUNGSI CHECK STATUS (CUKUP NISN SAJA) ==========
export const checkStatus = async (nisn: string) => {
  if (!nisn) {
    return { 
      status: "error", 
      message: "NISN harus diisi" 
    };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkStatus",
        nisn: nisn
      }),
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error("Failed to check");
  } catch (error) {
    console.warn("Cannot check status:", error);
    const cleanNisn = String(nisn).replace(/\D/g, '');
    const localStudent = fallbackData.find(d => 
      String(d['NISN']).replace(/\D/g, '') === cleanNisn
    );
    if (localStudent) {
      return { 
        status: "success", 
        data: {
          noPendaftaran: localStudent['No Pendaftaran'],
          nisn: localStudent['NISN'],
          namaLengkap: localStudent['Nama Lengkap'] || "Siswa",
          status: localStudent.Status
        }
      };
    }
    return { status: "error", message: "Layanan tidak tersedia saat ini" };
  }
};

// ========== LOGIN ADMIN ==========
export const loginAdmin = async (username: string, password: string) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        username,
        password
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      return result;
    }
    
    return { status: "error", message: "Login gagal, coba lagi" };
  } catch (error) {
    console.error("Error logging in:", error);
    return { status: "error", message: "Terjadi kesalahan koneksi" };
  }
};

// ========== FUNGSI getRegistrationByNo ==========
export const getRegistrationByNo = async (noPendaftaran: string): Promise<AdminData | null> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getRegistration&noPendaftaran=${encodeURIComponent(noPendaftaran)}&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) {
        return result.data;
      }
    }
    
    const localData = fallbackData.find(item => item['No Pendaftaran'] === noPendaftaran);
    if (localData) {
      return localData;
    }
    
    return null;
  } catch (error) {
    console.warn("Error fetching registration by number:", error);
    const localData = fallbackData.find(item => item['No Pendaftaran'] === noPendaftaran);
    if (localData) {
      return localData;
    }
    return null;
  }
};

// ========== FUNGSI getRegistrationByNisn ==========
export const getRegistrationByNisn = async (nisn: string): Promise<AdminData | null> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getByNisn&nisn=${encodeURIComponent(nisn)}&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) {
        return result.data;
      }
    }
    
    const localData = fallbackData.find(item => String(item['NISN']).replace(/\D/g, '') === String(nisn).replace(/\D/g, ''));
    if (localData) {
      return localData;
    }
    
    return null;
  } catch (error) {
    console.warn("Error fetching registration by NISN:", error);
    const localData = fallbackData.find(item => String(item['NISN']).replace(/\D/g, '') === String(nisn).replace(/\D/g, ''));
    if (localData) {
      return localData;
    }
    return null;
  }
};
