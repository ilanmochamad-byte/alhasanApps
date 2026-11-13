import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  izinWali, type DetailIzinWali, type DetailPetugas, type DetailWali, type HasilMutasi, type KandidatPembimbing,
  type KeputusanAkhir, type RiwayatTahap, type Tinjauan, type TindakanTinjauan,
} from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { Baris, Halaman, Pesan, StatusIzin, rentang } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { IconButton } from '@/components/ui/icon-button';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Notice } from '@/components/ui/notice';
import { Segmented } from '@/components/ui/segmented';
import { StatusPill } from '@/components/ui/status-pill';
import { SuccessPanel } from '@/components/ui/success-panel';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { LABEL_TAHAP, TIPE_IZIN_WALI, labelPeristiwa, langkahTahap, periksaAlasan, periksaCatatan } from '@/izin-wali/forms';
import { useNotifications } from '@/notifications/notification-context';

/**
 * Rincian satu pengajuan izin wali — juga tujuan ketukan notifikasi V7. ID dari
 * notifikasi/tautan hanya penunjuk: setiap pembukaan, fokus kembali, dan
 * kembali dari latar meminta server, yang menghitung ulang hak (wali pengaju
 * → isi dan tindakan; wali lain → status ringkas; pembimbing tujuan yang sah,
 * murobi tujuan sesudah penerusan, admin; selain itu 404). Ditolak → isi tidak
 * tampil dan penunjuk dibiarkan agar dapat dibuka setelah masuk dengan akun
 * yang berhak.
 */
export default function IzinWaliDetailScreen() {
  const { profile } = useAuth();
  const { id, baru } = useLocalSearchParams<{ id: string; baru?: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} baru={baru} />;
}

function Detail({ id, baru }: { id: number; baru?: string }) {
  const router = useRouter();
  const { tujuanDibuka } = useNotifications();
  // P-Sukses (§4.5, TL-07): pengajuan baru → layar sukses di atas rincian yang
  // sudah dimuat; "Lihat pengajuan" menutupnya. Kiriman ulang (replay) tetap
  // berupa pesan di rincian.
  const [suksesBaru, setSuksesBaru] = useState(baru === '1');
  const [pesan, setPesan] = useState<string | null>(baru === 'ulang' ? 'Pengajuan ini sudah terkirim sebelumnya; tidak ada pengajuan kedua.' : null);
  const [konflik, setKonflik] = useState(false);
  const [drafKey, setDrafKey] = useState(0);
  const bersihkan = useCallback(() => { setDrafKey(k => k + 1); setPesan(null); setSuksesBaru(false); }, []);
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk pengajuan tidak valid.');
    const hasil = await izinWali.detail(id);
    tujuanDibuka(TIPE_IZIN_WALI, id);
    return hasil;
  }, [id, tujuanDibuka]);
  const { data, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);

  const selesai = useCallback((hasil: HasilMutasi | null, berhasil: string, ulang: string) => {
    if (hasil === null) return;
    setKonflik(false);
    setPesan(hasil.idempotent_replay ? ulang : berhasil);
    setDrafKey(k => k + 1);
    void load();
  }, [load]);
  const galat = useCallback(() => setKonflik(true), []);

  if (error) return <Halaman title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></Halaman>;
  if (!data) return <Halaman title={JUDUL}><LoadingState label="Memeriksa akses pengajuan izin…" /></Halaman>;
  if (suksesBaru && data.peran_akses === 'wali') {
    return (
      <Halaman title={JUDUL}>
        <SuccessPanel
          title="Pengajuan terkirim"
          message={`Pengajuan izin ${data.pengajuan.santri.nama} sudah diterima. Status: ${data.pengajuan.status_label}.`}>
          <AppButton label="Lihat pengajuan" icon="arrow-right" onPress={() => setSuksesBaru(false)} />
          <AppButton label="Kembali ke daftar izin" variant="line" onPress={() => router.replace('/izin-wali')} />
        </SuccessPanel>
      </Halaman>
    );
  }
  const atas = (
    <>
      <Kepala data={data} />
      <Pesan text={pesan} tone="success" />
      {konflik ? <AppButton label="Muat versi terbaru" variant="secondary" onPress={() => { setKonflik(false); void load(); }} /> : null}
    </>
  );
  // TL-08: Muat ulang menjadi tombol ikon di kepala (label tetap "Muat ulang").
  const bawah = <IconButton icon="refresh" accessibilityLabel="Muat ulang" onPress={() => void load()} />;
  const umum = { id, data, reject, selesai, galat, atas, bawah };
  return data.peran_akses === 'wali'
    ? <BagianWali key={drafKey} {...umum} data={data} />
    : <BagianPetugas key={drafKey} {...umum} data={data} />;
}

const JUDUL = 'Pengajuan izin wali';

type Umum<T> = {
  id: number; data: T; reject: (e: unknown) => void;
  selesai: (hasil: HasilMutasi | null, berhasil: string, ulang: string) => void;
  /** Konflik versi/benturan (409): tawarkan "Muat versi terbaru". */
  galat: () => void;
  /** Kepala, pesan hasil, dan tombol konflik — digambar di atas isi. */
  atas: ReactNode;
  /** Tombol muat ulang (ikon di kepala layar). */
  bawah: ReactNode;
};

/** Kartu kepala: santri, pil status tahap, garis waktu Wali → Pembimbing → Murobi, rentang. */
function Kepala({ data }: { data: DetailIzinWali }) {
  const theme = useTheme();
  const p = data.pengajuan;
  const langkah = langkahTahap(p.tahap, p.status);
  return (
    <Panel style={{ gap: 10 }}>
      <View style={styles.santri}>
        <AvatarInisial nama={p.santri.nama} ukuran={52} />
        <View style={styles.santriTeks}>
          <ThemedText type="h3">{p.santri.nama}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">NIS {p.santri.nis} · pengajuan #{p.id} · asal orang tua</ThemedText>
        </View>
      </View>
      <ChipRow>
        <StatusIzin status={p.status} label={p.status_label} />
        {LABEL_TAHAP[p.tahap] !== undefined && LABEL_TAHAP[p.tahap].toLowerCase() !== p.status_label.toLowerCase() ? <StatusPill label={LABEL_TAHAP[p.tahap]} /> : null}
      </ChipRow>
      <View accessibilityLabel={`Tahap pengajuan: ${langkah.map(l => `${l.label} ${l.keterangan.toLowerCase()}`).join(', ')}`} style={styles.tahap}>
        {langkah.map((l, i) => {
          const warna = l.keadaan === 'selesai' ? theme.primary : l.keadaan === 'aktif' ? theme.warning : l.keadaan === 'berhenti' ? theme.danger : theme.border;
          return (
            <View key={l.kunci} style={styles.tahapSel}>
              <View style={styles.tahapRel}>
                <View style={[styles.tahapGaris, { backgroundColor: i === 0 ? 'transparent' : langkah[i].keadaan === 'belum' ? theme.border : theme.primary }]} />
                <View style={[styles.tahapTitik, { borderColor: warna, backgroundColor: l.keadaan === 'belum' ? theme.card : warna }]}>
                  {l.keadaan === 'selesai' ? <AppIcon name="check" size={12} color={theme.onPrimary} /> : l.keadaan === 'berhenti' ? <AppIcon name="close" size={12} color={theme.onPrimary} /> : null}
                </View>
                <View style={[styles.tahapGaris, { backgroundColor: i === langkah.length - 1 ? 'transparent' : langkah[i + 1].keadaan === 'belum' ? theme.border : theme.primary }]} />
              </View>
              <ThemedText type="label" style={styles.tengah}>{l.label}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.tengah}>{l.keterangan}</ThemedText>
            </View>
          );
        })}
      </View>
      <Divider />
      <Baris icon="calendar" label="Rentang izin" value={rentang(p.tgl_izin, p.tgl_kembali)} />
      <Baris icon="clock" label="Diajukan" value={waktuPendek(p.diajukan_pada)} last />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Orang tua
// ---------------------------------------------------------------------------

function BagianWali({ id, data, reject, selesai, galat, atas, bawah }: Umum<DetailWali>) {
  const router = useRouter();
  const p = data.pengajuan;
  const [alasan, setAlasan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);
  const [yakin, setYakin] = useState(false);
  const guard = useIzinWaliMutation('izin-wali-batal', reject, galat);

  if (p.ringkas || !p.pengaju_sendiri) {
    return (
      <Halaman title={JUDUL} actions={bawah}>
        {atas}
        <Notice tone="neutral" icon="lock" title="Diajukan wali lain" selectable={false}
          text="Anda hanya melihat status ringkas. Alasan, catatan, dan tindakan hanya tersedia bagi wali yang mengajukan." />
      </Halaman>
    );
  }

  async function batalkan() {
    const masalah = periksaAlasan(alasan, 'Alasan pembatalan');
    setValidasi(masalah);
    if (masalah === null && p.version !== undefined) {
      const version = p.version;
      const hasil = await guard.run(JSON.stringify({ id, alasan: alasan.trim(), version }), key => izinWali.batalkan(id, alasan.trim(), version, key));
      selesai(hasil, 'Pengajuan dibatalkan. Riwayat sebelumnya tetap tersimpan.', 'Pembatalan sudah tercatat sebelumnya.');
    }
  }

  // Tindakan sesuai `tindakan` server di bilah bawah: perbaiki dan/atau batal.
  const bilah = data.tindakan.perbaiki || data.tindakan.batalkan ? (
    <ActionBar>
      {yakin ? (
        <>
          <AppButton label="Tidak jadi" variant="secondary" style={styles.sempit} disabled={guard.isBusy} onPress={() => setYakin(false)} />
          <AppButton label="Ya, batalkan pengajuan" variant="danger" style={styles.lebar} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void batalkan().then(() => setYakin(false))} />
        </>
      ) : (
        <>
          {data.tindakan.batalkan ? (
            <AppButton label="Batalkan pengajuan" variant="outline" style={styles.lebar} onPress={() => {
              const masalah = periksaAlasan(alasan, 'Alasan pembatalan');
              setValidasi(masalah);
              if (masalah === null) setYakin(true);
            }} />
          ) : null}
          {data.tindakan.perbaiki ? (
            <AppButton label="Perbaiki dan kirim ulang" style={styles.lebar} onPress={() => router.push({ pathname: '/izin-wali/perbaiki', params: { id: String(id) } })} />
          ) : null}
        </>
      )}
    </ActionBar>
  ) : null;

  return (
    <Halaman title={JUDUL} footer={bilah} actions={bawah}>
      {atas}
      <Panel style={{ gap: 0 }}>
        <Overline>Isi pengajuan (versi {p.version})</Overline>
        <Baris icon="izin" label="Alasan izin" value={p.alasan} />
        <Baris icon="info" label="Catatan" value={p.catatan ?? null} />
        <Baris icon="person" label="Pembimbing" value={p.pembimbing ?? 'Menunggu penetapan admin'} last={!p.murobi} />
        {p.murobi ? <Baris icon="users" label="Murobi" value={p.murobi} last /> : null}
      </Panel>
      <DaftarTinjauan items={data.tinjauan ?? []} untukWali />
      <Keputusan k={data.keputusan ?? null} />
      {data.pembatalan ? <Panel style={{ gap: 0 }}><Overline>Pembatalan</Overline><Baris label="Alasan" value={data.pembatalan.alasan} /><Baris label="Waktu" value={waktuPendek(data.pembatalan.waktu)} last /></Panel> : null}
      {data.tindakan.batalkan ? (
        <Panel style={{ gap: 10 }}>
          <Overline>Batalkan pengajuan</Overline>
          <ThemedText type="caption" themeColor="textSecondary">Pembatalan hanya dapat dilakukan sebelum keputusan murobi atau admin pengganti.</ThemedText>
          <Field label="Alasan pembatalan" accessibilityLabel="Alasan pembatalan" hint="Wajib" value={alasan} onChangeText={v => { setAlasan(v); setYakin(false); }} multiline placeholder="Minimal 3 karakter" />
          <Pesan text={validasi ?? guard.error} tone="danger" />
          {yakin ? <ThemedText type="bodyBold">Yakin membatalkan pengajuan ini?</ThemedText> : (
            <ThemedText type="caption" themeColor="textMuted">Tombol Batalkan pengajuan berada di bawah layar.</ThemedText>
          )}
        </Panel>
      ) : null}
      <Riwayat items={data.riwayat} />
    </Halaman>
  );
}

// ---------------------------------------------------------------------------
// Pembimbing, admin, murobi
// ---------------------------------------------------------------------------

function BagianPetugas({ id, data, reject, selesai, galat, atas, bawah }: Umum<DetailPetugas>) {
  const router = useRouter();
  const p = data.pengajuan;
  const t = data.tindakan;
  const tinjau = t.minta_perbaikan || t.tolak || t.teruskan;
  // Isian tinjauan pembimbing; tombol kirimnya berada di bilah bawah.
  const [tindakan, setTindakan] = useState<TindakanTinjauan>('teruskan');
  const [catatan, setCatatan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);
  const guard = useIzinWaliMutation('izin-wali-tinjau', reject, galat);
  const labelCatatan = tindakan === 'teruskan' ? 'Catatan untuk murobi' : tindakan === 'tolak' ? 'Alasan penolakan' : 'Catatan perbaikan untuk wali';
  const label = tindakan === 'teruskan' ? 'Teruskan ke murobi' : tindakan === 'tolak' ? 'Tolak pengajuan' : 'Minta perbaikan';
  async function kirim() {
    const masalah = periksaCatatan(tindakan, catatan);
    setValidasi(masalah);
    if (masalah !== null) return;
    const teks = catatan.trim();
    const version = p.version;
    const hasil = await guard.run(JSON.stringify({ id, tindakan, teks, version }), key => izinWali.tinjau(id, tindakan, teks, version, key));
    selesai(hasil,
      tindakan === 'teruskan' ? 'Pengajuan diteruskan. Murobi atau admin menerima antrean sesuai routing.' : tindakan === 'tolak' ? 'Pengajuan ditolak pada tahap pembimbing.' : 'Permintaan perbaikan terkirim kepada wali pengaju.',
      'Tinjauan ini sudah tercatat sebelumnya; tidak ada tindakan kedua.');
  }
  const murobiMemutus = data.peran_akses === 'murobi' && t.buka_v2;
  const penetapan = usePenetapan({ id, version: p.version, reject, selesai, galat, aktif: Boolean(t.tetapkan_pembimbing) });
  const bilah = tinjau ? (
    <ActionBar>
      <AppButton label={label} variant={tindakan === 'tolak' ? 'danger' : 'primary'} style={styles.lebar} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
    </ActionBar>
  ) : t.tetapkan_pembimbing && penetapan.tombol ? (
    <ActionBar>{penetapan.tombol}</ActionBar>
  ) : murobiMemutus ? (
    <ActionBar>
      <AppButton label={t.putuskan ? 'Putuskan di Perizinan' : 'Lihat di Perizinan'} variant={t.putuskan ? 'primary' : 'secondary'} style={styles.lebar}
        onPress={() => router.push({ pathname: '/izin/[id]', params: { id: String(id), mode: 'murobi' } })} />
    </ActionBar>
  ) : null;
  return (
    <Halaman title={JUDUL} footer={bilah} actions={bawah}>
      {atas}
      <Panel style={{ gap: 0 }}>
        <Overline>Isi pengajuan (versi {p.version})</Overline>
        <Baris icon="person" label="Wali pengaju" value={[p.wali.nama, p.wali.akun ? `akun ${p.wali.akun}` : null].filter(Boolean).join(' · ')} />
        <Baris icon="izin" label="Alasan izin" value={p.alasan} />
        <Baris icon="info" label="Catatan wali" value={p.catatan} />
        <Baris icon="users" label="Pembimbing" value={p.pembimbing.nama ? `${p.pembimbing.nama}${p.pembimbing.sah ? '' : ' (tidak lagi sah)'}` : 'Belum ditetapkan'} last={!p.murobi.nama} />
        {p.murobi.nama ? <Baris icon="users" label="Murobi" value={p.murobi.nama} last /> : null}
        {!p.santri.aktif ? <Pesan text="Santri tidak aktif." tone="danger" /> : null}
      </Panel>
      {tinjau ? (
        <Panel style={{ gap: 10 }}>
          <Overline>Tinjauan pembimbing</Overline>
          <Segmented variant="radio" accessibilityLabel="Tindakan tinjauan" value={tindakan} onChange={v => { setTindakan(v); setValidasi(null); }}
            options={[{ value: 'teruskan', label: 'Teruskan' }, { value: 'minta_perbaikan', label: 'Minta perbaikan' }, { value: 'tolak', label: 'Tolak' }]} />
          <Field label={labelCatatan} accessibilityLabel={labelCatatan}
            hint={tindakan === 'teruskan' ? 'Opsional' : 'Wajib'} value={catatan} onChangeText={setCatatan} multiline />
          {tindakan === 'tolak' ? <ThemedText type="caption" themeColor="textSecondary">Penolakan pembimbing menutup pengajuan sebelum sampai kepada murobi; ini bukan keputusan murobi.</ThemedText> : null}
          <Pesan text={validasi ?? guard.error} tone="danger" />
          <ThemedText type="caption" themeColor="textMuted">Tombol tindakan berada di bawah layar.</ThemedText>
        </Panel>
      ) : null}
      {t.tetapkan_pembimbing ? penetapan.panel : null}
      {data.peran_akses === 'admin' && (t.tetapkan_murobi || t.putuskan_pengganti) && t.buka_v2 ? (
        <Panel style={{ gap: 8 }}>
          <Overline>Tahap murobi</Overline>
          <ThemedText themeColor="textSecondary">Penetapan murobi dan keputusan admin pengganti (beralasan) dilakukan di Perizinan pada ID yang sama.</ThemedText>
          <AppButton label="Buka di Perizinan" variant="secondary" onPress={() => router.push({ pathname: '/izin/[id]', params: { id: String(id), mode: 'admin' } })} />
        </Panel>
      ) : null}
      {murobiMemutus ? (
        <Notice tone={t.putuskan ? 'warning' : 'neutral'} title="Keputusan murobi" selectable={false}
          text={t.putuskan ? 'Pengajuan ini sudah diteruskan pembimbing dan menunggu keputusan Anda.' : 'Pengajuan ini sudah diputus atau ditutup.'} />
      ) : null}
      <DaftarTinjauan items={data.tinjauan} />
      {data.perbaikan.length > 0 ? (
        <Panel style={{ gap: 8 }}>
          <Overline>Perbaikan wali</Overline>
          {data.perbaikan.map(w => (
            <View key={w.versi_sesudah} style={{ gap: 4 }}>
              <ThemedText type="bodyBold">Versi {w.versi_sebelum} → {w.versi_sesudah} · {waktuPendek(w.waktu)}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">Sebelum: {rentang(w.sebelum.tgl_izin, w.sebelum.tgl_kembali)} — {w.sebelum.alasan}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">Sesudah: {rentang(w.sesudah.tgl_izin, w.sesudah.tgl_kembali)} — {w.sesudah.alasan}</ThemedText>
            </View>
          ))}
        </Panel>
      ) : null}
      <Keputusan k={data.keputusan} />
      {p.pembatalan ? <Panel style={{ gap: 0 }}><Overline>Dibatalkan wali</Overline><Baris label="Alasan" value={p.pembatalan.alasan} /><Baris label="Waktu" value={waktuPendek(p.pembatalan.waktu)} last /></Panel> : null}
      {data.penetapan && data.penetapan.length > 0 ? (
        <Panel style={{ gap: 6 }}>
          <Overline>Penetapan pembimbing</Overline>
          {data.penetapan.map(x => (
            <ThemedText key={x.id} type="caption">{waktuPendek(x.ditetapkan_pada)} · {x.pembimbing_sebelum ? `${x.pembimbing_sebelum} → ` : ''}{x.pembimbing} · oleh {x.penetap ?? '—'} · {x.alasan}</ThemedText>
          ))}
        </Panel>
      ) : null}
      {data.notifikasi && data.notifikasi.length > 0 ? (
        <Panel style={{ gap: 6 }}>
          <Overline>Jejak notifikasi</Overline>
          {data.notifikasi.map((n, i) => (
            <ThemedText key={i} type="caption">{n.peristiwa_label} · {n.kanal} · {n.status}{n.penerima ? ` · ${n.penerima}` : ''} · {waktuPendek(n.dibuat)}</ThemedText>
          ))}
        </Panel>
      ) : null}
      <Riwayat items={data.riwayat} petugas />
    </Halaman>
  );
}

type AksiProps = { id: number; version: number; reject: (e: unknown) => void; selesai: Umum<unknown>['selesai']; galat: Umum<unknown>['galat'] };

/**
 * Penetapan pembimbing oleh admin (TL-08): isian (pilihan + alasan) di badan
 * layar, tombol "Tetapkan pembimbing" di bilah bawah. Kandidat tetap dimuat saat
 * rincian dibuka, sama seperti sebelumnya.
 */
function usePenetapan({ id, version, reject, selesai, galat, aktif }: AksiProps & { aktif: boolean }) {
  // Tanpa hak penetapan: tidak ada permintaan kandidat (sama dengan sebelumnya).
  const fetcher = useCallback(() => (aktif ? izinWali.kandidat(id) : Promise.resolve({ items: [] as KandidatPembimbing[] })), [aktif, id]);
  const { data, error, load } = usePrivateResource(fetcher, undefined, true);
  const [pilihan, setPilihan] = useState<number | null>(null);
  const [alasan, setAlasan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);
  const guard = useIzinWaliMutation('izin-wali-penetapan', reject, galat);
  async function kirim() {
    const kandidat = data?.items ?? [];
    const masalah = pilihan === null || !kandidat.some(k => k.pengurus_id === pilihan) ? 'Pilih pembimbing sah.' : periksaAlasan(alasan, 'Alasan penetapan pembimbing');
    setValidasi(masalah);
    if (masalah !== null || pilihan === null) return;
    const teks = alasan.trim();
    const hasil = await guard.run(JSON.stringify({ id, pilihan, teks, version }), key => izinWali.tetapkanPembimbing(id, pilihan, teks, version, key));
    selesai(hasil, 'Pembimbing ditetapkan. Pengajuan masuk antrean pembimbing tersebut.', 'Penetapan ini sudah tercatat sebelumnya.');
  }
  const siap = Boolean(data && data.items.length > 0);
  const panel = (
    <Panel style={{ gap: 10 }}>
      <Overline>Tetapkan pembimbing</Overline>
      {error ? <Pesan text={error} tone="danger" /> : !data ? <ThemedText themeColor="textSecondary">Memuat kandidat pembimbing sah…</ThemedText> : data.items.length === 0 ? (
        <>
          <ThemedText themeColor="textSecondary">Belum ada pembimbing sah (penugasan aktif pada kamar/kelas santri dengan akun pengurus aktif). Atur penugasan di website, lalu muat ulang.</ThemedText>
          <AppButton label="Muat ulang kandidat" variant="secondary" onPress={() => void load()} />
        </>
      ) : (
        <>
          <ChipRow>
            {data.items.map(k => <Chip key={k.pengurus_id} accessibilityRole="radio" label={k.nama} selected={pilihan === k.pengurus_id} style={styles.pilihan} onPress={() => setPilihan(k.pengurus_id)} />)}
          </ChipRow>
          {pilihan !== null ? <ThemedText type="caption" themeColor="textSecondary">{data.items.find(k => k.pengurus_id === pilihan)?.targets.join(' · ')}</ThemedText> : null}
          <Field label="Alasan penetapan" accessibilityLabel="Alasan penetapan" hint="Wajib" value={alasan} onChangeText={setAlasan} multiline placeholder="Minimal 3 karakter" />
          <Pesan text={validasi ?? guard.error} tone="danger" />
          <ThemedText type="caption" themeColor="textMuted">Tombol Tetapkan pembimbing berada di bawah layar.</ThemedText>
        </>
      )}
    </Panel>
  );
  const tombol = siap ? (
    <AppButton label="Tetapkan pembimbing" style={styles.lebar} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
  ) : null;
  return { panel, tombol };
}

// ---------------------------------------------------------------------------
// Bagian baca
// ---------------------------------------------------------------------------

function DaftarTinjauan({ items, untukWali }: { items: Tinjauan[]; untukWali?: boolean }) {
  if (items.length === 0) return null;
  return (
    <Panel style={{ gap: 8 }}>
      <Overline>Tinjauan pembimbing</Overline>
      {items.map((x, i) => (
        <View key={i} style={{ gap: 3 }}>
          {i > 0 ? <Divider /> : null}
          <ThemedText type="bodyBold">{x.tindakan_label}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{x.pembimbing}{x.peninjau && !untukWali && x.peninjau !== x.pembimbing ? ` (oleh ${x.peninjau})` : ''} · {waktuPendek(x.waktu)}</ThemedText>
          {x.catatan ? <ThemedText>{x.catatan}</ThemedText> : null}
        </View>
      ))}
    </Panel>
  );
}

function Keputusan({ k }: { k: KeputusanAkhir | null }) {
  if (k === null) return null;
  return (
    <Panel style={{ gap: 6 }}>
      <Overline>Keputusan akhir</Overline>
      <ChipRow><StatusIzin status={k.hasil} label={`${k.hasil} · ${k.oleh}`} />{k.dikoreksi ? <StatusPill label="Dikoreksi" tone="warning" /> : null}</ChipRow>
      <Baris icon="izin" label="Alasan" value={k.alasan} />
      {k.pemberi ? <Baris icon="person" label="Pemberi keputusan" value={k.pemberi} /> : null}
      <Baris icon="clock" label="Waktu" value={waktuPendek(k.waktu)} last />
    </Panel>
  );
}

/** Garis waktu riwayat: titik + peristiwa + waktu. */
function Riwayat({ items, petugas }: { items: RiwayatTahap[]; petugas?: boolean }) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <Panel style={{ gap: 6 }}>
      <Overline>Riwayat</Overline>
      {items.map((r, i) => (
        <View key={i} style={styles.riwayatBaris}>
          <View style={styles.riwayatRel}>
            <View style={[styles.riwayatTitik, { backgroundColor: i === 0 ? theme.primary : theme.border }]} />
            {i < items.length - 1 ? <View style={[styles.riwayatGaris, { backgroundColor: theme.divider }]} /> : null}
          </View>
          <ThemedText type="caption" style={styles.riwayatTeks}>
            {waktuPendek(r.waktu)} · {labelPeristiwa(r.peristiwa)}{r.status_sesudah ? ` → ${r.status_sesudah}` : ''}
            {petugas && r.pelaku ? ` · ${r.pelaku}` : ''}{petugas && r.alasan ? ` · ${r.alasan}` : ''}
          </ThemedText>
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  santri: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  santriTeks: { flex: 1, gap: 2 },
  tahap: { flexDirection: 'row', paddingTop: 4 },
  tahapSel: { flex: 1, alignItems: 'center', gap: 2 },
  tahapRel: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 4 },
  tahapGaris: { flex: 1, height: 2 },
  tahapTitik: { width: 22, height: 22, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tengah: { textAlign: 'center' },
  lebar: { flex: 1 },
  sempit: { width: 118 },
  pilihan: { minHeight: 44 },
  riwayatBaris: { flexDirection: 'row', gap: 10 },
  riwayatRel: { width: 10, alignItems: 'center' },
  riwayatTitik: { width: 9, height: 9, borderRadius: Radius.pill, marginTop: 4 },
  riwayatGaris: { flex: 1, width: 2, marginTop: 3 },
  riwayatTeks: { flex: 1, paddingBottom: 8 },
});
