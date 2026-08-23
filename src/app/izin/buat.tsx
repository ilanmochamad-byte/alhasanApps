import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { IzinCapability, SantriPilihan } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { formatTanggal } from '@/components/izin-card';
import { ThemedText } from '@/components/themed-text';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { useTheme } from '@/hooks/use-theme';

type Langkah = 'pilih' | 'isi' | 'konfirmasi';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Alur pengurus membuat pengajuan (PRD V2 Fase 3 §5):
 * cari santri dalam cakupan → isi → tinjau & konfirmasi → kirim.
 *
 * Daftar santri berasal dari endpoint bercakupan server; mengetik ID santri di
 * luar cakupan tidak mungkin dilakukan dari layar ini, dan seandainya dipaksa
 * lewat API, server tetap menolaknya dengan 403.
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

  if (loading && santri.length === 0 && langkah === 'pilih') {
    return <LoadingState label="Memuat santri dalam cakupan Anda…" />;
  }
  if (error && santri.length === 0) {
    return <ErrorState message={error} onRetry={() => void muatSantri()} />;
  }

  return (
    <KeyboardAwareScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.stepRow}>
        {(['pilih', 'isi', 'konfirmasi'] as Langkah[]).map((nama, index) => (
          <View
            key={nama}
            style={[
              styles.step,
              {
                borderColor: nama === langkah ? theme.primary : theme.border,
                backgroundColor: nama === langkah ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <ThemedText selectable type="smallBold">
              {index + 1}. {nama === 'pilih' ? 'Pilih santri' : nama === 'isi' ? 'Isi data' : 'Konfirmasi'}
            </ThemedText>
          </View>
        ))}
      </View>

      {langkah === 'pilih' ? (
        <>
          <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText selectable type="smallBold">Cari santri (nama atau NIS)</ThemedText>
            <KeyboardAwareTextInput
              value={pencarian}
              onChangeText={setPencarian}
              placeholder="Ketik lalu tekan Cari"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="search"
              onSubmitEditing={() => setKataKunci(pencarian.trim())}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <AppButton label="Cari santri" variant="secondary" onPress={() => setKataKunci(pencarian.trim())} />
          </View>

          {santri.length === 0 ? (
            <EmptyState
              title="Tidak ada santri dalam cakupan"
              message="Belum ada penugasan pembimbing aktif untuk akun ini, atau pencarian terlalu sempit. Hubungi admin bila seharusnya ada."
            />
          ) : (
            santri.map((item) => {
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
                      backgroundColor: dipilih ? theme.backgroundSelected : theme.card,
                      borderColor: dipilih ? theme.primary : theme.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <ThemedText selectable type="smallBold">{item.nama}</ThemedText>
                  <ThemedText selectable type="small" themeColor="textSecondary">
                    NIS {item.nis}
                    {item.cakupan ? ` · ${item.cakupan}` : ''}
                  </ThemedText>
                </Pressable>
              );
            })
          )}

          <AppButton
            label="Lanjut isi data izin"
            disabled={terpilih === null}
            onPress={() => setLangkah('isi')}
          />
        </>
      ) : null}

      {langkah === 'isi' ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            {terpilih?.nama} · NIS {terpilih?.nis}
          </ThemedText>
          <ThemedText selectable type="smallBold">Tanggal izin</ThemedText>
          <KeyboardAwareTextInput
            value={tglIzin}
            onChangeText={setTglIzin}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <ThemedText selectable type="smallBold">Tanggal kembali</ThemedText>
          <KeyboardAwareTextInput
            value={tglKembali}
            onChangeText={setTglKembali}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <ThemedText selectable type="smallBold">Alasan izin</ThemedText>
          <KeyboardAwareTextInput
            value={alasan}
            onChangeText={setAlasan}
            multiline
            placeholder="Minimal 3 karakter"
            placeholderTextColor={theme.textSecondary}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
          <ThemedText selectable type="smallBold">Catatan pengurus (opsional)</ThemedText>
          <KeyboardAwareTextInput
            value={catatan}
            onChangeText={setCatatan}
            multiline
            placeholder="Catatan tambahan"
            placeholderTextColor={theme.textSecondary}
            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
          />
          {validasi ? (
            <ThemedText selectable type="small" themeColor="danger">
              {validasi}
            </ThemedText>
          ) : null}
          <View style={styles.buttonRow}>
            <View style={styles.buttonCell}>
              <AppButton label="Kembali" variant="secondary" onPress={() => setLangkah('pilih')} />
            </View>
            <View style={styles.buttonCell}>
              <AppButton
                label="Tinjau pengajuan"
                onPress={() => {
                  const masalah = periksaIsian();
                  setValidasi(masalah);
                  if (masalah === null) setLangkah('konfirmasi');
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {langkah === 'konfirmasi' ? (
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText selectable style={styles.panelTitle}>
            Tinjau sebelum mengirim
          </ThemedText>
          <ThemedText selectable>Santri: {terpilih?.nama} (NIS {terpilih?.nis})</ThemedText>
          <ThemedText selectable>
            Rentang: {formatTanggal(tglIzin)} → {formatTanggal(tglKembali)}
          </ThemedText>
          <ThemedText selectable>Alasan: {alasan.trim()}</ThemedText>
          {catatan.trim() ? <ThemedText selectable>Catatan: {catatan.trim()}</ThemedText> : null}
          <ThemedText selectable type="small" themeColor="textSecondary">
            Setelah dikirim, sistem menentukan murobi tujuan secara otomatis. Bila kandidatnya tidak tunggal,
            pengajuan masuk ke antrean penetapan admin.
          </ThemedText>
          {guard.error ? (
            <ThemedText selectable type="small" themeColor="danger">
              {guard.error}
            </ThemedText>
          ) : null}
          <View style={styles.buttonRow}>
            <View style={styles.buttonCell}>
              <AppButton
                label="Ubah data"
                variant="secondary"
                disabled={guard.isBusy}
                onPress={() => setLangkah('isi')}
              />
            </View>
            <View style={styles.buttonCell}>
              <AppButton
                label="Kirim pengajuan"
                loading={guard.isBusy}
                disabled={guard.isBusy}
                onPress={() => void kirim()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 16, gap: 9 },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  textarea: { minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  santriCard: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 3 },
  stepRow: { flexDirection: 'row', gap: 7 },
  step: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  buttonCell: { flex: 1 },
});
