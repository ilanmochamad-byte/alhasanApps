import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { actionableError, api } from '@/api/client';
import type { IzinCapability, SantriPilihan } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { StackScreen } from '@/components/screen-shell';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { formatTanggal } from '@/components/izin-card';
import { ThemedText } from '@/components/themed-text';
import { ActionBar, AksiAkhirIsi, bilahTetap } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { DateField } from '@/components/ui/date-field';
import { Badge } from '@/components/ui/chip';
import { EntityRow } from '@/components/ui/entity-row';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { SearchBar } from '@/components/ui/search-bar';
import { Stepper } from '@/components/ui/stepper';
import { Overline, Panel } from '@/components/ui/surface';
import { Layout, Radius } from '@/constants/theme';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { useTheme } from '@/hooks/use-theme';
import { lamaHari as hitungLamaHari } from '@/lib/date';

type Langkah = 'pilih' | 'isi' | 'konfirmasi';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const LANGKAH: Langkah[] = ['pilih', 'isi', 'konfirmasi'];
const LABEL_LANGKAH = ['Pilih santri', 'Data izin', 'Tinjau'];
const JUDUL = 'Ajukan izin';
/** Batas tampilan penghitung alasan; server yang memvalidasi isi. */
const PANJANG_ALASAN = 500;

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
      // P-Sukses: rincian pengajuan menampilkan panel "Pengajuan terkirim".
      router.replace({ pathname: '/izin/[id]', params: { id: String(hasil.id), mode: mode ?? '', baru: '1' } });
    }
  }, [alasan, catatan, guard, mode, periksaIsian, router, terpilih, tglIzin, tglKembali]);

  // Keterangan lama izin; murni tampilan, tidak ikut dikirim ke server.
  const lamaHari = useMemo(() => hitungLamaHari(tglIzin, tglKembali), [tglIzin, tglKembali]);

  // K-10: ← kembali ke langkah sebelumnya dulu, baru ke halaman sebelumnya.
  const kembaliLangkah =
    langkah === 'isi' ? () => setLangkah('pilih') : langkah === 'konfirmasi' && !guard.isBusy ? () => setLangkah('isi') : undefined;

  // Layar ini punya kolom tanggal berlabel "Kembali"; label ← dibuat spesifik
  // agar pembaca layar tidak mendengar dua kontrol bernama sama.
  const labelKembali = kembaliLangkah ? 'Kembali ke langkah sebelumnya' : 'Kembali ke halaman sebelumnya';

  if (loading && santri.length === 0 && langkah === 'pilih') {
    return (
      <StackScreen title={JUDUL} backLabel={labelKembali}>
        <LoadingState label="Memuat santri dalam cakupan Anda…" />
      </StackScreen>
    );
  }
  if (error && santri.length === 0) {
    return (
      <StackScreen title={JUDUL} backLabel={labelKembali}>
        <ErrorState message={error} onRetry={() => void muatSantri()} />
      </StackScreen>
    );
  }

  // TL-22: tindakan di bilah tetap, atau di akhir isi pada teks sangat besar.
  const aksiBawah = (<>
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
      </>);
  return (
    <StackScreen title={JUDUL} onBack={kembaliLangkah} backLabel={labelKembali}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <Stepper steps={LABEL_LANGKAH} current={LANGKAH.indexOf(langkah)} />

        {langkah === 'pilih' ? (
          <>
            <SearchBar
              accessibilityLabel="Cari santri"
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
                    hitSlop={8}
                    style={styles.cari}>
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
                {santri.map((item) => (
                  <EntityRow
                    key={item.id}
                    accessibilityRole="radio"
                    selected={terpilih?.id === item.id}
                    avatarName={item.nama}
                    title={item.nama}
                    subtitle={`NIS ${item.nis}${item.cakupan ? ` · ${item.cakupan}` : ''}`}
                    onPress={() => setTerpilih(item)}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}

        {langkah === 'isi' ? (
          <>
            {/* Kartu santri terpilih di atas formulir. */}
            <View
              style={[
                styles.selected,
                { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder },
              ]}>
              <AvatarInisial nama={terpilih?.nama ?? ''} />
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
                hitSlop={8}
                style={styles.cari}>
                <ThemedText selectable type="label" themeColor="primary">
                  Ubah
                </ThemedText>
              </Pressable>
            </View>

            <Panel>
              <Overline>Rentang izin</Overline>
              <View style={styles.row}>
                <View style={styles.field}>
                  <DateField
                    label="Mulai"
                    value={tglIzin}
                    onChange={(next) => {
                      setTglIzin(next);
                      // Tanggal kembali tidak boleh mendahului tanggal izin —
                      // aturan yang sama dengan `periksaIsian`. Menyesuaikannya
                      // di sini mencegah pengguna terjebak pada kombinasi yang
                      // pasti ditolak.
                      if (tglKembali && tglKembali < next) setTglKembali(next);
                    }}
                  />
                </View>
                <View style={styles.field}>
                  <DateField
                    label="Kembali"
                    value={tglKembali}
                    onChange={setTglKembali}
                    minimumDate={tglIzin || undefined}
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
              hint={`${alasan.length}/${PANJANG_ALASAN}`}
              icon="izin"
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

            <Notice tone="danger" text={validasi} />

            <Notice
              tone="neutral"
              text="Setelah dikirim, pengajuan diteruskan ke murobi santri. Bila kandidatnya tidak tunggal, admin akan menetapkannya."
            />
          </>
        ) : null}

        {langkah === 'konfirmasi' ? (
          <Panel style={styles.tinjau}>
            <Overline>Tinjau sebelum mengirim</Overline>
            <InfoRow icon="person" label="Santri" value={`${terpilih?.nama} (NIS ${terpilih?.nis})`} />
            <InfoRow
              icon="calendar"
              label="Rentang"
              value={`${formatTanggal(tglIzin)} → ${formatTanggal(tglKembali)}${lamaHari ? ` · ${lamaHari} hari` : ''}`}
            />
            <InfoRow icon="izin" label="Alasan" value={alasan.trim()} last={!catatan.trim()} />
            {catatan.trim() ? <InfoRow icon="info" label="Catatan" value={catatan.trim()} last /> : null}
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Setelah dikirim, sistem menentukan murobi tujuan secara otomatis. Bila kandidatnya
              tidak tunggal, pengajuan masuk ke antrean penetapan admin.
            </ThemedText>
            <Notice tone="danger" text={guard.error} />
          </Panel>
        ) : null}
        {!bilahTetap() ? <AksiAkhirIsi>{aksiBawah}</AksiAkhirIsi> : null}
      </KeyboardAwareScrollView>

      {bilahTetap() ? <ActionBar>{aksiBawah}</ActionBar> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  list: { gap: 8 },
  cari: { minHeight: 44, justifyContent: 'center' },
  santriText: { flex: 1, gap: 2 },
  selected: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  durasi: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  tinjau: { gap: 0 },
  grow: { flex: 1 },
  narrow: { width: 118 },
});
