import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { keuangan, type SetoranTransfer } from '@/api/keuangan';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { waktuPendek } from '@/components/kesehatan-shared';
import { Kartu, Pesan, StatusBadge } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ThemedText } from '@/components/themed-text';
import { AvatarInisial } from '@/components/ui/avatar-inisial';
import { useKeuanganMutation } from '@/hooks/use-keuangan-mutation';
import { useTheme } from '@/hooks/use-theme';
import { galatAlasan, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Satu setoran transfer di antrean. Verifikasi = petugas menyatakan sudah
 * memeriksa dana masuk; server menyisipkan baris ledger sah sekali saja.
 * Keputusan kedua (oleh siapa pun) dijawab 409 dan tidak diulang otomatis.
 */
export function SetoranTransferKartu({ s, kelola, santri, onSelesai, onDenied }: {
  s: SetoranTransfer; kelola: boolean; santri?: { nama: string; nis: string }; onSelesai: (pesan: string) => void; onDenied: (error: unknown) => void;
}) {
  const theme = useTheme();
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState('');
  const guard = useKeuanganMutation('bsa-setoran-putus', onDenied);
  async function putus(aksi: 'verifikasi' | 'tolak') {
    if (aksi === 'tolak') { const g = galatAlasan(alasan); if (g) { guard.setError(g); return; } }
    const hasil = await guard.run(sidikJari(aksi, s.id, aksi === 'tolak' ? alasan.trim() : ''), key => keuangan.putusSetoran(s.id, aksi, alasan.trim(), key));
    if (hasil) onSelesai(aksi === 'verifikasi' ? `Setoran transfer diverifikasi${hasil.replayed ? ' (sudah tercatat sebelumnya)' : ''}. Saldo kini ${rupiah(hasil.saldo_sesudah)}.` : 'Setoran transfer ditolak. Saldo tidak berubah.');
  }
  const menunggu = s.status === 'Menunggu';
  return (
    <Kartu gap={10}>
      <View style={styles.kepala}>
        {santri ? <AvatarInisial nama={santri.nama} tone="warning" /> : (
          <View style={[styles.ikon, { backgroundColor: menunggu ? theme.warningSoft : theme.primarySoft }]}>
            <AppIcon name={menunggu ? 'clock' : 'wallet'} size={20} color={menunggu ? theme.warning : theme.primary} />
          </View>
        )}
        <View style={styles.flex}>
          {santri ? <ThemedText selectable type="bodyBold">{`${santri.nama} · NIS ${santri.nis}`}</ThemedText> : null}
          <ThemedText selectable type={santri ? 'caption' : 'bodyBold'} themeColor={santri ? 'textSecondary' : 'text'}>Setoran transfer</ThemedText>
        </View>
        {/* Bertanda + hanya bila sudah sah; yang menunggu belum menambah saldo. */}
        <ThemedText selectable type="bodyBold" themeColor={s.status === 'Sah' ? 'primary' : 'text'} style={styles.nominal}>{s.status === 'Sah' ? '+' : ''}{rupiah(s.nominal)}</ThemedText>
      </View>
      <StatusBadge status={s.status} />
      <ThemedText selectable type="caption" themeColor="textSecondary">Referensi {s.referensi ?? '—'} · dicatat {s.pencatat.nama}, {waktuPendek(s.dicatat_pada)}</ThemedText>
      {s.diputus ? <ThemedText selectable type="caption" themeColor="textSecondary">Diputus {s.diputus.oleh}, {waktuPendek(s.diputus.pada)}</ThemedText> : null}
      {s.alasan_tolak ? <ThemedText selectable type="caption" themeColor="textSecondary">Alasan penolakan: {s.alasan_tolak}</ThemedText> : null}
      {kelola && menunggu ? (
        <>
          <Pesan text={guard.error} tone="danger" />
          {tolak ? (
            <>
              <PrivateField label="Alasan penolakan (wajib)" hint={`${alasan.trim().length}/500`} value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
              <View style={styles.tombol}>
                <AppButton label="Batal" variant="secondary" size="sm" disabled={guard.isBusy} onPress={() => { setTolak(false); guard.reset(); }} style={styles.flex} />
                <AppButton label="Tolak setoran ini" variant="danger" size="sm" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('tolak')} style={styles.flex} />
              </View>
            </>
          ) : (
            <View style={styles.tombol}>
              <AppButton label="Tolak" variant="outline" size="sm" disabled={guard.isBusy} onPress={() => { setTolak(true); guard.reset(); }} />
              <AppButton label="Sudah diperiksa — verifikasi" icon="check" size="sm" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('verifikasi')} style={styles.flex} />
            </View>
          )}
        </>
      ) : null}
    </Kartu>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kepala: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ikon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nominal: { fontVariant: ['tabular-nums'] },
  tombol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
