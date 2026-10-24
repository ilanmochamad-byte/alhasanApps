import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';

/** Daftar ringkasan kesehatan anak berelasi wali aktif (proyeksi khusus, tanpa catatan klinis). */
export default function WaliDaftarScreen() {
  const { profile } = useAuth();
  return <Daftar key={profile?.id} />;
}

function Daftar() {
  const router = useRouter();
  const [anak, setAnak] = useState(0);
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => kesehatan.daftarWali(anak, page), [anak, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat informasi kesehatan…" />;
  const total = Math.max(1, Math.ceil(data.total / data.per_page));
  return (
    <Halaman>
      <ThemedText type="h3">Informasi kesehatan</ThemedText>
      {data.anak.length > 1 ? (
        <ChipRow>
          <Chip label="Semua anak" selected={anak === 0} onPress={() => { setAnak(0); setPage(1); }} />
          {data.anak.map(a => <Chip key={a.id} label={a.nama} selected={anak === a.id} onPress={() => { setAnak(a.id); setPage(1); }} />)}
        </ChipRow>
      ) : null}
      {data.rows.length === 0 ? <EmptyState title="Belum ada informasi kesehatan" message="Informasi akan tampil setelah klinik pesantren menerbitkan ringkasan untuk Anda." /> : null}
      {data.rows.map(r => (
        <Card key={r.id} accessibilityLabel={`Buka informasi kesehatan ${r.santri.nama} ${tanggalPanjang(r.tanggal_kunjungan)}`}
          onPress={() => router.push({ pathname: '/kesehatan/wali/[id]', params: { id: String(r.id) } })}>
          <View style={{ gap: 6 }}>
            <ThemedText type="bodyBold">{r.santri.nama}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Kunjungan {tanggalPanjang(r.tanggal_kunjungan)} · diterbitkan {waktuPendek(r.diterbitkan_pada)}</ThemedText>
            <ChipRow>
              <StatusBadge status={r.status} />
              {r.diperbarui ? <Badge label="Diperbarui" /> : null}
              {r.ada_tindak_lanjut && r.status === 'Terbit' ? <Badge label="Perlu perhatian" tone="warning" /> : null}
            </ChipRow>
          </View>
        </Card>
      ))}
      {total > 1 ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} style={{ flex: 1 }} />
          <ThemedText>{page}/{total}</ThemedText>
          <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= total} onPress={() => setPage(page + 1)} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Halaman>
  );
}
