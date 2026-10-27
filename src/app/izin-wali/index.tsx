import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { izinWali, type AksesIzinWali, type PeranIzinWali } from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Halaman, KartuPengajuan, Pager } from '@/components/izin-wali-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';

const LABEL_PERAN: Record<PeranIzinWali, string> = { wali: 'Orang tua', pembimbing: 'Pembimbing', admin: 'Admin', murobi: 'Murobi' };
const URUTAN: PeranIzinWali[] = ['wali', 'pembimbing', 'admin', 'murobi'];

/**
 * Pintu masuk alur izin wali → pembimbing → murobi/admin (PRD V7 Fase 4).
 * Peran yang tampil berasal dari `/v7/izin/akses` yang dihitung ulang server;
 * setiap daftar dan rincian tetap diperiksa server per permintaan.
 */
export default function IzinWaliIndexScreen() {
  const { profile } = useAuth();
  return <Pintu key={profile?.id ?? 'tamu'} />;
}

function Pintu() {
  const fetcher = useCallback(() => izinWali.akses(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  const [pilihan, setPilihan] = useState<PeranIzinWali | null>(null);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memeriksa akses perizinan…" />;
  const peran = URUTAN.filter(p => data[p]);
  if (peran.length === 0) {
    return <Halaman><EmptyState title="Tidak ada akses" message="Akun ini bukan orang tua berelasi aktif, pembimbing, murobi, atau admin. Hubungi admin pesantren." /></Halaman>;
  }
  const aktif = pilihan !== null && peran.includes(pilihan) ? pilihan : peran[0];
  return (
    <Halaman>
      {peran.length > 1 ? (
        <Segmented accessibilityLabel="Peran" value={aktif} onChange={setPilihan}
          options={peran.map(p => ({
            value: p, label: LABEL_PERAN[p],
            count: p === 'pembimbing' && data.antrean_pembimbing > 0 ? data.antrean_pembimbing : p === 'admin' && data.antrean_admin > 0 ? data.antrean_admin : undefined,
          }))} />
      ) : null}
      {aktif === 'wali' ? <BagianWali akses={data} /> : null}
      {aktif === 'pembimbing' ? <BagianPembimbing /> : null}
      {aktif === 'admin' ? <BagianAdmin /> : null}
      {aktif === 'murobi' ? <BagianMurobi /> : null}
    </Halaman>
  );
}

function BagianWali({ akses }: { akses: AksesIzinWali }) {
  const router = useRouter();
  const [anak, setAnak] = useState(0);
  const [page, setPage] = useState(1);
  const fetcher = useCallback(async () => {
    const [daftarAnak, daftar] = await Promise.all([izinWali.anak(), izinWali.daftarWali(anak, page)]);
    return { anak: daftarAnak.items, daftar };
  }, [anak, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  return (
    <>
      <ThemedText type="h3">Izin anak melalui pembimbing</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        Pengajuan ditinjau pembimbing lebih dulu, lalu diteruskan kepada murobi yang memutuskan.
      </ThemedText>
      <AppButton label="Ajukan izin" icon="plus" disabled={!akses.boleh_mengajukan}
        onPress={() => router.push('/izin-wali/buat')} />
      {!akses.boleh_mengajukan ? <ThemedText type="caption" themeColor="textSecondary">Belum ada anak dengan relasi wali aktif yang dapat diajukan.</ThemedText> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat pengajuan…" /> : (
        <>
          {data.anak.length > 1 ? (
            <ChipRow>
              <Chip accessibilityRole="radio" label="Semua anak" selected={anak === 0} onPress={() => { setAnak(0); setPage(1); }} />
              {data.anak.map(a => <Chip accessibilityRole="radio" key={a.id} label={a.nama} selected={anak === a.id} onPress={() => { setAnak(a.id); setPage(1); }} />)}
            </ChipRow>
          ) : null}
          <ThemedText type="caption" themeColor="textSecondary">{data.daftar.total} pengajuan</ThemedText>
          {data.daftar.items.length === 0 ? <EmptyState title="Belum ada pengajuan" message="Pengajuan izin yang Anda atau wali lain buat untuk anak ini akan tampil di sini." /> : null}
          {data.daftar.items.map(item => (
            <KartuPengajuan key={item.id} item={item} onPress={() => router.push({ pathname: '/izin-wali/[id]', params: { id: String(item.id) } })} />
          ))}
          <Pager page={page} total={data.daftar.total} perPage={data.daftar.per_page} onChange={setPage} />
        </>
      )}
    </>
  );
}

function BagianPembimbing() {
  const router = useRouter();
  const [tampilan, setTampilan] = useState<'antrean' | 'riwayat'>('antrean');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => tampilan === 'antrean' ? izinWali.antreanPembimbing(page) : izinWali.riwayatPembimbing(page), [tampilan, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  return (
    <>
      <Segmented variant="radio" accessibilityLabel="Tampilan pembimbing" value={tampilan} onChange={v => { setTampilan(v); setPage(1); }}
        options={[{ value: 'antrean', label: 'Perlu ditinjau' }, { value: 'riwayat', label: 'Sudah ditinjau' }]} />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat antrean pembimbing…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.total} pengajuan</ThemedText>
          {data.items.length === 0 ? (
            <EmptyState title={tampilan === 'antrean' ? 'Tidak ada yang perlu ditinjau' : 'Belum ada riwayat'}
              message={tampilan === 'antrean' ? 'Pengajuan orang tua santri binaan Anda akan tampil di sini.' : 'Pengajuan yang sudah Anda tinjau tampil di sini dengan status terkininya.'} />
          ) : null}
          {data.items.map(item => <KartuPengajuan key={item.id} item={item} onPress={() => router.push({ pathname: '/izin-wali/[id]', params: { id: String(item.id) } })} />)}
          <Pager page={page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
    </>
  );
}

function BagianAdmin() {
  const router = useRouter();
  const [antrean, setAntrean] = useState<'1' | '0'>('1');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => izinWali.daftarAdmin(antrean === '1', page), [antrean, page]);
  const { data, error, load } = usePrivateResource(fetcher);
  return (
    <>
      <Segmented variant="radio" accessibilityLabel="Tampilan admin" value={antrean} onChange={v => { setAntrean(v); setPage(1); }}
        options={[{ value: '1', label: 'Perlu tindakan admin', count: data?.antrean_admin || undefined }, { value: '0', label: 'Semua' }]} />
      <ThemedText type="caption" themeColor="textSecondary">
        Admin menetapkan pembimbing bila santri tidak memiliki tepat satu pembimbing sah, dan menetapkan murobi atau memutus sebagai pengganti lewat Perizinan. Admin tidak menggantikan tinjauan pembimbing.
      </ThemedText>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : !data ? <LoadingState label="Memuat pengajuan wali…" /> : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">{data.total} pengajuan</ThemedText>
          {data.items.length === 0 ? <EmptyState title="Tidak ada pengajuan" message="Tidak ada pengajuan wali yang cocok dengan tampilan ini." /> : null}
          {data.items.map(item => <KartuPengajuan key={item.id} item={item} onPress={() => router.push({ pathname: '/izin-wali/[id]', params: { id: String(item.id) } })} />)}
          <Pager page={page} total={data.total} perPage={data.per_page} onChange={setPage} />
        </>
      )}
    </>
  );
}

function BagianMurobi() {
  const router = useRouter();
  return (
    <Panel style={{ gap: 10 }}>
      <ThemedText type="bodyBold">Keputusan murobi</ThemedText>
      <ThemedText themeColor="textSecondary">
        Pengajuan orang tua baru sampai kepada Anda setelah diteruskan pembimbing. Pengajuan itu masuk antrean Perizinan (peran Murobi) dan diputuskan di sana seperti pengajuan pengurus.
      </ThemedText>
      <AppButton label="Buka antrean Perizinan" variant="secondary" onPress={() => router.navigate('/perizinan')} />
    </Panel>
  );
}
