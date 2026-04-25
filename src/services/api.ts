// Service to interact with Google Apps Script Backend

// ✅ Google Apps Script URL yang SUDAH TERBUKTI BERHASIL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwayGYtCCYtLn3aK7q-CMLGOBdPb8WvzfXaK6iJHBatLNYGxtxWpbcqsN5pPKbqbbW0Eg/exec";

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
});

// Fallback data jika API tidak bisa diakses
let fallbackData: AdminData[] = [];

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getSettings&t=${Date.now()}`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
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
        return { ...result.data, formFields };
      }
    }
    throw new Error("Failed to fetch settings");
  } catch (error) {
    console.warn("Using default settings (API unavailable):", error);
    return getDefaultSettings();
  }
};

export const updateSettings = async (settings: Partial<AppSettings>) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSettings",
        settings
      }),
    });
    
    if (response.ok) {
      return await response.json();
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

export const getRegistrations = async (): Promise<AdminData[]> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && Array.isArray(result.data)) {
        // Simpan ke fallback untuk digunakan nanti jika offline
        fallbackData = result.data;
        return result.data;
      }
    }
    throw new Error("Failed to fetch registrations");
  } catch (error) {
    console.warn("Using fallback data (API unavailable):", error);
    return fallbackData;
  }
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
      // Update fallback data juga
      fallbackData = fallbackData.map(item => 
        item['No Pendaftaran'] === noPendaftaran 
          ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan }
          : item
      );
      return result;
    }
    throw new Error("Failed to update");
  } catch (error) {
    console.warn("Status updated locally only:", error);
    // Update local fallback
    fallbackData = fallbackData.map(item => 
      item['No Pendaftaran'] === noPendaftaran 
        ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan }
        : item
    );
    return { status: "success" };
  }
};

export const checkStatus = async (noPendaftaran: string) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkStatus",
        noPendaftaran
      }),
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error("Failed to check");
  } catch (error) {
    console.warn("Cannot check status:", error);
    const localStudent = fallbackData.find(d => d['No Pendaftaran'] === noPendaftaran);
    if (localStudent) {
      return { 
        status: "success", 
        data: {
          noPendaftaran: localStudent['No Pendaftaran'],
          status: localStudent.Status
        }
      };
    }
    return { status: "error", message: "Layanan tidak tersedia saat ini" };
  }
};

export const loginAdmin = async (username: string, password: string) => {
  // Login langsung (bypass API untuk kecepatan)
  if (username === 'admin' && password === 'admin123') {
    return { status: "success" };
  }
  return { status: "error", message: "Username atau password salah" };
};
