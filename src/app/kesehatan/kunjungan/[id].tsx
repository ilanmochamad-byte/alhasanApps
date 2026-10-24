import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ChipRow } from '@/components/ui/chip';
import { Divider, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';

/**
 * Rincian satu kunjungan (isi klinis). Setiap pembukaan, fokus kembali, dan
 * kembali dari latar memanggil server lagi — yang mencatat log akses dan
 * memeriksa ulang penugasan/cakupan. Data dibuang dari memori saat layar
 * ditinggalkan atau aplikasi ke latar.
 */
export default function KunjunganScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detail key={`${profile?.id}:${id}`} id={Number(id)} />;
}

function Detail({ id }: { id: number }) {
  const router = useRouter();
  const fetcher = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Penunjuk kunjungan tidak valid.');
    return kesehatan.detail(id);
  }, [id]);
  const { data: k, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!k) return <LoadingState label="Memeriksa akses rincian…" />;
  const a = k.akses;
  const ke = (pathname: '/kesehatan/catat' | '/kesehatan/versi' | '/kesehatan/akses' | '/kesehatan/ringkasan') =>
    router.push({ pathname, params: { id: String(k.id) } });
  return (
    <Halaman>
      <ChipRow><StatusBadge status={k.status} /></ChipRow>
      <ThemedText type="caption" themeColor="textSecondary">
        {a.catat ? '' : 'Hanya baca. '}Pembukaan rincian ini tercatat di riwayat akses.
      </ThemedText>
      <Panel style={{ gap: 10 }}>
        <Baris label="Santri" value={`${k.santri.nama} · NIS ${k.santri.nis}`} />
        <Baris label="Waktu kunjungan" value={waktuPendek(k.waktu_kunjungan)} />
        <Baris label="Petugas pencatat" value={k.petugas.nama} />
        <Baris label="Dicatat pada" value={waktuPendek(k.dicatat_pada)} />
        <Baris label="Versi" value={String(k.versi)} />
        <AppButton label="Riwayat kesehatan santri ini" size="sm" variant="secondary"
          onPress={() => router.push({ pathname: '/kesehatan/daftar', params: { santri_id: String(k.santri.id) } })} />
      </Panel>

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Catatan klinik</ThemedText>
        <Baris label="Keluhan" value={k.keluhan} />
        <Baris label="Catatan klinis" value={k.catatan_klinis} />
        <Baris label="Tindakan" value={k.tindakan} />
      </Panel>

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Obat yang diberikan ({k.obat.length})</ThemedText>
        {k.obat.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada obat yang dicatat.</ThemedText> : null}
        {k.obat.map((o, i) => (
          <View key={o.id ?? i} style={{ gap: 4 }}>
            {i > 0 ? <Divider /> : null}
            <ThemedText type="bodyBold">{o.nama_obat}</ThemedText>
            <ThemedText>Jumlah: {o.jumlah ? `${o.jumlah}${o.satuan ? ` ${o.satuan}` : ''}` : '—'}</ThemedText>
            <ThemedText>Petunjuk: {o.petunjuk || '—'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Waktu pemberian: {waktuPendek(o.waktu_pemberian)}</ThemedText>
          </View>
        ))}
      </Panel>

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Rujukan ({k.rujukan.length})</ThemedText>
        {k.rujukan.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada rujukan.</ThemedText> : null}
        {k.rujukan.map((r, i) => (
          <View key={r.id ?? i} style={{ gap: 4 }}>
            {i > 0 ? <Divider /> : null}
            <ThemedText type="bodyBold">{r.tujuan}</ThemedText>
            <ChipRow><StatusBadge status={r.status} /></ChipRow>
            <ThemedText>Tanggal rujukan: {tanggalPanjang(r.tanggal_rujukan)}</ThemedText>
            <ThemedText>Alasan/catatan: {r.alasan || '—'}</ThemedText>
            <ThemedText>Hasil: {r.hasil ? `${r.hasil} (${tanggalPanjang(r.tanggal_hasil)})` : 'Belum diketahui'}</ThemedText>
            {a.catat && r.status === 'Menunggu hasil' && r.id !== null ? (
              <AppButton label="Catat hasil rujukan" size="sm" variant="secondary"
                onPress={() => router.push({ pathname: '/kesehatan/hasil-rujukan', params: { id: String(k.id), rujukan: String(r.id) } })} />
            ) : null}
          </View>
        ))}
      </Panel>

      <Panel style={{ gap: 10 }}>
        <ThemedText type="h3">Tindak lanjut ({k.tindak_lanjut.length})</ThemedText>
        {k.tindak_lanjut.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada tindak lanjut.</ThemedText> : null}
        {k.tindak_lanjut.map((t, i) => (
          <View key={t.id ?? i} style={{ gap: 4 }}>
            {i > 0 ? <Divider /> : null}
            <ThemedText>{t.uraian}</ThemedText>
            <ChipRow><StatusBadge status={t.status} /></ChipRow>
            <ThemedText type="caption" themeColor="textSecondary">
              Target: {tanggalPanjang(t.tanggal_target)}{t.tanggal_selesai ? ` · selesai ${tanggalPanjang(t.tanggal_selesai)}` : ''}
            </ThemedText>
          </View>
        ))}
      </Panel>

      {k.status === 'Tercatat' || a.cakupan === 'seluruh' ? (
        <AppButton label="Ringkasan untuk wali" variant="secondary" onPress={() => ke('/kesehatan/ringkasan')} />
      ) : null}
      {a.catat ? <AppButton label={k.status === 'Draf' ? 'Lanjutkan draf' : 'Koreksi catatan'} onPress={() => ke('/kesehatan/catat')} /> : null}
      {a.riwayat_versi ? <AppButton label={`Riwayat versi (${k.versi})`} variant="secondary" onPress={() => ke('/kesehatan/versi')} /> : null}
      {a.riwayat_akses ? <AppButton label="Riwayat akses" variant="secondary" onPress={() => ke('/kesehatan/akses')} /> : null}
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}
