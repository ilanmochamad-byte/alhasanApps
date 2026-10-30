import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { Pager } from '@/components/izin-wali-shared';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaKehadiran, periksaRentang, STATUS_KEHADIRAN } from '@/keamanan/format';

/**
 * Laporan kehadiran pengajian seluruh jadwal, peserta santri aktif kini
 * (pola keputusan H). Tanpa tanggal, server memakai bulan berjalan.
 */
export default function KeamananKehadiranScreen() {
  const router = useRouter();
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [terapan, setTerapan] = useState({ dari: '', sampai: '' });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [galat, setGalat] = useState<string | null>(null);
  const fetcher = useCallback(() => keamanan.kehadiran({ date_from: terapan.dari, date_to: terapan.sampai, status, page }), [terapan, status, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => {
    const pesan = periksaRentang(dari, sampai);
    setGalat(pesan);
    if (pesan === null) { setTerapan({ dari, sampai }); setPage(1); }
  };
  return (
    <Halaman>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><DateField label="Dari" value={dari} onChange={setDari} /></View>
        <View style={{ flex: 1 }}><DateField label="Sampai" value={sampai} onChange={setSampai} /></View>
      </View>
      <AppButton label="Terapkan tanggal" size="sm" variant="secondary" onPress={terapkan} />
      {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
      <ChipRow>
        <Chip accessibilityRole="radio" label="Semua status" selected={status === ''} onPress={() => { setStatus(''); setPage(1); }} />
        {STATUS_KEHADIRAN.map(s => <Chip key={s} accessibilityRole="radio" label={s} selected={status === s} onPress={() => { setStatus(s); setPage(1); }} />)}
      </ChipRow>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat kehadiran…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            {tanggalPanjang(data.filters.date_from)} – {tanggalPanjang(data.filters.date_to)} · {data.summary.meeting_count} pertemuan · {data.summary.detail_count} catatan
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {STATUS_KEHADIRAN.map(s => `${s} ${data.summary.statuses[s] ?? 0}`).join(' · ')}
          </ThemedText>
          {data.items.length === 0 ? <EmptyState title="Belum ada catatan kehadiran" message="Tidak ada catatan kehadiran pada rentang dan status ini." /> : null}
          {data.items.map(r => (
            <Card key={r.attendance_id} accessibilityLabel={`Buka pertemuan ${r.subject} ${r.meeting_date}`}
              onPress={() => router.push({ pathname: '/keamanan/kehadiran/[id]', params: { id: String(r.meeting_id) } })}>
              <View style={{ gap: 6 }}>
                <ThemedText type="bodyBold">{r.subject_name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {tanggalPanjang(r.meeting_date)} · {r.subject} · {r.class_name} · {r.teacher_name}
                </ThemedText>
                <ChipRow><Lencana label={r.attendance_status} nada={nadaKehadiran(r.attendance_status)} /></ChipRow>
              </View>
            </Card>
          ))}
          <Pager page={data.pagination.current_page} total={data.pagination.total} perPage={data.pagination.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
