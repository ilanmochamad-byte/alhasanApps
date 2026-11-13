import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/app-button';
import { HalamanStack, HalamanStackKeadaan } from '@/components/halaman-stack';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { InfoRow } from '@/components/ui/info-row';
import { RowGroup } from '@/components/ui/list-row';
import { alamatLengkap } from '@/profil/format';
import { useProfil } from '@/profil/profil-context';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** 1990-02-01 → "1 Februari 1990" tanpa Intl agar sama di Hermes dan web. */
function formatTanggal(iso: string) {
  const [t, b, h] = iso.split('-').map(Number);
  return t && b && h ? `${h} ${BULAN[b - 1]} ${t}` : iso;
}

/**
 * Rincian data diri (redesain gelombang 2 §4.2, tindak lanjut audit TL-03).
 * Isinya sama persis dengan bagian "Data diri" yang dulu tampil langsung di
 * Profil, dibaca dari `GET /profile/pribadi` lewat konteks profil yang sama.
 * Hanya baca; perubahan tetap lewat Edit profil.
 */
export default function DataDiriScreen() {
  const router = useRouter();
  const { data: pribadi, status, error, muat } = useProfil();
  useFocusEffect(useCallback(() => { void muat(); }, [muat]));

  if (!pribadi) {
    return (
      <HalamanStackKeadaan title="Data diri">
        {status === 'gagal' && error ? (
          <ErrorState message={error} onRetry={() => void muat()} />
        ) : status === 'tidak_tersedia' ? (
          <ThemedText selectable themeColor="textSecondary">Data diri belum tersedia dari server.</ThemedText>
        ) : (
          <LoadingState label="Memuat data diri…" />
        )}
      </HalamanStackKeadaan>
    );
  }

  const kosong = 'Belum diisi';
  const alamat = alamatLengkap(pribadi.pribadi);
  const ttl = [pribadi.pribadi.tempat_lahir, pribadi.pribadi.tanggal_lahir ? formatTanggal(pribadi.pribadi.tanggal_lahir) : null]
    .filter(Boolean)
    .join(', ');

  return (
    <HalamanStack title="Data diri" bawah={<AppButton label="Edit profil" icon="person" onPress={() => router.push('/akun/edit-profil')} />}>
      <RowGroup>
        <InfoRow icon="person" label="Nama" value={pribadi.pribadi.nama || kosong} />
        {pribadi.pribadi.nip ? <InfoRow icon="info" label="NIP / nomor identitas" value={pribadi.pribadi.nip} /> : null}
        {pribadi.pribadi.nik ? <InfoRow icon="info" label="NIK" value={pribadi.pribadi.nik} /> : null}
        <InfoRow icon="calendar" label="Tempat, tanggal lahir" value={ttl || kosong} />
        <InfoRow icon="home" label="Alamat rumah" value={alamat ?? kosong} />
        <InfoRow icon="phone" label="No. HP" value={pribadi.pribadi.no_hp ?? kosong} />
        <InfoRow icon="mail" label="Email" value={pribadi.pribadi.email ?? kosong} last />
      </RowGroup>
      <ThemedText selectable type="caption" themeColor="textSecondary" style={styles.catatan}>
        Ubah data diri melalui Edit profil. Username dan penugasan diatur admin.
      </ThemedText>
    </HalamanStack>
  );
}

const styles = StyleSheet.create({ catatan: { paddingHorizontal: 4 } });
