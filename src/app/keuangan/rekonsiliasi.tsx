import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, JudulBagian, Kartu, Pesan } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { DateField } from '@/components/ui/date-field';
import { EntityRow } from '@/components/ui/entity-row';
import { InfoRow } from '@/components/ui/info-row';
import { StatGrid } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { useTheme } from '@/hooks/use-theme';
import { labelJenis, nominalBertanda, putaranArah, rupiah, tanggalKini } from '@/keuangan/forms';

/**
 * Rekonsiliasi harian dari server (pola P-Laporan): kas tunai/transfer nyata
 * dipisah dari perpindahan internal tabungan ↔ tagihan, sehingga pembayaran
 * dari tabungan tidak terhitung sebagai penerimaan kas baru. Aplikasi tidak
 * menghitung ulang; "Keluar" hanya menjumlahkan dua angka keluar server.
 */
export default function RekonsiliasiScreen() {
  const { profile } = useAuth();
  return <Laporan key={profile?.id} />;
}

/** Pil selisih: nol = sesuai (centang), selain nol = ada selisih (silang). */
function PilSelisih({ label, nilai }: { label: string; nilai: number }) {
  return <StatusPill tone={nilai === 0 ? 'success' : 'danger'} label={`${label} ${rupiah(nilai)}`} />;
}

function Laporan() {
  const theme = useTheme();
  const [tanggal, setTanggal] = useState(tanggalKini());
  const [terapan, setTerapan] = useState(tanggal);
  const fetcher = useCallback(() => keuangan.rekonsiliasi(terapan), [terapan]);
  const { data: r, error, load } = usePrivateResource(fetcher);
  return (
    <Halaman title="Rekonsiliasi harian">
      <Kartu>
        <DateField label="Tanggal" value={tanggal} onChange={setTanggal} />
        <AppButton label="Tampilkan" size="sm" variant="secondary" icon="calendar" onPress={() => setTerapan(tanggal)} />
      </Kartu>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !r ? <LoadingState label="Menyusun rekonsiliasi…" /> : (
        <>
          <View style={[styles.saldo, { backgroundColor: theme.heroSurface, borderColor: theme.heroBorder }]}>
            <ThemedText selectable type="overline" style={{ color: theme.heroAccent }}>{`SALDO TABUNGAN · ${tanggalPanjang(r.tanggal).toUpperCase()}`}</ThemedText>
            <View style={styles.saldoBaris}>
              <ThemedText selectable style={[styles.flex, { color: theme.heroTextSecondary }]}>
                Awal hari{'\n'}<ThemedText type="numeralCard" style={{ color: theme.heroText }}>{rupiah(r.saldo.awal)}</ThemedText>
              </ThemedText>
              <AppIcon name="arrow-right" size={22} color={theme.heroAccent} />
              <ThemedText selectable style={[styles.flex, styles.kanan, { color: theme.heroTextSecondary }]}>
                Akhir hari{'\n'}<ThemedText type="numeralCard" style={{ color: theme.heroText }}>{rupiah(r.saldo.akhir)}</ThemedText>
              </ThemedText>
            </View>
          </View>
          <StatGrid items={[
            { icon: 'plus', label: 'Penerimaan kas baru', value: rupiah(r.penerimaan_kas_baru), labelDulu: true },
            { icon: 'arrow-right', label: 'Keluar (tunai + transfer)', value: rupiah(r.kas.Tunai.keluar + r.kas.Transfer.keluar), tone: 'warning', labelDulu: true },
            { icon: 'wallet', label: 'Mutasi bersih tabungan', value: rupiah(r.saldo.mutasi_bersih), tone: 'info', labelDulu: true },
          ]} />

          <JudulBagian title={`Kas ${tanggalPanjang(r.tanggal)}`} />
          {(['Tunai', 'Transfer'] as const).map(c => (
            <Kartu key={c} gap={0}>
              <ThemedText selectable type="h3">{c}</ThemedText>
              <InfoRow label="Masuk (setoran + pembayaran tagihan + koreksi)" value={`${rupiah(r.kas[c].setoran)} + ${rupiah(r.kas[c].pembayaran_tagihan)} + ${rupiah(r.kas[c].koreksi_masuk)} = ${rupiah(r.kas[c].masuk)}`} />
              <InfoRow label="Keluar (penarikan/belanja + koreksi)" value={`${rupiah(r.kas[c].penarikan_belanja)} + ${rupiah(r.kas[c].koreksi_keluar)} = ${rupiah(r.kas[c].keluar)}`} />
              <InfoRow label={`Bersih ${c.toLowerCase()}`} value={rupiah(r.kas[c].bersih)} last />
            </Kartu>
          ))}

          <JudulBagian title="Perpindahan internal (bukan kas)" />
          <Kartu gap={0}>
            <InfoRow label="Debit tabungan untuk tagihan" value={rupiah(r.internal.debit_tabungan)} />
            <InfoRow label="Pembayaran tagihan dari tabungan" value={rupiah(r.internal.pembayaran_dari_tabungan)} />
            <InfoRow label="Pengembalian ke tabungan" value={rupiah(r.internal.pengembalian_ke_tabungan)} last />
          </Kartu>
          <BarisPil>
            <PilSelisih label="Selisih" nilai={r.internal.selisih} />
            <PilSelisih label="Selisih pengembalian" nilai={r.internal.selisih_pengembalian} />
          </BarisPil>

          <JudulBagian title="Saldo tabungan" />
          <Kartu gap={0}>
            <InfoRow label="Awal hari" value={rupiah(r.saldo.awal)} />
            <InfoRow label="Mutasi bersih" value={rupiah(r.saldo.mutasi_bersih)} />
            <InfoRow label="Akhir hari" value={rupiah(r.saldo.akhir)} last />
          </Kartu>
          <BarisPil>
            <PilSelisih label="Selisih ledger" nilai={r.saldo.selisih} />
            <PilSelisih label="Selisih akun" nilai={r.saldo.selisih_akun} />
          </BarisPil>
          <Pesan tone="info" text={`Menunggu verifikasi (belum dihitung): ${r.menunggu.setoran_transfer.jumlah} setoran ${rupiah(r.menunggu.setoran_transfer.nominal)}, ${r.menunggu.pembayaran_transfer.jumlah} pembayaran ${rupiah(r.menunggu.pembayaran_transfer.nominal)}.`} />

          <JudulBagian title={`Rincian (${r.rows.length})`} />
          {r.rows.length === 0 ? <EmptyState icon="calendar" title="Tidak ada transaksi" message="Belum ada transaksi sah pada tanggal ini." /> : null}
          {r.rows.map(x => (
            <EntityRow key={`${x.asal}-${x.id}-${x.jenis}`} icon="arrow-right" iconRotate={putaranArah(x.arah)} tone={x.internal ? 'violet' : x.arah === 'Masuk' ? 'primary' : 'warning'}
              title={x.santri.nama}
              subtitle={`${labelJenis(x.jenis)} · ${x.cara} · ${x.nomor_kuitansi ?? '—'} · ${waktuPendek(x.waktu)}`}
              value={nominalBertanda(x.arah, x.nominal)} valueTone={x.internal ? 'text' : x.arah === 'Masuk' ? 'primary' : 'warning'}
              pill={x.internal ? <StatusPill tone="violet" icon="refresh" label="Perpindahan internal" /> : undefined} />
          ))}
        </>
      )}
    </Halaman>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kanan: { textAlign: 'right' },
  saldo: { borderWidth: 1, borderRadius: 22, borderCurve: 'continuous', padding: 18, gap: 10 },
  saldoBaris: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
