import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { GuruPilihan, IzinCapability, IzinDetailResponse, RoutingResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { StatusBadge, formatTanggal, statusColor } from '@/components/izin-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Divider, Overline, Panel } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
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
 */
export default function IzinDetailScreen() {
  const { fontScale } = useWindowDimensions();

  // iOS dapat mempertahankan pengukuran ScrollView lama ketika Dynamic Type
  // diubah saat layar aktif. Remount terarah mencegah judul/status terpotong.
  return <IzinDetailSession key={fontScale} fontScale={fontScale} />;
}

function IzinDetailSession({ fontScale }: { fontScale: number }) {
  const router = useRouter();
  const theme = useTheme();
  const teksBesar = fontScale >= 1.6;
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const id = Number(params.id);
  const mode = (params.mode || undefined) as IzinCapability | undefined;

  const [detail, setDetail] = useState<IzinDetailResponse | null>(null);
  const [routing, setRouting] = useState<RoutingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const [alasan, setAlasan] = useState('');
  const [alasanPenggantian, setAlasanPenggantian] = useState('');
  const [alasanBatal, setAlasanBatal] = useState('');
  const [alasanTetapkan, setAlasanTetapkan] = useState('');
  const [murobiTerpilih, setMurobiTerpilih] = useState<number | null>(null);

  const keputusanGuard = useMutationGuard('izin-keputusan');
  const batalGuard = useMutationGuard('izin-batal');
  const tetapkanGuard = useMutationGuard('izin-tetapkan');
  const sedangMutasi = keputusanGuard.isBusy || batalGuard.isBusy || tetapkanGuard.isBusy;

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const hasil = await api.izinDetail(id, mode);
        setDetail(hasil);
        if (hasil.aksi.tetapkan_murobi) {
          const rute = await api.izinRouting(id);
          setRouting(rute);
          setMurobiTerpilih(
            (current) => current ?? rute.kandidat[0]?.guru_id ?? rute.murobi_berhak[0]?.guru_id ?? null,
          );
        } else {
          setRouting(null);
        }
      } catch (caught) {
        setError(actionableError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, mode],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const batalkan = useCallback(async () => {
    if (!detail) return;
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
    }
  }, [alasanBatal, batalGuard, detail, id, load, mode]);

  const tetapkanMurobi = useCallback(async () => {
    if (!detail || murobiTerpilih === null) return;
    const payload = {
      murobi_guru_id: murobiTerpilih,
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
    }
  }, [alasanTetapkan, detail, id, load, murobiTerpilih, tetapkanGuard]);

  if (loading && !detail) return <LoadingState label="Memuat detail pengajuan…" />;
  if (error && !detail) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!detail) return <EmptyState title="Pengajuan tidak tersedia" message="Kembali lalu muat ulang daftar." />;

  const { pengajuan, keputusan, riwayat, koreksi, aksi, scope } = detail;
  const adminPengganti = aksi.putuskan_admin && !aksi.putuskan_murobi;
  const dapatMemutuskan = aksi.putuskan_murobi || aksi.putuskan_admin;
  const daftarMurobi: GuruPilihan[] = routing
    ? routing.kandidat.length > 0
      ? routing.kandidat
      : routing.murobi_berhak
    : [];

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, dapatMemutuskan && styles.contentWithBar]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
        }>
        {/* Kepala: status besar, identitas santri, dan rentang izin. */}
        <Panel>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusIcon, { backgroundColor: theme.backgroundElement }]}>
              <AppIcon
                name={
                  pengajuan.status === 'Disetujui'
                    ? 'check'
                    : pengajuan.status === 'Ditolak' || pengajuan.status === 'Dibatalkan'
                      ? 'close'
                      : 'clock'
                }
                size={22}
                color={statusColor(pengajuan.status, theme)}
              />
            </View>
            <View style={styles.statusText}>
              <ThemedText selectable type="h2" style={{ color: statusColor(pengajuan.status, theme) }}>
                {pengajuan.status}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                #{pengajuan.id} · {pengajuan.sumber_label}
                {pengajuan.diajukan_pada ? ` · diajukan ${pengajuan.diajukan_pada}` : ''}
              </ThemedText>
            </View>
            {teksBesar ? null : <StatusBadge status={pengajuan.status} />}
          </View>

          <Divider />

          <View style={styles.santriRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <ThemedText selectable type="label" themeColor="primary">
                {pengajuan.santri.nama.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.statusText}>
              <ThemedText selectable type="h3">
                {pengajuan.santri.nama}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textMuted">
                NIS {pengajuan.santri.nis}
              </ThemedText>
            </View>
          </View>

          <View style={styles.rangeRow}>
            <ThemedText selectable type="bodyBold">
              {formatTanggal(pengajuan.tgl_izin)}
            </ThemedText>
            <AppIcon name="arrow-right" size={15} themeColor="textMuted" />
            <ThemedText selectable type="bodyBold">
              {formatTanggal(pengajuan.tgl_kembali)}
            </ThemedText>
          </View>
        </Panel>

        {pesan ? (
          <View style={[styles.notice, { borderColor: theme.success, backgroundColor: theme.primarySoft }]}>
            <ThemedText selectable type="caption" themeColor="success">
              {pesan}
            </ThemedText>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.notice, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}>
            <ThemedText selectable type="caption" themeColor="danger">
              {error}
            </ThemedText>
          </View>
        ) : null}

        <Panel>
          <Overline>Rincian</Overline>
          <Baris label="Alasan" nilai={pengajuan.alasan} />
          {pengajuan.catatan_pengurus ? (
            <Baris label="Catatan pengurus" nilai={pengajuan.catatan_pengurus} />
          ) : null}
          <Baris label="Pengurus" nilai={pengajuan.pengurus_label || '—'} />
          <Baris label="Murobi" nilai={pengajuan.murobi_label || '—'} />
          <Baris label="Routing" nilai={pengajuan.routing.catatan ?? '—'} />
          <Baris label="Cakupan Anda" nilai={scope.label} />
        </Panel>

        {keputusan ? (
          <Panel>
            <Overline>Keputusan</Overline>
            <Baris label="Hasil" nilai={keputusan.hasil} />
            <Baris label="Kapasitas" nilai={keputusan.kapasitas} />
            <Baris label="Alasan" nilai={keputusan.alasan} />
            {keputusan.alasan_penggantian ? (
              <Baris label="Alasan penggantian" nilai={keputusan.alasan_penggantian} />
            ) : null}
            <Baris label="Pemberi keputusan" nilai={keputusan.pemberi_keputusan ?? 'Data warisan'} />
            <Baris label="Waktu" nilai={keputusan.diputus_pada} />
          </Panel>
        ) : null}

        {scope.hanya_baca ? (
          <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Akun orang tua bersifat baca-saja: tidak tersedia tombol pengajuan, keputusan,
              pembatalan, atau koreksi.
            </ThemedText>
          </View>
        ) : null}

        {dapatMemutuskan ? (
          <Panel>
            <Overline>{adminPengganti ? 'Keputusan Admin Pengganti' : 'Keputusan murobi'}</Overline>
            {adminPengganti ? (
              <ThemedText selectable type="caption" themeColor="textSecondary">
                Admin memutus sebagai Admin Pengganti. Alasan penggantian wajib diisi dan tercatat
                pada audit.
              </ThemedText>
            ) : null}
            <Field
              label="Alasan keputusan"
              value={alasan}
              onChangeText={setAlasan}
              editable={!sedangMutasi}
              multiline
              placeholder="Minimal 3 karakter"
            />
            {adminPengganti ? (
              <Field
                label="Alasan penggantian murobi"
                value={alasanPenggantian}
                onChangeText={setAlasanPenggantian}
                editable={!sedangMutasi}
                multiline
                placeholder="Wajib diisi"
              />
            ) : null}
            {keputusanGuard.error ? (
              <ThemedText selectable type="caption" themeColor="danger">
                {keputusanGuard.error}
              </ThemedText>
            ) : null}
            <ThemedText selectable type="caption" themeColor="textMuted">
              Tombol Setujui dan Tolak berada di bawah layar.
            </ThemedText>
          </Panel>
        ) : null}

        {aksi.tetapkan_murobi ? (
          <Panel>
            <Overline>Penetapan / perbaikan routing murobi</Overline>
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
                    selected={guru.guru_id === murobiTerpilih}
                    disabled={sedangMutasi}
                    onPress={() => setMurobiTerpilih(guru.guru_id)}
                  />
                ))}
              </ChipRow>
            </View>
            {daftarMurobi.length === 0 ? (
              <ThemedText selectable type="caption" themeColor="warning">
                Belum ada guru dengan penugasan murobi aktif pada tahun ajaran ini.
              </ThemedText>
            ) : null}
            <Field
              label="Alasan penetapan"
              value={alasanTetapkan}
              onChangeText={setAlasanTetapkan}
              editable={!sedangMutasi}
              multiline
              placeholder="Wajib diisi"
            />
            {tetapkanGuard.error ? (
              <ThemedText selectable type="caption" themeColor="danger">
                {tetapkanGuard.error}
              </ThemedText>
            ) : null}
            <AppButton
              label="Tetapkan murobi"
              icon="users"
              loading={tetapkanGuard.isBusy}
              disabled={sedangMutasi || murobiTerpilih === null}
              onPress={() => void tetapkanMurobi()}
            />
          </Panel>
        ) : null}

        {aksi.batalkan ? (
          <Panel>
            <Overline>Pembatalan</Overline>
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
            {batalGuard.error ? (
              <ThemedText selectable type="caption" themeColor="danger">
                {batalGuard.error}
              </ThemedText>
            ) : null}
            <AppButton
              label="Batalkan pengajuan"
              variant="danger"
              loading={batalGuard.isBusy}
              disabled={sedangMutasi}
              onPress={() => void batalkan()}
            />
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
                  <ThemedText selectable type="caption" themeColor="textMuted">
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
                <ThemedText selectable type="caption" themeColor="textMuted">
                  {baris.pelaku_nama ?? 'Data warisan'} · {baris.waktu}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  {baris.alasan_koreksi}
                </ThemedText>
              </View>
            ))}
          </Panel>
        ) : null}

        {dapatMemutuskan ? null : (
          <AppButton label="Kembali ke daftar" variant="secondary" onPress={() => router.back()} />
        )}
      </KeyboardAwareScrollView>

      {dapatMemutuskan ? (
        <ActionBar>
          <AppButton
            label="Tolak"
            variant="outline"
            icon="close"
            style={styles.barButton}
            loading={keputusanGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => void putuskan('Ditolak')}
          />
          <AppButton
            label="Setujui"
            icon="check"
            style={styles.barButtonWide}
            loading={keputusanGuard.isBusy}
            disabled={sedangMutasi}
            onPress={() => void putuskan('Disetujui')}
          />
        </ActionBar>
      ) : null}
    </View>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  const { fontScale } = useWindowDimensions();
  const teksBesar = fontScale >= 1.6;
  return (
    <View style={[styles.baris, teksBesar && styles.barisLarge]}>
      <ThemedText
        selectable
        type="caption"
        themeColor="textMuted"
        style={[styles.barisLabel, teksBesar && styles.barisLabelLarge]}>
        {label}
      </ThemedText>
      <ThemedText
        selectable
        type="caption"
        style={[styles.barisNilai, teksBesar && styles.barisNilaiLarge]}>
        {nilai}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  contentWithBar: { paddingBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1, gap: 2 },
  santriRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  barisLarge: { flexDirection: 'column', gap: 2 },
  barisLabel: { width: 116 },
  barisLabelLarge: { width: 'auto' },
  barisNilai: { flex: 1, minWidth: 140, fontWeight: '600' },
  barisNilaiLarge: { flex: 0, minWidth: 0, width: '100%' },
  notice: { borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: 12 },
  timelineHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 10, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: 999, marginTop: 5 },
  timelineLine: { flex: 1, width: 2, marginTop: 3 },
  timelineBody: { flex: 1, gap: 2, paddingBottom: 12 },
  koreksiItem: { borderTopWidth: 1, paddingTop: 9, gap: 2 },
  barButton: { flex: 1 },
  barButtonWide: { flex: 1.35 },
});
