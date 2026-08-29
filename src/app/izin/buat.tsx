import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { IzinCapability, SantriPilihan } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { formatTanggal } from '@/components/izin-card';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field, SearchField } from '@/components/ui/app-field';
import { Badge } from '@/components/ui/chip';
import { Stepper } from '@/components/ui/stepper';
import { Overline, Panel } from '@/components/ui/surface';
import { Radius } from '@/constants/theme';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { useTheme } from '@/hooks/use-theme';

type Langkah = 'pilih' | 'isi' | 'konfirmasi';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const LANGKAH: Langkah[] = ['pilih', 'isi', 'konfirmasi'];
const LABEL_LANGKAH = ['Pilih santri', 'Data izin', 'Tinjau'];

/**
 * Alur pengurus membuat pengajuan (PRD V2 Fase 3 §5):
 * cari santri dalam cakupan → isi → tinjau & konfirmasi → kirim.
 *
 * Daftar santri berasal dari endpoint bercakupan server; mengetik ID santri di
 * luar cakupan tidak mungkin dilakukan dari layar ini, dan seandainya dipaksa
 * lewat API, server tetap menolaknya dengan 403.
 *
 * Redesain V2 hanya mengubah penyajiannya: penanda langkah menunjukkan posisi
 * dalam alur, dan tombol maju/mundur pindah ke bilah tetap di dasar layar.
 * Aturan validasi dan muatan yang dikirim tidak berubah sama sekali.
 */
export default function BuatPengajuanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode || undefined) as IzinCapability | undefined;

  const [langkah, setLangkah] = useState<Langkah>('pilih');
  const [pencarian, setPencarian] = useState('');
  const [kataKunci, setKataKunci] = useState('');
  const [santri, setSantri] = useState<SantriPilihan[]>([]);
  const [terpilih, setTerpilih] = useState<SantriPilihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tglIzin, setTglIzin] = useState('');
  const [tglKembali, setTglKembali] = useState('');
  const [alasan, setAlasan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [validasi, setValidasi] = useState<string | null>(null);

  const guard = useMutationGuard('izin-create');

  const muatSantri = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasil = await api.izinSantri(mode, kataKunci, 1, 50);
      setSantri(hasil.items);
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
    }
  }, [kataKunci, mode]);

  useFocusEffect(
    useCallback(() => {
      void muatSantri();
    }, [muatSantri]),
  );

  const periksaIsian = useCallback((): string | null => {
    if (!terpilih) return 'Pilih santri terlebih dahulu.';
    if (!POLA_TANGGAL.test(tglIzin)) return 'Tanggal izin wajib berformat YYYY-MM-DD.';
    if (!POLA_TANGGAL.test(tglKembali)) return 'Tanggal kembali wajib berformat YYYY-MM-DD.';
    if (tglKembali < tglIzin) return 'Tanggal kembali tidak boleh mendahului tanggal izin.';
    if (alasan.trim().length < 3) return 'Alasan izin wajib diisi minimal 3 karakter.';
    return null;
  }, [alasan, terpilih, tglIzin, tglKembali]);

  const kirim = useCallback(async () => {
    const masalah = periksaIsian();
    if (masalah !== null || !terpilih) {
      setValidasi(masalah);
      return;
    }
    setValidasi(null);
    const payload = {
      santri_id: terpilih.id,
      tgl_izin: tglIzin,
      tgl_kembali: tglKembali,
      alasan: alasan.trim(),
      catatan_pengurus: catatan.trim(),
    };
    const hasil = await guard.run(
      JSON.stringify({ payload, mode }),
      (key) => api.izinBuat(payload, key, mode),
    );
    if (hasil) {
      router.replace({ pathname: '/izin/[id]', params: { id: String(hasil.id), mode: mode ?? '' } });
    }
  }, [alasan, catatan, guard, mode, periksaIsian, router, terpilih, tglIzin, tglKembali]);

  // Keterangan lama izin; murni tampilan, tidak ikut dikirim ke server.
  const lamaHari = useMemo(() => {
    if (!POLA_TANGGAL.test(tglIzin) || !POLA_TANGGAL.test(tglKembali)) return null;
    const a = new Date(`${tglIzin}T00:00:00`);
    const b = new Date(`${tglKembali}T00:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    const hari = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
    return hari > 0 ? hari : null;
  }, [tglIzin, tglKembali]);

  if (loading && santri.length === 0 && langkah === 'pilih') {
    return <LoadingState label="Memuat santri dalam cakupan Anda…" />;
  }
  if (error && santri.length === 0) {
    return <ErrorState message={error} onRetry={() => void muatSantri()} />;
  }

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <Stepper steps={LABEL_LANGKAH} current={LANGKAH.indexOf(langkah)} />

        {langkah === 'pilih' ? (
          <>
            <SearchField
              value={pencarian}
              onChangeText={setPencarian}
              placeholder="Cari nama santri atau NIS"
              onSubmitEditing={() => setKataKunci(pencarian.trim())}
              trailing={
                pencarian.trim() !== kataKunci ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cari santri"
                    onPress={() => setKataKunci(pencarian.trim())}
                    hitSlop={8}>
                    <ThemedText selectable type="label" themeColor="primary">
                      Cari
                    </ThemedText>
                  </Pressable>
                ) : null
              }
            />

            {santri.length === 0 ? (
              <EmptyState
                title="Tidak ada santri dalam cakupan"
                message="Belum ada penugasan pembimbing aktif untuk akun ini, atau pencarian terlalu sempit. Hubungi admin bila seharusnya ada."
              />
            ) : (
              <View accessibilityRole="radiogroup" accessibilityLabel="Pilih santri" style={styles.list}>
                {santri.map((item) => {
                  const dipilih = terpilih?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: dipilih }}
                      onPress={() => setTerpilih(item)}
                      style={({ pressed }) => [
                        styles.santriCard,
                        {
                          backgroundColor: dipilih ? theme.primarySoft : theme.card,
                          borderColor: dipilih ? theme.primary : theme.border,
                          borderWidth: dipilih ? 1.5 : 1,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      <View style={styles.santriText}>
                        <ThemedText selectable type="h3">
                          {item.nama}
                        </ThemedText>
                        <ThemedText selectable type="caption" themeColor="textMuted">
                          NIS {item.nis}
                          {item.cakupan ? ` · ${item.cakupan}` : ''}
                        </ThemedText>
                      </View>
                      {dipilih ? <AppIcon name="check" size={20} themeColor="primary" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {langkah === 'isi' ? (
          <>
            <View
              style={[
                styles.selected,
                { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder },
              ]}>
              <View style={[styles.avatar, { backgroundColor: theme.card }]}>
                <ThemedText selectable type="label" themeColor="primary">
                  {(terpilih?.nama ?? '').slice(0, 2).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.santriText}>
                <ThemedText selectable type="bodyBold">
                  {terpilih?.nama}
                </ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">
                  NIS {terpilih?.nis}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ubah pilihan santri"
                onPress={() => setLangkah('pilih')}
                hitSlop={8}>
                <ThemedText selectable type="label" themeColor="primary">
                  Ubah
                </ThemedText>
              </Pressable>
            </View>

            <Panel>
              <Overline>Rentang izin</Overline>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Field
                    label="Mulai"
                    icon="calendar"
                    value={tglIzin}
                    onChangeText={setTglIzin}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.field}>
                  <Field
                    label="Kembali"
                    icon="calendar"
                    value={tglKembali}
                    onChangeText={setTglKembali}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
              {lamaHari ? (
                <View style={styles.durasi}>
                  <Badge label={`${lamaHari} hari`} />
                  <ThemedText selectable type="caption" themeColor="textMuted">
                    Dihitung otomatis dari rentang tanggal.
                  </ThemedText>
                </View>
              ) : null}
            </Panel>

            <Field
              label="Alasan izin"
              value={alasan}
              onChangeText={setAlasan}
              multiline
              placeholder="Minimal 3 karakter"
            />
            <Field
              label="Catatan pengurus"
              hint="Opsional"
              value={catatan}
              onChangeText={setCatatan}
              multiline
              placeholder="Catatan tambahan"
            />

            {validasi ? (
              <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="polite">
                {validasi}
              </ThemedText>
            ) : null}

            <View
              style={[styles.hint, { backgroundColor: theme.backgroundElement }]}>
              <AppIcon name="info" size={17} themeColor="textSecondary" />
              <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.hintText}>
                Setelah dikirim, pengajuan diteruskan ke murobi santri. Bila kandidatnya tidak
                tunggal, admin akan menetapkannya.
              </ThemedText>
            </View>
          </>
        ) : null}

        {langkah === 'konfirmasi' ? (
          <Panel>
            <Overline>Tinjau sebelum mengirim</Overline>
            <Baris label="Santri" nilai={`${terpilih?.nama} (NIS ${terpilih?.nis})`} />
            <Baris
              label="Rentang"
              nilai={`${formatTanggal(tglIzin)} → ${formatTanggal(tglKembali)}${lamaHari ? ` · ${lamaHari} hari` : ''}`}
            />
            <Baris label="Alasan" nilai={alasan.trim()} />
            {catatan.trim() ? <Baris label="Catatan" nilai={catatan.trim()} /> : null}
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Setelah dikirim, sistem menentukan murobi tujuan secara otomatis. Bila kandidatnya
              tidak tunggal, pengajuan masuk ke antrean penetapan admin.
            </ThemedText>
            {guard.error ? (
              <ThemedText selectable type="caption" themeColor="danger">
                {guard.error}
              </ThemedText>
            ) : null}
          </Panel>
        ) : null}
      </KeyboardAwareScrollView>

      <ActionBar>
        {langkah === 'pilih' ? (
          <AppButton
            label="Lanjut isi data izin"
            style={styles.grow}
            disabled={terpilih === null}
            onPress={() => setLangkah('isi')}
          />
        ) : langkah === 'isi' ? (
          <>
            <AppButton
              label="Kembali"
              variant="secondary"
              style={styles.narrow}
              onPress={() => setLangkah('pilih')}
            />
            <AppButton
              label="Tinjau pengajuan"
              style={styles.grow}
              onPress={() => {
                const masalah = periksaIsian();
                setValidasi(masalah);
                if (masalah === null) setLangkah('konfirmasi');
              }}
            />
          </>
        ) : (
          <>
            <AppButton
              label="Ubah data"
              variant="secondary"
              style={styles.narrow}
              disabled={guard.isBusy}
              onPress={() => setLangkah('isi')}
            />
            <AppButton
              label="Kirim pengajuan"
              style={styles.grow}
              loading={guard.isBusy}
              disabled={guard.isBusy}
              onPress={() => void kirim()}
            />
          </>
        )}
      </ActionBar>
    </View>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={styles.baris}>
      <ThemedText selectable type="caption" themeColor="textMuted" style={styles.barisLabel}>
        {label}
      </ThemedText>
      <ThemedText selectable type="caption" style={styles.barisNilai}>
        {nilai}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  list: { gap: 8 },
  santriCard: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  santriText: { flex: 1, gap: 2 },
  selected: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  durasi: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    padding: 12,
  },
  hintText: { flex: 1 },
  baris: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  barisLabel: { width: 92 },
  barisNilai: { flex: 1, minWidth: 140, fontWeight: '600' },
  grow: { flex: 1 },
  narrow: { width: 118 },
});
