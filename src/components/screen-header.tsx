import { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { IconName } from '@/components/app-icon';
import { BrandLogo } from '@/components/brand-logo';
import { NotificationBell } from '@/components/notification-bell';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { IconButton } from '@/components/ui/icon-button';
import { ListRow } from '@/components/ui/list-row';
import { useKembali } from '@/hooks/use-kembali';
import { labelKembali } from '@/lib/kembali';

export type HeaderMenuItem = { label: string; icon?: IconName; onPress: () => void; danger?: boolean };

type Props = {
  /**
   * Redesain gelombang 2 (K-7, K-9, K-10):
   *  - `beranda`: logo "Alhasan apps" + lonceng, tanpa ←;
   *  - `akar`: ← ke tab Beranda, lalu judul besar kiri + subjudul;
   *  - `stack`: ← · judul tengah · ⋯.
   * Fase 4 memindahkan layar terakhir; kepala lama tanpa ← dihapus sehingga
   * setiap kepala selain Beranda wajib memiliki tombol kembali.
   */
  variant: 'beranda' | 'akar' | 'stack';
  title?: string;
  /** Satu kalimat penjelas di bawah judul. */
  subtitle?: string;
  actions?: ReactNode;
  bell?: boolean;
  /** Mengganti aksi ← bawaan (mis. kembali ke langkah sebelumnya dalam satu halaman). */
  onBack?: () => void;
  /**
   * Label aksesibilitas ← bila "Kembali" saja ambigu di layar itu (mis. formulir
   * yang punya kolom tanggal "Kembali"). Tetap diawali kata "Kembali".
   */
  backLabel?: string;
  /** Tindakan sekunder di balik ⋯ (varian `stack`). Kosong → ⋯ tidak digambar. */
  menu?: HeaderMenuItem[];
};

/**
 * Bilah judul layar. Setiap layar menggambar kepalanya sendiri; lihat `variant`.
 */
export function ScreenHeader(props: Props) {
  if (props.variant === 'beranda') return <KepalaBeranda />;
  if (props.variant === 'akar') return <KepalaAkar {...props} />;
  return <KepalaStack {...props} />;
}

function KepalaBeranda() {
  return (
    <View style={styles.beranda}>
      <BrandLogo />
      <View style={styles.spacer} />
      <NotificationBell />
    </View>
  );
}

function KepalaAkar({ title, subtitle, actions, bell = false, onBack }: Props) {
  const bawaan = useKembali('akar');
  return (
    <View style={styles.akar}>
      <View style={styles.row}>
        <IconButton icon="arrow-left" accessibilityLabel={labelKembali('akar')} onPress={onBack ?? bawaan} />
        <View style={styles.spacer} />
        {actions}
        {bell ? <NotificationBell /> : null}
      </View>
      <ThemedText selectable type="display" accessibilityRole="header">
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText selectable type="body" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

function KepalaStack({ title, subtitle, actions, onBack, menu, backLabel }: Props) {
  const bawaan = useKembali('stack');
  const { fontScale } = useWindowDimensions();
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const adaMenu = Boolean(menu && menu.length > 0);
  // Teks sistem sangat besar: judul turun ke baris sendiri (rata kiri, lebar
  // penuh) agar kata tidak terpecah di antara ← dan ⋯.
  const bertumpuk = fontScale > 1.35;
  const judul = (
    <View style={bertumpuk ? styles.stackTitleBertumpuk : styles.stackTitle}>
      <ThemedText selectable type="stackTitle" accessibilityRole="header" style={bertumpuk ? undefined : styles.center}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText selectable type="caption" themeColor="textSecondary" style={bertumpuk ? undefined : styles.center}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
  return (
    <View style={styles.stackHead}>
      <View style={styles.row}>
        <IconButton icon="arrow-left" accessibilityLabel={backLabel ?? labelKembali('stack')} onPress={onBack ?? bawaan} />
        {bertumpuk ? <View style={styles.spacer} /> : judul}
        {actions}
        {adaMenu ? (
          <IconButton icon="dots" accessibilityLabel="Tindakan lain" onPress={() => setMenuTerbuka(true)} />
        ) : actions || bertumpuk ? null : (
          // Penyeimbang agar judul tetap di tengah ketika tidak ada ⋯.
          <View style={styles.penyeimbang} />
        )}
      </View>
      {bertumpuk ? judul : null}
      {adaMenu ? (
        <BottomSheet visible={menuTerbuka} title="Tindakan lain" onClose={() => setMenuTerbuka(false)}>
          <View>
            {menu!.map((item, index) => (
              <ListRow
                key={item.label}
                icon={item.icon}
                title={item.label}
                danger={item.danger}
                last={index === menu!.length - 1}
                onPress={() => {
                  setMenuTerbuka(false);
                  item.onPress();
                }}
              />
            ))}
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
  beranda: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  akar: { gap: 6, paddingBottom: 4 },
  stackHead: { paddingBottom: 4 },
  stackTitle: { flex: 1, gap: 2 },
  stackTitleBertumpuk: { gap: 2, paddingTop: 6 },
  center: { textAlign: 'center' },
  penyeimbang: { width: 44 },
});
