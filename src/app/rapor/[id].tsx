import { View, type ViewProps } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { actionableError } from '@/api/client';
import { rapor } from '@/api/rapor';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { Notice, RaporPage, ReportBody } from '@/components/rapor-shared';
import { ThemedText } from '@/components/themed-text';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useNotifications } from '@/notifications/notification-context';
import { downloadReport } from '@/rapor/pdf';

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
  if (r.error) return <ErrorState message={r.error} onRetry={() => void r.load()} />;
  if (!r.data) return <LoadingState label="Memeriksa akses rapor…" />;
  return <RaporPage><Notice text={notice} /><ThemedText type="h3">Status rapor: {r.data.status}</ThemedText>
    {r.data.versi.map(v => <RaporVersion key={v.version}><ThemedText>Versi {v.version} · {v.status} · {v.diterbitkan_pada}</ThemedText>
      {v.snapshot && <><ReportBody s={v.snapshot} /><AppButton label="Unduh PDF rapor" disabled={busy} onPress={() => void download(v.version)} /><ThemedText>PDF disimpan atau dibagikan hanya melalui tindakan ini. Pilih lokasi yang Anda percayai.</ThemedText></>}
    </RaporVersion>)}
    {r.data.riwayat.map((h, i) => <ThemedText key={i}>{h.tindakan} · versi {h.version} · {h.created_at}</ThemedText>)}
    <AppButton label="Muat ulang" variant="secondary" disabled={busy} onPress={() => void r.load()} />
  </RaporPage>;
}
function RaporVersion(props: ViewProps) { return <View {...props} style={{ gap: 14 }} />; }
