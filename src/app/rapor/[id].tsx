import { View, type ViewProps } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { actionableError } from '@/api/client';
import { rapor } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { Notice, RaporPage, ReportBody } from '@/components/rapor-shared';
import { GarisWaktu, JudulBagianIsi, KartuIsi, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { ThemedText } from '@/components/themed-text';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { downloadReport } from '@/rapor/pdf';

const JUDUL = 'Rapor keluarga';

export default function Screen() { const { profile } = useAuth(); const { id } = useLocalSearchParams<{ id: string }>(); return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />; }
function Detail({ id }: { id: number }) {
  const { tujuanDibuka } = useNotifications();
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk rapor tidak valid.');
    // Setiap pembukaan, fokus kembali, dan download memeriksa relasi wali di server.
    const result = await rapor.detail(id);
    tujuanDibuka('rapor', id);
    return result;
  }, [id, tujuanDibuka]);
  const r = usePrivateResource(fetcher);
  const lock = useRef(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  async function download(version: number) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(null);
    const epoch = r.generation.current;
    try { await downloadReport(id, version, () => r.active.current && epoch === r.generation.current); }
    catch (e) { if (r.active.current && epoch === r.generation.current) { setNotice(actionableError(e)); await r.load(); } }
    finally { lock.current = false; setBusy(false); }
  }
  if (r.error) return <RaporPage title={JUDUL}><ErrorState message={r.error} onRetry={() => void r.load()} /></RaporPage>;
  if (!r.data) return <RaporPage title={JUDUL}><LoadingState label="Memeriksa akses rapor…" /></RaporPage>;
  // Versi terbaru di atas; versi lama dikelompokkan "Versi sebelumnya" (keputusan Y/AV: isi lama tidak dikirim server).
  const urut = [...r.data.versi].sort((x, y) => y.version - x.version);
  const [terbaru, ...lama] = urut;
  return <RaporPage title={JUDUL} actions={<TombolMuatUlangKepala onPress={() => { if (!busy) void r.load(); }} />}>
    <Notice text={notice} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <ThemedText type="h3">Status rapor: {r.data.status}</ThemedText>
      <StatusPill label={r.data.status} tone={r.data.status === 'Terbit' ? 'success' : r.data.status === 'Ditarik' ? 'danger' : 'neutral'} />
    </View>
    {[{ kunci: 'baru', judul: null, daftar: terbaru ? [terbaru] : [] }, { kunci: 'lama', judul: 'Versi sebelumnya', daftar: lama }].map(kel => kel.daftar.length === 0 ? null : <View key={kel.kunci} style={{ gap: 14 }}>
      {kel.judul ? <JudulBagianIsi title={kel.judul} icon="clock" /> : null}
      {kel.daftar.map(v => <RaporVersion key={v.version}>
        <ThemedText>Versi {v.version} · {v.status} · {v.diterbitkan_pada}</ThemedText>
        {v.snapshot && <><ReportBody s={v.snapshot} /><AppButton label="Unduh PDF rapor" icon="arrow-right" disabled={busy} onPress={() => void download(v.version)} /><ThemedText type="caption" themeColor="textSecondary">PDF disimpan atau dibagikan hanya melalui tindakan ini. Pilih lokasi yang Anda percayai.</ThemedText></>}
      </RaporVersion>)}
    </View>)}
    {r.data.riwayat.length > 0 ? <><JudulBagianIsi title="Riwayat" /><KartuIsi><GarisWaktu items={r.data.riwayat.map((h, i) => ({ key: i, judul: `${h.tindakan} · versi ${h.version}`, waktu: h.created_at }))} /></KartuIsi></> : null}
  </RaporPage>;
}
function RaporVersion(props: ViewProps) { return <View {...props} style={{ gap: 14 }} />; }
