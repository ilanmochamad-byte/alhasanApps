import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { rentang } from '@/components/izin-wali-shared';
import { Baris, waktuPendek } from '@/components/kesehatan-shared';
import { GarisWaktu, JudulBagianIsi, KartuIsi, KepalaRincian } from '@/components/halaman-stack';
import { CatatanHanyaBaca, Halaman, HalamanKeadaan, Lencana } from '@/components/keamanan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaStatus } from '@/izin-wali/forms';

/** Rincian izin lengkap (alasan, catatan, keputusan, riwayat; PK-T4). Setiap pembukaan diaudit server tanpa isi. */
export default function KeamananIzinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const fetcher = useCallback(() => keamanan.izinDetail(nomor), [nomor]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <HalamanKeadaan title="Rincian izin"><ErrorState message={error} onRetry={() => void load()} /></HalamanKeadaan>;
  if (!data) return <HalamanKeadaan title="Rincian izin"><LoadingState label="Memuat rincian izin…" /></HalamanKeadaan>;
  const p = data.pengajuan;
  const k = data.keputusan;
  return (
    <Halaman title="Rincian izin">
      <KepalaRincian nama={p.santri.nama} judul={p.santri.nama} keterangan={`NIS ${p.santri.nis} · ${rentang(p.tgl_izin, p.tgl_kembali)}`}
        pills={<><Lencana label={p.status_label} nada={nadaStatus(p.status)} /><Lencana label={`Asal ${p.asal.toLowerCase()}`} nada="neutral" /></>} />
      <KartuIsi gap={0}>
        <View>
          <Baris label="Santri" value={`${p.santri.nama} · NIS ${p.santri.nis}`} />
          <Baris label="Kamar / kelas" value={`${p.kamar ?? '—'} · ${p.kelas ?? '—'}`} />
          <Baris label="Tahun ajaran" value={p.tahun_ajaran} />
          <Baris label="Keluar – kembali" value={rentang(p.tgl_izin, p.tgl_kembali)} />
          <Baris label="Alasan" value={p.alasan} />
          <Baris label="Catatan pengurus" value={p.catatan_pengurus} />
          {p.asal === 'Wali' ? (
            <>
              <Baris label="Catatan wali" value={p.catatan_wali} />
              <Baris label="Wali pengaju" value={p.wali} />
              <Baris label="Pembimbing tujuan" value={p.pembimbing} />
            </>
          ) : <Baris label="Pengurus pengaju" value={p.pengurus} />}
          <Baris label="Diajukan oleh" value={p.pengaju} />
          <Baris label="Diajukan pada" value={waktuPendek(p.diajukan_pada)} />
          <Baris label="Murobi" value={p.murobi} />
          {p.dibatalkan_pada ? (
            <>
              <Baris label="Dibatalkan pada" value={waktuPendek(p.dibatalkan_pada)} />
              <Baris label="Alasan pembatalan" value={p.alasan_pembatalan} />
            </>
          ) : null}
        </View>
      </KartuIsi>
      <JudulBagianIsi title="Keputusan" />
      <KartuIsi>
        {k === null ? <ThemedText themeColor="textSecondary">Belum diputus.</ThemedText> : (
          <View style={{ gap: 10 }}>
            <Baris label="Hasil" value={k.hasil} />
            <Baris label="Alasan keputusan" value={k.alasan} />
            <Baris label="Diputus oleh" value={`${k.pemberi_keputusan ?? ''} (${k.kapasitas})`.trim()} />
            <Baris label="Diputus pada" value={waktuPendek(k.diputus_pada)} />
            {k.alasan_penggantian ? <Baris label="Alasan admin pengganti" value={k.alasan_penggantian} /> : null}
          </View>
        )}
        {data.koreksi.map((c, i) => (
          <View key={i} style={{ gap: 4, paddingTop: 10 }}>
            <ThemedText type="bodyBold">Koreksi: {c.hasil_sebelum} → {c.hasil_sesudah}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(c.dikoreksi_pada)} · {c.pelaku_nama ?? 'Sistem'}</ThemedText>
            <ThemedText>Alasan koreksi: {c.alasan_koreksi}</ThemedText>
          </View>
        ))}
      </KartuIsi>
      <JudulBagianIsi title="Riwayat" />
      <KartuIsi>
        <GarisWaktu items={data.riwayat.map(r => ({
          key: r.id,
          judul: `${r.status_sebelum_label ? `${r.status_sebelum_label} → ` : ''}${r.status_sesudah_label}`,
          waktu: `${waktuPendek(r.created_at)} · ${r.pelaku_nama ?? 'Sistem'}${r.pelaku_kapasitas ? ` (${r.pelaku_kapasitas})` : ''}`,
          isi: r.alasan ? <ThemedText>{r.alasan}</ThemedText> : undefined,
        }))} />
      </KartuIsi>
      <CatatanHanyaBaca text="Hanya baca. Pembukaan rincian ini tercatat di jejak audit tanpa isi. Cetak/PDF tersedia di website." />
    </Halaman>
  );
}
