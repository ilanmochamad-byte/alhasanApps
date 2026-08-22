import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { GuruPilihan, IzinCapability, IzinDetailResponse, RoutingResponse } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { StatusBadge, formatTanggal } from '@/components/izin-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { useTheme } from '@/hooks/use-theme';

/**
 * Detail pengajuan izin dengan tindakan sesuai kemampuan (PRD V2 Fase 3 §6–§9).
 *
 * Tindakan yang ditampilkan berasal dari `aksi` yang dihitung server untuk
 * cakupan pengguna. Selama satu mutasi berjalan seluruh tombol dinonaktifkan
 * dan percobaan ulang memakai kunci idempotensi yang sama (lihat
 * `useMutationGuard`), sehingga tidak pernah ada pengajuan/keputusan ganda.
 */
export default function IzinDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
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
          setMurobiTerpilih((current) => current ?? rute.kandidat[0]?.guru_id ?? rute.murobi_berhak[0]?.guru_id ?? null);
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
  const daftarMurobi: GuruPilihan[] = routing
    ? routing.kandidat.length > 0
      ? routing.kandidat
      : routing.murobi_berhak
    : [];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.headerRow, teksBesar && styles.headerRowLarge]}>
          <ThemedText selectable style={styles.title}>
            #{pengajuan.id} · {pengajuan.santri.nama}
          </ThemedText>
          <StatusBadge status={pengajuan.status} />
        </View>
        <Baris label="NIS" nilai={pengajuan.santri.nis} />
        <Baris label="Rentang izin" nilai={`${formatTanggal(pengajuan.tgl_izin)} → ${formatTanggal(pengajuan.tgl_kembali)}`} />
        <Baris label="Alasan" nilai={pengajuan.alasan} />
        {pengajuan.catatan_pengurus ? <Baris label="Catatan pengurus" nilai={pengajuan.catatan_pengurus} /> : null}
        <Baris label="Pengurus" nilai={pengajuan.pengurus_label || '—'} />
        <Baris label="Murobi" nilai={pengajuan.murobi_label || '—'} />
        <Baris label="Routing" nilai={pengajuan.routing.catatan ?? '—'} />
        <Baris label="Sumber" nilai={pengajuan.sumber_label} />
        <Baris label="Cakupan Anda" nilai={scope.label} />
      </View>

      {pesan ? (
        <View style={[styles.notice, { borderColor: theme.success }]}>
          <ThemedText selectable type="small" themeColor="success">
            {pesan}
          </ThemedText>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.notice, { borderColor: theme.danger }]}>
          <ThemedText selectable type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}

      {keputusan ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Keputusan
          </ThemedText>
          <Baris label="Hasil" nilai={keputusan.hasil} />
          <Baris label="Kapasitas" nilai={keputusan.kapasitas} />
          <Baris label="Alasan" nilai={keputusan.alasan} />
          {keputusan.alasan_penggantian ? <Baris label="Alasan penggantian" nilai={keputusan.alasan_penggantian} /> : null}
          <Baris label="Pemberi keputusan" nilai={keputusan.pemberi_keputusan ?? 'Data warisan'} />
          <Baris label="Waktu" nilai={keputusan.diputus_pada} />
        </View>
      ) : null}

      {scope.hanya_baca ? (
        <View style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText selectable type="small" themeColor="textSecondary">
            Akun orang tua bersifat baca-saja: tidak tersedia tombol pengajuan, keputusan, pembatalan, atau koreksi.
          </ThemedText>
        </View>
      ) : null}

      {aksi.putuskan_murobi || aksi.putuskan_admin ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            {adminPengganti ? 'Keputusan Admin Pengganti' : 'Keputusan murobi'}
          </ThemedText>
          {adminPengganti ? (
            <ThemedText selectable type="small" themeColor="textSecondary">
              Admin memutus sebagai Admin Pengganti. Alasan penggantian wajib diisi dan tercatat pada audit.
            </ThemedText>
          ) : null}
          <ThemedText selectable type="smallBold">Alasan keputusan</ThemedText>
          <TextInput
            value={alasan}
            onChangeText={setAlasan}
            editable={!sedangMutasi}
            multiline
            placeholder="Minimal 3 karakter"
            placeholderTextColor={theme.textSecondary}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
          {adminPengganti ? (
            <>
              <ThemedText selectable type="smallBold">Alasan penggantian murobi</ThemedText>
              <TextInput
                value={alasanPenggantian}
                onChangeText={setAlasanPenggantian}
                editable={!sedangMutasi}
                multiline
                placeholder="Wajib diisi"
                placeholderTextColor={theme.textSecondary}
                style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
              />
            </>
          ) : null}
          {keputusanGuard.error ? (
            <ThemedText selectable type="small" themeColor="danger">
              {keputusanGuard.error}
            </ThemedText>
          ) : null}
          <View style={styles.buttonRow}>
            <View style={styles.buttonCell}>
              <AppButton
                label="Setujui"
                loading={keputusanGuard.isBusy}
                disabled={sedangMutasi}
                onPress={() => void putuskan('Disetujui')}
              />
            </View>
            <View style={styles.buttonCell}>
              <AppButton
                label="Tolak"
                variant="danger"
                loading={keputusanGuard.isBusy}
                disabled={sedangMutasi}
                onPress={() => void putuskan('Ditolak')}
              />
            </View>
          </View>
        </View>
      ) : null}

      {aksi.tetapkan_murobi ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Penetapan / perbaikan routing murobi
          </ThemedText>
          {routing ? (
            <ThemedText selectable type="small" themeColor="textSecondary">
              {routing.routing.catatan ?? 'Belum ada catatan routing.'}
            </ThemedText>
          ) : null}
          <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel="Pilih murobi tujuan">
            {daftarMurobi.map((guru) => {
              const dipilih = guru.guru_id === murobiTerpilih;
              return (
                <Pressable
                  key={guru.guru_id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: dipilih, disabled: sedangMutasi }}
                  disabled={sedangMutasi}
                  onPress={() => setMurobiTerpilih(guru.guru_id)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: dipilih ? theme.primary : theme.backgroundElement,
                      borderColor: dipilih ? theme.primary : theme.border,
                      opacity: sedangMutasi ? 0.55 : pressed ? 0.8 : 1,
                    },
                  ]}>
                  <ThemedText selectable type="smallBold" style={{ color: dipilih ? theme.onPrimary : theme.text }}>
                    {guru.nama}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {daftarMurobi.length === 0 ? (
            <ThemedText selectable type="small" themeColor="warning">
              Belum ada guru dengan penugasan murobi aktif pada tahun ajaran ini.
            </ThemedText>
          ) : null}
          <ThemedText selectable type="smallBold">Alasan penetapan</ThemedText>
          <TextInput
            value={alasanTetapkan}
            onChangeText={setAlasanTetapkan}
            editable={!sedangMutasi}
            multiline
            placeholder="Wajib diisi"
            placeholderTextColor={theme.textSecondary}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
          {tetapkanGuard.error ? (
            <ThemedText selectable type="small" themeColor="danger">
              {tetapkanGuard.error}
            </ThemedText>
          ) : null}
          <AppButton
            label="Tetapkan murobi"
            loading={tetapkanGuard.isBusy}
            disabled={sedangMutasi || murobiTerpilih === null}
            onPress={() => void tetapkanMurobi()}
          />
        </View>
      ) : null}

      {aksi.batalkan ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Pembatalan
          </ThemedText>
          <ThemedText selectable type="small" themeColor="textSecondary">
            Pembatalan hanya dapat dilakukan sebelum ada keputusan dan wajib memuat alasan.
          </ThemedText>
          <TextInput
            value={alasanBatal}
            onChangeText={setAlasanBatal}
            editable={!sedangMutasi}
            multiline
            placeholder="Alasan pembatalan"
            placeholderTextColor={theme.textSecondary}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
          {batalGuard.error ? (
            <ThemedText selectable type="small" themeColor="danger">
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
        </View>
      ) : null}

      <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText selectable style={styles.panelTitle}>
          Riwayat perubahan
        </ThemedText>
        {riwayat.length === 0 ? (
          <ThemedText selectable type="small" themeColor="textSecondary">
            Belum ada riwayat tercatat.
          </ThemedText>
        ) : (
          riwayat.map((baris) => (
            <View key={baris.id} style={[styles.timelineItem, { borderColor: theme.border }]}>
              <ThemedText selectable type="smallBold">
                {baris.peristiwa}
                {baris.status_sesudah ? ` → ${baris.status_sesudah}` : ''}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                {baris.pelaku_nama ?? 'Data warisan'}
                {baris.pelaku_kapasitas ? ` (${baris.pelaku_kapasitas})` : ''} · {baris.waktu}
              </ThemedText>
              {baris.alasan ? <ThemedText selectable type="small">{baris.alasan}</ThemedText> : null}
            </View>
          ))
        )}
      </View>

      {koreksi.length > 0 ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Koreksi keputusan
          </ThemedText>
          {koreksi.map((baris) => (
            <View key={baris.id} style={[styles.timelineItem, { borderColor: theme.border }]}>
              <ThemedText selectable type="smallBold">
                {baris.hasil_sebelum} → {baris.hasil_sesudah}
              </ThemedText>
              <ThemedText selectable type="small" themeColor="textSecondary">
                {baris.pelaku_nama ?? 'Data warisan'} · {baris.waktu}
              </ThemedText>
              <ThemedText selectable type="small">{baris.alasan_koreksi}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <AppButton label="Kembali ke daftar" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  const { fontScale } = useWindowDimensions();
  const teksBesar = fontScale >= 1.6;
  return (
    <View style={[styles.baris, teksBesar && styles.barisLarge]}>
      <ThemedText selectable type="small" themeColor="textSecondary" style={[styles.barisLabel, teksBesar && styles.barisLabelLarge]}>
        {label}
      </ThemedText>
      <ThemedText selectable style={[styles.barisNilai, teksBesar && styles.barisNilaiLarge]}>
        {nilai}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 9 },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerRowLarge: { alignItems: 'flex-start', flexDirection: 'column' },
  title: { fontSize: 19, fontWeight: '900', flexShrink: 1 },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barisLarge: { flexDirection: 'column' },
  barisLabel: { width: 132 },
  barisLabelLarge: { width: 'auto' },
  barisNilai: { flex: 1, minWidth: 140 },
  barisNilaiLarge: { flex: 0, minWidth: 0, width: '100%' },
  textarea: { minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  buttonCell: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 12 },
  timelineItem: { borderTopWidth: 1, paddingTop: 9, gap: 2 },
});
