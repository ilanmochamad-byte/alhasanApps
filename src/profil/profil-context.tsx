import { createContext, type PropsWithChildren, use, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, actionableError } from '@/api/client';
import { profil as profilApi } from '@/api/profil';
import type { ProfilPribadi } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { base64 } from '@/profil/format';

/**
 * - `memuat`: belum ada data untuk akun ini.
 * - `siap`: data server tersedia (mungkin sedang disegarkan di belakang).
 * - `gagal`: pemuatan terakhir gagal; data lama (bila ada) tetap ditampilkan.
 * - `tidak_tersedia`: server belum memasang profil pribadi (404 endpoint lama /
 *   503 migrasi 035 belum ada) — Beranda/Profil memakai tampilan lama.
 */
export type StatusProfil = 'memuat' | 'siap' | 'gagal' | 'tidak_tersedia';

type ProfilContextValue = {
  data: ProfilPribadi | null;
  status: StatusProfil;
  error: string | null;
  /** `data:` URI foto pemilik, atau null (tanpa foto / gagal dimuat → inisial). */
  fotoUri: string | null;
  fotoGagal: boolean;
  muat: () => Promise<void>;
  /** Menerapkan respons mutasi (ubah data/foto) tanpa memuat ulang. */
  terapkan: (data: ProfilPribadi) => void;
};

const ProfilContext = createContext<ProfilContextValue | null>(null);

type Keadaan = { userId: number | null; data: ProfilPribadi | null; status: StatusProfil; error: string | null };
type Foto = { userId: number | null; versi: number; uri: string | null; gagal: boolean };

/**
 * Satu sumber profil pribadi untuk kartu Beranda, tab Profil, dan Edit Profil
 * (PRD-PROFIL-IMPORT Fase 2) sehingga perubahan tampil di semua layar tanpa
 * masuk ulang. Data selalu milik akun yang sedang masuk: keadaan diikat ke
 * `profile.id` dan dibuang saat keluar atau saat sesi wajib ganti password.
 */
export function ProfilProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [keadaan, setKeadaan] = useState<Keadaan>({ userId: null, data: null, status: 'memuat', error: null });
  const [foto, setFoto] = useState<Foto>({ userId: null, versi: 0, uri: null, gagal: false });
  const generasi = useRef(0);
  const pemilik = useRef<number | null>(null);
  useEffect(() => { pemilik.current = userId; generasi.current += 1; }, [userId]);

  const muat = useCallback(async () => {
    const akun = pemilik.current;
    if (akun === null) return;
    const epoch = ++generasi.current;
    setKeadaan((kini) => (kini.userId === akun ? { ...kini, error: null } : { userId: akun, data: null, status: 'memuat', error: null }));
    try {
      const data = await profilApi.pribadi();
      // Respons milik akun lain atau permintaan yang sudah usang diabaikan.
      if (epoch !== generasi.current || pemilik.current !== akun || data.akun.id !== akun) return;
      setKeadaan({ userId: akun, data, status: 'siap', error: null });
    } catch (e) {
      if (epoch !== generasi.current || pemilik.current !== akun) return;
      if (e instanceof ApiError && (e.status === 404 || e.status === 503)) {
        setKeadaan({ userId: akun, data: null, status: 'tidak_tersedia', error: null });
        return;
      }
      setKeadaan((kini) => ({
        userId: akun,
        data: kini.userId === akun ? kini.data : null,
        status: kini.userId === akun && kini.data ? 'siap' : 'gagal',
        error: actionableError(e),
      }));
    }
  }, []);

  const terapkan = useCallback((data: ProfilPribadi) => {
    if (pemilik.current === null || data.akun.id !== pemilik.current) return;
    generasi.current += 1;
    setKeadaan({ userId: pemilik.current, data, status: 'siap', error: null });
  }, []);

  // Kembali ke aplikasi → segarkan (penugasan yang dicabut hilang).
  useEffect(() => {
    if (userId === null) return;
    void muat();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void muat(); });
    return () => sub.remove();
  }, [userId, muat]);

  const data = keadaan.userId === userId ? keadaan.data : null;
  const fotoVersi = data?.foto.ada ? data.foto.versi : 0;
  useEffect(() => {
    if (userId === null || fotoVersi === 0) return;
    let aktif = true;
    void (async () => {
      try {
        const berkas = await profilApi.foto();
        if (aktif) setFoto({ userId, versi: fotoVersi, uri: `data:${berkas.mime};base64,${base64(berkas.bytes)}`, gagal: false });
      } catch {
        if (aktif) setFoto({ userId, versi: fotoVersi, uri: null, gagal: true });
      }
    })();
    return () => { aktif = false; };
  }, [userId, fotoVersi]);

  const fotoBerlaku = foto.userId === userId && foto.versi === fotoVersi && fotoVersi !== 0;
  const value: ProfilContextValue = {
    data,
    status: userId === null ? 'memuat' : keadaan.userId === userId ? keadaan.status : 'memuat',
    error: keadaan.userId === userId ? keadaan.error : null,
    fotoUri: fotoBerlaku ? foto.uri : null,
    fotoGagal: fotoBerlaku && foto.gagal,
    muat,
    terapkan,
  };
  return <ProfilContext.Provider value={value}>{children}</ProfilContext.Provider>;
}

export function useProfil() {
  const context = use(ProfilContext);
  if (!context) throw new Error('useProfil harus digunakan di dalam ProfilProvider.');
  return context;
}
