import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Angka, Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { rupiah } from '@/keuangan/forms';

/** Santri sesuai hak (petugas: cakupan unit; admin: semua; orang tua: anak) beserta saldo dan sisa tagihan. */
export default function SantriScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.daftarSantri(terapan, page), [terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return (
    <Halaman>
      <SearchField label="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ} onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }}
        autoCorrect={false} autoComplete="off" returnKeyType="search" />
      <AppButton label="Cari" size="sm" variant="secondary" icon="search" onPress={() => { setTerapan(q.trim()); setPage(1); }} />
      {!data ? <LoadingState label="Memuat santri…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.total} santri</ThemedText>
          {data.rows.length === 0 ? <EmptyState title="Tidak ada santri" message="Tidak ada santri yang sesuai pencarian dan hak akses Anda." /> : null}
          {data.rows.map(s => (
            <Card key={s.id} accessibilityLabel={`Buka keuangan ${s.nama}`} onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id) } })}>
              <View style={{ gap: 6 }}>
                <ThemedText type="bodyBold">{s.nama}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">NIS {s.nis}{s.kelas ? ` · ${s.kelas}` : ''}{s.unit ? ` · ${s.unit}` : ''}</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <Angka label="Saldo" nilai={rupiah(s.saldo)} />
                  <Angka label={`Sisa tagihan (${s.tagihan_terbuka})`} nilai={rupiah(s.sisa_tagihan)} tone={s.sisa_tagihan > 0 ? 'danger' : undefined} />
                </View>
              </View>
            </Card>
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
