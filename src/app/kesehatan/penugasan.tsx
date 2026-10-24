import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { kesehatan, type DaftarPenugasan, type Penugasan } from '@/api/kesehatan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, Pesan, StatusBadge, tanggalPanjang } from '@/components/kesehatan-shared';
import { PrivateField } from '@/components/private-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { Card, Panel } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { waktuLokal, wajibAlasan } from '@/kesehatan/forms';

const STATUS = [
  { value: '', label: 'Semua' }, { value: 'aktif', label: 'Aktif' }, { value: 'akan_datang', label: 'Akan datang' },
  { value: 'berakhir', label: 'Berakhir' }, { value: 'nonaktif', label: 'Dinonaktifkan' },
];

/**
 * Penugasan petugas kesehatan (admin). Lewat layanan penugasan yang sama
 * dengan Pusat Penugasan web; penugasan tidak dihapus, hanya diakhiri atau
 * dinonaktifkan beralasan. Hak petugas berubah pada permintaan berikutnya.
 */
export default function PenugasanScreen() {
  const { profile } = useAuth();
  return <Kelola key={profile?.id} />;
}

function Kelola() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pesan, setPesan] = useState<string | null>(null);
  const fetcher = useCallback(() => kesehatan.penugasan(status, page), [status, page]);
  const { data, error, load } = usePrivateResource<DaftarPenugasan>(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat penugasan…" />;
  const total = Math.max(1, Math.ceil(data.total / data.per_page));
  const selesai = (teks: string) => { setPesan(teks); void load(); };
  return (
    <Halaman>
      <Pesan text={pesan} tone="success" />
      <FormBaru opsi={data.opsi} onSelesai={selesai} />
      <ThemedText type="h3">Penugasan ({data.total})</ThemedText>
      <ChipRow>{STATUS.map(s => <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => { setStatus(s.value); setPage(1); }} />)}</ChipRow>
      {data.rows.length === 0 ? <EmptyState title="Belum ada penugasan" message="Tambahkan pengurus sebagai petugas kesehatan." /> : null}
      {data.rows.map(p => <BarisPenugasan key={`${p.id}:${p.diperbarui_pada}`} p={p} onSelesai={selesai} />)}
      {total > 1 ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <AppButton label="Sebelumnya" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} style={{ flex: 1 }} />
          <ThemedText>{page}/{total}</ThemedText>
          <AppButton label="Berikutnya" size="sm" variant="secondary" disabled={page >= total} onPress={() => setPage(page + 1)} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Halaman>
  );
}

function FormBaru({ opsi, onSelesai }: { opsi: DaftarPenugasan['opsi']; onSelesai: (pesan: string) => void }) {
  const aktif = opsi.tahun.find(t => t.status === 'Aktif') ?? opsi.tahun[0];
  const [buka, setBuka] = useState(false);
  const [pengurus, setPengurus] = useState('');
  const [tahun, setTahun] = useState(aktif ? String(aktif.id) : '');
  const [mulai, setMulai] = useState(waktuLokal().slice(0, 10));
  const [selesai, setSelesai] = useState('');
  const [catatan, setCatatan] = useState('');
  const guard = useMutationGuard('kesehatan-penugasan');
  if (!buka) return <AppButton label="Tambah petugas kesehatan" icon="plus" onPress={() => setBuka(true)} />;
  async function simpan() {
    if (!pengurus) { guard.setError('Pilih pengurus.'); return; }
    const hasil = await guard.run(`${pengurus}:${tahun}:${mulai}:${selesai}:${catatan}`,
      () => kesehatan.buatPenugasan({ pengurus_id: Number(pengurus), tahun_ajaran_id: Number(tahun), tanggal_mulai: mulai, tanggal_selesai: selesai, catatan }));
    if (hasil) { setBuka(false); setPengurus(''); setCatatan(''); onSelesai(`Penugasan ${hasil.penugasan.pengurus.nama} tersimpan. ${hasil.hak ?? 'Hak pencatatan berlaku sekarang.'}`); }
  }
  return (
    <Panel style={{ gap: 12 }}>
      <ThemedText type="h3">Tambah petugas kesehatan</ThemedText>
      <DropdownField label="Pengurus" value={pengurus} searchable onChange={setPengurus}
        options={opsi.pengurus.map(p => ({ value: String(p.id), label: p.jabatan ? `${p.nama} · ${p.jabatan}` : p.nama }))} />
      <DropdownField label="Tahun ajaran" value={tahun} onChange={setTahun}
        options={opsi.tahun.map(t => ({ value: String(t.id), label: `${t.tahun} ${t.semester}${t.status === 'Aktif' ? ' (aktif)' : ''}` }))} />
      <DateField label="Tanggal mulai" value={mulai} onChange={setMulai} />
      <DateField label="Tanggal selesai" value={selesai} placeholder="Tanpa batas" onChange={setSelesai} />
      <PrivateField label="Catatan" value={catatan} onChangeText={setCatatan} maxLength={500} />
      <ThemedText type="caption" themeColor="textSecondary">Cakupan: seluruh santri aktif. Penugasan tidak membuat akun; hak berlaku bila akun pengurus aktif dan masa berlaku sedang berjalan.</ThemedText>
      <Pesan text={guard.error} tone="danger" />
      <AppButton label="Simpan penugasan" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void simpan()} />
      <AppButton label="Batal" variant="secondary" disabled={guard.isBusy} onPress={() => setBuka(false)} />
    </Panel>
  );
}

function BarisPenugasan({ p, onSelesai }: { p: Penugasan; onSelesai: (pesan: string) => void }) {
  const [aksi, setAksi] = useState<'akhiri' | 'nonaktifkan' | 'aktifkan' | null>(null);
  const [alasan, setAlasan] = useState('');
  const [tanggal, setTanggal] = useState(waktuLokal().slice(0, 10));
  const guard = useMutationGuard('kesehatan-penugasan-status');
  async function kirim() {
    if (!aksi) return;
    const salah = wajibAlasan(alasan);
    if (salah) { guard.setError(salah); return; }
    const body = aksi === 'akhiri' ? { alasan, tanggal_selesai: tanggal } : { alasan };
    const hasil = await guard.run(`${p.id}:${aksi}:${alasan}:${tanggal}`, () => kesehatan.ubahPenugasan(p.id, aksi, body));
    if (hasil) onSelesai(`Penugasan ${p.pengurus.nama} kini ${hasil.penugasan.status.toLowerCase()}. Hak dicabut atau diberikan pada pemeriksaan server berikutnya.`);
  }
  const label = { akhiri: 'Akhiri penugasan', nonaktifkan: 'Nonaktifkan penugasan', aktifkan: 'Aktifkan penugasan' };
  return (
    <Card>
      <View style={{ gap: 6 }}>
        <ThemedText type="bodyBold">{p.pengurus.nama}</ThemedText>
        <ChipRow><StatusBadge status={p.status} /></ChipRow>
        <ThemedText type="caption" themeColor="textSecondary">
          {tanggalPanjang(p.tanggal_mulai)} — {p.tanggal_selesai ? tanggalPanjang(p.tanggal_selesai) : 'seterusnya'} · {p.tahun.tahun} {p.tahun.semester} · akun {p.akun ? `${p.akun.username}${p.akun.aktif ? '' : ' (nonaktif)'}` : 'belum ada'}
        </ThemedText>
        {p.alasan_pengakhiran ? <ThemedText>Alasan pengakhiran: {p.alasan_pengakhiran}</ThemedText> : null}
        {aksi === null ? (
          <ChipRow>
            {p.aktif && p.status !== 'Berakhir' ? <Chip label="Akhiri" onPress={() => setAksi('akhiri')} /> : null}
            {p.aktif ? <Chip label="Nonaktifkan" onPress={() => setAksi('nonaktifkan')} /> : <Chip label="Aktifkan kembali" onPress={() => setAksi('aktifkan')} />}
          </ChipRow>
        ) : (
          <View style={{ gap: 10 }}>
            {aksi === 'akhiri' ? <DateField label="Tanggal selesai" value={tanggal} onChange={setTanggal} /> : null}
            <PrivateField label="Alasan (wajib)" value={alasan} onChangeText={setAlasan} maxLength={500} />
            <Pesan text={guard.error} tone="danger" />
            <AppButton label={label[aksi]} variant={aksi === 'aktifkan' ? 'primary' : 'danger'} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
            <AppButton label="Batal" size="sm" variant="secondary" disabled={guard.isBusy} onPress={() => { setAksi(null); guard.reset(); }} />
          </View>
        )}
      </View>
    </Card>
  );
}
