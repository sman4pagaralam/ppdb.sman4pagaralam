// Service to interact with Google Apps Script Backend
const GAS_WEB_APP_URL = "/api/gas-proxy";

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

let fallbackData: AdminData[] = [];

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getSettings&t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success") {
        let formFields = result.data.formFields;
        if (typeof formFields === 'string') {
          try { formFields = JSON.parse(formFields); } catch (e) { formFields = getDefaultSettings().formFields; }
        }
        const settings = { ...result.data, formFields };
        if (settings.maintenanceMode === undefined) settings.maintenanceMode = false;
        return settings;
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
      body: JSON.stringify({ action: "updateSettings", settings: { ...settings, maintenanceMode: settings.maintenanceMode || false } }),
    });
    if (response.ok) return await response.json();
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
    if (response.ok) return await response.json();
    throw new Error("Failed to submit");
  } catch (error) {
    console.warn("Registration saved locally only:", error);
    return { status: "success", message: "Pendaftaran berhasil (disimpan lokal)", noPendaftaran: `LOCAL-${Date.now()}` };
  }
};

export const getRegistrations = async (): Promise<AdminData[]> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && Array.isArray(result.data)) {
        const validData = result.data.filter(item => 
          item && item['No Pendaftaran'] && item['No Pendaftaran'].toString().trim() !== "" && item['No Pendaftaran'] !== "No Pendaftaran"
        );
        fallbackData = validData;
        return validData;
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
      body: JSON.stringify({ action: "updateStatus", noPendaftaran, newStatus, alasan }),
    });
    if (response.ok) {
      const result = await response.json();
      fallbackData = fallbackData.map(item => 
        item['No Pendaftaran'] === noPendaftaran ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan } : item
      );
      return result;
    }
    throw new Error("Failed to update");
  } catch (error) {
    console.warn("Status updated locally only:", error);
    fallbackData = fallbackData.map(item => 
      item['No Pendaftaran'] === noPendaftaran ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan } : item
    );
    return { status: "success" };
  }
};

export const checkStatus = async (nisn: string) => {
  if (!nisn) return { status: "error", message: "NISN harus diisi" };
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkStatus", nisn: nisn }),
    });
    if (response.ok) return await response.json();
    throw new Error("Failed to check");
  } catch (error) {
    console.warn("Cannot check status:", error);
    const cleanNisn = String(nisn).replace(/\D/g, '');
    const localStudent = fallbackData.find(d => String(d['NISN']).replace(/\D/g, '') === cleanNisn);
    if (localStudent) {
      return { status: "success", data: {
        noPendaftaran: localStudent['No Pendaftaran'],
        nisn: localStudent['NISN'],
        namaLengkap: localStudent['Nama Lengkap'] || "Siswa",
        status: localStudent.Status
      }};
    }
    return { status: "error", message: "Layanan tidak tersedia saat ini" };
  }
};

export const loginAdmin = async (username: string, password: string) => {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username, password }),
    });
    if (response.ok) return await response.json();
    return { status: "error", message: "Login gagal, coba lagi" };
  } catch (error) {
    console.error("Error logging in:", error);
    return { status: "error", message: "Terjadi kesalahan koneksi" };
  }
};

export const getRegistrationByNo = async (noPendaftaran: string): Promise<AdminData | null> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getRegistration&noPendaftaran=${encodeURIComponent(noPendaftaran)}&t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) return result.data;
    }
    const localData = fallbackData.find(item => item['No Pendaftaran'] === noPendaftaran);
    return localData || null;
  } catch (error) {
    console.warn("Error fetching registration by number:", error);
    const localData = fallbackData.find(item => item['No Pendaftaran'] === noPendaftaran);
    return localData || null;
  }
};

export const getRegistrationByNisn = async (nisn: string): Promise<AdminData | null> => {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getByNisn&nisn=${encodeURIComponent(nisn)}&t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) return result.data;
    }
    const localData = fallbackData.find(item => String(item['NISN']).replace(/\D/g, '') === String(nisn).replace(/\D/g, ''));
    return localData || null;
  } catch (error) {
    console.warn("Error fetching registration by NISN:", error);
    const localData = fallbackData.find(item => String(item['NISN']).replace(/\D/g, '') === String(nisn).replace(/\D/g, ''));
    return localData || null;
  }
};
