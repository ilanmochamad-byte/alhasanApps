import type { GantiPasswordResponse, ProfilIsian, ProfilPribadi } from '@/api/types';
import { request, requestImage, requestMultipart } from './client';

/** Berkas pilihan pemilih sistem; `file` hanya ada di web. */
export type FotoTerpilih = { uri: string; nama: string; mime: string; file?: Blob };

// PRD-PROFIL-IMPORT Fase 2: klien kontrak Fase 1. Tidak ada parameter pemilik
// pada endpoint mana pun — server memakai akun pemilik token, dan kunci di
// luar isian pribadi (username, peran, penugasan, …) ditolak 422.
export const profil = {
  pribadi: () => request<ProfilPribadi>('/profile/pribadi'),
  ubah: (isian: Partial<Record<ProfilIsian, string>>, versi: number) =>
    request<ProfilPribadi>('/profile/pribadi', { method: 'POST', body: { ...isian, versi } }),
  unggahFoto(foto: FotoTerpilih) {
    const form = new FormData();
    if (foto.file) form.append('foto', foto.file, foto.nama);
    // React Native mengirim berkas lokal dari objek { uri, name, type }.
    else form.append('foto', { uri: foto.uri, name: foto.nama, type: foto.mime } as unknown as Blob);
    return requestMultipart<ProfilPribadi>('/profile/foto', form);
  },
  hapusFoto: () => request<ProfilPribadi>('/profile/foto/hapus', { method: 'POST', body: {} }),
  foto: () => requestImage('/profile/foto'),
  gantiPassword: (body: { password_saat_ini: string; password_baru: string; konfirmasi_password: string; device_id?: string }) =>
    request<GantiPasswordResponse>('/profile/password', { method: 'POST', body }),
};
