import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { izinWali, type IsianIzin } from '@/api/izin-wali';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { Baris, Halaman, Pesan, rentang } from '@/components/izin-wali-shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { Chip, ChipRow } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Notice } from '@/components/ui/notice';
import { Overline, Panel } from '@/components/ui/surface';
import { useTheme } from '@/hooks/use-theme';

import { useIzinWaliMutation } from '@/hooks/use-izin-wali-mutation';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { periksaIsian, rapikan } from '@/izin-wali/forms';

const JUDUL = 'Ajukan izin anak';

const KOSONG: IsianIzin = { tgl_izin: '', tgl_kembali: '', alasan: '', catatan: '' };

/**
 * Wali membuat SATU pengajuan izin untuk anak berelasi aktif. Daftar anak dari
 * server; ketukan ganda dan kirim ulang sesudah jaringan putus memakai kunci
 * idempotensi yang sama sehingga server tidak membuat baris kedua. Benturan
 * tanggal (409) dan relasi dicabut (404) diputuskan server.
 */
export default function BuatIzinWaliScreen() {
  const { profile } = useAuth();
  return <Formulir key={profile?.id ?? 'tamu'} />;
}

function Formulir() {
  const router = useRouter();
  const theme = useTheme();
  const [santriId, setSantriId] = useState<number | null>(null);
  const [isian, setIsian] = useState<IsianIzin>(KOSONG);
  const [tinjau, setTinjau] = useState(false);
  const [validasi, setValidasi] = useState<string | null>(null);
  const bersihkan = useCallback(() => { setSantriId(null); setIsian(KOSONG); setTinjau(false); }, []);
  const fetcher = useCallback(() => izinWali.anak(), []);
  const { data, error, load, reject } = usePrivateResource(fetcher, bersihkan, true);
  const guard = useIzinWaliMutation('izin-wali-buat', reject);

  if (error) return <Halaman title={JUDUL}><ErrorState message={error} onRetry={() => void load()} /></Halaman>;
  if (!data) return <Halaman title={JUDUL}><LoadingState label="Memuat anak yang terhubung…" /></Halaman>;
  if (data.items.length === 0) {
    return <Halaman title={JUDUL}><EmptyState title="Belum ada anak" message="Akun ini belum memiliki relasi wali aktif dengan santri aktif. Hubungi admin pesantren." /></Halaman>;
  }
  const anak = data.items.find(a => a.id === santriId) ?? null;
  const ubah = (bagian: Partial<IsianIzin>) => { setIsian(v => ({ ...v, ...bagian })); setTinjau(false); };

  function lanjut() {
    const masalah = anak === null ? 'Pilih anak terlebih dahulu.' : periksaIsian(isian);
    setValidasi(masalah);
    if (masalah === null) setTinjau(true);
  }

  async function kirim() {
    if (anak === null) return;
    const payload = { santri_id: anak.id, ...rapikan(isian) };
    const hasil = await guard.run(JSON.stringify(payload), key => izinWali.buat(payload, key));
    if (hasil) router.replace({ pathname: '/izin-wali/[id]', params: { id: String(hasil.id), baru: hasil.idempotent_replay ? 'ulang' : '1' } });
  }

  return (
    <Halaman
      title={JUDUL}
      // K-10: ← dari tahap Tinjau kembali ke isian dulu.
      onBack={tinjau && !guard.isBusy ? () => setTinjau(false) : undefined}
      footer={
        <ActionBar>
          {tinjau && anak !== null ? (
            <>
              <AppButton label="Ubah isian" variant="secondary" style={{ width: 118 }} disabled={guard.isBusy} onPress={() => setTinjau(false)} />
              <AppButton label="Kirim pengajuan" style={{ flex: 1 }} loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void kirim()} />
            </>
          ) : (
            <AppButton label="Tinjau pengajuan" style={{ flex: 1 }} onPress={lanjut} />
          )}
        </ActionBar>
      }>
      {/* Kartu anak terpilih di atas formulir. */}
      {anak !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 20, borderCurve: 'continuous', padding: 12, backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }}>
          <AvatarInisial nama={anak.nama} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="bodyBold">{anak.nama}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">NIS {anak.nis}</ThemedText>
          </View>
        </View>
      ) : null}
      <Panel style={{ gap: 10 }}>
        <Overline>Anak</Overline>
        <ChipRow>
          {data.items.map(a => (
            <Chip key={a.id} accessibilityRole="radio" label={`${a.nama} (${a.nis})`} selected={santriId === a.id} style={{ minHeight: 44 }}
              onPress={() => { setSantriId(a.id); setTinjau(false); }} />
          ))}
        </ChipRow>
      </Panel>
      <Panel style={{ gap: 10 }}>
        <Overline>Rentang izin</Overline>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <DateField label="Tanggal izin" value={isian.tgl_izin}
              onChange={next => ubah({ tgl_izin: next, ...(isian.tgl_kembali && isian.tgl_kembali < next ? { tgl_kembali: next } : {}) })} />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <DateField label="Tanggal kembali" value={isian.tgl_kembali} onChange={next => ubah({ tgl_kembali: next })} minimumDate={isian.tgl_izin || undefined} />
          </View>
        </View>
      </Panel>
      <Field label="Alasan izin" accessibilityLabel="Alasan izin" icon="izin" value={isian.alasan} onChangeText={alasan => ubah({ alasan })} multiline placeholder="Minimal 3 karakter" />
      <Field label="Catatan" accessibilityLabel="Catatan" hint="Opsional" icon="info" value={isian.catatan} onChangeText={catatan => ubah({ catatan })} multiline placeholder="Catatan untuk pembimbing" />
      <Pesan text={validasi} tone="danger" />
      {tinjau && anak !== null ? (
        <Panel style={{ gap: 0 }}>
          <Overline>Tinjau sebelum mengirim</Overline>
          <Baris icon="person" label="Anak" value={`${anak.nama} (NIS ${anak.nis})`} />
          <Baris icon="calendar" label="Rentang" value={rentang(isian.tgl_izin, isian.tgl_kembali)} />
          <Baris icon="izin" label="Alasan" value={isian.alasan.trim()} />
          <Baris icon="info" label="Catatan" value={isian.catatan.trim()} last />
          <Notice tone="info" selectable={false} text="Pengajuan ditinjau pembimbing anak lebih dulu. Bila pembimbing belum ditetapkan, admin menetapkannya; pengajuan belum dikirim kepada murobi." />
          <Pesan text={guard.error} tone="danger" />
        </Panel>
      ) : null}
    </Halaman>
  );
}
