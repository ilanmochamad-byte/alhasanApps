import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { kesehatan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { BarisPilIsi, JudulBagianIsi, KartuIsi, PenandaPrivat, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { Baris, Halaman, HalamanKeadaan, Penanda, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { ListRow, RowGroup } from '@/components/ui/list-row';
import { ProfileHeader } from '@/components/ui/profile-header';
import { Divider } from '@/components/ui/surface';
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
  if (error) return <HalamanKeadaan title="Detail kunjungan"><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!k) return <HalamanKeadaan title="Detail kunjungan"><LoadingState label="Memeriksa akses rincian…" /></HalamanKeadaan>;
  const a = k.akses;
  const ke = (pathname: '/kesehatan/catat' | '/kesehatan/versi' | '/kesehatan/akses' | '/kesehatan/ringkasan') =>
    router.push({ pathname, params: { id: String(k.id) } });
  return (
    <Halaman title="Detail kunjungan" actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      <ProfileHeader avatar={<AvatarInisial nama={k.santri.nama} ukuran={64} />} name={k.santri.nama}
        caption={`NIS ${k.santri.nis} · ${waktuPendek(k.waktu_kunjungan)}`}
        pills={<BarisPilIsi><StatusBadge status={k.status} /><Penanda label={`Versi ${k.versi}`} /></BarisPilIsi>}>
        <AppButton label="Riwayat kesehatan santri ini" size="sm" variant="secondary"
          onPress={() => router.push({ pathname: '/kesehatan/daftar', params: { santri_id: String(k.santri.id) } })} />
      </ProfileHeader>
      <ThemedText type="caption" themeColor="textSecondary">
        {a.catat ? '' : 'Hanya baca. '}Pembukaan rincian ini tercatat di riwayat akses.
      </ThemedText>
      <KartuIsi gap={0}>
        <Baris label="Waktu kunjungan" value={waktuPendek(k.waktu_kunjungan)} />
        <Baris label="Petugas pencatat" value={k.petugas.nama} />
        <Baris label="Dicatat pada" value={waktuPendek(k.dicatat_pada)} last />
      </KartuIsi>

      <JudulBagianIsi title="Catatan klinik" icon="lock" />
      <PenandaPrivat text="Privat: hanya petugas kesehatan dan pihak berhak; tidak tampil untuk orang tua." />
      <KartuIsi gap={0}>
        <Baris label="Keluhan" value={k.keluhan} />
        <Baris label="Catatan klinis" value={k.catatan_klinis} />
        <Baris label="Tindakan" value={k.tindakan} last />
      </KartuIsi>

      <JudulBagianIsi title={`Obat yang diberikan (${k.obat.length})`} />
      <KartuIsi gap={10}>
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
      </KartuIsi>

      <JudulBagianIsi title={`Rujukan (${k.rujukan.length})`} />
      <KartuIsi gap={10}>
        {k.rujukan.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada rujukan.</ThemedText> : null}
        {k.rujukan.map((r, i) => (
          <View key={r.id ?? i} style={{ gap: 4 }}>
            {i > 0 ? <Divider /> : null}
            <ThemedText type="bodyBold">{r.tujuan}</ThemedText>
            <BarisPilIsi><StatusBadge status={r.status} /></BarisPilIsi>
            <ThemedText>Tanggal rujukan: {tanggalPanjang(r.tanggal_rujukan)}</ThemedText>
            <ThemedText>Alasan/catatan: {r.alasan || '—'}</ThemedText>
            <ThemedText>Hasil: {r.hasil ? `${r.hasil} (${tanggalPanjang(r.tanggal_hasil)})` : 'Belum diketahui'}</ThemedText>
            {a.catat && r.status === 'Menunggu hasil' && r.id !== null ? (
              <AppButton label="Catat hasil rujukan" size="sm" variant="secondary"
                onPress={() => router.push({ pathname: '/kesehatan/hasil-rujukan', params: { id: String(k.id), rujukan: String(r.id) } })} />
            ) : null}
          </View>
        ))}
      </KartuIsi>

      <JudulBagianIsi title={`Tindak lanjut (${k.tindak_lanjut.length})`} />
      <KartuIsi gap={10}>
        {k.tindak_lanjut.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada tindak lanjut.</ThemedText> : null}
        {k.tindak_lanjut.map((t, i) => (
          <View key={t.id ?? i} style={{ gap: 4 }}>
            {i > 0 ? <Divider /> : null}
            <ThemedText>{t.uraian}</ThemedText>
            <BarisPilIsi><StatusBadge status={t.status} /></BarisPilIsi>
            <ThemedText type="caption" themeColor="textSecondary">
              Target: {tanggalPanjang(t.tanggal_target)}{t.tanggal_selesai ? ` · selesai ${tanggalPanjang(t.tanggal_selesai)}` : ''}
            </ThemedText>
          </View>
        ))}
      </KartuIsi>

      {k.status === 'Tercatat' || a.cakupan === 'seluruh' ? (
        <>
          <JudulBagianIsi title="Untuk orang tua" />
          <ThemedText type="caption" themeColor="textSecondary">Ringkasan untuk wali disusun terpisah dari catatan klinis di atas.</ThemedText>
          <AppButton label="Ringkasan untuk wali" variant="secondary" icon="users" onPress={() => ke('/kesehatan/ringkasan')} />
        </>
      ) : null}
      {a.riwayat_versi || a.riwayat_akses ? (
        <RowGroup>
          {a.riwayat_versi ? (
            <ListRow icon="clock" title={`Riwayat versi (${k.versi})`} accessibilityLabel={`Riwayat versi (${k.versi})`}
              onPress={() => ke('/kesehatan/versi')} last={!a.riwayat_akses} />
          ) : null}
          {a.riwayat_akses ? <ListRow icon="eye" title="Riwayat akses" accessibilityLabel="Riwayat akses" onPress={() => ke('/kesehatan/akses')} last /> : null}
        </RowGroup>
      ) : null}
      {a.catat ? <AppButton label={k.status === 'Draf' ? 'Lanjutkan draf' : 'Koreksi catatan'} onPress={() => ke('/kesehatan/catat')} /> : null}
    </Halaman>
  );
}
