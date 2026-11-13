import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { pembinaan } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { BarisPilIsi, gayaHalaman, HalamanStack, TombolMuatUlangKepala } from '@/components/halaman-stack';
import { TombolCariKecil } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { EntityRow } from '@/components/ui/entity-row';
import { SearchBar } from '@/components/ui/search-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { labelKerahasiaan, nadaStatusPembinaan } from '@/lib/pembinaan-tampilan';

const JUDUL: Record<string, string> = {
  pelanggaran: 'Pelanggaran & poin', kasus: 'Kasus & sesi konseling', rekomendasi: 'Rekomendasi tindak lanjut', publikasi: 'Informasi untuk keluarga',
};

type Baris = { id: number; text: string; student: number; year: number; nama?: string; status?: string; ket?: string; kerahasiaan?: string };

export default function List() {
  const { profile } = useAuth(); const { jenis } = useLocalSearchParams<{ jenis: string }>();
  return <ListSession key={`${profile?.id}:${jenis}`} kind={jenis} />;
}

/**
 * Daftar pembinaan (redesain gelombang 2 Fase 4, pola P-Daftar). Permintaan
 * server tidak berubah; nama tombol baris tetap teks lama agar pembaca layar
 * dan uji membaca hal yang sama. Kerahasiaan kasus ditampilkan dengan ikon
 * gembok; kasus Rahasia tetap hanya dikirim server kepada yang berhak.
 */
function ListSession({ kind }: { kind: string }) {
  const [page, setPage] = useState(1); const router = useRouter();
  // Pencarian nama/NIS oleh server dalam cakupan aktif, menjangkau seluruh halaman (kasus/pelanggaran).
  const dapatCari = kind === 'kasus' || kind === 'pelanggaran';
  const [cari, setCari] = useState(''); const [q, setQ] = useState('');
  const terapkan = () => { setQ(cari.trim()); setPage(1); };
  const fetcher = useCallback(async (): Promise<{ rows: Baris[]; total?: number }> => {
    if (kind === 'publikasi') { const r = await pembinaan.publications(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.status} · ${p.ringkasan}`, student: 0, year: 0, status: p.status, ket: p.ringkasan })) }; }
    if (kind === 'rekomendasi') { const r = await pembinaan.recommendations(page); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.nama_santri} · ${p.label_snapshot} · ${p.rekomendasi_snapshot}`, student: p.santri_id, year: p.tahun_ajaran_id, nama: p.nama_santri, ket: `${p.label_snapshot} · ${p.rekomendasi_snapshot}` })) }; }
    if (kind !== 'kasus' && kind !== 'pelanggaran') throw new Error('Menu tidak tersedia.');
    const r = await pembinaan.page(kind, page, q); return { rows: r.rows.map(p => ({ id: p.id, text: `${p.santri_nama} · ${p.status}`, student: p.santri_id, year: p.tahun_ajaran_id, nama: p.santri_nama, status: p.status, ket: kind === 'pelanggaran' ? [p.kategori, p.poin !== undefined ? `${p.poin} poin` : null].filter(Boolean).join(' · ') : p.tujuan, kerahasiaan: p.kerahasiaan })), total: r.total };
  }, [kind, page, q]);
  const { data, error, load } = usePrivateResource(fetcher);
  const judul = JUDUL[kind] ?? 'Daftar pembinaan';
  const kolomCari = dapatCari ? (
    <SearchBar accessibilityLabel="Cari santri menurut nama atau NIS" placeholder="Nama atau NIS santri" value={cari} onChangeText={setCari}
      maxLength={100} onSubmitEditing={terapkan} trailing={<TombolCariKecil onPress={terapkan} />} />
  ) : null;
  const buka = (p: Baris) => {
    if (kind === 'publikasi') router.push({ pathname: '/publikasi/[id]', params: { id: String(p.id) } });
    else if (kind === 'rekomendasi') router.push({ pathname: '/pembinaan/buat', params: { jenis: 'kasus', rekomendasi: String(p.id), santri: String(p.student), tahun: String(p.year) } });
    else router.push({ pathname: '/pembinaan/detail', params: { jenis: kind, id: String(p.id) } });
  };
  // Kolom cari tetap terpasang saat memuat/gagal agar ketikan tidak hilang.
  return (
    <HalamanStack title={judul} actions={<TombolMuatUlangKepala onPress={() => void load()} />}>
      {kolomCari}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState /> : (
        <>
          {q !== '' && 'total' in data ? <ThemedText type="caption" themeColor="textSecondary">{data.total} hasil untuk pencarian.</ThemedText> : null}
          {data.rows.length === 0 && <ThemedText>{q !== '' ? 'Tidak ada data yang cocok dengan pencarian dalam cakupan aktif Anda.' : 'Belum ada data dalam cakupan aktif Anda.'}</ThemedText>}
          {data.rows.map(p => (
            <EntityRow key={p.id} accessibilityLabel={p.text}
              accessibilityHint={p.kerahasiaan ? `Kerahasiaan ${labelKerahasiaan(p.kerahasiaan)}` : undefined}
              avatarName={p.nama} icon={p.nama ? undefined : 'mail'}
              title={p.nama ?? (kind === 'publikasi' ? 'Informasi pembinaan' : p.text)}
              subtitle={p.ket || undefined}
              onPress={() => buka(p)}
              pill={p.status || p.kerahasiaan ? (
                <BarisPilIsi>
                  {p.status ? <StatusPill label={p.status} tone={nadaStatusPembinaan(p.status)} /> : null}
                  {p.kerahasiaan ? <StatusPill label={p.kerahasiaan} tone="neutral" icon="lock" /> : null}
                </BarisPilIsi>
              ) : undefined} />
          ))}
          <View style={gayaHalaman.penomoran}>
            <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page === 1} onPress={() => setPage(page - 1)} style={gayaHalaman.flex} />
            <ThemedText>Halaman {page}</ThemedText>
            <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={data.rows.length < 25} onPress={() => setPage(page + 1)} style={gayaHalaman.flex} />
          </View>
        </>
      )}
    </HalamanStack>
  );
}
