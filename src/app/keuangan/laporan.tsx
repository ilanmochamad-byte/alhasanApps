import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keuangan, type LaporanKeuangan } from '@/api/keuangan';
import { useAuth } from '@/auth/auth-context';
import { waktuPendek } from '@/components/kesehatan-shared';
import { BarisPil, Halaman, JudulBagian, Kartu, Penomoran, Pesan } from '@/components/keuangan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { BarChart } from '@/components/ui/bar-chart';
import { EntityRow } from '@/components/ui/entity-row';
import { FilterPills } from '@/components/ui/filter-pills';
import { HeroCard } from '@/components/ui/hero-card';
import { InfoRow } from '@/components/ui/info-row';
import { SearchBar } from '@/components/ui/search-bar';
import { SegmentTabs } from '@/components/ui/segment-tabs';
import { StatGrid } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelPeriode, PILIHAN_RENTANG, rentangLaporan, rupiah, seriPerBulan, type PilihanRentang } from '@/keuangan/forms';

/**
 * Laporan keuangan per periode (PRD V6 Fase 5; pola P-Laporan). Seluruh angka
 * dihitung server dalam satu snapshot menurut hak akun: petugas BSA
 * cakupannya, admin seluruh santri, orang tua hanya anaknya (tanpa kas,
 * perpindahan internal, jejak koreksi, atau transfer menunggu). Aplikasi
 * tidak menghitung ulang, tidak membuat angka pembanding, dan tidak menyimpan
 * berkas ekspor; ekspor CSV ada di website. Istilah BSA dipakai apa adanya:
 * penerimaan kas baru dan perpindahan internal.
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
    <Halaman title="Laporan keuangan">
      <FilterPills<PilihanRentang> accessibilityLabel="Periode laporan" value={pilihan} onChange={v => { setPilihan(v); setPage(1); }}
        options={PILIHAN_RENTANG.map(p => ({ value: p.nilai, label: p.label }))} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !l ? <LoadingState label="Menyusun laporan…" /> : (
        <>
          <ThemedText selectable themeColor="textSecondary">
            {l.rentang.dari === l.rentang.sampai ? labelPeriode(l.rentang.dari) : `${labelPeriode(l.rentang.dari)} – ${labelPeriode(l.rentang.sampai)}`}
            {wali ? ' · anak Anda' : l.akses.jenjang ? ` · unit ${l.akses.jenjang.join(', ')}` : ' · seluruh santri'}
          </ThemedText>
          {l.selisih ? (
            <BarisPil>
              <StatusPill tone={l.selisih.nol ? 'success' : 'danger'} label={l.selisih.nol ? 'Rekonsiliasi: selisih Rp0' : 'Rekonsiliasi: ADA SELISIH'} />
            </BarisPil>
          ) : null}
          {l.kas && l.internal ? (
            <HeroCard overline="Penerimaan kas baru" value={rupiah(l.penerimaan_kas_baru)}
              caption="Setoran dan pembayaran tunai/transfer yang sah. Pembayaran dari tabungan bukan kas baru." />
          ) : (
            <HeroCard overline="Saldo tabungan akhir" value={rupiah(l.tabungan.saldo_akhir)} caption={`Saldo awal ${rupiah(l.tabungan.saldo_awal)}`} />
          )}
          <BagianTagihan l={l} />
          <BagianTabungan l={l} />
          <GrafikBulanan l={l} />
          {l.kas && l.internal ? (
            <>
              <JudulBagian title="Kas dan perpindahan internal" />
              <Kartu gap={0}>
                {(['Tunai', 'Transfer'] as const).map(c => (
                  <InfoRow key={c} label={`${c}: masuk − keluar`} value={`${rupiah(l.kas?.[c].masuk)} − ${rupiah(l.kas?.[c].keluar)} = ${rupiah(l.kas?.[c].bersih)}`} />
                ))}
                <InfoRow label="Pembayaran tagihan dari tabungan (bukan kas)" value={rupiah(l.internal.pembayaran_dari_tabungan)} />
                <InfoRow label="Pengembalian ke tabungan" value={rupiah(l.internal.pengembalian_ke_tabungan)} last />
              </Kartu>
            </>
          ) : null}
          <JudulBagian title="Pembatalan dan koreksi" />
          <Kartu gap={0}>
            <InfoRow label="Pembayaran dibatalkan" value={rupiah(l.pembatalan.pembayaran.Tunai + l.pembatalan.pembayaran.Transfer + l.pembatalan.pembayaran.Tabungan)} />
            <InfoRow label="Koreksi tabungan" value={`${l.pembatalan.koreksi_tabungan.jumlah} (masuk ${rupiah(l.pembatalan.koreksi_tabungan.masuk)}, keluar ${rupiah(l.pembatalan.koreksi_tabungan.keluar)})`} />
            <InfoRow label="Tagihan dibatalkan / direvisi" value={`${l.pembatalan.tagihan_dibatalkan.jumlah} / ${l.pembatalan.tagihan_direvisi}`} last={!l.koreksi || l.koreksi.rows.length === 0} />
            {l.koreksi ? l.koreksi.rows.slice(0, 20).map(k => (
              <View key={`${k.asal}-${k.id}`} style={{ gap: 2, paddingVertical: 10 }}>
                <ThemedText selectable type="bodyBold">{k.jenis} · {rupiah(k.nominal)}</ThemedText>
                <ThemedText selectable type="caption" themeColor="textSecondary">{k.santri.nama} · asal {k.rujukan.label} · {k.aktor ?? '—'} · {waktuPendek(k.waktu)}</ThemedText>
                {k.alasan ? <ThemedText type="caption">Alasan: {k.alasan}</ThemedText> : null}
              </View>
            )) : null}
          </Kartu>
          <JudulBagian title="Per bulan" />
          <Kartu gap={0}>
            {l.per_bulan.map((b, i) => (
              <InfoRow key={b.periode} icon="calendar" label={labelPeriode(b.periode)} last={i === l.per_bulan.length - 1}
                value={`Tagihan ${rupiah(b.tagihan_terbit)} · sisa ${rupiah(b.sisa)} · setoran ${rupiah(b.setoran)} · keluar ${rupiah(b.penarikan_belanja)} · bayar dari tabungan ${rupiah(b.bayar_tabungan)}`} />
            ))}
          </Kartu>
          <JudulBagian title={wali ? 'Per anak' : 'Per santri'} />
          {!wali ? (
            <SearchBar placeholder="Cari nama atau NIS" accessibilityLabel="Cari nama atau NIS" value={q} onChangeText={setQ}
              onSubmitEditing={() => { setTerapan(q.trim()); setPage(1); }} autoCorrect={false} autoComplete="off" />
          ) : null}
          {l.per_santri.rows.length === 0 ? <EmptyState icon="users" title="Belum ada data" message="Belum ada tagihan atau transaksi tabungan sesuai hak dan saringan." /> : null}
          {l.per_santri.rows.map(r => (
            <EntityRow key={r.santri.id} avatarName={r.santri.nama} title={r.santri.nama}
              subtitle={`NIS ${r.santri.nis}${r.santri.kelas ? ` · ${r.santri.kelas}` : ''}${r.santri.aktif ? '' : ' · nonaktif'}`}
              value={rupiah(r.saldo_akhir)} valueCaption="Saldo akhir"
              detail={(
                <View style={{ gap: 2 }}>
                  <ThemedText selectable type="caption">Tagihan {rupiah(r.tagihan)} · terbayar {rupiah(r.terbayar)} · sisa {rupiah(r.sisa)}</ThemedText>
                  <ThemedText selectable type="caption" themeColor="textSecondary">Saldo {rupiah(r.saldo_awal)} → {rupiah(r.saldo_akhir)} (setoran {rupiah(r.setoran)}, keluar {rupiah(r.penarikan + r.belanja + r.bayar_tabungan)})</ThemedText>
                </View>
              )}
              pill={(r.selisih_saldo ?? 0) !== 0 || (r.selisih_akun ?? 0) !== 0 ? <StatusPill tone="danger" label="Selisih" /> : undefined}
              accessibilityLabel={`Buka keuangan ${r.santri.nama}`}
              onPress={() => router.push({ pathname: '/keuangan/santri/[id]', params: { id: String(r.santri.id) } })} />
          ))}
          <Penomoran page={l.per_santri.page} total={l.per_santri.total} perPage={l.per_santri.per_page} onPage={setPage} />
          {l.nonaktif && l.nonaktif.jumlah > 0 ? (
            <>
              <JudulBagian title="Santri nonaktif masih bersaldo/bertunggakan" />
              <Pesan tone="info" text="Belum ada jalur pengembalian saldo santri keluar; menunggu keputusan pesantren." />
              <Kartu gap={0}>
                {l.nonaktif.rows.map((n, i) => (
                  <InfoRow key={n.santri.id} icon="person" label={`${n.santri.nama} (NIS ${n.santri.nis})`} value={`saldo ${rupiah(n.saldo)} · sisa ${rupiah(n.sisa)}`}
                    last={i === (l.nonaktif?.rows.length ?? 0) - 1} />
                ))}
              </Kartu>
            </>
          ) : null}
        </>
      )}
    </Halaman>
  );
}

function BagianTagihan({ l }: { l: LaporanKeuangan }) {
  const t = l.tagihan;
  return (
    <>
      <JudulBagian title="Tagihan" />
      <StatGrid items={[
        { icon: 'wallet', label: `Terbit (${t.terbit.jumlah})`, value: rupiah(t.terbit.nominal), labelDulu: true },
        { icon: 'check-circle', label: 'Terbayar', value: rupiah(t.terbayar), labelDulu: true },
        { icon: 'info', label: `Sisa (${t.belum_lunas} belum lunas)`, value: rupiah(t.sisa), tone: t.sisa > 0 ? 'danger' : 'primary', labelDulu: true },
        { icon: 'plus', label: 'Pembayaran tunai/transfer', value: rupiah(t.pembayaran_sah.Tunai + t.pembayaran_sah.Transfer), tone: 'info', labelDulu: true },
      ]} />
      <Kartu gap={0}>
        <InfoRow label="Dibayar tunai / transfer / dari tabungan" value={`${rupiah(t.pembayaran_sah.Tunai)} / ${rupiah(t.pembayaran_sah.Transfer)} / ${rupiah(t.pembayaran_sah.Tabungan)}`}
          last={t.lewat_jatuh_tempo.jumlah === 0} />
        {t.lewat_jatuh_tempo.jumlah > 0 ? <InfoRow label={`Lewat jatuh tempo (${t.lewat_jatuh_tempo.jumlah})`} value={rupiah(t.lewat_jatuh_tempo.sisa)} last /> : null}
      </Kartu>
      {t.menunggu_verifikasi && t.menunggu_verifikasi.jumlah > 0 ? (
        <Pesan tone="info" text={`${t.menunggu_verifikasi.jumlah} transfer ${rupiah(t.menunggu_verifikasi.nominal)} menunggu verifikasi (belum dihitung).`} />
      ) : null}
    </>
  );
}

function BagianTabungan({ l }: { l: LaporanKeuangan }) {
  const tb = l.tabungan;
  return (
    <>
      <JudulBagian title="Tabungan" />
      <StatGrid items={[
        { icon: 'wallet', label: 'Saldo awal', value: rupiah(tb.saldo_awal), tone: 'info', labelDulu: true },
        { icon: 'wallet', label: 'Saldo akhir', value: rupiah(tb.saldo_akhir), labelDulu: true },
        { icon: 'plus', label: 'Setoran', value: rupiah(tb.setoran.Tunai + tb.setoran.Transfer), labelDulu: true },
        { icon: 'arrow-right', label: 'Penarikan dan belanja', value: rupiah(tb.penarikan.Tunai + tb.penarikan.Transfer + tb.belanja.Tunai + tb.belanja.Transfer), tone: 'warning', labelDulu: true },
      ]} />
      <Kartu gap={0}>
        <InfoRow label="Bayar tagihan dari tabungan" value={rupiah(tb.pembayaran_tagihan)} />
        <InfoRow label="Koreksi dan pengembalian (bersih)" value={rupiah(tb.koreksi_masuk.Tunai + tb.koreksi_masuk.Transfer - tb.koreksi_keluar.Tunai - tb.koreksi_keluar.Transfer + tb.pengembalian)} last />
      </Kartu>
      {tb.setoran_menunggu && tb.setoran_menunggu.jumlah > 0 ? (
        <Pesan tone="info" text={`${tb.setoran_menunggu.jumlah} setoran transfer ${rupiah(tb.setoran_menunggu.nominal)} menunggu verifikasi (belum saldo).`} />
      ) : null}
    </>
  );
}

type Ukuran = 'tagihan_terbit' | 'setoran' | 'penarikan_belanja';

/** Grafik batang per bulan — hanya bila respons memuat seri (dua bulan atau lebih). */
function GrafikBulanan({ l }: { l: LaporanKeuangan }) {
  const [ukuran, setUkuran] = useState<Ukuran>('tagihan_terbit');
  const seri = seriPerBulan(l.per_bulan, ukuran);
  if (!seri) return null;
  const label = { tagihan_terbit: 'Tagihan terbit', setoran: 'Setoran', penarikan_belanja: 'Penarikan dan belanja' }[ukuran];
  return (
    <>
      <JudulBagian title="Per bulan (grafik)" />
      <Kartu>
        <SegmentTabs<Ukuran> accessibilityLabel="Ukuran grafik" value={ukuran} onChange={setUkuran}
          tabs={[{ value: 'tagihan_terbit', label: 'Tagihan' }, { value: 'setoran', label: 'Setoran' }, { value: 'penarikan_belanja', label: 'Keluar' }]} />
        <BarChart data={seri} accessibilityLabel={`${label} per bulan`} initialKey={seri[seri.length - 1]?.key} />
        <ThemedText selectable type="caption" themeColor="textSecondary">{label} per bulan dari server. Ketuk batang untuk melihat nilainya.</ThemedText>
      </Kartu>
    </>
  );
}
