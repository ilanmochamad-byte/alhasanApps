import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { Baris, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelStatusKasus, nadaPembinaan } from '@/keamanan/format';

/**
 * Catatan pelanggaran lengkap (PK-T4), hanya baca. Kasus konseling Rahasia yang
 * menindaklanjuti catatan ini tidak dikirim server (PK-6). Lampiran hanya
 * metadata; unduhan lewat website yang mencatat setiap unduhan.
 */
export default function KeamananPelanggaranDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const fetcher = useCallback(() => keamanan.pelanggaranDetail(nomor), [nomor]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat rincian pelanggaran…" />;
  const p = data.pelanggaran;
  return (
    <Halaman>
      <ThemedText type="h3">{p.jenis ?? p.kategori}</ThemedText>
      <ChipRow>
        <Lencana label={p.status} nada={nadaPembinaan(p.status)} />
        <Badge label={p.tingkat} />
      </ChipRow>
      {p.digantikan_oleh_id !== null ? (
        <Card accessibilityLabel="Buka revisi terbaru"
          onPress={() => router.push({ pathname: '/keamanan/pelanggaran/[id]', params: { id: String(p.digantikan_oleh_id) } })}>
          <ThemedText>Catatan ini sudah dikoreksi dan digantikan revisi yang lebih baru. Ketuk untuk membuka revisi terbaru.</ThemedText>
        </Card>
      ) : null}
      <Panel>
        <View style={{ gap: 10 }}>
          <Baris label="Santri" value={`${p.santri_nama} · ${p.semester} ${p.tahun}`} />
          <Baris label="Jenis" value={p.jenis ? `${p.jenis} · ${p.kategori}` : p.kategori} />
          <Baris label="Poin" value={String(p.poin)} />
          <Baris label="Waktu & tempat" value={`${waktuPendek(p.waktu_kejadian)} · ${p.tempat ?? 'Tempat tidak dicatat'}`} />
          <Baris label="Uraian" value={p.uraian} />
          <Baris label="Saksi" value={p.saksi} />
          <Baris label="Dicatat" value={`${p.pencatat ?? 'Admin pesantren'} · ${waktuPendek(p.dicatat_pada)}`} />
          {p.alasan_revisi ? <Baris label="Alasan koreksi" value={p.alasan_revisi} /> : null}
          {p.alasan_pembatalan ? <Baris label="Alasan pembatalan" value={p.alasan_pembatalan} /> : null}
        </View>
      </Panel>
      <ThemedText type="h3">Poin santri {p.semester} {p.tahun}: {data.total_poin}</ThemedText>
      <Panel>
        <View style={{ gap: 8 }}>
          {data.ledger.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada catatan poin.</ThemedText> : null}
          {data.ledger.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>{waktuPendek(l.created_at)} · {l.alasan}</ThemedText>
              <ThemedText type="bodyBold">{l.perubahan_poin >= 0 ? '+' : ''}{l.perubahan_poin}</ThemedText>
            </View>
          ))}
        </View>
      </Panel>
      <ThemedText type="h3">Riwayat catatan</ThemedText>
      <Panel>
        <View style={{ gap: 10 }}>
          {data.riwayat_revisi.map(r => (
            <View key={r.id} style={{ gap: 2 }}>
              <ThemedText type="bodyBold">{r.revisi_dari_id === null ? 'Catatan dibuat' : 'Koreksi menjadi revisi baru'}{r.id === p.id ? ' (catatan ini)' : ''}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(r.created_at)} · {r.status}</ThemedText>
              {r.alasan_revisi ? <ThemedText>Alasan koreksi: {r.alasan_revisi}</ThemedText> : null}
              {r.alasan_pembatalan ? <ThemedText>Dibatalkan: {r.alasan_pembatalan}</ThemedText> : null}
            </View>
          ))}
          {data.murobi_mengetahui.map((m, i) => (
            <View key={`m${i}`} style={{ gap: 2 }}>
              <ThemedText type="bodyBold">Murobi menandai mengetahui</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">{waktuPendek(m.diketahui_pada)}</ThemedText>
              {m.catatan ? <ThemedText>{m.catatan}</ThemedText> : null}
            </View>
          ))}
        </View>
      </Panel>
      <ThemedText type="h3">Lampiran privat</ThemedText>
      <Panel>
        <View style={{ gap: 8 }}>
          {data.lampiran.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada lampiran.</ThemedText> : null}
          {data.lampiran.map(f => (
            <ThemedText key={f.id}>{f.nama} · {(f.ukuran / 1024).toFixed(1).replace('.', ',')} KB · {tanggalPanjang(f.created_at)}</ThemedText>
          ))}
          {data.lampiran.length > 0 ? <ThemedText type="caption" themeColor="textSecondary">Unduh lampiran melalui website; setiap unduhan tercatat di jejak audit.</ThemedText> : null}
        </View>
      </Panel>
      <ThemedText type="h3">Tindak lanjut konseling</ThemedText>
      {data.konseling.length === 0 ? <ThemedText themeColor="textSecondary">Belum ditautkan ke kasus konseling yang dapat dibaca.</ThemedText> : null}
      {data.konseling.map(k => (
        <Card key={k.kasus_id} accessibilityLabel={`Buka kasus konseling ${p.santri_nama}`}
          onPress={() => router.push({ pathname: '/keamanan/konseling/[id]', params: { id: String(k.kasus_id) } })}>
          <View style={{ gap: 6 }}>
            <ThemedText type="bodyBold">Kasus konseling {p.santri_nama}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {k.sesi.length === 0 ? 'Belum ada sesi' : k.sesi.map(s => `Sesi ${tanggalPanjang(s.jadwal)} ${s.status ?? ''}`.trim()).join(' · ')}
            </ThemedText>
            <ChipRow><Lencana label={labelStatusKasus(k.kasus_status)} nada={nadaPembinaan(k.kasus_status)} /></ChipRow>
          </View>
        </Card>
      ))}
      <AppButton label="Kembali ke daftar" variant="secondary" size="sm" onPress={() => router.back()} />
      <CatatanHanyaBaca text="Hanya baca. Pembukaan rincian ini tercatat di jejak audit tanpa isi. Cetak/PDF tersedia di website." />
    </Halaman>
  );
}
