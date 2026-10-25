import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, waktuPendek } from '@/components/kesehatan-shared';
import { Angka, Halaman } from '@/components/keuangan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Divider, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelJenis, rupiah, tanggalKini } from '@/keuangan/forms';

/**
 * Rekonsiliasi harian dari server: kas tunai/transfer nyata dipisah dari
 * perpindahan internal tabungan ↔ tagihan, sehingga pembayaran dari tabungan
 * tidak terhitung sebagai penerimaan kas baru. Aplikasi tidak menghitung ulang.
 */
export default function RekonsiliasiScreen() {
  const { profile } = useAuth();
  return <Laporan key={profile?.id} />;
}

function Laporan() {
  const [tanggal, setTanggal] = useState(tanggalKini());
  const [terapan, setTerapan] = useState(tanggal);
  const fetcher = useCallback(() => keuangan.rekonsiliasi(terapan), [terapan]);
  const { data: r, error, load } = usePrivateResource(fetcher);
  return (
    <Halaman>
      <DateField label="Tanggal" value={tanggal} onChange={setTanggal} />
      <AppButton label="Tampilkan" size="sm" variant="secondary" onPress={() => setTerapan(tanggal)} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !r ? <LoadingState label="Menyusun rekonsiliasi…" /> : (
        <>
          <Panel style={{ gap: 10 }}>
            <ThemedText type="h3">Kas {r.tanggal}</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Angka label="Penerimaan kas baru" nilai={rupiah(r.penerimaan_kas_baru)} />
              <Angka label="Bersih tunai" nilai={rupiah(r.kas.Tunai.bersih)} />
              <Angka label="Bersih transfer" nilai={rupiah(r.kas.Transfer.bersih)} />
            </View>
            {(['Tunai', 'Transfer'] as const).map(c => (
              <View key={c} style={{ gap: 4 }}>
                <Divider />
                <ThemedText type="bodyBold">{c}</ThemedText>
                <Baris label="Masuk (setoran + pembayaran tagihan + koreksi)" value={`${rupiah(r.kas[c].setoran)} + ${rupiah(r.kas[c].pembayaran_tagihan)} + ${rupiah(r.kas[c].koreksi_masuk)} = ${rupiah(r.kas[c].masuk)}`} />
                <Baris label="Keluar (penarikan/belanja + koreksi)" value={`${rupiah(r.kas[c].penarikan_belanja)} + ${rupiah(r.kas[c].koreksi_keluar)} = ${rupiah(r.kas[c].keluar)}`} />
              </View>
            ))}
          </Panel>
          <Panel style={{ gap: 8 }}>
            <ThemedText type="h3">Perpindahan internal (bukan kas)</ThemedText>
            <Baris label="Debit tabungan untuk tagihan" value={rupiah(r.internal.debit_tabungan)} />
            <Baris label="Pembayaran tagihan dari tabungan" value={rupiah(r.internal.pembayaran_dari_tabungan)} />
            <Baris label="Pengembalian ke tabungan" value={rupiah(r.internal.pengembalian_ke_tabungan)} />
            <ChipRow>
              <Badge label={`Selisih ${rupiah(r.internal.selisih)}`} tone={r.internal.selisih === 0 ? 'primary' : 'danger'} />
              <Badge label={`Selisih pengembalian ${rupiah(r.internal.selisih_pengembalian)}`} tone={r.internal.selisih_pengembalian === 0 ? 'primary' : 'danger'} />
            </ChipRow>
          </Panel>
          <Panel style={{ gap: 8 }}>
            <ThemedText type="h3">Saldo tabungan</ThemedText>
            <Baris label="Awal hari" value={rupiah(r.saldo.awal)} />
            <Baris label="Mutasi bersih" value={rupiah(r.saldo.mutasi_bersih)} />
            <Baris label="Akhir hari" value={rupiah(r.saldo.akhir)} />
            <ChipRow>
              <Badge label={`Selisih ledger ${rupiah(r.saldo.selisih)}`} tone={r.saldo.selisih === 0 ? 'primary' : 'danger'} />
              <Badge label={`Selisih akun ${rupiah(r.saldo.selisih_akun)}`} tone={r.saldo.selisih_akun === 0 ? 'primary' : 'danger'} />
            </ChipRow>
            <ThemedText type="caption" themeColor="textSecondary">
              Menunggu verifikasi (belum dihitung): {r.menunggu.setoran_transfer.jumlah} setoran {rupiah(r.menunggu.setoran_transfer.nominal)}, {r.menunggu.pembayaran_transfer.jumlah} pembayaran {rupiah(r.menunggu.pembayaran_transfer.nominal)}.
            </ThemedText>
          </Panel>
          <Panel style={{ gap: 8 }}>
            <ThemedText type="h3">Rincian ({r.rows.length})</ThemedText>
            {r.rows.map(x => (
              <View key={`${x.asal}-${x.id}-${x.jenis}`} style={{ gap: 2 }}>
                <ThemedText type="bodyBold">{x.santri.nama} · {x.arah === 'Masuk' ? '+' : '−'}{rupiah(x.nominal)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">{labelJenis(x.jenis)} · {x.cara}{x.internal ? ' · internal' : ''} · {x.nomor_kuitansi ?? '—'} · {waktuPendek(x.waktu)}</ThemedText>
              </View>
            ))}
          </Panel>
        </>
      )}
    </Halaman>
  );
}
