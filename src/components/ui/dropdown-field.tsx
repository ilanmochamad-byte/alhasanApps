import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { PrivateField } from '@/components/private-field';
import { useTheme } from '@/hooks/use-theme';

type Option = { value: string; label: string };
/** Daftar digulir di dalam pemilih, bukan memenuhi halaman formulir. */
export function DropdownField({ label, value, options, onChange, disabled, searchable = false }: {
  label: string; value: string; options: Option[]; onChange: (value: string) => void;
  disabled?: boolean; searchable?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const close = () => { setOpen(false); setQuery(''); };
  return <View style={{ gap: 7 }}>
    <ThemedText type="label">{label}</ThemedText>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ expanded: open, disabled: Boolean(disabled) }} disabled={disabled}
      onPress={() => setOpen(true)} style={{ padding: 14, borderWidth: 1, borderRadius: 12,
        borderColor: theme.border, backgroundColor: theme.card, flexDirection: 'row', gap: 12 }}>
      <ThemedText style={{ flex: 1 }}>{selected?.label ?? `Pilih ${label.toLowerCase()}`}</ThemedText>
      <ThemedText>⌄</ThemedText>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16, maxHeight: '80%', gap: 12 }}>
          <ThemedText type="h3">{label}</ThemedText>
          {searchable && <PrivateField label={`Cari ${label.toLowerCase()}`} value={query} onChangeText={setQuery} />}
          <FlatList keyboardShouldPersistTaps="handled" data={options.filter(option => option.label.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id')))}
            keyExtractor={option => option.value} style={{ flexGrow: 0 }}
            ListEmptyComponent={<ThemedText>Tidak ada pilihan yang cocok.</ThemedText>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.label}
              accessibilityState={{ selected: item.value === value }} onPress={() => { onChange(item.value); close(); }}
              style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.border }}>
              <ThemedText>{item.value === value ? '✓ ' : ''}{item.label}</ThemedText>
            </Pressable>} />
          <AppButton label="Tutup pilihan" variant="secondary" onPress={close} />
        </View>
      </View>
    </Modal>
  </View>;
}
