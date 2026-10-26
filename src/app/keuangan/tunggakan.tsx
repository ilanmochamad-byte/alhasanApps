import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { tanggalPanjang } from '@/components/kesehatan-shared';
import { Angka, Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, rupiah } from '@/keuangan/forms';

/** Tagihan terbit bersisa sesuai hak, dengan ringkasan dari kueri yang sama di server. */
export default function TunggakanScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [unit, setUnit] = useState('');
  const [lewat, setLewat] = useState(false);
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.tunggakan({ unit, lewat, q: terapan }, page), [unit, lewat, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return (
    <Halaman>
      <SearchField label="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ} onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
      <ChipRow>
        <Chip label="Semua" accessibilityRole="radio" selected={!lewat} onPress={() => { setLewat(false); setPage(1); }} />
        <Chip label="Lewat jatuh tempo" accessibilityRole="radio" selected={lewat} onPress={() => { setLewat(true); setPage(1); }} />
      </ChipRow>
      {data && data.unit.length > 1 ? (
        <ChipRow>
          <Chip label="Semua unit" accessibilityRole="radio" selected={unit === ''} onPress={() => { setUnit(''); setPage(1); }} />
          {data.unit.map(u => <Chip key={u} label={u} accessibilityRole="radio" selected={unit === u} onPress={() => { setUnit(u); setPage(1); }} />)}
        </ChipRow>
      ) : null}
      {!data ? <LoadingState label="Memuat tunggakan…" /> : (
        <>
          <Panel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Angka label="Jumlah tagihan" nilai={String(data.ringkasan.jumlah)} />
              <Angka label="Santri" nilai={String(data.ringkasan.santri)} />
              <Angka label="Total sisa" nilai={rupiah(data.ringkasan.sisa)} tone={data.ringkasan.sisa > 0 ? 'danger' : undefined} />
            </View>
          </Panel>
          {data.rows.length === 0 ? <EmptyState title="Tidak ada tunggakan" message="Tidak ada tagihan bersisa yang sesuai saringan dan hak akses Anda." /> : null}
          {data.rows.map(r => (
            <Card key={r.tagihan_id} accessibilityLabel={`Buka tagihan ${r.santri.nama} ${labelPeriode(r.periode)}`} onPress={() => router.push({ pathname: '/keuangan/tagihan/[id]', params: { id: String(r.tagihan_id) } })}>
              <View style={{ gap: 4 }}>
                <ThemedText type="bodyBold">{r.santri.nama} · {labelPeriode(r.periode)}</ThemedText>
                <ThemedText>Sisa {rupiah(r.sisa)} dari {rupiah(r.total)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">Jatuh tempo {tanggalPanjang(r.jatuh_tempo)}{r.santri.unit ? ` · ${r.santri.unit}` : ''}</ThemedText>
                <ChipRow>
                  {r.lewat_jatuh_tempo ? <Badge label="Lewat jatuh tempo" tone="danger" /> : null}
                  {r.menunggu_verifikasi > 0 ? <Badge label={`Transfer menunggu ${rupiah(r.menunggu_verifikasi)}`} tone="warning" /> : null}
                </ChipRow>
              </View>
            </Card>
          ))}
          <Penomoran page={data.page} total={data.total} perPage={data.per_page} onPage={setPage} />
        </>
      )}
    </Halaman>
  );
}
