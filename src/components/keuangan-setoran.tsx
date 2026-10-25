import { useState } from 'react';
import { View } from 'react-native';

import { keuangan, type SetoranTransfer } from '@/api/keuangan';
import { AppButton } from '@/components/app-button';
import { Pesan, waktuPendek } from '@/components/kesehatan-shared';
import { StatusBadge } from '@/components/keuangan-shared';
import { PrivateField } from '@/components/private-field';
import { ThemedText } from '@/components/themed-text';
import { ChipRow } from '@/components/ui/chip';
import { Card } from '@/components/ui/surface';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { galatAlasan, rupiah, sidikJari } from '@/keuangan/forms';

/**
 * Satu setoran transfer di antrean. Verifikasi = petugas menyatakan sudah
 * memeriksa dana masuk; server menyisipkan baris ledger sah sekali saja.
 * Keputusan kedua (oleh siapa pun) dijawab 409 dan tidak diulang otomatis.
 */
export function SetoranTransferKartu({ s, kelola, santri, onSelesai }: {
  s: SetoranTransfer; kelola: boolean; santri?: string; onSelesai: (pesan: string) => void;
}) {
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState('');
  const guard = useMutationGuard('bsa-setoran-putus');
  async function putus(aksi: 'verifikasi' | 'tolak') {
    if (aksi === 'tolak') { const g = galatAlasan(alasan); if (g) { guard.setError(g); return; } }
    const hasil = await guard.run(sidikJari(aksi, s.id, aksi === 'tolak' ? alasan.trim() : ''), key => keuangan.putusSetoran(s.id, aksi, alasan.trim(), key));
    if (hasil) onSelesai(aksi === 'verifikasi' ? `Setoran transfer diverifikasi${hasil.replayed ? ' (sudah tercatat sebelumnya)' : ''}. Saldo kini ${rupiah(hasil.saldo_sesudah)}.` : 'Setoran transfer ditolak. Saldo tidak berubah.');
  }
  return (
    <Card>
      <View style={{ gap: 6 }}>
        {santri ? <ThemedText type="bodyBold">{santri}</ThemedText> : null}
        <ThemedText type={santri ? 'body' : 'bodyBold'}>{rupiah(s.nominal)}</ThemedText>
        <ChipRow><StatusBadge status={s.status} /></ChipRow>
        <ThemedText type="caption" themeColor="textSecondary">Referensi {s.referensi ?? '—'} · dicatat {s.pencatat.nama}, {waktuPendek(s.dicatat_pada)}</ThemedText>
        {s.diputus ? <ThemedText type="caption" themeColor="textSecondary">Diputus {s.diputus.oleh}, {waktuPendek(s.diputus.pada)}</ThemedText> : null}
        {s.alasan_tolak ? <ThemedText type="caption" themeColor="textSecondary">Alasan penolakan: {s.alasan_tolak}</ThemedText> : null}
        {kelola && s.status === 'Menunggu' ? (
          <>
            <Pesan text={guard.error} tone="danger" />
            {tolak ? (
              <>
                <PrivateField label="Alasan penolakan (wajib)" value={alasan} onChangeText={setAlasan} multiline maxLength={500} editable={!guard.isBusy} />
                <AppButton label="Tolak setoran ini" variant="danger" size="sm" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('tolak')} />
                <AppButton label="Batal" variant="secondary" size="sm" disabled={guard.isBusy} onPress={() => { setTolak(false); guard.reset(); }} />
              </>
            ) : (
              <>
                <AppButton label="Sudah diperiksa — verifikasi" size="sm" loading={guard.isBusy} disabled={guard.isBusy} onPress={() => void putus('verifikasi')} />
                <AppButton label="Tolak" variant="outline" size="sm" disabled={guard.isBusy} onPress={() => { setTolak(true); guard.reset(); }} />
              </>
            )}
          </>
        ) : null}
      </View>
    </Card>
  );
}
