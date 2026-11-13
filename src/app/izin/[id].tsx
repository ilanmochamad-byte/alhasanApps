import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';

import { api } from '@/api/client';
import type { GuruPilihan, IzinCapability, IzinDetailResponse, RoutingResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { formatTanggal, statusIcon, statusPillTone } from '@/components/izin-card';
import { StackScreen } from '@/components/screen-shell';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar, AksiAkhirIsi, bilahTetap } from '@/components/ui/action-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { Chip, ChipRow } from '@/components/ui/chip';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { SuccessPanel } from '@/components/ui/success-panel';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { Layout, Radius } from '@/constants/theme';
import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { IzinWaliProtection } from '@/components/izin-wali-protection';
import { useAuth } from '@/auth/auth-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Detail pengajuan izin dengan tindakan sesuai kemampuan (PRD V2 Fase 3 §6–§9).
 *
 * Tindakan yang ditampilkan berasal dari `aksi` yang dihitung server untuk
 * cakupan pengguna. Selama satu mutasi berjalan seluruh tombol dinonaktifkan
 * dan percobaan ulang memakai kunci idempotensi yang sama (lihat
 * `useMutationGuard`), sehingga tidak pernah ada pengajuan/keputusan ganda.
 *
 * Redesain V2: pasangan Setujui/Tolak pindah ke bilah tetap di dasar layar
 * supaya selalu terjangkau; kolom alasannya tetap berada di badan layar dan
 * tetap wajib diisi — server yang memvalidasinya, persis seperti sebelumnya.
 *
 * Redesain gelombang 2 (§4.4, K-7, K-10): kepala stack ← · judul, kartu kepala
 * (avatar, nama, pil status besar), `InfoRow`, garis waktu riwayat, dan satu
 * tindakan utama di bilah bawah sesuai `aksi` server.
 */
const JUDUL = 'Rincian izin';
export default function IzinDetailScreen() {
  const { fontScale } = useWindowDimensions();
  const { profile } = useAuth();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string; baru?: string }>();

  // iOS dapat mempertahankan pengukuran ScrollView lama ketika Dynamic Type
  // diubah saat layar aktif. Remount terarah mencegah judul/status terpotong.
  return <IzinDetailSession key={`${profile?.id}:${id}:${mode}:${fontScale}`} />;
}

function IzinDetailSession() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; mode?: string; baru?: string }>();
  const id = Number(params.id);
  const mode = (params.mode || undefined) as IzinCapability | undefined;

  const [refreshing, setRefreshing] = useState(false);
  // `baru=1` dari formulir pengajuan: hasil kirim tampil sebagai panel sukses di sini.
  const [pesan, setPesan] = useState<string | null>(params.baru === '1' ? 'Pengajuan terkirim. Status dan riwayatnya dapat dipantau di halaman ini.' : null);

  // P-Sukses (§4.4, TL-07): sesudah pengajuan baru, layar sukses tampil di atas
  // rincian yang sudah dimuat; "Lihat pengajuan" menutupnya. Permintaan tetap
  // POST lalu GET rincian, persis seperti sebelumnya.
  const [suksesBaru, setSuksesBaru] = useState(params.baru === '1');
  // Tindakan sekunder (TL-08) dibuka dari ⋯ dalam lembar bawah.
  const [lembar, setLembar] = useState<'tetapkan' | 'batal' | null>(null);
  const [keputusanDipilih, setKeputusanDipilih] = useState<'Disetujui' | 'Ditolak' | null>(null);
  const [alasan, setAlasan] = useState('');
  const [alasanPenggantian, setAlasanPenggantian] = useState('');
  const [alasanBatal, setAlasanBatal] = useState('');
  const [alasanTetapkan, setAlasanTetapkan] = useState('');
  const [murobiTerpilih, setMurobiTerpilih] = useState<number | null>(null);

  const bersihkan = useCallback(() => {
    setKeputusanDipilih(null);
    setAlasan(''); setAlasanPenggantian(''); setAlasanBatal('');
    setAlasanTetapkan(''); setMurobiTerpilih(null); setPesan(null);
    setLembar(null); setSuksesBaru(false);
  }, []);
  const fetcher = useCallback(async (): Promise<{ detail: IzinDetailResponse; routing: RoutingResponse | null }> => {
    const detail = await api.izinDetail(id, mode);
    const routing = detail.aksi.tetapkan_murobi ? await api.izinRouting(id) : null;
    return { detail, routing };
  }, [id, mode]);
  const { data, error, reject, load: loadPrivate } = usePrivateResource(fetcher, bersihkan);
  const detail = data?.detail ?? null;
  const routing = data?.routing ?? null;
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try { await loadPrivate(); } finally { setRefreshing(false); }
  }, [loadPrivate]);
  const keputusanGuard = useIzinWaliMutation('izin-keputusan', reject);
  const batalGuard = useIzinWaliMutation('izin-batal', reject);
  const tetapkanGuard = useIzinWaliMutation('izin-tetapkan', reject);
  const sedangMutasi = keputusanGuard.isBusy || batalGuard.isBusy || tetapkanGuard.isBusy;

  const putuskan = useCallback(
    async (hasil: 'Disetujui' | 'Ditolak') => {
      if (!detail) return;
      const adminPengganti = detail.aksi.putuskan_admin && !detail.aksi.putuskan_murobi;
      const payload = {
        hasil,
        alasan,
        version: detail.pengajuan.version,
        ...(adminPengganti ? { alasan_penggantian: alasanPenggantian } : {}),
      };
      const hasilMutasi = await keputusanGuard.run(
        JSON.stringify({ id, mode, payload }),
        (key) => api.izinKeputusan(id, payload, key, mode),
      );
      if (hasilMutasi) {
        setKeputusanDipilih(null);
        setPesan(
          hasilMutasi.idempotent_replay
            ? 'Keputusan sudah tercatat sebelumnya; permintaan ulang tidak membuat keputusan kedua.'
            : `Keputusan ${hasilMutasi.status} tersimpan sebagai ${hasilMutasi.kapasitas}.`,
        );
        setAlasan('');
        setAlasanPenggantian('');
        await load(true);
      }
    },
    [alasan, alasanPenggantian, detail, id, keputusanGuard, load, mode],
  );

  const batalkan = useCallback(async (): Promise<boolean> => {
    if (!detail) return false;
    const payload = { alasan: alasanBatal, version: detail.pengajuan.version };
    const hasil = await batalGuard.run(
      JSON.stringify({ id, mode, payload }),
      (key) => api.izinPembatalan(id, payload, key, mode),
    );
    if (hasil) {
      setPesan(
        hasil.idempotent_replay
          ? 'Pembatalan sudah tercatat sebelumnya.'
          : 'Pengajuan dibatalkan. Riwayat sebelumnya tetap tersimpan.',
      );
      setAlasanBatal('');
      await load(true);
      return true;
    }
    return false;
  }, [alasanBatal, batalGuard, detail, id, load, mode]);

  const tujuanMurobi = murobiTerpilih ?? routing?.kandidat[0]?.guru_id ?? routing?.murobi_berhak[0]?.guru_id ?? null;

  const tetapkanMurobi = useCallback(async (): Promise<boolean> => {
    if (!detail || tujuanMurobi === null) return false;
    const payload = {
      murobi_guru_id: tujuanMurobi,
      alasan: alasanTetapkan,
      version: detail.pengajuan.version,
    };
    const hasil = await tetapkanGuard.run(
      JSON.stringify({ id, payload }),
      (key) => api.izinPenetapanMurobi(id, payload, key),
    );
    if (hasil) {
      setPesan('Murobi tujuan ditetapkan. Pengajuan masuk ke antrean murobi tersebut.');
      setAlasanTetapkan('');
      await load(true);
      return true;
    }
    return false;
  }, [alasanTetapkan, detail, id, load, tujuanMurobi, tetapkanGuard]);

  if (error && !detail) {
    return (
      <StackScreen title={JUDUL}>
        <ErrorState message={error} onRetry={() => void load()} />
      </StackScreen>
    );
  }
  if (!detail) {
    return (
      <StackScreen title={JUDUL}>
        <LoadingState label="Memuat detail pengajuan…" />
      </StackScreen>
    );
  }

  const { pengajuan, keputusan, riwayat, koreksi, aksi, scope } = detail;
  const adminPengganti = aksi.putuskan_admin && !aksi.putuskan_murobi;
  const dapatMemutuskan = aksi.putuskan_murobi || aksi.putuskan_admin;
  const daftarMurobi: GuruPilihan[] = routing
    ? routing.kandidat.length > 0
      ? routing.kandidat
      : routing.murobi_berhak
    : [];
  // Satu tindakan utama di bilah bawah, mengikuti `aksi` server: keputusan
  // lebih dulu; tanpa keputusan → penetapan murobi; tanpa keduanya → batal.
  const tetapkanDiBilah = !dapatMemutuskan && aksi.tetapkan_murobi;
  const batalDiBilah = !dapatMemutuskan && !aksi.tetapkan_murobi && aksi.batalkan;
  const adaBilah = dapatMemutuskan || tetapkanDiBilah || batalDiBilah;
  const tombolTetapkan = (
    <AppButton
      label="Tetapkan murobi"
      icon="users"
      style={tetapkanDiBilah ? styles.barButton : undefined}
      loading={tetapkanGuard.isBusy}
      disabled={sedangMutasi || tujuanMurobi === null}
      onPress={() => void tetapkanMurobi()}
    />
  );
  const tombolBatal = (
    <AppButton
      label="Batalkan pengajuan"
      variant={batalDiBilah ? 'outline' : 'danger'}
      style={batalDiBilah ? styles.barButton : undefined}
      loading={batalGuard.isBusy}
      disabled={sedangMutasi}
      onPress={() => void batalkan()}
    />
  );

  const isiTetapkan = (
    <>
      {routing ? (
        <ThemedText selectable type="caption" themeColor="textSecondary">
          {routing.routing.catatan ?? 'Belum ada catatan routing.'}
        </ThemedText>
      ) : null}
      <View accessibilityRole="radiogroup" accessibilityLabel="Pilih murobi tujuan">
        <ChipRow>
          {daftarMurobi.map((guru) => (
            <Chip
              key={guru.guru_id}
              accessibilityRole="radio"
              label={guru.nama}
              selected={guru.guru_id === tujuanMurobi}
              disabled={sedangMutasi}
              style={styles.pilihan}
              onPress={() => setMurobiTerpilih(guru.guru_id)}
            />
          ))}
        </ChipRow>
      </View>
      {daftarMurobi.length === 0 ? (
        <Notice tone="warning" text="Belum ada guru dengan penugasan murobi aktif pada tahun ajaran ini." />
      ) : null}
      <Field
        label="Alasan penetapan"
        hint="Wajib"
        value={alasanTetapkan}
        onChangeText={setAlasanTetapkan}
        editable={!sedangMutasi}
        multiline
        placeholder="Wajib diisi"
      />
      <Notice tone="danger" text={tetapkanGuard.error} />
    </>
  );
  const isiBatal = (
    <>
      <ThemedText selectable type="caption" themeColor="textSecondary">
        Pembatalan hanya dapat dilakukan sebelum ada keputusan dan wajib memuat alasan.
      </ThemedText>
      <Field
        value={alasanBatal}
        onChangeText={setAlasanBatal}
        editable={!sedangMutasi}
        multiline
        placeholder="Alasan pembatalan"
      />
      <Notice tone="danger" text={batalGuard.error} />
    </>
  );
  const tetapkanSekunder = aksi.tetapkan_murobi && !tetapkanDiBilah;
  const batalSekunder = aksi.batalkan && !batalDiBilah;
  const menu = [
    ...(tetapkanSekunder ? [{ label: 'Tetapkan murobi', icon: 'users' as const, onPress: () => setLembar('tetapkan') }] : []),
    ...(batalSekunder ? [{ label: 'Batalkan pengajuan', icon: 'close' as const, danger: true, onPress: () => setLembar('batal') }] : []),
  ];

  if (suksesBaru) {
    return (
      <StackScreen title={JUDUL}>
        <View style={styles.sukses}>
          <SuccessPanel
            title="Pengajuan terkirim"
            message={`Pengajuan izin ${pengajuan.santri.nama} sudah diterima dengan status ${pengajuan.status}. Status dan riwayatnya dapat dipantau di rincian pengajuan.`}>
            <AppButton label="Lihat pengajuan" icon="arrow-right" onPress={() => setSuksesBaru(false)} />
            <AppButton label="Kembali ke Perizinan" variant="line" onPress={() => router.replace('/perizinan')} />
          </SuccessPanel>
        </View>
      </StackScreen>
    );
  }

  // TL-22: tindakan utama di bilah tetap, atau di akhir isi pada teks sangat besar.
  const isiBilah = dapatMemutuskan ? (<>
          <AppButton
            label="Tolak"
            variant="outline"
            icon="close"
            style={styles.barButton}
            loading={keputusanGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => setKeputusanDipilih('Ditolak')}
          />
          <AppButton
            label="Setujui"
            icon="check"
            style={styles.barButtonWide}
            loading={keputusanGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => setKeputusanDipilih('Disetujui')}
          />
        </>) : tetapkanDiBilah ? tombolTetapkan : batalDiBilah ? tombolBatal : null;
  const content = (
    <StackScreen title={JUDUL} subtitle={`#${pengajuan.id}`} menu={menu.length > 0 ? menu : undefined}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, adaBilah && styles.contentWithBar]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        {/* Kartu kepala: santri, pil status besar, dan rentang izin. */}
        <Panel>
          <View style={styles.santriRow}>
            <AvatarInisial nama={pengajuan.santri.nama} ukuran={52} />
            <View style={styles.statusText}>
              <ThemedText selectable type="h2">
                {pengajuan.santri.nama}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                NIS {pengajuan.santri.nis}
              </ThemedText>
            </View>
          </View>
          <View style={styles.statusBesar}>
            <StatusPill label={pengajuan.status} tone={statusPillTone(pengajuan.status)} icon={statusIcon(pengajuan.status)} />
          </View>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            #{pengajuan.id} · {pengajuan.sumber_label}
            {pengajuan.diajukan_pada ? ` · diajukan ${pengajuan.diajukan_pada}` : ''}
          </ThemedText>

          <Divider />

          <View style={styles.rangeRow}>
            <AppIcon name="calendar" size={18} themeColor="primary" />
            <ThemedText selectable type="bodyBold">
              {formatTanggal(pengajuan.tgl_izin)}
            </ThemedText>
            <AppIcon name="arrow-right" size={15} themeColor="textMuted" />
            <ThemedText selectable type="bodyBold">
              {formatTanggal(pengajuan.tgl_kembali)}
            </ThemedText>
          </View>
        </Panel>

        <Notice tone="success" text={pesan} />
        <Notice tone="danger" text={error} />

        <Panel style={styles.rincian}>
          <Overline>Rincian</Overline>
          <InfoRow icon="izin" label="Alasan" value={pengajuan.alasan} />
          {pengajuan.catatan_pengurus ? (
            <InfoRow icon="info" label="Catatan pengurus" value={pengajuan.catatan_pengurus} />
          ) : null}
          <InfoRow icon="person" label="Pengurus" value={pengajuan.pengurus_label || '—'} />
          <InfoRow icon="users" label="Murobi" value={pengajuan.murobi_label || '—'} />
          <InfoRow icon="arrow-right" label="Routing" value={pengajuan.routing.catatan ?? '—'} />
          <InfoRow icon="eye" label="Cakupan Anda" value={scope.label} last />
        </Panel>

        {pengajuan.asal === 'Wali' ? (
          /* V7 Fase 4: pengajuan orang tua yang sudah diteruskan pembimbing.
             Keputusan tetap di layar ini; tahap pembimbing dibaca di rincian V7
             yang memeriksa hak lagi di server. */
          <Panel>
            <Overline>Diajukan orang tua</Overline>
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Pengajuan ini dibuat wali santri dan sudah ditinjau pembimbing sebelum sampai ke tahap murobi.
              Pembatalan hanya dapat dilakukan wali pengaju.
            </ThemedText>
            <AppButton
              label="Lihat tahap pembimbing"
              variant="secondary"
              size="sm"
              onPress={() => router.push({ pathname: '/izin-wali/[id]', params: { id: String(pengajuan.id) } })}
            />
          </Panel>
        ) : null}

        {keputusan ? (
          <Panel style={styles.rincian}>
            <Overline>Keputusan</Overline>
            <InfoRow icon={keputusan.hasil === 'Disetujui' ? 'check' : 'close'} label="Hasil" value={keputusan.hasil} />
            <InfoRow icon="person" label="Kapasitas" value={keputusan.kapasitas} />
            <InfoRow icon="izin" label="Alasan" value={keputusan.alasan} />
            {keputusan.alasan_penggantian ? (
              <InfoRow icon="info" label="Alasan penggantian" value={keputusan.alasan_penggantian} />
            ) : null}
            <InfoRow icon="users" label="Pemberi keputusan" value={keputusan.pemberi_keputusan ?? 'Data warisan'} />
            <InfoRow icon="clock" label="Waktu" value={keputusan.diputus_pada} last />
          </Panel>
        ) : null}

        {scope.hanya_baca ? (
          <Notice
            tone="neutral"
            icon="lock"
            text="Akun orang tua bersifat baca-saja: tidak tersedia tombol pengajuan, keputusan, pembatalan, atau koreksi."
          />
        ) : null}

        {/* Tindakan utama di bilah bawah memerlukan isian di badan layar;
            tindakan sekunder dibuka dari ⋯ (lembar bawah). */}
        {tetapkanDiBilah ? (
          <Panel>
            <Overline>Penetapan / perbaikan routing murobi</Overline>
            {isiTetapkan}
            <ThemedText selectable type="caption" themeColor="textMuted">
              Tombol Tetapkan murobi berada di bawah layar.
            </ThemedText>
          </Panel>
        ) : null}

        {batalDiBilah ? (
          <Panel>
            <Overline>Pembatalan</Overline>
            {isiBatal}
            <ThemedText selectable type="caption" themeColor="textMuted">
              Tombol Batalkan pengajuan berada di bawah layar.
            </ThemedText>
          </Panel>
        ) : null}

        <Panel>
          <View style={styles.timelineHeader}>
            <Overline>Riwayat perubahan</Overline>
            <ThemedText selectable type="caption" themeColor="textMuted">
              {riwayat.length} peristiwa
            </ThemedText>
          </View>
          {riwayat.length === 0 ? (
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Belum ada riwayat tercatat.
            </ThemedText>
          ) : (
            riwayat.map((baris, index) => (
              <View key={baris.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: index === 0 ? theme.primary : theme.border },
                    ]}
                  />
                  {index < riwayat.length - 1 ? (
                    <View style={[styles.timelineLine, { backgroundColor: theme.divider }]} />
                  ) : null}
                </View>
                <View style={styles.timelineBody}>
                  <ThemedText selectable type="label">
                    {baris.peristiwa}
                    {baris.status_sesudah ? ` → ${baris.status_sesudah}` : ''}
                  </ThemedText>
                  <ThemedText selectable type="caption" themeColor="textSecondary">
                    {baris.pelaku_nama ?? 'Data warisan'}
                    {baris.pelaku_kapasitas ? ` (${baris.pelaku_kapasitas})` : ''} · {baris.waktu}
                  </ThemedText>
                  {baris.alasan ? (
                    <ThemedText selectable type="caption" themeColor="textSecondary">
                      {baris.alasan}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Panel>

        {koreksi.length > 0 ? (
          <Panel>
            <Overline>Koreksi keputusan</Overline>
            {koreksi.map((baris) => (
              <View key={baris.id} style={[styles.koreksiItem, { borderTopColor: theme.divider }]}>
                <ThemedText selectable type="label">
                  {baris.hasil_sebelum} → {baris.hasil_sesudah}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  {baris.pelaku_nama ?? 'Data warisan'} · {baris.waktu}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  {baris.alasan_koreksi}
                </ThemedText>
              </View>
            ))}
          </Panel>
        ) : null}
        {!bilahTetap() && isiBilah ? <AksiAkhirIsi>{isiBilah}</AksiAkhirIsi> : null}
      </KeyboardAwareScrollView>

      {bilahTetap() && isiBilah ? <ActionBar>{isiBilah}</ActionBar> : null}
      {lembar === 'tetapkan' && tetapkanSekunder ? (
        <BottomSheet visible keyboardAware title="Tetapkan murobi" onClose={() => { if (!sedangMutasi) setLembar(null); }}>
          {isiTetapkan}
          <AppButton
            label="Tetapkan murobi"
            icon="users"
            loading={tetapkanGuard.isBusy}
            disabled={sedangMutasi || tujuanMurobi === null}
            onPress={() => void tetapkanMurobi().then((ok) => { if (ok) setLembar(null); })}
          />
        </BottomSheet>
      ) : null}
      {lembar === 'batal' && batalSekunder ? (
        <BottomSheet visible keyboardAware title="Batalkan pengajuan" onClose={() => { if (!sedangMutasi) setLembar(null); }}>
          {isiBatal}
          <AppButton
            label="Batalkan pengajuan"
            variant="danger"
            loading={batalGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => void batalkan().then((ok) => { if (ok) setLembar(null); })}
          />
        </BottomSheet>
      ) : null}
      {dapatMemutuskan && keputusanDipilih !== null ? (
        <BottomSheet
          visible
          keyboardAware
          title={keputusanDipilih === 'Disetujui' ? 'Setujui pengajuan' : 'Tolak pengajuan'}
          onClose={() => { if (!sedangMutasi) setKeputusanDipilih(null); }}>
          {adminPengganti ? (
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Admin memutus sebagai Admin Pengganti. Alasan penggantian wajib diisi dan tercatat pada audit.
            </ThemedText>
          ) : null}
          <Field
            label="Alasan keputusan"
            hint="Wajib"
            value={alasan}
            onChangeText={setAlasan}
            editable={!sedangMutasi}
            multiline
            placeholder="Minimal 3 karakter"
          />
          {adminPengganti ? (
            <Field
              label="Alasan penggantian murobi"
              hint="Wajib"
              value={alasanPenggantian}
              onChangeText={setAlasanPenggantian}
              editable={!sedangMutasi}
              multiline
              placeholder="Wajib diisi"
            />
          ) : null}
          <Notice tone="danger" text={keputusanGuard.error} />
          <AppButton
            label={keputusanDipilih === 'Disetujui' ? 'Konfirmasi setujui' : 'Konfirmasi tolak'}
            variant={keputusanDipilih === 'Ditolak' ? 'danger' : 'primary'}
            loading={keputusanGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => void putuskan(keputusanDipilih)}
          />
        </BottomSheet>
      ) : null}
    </StackScreen>
  );
  return pengajuan.asal === 'Wali' ? <IzinWaliProtection fallbackTitle={JUDUL}>{content}</IzinWaliProtection> : content;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  contentWithBar: { paddingBottom: 24 },
  statusText: { flex: 1, gap: 2 },
  santriRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Pil status diperbesar (datar, ikon + teks) sebagai penanda utama kartu.
  statusBesar: { transform: [{ scale: 1.15 }], transformOrigin: 'left center', paddingVertical: 2 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  rincian: { gap: 0 },
  pilihan: { minHeight: 44 },
  timelineHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 10, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: Radius.pill, marginTop: 5 },
  timelineLine: { flex: 1, width: 2, marginTop: 3 },
  timelineBody: { flex: 1, gap: 2, paddingBottom: 12 },
  koreksiItem: { borderTopWidth: 1, paddingTop: 9, gap: 2 },
  barButton: { flex: 1 },
  barButtonWide: { flex: 1.35 },
  sukses: { flex: 1, justifyContent: 'center', paddingHorizontal: Layout.screen, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
