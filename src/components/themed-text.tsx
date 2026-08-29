import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Type } from '@/constants/theme';
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

  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]}
      {...rest}
    />
  );
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
