import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError, actionableError } from '@/api/client';
import { profil } from '@/api/profil';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/app-field';
import { TouchTarget } from '@/constants/theme';
import { installationId } from '@/notifications/push-registration';
import { ATURAN_PASSWORD, galatServer, periksaPassword, type IsianPassword } from '@/profil/format';

function KolomPassword({
  label, value, onChange, galat, autoComplete, onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  galat?: string;
  autoComplete: 'current-password' | 'new-password';
  onSubmit?: () => void;
}) {
  const [lihat, setLihat] = useState(false);
  return (
    <View style={styles.kolom}>
      <Field
        label={label}
        accessibilityLabel={label}
        icon="lock"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
        secureTextEntry={!lihat}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lihat ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
            accessibilityState={{ checked: lihat }}
            onPress={() => setLihat((v) => !v)}
            style={styles.passwordToggle}>
            <AppIcon name="eye" size={19} themeColor={lihat ? 'primary' : 'textMuted'} />
          </Pressable>
        }
      />
      {galat ? (
        <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="polite">
          {galat}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Ganti password sendiri (PRD-PROFIL-IMPORT Fase 2). Password saat ini
 * diperiksa server; aturan kekuatan sama dengan website. Password hanya hidup
 * di state komponen ini — tidak disimpan, tidak dicatat, dan dikosongkan
 * begitu berhasil. Token yang dipakai tetap berlaku; sesi lain dicabut server
 * (PI-2), perangkat push ini dipertahankan lewat `device_id` (PF-11).
 */
export function GantiPasswordForm({ onBerhasil, labelSimpan = 'Simpan password baru' }: {
  onBerhasil: () => Promise<void> | void;
  labelSimpan?: string;
}) {
  const [saatIni, setSaatIni] = useState('');
  const [baru, setBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [galat, setGalat] = useState<Partial<Record<IsianPassword, string>>>({});
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const berjalan = useRef(false);

  async function simpan() {
    if (berjalan.current) return;
    const lokal = periksaPassword(saatIni, baru, konfirmasi);
    setGalat(lokal);
    setPesan(null);
    if (Object.keys(lokal).length > 0) return;
    berjalan.current = true;
    setSibuk(true);
    try {
      await profil.gantiPassword({
        password_saat_ini: saatIni,
        password_baru: baru,
        konfirmasi_password: konfirmasi,
        device_id: await installationId(),
      });
      setSaatIni(''); setBaru(''); setKonfirmasi(''); setGalat({});
      await onBerhasil();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setGalat(galatServer(e.details) as Partial<Record<IsianPassword, string>>);
        setPesan(e.message);
      } else {
        setPesan(actionableError(e));
      }
    } finally {
      berjalan.current = false;
      setSibuk(false);
    }
  }

  return (
    <View style={styles.form}>
      <KolomPassword label="Password saat ini" value={saatIni} onChange={setSaatIni} galat={galat.password_saat_ini} autoComplete="current-password" />
      <KolomPassword label="Password baru" value={baru} onChange={setBaru} galat={galat.password_baru} autoComplete="new-password" />
      <ThemedText selectable type="caption" themeColor="textSecondary">{ATURAN_PASSWORD}</ThemedText>
      <KolomPassword label="Ulangi password baru" value={konfirmasi} onChange={setKonfirmasi} galat={galat.konfirmasi_password}
        autoComplete="new-password" onSubmit={() => void simpan()} />
      {pesan ? (
        <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="assertive">{pesan}</ThemedText>
      ) : null}
      <AppButton label={labelSimpan} icon="lock" loading={sibuk} onPress={() => void simpan()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  kolom: { gap: 6 },
  passwordToggle: { width: TouchTarget, height: TouchTarget, alignItems: 'center', justifyContent: 'center' },
});
