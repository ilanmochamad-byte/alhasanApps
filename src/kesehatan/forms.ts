import type { IsianKunjungan, Kunjungan, Perubahan, SantriPilihan, Sumber } from '../api/kesehatan';

// Bentuk isian formulir kesehatan. Hak, cakupan, versi, dan validasi isi
// tetap milik server; berkas ini hanya menyiapkan bentuk kiriman yang sama
// dengan formulir web (keadaan LENGKAP pada koreksi: rincian lama ber-`id`,
// rincian baru tanpa `id`, rincian lama yang dihapus tidak dikirim).

export type DrafKunjungan = IsianKunjungan & { santri_id: number | null; santri_nama: string; waktu_asli: string | null };

function duaDigit(n: number) { return String(n).padStart(2, '0'); }

/** `YYYY-MM-DDTHH:mm` waktu lokal perangkat. */
export function waktuLokal(date = new Date()): string {
  return `${date.getFullYear()}-${duaDigit(date.getMonth() + 1)}-${duaDigit(date.getDate())}T${duaDigit(date.getHours())}:${duaDigit(date.getMinutes())}`;
}

export function drafKosong(now = new Date()): DrafKunjungan {
  return { santri_id: null, santri_nama: '', waktu_asli: null, waktu_kunjungan: waktuLokal(now), keluhan: '', catatan_klinis: '', tindakan: '', status: 'Tercatat', obat: [], rujukan: [], tindak_lanjut: [] };
}

/** Draf koreksi dari rincian versi kepala yang sedang dilihat. */
export function drafDariKunjungan(k: Kunjungan): DrafKunjungan {
  return {
    santri_id: k.santri.id, santri_nama: k.santri.nama, waktu_asli: k.waktu_kunjungan,
    waktu_kunjungan: k.waktu_kunjungan.slice(0, 16).replace(' ', 'T'),
    keluhan: k.keluhan, catatan_klinis: k.catatan_klinis ?? '', tindakan: k.tindakan ?? '', status: '',
    obat: k.obat.map(o => ({ id: o.id ?? undefined, nama_obat: o.nama_obat, jumlah: o.jumlah ?? '', satuan: o.satuan ?? '', petunjuk: o.petunjuk ?? '', waktu_pemberian: o.waktu_pemberian })),
    rujukan: k.rujukan.map(r => ({ id: r.id ?? undefined, tujuan: r.tujuan, tanggal_rujukan: r.tanggal_rujukan, alasan: r.alasan ?? '', hasil: r.hasil ?? '', tanggal_hasil: r.tanggal_hasil ?? '' })),
    tindak_lanjut: k.tindak_lanjut.map(t => ({ id: t.id ?? undefined, uraian: t.uraian, tanggal_target: t.tanggal_target ?? '', status: t.status, tanggal_selesai: t.tanggal_selesai ?? '' })),
  };
}

const terisi = (...nilai: string[]) => nilai.some(v => v.trim() !== '');

/**
 * Isian yang dikirim. Baris BARU yang seluruhnya kosong diabaikan (sama
 * dengan web); baris lama tetap dikirim agar tidak dibatalkan diam-diam.
 * Waktu kunjungan yang tidak diubah dikirim persis seperti dari server.
 */
export function payloadKunjungan(d: DrafKunjungan): IsianKunjungan {
  const waktu = d.waktu_asli !== null && d.waktu_asli.slice(0, 16).replace(' ', 'T') === d.waktu_kunjungan ? d.waktu_asli : d.waktu_kunjungan;
  return {
    waktu_kunjungan: waktu, keluhan: d.keluhan, catatan_klinis: d.catatan_klinis, tindakan: d.tindakan, status: d.status,
    obat: d.obat.filter(o => o.id !== undefined || terisi(o.nama_obat, o.jumlah, o.satuan, o.petunjuk)),
    rujukan: d.rujukan.filter(r => r.id !== undefined || terisi(r.tujuan, r.alasan, r.hasil)),
    tindak_lanjut: d.tindak_lanjut.filter(t => t.id !== undefined || terisi(t.uraian)),
  };
}

/** Sidik jari isian untuk penjaga mutasi (kunci idempotensi tetap selama isi sama). */
export function sidikJari(...bagian: unknown[]): string { return JSON.stringify(bagian); }

export function wajibAlasan(alasan: string, minimal = 5): string | null {
  const t = alasan.trim();
  if (t.length < minimal) return `Alasan wajib diisi, minimal ${minimal} karakter.`;
  if (t.length > 1000) return 'Alasan maksimal 1000 karakter.';
  return null;
}

export function labelSumber(sumber: Sumber | null): string {
  switch (sumber) {
    case 'petugas': return 'Petugas kesehatan';
    case 'admin': return 'Admin — hanya membaca dan mengaudit';
    case 'admin_petugas': return 'Admin — hanya membaca (akun admin tidak menulis isi klinis)';
    case 'pembimbing': return 'Pembimbing — membaca santri binaan';
    case 'murobi': return 'Murobi — membaca santri binaan';
    case 'pembimbing_murobi': return 'Pembimbing dan murobi — membaca santri binaan';
    default: return 'Tanpa akses';
  }
}

const LABEL_KOLOM: Record<string, string> = {
  status: 'Status', waktu_kunjungan: 'Waktu kunjungan', keluhan: 'Keluhan', catatan_klinis: 'Catatan klinis', tindakan: 'Tindakan',
  nama_obat: 'Nama obat', jumlah: 'Jumlah', satuan: 'Satuan', petunjuk: 'Petunjuk', waktu_pemberian: 'Waktu pemberian',
  tujuan: 'Tujuan', tanggal_rujukan: 'Tanggal rujukan', alasan: 'Alasan', hasil: 'Hasil', tanggal_hasil: 'Tanggal hasil',
  uraian: 'Uraian', tanggal_target: 'Target', tanggal_selesai: 'Tanggal selesai',
};
const LABEL_BAGIAN: Record<string, string> = { kunjungan: 'Kunjungan', obat: 'Obat', rujukan: 'Rujukan', tindak_lanjut: 'Tindak lanjut' };

function nilaiTeks(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') {
    const r = v as Record<string, unknown>;
    return String(r.nama_obat ?? r.tujuan ?? r.uraian ?? '—');
  }
  return String(v);
}

/** Satu baris perubahan sebelum–sesudah, seperti halaman riwayat versi web. */
export function teksPerubahan(p: Perubahan): string {
  const bagian = LABEL_BAGIAN[p.bagian] ?? p.bagian;
  if (p.jenis === 'tambah') return `${bagian} ditambahkan: ${nilaiTeks(p.sesudah)}`;
  if (p.jenis === 'hapus') return `${bagian} dihapus: ${nilaiTeks(p.sebelum)}`;
  return `${bagian} · ${LABEL_KOLOM[p.kolom ?? ''] ?? p.kolom}: ${nilaiTeks(p.sebelum)} → ${nilaiTeks(p.sesudah)}`;
}

/** Deep-link skema aplikasi ke ringkasan wali; ID hanya penunjuk, server memeriksa ulang. */
export function kesehatanLinkTarget(url: string | null): number | null {
  if (!url) return null;
  try {
    const link = new URL(url);
    if (link.protocol !== 'alhasanapps:') return null;
    const path = `${link.hostname}${link.pathname}`.replace(/^\/+/, '');
    const match = /^kesehatan\/wali\/(\d+)\/?$/.exec(path);
    const id = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}

/**
 * Kelompok kelas untuk hasil pencarian santri, mengikuti urutan server
 * (kelas berurut nama, lalu yang belum ditempatkan di kelas paling akhir).
 */
export function kelompokKelas(rows: SantriPilihan[]): [string, SantriPilihan[]][] {
  const grup = new Map<string, SantriPilihan[]>();
  for (const s of rows) {
    const nama = s.kelas ? s.kelas.nama : 'Belum ditempatkan di kelas';
    grup.set(nama, [...(grup.get(nama) ?? []), s]);
  }
  const tanpa = grup.get('Belum ditempatkan di kelas');
  grup.delete('Belum ditempatkan di kelas');
  return [...grup.entries(), ...(tanpa ? [['Belum ditempatkan di kelas', tanpa] as [string, SantriPilihan[]]] : [])];
}
