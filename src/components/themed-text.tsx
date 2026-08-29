import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
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
  // V2
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  h3: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bodyBold: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6 },
  numeral: { fontSize: 30, lineHeight: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },

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
