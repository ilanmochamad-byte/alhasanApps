import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan, type PenyaringLaporan, type Tertunda } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, StatusBadge, tanggalPanjang, waktuPendek } from '@/components/kesehatan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { Segmented } from '@/components/ui/segmented';
import { Card, Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { namaBulan, periodeLaporan, type PresetPeriode } from '@/kesehatan/forms';

/**
 * Laporan layanan klinik (PRD V5 Fase 5). Angka dan cakupan dihitung server
 * (`GET /v5/kesehatan/laporan`) dengan aturan yang sama dengan halaman web;
 * layar ini hanya menampilkan. Tidak ada isi klinis pada respons, dan tidak
 * ada penyimpanan ke perangkat.
 */
export default function LaporanScreen() {
  const { profile } = useAuth();
  return <LaporanKlinik key={profile?.id} />;
}

const PRESET: { value: PresetPeriode | 'atur'; label: string }[] = [
  { value: 'bulan_ini', label: 'Bulan ini' }, { value: 'bulan_lalu', label: 'Bulan lalu' }, { value: '30_hari', label: '30 hari' }, { value: 'atur', label: 'Atur' },
];
const angka = (n: number) => n.toLocaleString('id-ID');

function LaporanKlinik() {
  const router = useRouter();
  const [preset, setPreset] = useState<PresetPeriode | 'atur'>('bulan_ini');
  const [isian, setIsian] = useState<PenyaringLaporan>({ ...periodeLaporan('bulan_ini'), kelas_id: '' });
  const [terapan, setTerapan] = useState(isian);
  const fetcher = useCallback(() => kesehatan.laporan(terapan), [terapan]);
  const { data, error, load } = usePrivateResource(fetcher);
  const pilihPreset = (p: PresetPeriode | 'atur') => {
    setPreset(p);
    if (p === 'atur') return;
    const baru = { ...isian, ...periodeLaporan(p) };
    setIsian(baru);
    setTerapan(baru);
  };
  const buka = (id: number) => router.push({ pathname: '/kesehatan/kunjungan/[id]', params: { id: String(id) } });

  if (error) {
    return <ErrorState message={error} onRetry={() => { const awal = { ...periodeLaporan('bulan_ini'), kelas_id: '' }; setPreset('bulan_ini'); setIsian(awal); setTerapan(awal); void load(); }} />;
  }
  const binaan = data?.akses.cakupan === 'binaan';
  return (
    <Halaman>
      <ThemedText type="h3">Laporan layanan klinik</ThemedText>
      <Panel style={{ gap: 12 }}>
        <Segmented options={PRESET} value={preset} onChange={pilihPreset} variant="radio" accessibilityLabel="Periode laporan" />
        {preset === 'atur' ? (
          <>
            <DateField label="Dari tanggal" value={isian.dari} onChange={dari => setIsian({ ...isian, dari })} />
            <DateField label="Sampai tanggal" value={isian.sampai} onChange={sampai => setIsian({ ...isian, sampai })} />
          </>
        ) : null}
        <DropdownField label="Kelas saat ini" value={isian.kelas_id}
          options={[{ value: '', label: 'Semua kelas' }, ...(data?.kelas_pilihan ?? []).map(k => ({ value: String(k.id), label: k.nama })), { value: 'tanpa', label: 'Belum ditempatkan' }]}
          onChange={kelas_id => setIsian({ ...isian, kelas_id })} />
        <AppButton label="Terapkan" icon="filter" onPress={() => setTerapan(isian)} />
      </Panel>
      {!data ? <LoadingState label="Menyusun laporan…" /> : (
        <>
          <ThemedText themeColor="textSecondary">
            {tanggalPanjang(data.periode.dari)} – {tanggalPanjang(data.periode.sampai)} ({data.periode.hari} hari).{' '}
            {binaan ? 'Kunjungan tercatat santri binaan Anda saja.' : 'Seluruh santri.'} Tanpa isi klinis.
          </ThemedText>
          <Panel style={{ gap: 10 }}>
            <ThemedText type="bodyBold">Kunjungan</ThemedText>
            <Baris label="Kunjungan" value={`${angka(data.kunjungan.total)} (${angka(data.kunjungan.santri)} santri)`} />
            <Baris label="Tercatat" value={angka(data.kunjungan.tercatat)} />
            {data.kunjungan.draf !== null ? <Baris label="Draf" value={angka(data.kunjungan.draf)} /> : null}
            <Baris label="Dengan obat" value={`${angka(data.kunjungan.dengan_obat)} kunjungan · ${angka(data.obat.pemberian)} pemberian`} />
            <Baris label="Dikoreksi" value={angka(data.kunjungan.dikoreksi)} />
          </Panel>
          <Panel style={{ gap: 10 }}>
            <ThemedText type="bodyBold">Rujukan dan tindak lanjut</ThemedText>
            <Baris label="Rujukan" value={`${angka(data.rujukan.total)} · ${angka(data.rujukan.menunggu)} menunggu hasil · ${angka(data.rujukan.diketahui)} diketahui`} />
            <Baris label="Tindak lanjut" value={`${angka(data.tindak_lanjut.total)} · ${angka(data.tindak_lanjut.terbuka)} terbuka · ${angka(data.tindak_lanjut.selesai)} selesai`} />
            {data.tindak_lanjut.terlambat > 0 ? <Badge label={`${angka(data.tindak_lanjut.terlambat)} lewat target`} tone="warning" /> : null}
          </Panel>
          {data.ringkasan_wali ? (
            <Panel style={{ gap: 10 }}>
              <ThemedText type="bodyBold">Ringkasan untuk wali</ThemedText>
              <Baris label="Berlaku · ditarik · belum diterbitkan"
                value={`${angka(data.ringkasan_wali.terbit)} · ${angka(data.ringkasan_wali.ditarik)} · ${angka(data.ringkasan_wali.belum)}`} />
            </Panel>
          ) : null}
          <DaftarTertunda judul="Rujukan menunggu hasil" data={data.tertunda.rujukan} tanggal="Dirujuk sejak" kosong="Tidak ada rujukan yang menunggu hasil." buka={buka} />
          <DaftarTertunda judul="Tindak lanjut belum selesai" data={data.tertunda.tindak_lanjut} tanggal="Target terdekat" kosong="Tidak ada tindak lanjut yang terbuka." buka={buka} />
          <Panel style={{ gap: 8 }}>
            <ThemedText type="bodyBold">Per kelas saat ini</ThemedText>
            {data.per_kelas.length === 0 ? <ThemedText themeColor="textSecondary">Tidak ada kunjungan.</ThemedText> : data.per_kelas.map(r => (
              <Baris key={r.kelas?.id ?? 'tanpa'} label={r.kelas?.nama ?? 'Belum ditempatkan'} value={`${angka(r.kunjungan)} kunjungan · ${angka(r.santri)} santri`} />
            ))}
            <ThemedText type="bodyBold">Per bulan</ThemedText>
            {data.per_bulan.map(r => <Baris key={r.bulan} label={namaBulan(r.bulan)} value={`${angka(r.kunjungan)} kunjungan · ${angka(r.santri)} santri`} />)}
          </Panel>
          {data.pengawasan ? (
            <Panel style={{ gap: 10 }}>
              <ThemedText type="bodyBold">Pengawasan admin</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">Berdasarkan waktu peristiwa, seluruh santri. Teks alasan dibaca di riwayat versi.</ThemedText>
              <Baris label="Koreksi" value={`${angka(data.pengawasan.koreksi.total)} · ${angka(data.pengawasan.koreksi.beralasan)} beralasan`} />
              {data.pengawasan.koreksi.tanpa_alasan_wajib > 0
                ? <Badge label={`${data.pengawasan.koreksi.tanpa_alasan_wajib} koreksi wajib-alasan tanpa alasan`} tone="danger" /> : null}
              {data.pengawasan.per_petugas.map(p => <Baris key={p.user_id} label={p.nama} value={`${angka(p.kunjungan)} kunjungan · ${angka(p.koreksi)} koreksi`} />)}
              {data.pengawasan.peristiwa_ringkasan.map(p => (
                <Baris key={p.jenis} label={`Ringkasan: ${p.jenis}`} value={`${angka(p.jumlah)} · ${angka(p.beralasan)} beralasan · ${angka(p.penerima)} penerima`} />
              ))}
              {data.pengawasan.akses.map(a => (
                <Baris key={`${a.sumber}-${a.aksi}-${a.kanal}`} label={`Sebagai ${a.sumber} · ${a.aksi} · ${a.kanal.toUpperCase()}`}
                  value={`${angka(a.jumlah)} kali · ${angka(a.pengguna)} akun`} />
              ))}
              {data.pengawasan.notifikasi.map(n => <Baris key={`${n.kanal}-${n.status}`} label={`Notifikasi ${n.kanal} · ${n.status}`} value={angka(n.jumlah)} />)}
              {data.pengawasan.koreksi_terbaru.map(k => (
                <Card key={`${k.kunjungan_id}-${k.versi}`} accessibilityLabel={`Riwayat versi kunjungan ${k.santri.nama}`}
                  onPress={() => router.push({ pathname: '/kesehatan/versi', params: { id: String(k.kunjungan_id) } })}>
                  <ThemedText type="bodyBold">{k.santri.nama}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {waktuPendek(k.waktu)} · versi {k.versi_sebelum} → {k.versi} · {k.oleh} · {k.beralasan ? 'beralasan' : 'tanpa alasan (draf)'}
                  </ThemedText>
                </Card>
              ))}
            </Panel>
          ) : null}
          <AppButton label="Muat ulang" variant="secondary" onPress={() => void load()} />
        </>
      )}
    </Halaman>
  );
}

function DaftarTertunda({ judul, data, tanggal, kosong, buka }: { judul: string; data: Tertunda; tanggal: string; kosong: string; buka: (id: number) => void }) {
  return (
    <Panel style={{ gap: 10 }}>
      <ThemedText type="bodyBold">{judul}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">{data.total} kunjungan · semua periode{data.total > data.rows.length ? ` · ${data.rows.length} terlama ditampilkan` : ''}</ThemedText>
      {data.rows.length === 0 ? <ThemedText themeColor="textSecondary">{kosong}</ThemedText> : data.rows.map(r => (
        <Card key={r.kunjungan_id} accessibilityLabel={`Buka kunjungan ${r.santri.nama} ${waktuPendek(r.waktu_kunjungan)}`} onPress={() => buka(r.kunjungan_id)}>
          <View style={{ gap: 4 }}>
            <ThemedText type="bodyBold">{r.santri.nama}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">NIS {r.santri.nis}{r.kelas ? ` · ${r.kelas}` : ''} · {waktuPendek(r.waktu_kunjungan)}</ThemedText>
            <ChipRow>
              {r.status === 'Draf' ? <StatusBadge status="Draf" /> : null}
              <Badge label={`${r.jumlah} ${tanggal === 'Dirujuk sejak' ? 'rujukan' : 'tindak lanjut'}`} />
              <Badge label={`${tanggal}: ${r.tanggal ? tanggalPanjang(r.tanggal) : '—'}`} tone={r.lewat > 0 ? 'warning' : 'neutral'} />
            </ChipRow>
          </View>
        </Card>
      ))}
    </Panel>
  );
}
