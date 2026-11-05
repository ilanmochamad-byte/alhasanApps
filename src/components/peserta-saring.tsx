import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { SearchField } from '@/components/ui/app-field';
import { Chip } from '@/components/ui/chip';
import { TAB_SEMUA, type TabKelas } from '@/lib/peserta-saring';

/**
 * Kolom cari nama/NIS dan tab kelas asal untuk daftar peserta pertemuan.
 * Hanya mengubah tampilan; pemanggil tetap menyimpan dan mengirim seluruh
 * peserta. Penyaringan lokal (tanpa permintaan ke server per ketikan).
 */
export function PesertaSaring({
  kataKunci,
  onKataKunci,
  tabs,
  tab,
  onTab,
  tampil,
  total,
}: {
  kataKunci: string;
  onKataKunci: (value: string) => void;
  /** `null` pada jadwal satu kelas: tab tidak ditampilkan. */
  tabs: TabKelas[] | null;
  tab: string;
  onTab: (key: string) => void;
  /** Jumlah peserta yang sedang tampil. */
  tampil: number;
  total: number;
}) {
  const aktif = kataKunci.trim() !== '' || tab !== TAB_SEMUA;
  return (
    <View style={styles.wrap}>
      <SearchField
        accessibilityLabel="Cari santri menurut nama atau NIS"
        placeholder="Cari nama atau NIS"
        value={kataKunci}
        onChangeText={onKataKunci}
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={100}
        trailing={
          kataKunci !== '' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
              hitSlop={10}
              onPress={() => onKataKunci('')}>
              <AppIcon name="close" size={16} themeColor="textMuted" />
            </Pressable>
          ) : null
        }
      />
      {tabs ? (
        <View accessibilityRole="tablist" accessibilityLabel="Pilih kelas asal" style={styles.tabs}>
          {tabs.map((item) => (
            <Chip
              key={item.key}
              accessibilityRole="tab"
              label={`${item.label} · ${item.count}`}
              selected={tab === item.key}
              onPress={() => onTab(item.key)}
            />
          ))}
        </View>
      ) : null}
      {aktif ? (
        <ThemedText selectable type="caption" themeColor="textSecondary" accessibilityLiveRegion="polite">
          Menampilkan {tampil} dari {total} santri
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Pesan saat saringan tidak menemukan peserta. */
export function PesertaKosong({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.empty}>
      <ThemedText selectable themeColor="textSecondary">
        Tidak ada santri yang cocok dengan pencarian atau kelas yang dipilih.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onReset} hitSlop={8}>
        <ThemedText type="bodyBold" themeColor="primary">
          Tampilkan semua santri
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { gap: 8, paddingVertical: 12 },
});
