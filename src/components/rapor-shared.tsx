import { useCallback, useRef, useState, type PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { ApiError, actionableError } from '@/api/client';
import type { History, Snapshot } from '@/api/rapor';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
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
export function RaporPage({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, gap: 14, maxWidth: 800, width: '100%', alignSelf: 'center', paddingBottom: 70 }}>{children}</ScrollView>;
}
export function Notice({ text }: { text: string | null }) { return text ? <ThemedText accessibilityRole="alert">{text}</ThemedText> : null; }
export function HistoryList({ rows }: { rows: History[] }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 10 }}><AppButton label={open ? 'Tutup riwayat' : `Lihat riwayat (${rows.length})`} variant="secondary" onPress={() => setOpen(!open)} />
    {open && rows.map((row, i) => <View key={row.id ?? i} style={{ gap: 5 }}><ThemedText>Versi {row.version} · {row.kapasitas} · {row.created_at ?? ''}</ThemedText><ThemedText>{row.alasan || 'Tanpa alasan tambahan'}</ThemedText>{row.snapshot_json && <ThemedText>{row.snapshot_json}</ThemedText>}</View>)}</View>;
}
export function ReportBody({ s }: { s: Snapshot }) {
  return <View style={{ gap: 12 }}>
    <ThemedText type="h3">{s.santri.nama_santri}</ThemedText><ThemedText>NIS {s.santri.nis ?? '—'} · {s.kelas} · {s.tahun} {s.semester}</ThemedText>
    {s.mapel.map((m, i) => <View key={i} style={{ gap: 4 }}><ThemedText type="bodyBold">{m.nama}</ThemedText><ThemedText>Nilai {m.hasil.nilai_tampil ?? 'Belum lengkap'} · {m.hasil.predikat ?? '—'} · Target {m.target}</ThemedText><ThemedText>{m.catatan}</ThemedText></View>)}
    <ThemedText>Rata-rata nilai: {s.rata_rata_tampil === undefined ? s.rata_rata : s.rata_rata_tampil}</ThemedText>
    <ThemedText type="h3">Sikap</ThemedText><ThemedText>Adab/akhlak: {s.sikap.adab}{'\n'}Kedisiplinan: {s.sikap.kedisiplinan}{'\n'}Tanggung jawab: {s.sikap.tanggung_jawab}</ThemedText><ThemedText>{s.sikap.catatan}</ThemedText>
    <ThemedText type="h3">Kehadiran</ThemedText>{Object.entries(s.kehadiran.hitungan).map(([label, n]) => <ThemedText key={label}>{label}: {n}</ThemedText>)}<ThemedText>Pertemuan: {s.kehadiran.jumlah_pertemuan} · Belum dicatat: {s.kehadiran.belum_dicatat}</ThemedText>
    <ThemedText>{s.catatan_umum}</ThemedText><ThemedText>{s.tempat}, {s.tanggal}</ThemedText>{s.penanda.map((p, i) => <ThemedText key={i}>{p.jabatan}: {p.nama} {p.gelar}</ThemedText>)}
  </View>;
}
