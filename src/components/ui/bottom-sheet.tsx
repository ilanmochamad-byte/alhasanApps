import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Lembar bawah (redesain gelombang 2): dipakai penyaring `SearchBar` dan menu
 * ⋯ kepala layar. `Modal` bawaan React Native — tanpa dependensi baru.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  keyboardAware = false,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  keyboardAware?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        enabled={keyboardAware && Platform.OS === 'ios'}
        behavior="padding"
        style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.backdrop} />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.head}>
            <ThemedText type="stackTitle" accessibilityRole="header" style={styles.title}>
              {title}
            </ThemedText>
            <IconButton icon="close" plain accessibilityLabel="Tutup" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(9, 20, 14, 0.45)' },
  sheet: {
    maxHeight: '86%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.hero,
    borderTopRightRadius: Radius.hero,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  body: { gap: 12, paddingTop: 8, paddingBottom: 8 },
});
