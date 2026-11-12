import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProfileStat = { value: string; label: string };

/**
 * Kepala profil entitas: avatar besar di tengah, nama, baris keterangan
 * (mis. "NIS • kelas" atau "@username"), pil status, dan strip angka. Strip
 * hanya digambar bila `stats` berisi — angka selalu dari data server.
 * `avatar` diisi pemanggil (foto akun sendiri atau `AvatarInisial`).
 */
export function ProfileHeader({
  avatar,
  name,
  caption,
  pills,
  stats = [],
  children,
}: {
  avatar: ReactNode;
  name: string;
  caption?: string;
  pills?: ReactNode;
  stats?: ProfileStat[];
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const bertumpuk = fontScale > 1.35;
  return (
    <View style={[styles.kartu, { backgroundColor: theme.card, borderColor: theme.border, boxShadow: Elevation.card }]}>
      {avatar}
      <View style={styles.teks}>
        <ThemedText selectable type="h1" style={styles.tengah}>
          {name}
        </ThemedText>
        {caption ? (
          <ThemedText selectable type="body" themeColor="textSecondary" style={styles.tengah}>
            {caption}
          </ThemedText>
        ) : null}
      </View>
      {pills}
      {children}
      {stats.length > 0 ? (
        <View style={[styles.strip, bertumpuk && styles.stripBertumpuk, { borderTopColor: theme.divider }]}>
          {stats.map((s, i) => (
            <View
              key={s.label}
              accessible
              accessibilityLabel={`${s.label}: ${s.value}`}
              style={[
                styles.angka,
                !bertumpuk && i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.divider },
              ]}>
              <ThemedText selectable type="numeralCard">
                {s.value}
              </ThemedText>
              <ThemedText selectable type="labelSmall" themeColor="textSecondary" style={styles.tengah}>
                {s.label}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kartu: {
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.hero,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  teks: { alignSelf: 'stretch', gap: 2 },
  tengah: { textAlign: 'center' },
  strip: { alignSelf: 'stretch', flexDirection: 'row', borderTopWidth: 1, paddingTop: 14, marginTop: 2 },
  stripBertumpuk: { flexDirection: 'column', gap: 12 },
  angka: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
});
