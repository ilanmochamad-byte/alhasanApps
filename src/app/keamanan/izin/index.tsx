import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { keamanan, type IzinFilter } from '@/api/keamanan';
import { AppButton } from '@/components/app-button';
import { rentang, Pager } from '@/components/izin-wali-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Card } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaStatus } from '@/izin-wali/forms';
import { LABEL_ASAL, LABEL_HASIL, periksaRentang } from '@/keamanan/format';

/** Perizinan seluruh santri aktif, asal Pengurus (V2) dan Wali (V7), semua tahap. Daftar tanpa alasan; isi lengkap di rincian. */
export default function KeamananIzinScreen() {
  const router = useRouter();
  const [asal, setAsal] = useState('');
  const [hasil, setHasil] = useState('');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [terapan, setTerapan] = useState<{ dari: string; sampai: string }>({ dari: '', sampai: '' });
  const [page, setPage] = useState(1);
  const [galat, setGalat] = useState<string | null>(null);
  const fetcher = useCallback(() => {
    const f: IzinFilter = { asal, hasil, dari: terapan.dari, sampai: terapan.sampai, page };
    return keamanan.izin(f);
  }, [asal, hasil, terapan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  const terapkan = () => {
    const pesan = periksaRentang(dari, sampai);
    setGalat(pesan);
    if (pesan === null) { setTerapan({ dari, sampai }); setPage(1); }
  };
  return (
    <Halaman>
      <ChipRow>
        {Object.entries(LABEL_ASAL).map(([kode, label]) => (
          <Chip key={kode || 'semua'} accessibilityRole="radio" label={label} selected={asal === kode} onPress={() => { setAsal(kode); setPage(1); }} />
        ))}
      </ChipRow>
      <ChipRow>
        {Object.entries(LABEL_HASIL).map(([kode, label]) => (
          <Chip key={kode || 'semua'} accessibilityRole="radio" label={label} selected={hasil === kode} onPress={() => { setHasil(kode); setPage(1); }} />
        ))}
      </ChipRow>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><DateField label="Izin dari" value={dari} onChange={setDari} /></View>
        <View style={{ flex: 1 }}><DateField label="Sampai" value={sampai} onChange={setSampai} /></View>
      </View>
      <AppButton label="Terapkan tanggal" size="sm" variant="secondary" onPress={terapkan} />
      {galat ? <ThemedText accessibilityRole="alert" themeColor="danger">{galat}</ThemedText> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat perizinan…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            {data.ringkasan.total} pengajuan · {data.ringkasan.per_hasil.berjalan ?? 0} berjalan · asal wali {data.ringkasan.per_asal.Wali} · asal pengurus {data.ringkasan.per_asal.Pengurus}
          </ThemedText>
          {data.items.length === 0 ? <EmptyState title="Tidak ada pengajuan" message="Tidak ada pengajuan yang cocok dengan saringan." /> : null}
          {data.items.map(item => (
            <Card key={item.id} accessibilityLabel={`Buka izin ${item.santri.nama} nomor ${item.id}`}
              onPress={() => router.push({ pathname: '/keamanan/izin/[id]', params: { id: String(item.id) } })}>
              <View style={{ gap: 6 }}>
                <ThemedText type="bodyBold">{item.santri.nama}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  #{item.id} · NIS {item.santri.nis}{item.kamar ? ` · ${item.kamar}` : ''} · {rentang(item.tgl_izin, item.tgl_kembali)}
                </ThemedText>
                <ChipRow>
                  <Lencana label={item.status_label} nada={nadaStatus(item.status)} />
                  <Badge label={`Asal ${item.asal.toLowerCase()}`} />
                </ChipRow>
              </View>
            </Card>
          ))}
          <Pager page={data.page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
      <CatatanHanyaBaca />
    </Halaman>
  );
}
