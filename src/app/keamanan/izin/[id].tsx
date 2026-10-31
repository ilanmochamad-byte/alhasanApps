import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { rentang } from '@/components/izin-wali-shared';
import { Baris, waktuPendek } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaStatus } from '@/izin-wali/forms';

/** Rincian izin lengkap (alasan, catatan, keputusan, riwayat; PK-T4). Setiap pembukaan diaudit server tanpa isi. */
export default function KeamananIzinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const fetcher = useCallback(() => keamanan.izinDetail(nomor), [nomor]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat rincian izin…" />;
  const p = data.pengajuan;
  const k = data.keputusan;
  return (
    <Halaman>
      <ThemedText type="h3">{p.santri.nama}</ThemedText>
      <ChipRow>
        <Lencana label={p.status_label} nada={nadaStatus(p.status)} />
        <Badge label={`Asal ${p.asal.toLowerCase()}`} />
      </ChipRow>
      <Panel>
        <View style={{ gap: 10 }}>
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
      </Panel>
      <ThemedText type="h3">Keputusan</ThemedText>
      <Panel>
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
      </Panel>
      <ThemedText type="h3">Riwayat</ThemedText>
      <Panel>
        <View style={{ gap: 12 }}>
          {data.riwayat.map(r => (
            <View key={r.id} style={{ gap: 2 }}>
              <ThemedText type="bodyBold">{r.status_sebelum_label ? `${r.status_sebelum_label} → ` : ''}{r.status_sesudah_label}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {waktuPendek(r.created_at)} · {r.pelaku_nama ?? 'Sistem'}{r.pelaku_kapasitas ? ` (${r.pelaku_kapasitas})` : ''}
              </ThemedText>
              {r.alasan ? <ThemedText>{r.alasan}</ThemedText> : null}
            </View>
          ))}
        </View>
      </Panel>
      <CatatanHanyaBaca text="Hanya baca. Pembukaan rincian ini tercatat di jejak audit tanpa isi. Cetak/PDF tersedia di website." />
    </Halaman>
  );
}
