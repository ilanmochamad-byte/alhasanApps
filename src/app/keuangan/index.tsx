import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { Halaman, HalamanKeadaan, JudulBagian, Kartu, TombolMuatUlang } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/app-button';
import { HeroCard } from '@/components/ui/hero-card';
import { InfoRow } from '@/components/ui/info-row';
import { MenuTileGrid, type MenuTileItem } from '@/components/ui/menu-tile';
import { StatGrid } from '@/components/ui/stat-card';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelSumber, rupiah } from '@/keuangan/forms';

/**
 * Pintu modul keuangan V6 (pola P-Menu). Ubin dipilih dari hak yang dihitung
 * server (`/v6/bsa/akses`); setiap layar tujuan memanggil server lagi.
 * Orang tua langsung melihat anak-anaknya sebagai kartu terpisah. Respons
 * akses petugas/admin tidak memuat angka, sehingga ringkasan angka hanya
 * tampil untuk orang tua (dari daftar anak yang sudah dimuat).
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
  const muatUlang = <TombolMuatUlang onPress={() => void load()} />;
  if (error) return <HalamanKeadaan title="Keuangan"><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title="Keuangan"><LoadingState label="Memeriksa akses keuangan…" /></HalamanKeadaan>;
  const { akses, anak } = data;
  if (!akses) {
    return <HalamanKeadaan title="Keuangan"><EmptyState icon="wallet" title="Modul keuangan belum tersedia" message="Server belum memasang modul keuangan santri. Hubungi admin pesantren." /></HalamanKeadaan>;
  }
  if (!akses.baca) {
    return <HalamanKeadaan title="Keuangan"><EmptyState icon="lock" title="Belum ada akses keuangan" message="Keuangan santri hanya untuk Petugas BSA berpenugasan aktif, admin, dan orang tua dengan relasi wali aktif." /></HalamanKeadaan>;
  }
  const ke = (pathname: Parameters<typeof router.push>[0]) => router.push(pathname);

  if (akses.sumber === 'wali') {
    return (
      <Halaman title="Keuangan anak" actions={muatUlang}>
        <ThemedText selectable themeColor="textSecondary">Tagihan bulanan dan tabungan dicatat Petugas BSA pesantren. Aplikasi hanya menampilkan; transaksi dilakukan di BSA.</ThemedText>
        {anak && anak.rows.length === 0 ? <EmptyState icon="users" title="Belum ada data anak" message="Tidak ada anak dengan relasi wali aktif pada akun ini." /> : null}
        {anak?.rows.map(s => (
          <View key={s.id} style={{ gap: 10 }}>
            <HeroCard overline="Saldo tabungan" value={rupiah(s.saldo)} title={s.nama} caption={`NIS ${s.nis}${s.kelas ? ` · ${s.kelas}` : ''}`}
              action={{ label: 'Lihat rincian', icon: 'arrow-right', accessibilityLabel: `Buka keuangan ${s.nama}`,
                onPress: () => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id) } }) }} />
            <StatGrid items={[{ icon: 'wallet', label: `Sisa tagihan (${s.tagihan_terbuka} terbuka)`, value: rupiah(s.sisa_tagihan), tone: s.sisa_tagihan > 0 ? 'warning' : 'primary' }]} />
            {/* §4.9 (TL-12): pintasan per anak ke tab rincian yang sama (data
                per anak dari rincian santri; daftar lintas santri tetap tertutup). */}
            <View style={styles.pintasan}>
              <AppButton label="Tagihan" icon="izin" size="sm" variant="line" style={styles.pintasanTombol}
                accessibilityHint={`Membuka tagihan ${s.nama}`}
                onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id), bagian: 'tagihan' } })} />
              <AppButton label="Mutasi tabungan" icon="wallet" size="sm" variant="line" style={styles.pintasanTombol}
                accessibilityHint={`Membuka mutasi tabungan ${s.nama}`}
                onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(s.id), bagian: 'tabungan' } })} />
            </View>
          </View>
        ))}
        <JudulBagian title="Riwayat dan laporan" />
        <MenuTileGrid items={[
          { icon: 'check-circle', label: 'Riwayat pembayaran tagihan', onPress: () => ke('/keuangan/pembayaran') },
          { icon: 'chart', label: 'Laporan keuangan anak', tone: 'info', onPress: () => ke('/keuangan/laporan') },
        ]} />
      </Halaman>
    );
  }

  const kelola = akses.kelola;
  const ubin: MenuTileItem[] = [
    { icon: 'users', label: 'Santri, saldo, dan tagihan', onPress: () => ke('/keuangan/santri') },
    { icon: 'clock', label: kelola ? 'Verifikasi transfer' : 'Transfer menunggu verifikasi', tone: 'warning', onPress: () => ke('/keuangan/verifikasi') },
    { icon: 'check-circle', label: 'Pembayaran tagihan', onPress: () => ke('/keuangan/pembayaran') },
    { icon: 'wallet', label: 'Mutasi tabungan', tone: 'info', onPress: () => ke('/keuangan/tabungan') },
    { icon: 'info', label: 'Tunggakan', tone: 'warning', onPress: () => ke('/keuangan/tunggakan') },
    ...(kelola ? [{ icon: 'plus', label: 'Terbitkan tagihan bulanan', onPress: () => ke('/keuangan/penerbitan') } satisfies MenuTileItem] : []),
    { icon: 'calendar', label: 'Rekonsiliasi harian', tone: 'violet', onPress: () => ke('/keuangan/rekonsiliasi') },
    { icon: 'chart', label: 'Laporan per periode', tone: 'info', onPress: () => ke('/keuangan/laporan') },
  ];
  return (
    <Halaman title="Keuangan" actions={muatUlang}>
      <ThemedText selectable type="display" accessibilityRole="header">Keuangan santri (BSA)</ThemedText>
      <Kartu gap={0}>
        <InfoRow icon="person" label="Akses Anda" value={labelSumber(akses.sumber)} last={!akses.jenjang} />
        {akses.jenjang ? <InfoRow icon="book" label="Cakupan unit" value={`unit ${akses.jenjang.join(', ')}`} last /> : null}
      </Kartu>
      <MenuTileGrid items={ubin} />
      <ThemedText selectable type="caption" themeColor="textSecondary">
        {kelola ? 'Tarif unit dan penyesuaian per santri diatur di website.'
          : 'Hanya membaca. Transaksi dicatat dan diverifikasi Petugas BSA berpenugasan aktif. Tarif dan penyesuaian diatur di website.'}
      </ThemedText>
    </Halaman>
  );
}

const styles = StyleSheet.create({
  pintasan: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pintasanTombol: { flexGrow: 1, flexBasis: 140 },
});
