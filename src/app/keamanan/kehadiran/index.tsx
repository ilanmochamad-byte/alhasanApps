import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keamanan } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { Pager } from '@/components/izin-wali-shared';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { TombolMuatUlangKepala } from '@/components/halaman-stack';
import { CatatanHanyaBaca, Halaman, KolomCariSantri, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
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
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const fetcher = useCallback(() => keamanan.kehadiran({ date_from: terapan.dari, date_to: terapan.sampai, status, q, page }), [terapan, status, q, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => {
    const pesan = periksaRentang(dari, sampai);
    setGalat(pesan);
    if (pesan === null) { setTerapan({ dari, sampai }); setPage(1); }
    return pesan === null;
  };
  return (
    <Halaman title="Kehadiran pengajian" subtitle="Hanya melihat" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <KolomCariSantri label="Cari santri menurut nama atau NIS" value={cari} onChange={setCari} onCari={() => { setQ(cari.trim()); setPage(1); }}
        filterActive={terapan.dari !== '' || terapan.sampai !== ''}
        filter={tutup => (
          <>
            <DateField label="Dari" value={dari} onChange={setDari} />
            <DateField label="Sampai" value={sampai} onChange={setSampai} />
            {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
            <AppButton label="Terapkan tanggal" onPress={() => { if (terapkan()) tutup(); }} />
          </>
        )} />
      {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
      <FilterPills bungkus accessibilityLabel="Status kehadiran" value={status} onChange={v => { setStatus(v); setPage(1); }}
        options={[{ value: '', label: 'Semua status' }, ...STATUS_KEHADIRAN.map(s => ({ value: s as string, label: s as string }))]} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat kehadiran…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            {tanggalPanjang(data.filters.date_from)} – {tanggalPanjang(data.filters.date_to)} · {data.summary.meeting_count} pertemuan · {data.summary.detail_count} catatan
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {STATUS_KEHADIRAN.map(s => `${s} ${data.summary.statuses[s] ?? 0}`).join(' · ')}
          </ThemedText>
          {data.items.length === 0 ? <EmptyState icon="calendar" title="Belum ada catatan kehadiran" message="Tidak ada catatan kehadiran pada rentang dan status ini." /> : null}
          {data.items.map(r => (
            <EntityRow key={r.attendance_id} avatarName={r.subject_name} title={r.subject_name}
              subtitle={`${tanggalPanjang(r.meeting_date)} · ${r.subject} · ${r.class_name} · ${r.teacher_name}`}
              accessibilityLabel={`Buka pertemuan ${r.subject} ${r.meeting_date}`}
              onPress={() => router.push({ pathname: '/keamanan/kehadiran/[id]', params: { id: String(r.meeting_id) } })}
              pill={<Lencana label={r.attendance_status} nada={nadaKehadiran(r.attendance_status)} />} />
          ))}
          <Pager page={data.pagination.current_page} total={data.pagination.total} perPage={data.pagination.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
