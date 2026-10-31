import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { Baris, waktuPendek } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelStatusKasus, nadaPembinaan } from '@/keamanan/format';

/** Kasus Internal santri aktif, isi lengkap, hanya baca. Kasus Rahasia dan ID tidak ada sama-sama ditolak server (404). */
export default function KeamananKonselingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const fetcher = useCallback(() => keamanan.konselingDetail(nomor), [nomor]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat rincian kasus…" />;
  const k = data.kasus;
  return (
    <Halaman>
      <ThemedText type="h3">{k.santri_nama}</ThemedText>
      <ChipRow>
        <Lencana label={labelStatusKasus(k.status)} nada={nadaPembinaan(k.status)} />
        <Badge label={k.kerahasiaan} />
      </ChipRow>
      <Panel>
        <View style={{ gap: 10 }}>
          <Baris label="Santri" value={`${k.santri_nama} · ${k.semester} ${k.tahun}`} />
          <Baris label="Tujuan" value={k.tujuan} />
          <Baris label="Dibuka" value={waktuPendek(k.dibuka_pada)} />
          {k.ditutup_pada ? <Baris label="Ditutup" value={waktuPendek(k.ditutup_pada)} /> : null}
          {k.ringkasan_penutupan ? <Baris label="Ringkasan penutupan" value={k.ringkasan_penutupan} /> : null}
          {k.alasan_pembatalan ? <Baris label="Alasan pembatalan" value={k.alasan_pembatalan} /> : null}
        </View>
      </Panel>
      <ThemedText type="h3">Sesi ({data.sesi.length})</ThemedText>
      <Panel>
        <View style={{ gap: 12 }}>
          {data.sesi.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada sesi.</ThemedText> : null}
          {data.sesi.map(s => (
            <View key={s.id} style={{ gap: 2 }}>
              <ThemedText type="bodyBold">{s.status}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(s.realisasi ?? s.jadwal)}</ThemedText>
              {s.ringkasan_internal ? <ThemedText>Ringkasan: {s.ringkasan_internal}</ThemedText> : null}
              {s.hasil ? <ThemedText>Hasil: {s.hasil}</ThemedText> : null}
              {s.tindak_lanjut ? <ThemedText>Tindak lanjut: {s.tindak_lanjut}</ThemedText> : null}
            </View>
          ))}
        </View>
      </Panel>
      <ThemedText type="h3">Pelanggaran tertaut</ThemedText>
      {data.tautan.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada pelanggaran tertaut.</ThemedText> : null}
      {data.tautan.map(t => (
        <Card key={t.pelanggaran_id} accessibilityLabel={`Buka pelanggaran ${t.kategori}`}
          onPress={() => router.push({ pathname: '/keamanan/pelanggaran/[id]', params: { id: String(t.pelanggaran_id) } })}>
          <View style={{ gap: 4 }}>
            <ThemedText type="bodyBold">{t.kategori}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(t.waktu_kejadian)} · {t.poin} poin · {t.status}</ThemedText>
          </View>
        </Card>
      ))}
      <ThemedText type="h3">Linimasa</ThemedText>
      <Panel>
        <View style={{ gap: 8 }}>
          {data.linimasa.map((e, i) => <ThemedText key={i}>{waktuPendek(e.waktu)} · {e.jenis}</ThemedText>)}
        </View>
      </Panel>
      {data.riwayat_revisi.length > 0 ? (
        <>
          <ThemedText type="h3">Riwayat revisi kasus</ThemedText>
          <Panel>
            <View style={{ gap: 8 }}>
              {data.riwayat_revisi.map((r, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <ThemedText type="bodyBold">Revisi dari versi {r.versi_sebelum}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(r.created_at)} · {r.kapasitas}</ThemedText>
                  <ThemedText>Alasan: {r.alasan}</ThemedText>
                </View>
              ))}
            </View>
          </Panel>
        </>
      ) : null}
      <CatatanHanyaBaca text="Hanya baca. Pembukaan rincian ini tercatat di jejak audit tanpa isi. Kasus Rahasia tidak pernah ditampilkan kepada Keamanan." />
    </Halaman>
  );
}
