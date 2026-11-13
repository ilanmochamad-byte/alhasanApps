import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { keamanan, type IzinFilter } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { rentang, Pager } from '@/components/izin-wali-shared';
import { BarisPilIsi, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { CatatanHanyaBaca, Halaman, KolomCariSantri, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaStatus } from '@/izin-wali/forms';
import { LABEL_ASAL, LABEL_HASIL, periksaRentang } from '@/keamanan/format';

/** Perizinan seluruh santri aktif, asal Pengurus (V2) dan Wali (V7), semua tahap. Daftar tanpa alasan; isi lengkap di rincian. */
export default function KeamananIzinScreen() {
  const router = useRouter();
  const [asal, setAsal] = useState('');
  const [hasil, setHasil] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [terapan, setTerapan] = useState<{ dari: string; sampai: string }>({ dari: '', sampai: '' });
  // Pencarian nama/NIS oleh server dalam cakupan Keamanan, menjangkau seluruh halaman.
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [galat, setGalat] = useState<string | null>(null);
  const fetcher = useCallback(() => {
    const f: IzinFilter = { asal, hasil, dari: terapan.dari, sampai: terapan.sampai, q, page };
    return keamanan.izin(f);
  }, [asal, hasil, terapan, q, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => {
    const pesan = periksaRentang(dari, sampai);
    setGalat(pesan);
    if (pesan === null) { setTerapan({ dari, sampai }); setPage(1); }
    return pesan === null;
  };
  return (
    <Halaman title="Perizinan santri" subtitle="Hanya melihat" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <KolomCariSantri label="Cari santri menurut nama atau NIS" value={cari} onChange={setCari} onCari={() => { setQ(cari.trim()); setPage(1); }}
        filterActive={terapan.dari !== '' || terapan.sampai !== ''}
        filter={tutup => (
          <>
            <DateField label="Izin dari" value={dari} onChange={setDari} />
            <DateField label="Sampai" value={sampai} onChange={setSampai} />
            {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
            <AppButton label="Terapkan tanggal" onPress={() => { if (terapkan()) tutup(); }} />
          </>
        )} />
      <FilterPills bungkus accessibilityLabel="Asal pengajuan" value={asal} onChange={v => { setAsal(v); setPage(1); }}
        options={Object.entries(LABEL_ASAL).map(([kode, label]) => ({ value: kode, label }))} />
      <FilterPills bungkus accessibilityLabel="Hasil pengajuan" value={hasil} onChange={v => { setHasil(v); setPage(1); }}
        options={Object.entries(LABEL_HASIL).map(([kode, label]) => ({ value: kode, label }))} />
      {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat perizinan…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            {data.ringkasan.total} pengajuan · {data.ringkasan.per_hasil.berjalan ?? 0} berjalan · asal wali {data.ringkasan.per_asal.Wali} · asal pengurus {data.ringkasan.per_asal.Pengurus}
          </ThemedText>
          {data.items.length === 0 ? <EmptyState icon="izin" title="Tidak ada pengajuan" message="Tidak ada pengajuan yang cocok dengan saringan." /> : null}
          {data.items.map(item => (
            <EntityRow key={item.id} avatarName={item.santri.nama} title={item.santri.nama}
              subtitle={`#${item.id} · NIS ${item.santri.nis}${item.kamar ? ` · ${item.kamar}` : ''} · ${rentang(item.tgl_izin, item.tgl_kembali)}`}
              accessibilityLabel={`Buka izin ${item.santri.nama} nomor ${item.id}`}
              onPress={() => router.push({ pathname: '/keamanan/izin/[id]', params: { id: String(item.id) } })}
              pill={<BarisPilIsi><Lencana label={item.status_label} nada={nadaStatus(item.status)} /><Lencana label={`Asal ${item.asal.toLowerCase()}`} nada="neutral" /></BarisPilIsi>} />
          ))}
          <Pager page={data.page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
