import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ApiError, actionableError } from '@/api/client';
import { kesehatan, type KelasPilihan, type Kunjungan, type SantriPilihan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, Pesan } from '@/components/kesehatan-shared';
import { PrivateField } from '@/components/private-field';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Divider, Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { drafDariKunjungan, drafKosong, kelompokKelas, payloadKunjungan, sidikJari, wajibAlasan, type DrafKunjungan } from '@/kesehatan/forms';

/**
 * Catat kunjungan baru, atau koreksi/lanjutkan draf bila `id` diberikan.
 * Koreksi mengirim keadaan LENGKAP + versi yang sedang dilihat; versi usang
 * dijawab 409 oleh server dan TIDAK dikirim ulang otomatis.
 */
export default function CatatScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const kunjunganId = Number(id) || 0;
  return kunjunganId > 0 ? <Koreksi key={`${profile?.id}:${kunjunganId}`} id={kunjunganId} /> : <Baru key={profile?.id} />;
}

function Baru() {
  const router = useRouter();
  const [draf, setDraf] = useState<DrafKunjungan>(() => drafKosong());
  const guard = useMutationGuard('kesehatan-buat');
  async function simpan(status: 'Draf' | 'Tercatat') {
    if (draf.santri_id === null) { guard.setError('Pilih santri lebih dahulu.'); return; }
    const isian = { ...payloadKunjungan(draf), status };
    const santriId = draf.santri_id;
    const hasil = await guard.run(sidikJari('buat', santriId, isian), key => kesehatan.buat(santriId, isian, key));
    if (hasil) router.replace({ pathname: '/kesehatan/kunjungan/[id]', params: { id: String(hasil.id) } });
  }
  return (
    <Halaman>
      <PemilihSantri draf={draf} setDraf={setDraf} />
      <FormKunjungan draf={draf} setDraf={setDraf} disabled={guard.isBusy} />
      <Pesan text={guard.error} tone="danger" />
      <AppButton label="Simpan sebagai tercatat" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan('Tercatat')} />
      <AppButton label="Simpan sebagai draf" variant="secondary" disabled={guard.isBusy} onPress={() => void simpan('Draf')} />
      <ThemedText type="caption" themeColor="textSecondary">Draf tidak tampil kepada pembimbing, murobi, atau orang tua sampai ditetapkan tercatat.</ThemedText>
    </Halaman>
  );
}

function Koreksi({ id }: { id: number }) {
  const router = useRouter();
  const [draf, setDraf] = useState<DrafKunjungan | null>(null);
  const [alasan, setAlasan] = useState('');
  const bersihkan = useCallback(() => { setDraf(null); setAlasan(''); }, []);
  const fetcher = useCallback(async () => {
    const k = await kesehatan.detail(id);
    if (!k.akses.catat) throw new ApiError('Koreksi hanya untuk petugas kesehatan berpenugasan aktif.', 403, 'FORBIDDEN');
    return k;
  }, [id]);
  // Draf koreksi bertahan di memori saat aplikasi ke latar; dibuang saat layar ditinggalkan.
  const { data: basis, error, load } = usePrivateResource<Kunjungan>(fetcher, bersihkan, true);
  const guard = useMutationGuard('kesehatan-koreksi');
  const aktifDraf = draf ?? (basis ? drafDariKunjungan(basis) : null);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!basis || !aktifDraf) return <LoadingState label="Memuat versi terbaru…" />;
  const tercatat = basis.status === 'Tercatat';
  async function simpan(status: '' | 'Tercatat') {
    if (!aktifDraf || !basis) return;
    const salah = tercatat ? wajibAlasan(alasan) : alasan.trim().length > 1000 ? 'Alasan maksimal 1000 karakter.' : null;
    if (salah) { guard.setError(salah); return; }
    const isian = { ...payloadKunjungan(aktifDraf), status };
    const hasil = await guard.run(sidikJari('koreksi', id, basis.versi, alasan, isian), key => kesehatan.koreksi(id, basis.versi, alasan, isian, key));
    if (hasil) { bersihkan(); router.back(); return; }
  }
  const muatUlang = () => { bersihkan(); guard.reset(); void load(); };
  return (
    <Halaman>
      <ThemedText type="h3">{tercatat ? 'Koreksi catatan' : 'Lanjutkan draf'} · {basis.santri.nama}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">Mengoreksi versi {basis.versi}. Versi sebelumnya tetap tersimpan di riwayat.</ThemedText>
      <FormKunjungan draf={aktifDraf} setDraf={setDraf} disabled={guard.isBusy} />
      <Panel style={{ gap: 10 }}>
        <PrivateField label={tercatat ? 'Alasan koreksi (wajib)' : 'Alasan (opsional untuk draf)'} value={alasan} onChangeText={setAlasan} multiline maxLength={1000} />
      </Panel>
      <Pesan text={guard.error} tone="danger" />
      {guard.error?.includes('Muat ulang') ? (
        <AppButton label="Muat versi terbaru (isian ini dibuang)" variant="danger" onPress={muatUlang} />
      ) : null}
      {tercatat ? (
        <AppButton label="Simpan koreksi" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan('')} />
      ) : (
        <>
          <AppButton label="Tetapkan sebagai tercatat" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan('Tercatat')} />
          <AppButton label="Simpan draf" variant="secondary" disabled={guard.isBusy} onPress={() => void simpan('')} />
        </>
      )}
    </Halaman>
  );
}

/**
 * Pemilih santri dikelompokkan per kelas penempatan aktif (ditetapkan admin),
 * agar daftar tidak memanjang: kelas tampil dulu beserta jumlahnya, santri
 * dimuat saat kelas dibuka. Pencarian nama/NIS juga dikelompokkan per kelas.
 */
function PemilihSantri({ draf, setDraf }: { draf: DrafKunjungan; setDraf: (d: DrafKunjungan) => void }) {
  const [q, setQ] = useState('');
  const [terbuka, setTerbuka] = useState<number | 'tanpa' | null>(null);
  const [isiKelas, setIsiKelas] = useState<{ rows: SantriPilihan[]; total: number } | null>(null);
  const [hasilCari, setHasilCari] = useState<{ rows: SantriPilihan[]; total: number } | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const fetchKelas = useCallback(() => kesehatan.santriKelas(), []);
  const { data: kelas, error: galatKelas } = usePrivateResource<KelasPilihan>(fetchKelas);
  async function jalankan<T>(op: () => Promise<T>, simpan: (v: T) => void) {
    setMemuat(true); setPesan(null);
    try { simpan(await op()); } catch (e) { setPesan(actionableError(e)); } finally { setMemuat(false); }
  }
  function bukaKelas(id: number | 'tanpa') {
    if (terbuka === id) { setTerbuka(null); setIsiKelas(null); return; }
    setTerbuka(id); setIsiKelas(null);
    void jalankan(() => kesehatan.santri('', id), setIsiKelas);
  }
  function cari() {
    if (!q.trim()) { setHasilCari(null); return; }
    void jalankan(() => kesehatan.santri(q.trim()), r => { setHasilCari(r); if (!r.rows.length) setPesan('Tidak ada santri aktif yang cocok.'); });
  }
  const pilih = (s: SantriPilihan) => setDraf({ ...draf, santri_id: s.id, santri_nama: s.kelas ? `${s.nama} · ${s.kelas.nama}` : s.nama });
  const tombolSantri = (s: SantriPilihan) => <AppButton key={s.id} label={`${s.nama} · ${s.nis}`} size="sm" variant="secondary" onPress={() => pilih(s)} />;
  const lebihDari = (r: { rows: SantriPilihan[]; total: number }) => r.total > r.rows.length
    ? <ThemedText type="caption" themeColor="textSecondary">Menampilkan {r.rows.length} dari {r.total}. Cari nama atau NIS untuk mempersempit.</ThemedText> : null;
  return (
    <Panel style={{ gap: 10 }}>
      <ThemedText type="h3">Santri</ThemedText>
      {draf.santri_id !== null ? (
        <View style={{ gap: 8 }}>
          <ThemedText type="bodyBold">{draf.santri_nama}</ThemedText>
          <AppButton label="Ganti santri" size="sm" variant="secondary" onPress={() => { setDraf({ ...draf, santri_id: null, santri_nama: '' }); setHasilCari(null); setTerbuka(null); setIsiKelas(null); }} />
        </View>
      ) : (
        <>
          <PrivateField label="Cari nama atau NIS santri aktif" value={q} onChangeText={v => { setQ(v); if (!v.trim()) setHasilCari(null); }} onSubmitEditing={cari} returnKeyType="search" />
          <AppButton label="Cari santri" size="sm" variant="secondary" loading={memuat && hasilCari === null && terbuka === null} disabled={memuat} onPress={cari} />
          <Pesan text={pesan ?? galatKelas} />
          {hasilCari ? (
            <>
              {kelompokKelas(hasilCari.rows).map(([nama, anggota]) => (
                <View key={nama} style={{ gap: 6 }}>
                  <ThemedText type="label">{nama}</ThemedText>
                  {anggota.map(tombolSantri)}
                </View>
              ))}
              {lebihDari(hasilCari)}
            </>
          ) : kelas === null ? (
            <ThemedText themeColor="textSecondary">Memuat kelas…</ThemedText>
          ) : (
            <>
              <ThemedText type="caption" themeColor="textSecondary">Pilih kelas untuk melihat santrinya, atau cari nama/NIS.</ThemedText>
              {[...kelas.kelas.map(k => ({ id: k.id as number | 'tanpa', nama: k.nama, jumlah: k.jumlah })),
                ...(kelas.tanpa_kelas > 0 ? [{ id: 'tanpa' as const, nama: 'Belum ditempatkan di kelas', jumlah: kelas.tanpa_kelas }] : [])].map(k => (
                <View key={String(k.id)} style={{ gap: 6 }}>
                  <Chip label={`${terbuka === k.id ? '▾' : '▸'} ${k.nama} (${k.jumlah})`} selected={terbuka === k.id} onPress={() => bukaKelas(k.id)} />
                  {terbuka === k.id ? (
                    isiKelas ? <>{isiKelas.rows.map(tombolSantri)}{lebihDari(isiKelas)}</> : <ThemedText themeColor="textSecondary">Memuat santri…</ThemedText>
                  ) : null}
                </View>
              ))}
              {kelas.kelas.length === 0 && kelas.tanpa_kelas === 0 ? <ThemedText themeColor="textSecondary">Belum ada santri aktif.</ThemedText> : null}
            </>
          )}
        </>
      )}
    </Panel>
  );
}

function FormKunjungan({ draf, setDraf, disabled }: { draf: DrafKunjungan; setDraf: (d: DrafKunjungan) => void; disabled: boolean }) {
  const ubahObat = (i: number, ganti: Partial<DrafKunjungan['obat'][number]>) => setDraf({ ...draf, obat: draf.obat.map((o, n) => (n === i ? { ...o, ...ganti } : o)) });
  const ubahRujukan = (i: number, ganti: Partial<DrafKunjungan['rujukan'][number]>) => setDraf({ ...draf, rujukan: draf.rujukan.map((r, n) => (n === i ? { ...r, ...ganti } : r)) });
  const ubahTl = (i: number, ganti: Partial<DrafKunjungan['tindak_lanjut'][number]>) => setDraf({ ...draf, tindak_lanjut: draf.tindak_lanjut.map((t, n) => (n === i ? { ...t, ...ganti } : t)) });
  return (
    <>
      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">Kunjungan</ThemedText>
        <DateTimeField label="Waktu kunjungan" value={draf.waktu_kunjungan} disabled={disabled} onChange={v => setDraf({ ...draf, waktu_kunjungan: v })} />
        <PrivateField label="Keluhan (wajib)" value={draf.keluhan} onChangeText={v => setDraf({ ...draf, keluhan: v })} multiline maxLength={1000} editable={!disabled} />
        <PrivateField label="Catatan klinis" hint="Internal" value={draf.catatan_klinis} onChangeText={v => setDraf({ ...draf, catatan_klinis: v })} multiline maxLength={4000} editable={!disabled} />
        <PrivateField label="Tindakan" value={draf.tindakan} onChangeText={v => setDraf({ ...draf, tindakan: v })} multiline maxLength={2000} editable={!disabled} />
      </Panel>

      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">Obat yang diberikan</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">Catat obat yang benar-benar diberikan. Sistem tidak menyarankan obat atau dosis dan tidak menghitung stok.</ThemedText>
        {draf.obat.map((o, i) => (
          <View key={o.id ?? `baru-${i}`} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <PrivateField label={`Obat ${i + 1}: nama`} value={o.nama_obat} onChangeText={v => ubahObat(i, { nama_obat: v })} maxLength={200} />
            <PrivateField label="Jumlah" value={o.jumlah} onChangeText={v => ubahObat(i, { jumlah: v })} keyboardType="decimal-pad" maxLength={9} />
            <PrivateField label="Satuan" value={o.satuan} onChangeText={v => ubahObat(i, { satuan: v })} maxLength={40} />
            <PrivateField label="Petunjuk" value={o.petunjuk} onChangeText={v => ubahObat(i, { petunjuk: v })} maxLength={500} />
            <AppButton label={`Hapus obat ${i + 1}`} size="sm" variant="outline" onPress={() => setDraf({ ...draf, obat: draf.obat.filter((_, n) => n !== i) })} />
          </View>
        ))}
        {draf.obat.length < 20 ? <AppButton label="Tambah obat" icon="plus" size="sm" variant="secondary"
          onPress={() => setDraf({ ...draf, obat: [...draf.obat, { nama_obat: '', jumlah: '', satuan: '', petunjuk: '' }] })} /> : null}
      </Panel>

      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">Rujukan</ThemedText>
        {draf.rujukan.map((r, i) => (
          <View key={r.id ?? `baru-${i}`} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <PrivateField label={`Rujukan ${i + 1}: tujuan`} value={r.tujuan} onChangeText={v => ubahRujukan(i, { tujuan: v })} maxLength={200} />
            <DateField label="Tanggal rujukan" value={r.tanggal_rujukan} placeholder="Sama dengan kunjungan" onChange={v => ubahRujukan(i, { tanggal_rujukan: v })} />
            <PrivateField label="Alasan/catatan" value={r.alasan} onChangeText={v => ubahRujukan(i, { alasan: v })} multiline maxLength={2000} />
            <PrivateField label="Hasil (bila sudah diketahui)" value={r.hasil} onChangeText={v => ubahRujukan(i, { hasil: v })} multiline maxLength={4000} />
            {r.hasil.trim() ? <DateField label="Tanggal hasil" value={r.tanggal_hasil} placeholder="Hari ini" onChange={v => ubahRujukan(i, { tanggal_hasil: v })} /> : null}
            <AppButton label={`Hapus rujukan ${i + 1}`} size="sm" variant="outline" onPress={() => setDraf({ ...draf, rujukan: draf.rujukan.filter((_, n) => n !== i) })} />
          </View>
        ))}
        {draf.rujukan.length < 5 ? <AppButton label="Tambah rujukan" icon="plus" size="sm" variant="secondary"
          onPress={() => setDraf({ ...draf, rujukan: [...draf.rujukan, { tujuan: '', tanggal_rujukan: '', alasan: '', hasil: '', tanggal_hasil: '' }] })} /> : null}
      </Panel>

      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">Tindak lanjut</ThemedText>
        {draf.tindak_lanjut.map((t, i) => (
          <View key={t.id ?? `baru-${i}`} style={{ gap: 10 }}>
            {i > 0 ? <Divider /> : null}
            <PrivateField label={`Tindak lanjut ${i + 1}: uraian`} value={t.uraian} onChangeText={v => ubahTl(i, { uraian: v })} multiline maxLength={1000} />
            <DateField label="Target" value={t.tanggal_target} placeholder="Tanpa target" onChange={v => ubahTl(i, { tanggal_target: v })} />
            <ChipRow>
              <Chip label="Terbuka" accessibilityRole="radio" selected={t.status === 'Terbuka'} onPress={() => ubahTl(i, { status: 'Terbuka', tanggal_selesai: '' })} />
              <Chip label="Selesai" accessibilityRole="radio" selected={t.status === 'Selesai'} onPress={() => ubahTl(i, { status: 'Selesai' })} />
            </ChipRow>
            {t.status === 'Selesai' ? <DateField label="Tanggal selesai" value={t.tanggal_selesai} placeholder="Hari ini" onChange={v => ubahTl(i, { tanggal_selesai: v })} /> : null}
            <AppButton label={`Hapus tindak lanjut ${i + 1}`} size="sm" variant="outline" onPress={() => setDraf({ ...draf, tindak_lanjut: draf.tindak_lanjut.filter((_, n) => n !== i) })} />
          </View>
        ))}
        {draf.tindak_lanjut.length < 10 ? <AppButton label="Tambah tindak lanjut" icon="plus" size="sm" variant="secondary"
          onPress={() => setDraf({ ...draf, tindak_lanjut: [...draf.tindak_lanjut, { uraian: '', tanggal_target: '', status: 'Terbuka', tanggal_selesai: '' }] })} /> : null}
      </Panel>
    </>
  );
}
