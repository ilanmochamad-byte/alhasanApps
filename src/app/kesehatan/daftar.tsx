import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan, type Penyaring } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, StatusBadge, waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Badge, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { Card, Panel } from '@/components/ui/surface';
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

function Daftar({ santriId }: { santriId: number }) {
  const router = useRouter();
  const [isian, setIsian] = useState<Required<Omit<Penyaring, 'santri_id'>>>({ q: '', status: '', dari: '', sampai: '', rujukan: '', tindak_lanjut: '' });
  const [terapan, setTerapan] = useState(isian);
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => kesehatan.daftar({ ...terapan, santri_id: santriId }, page), [terapan, santriId, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => { setTerapan(isian); setPage(1); };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;
  const seluruh = data?.akses.cakupan === 'seluruh';
  const r = data?.ringkasan;
  return (
    <Halaman>
      <ThemedText type="h3">{santriId ? 'Riwayat kesehatan santri' : 'Kunjungan klinik'}</ThemedText>
      <Panel style={{ gap: 12 }}>
        <SearchField label="Cari nama atau NIS" value={isian.q} onChangeText={q => setIsian({ ...isian, q })} onSubmitEditing={terapkan}
          autoCorrect={false} autoComplete="off" />
        <DropdownField label="Rujukan" value={isian.rujukan} options={RUJUKAN} onChange={v => setIsian({ ...isian, rujukan: v as Penyaring['rujukan'] & string })} />
        <DropdownField label="Tindak lanjut" value={isian.tindak_lanjut} options={TINDAK_LANJUT} onChange={v => setIsian({ ...isian, tindak_lanjut: v as Penyaring['tindak_lanjut'] & string })} />
        {seluruh ? <DropdownField label="Status catatan" value={isian.status} options={STATUS} onChange={v => setIsian({ ...isian, status: v as Penyaring['status'] & string })} /> : null}
        <DateField label="Dari tanggal" value={isian.dari} onChange={dari => setIsian({ ...isian, dari })} />
        <DateField label="Sampai tanggal" value={isian.sampai} onChange={sampai => setIsian({ ...isian, sampai })} />
        <AppButton label="Terapkan penyaring" icon="filter" onPress={terapkan} />
      </Panel>
      {!data ? <LoadingState label="Memuat kunjungan…" /> : (
        <>
          {r ? (
            <ThemedText themeColor="textSecondary">
              {r.kunjungan} kunjungan · {r.dengan_obat} dengan obat · {r.rujukan_menunggu} rujukan menunggu hasil · {r.tindak_lanjut_terbuka} tindak lanjut terbuka{seluruh ? ` · ${r.draf} draf` : ''}
            </ThemedText>
          ) : null}
          {data.rows.length === 0 ? <EmptyState title="Belum ada kunjungan" message="Tidak ada kunjungan yang sesuai penyaring dan hak akses Anda." /> : null}
          {data.rows.map(k => (
            <Card key={k.id} accessibilityLabel={`Buka kunjungan ${k.santri.nama} ${waktuPendek(k.waktu_kunjungan)}`}
              onPress={() => router.push({ pathname: '/kesehatan/kunjungan/[id]', params: { id: String(k.id) } })}>
              <View style={{ gap: 6 }}>
                <ThemedText type="bodyBold">{k.santri.nama}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">NIS {k.santri.nis} · {waktuPendek(k.waktu_kunjungan)} · versi {k.versi}</ThemedText>
                <ChipRow>
                  <StatusBadge status={k.status} />
                  {k.penanda.obat > 0 ? <Badge label={`${k.penanda.obat} obat`} /> : null}
                  {k.penanda.rujukan_menunggu > 0 ? <Badge label="Rujukan menunggu hasil" tone="warning" /> : k.penanda.rujukan > 0 ? <Badge label={`${k.penanda.rujukan} rujukan`} /> : null}
                  {k.penanda.tindak_lanjut_terbuka > 0 ? <Badge label="Tindak lanjut terbuka" tone="warning" /> : null}
                </ChipRow>
              </View>
            </Card>
          ))}
          {totalHalaman > 1 ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} style={{ flex: 1 }} />
              <ThemedText>{page}/{totalHalaman}</ThemedText>
              <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= totalHalaman} onPress={() => setPage(page + 1)} style={{ flex: 1 }} />
            </View>
          ) : null}
        </>
      )}
    </Halaman>
  );
}
