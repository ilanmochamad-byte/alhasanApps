import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { kesehatan, type Penyaring } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { gayaHalaman, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { Halaman, HalamanKeadaan, Penanda, StatusBadge, TombolCariKecil, waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { usePrivateResource } from '@/hooks/use-private-resource';

const RUJUKAN = [
  { value: '', label: 'Semua' }, { value: 'menunggu', label: 'Rujukan menunggu hasil' }, { value: 'diketahui', label: 'Hasil rujukan diketahui' },
  { value: 'ada', label: 'Ada rujukan' }, { value: 'tanpa', label: 'Tanpa rujukan' },
];
const TINDAK_LANJUT = [{ value: '', label: 'Semua' }, { value: 'terbuka', label: 'Ada tindak lanjut terbuka' }, { value: 'tanpa_terbuka', label: 'Tanpa tindak lanjut terbuka' }];
const STATUS = [{ value: '', label: 'Semua status' }, { value: 'Tercatat', label: 'Tercatat' }, { value: 'Draf', label: 'Draf' }];

export default function DaftarScreen() {
  const { profile } = useAuth();
  const { santri_id } = useLocalSearchParams<{ santri_id?: string }>();
  return <Daftar key={`${profile?.id}:${santri_id ?? ''}`} santriId={Number(santri_id) || 0} />;
}

type Isian = Required<Omit<Penyaring, 'santri_id'>>;
type Cepat = 'semua' | 'rujukan' | 'tindak_lanjut' | 'draf';

/** Pil cepat = nilai penyaring yang sama dengan lembar penyaring (parameter server tidak berubah). */
function cepatDari(t: Isian): Cepat | null {
  const kosong = t.status === '' && t.rujukan === '' && t.tindak_lanjut === '';
  if (kosong) return 'semua';
  if (t.rujukan === 'menunggu' && t.status === '' && t.tindak_lanjut === '') return 'rujukan';
  if (t.tindak_lanjut === 'terbuka' && t.status === '' && t.rujukan === '') return 'tindak_lanjut';
  if (t.status === 'Draf' && t.rujukan === '' && t.tindak_lanjut === '') return 'draf';
  return null;
}

function Daftar({ santriId }: { santriId: number }) {
  const router = useRouter();
  const [isian, setIsian] = useState<Isian>({ q: '', status: '', dari: '', sampai: '', rujukan: '', tindak_lanjut: '' });
  const [terapan, setTerapan] = useState(isian);
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => kesehatan.daftar({ ...terapan, santri_id: santriId }, page), [terapan, santriId, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => { setTerapan(isian); setPage(1); };
  const judul = santriId ? 'Riwayat kesehatan santri' : 'Kunjungan klinik';

  if (error) return <HalamanKeadaan title={judul}><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;
  const seluruh = data?.akses.cakupan === 'seluruh';
  const r = data?.ringkasan;
  const cepat = cepatDari(terapan);
  const pilihCepat = (c: Cepat) => {
    const baru: Isian = { ...isian, status: c === 'draf' ? 'Draf' : '', rujukan: c === 'rujukan' ? 'menunggu' : '', tindak_lanjut: c === 'tindak_lanjut' ? 'terbuka' : '' };
    setIsian(baru); setTerapan(baru); setPage(1);
  };
  const saringanLain = terapan.dari !== '' || terapan.sampai !== '' || cepat === null;
  return (
    <Halaman title={judul} actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <SearchBar accessibilityLabel="Cari nama atau NIS" placeholder="Cari nama atau NIS" value={isian.q}
        onChangeText={q => setIsian({ ...isian, q })} onSubmitEditing={terapkan} autoComplete="off"
        filterTitle="Penyaring kunjungan" filterActive={saringanLain}
        filter={tutup => (
          <>
            <DropdownField label="Rujukan" value={isian.rujukan} options={RUJUKAN} onChange={v => setIsian({ ...isian, rujukan: v as Penyaring['rujukan'] & string })} />
            <DropdownField label="Tindak lanjut" value={isian.tindak_lanjut} options={TINDAK_LANJUT} onChange={v => setIsian({ ...isian, tindak_lanjut: v as Penyaring['tindak_lanjut'] & string })} />
            {seluruh ? <DropdownField label="Status catatan" value={isian.status} options={STATUS} onChange={v => setIsian({ ...isian, status: v as Penyaring['status'] & string })} /> : null}
            <DateField label="Dari tanggal" value={isian.dari} onChange={dari => setIsian({ ...isian, dari })} />
            <DateField label="Sampai tanggal" value={isian.sampai} onChange={sampai => setIsian({ ...isian, sampai })} />
            <AppButton label="Terapkan penyaring" icon="filter" onPress={() => { terapkan(); tutup(); }} />
          </>
        )}
        trailing={<TombolCariKecil onPress={terapkan} />} />
      <FilterPills<Cepat> bungkus accessibilityLabel="Saring kunjungan" value={cepat ?? 'semua'} onChange={pilihCepat}
        options={[
          { value: 'semua', label: 'Semua' },
          { value: 'rujukan', label: 'Rujukan menunggu' },
          { value: 'tindak_lanjut', label: 'Tindak lanjut terbuka' },
          ...(seluruh ? [{ value: 'draf' as const, label: 'Draf' }] : []),
        ]} />
      {!data ? <LoadingState label="Memuat kunjungan…" /> : (
        <>
          {r ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {r.kunjungan} kunjungan · {r.dengan_obat} dengan obat · {r.rujukan_menunggu} rujukan menunggu hasil · {r.tindak_lanjut_terbuka} tindak lanjut terbuka{seluruh ? ` · ${r.draf} draf` : ''}
            </ThemedText>
          ) : null}
          {data.rows.length === 0 ? <EmptyState icon="medical" title="Belum ada kunjungan" message="Tidak ada kunjungan yang sesuai penyaring dan hak akses Anda." /> : null}
          {data.rows.map(k => (
            <EntityRow key={k.id} avatarName={k.santri.nama} title={k.santri.nama}
              subtitle={`NIS ${k.santri.nis} · ${waktuPendek(k.waktu_kunjungan)} · versi ${k.versi}`}
              accessibilityLabel={`Buka kunjungan ${k.santri.nama} ${waktuPendek(k.waktu_kunjungan)}`}
              highlight={k.penanda.rujukan_menunggu > 0 || k.penanda.tindak_lanjut_terbuka > 0 ? 'warning' : undefined}
              onPress={() => router.push({ pathname: '/kesehatan/kunjungan/[id]', params: { id: String(k.id) } })}
              pill={(
                <View style={gaya.pil}>
                  <StatusBadge status={k.status} />
                  {k.penanda.obat > 0 ? <Penanda label={`${k.penanda.obat} obat`} /> : null}
                  {k.penanda.rujukan_menunggu > 0 ? <Penanda label="Rujukan menunggu hasil" nada="warning" /> : k.penanda.rujukan > 0 ? <Penanda label={`${k.penanda.rujukan} rujukan`} /> : null}
                  {k.penanda.tindak_lanjut_terbuka > 0 ? <Penanda label="Tindak lanjut terbuka" nada="warning" /> : null}
                </View>
              )} />
          ))}
          {totalHalaman > 1 ? (
            <View style={gayaHalaman.penomoran}>
              <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} style={gayaHalaman.flex} />
              <ThemedText>{page}/{totalHalaman}</ThemedText>
              <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= totalHalaman} onPress={() => setPage(page + 1)} style={gayaHalaman.flex} />
            </View>
          ) : null}
        </>
      )}
    </Halaman>
  );
}

const gaya = StyleSheet.create({ pil: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } });
