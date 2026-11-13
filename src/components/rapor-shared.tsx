import { useCallback, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, actionableError } from '@/api/client';
import type { History, Snapshot } from '@/api/rapor';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { GarisWaktu, HalamanStack, KartuIsi } from '@/components/halaman-stack';
import { ThemedText } from '@/components/themed-text';
import { Notice as NoticeUi } from '@/components/ui/notice';
import { Elevation, Radius } from '@/constants/theme';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';

export function useRaporResource<T>(fetcher: () => Promise<T>) {
  const resource = usePrivateResource(fetcher);
  const { active, generation, load } = resource;
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const mutate = useCallback(async (operation: () => Promise<unknown>, refresh = true) => {
    if (lock.current || !active.current) return;
    lock.current = true; setBusy(true); setNotice(null);
    const epoch = generation.current;
    try {
      await operation();
      if (active.current && epoch === generation.current) {
        if (refresh) { setNotice('Perubahan tersimpan. Data terbaru dimuat dari server.'); await load(); }
      }
    } catch (e) {
      if (active.current && epoch === generation.current) {
        setNotice(actionableError(e));
        // Termasuk retry manual yang ternyata sudah tersimpan: versi usang TIDAK dikirim ulang.
        if (e instanceof ApiError && [409, 403].includes(e.status)) await load();
      }
    } finally { lock.current = false; setBusy(false); }
  }, [active, generation, load]);
  return { ...resource, busy, notice, mutate };
}
/**
 * Halaman rapor (redesain gelombang 2 Fase 4): kepala ← · judul · ⋯ di luar
 * area gulir (K-7, K-10). Memuat/galat ditampilkan di dalam isi sehingga ←
 * tetap ada. Tanpa penutup latar (perilaku sebelum redesain dipertahankan).
 */
export function RaporPage({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  return <HalamanStack title={title} actions={actions}>{children}</HalamanStack>;
}
/** Hasil/galat simpan: ikon + teks (bukan warna saja). */
export function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  const berhasil = text.startsWith('Perubahan tersimpan');
  return <NoticeUi text={text} tone={berhasil ? 'success' : 'danger'} />;
}
export function HistoryList({ rows }: { rows: History[] }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 10 }}><AppButton label={open ? 'Tutup riwayat' : `Lihat riwayat (${rows.length})`} variant="secondary" icon="clock" onPress={() => setOpen(!open)} />
    {open && <KartuIsi><GarisWaktu items={rows.map((row, i) => ({
      key: row.id ?? i,
      judul: `Versi ${row.version} · ${row.kapasitas} · ${row.created_at ?? ''}`,
      isi: <><ThemedText>{row.alasan || 'Tanpa alasan tambahan'}</ThemedText>{row.snapshot_json ? <ThemedText type="caption" themeColor="textSecondary">{row.snapshot_json}</ThemedText> : null}</>,
    }))} /></KartuIsi>}</View>;
}
/** Isi rapor (snapshot server) bergaya dokumen: kop, identitas, mapel, sikap, kehadiran, penanda. */
export function ReportBody({ s }: { s: Snapshot }) {
  const theme = useTheme();
  const rata = s.rata_rata_tampil === undefined ? s.rata_rata : s.rata_rata_tampil;
  return <View style={[gaya.dokumen, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={[gaya.kop, { borderBottomColor: theme.divider }]}>
      <View style={[gaya.kopIkon, { backgroundColor: theme.primarySoft }]}><AppIcon name="book" size={20} themeColor="primary" /></View>
      <View style={{ flex: 1 }}>
        <ThemedText type="overline" themeColor="textSecondary">Pesantren Al Hasan · Rapor semester</ThemedText>
        <ThemedText type="h3">{s.santri.nama_santri}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">NIS {s.santri.nis ?? '—'} · {s.kelas} · {s.tahun} {s.semester}</ThemedText>
      </View>
    </View>
    {s.mapel.map((m, i) => <View key={i} style={[gaya.baris, { borderBottomColor: theme.divider }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyBold">{m.nama}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">Target {m.target}{m.catatan ? ` · ${m.catatan}` : ''}</ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="bodyBold">Nilai {m.hasil.nilai_tampil ?? 'Belum lengkap'}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{m.hasil.predikat ?? '—'}</ThemedText>
      </View>
    </View>)}
    <View style={[gaya.sorot, { backgroundColor: theme.primarySoft }]}>
      <ThemedText type="bodyBold" themeColor="primary">Rata-rata nilai: {rata}</ThemedText>
    </View>
    <ThemedText type="h3">Sikap</ThemedText>
    <ThemedText>Adab/akhlak: {s.sikap.adab}{'\n'}Kedisiplinan: {s.sikap.kedisiplinan}{'\n'}Tanggung jawab: {s.sikap.tanggung_jawab}</ThemedText>
    {s.sikap.catatan ? <ThemedText>{s.sikap.catatan}</ThemedText> : null}
    <ThemedText type="h3">Kehadiran</ThemedText>
    <View style={gaya.hadir}>{Object.entries(s.kehadiran.hitungan).map(([label, n]) => <View key={label} style={[gaya.hadirSel, { backgroundColor: theme.backgroundElement }]}><ThemedText type="labelSmall" themeColor="textSecondary">{label}: {n}</ThemedText></View>)}</View>
    <ThemedText type="caption" themeColor="textSecondary">Pertemuan: {s.kehadiran.jumlah_pertemuan} · Belum dicatat: {s.kehadiran.belum_dicatat}</ThemedText>
    {s.catatan_umum ? <ThemedText>{s.catatan_umum}</ThemedText> : null}
    <ThemedText type="caption" themeColor="textSecondary">{s.tempat}, {s.tanggal}</ThemedText>
    {s.penanda.map((p, i) => <ThemedText key={i}>{p.jabatan}: {p.nama} {p.gelar}</ThemedText>)}
  </View>;
}
const gaya = StyleSheet.create({
  dokumen: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16, gap: 10, boxShadow: Elevation.card },
  kop: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, paddingBottom: 12 },
  kopIkon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  baris: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderBottomWidth: 1, paddingVertical: 10 },
  sorot: { borderRadius: Radius.lg, padding: 12 },
  hadir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hadirSel: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
});
