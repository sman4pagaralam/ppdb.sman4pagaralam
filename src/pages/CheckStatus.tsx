import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus, getRegistrationByNo } from '../services/api';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

// Fungsi untuk mencetak Bukti Pendaftaran lengkap (semua field + koordinat + jarak) dengan tabel rapi
const printProof = (data: any, settings: any) => {
  if (!data) return;

  const doc = new jsPDF();
  let y = 20;

  // HEADER
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

  // Siapkan data untuk tabel dua kolom
  // Kolom kiri: label dan nilai
  const leftFields = [
    "Nama Lengkap", "NIK", "Tempat Lahir", "Tanggal Lahir",
    "Jenis Kelamin", "Golongan Darah", "Tinggi Badan", "Berat Badan",
    "Alamat Domisili Lengkap", "Nomor WA Aktif"
  ];
  const rightFields = [
    "NISN", "Asal Sekolah", "Jenis Seleksi",
    "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu",
    "Prestasi Akademik", "Prestasi Non Akademik"
  ];

  // Format nilai tanggal
  const formatValue = (field: string, value: any) => {
    if (field === "Tanggal Lahir") return formatDate(value);
    return (value === undefined || value === null || value === "") ? "-" : String(value);
  };

  // Buat baris tabel
  const tableBody = [];
  const maxRows = Math.max(leftFields.length, rightFields.length);
  for (let i = 0; i < maxRows; i++) {
    const leftLabel = leftFields[i] || "";
    const leftValue = leftLabel ? formatValue(leftLabel, data[leftLabel]) : "";
    const rightLabel = rightFields[i] || "";
    const rightValue = rightLabel ? formatValue(rightLabel, data[rightLabel]) : "";
    tableBody.push([`${leftLabel}:`, leftValue, `${rightLabel}:`, rightValue]);
  }

  // Gunakan autoTable untuk tampilan rapi
  (doc as any).autoTable({
    startY: y,
    head: [],
    body: tableBody,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },  // label kiri
      1: { cellWidth: 70 },                     // nilai kiri
      2: { cellWidth: 35, fontStyle: 'bold' },  // label kanan
      3: { cellWidth: 70 },                     // nilai kanan
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  // Dapatkan posisi Y setelah tabel
  let finalY = (doc as any).lastAutoTable.finalY + 5;

  // LOKASI DAN JARAK
  if (data['Koordinat Lokasi'] || data['Jarak ke Sekolah (km)']) {
    doc.setFillColor(200, 200, 200);
    doc.rect(14, finalY - 6, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("LOKASI DAN JARAK", 105, finalY - 1, { align: "center" });
    finalY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (data['Koordinat Lokasi']) {
      doc.setFont("helvetica", "bold");
      doc.text("Koordinat Rumah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(data['Koordinat Lokasi'], 70, finalY);
      finalY += 6;
    }
    if (data['Jarak ke Sekolah (km)']) {
      doc.setFont("helvetica", "bold");
      doc.text("Jarak ke Sekolah:", 20, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`${data['Jarak ke Sekolah (km)']} km`, 70, finalY);
      finalY += 6;
    }
    finalY += 5;
  }

  // STATUS PENDAFTARAN
  doc.setFillColor(200, 200, 200);
  doc.rect(14, finalY - 6, 182, 8, 'F');
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS PENDAFTARAN", 105, finalY - 1, { align: "center" });
  finalY += 10;
  const status = data.Status || 'Proses';
  let statusColor = [255, 193, 7];
  if (status === 'Lulus') statusColor = [40, 167, 69];
  if (status === 'Tidak Lulus') statusColor = [220, 53, 69];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(70, finalY - 5, 70, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(status, 105, finalY, { align: "center" });
  doc.setTextColor(0, 0, 0);
  finalY += 12;

  // FOOTER
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Bukti pendaftaran ini dicetak pada: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
  doc.text("Simpan bukti ini untuk mengecek status kelulusan.", 105, 287, { align: "center" });

  doc.save(`Bukti_Pendaftaran_${data['No Pendaftaran']}.pdf`);
};
