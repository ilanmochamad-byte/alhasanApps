import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { Pager } from '@/components/izin-wali-shared';
import { waktuPendek } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaPembinaan, STATUS_PELANGGARAN } from '@/keamanan/format';

/** Pelanggaran seluruh santri aktif, hanya baca. Chip, pencarian, dan daftar memakai cakupan server yang sama. */
export default function KeamananPelanggaranScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keamanan.pelanggaran({ status, q, page }), [status, q, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const jumlah = data?.jumlah_status ?? {};
  const semua = Object.values(jumlah).reduce((a, b) => a + b, 0);
  return (
    <Halaman>
      <ChipRow>
        <Chip accessibilityRole="radio" label={`Semua${data ? ` (${semua})` : ''}`} selected={status === ''} onPress={() => { setStatus(''); setPage(1); }} />
        {STATUS_PELANGGARAN.map(s => (
          <Chip key={s} accessibilityRole="radio" label={`${s}${data ? ` (${jumlah[s] ?? 0})` : ''}`} selected={status === s} onPress={() => { setStatus(s); setPage(1); }} />
        ))}
      </ChipRow>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Cari santri" accessibilityLabel="Cari santri" value={cari} onChangeText={setCari} placeholder="Nama santri" maxLength={100}
            returnKeyType="search" onSubmitEditing={() => { setQ(cari.trim()); setPage(1); }} />
        </View>
        <AppButton label="Cari" size="sm" variant="secondary" onPress={() => { setQ(cari.trim()); setPage(1); }} />
      </View>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat pelanggaran…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.items.length} dari {data.total}</ThemedText>
          {data.items.length === 0 ? <EmptyState title="Belum ada catatan yang cocok" message="Ubah status atau pencarian untuk melihat catatan lain." /> : null}
          {data.items.map(item => (
            <Card key={item.id} accessibilityLabel={`Buka pelanggaran ${item.santri_nama}`}
              onPress={() => router.push({ pathname: '/keamanan/pelanggaran/[id]', params: { id: String(item.id) } })}>
              <View style={{ gap: 6 }}>
                <ThemedText type="bodyBold">{item.santri_nama}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {waktuPendek(item.waktu_kejadian)} · {item.jenis ?? item.kategori} · {item.poin} poin
                </ThemedText>
                <ChipRow>
                  <Lencana label={item.status} nada={nadaPembinaan(item.status)} />
                  <Badge label={item.tingkat} />
                </ChipRow>
              </View>
            </Card>
          ))}
          <Pager page={data.page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
