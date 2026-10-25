import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Angka, Halaman } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelSumber, rupiah } from '@/keuangan/forms';

/**
 * Pintu modul keuangan V6. Tombol dipilih dari hak yang dihitung server
 * (`/v6/bsa/akses`); setiap layar tujuan memanggil server lagi.
 * Orang tua langsung melihat anak-anaknya sebagai kartu terpisah.
 */
export default function KeuanganHub() {
  const { profile } = useAuth();
  return <Hub key={profile?.id} />;
}

function Hub() {
  const router = useRouter();
  const fetcher = useCallback(async () => {
    let akses;
    try { akses = await keuangan.akses(); } catch (e) { if (e instanceof ApiError && e.status === 503) return { akses: null, anak: null }; throw e; }
    // Orang tua: daftar santri = anak dengan relasi wali aktif (server menyaring).
    const anak = akses.sumber === 'wali' ? await keuangan.daftarSantri('', 1) : null;
    return { akses, anak };
  }, []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa akses keuangan…" />;
  const { akses, anak } = data;
  if (!akses) return <EmptyState title="Modul keuangan belum tersedia" message="Server belum memasang modul keuangan santri. Hubungi admin pesantren." />;
  if (!akses.baca) {
    return <EmptyState title="Belum ada akses keuangan" message="Keuangan santri hanya untuk Petugas BSA berpenugasan aktif, admin, dan orang tua dengan relasi wali aktif." />;
  }
  const ke = (pathname: Parameters<typeof router.push>[0]) => router.push(pathname);

  if (akses.sumber === 'wali') {
    return (
      <Halaman>
        <ThemedText type="h3">Keuangan anak</ThemedText>
        <ThemedText themeColor="textSecondary">Tagihan bulanan dan tabungan dicatat Petugas BSA pesantren. Aplikasi hanya menampilkan; transaksi dilakukan di BSA.</ThemedText>
        {anak && anak.rows.length === 0 ? <EmptyState title="Belum ada data anak" message="Tidak ada anak dengan relasi wali aktif pada akun ini." /> : null}
        {anak?.rows.map(s => (
          <Card key={s.id} accessibilityLabel={`Buka keuangan ${s.nama}`} onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id) } })}>
            <View style={{ gap: 8 }}>
              <ThemedText type="bodyBold">{s.nama}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">NIS {s.nis}{s.kelas ? ` · ${s.kelas}` : ''}</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Angka label="Saldo tabungan" nilai={rupiah(s.saldo)} />
                <Angka label={`Sisa tagihan (${s.tagihan_terbuka})`} nilai={rupiah(s.sisa_tagihan)} tone={s.sisa_tagihan > 0 ? 'danger' : undefined} />
              </View>
            </View>
          </Card>
        ))}
        <AppButton label="Riwayat pembayaran tagihan" variant="secondary" onPress={() => ke('/keuangan/pembayaran')} />
        <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
      </Halaman>
    );
  }

  const kelola = akses.kelola;
  return (
    <Halaman>
      <Panel style={{ gap: 12 }}>
        <ThemedText type="h3">Keuangan santri (BSA)</ThemedText>
        <ThemedText themeColor="textSecondary">{labelSumber(akses.sumber)}{akses.jenjang ? ` · unit ${akses.jenjang.join(', ')}` : ''}</ThemedText>
        <AppButton label="Santri, saldo, dan tagihan" icon="users" onPress={() => ke('/keuangan/santri')} />
        <AppButton label={kelola ? 'Verifikasi transfer' : 'Transfer menunggu verifikasi'} variant="secondary" onPress={() => ke('/keuangan/verifikasi')} />
        <AppButton label="Pembayaran tagihan" variant="secondary" onPress={() => ke('/keuangan/pembayaran')} />
        <AppButton label="Tunggakan" variant="secondary" onPress={() => ke('/keuangan/tunggakan')} />
        <AppButton label="Mutasi tabungan" variant="secondary" onPress={() => ke('/keuangan/tabungan')} />
        <AppButton label="Rekonsiliasi harian" variant="secondary" onPress={() => ke('/keuangan/rekonsiliasi')} />
        {kelola ? <AppButton label="Terbitkan tagihan bulanan" variant="secondary" icon="plus" onPress={() => ke('/keuangan/penerbitan')} /> : null}
        {!kelola ? (
          <ThemedText type="caption" themeColor="textSecondary">
            Hanya membaca. Transaksi dicatat dan diverifikasi Petugas BSA berpenugasan aktif. Tarif dan penyesuaian diatur di website.
          </ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textSecondary">Tarif unit dan penyesuaian per santri diatur di website.</ThemedText>
        )}
      </Panel>
      <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
    </Halaman>
  );
}
