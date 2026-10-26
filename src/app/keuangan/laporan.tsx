import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan, type LaporanKeuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { Baris, waktuPendek } from '@/components/kesehatan-shared';
import { Angka, Halaman, Penomoran } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { Card, Divider, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, PILIHAN_RENTANG, rentangLaporan, rupiah, type PilihanRentang } from '@/keuangan/forms';

/**
 * Laporan keuangan per periode (PRD V6 Fase 5). Seluruh angka dihitung server
 * dalam satu snapshot menurut hak akun: petugas BSA cakupannya, admin seluruh
 * santri, orang tua hanya anaknya (tanpa kas, perpindahan internal, jejak
 * koreksi, atau transfer menunggu). Aplikasi tidak menghitung ulang dan tidak
 * menyimpan berkas ekspor; ekspor CSV ada di website.
 */
export default function LaporanScreen() {
  const { profile } = useAuth();
  return <Laporan key={profile?.id} />;
}

function Laporan() {
  const router = useRouter();
  const [pilihan, setPilihan] = useState<PilihanRentang>('bulan_ini');
  const [q, setQ] = useState('');
  const [terapan, setTerapan] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => keuangan.laporan({ ...rentangLaporan(pilihan), q: terapan }, page), [pilihan, terapan, page]);
  const { data: l, error, load } = usePrivateResource(fetcher);
  const wali = l?.akses.sumber === 'wali';
  return (
    <Halaman>
      <ChipRow>
        {PILIHAN_RENTANG.map(p => (
          <Chip key={p.nilai} label={p.label} accessibilityRole="radio" selected={pilihan === p.nilai} onPress={() => { setPilihan(p.nilai); setPage(1); }} />
        ))}
      </ChipRow>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !l ? <LoadingState label="Menyusun laporan…" /> : (
        <>
          <ThemedText themeColor="textSecondary">
            {l.rentang.dari === l.rentang.sampai ? labelPeriode(l.rentang.dari) : `${labelPeriode(l.rentang.dari)} – ${labelPeriode(l.rentang.sampai)}`}
            {wali ? ' · anak Anda' : l.akses.jenjang ? ` · unit ${l.akses.jenjang.join(', ')}` : ' · seluruh santri'}
          </ThemedText>
          {l.selisih ? (
            <ChipRow>
              <Badge label={l.selisih.nol ? 'Rekonsiliasi: selisih Rp0' : 'Rekonsiliasi: ADA SELISIH'} tone={l.selisih.nol ? 'primary' : 'danger'} />
            </ChipRow>
          ) : null}
          <BagianTagihan l={l} />
          <BagianTabungan l={l} />
          {l.kas && l.internal ? (
            <Panel style={{ gap: 8 }}>
              <ThemedText type="h3">Kas dan perpindahan internal</ThemedText>
              <Angka label="Penerimaan kas baru" nilai={rupiah(l.penerimaan_kas_baru)} />
              {(['Tunai', 'Transfer'] as const).map(c => (
                <Baris key={c} label={`${c}: masuk − keluar`} value={`${rupiah(l.kas?.[c].masuk)} − ${rupiah(l.kas?.[c].keluar)} = ${rupiah(l.kas?.[c].bersih)}`} />
              ))}
              <Divider />
              <Baris label="Pembayaran tagihan dari tabungan (bukan kas)" value={rupiah(l.internal.pembayaran_dari_tabungan)} />
              <Baris label="Pengembalian ke tabungan" value={rupiah(l.internal.pengembalian_ke_tabungan)} />
            </Panel>
          ) : null}
          <Panel style={{ gap: 8 }}>
            <ThemedText type="h3">Pembatalan dan koreksi</ThemedText>
            <Baris label="Pembayaran dibatalkan" value={rupiah(l.pembatalan.pembayaran.Tunai + l.pembatalan.pembayaran.Transfer + l.pembatalan.pembayaran.Tabungan)} />
            <Baris label="Koreksi tabungan" value={`${l.pembatalan.koreksi_tabungan.jumlah} (masuk ${rupiah(l.pembatalan.koreksi_tabungan.masuk)}, keluar ${rupiah(l.pembatalan.koreksi_tabungan.keluar)})`} />
            <Baris label="Tagihan dibatalkan / direvisi" value={`${l.pembatalan.tagihan_dibatalkan.jumlah} / ${l.pembatalan.tagihan_direvisi}`} />
            {l.koreksi ? l.koreksi.rows.slice(0, 20).map(k => (
              <View key={`${k.asal}-${k.id}`} style={{ gap: 2 }}>
                <Divider />
                <ThemedText type="bodyBold">{k.jenis} · {rupiah(k.nominal)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">{k.santri.nama} · asal {k.rujukan.label} · {k.aktor ?? '—'} · {waktuPendek(k.waktu)}</ThemedText>
                {k.alasan ? <ThemedText type="caption">Alasan: {k.alasan}</ThemedText> : null}
              </View>
            )) : null}
          </Panel>
          <Panel style={{ gap: 6 }}>
            <ThemedText type="h3">Per bulan</ThemedText>
            {l.per_bulan.map(b => (
              <View key={b.periode} style={{ gap: 2 }}>
                <ThemedText type="bodyBold">{labelPeriode(b.periode)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Tagihan {rupiah(b.tagihan_terbit)} · sisa {rupiah(b.sisa)} · setoran {rupiah(b.setoran)} · keluar {rupiah(b.penarikan_belanja)} · bayar dari tabungan {rupiah(b.bayar_tabungan)}
                </ThemedText>
              </View>
            ))}
          </Panel>
          <ThemedText type="h3">{wali ? 'Per anak' : 'Per santri'}</ThemedText>
          {!wali ? (
            <SearchField label="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ}
              onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
          ) : null}
          {l.per_santri.rows.length === 0 ? <EmptyState title="Belum ada data" message="Belum ada tagihan atau transaksi tabungan sesuai hak dan saringan." /> : null}
          {l.per_santri.rows.map(r => (
            <Card key={r.santri.id} accessibilityLabel={`Buka keuangan ${r.santri.nama}`} onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(r.santri.id) } })}>
              <View style={{ gap: 4 }}>
                <ThemedText type="bodyBold">{r.santri.nama}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">NIS {r.santri.nis}{r.santri.kelas ? ` · ${r.santri.kelas}` : ''}{r.santri.aktif ? '' : ' · nonaktif'}</ThemedText>
                <ThemedText>Tagihan {rupiah(r.tagihan)} · terbayar {rupiah(r.terbayar)} · sisa {rupiah(r.sisa)}</ThemedText>
                <ThemedText>Saldo {rupiah(r.saldo_awal)} → {rupiah(r.saldo_akhir)} (setoran {rupiah(r.setoran)}, keluar {rupiah(r.penarikan + r.belanja + r.bayar_tabungan)})</ThemedText>
                {(r.selisih_saldo ?? 0) !== 0 || (r.selisih_akun ?? 0) !== 0 ? <ChipRow><Badge label="Selisih" tone="danger" /></ChipRow> : null}
              </View>
            </Card>
          ))}
          <Penomoran page={l.per_santri.page} total={l.per_santri.total} perPage={l.per_santri.per_page} onPage={setPage} />
          {l.nonaktif && l.nonaktif.jumlah > 0 ? (
            <Panel style={{ gap: 6 }}>
              <ThemedText type="h3">Santri nonaktif masih bersaldo/bertunggakan</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">Belum ada jalur pengembalian saldo santri keluar; menunggu keputusan pesantren.</ThemedText>
              {l.nonaktif.rows.map(n => <Baris key={n.santri.id} label={`${n.santri.nama} (NIS ${n.santri.nis})`} value={`saldo ${rupiah(n.saldo)} · sisa ${rupiah(n.sisa)}`} />)}
            </Panel>
          ) : null}
        </>
      )}
    </Halaman>
  );
}

function BagianTagihan({ l }: { l: LaporanKeuangan }) {
  const t = l.tagihan;
  return (
    <Panel style={{ gap: 8 }}>
      <ThemedText type="h3">Tagihan</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Angka label={`Terbit (${t.terbit.jumlah})`} nilai={rupiah(t.terbit.nominal)} />
        <Angka label="Terbayar" nilai={rupiah(t.terbayar)} />
        <Angka label={`Sisa (${t.belum_lunas} belum lunas)`} nilai={rupiah(t.sisa)} tone={t.sisa > 0 ? 'danger' : undefined} />
      </View>
      <Baris label="Dibayar tunai / transfer / dari tabungan" value={`${rupiah(t.pembayaran_sah.Tunai)} / ${rupiah(t.pembayaran_sah.Transfer)} / ${rupiah(t.pembayaran_sah.Tabungan)}`} />
      {t.lewat_jatuh_tempo.jumlah > 0 ? <Baris label={`Lewat jatuh tempo (${t.lewat_jatuh_tempo.jumlah})`} value={rupiah(t.lewat_jatuh_tempo.sisa)} /> : null}
      {t.menunggu_verifikasi && t.menunggu_verifikasi.jumlah > 0 ? (
        <ThemedText type="caption" themeColor="textSecondary">{t.menunggu_verifikasi.jumlah} transfer {rupiah(t.menunggu_verifikasi.nominal)} menunggu verifikasi (belum dihitung).</ThemedText>
      ) : null}
    </Panel>
  );
}

function BagianTabungan({ l }: { l: LaporanKeuangan }) {
  const tb = l.tabungan;
  return (
    <Panel style={{ gap: 8 }}>
      <ThemedText type="h3">Tabungan</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Angka label="Saldo awal" nilai={rupiah(tb.saldo_awal)} />
        <Angka label="Saldo akhir" nilai={rupiah(tb.saldo_akhir)} />
      </View>
      <Baris label="Setoran" value={rupiah(tb.setoran.Tunai + tb.setoran.Transfer)} />
      <Baris label="Penarikan dan belanja" value={rupiah(tb.penarikan.Tunai + tb.penarikan.Transfer + tb.belanja.Tunai + tb.belanja.Transfer)} />
      <Baris label="Bayar tagihan dari tabungan" value={rupiah(tb.pembayaran_tagihan)} />
      <Baris label="Koreksi dan pengembalian (bersih)" value={rupiah(tb.koreksi_masuk.Tunai + tb.koreksi_masuk.Transfer - tb.koreksi_keluar.Tunai - tb.koreksi_keluar.Transfer + tb.pengembalian)} />
      {tb.setoran_menunggu && tb.setoran_menunggu.jumlah > 0 ? (
        <ThemedText type="caption" themeColor="textSecondary">{tb.setoran_menunggu.jumlah} setoran transfer {rupiah(tb.setoran_menunggu.nominal)} menunggu verifikasi (belum saldo).</ThemedText>
      ) : null}
    </Panel>
  );
}
