/**
 * Google Apps Script Backend for PPDB SD
 * Deploy as a Web App:
 * 1. Click "Deploy" -> "New deployment"
 * 2. Select type: "Web app"
 * 3. Execute as: "Me"
 * 4. Who has access: "Anyone"
 * 5. Click "Deploy" and copy the Web App URL.
 */

const SHEET_NAME = "Data Pendaftar";
const ADMIN_SHEET_NAME = "Admin";
const SETTINGS_SHEET_NAME = "Pengaturan";
const FOLDER_NAME = "PPDB SD";

const DEFAULT_FORM_FIELDS = [
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
];

const DEFAULT_SETTINGS = {
  namaSekolah: "SDN Harapan Bangsa",
  alamat: "Jl. Pendidikan No. 123, Kota Pelajar, Indonesia 12345",
  telepon: "(021) 1234-5678",
  email: "info@sdnharapanbangsa.sch.id",
  deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas.",
  statusPendaftaran: "Buka",
  formFields: JSON.stringify(DEFAULT_FORM_FIELDS)
};

// Helper function untuk menambahkan CORS headers
function addCORSHeaders(response) {
  return response
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

// Fungsi untuk mengirim response dengan CORS
function sendJSONResponse(data) {
  return addCORSHeaders(ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON));
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Data Pendaftar Sheet
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ["Timestamp", "No Pendaftaran", "Status"];
    DEFAULT_FORM_FIELDS.forEach(f => headers.push(f.id));
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
    sheet.setFrozenRows(1);
  }

  // Setup Admin Sheet
  let adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(ADMIN_SHEET_NAME);
    adminSheet.appendRow(["Username", "Password"]);
    adminSheet.appendRow(["admin", "admin123"]);
    adminSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // Setup Settings Sheet
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    settingsSheet.appendRow(["Key", "Value"]);
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      settingsSheet.appendRow([key, DEFAULT_SETTINGS[key]]);
    });
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // Setup Drive Folder
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(FOLDER_NAME);
  }
  
  return sendJSONResponse({ status: "success", message: "Setup completed" });
}

function doPost(e) {
  try {
    // Handle preflight OPTIONS request
    if (e && e.method === 'OPTIONS') {
      return doOptions();
    }
    
    const data = JSON.parse(e.postData.contents);
    
    let result;
    if (data.action === "login") result = handleLogin(data.username, data.password);
    else if (data.action === "checkStatus") result = handleCheckStatus(data.noPendaftaran);
    else if (data.action === "updateStatus") result = updateStatus(data.noPendaftaran, data.newStatus);
    else if (data.action === "updateSettings") result = handleUpdateSettings(data.settings);
    else result = handleRegistration(data);
    
    return sendJSONResponse(result);
    
  } catch (error) {
    return sendJSONResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function doGet(e) {
  try {
    // Handle preflight OPTIONS request
    if (e && e.method === 'OPTIONS') {
      return doOptions();
    }
    
    if (e && e.parameter && e.parameter.action === "getSettings") {
      const settings = handleGetSettings();
      return sendJSONResponse(settings);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return sendJSONResponse({
        status: "error",
        message: "Sheet not found"
      });
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        if (row[index] instanceof Date) {
          obj[header] = row[index].toISOString();
        } else {
          obj[header] = row[index];
        }
      });
      return obj;
    });
    
    result.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    return sendJSONResponse({
      status: "success",
      data: result
    });
    
  } catch (error) {
    return sendJSONResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function handleGetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    return {
      status: "success",
      data: DEFAULT_SETTINGS
    };
  }

  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    let value = data[i][1];
    // Parse JSON jika diperlukan
    if (data[i][0] === "formFields" && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch(e) {}
    }
    settings[data[i][0]] = value;
  }

  return {
    status: "success",
    data: settings
  };
}

function handleUpdateSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error("Settings sheet not found");

  const data = sheet.getDataRange().getValues();
  
  Object.keys(newSettings).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        let value = newSettings[key];
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        sheet.getRange(i + 1, 2).setValue(value);
        found = true;
        break;
      }
    }
    if (!found) {
      let value = newSettings[key];
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      sheet.appendRow([key, value]);
    }
  });

  return {
    status: "success",
    message: "Pengaturan berhasil disimpan"
  };
}

function handleRegistration(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Check if registration is open
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  let isOpen = true;
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === "statusPendaftaran" && settingsData[i][1] === "Tutup") {
        isOpen = false;
        break;
      }
    }
  }

  if (!isOpen) {
    return {
      status: "error",
      message: "Pendaftaran sedang ditutup."
    };
  }

  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Generate No Pendaftaran
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  let nextId = 1;
  if (lastRow > 1) {
    const noRegIdx = headers.indexOf("No Pendaftaran");
    if (noRegIdx !== -1) {
      const lastNo = sheet.getRange(lastRow, noRegIdx + 1).getValue();
      const parts = String(lastNo).split("-");
      if (parts.length === 3) {
        nextId = parseInt(parts[2], 10) + 1;
      }
    }
  }
  const noPendaftaran = `PPDB-${year}-${String(nextId).padStart(3, '0')}`;
  
  const folder = getOrCreateFolder(FOLDER_NAME);
  const rowData = new Array(headers.length).fill("");
  
  headers.forEach((header, index) => {
    if (header === "Timestamp") rowData[index] = new Date();
    else if (header === "No Pendaftaran") rowData[index] = noPendaftaran;
    else if (header === "Status") rowData[index] = "Proses";
    else if (data[header] !== undefined) {
      let value = data[header];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${header}`, folder);
      }
      rowData[index] = value;
    }
  });

  Object.keys(data).forEach(key => {
    if (key !== "action" && !headers.includes(key)) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
      
      let value = data[key];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${key}`, folder);
      }
      rowData.push(value);
    }
  });
  
  sheet.appendRow(rowData);
  
  return {
    status: "success",
    message: "Pendaftaran berhasil",
    noPendaftaran: noPendaftaran
  };
}

function handleLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!sheet) throw new Error("Sheet Admin tidak ditemukan");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return { status: "success", message: "Login berhasil" };
    }
  }
  return { status: "error", message: "Username atau password salah" };
}

function handleCheckStatus(noPendaftaran) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Database belum siap");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const statusIdx = headers.indexOf("Status");

  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      return {
        status: "success",
        data: {
          noPendaftaran: data[i][noRegIdx],
          status: statusIdx !== -1 ? data[i][statusIdx] : "Proses"
        }
      };
    }
  }
  return { status: "error", message: "Nomor pendaftaran tidak ditemukan" };
}

function updateStatus(noPendaftaran, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const statusIdx = headers.indexOf("Status");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
      return { status: "success", message: "Status berhasil diupdate" };
    }
  }
  return { status: "error", message: "Data tidak ditemukan" };
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function uploadFile(base64Data, filename, folder) {
  if (!base64Data) return "";
  try {
    const splitBase = base64Data.split(',');
    const type = splitBase[0].split(';')[0].replace('data:', '');
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const blob = Utilities.newBlob(byteCharacters, type, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error uploading file: " + e.toString();
  }
}

function doOptions(e) {
  return addCORSHeaders(ContentService.createTextOutput(""))
    .setMimeType(ContentService.MimeType.TEXT);
}
