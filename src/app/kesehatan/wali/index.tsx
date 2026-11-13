import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { BarisPilIsi } from '@/components/halaman-stack';
import { Halaman, HalamanKeadaan, Penanda, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
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
  if (error) return <HalamanKeadaan title="Kesehatan anak"><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title="Kesehatan anak"><LoadingState label="Memuat informasi kesehatan…" /></HalamanKeadaan>;
  const total = Math.max(1, Math.ceil(data.total / data.per_page));
  return (
    <Halaman title="Kesehatan anak">
      <ThemedText type="h3">Informasi kesehatan</ThemedText>
      {data.anak.length > 1 ? (
        <FilterPills bungkus accessibilityLabel="Pilih anak" value={String(anak)} onChange={v => { setAnak(Number(v)); setPage(1); }}
          options={[{ value: '0', label: 'Semua anak' }, ...data.anak.map(a => ({ value: String(a.id), label: a.nama }))]} />
      ) : null}
      {data.rows.length === 0 ? <EmptyState icon="medical" title="Belum ada informasi kesehatan" message="Informasi akan tampil setelah klinik pesantren menerbitkan ringkasan untuk Anda." /> : null}
      {data.rows.map(r => (
        <EntityRow key={r.id} avatarName={r.santri.nama} title={r.santri.nama}
          subtitle={`Kunjungan ${tanggalPanjang(r.tanggal_kunjungan)} · diterbitkan ${waktuPendek(r.diterbitkan_pada)}`}
          accessibilityLabel={`Buka informasi kesehatan ${r.santri.nama} ${tanggalPanjang(r.tanggal_kunjungan)}`}
          highlight={r.ada_tindak_lanjut && r.status === 'Terbit' ? 'warning' : undefined}
          onPress={() => router.push({ pathname: '/kesehatan/wali/[id]', params: { id: String(r.id) } })}
          pill={(
            <BarisPilIsi>
              <StatusBadge status={r.status} />
              {r.diperbarui ? <Penanda label="Diperbarui" /> : null}
              {r.ada_tindak_lanjut && r.status === 'Terbit' ? <Penanda label="Perlu perhatian" nada="warning" /> : null}
            </BarisPilIsi>
          )} />
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
