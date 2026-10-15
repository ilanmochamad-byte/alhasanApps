import { isLoaded } from 'expo-font';
import { Platform, StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { brandFontFamily, Fonts, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Tipe V2 (`display`…`overline`) berasal dari skala tipografi di
 * `constants/theme.ts`. Tipe lama tetap ada agar layar yang belum dipindahkan
 * tidak berubah tampilannya.
 */
export type ThemedTextType =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyBold'
  | 'label'
  | 'caption'
  | 'overline'
  | 'numeral'
  | 'default'
  | 'title'
  | 'small'
  | 'smallBold'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const merged = [{ color: theme[themeColor ?? 'text'] }, styles[type], style];

  return <Text style={[merged, brandFontStyle(merged)]} {...rest} />;
}

/**
 * Menerapkan huruf merek sesuai ketebalan akhir teks. Teks yang sudah memilih
 * keluarga sendiri (mis. `code`) dibiarkan; bila berkas huruf gagal dimuat,
 * teks tetap memakai huruf sistem dengan ketebalan aslinya.
 */
export function brandFontStyle(style: StyleProp<TextStyle>): TextStyle | null {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return null;
  const family = brandFontFamily(flat.fontWeight);
  if (!isLoaded(family)) return null;
  return { fontFamily: family, fontWeight: 'normal' };
}

const styles = StyleSheet.create({
  // V2 — nilainya berasal dari `Type` di constants/theme.ts agar hanya ada satu
  // sumber kebenaran untuk skala tipografi.
  display: Type.display,
  h1: Type.h1,
  h2: Type.h2,
  h3: Type.h3,
  body: Type.body,
  bodyBold: Type.bodyBold,
  label: Type.label,
  caption: Type.caption,
  overline: Type.overline,
  numeral: { ...Type.numeral, fontVariant: ['tabular-nums'] },

  // Warisan V1
  small: { fontSize: 14, fontWeight: '500' },
  smallBold: { fontSize: 14, fontWeight: '700' },
  default: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 48, fontWeight: '600' },
  subtitle: { fontSize: 32, fontWeight: '600' },
  link: { fontSize: 14 },
  linkPrimary: { fontSize: 14, color: '#3c87f7' },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
