import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import {
  izinWali, type DetailIzinWali, type DetailPetugas, type DetailWali, type HasilMutasi, type KandidatPembimbing,
  type KeputusanAkhir, type RiwayatTahap, type Tinjauan, type TindakanTinjauan,
} from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, Pesan, StatusIzin, rentang } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { LABEL_TAHAP, TIPE_IZIN_WALI, labelPeristiwa, periksaAlasan, periksaCatatan } from '@/izin-wali/forms';
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
  const { tujuanDibuka } = useNotifications();
  const [pesan, setPesan] = useState<string | null>(baru === '1' ? 'Pengajuan terkirim.' : baru === 'ulang' ? 'Pengajuan ini sudah terkirim sebelumnya; tidak ada pengajuan kedua.' : null);
  const [konflik, setKonflik] = useState(false);
  const [drafKey, setDrafKey] = useState(0);
  const bersihkan = useCallback(() => { setDrafKey(k => k + 1); setPesan(null); }, []);
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

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa akses pengajuan izin…" />;
  const umum = { id, data, reject, selesai, galat };
  return (
    <Halaman>
      <Kepala data={data} />
      <Pesan text={pesan} tone="success" />
      {konflik ? <AppButton label="Muat versi terbaru" variant="secondary" onPress={() => { setKonflik(false); void load(); }} /> : null}
      {data.peran_akses === 'wali'
        ? <BagianWali key={drafKey} {...umum} data={data} />
        : <BagianPetugas key={drafKey} {...umum} data={data} />}
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}

type Umum<T> = {
  id: number; data: T; reject: (e: unknown) => void;
  selesai: (hasil: HasilMutasi | null, berhasil: string, ulang: string) => void;
  /** Konflik versi/benturan (409): tawarkan "Muat versi terbaru". */
  galat: () => void;
};

function Kepala({ data }: { data: DetailIzinWali }) {
  const p = data.pengajuan;
  return (
    <Panel style={{ gap: 8 }}>
      <ThemedText type="h3">{p.santri.nama}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">NIS {p.santri.nis} · pengajuan #{p.id} · asal orang tua</ThemedText>
      <ChipRow>
        <StatusIzin status={p.status} label={p.status_label} />
        {LABEL_TAHAP[p.tahap] !== undefined && LABEL_TAHAP[p.tahap].toLowerCase() !== p.status_label.toLowerCase() ? <Badge label={LABEL_TAHAP[p.tahap]} /> : null}
      </ChipRow>
      <Baris label="Rentang izin" value={rentang(p.tgl_izin, p.tgl_kembali)} />
      <Baris label="Diajukan" value={waktuPendek(p.diajukan_pada)} />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Orang tua
// ---------------------------------------------------------------------------

function BagianWali({ id, data, reject, selesai, galat }: Umum<DetailWali>) {
  const router = useRouter();
  const p = data.pengajuan;
  const [alasan, setAlasan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);
  const [yakin, setYakin] = useState(false);
  const guard = useIzinWaliMutation('izin-wali-batal', reject, galat);

  if (p.ringkas || !p.pengaju_sendiri) {
    return (
      <Panel style={{ gap: 6 }}>
        <ThemedText type="bodyBold">Diajukan wali lain</ThemedText>
        <ThemedText themeColor="textSecondary">Anda hanya melihat status ringkas. Alasan, catatan, dan tindakan hanya tersedia bagi wali yang mengajukan.</ThemedText>
      </Panel>
    );
  }

  async function batalkan() {
    const masalah = periksaAlasan(alasan, 'Alasan pembatalan');
    setValidasi(masalah);
    if (masalah !== null || p.version === undefined) return;
    const version = p.version;
    const hasil = await guard.run(JSON.stringify({ id, alasan: alasan.trim(), version }), key => izinWali.batalkan(id, alasan.trim(), version, key));
    selesai(hasil, 'Pengajuan dibatalkan. Riwayat sebelumnya tetap tersimpan.', 'Pembatalan sudah tercatat sebelumnya.');
  }

  return (
    <>
      <Panel style={{ gap: 10 }}>
        <Overline>Isi pengajuan (versi {p.version})</Overline>
        <Baris label="Alasan izin" value={p.alasan} />
        <Baris label="Catatan" value={p.catatan ?? null} />
        <Baris label="Pembimbing" value={p.pembimbing ?? 'Menunggu penetapan admin'} />
        {p.murobi ? <Baris label="Murobi" value={p.murobi} /> : null}
      </Panel>
      <DaftarTinjauan items={data.tinjauan ?? []} untukWali />
      <Keputusan k={data.keputusan ?? null} />
      {data.pembatalan ? <Panel style={{ gap: 6 }}><Overline>Pembatalan</Overline><Baris label="Alasan" value={data.pembatalan.alasan} /><Baris label="Waktu" value={waktuPendek(data.pembatalan.waktu)} /></Panel> : null}
      {data.tindakan.perbaiki ? (
        <AppButton label="Perbaiki dan kirim ulang" onPress={() => router.push({ pathname: '/izin-wali/perbaiki', params: { id: String(id) } })} />
      ) : null}
      {data.tindakan.batalkan ? (
        <Panel style={{ gap: 10 }}>
          <Overline>Batalkan pengajuan</Overline>
          <ThemedText type="caption" themeColor="textSecondary">Pembatalan hanya dapat dilakukan sebelum keputusan murobi atau admin pengganti.</ThemedText>
          <Field label="Alasan pembatalan" accessibilityLabel="Alasan pembatalan" value={alasan} onChangeText={v => { setAlasan(v); setYakin(false); }} multiline placeholder="Minimal 3 karakter" />
          <Pesan text={validasi ?? guard.error} tone="danger" />
          {yakin ? (
            <>
              <ThemedText type="bodyBold">Yakin membatalkan pengajuan ini?</ThemedText>
              <AppButton label="Ya, batalkan pengajuan" variant="danger" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void batalkan().then(() => setYakin(false))} />
              <AppButton label="Tidak jadi" variant="secondary" disabled={guard.isBusy} onPress={() => setYakin(false)} />
            </>
          ) : (
            <AppButton label="Batalkan pengajuan" variant="outline" onPress={() => {
              const masalah = periksaAlasan(alasan, 'Alasan pembatalan');
              setValidasi(masalah);
              if (masalah === null) setYakin(true);
            }} />
          )}
        </Panel>
      ) : null}
      <Riwayat items={data.riwayat} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Pembimbing, admin, murobi
// ---------------------------------------------------------------------------

function BagianPetugas({ id, data, reject, selesai, galat }: Umum<DetailPetugas>) {
  const router = useRouter();
  const p = data.pengajuan;
  const t = data.tindakan;
  return (
    <>
      <Panel style={{ gap: 10 }}>
        <Overline>Isi pengajuan (versi {p.version})</Overline>
        <Baris label="Wali pengaju" value={[p.wali.nama, p.wali.akun ? `akun ${p.wali.akun}` : null].filter(Boolean).join(' · ')} />
        <Baris label="Alasan izin" value={p.alasan} />
        <Baris label="Catatan wali" value={p.catatan} />
        <Baris label="Pembimbing" value={p.pembimbing.nama ? `${p.pembimbing.nama}${p.pembimbing.sah ? '' : ' (tidak lagi sah)'}` : 'Belum ditetapkan'} />
        {p.murobi.nama ? <Baris label="Murobi" value={p.murobi.nama} /> : null}
        {!p.santri.aktif ? <Pesan text="Santri tidak aktif." tone="danger" /> : null}
      </Panel>
      {t.minta_perbaikan || t.tolak || t.teruskan ? <AksiPembimbing id={id} version={p.version} reject={reject} selesai={selesai} galat={galat} /> : null}
      {t.tetapkan_pembimbing ? <AksiPenetapan id={id} version={p.version} reject={reject} selesai={selesai} galat={galat} /> : null}
      {data.peran_akses === 'admin' && (t.tetapkan_murobi || t.putuskan_pengganti) && t.buka_v2 ? (
        <Panel style={{ gap: 8 }}>
          <Overline>Tahap murobi</Overline>
          <ThemedText themeColor="textSecondary">Penetapan murobi dan keputusan admin pengganti (beralasan) dilakukan di Perizinan pada ID yang sama.</ThemedText>
          <AppButton label="Buka di Perizinan" variant="secondary" onPress={() => router.push({ pathname: '/izin/[id]', params: { id: String(id), mode: 'admin' } })} />
        </Panel>
      ) : null}
      {data.peran_akses === 'murobi' && t.buka_v2 ? (
        <Panel style={{ gap: 8 }}>
          <Overline>Keputusan murobi</Overline>
          <ThemedText themeColor="textSecondary">{t.putuskan ? 'Pengajuan ini sudah diteruskan pembimbing dan menunggu keputusan Anda.' : 'Pengajuan ini sudah diputus atau ditutup.'}</ThemedText>
          <AppButton label={t.putuskan ? 'Putuskan di Perizinan' : 'Lihat di Perizinan'} variant={t.putuskan ? 'primary' : 'secondary'}
            onPress={() => router.push({ pathname: '/izin/[id]', params: { id: String(id), mode: 'murobi' } })} />
        </Panel>
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
      {p.pembatalan ? <Panel style={{ gap: 6 }}><Overline>Dibatalkan wali</Overline><Baris label="Alasan" value={p.pembatalan.alasan} /><Baris label="Waktu" value={waktuPendek(p.pembatalan.waktu)} /></Panel> : null}
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
    </>
  );
}

type AksiProps = { id: number; version: number; reject: (e: unknown) => void; selesai: Umum<unknown>['selesai']; galat: Umum<unknown>['galat'] };

function AksiPembimbing({ id, version, reject, selesai, galat }: AksiProps) {
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
    const hasil = await guard.run(JSON.stringify({ id, tindakan, teks, version }), key => izinWali.tinjau(id, tindakan, teks, version, key));
    selesai(hasil,
      tindakan === 'teruskan' ? 'Pengajuan diteruskan. Murobi atau admin menerima antrean sesuai routing.' : tindakan === 'tolak' ? 'Pengajuan ditolak pada tahap pembimbing.' : 'Permintaan perbaikan terkirim kepada wali pengaju.',
      'Tinjauan ini sudah tercatat sebelumnya; tidak ada tindakan kedua.');
  }
  return (
    <Panel style={{ gap: 10 }}>
      <Overline>Tinjauan pembimbing</Overline>
      <Segmented variant="radio" accessibilityLabel="Tindakan tinjauan" value={tindakan} onChange={v => { setTindakan(v); setValidasi(null); }}
        options={[{ value: 'teruskan', label: 'Teruskan' }, { value: 'minta_perbaikan', label: 'Minta perbaikan' }, { value: 'tolak', label: 'Tolak' }]} />
      <Field label={labelCatatan} accessibilityLabel={labelCatatan}
        hint={tindakan === 'teruskan' ? 'Opsional' : 'Wajib'} value={catatan} onChangeText={setCatatan} multiline />
      {tindakan === 'tolak' ? <ThemedText type="caption" themeColor="textSecondary">Penolakan pembimbing menutup pengajuan sebelum sampai kepada murobi; ini bukan keputusan murobi.</ThemedText> : null}
      <Pesan text={validasi ?? guard.error} tone="danger" />
      <AppButton label={label} variant={tindakan === 'tolak' ? 'danger' : 'primary'} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
    </Panel>
  );
}

function AksiPenetapan({ id, version, reject, selesai, galat }: AksiProps) {
  const fetcher = useCallback(() => izinWali.kandidat(id), [id]);
  const { data, error, load } = usePrivateResource(fetcher, undefined, true);
  const [pilihan, setPilihan] = useState<number | null>(null);
  const [alasan, setAlasan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);
  const guard = useIzinWaliMutation('izin-wali-penetapan', reject, galat);
  async function kirim(kandidat: KandidatPembimbing[]) {
    const masalah = pilihan === null || !kandidat.some(k => k.pengurus_id === pilihan) ? 'Pilih pembimbing sah.' : periksaAlasan(alasan, 'Alasan penetapan pembimbing');
    setValidasi(masalah);
    if (masalah !== null || pilihan === null) return;
    const teks = alasan.trim();
    const hasil = await guard.run(JSON.stringify({ id, pilihan, teks, version }), key => izinWali.tetapkanPembimbing(id, pilihan, teks, version, key));
    selesai(hasil, 'Pembimbing ditetapkan. Pengajuan masuk antrean pembimbing tersebut.', 'Penetapan ini sudah tercatat sebelumnya.');
  }
  return (
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
            {data.items.map(k => <Chip key={k.pengurus_id} accessibilityRole="radio" label={k.nama} selected={pilihan === k.pengurus_id} onPress={() => setPilihan(k.pengurus_id)} />)}
          </ChipRow>
          {pilihan !== null ? <ThemedText type="caption" themeColor="textSecondary">{data.items.find(k => k.pengurus_id === pilihan)?.targets.join(' · ')}</ThemedText> : null}
          <Field label="Alasan penetapan" accessibilityLabel="Alasan penetapan" value={alasan} onChangeText={setAlasan} multiline placeholder="Minimal 3 karakter" />
          <Pesan text={validasi ?? guard.error} tone="danger" />
          <AppButton label="Tetapkan pembimbing" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim(data.items)} />
        </>
      )}
    </Panel>
  );
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
      <ChipRow><StatusIzin status={k.hasil} label={`${k.hasil} · ${k.oleh}`} />{k.dikoreksi ? <Badge label="Dikoreksi" tone="warning" /> : null}</ChipRow>
      <Baris label="Alasan" value={k.alasan} />
      {k.pemberi ? <Baris label="Pemberi keputusan" value={k.pemberi} /> : null}
      <Baris label="Waktu" value={waktuPendek(k.waktu)} />
    </Panel>
  );
}

function Riwayat({ items, petugas }: { items: RiwayatTahap[]; petugas?: boolean }) {
  if (items.length === 0) return null;
  return (
    <Panel style={{ gap: 6 }}>
      <Overline>Riwayat</Overline>
      {items.map((r, i) => (
        <ThemedText key={i} type="caption">
          {waktuPendek(r.waktu)} · {labelPeristiwa(r.peristiwa)}{r.status_sesudah ? ` → ${r.status_sesudah}` : ''}
          {petugas && r.pelaku ? ` · ${r.pelaku}` : ''}{petugas && r.alasan ? ` · ${r.alasan}` : ''}
        </ThemedText>
      ))}
    </Panel>
  );
}

