import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { FilterPills } from '@/components/ui/filter-pills';
import { SearchBar } from '@/components/ui/search-bar';
import { TAB_SEMUA, type TabKelas } from '@/lib/peserta-saring';

/**
 * Kolom cari nama/NIS dan tab kelas asal untuk daftar peserta pertemuan
 * (redesain gelombang 2: `SearchBar` + pil yang dapat digeser). Hanya
 * mengubah tampilan; pemanggil tetap menyimpan dan mengirim seluruh peserta.
 * Penyaringan lokal (tanpa permintaan ke server per ketikan).
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
      <SearchBar
        accessibilityLabel="Cari santri menurut nama atau NIS"
        placeholder="Cari nama atau NIS"
        value={kataKunci}
        onChangeText={onKataKunci}
        autoComplete="off"
        maxLength={100}
        trailing={
          kataKunci !== '' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
              hitSlop={14}
              onPress={() => onKataKunci('')}>
              <AppIcon name="close" size={16} themeColor="textMuted" />
            </Pressable>
          ) : null
        }
      />
      {tabs ? (
        <FilterPills
          role="tab"
          accessibilityLabel="Pilih kelas asal"
          value={tab}
          onChange={onTab}
          options={tabs.map((item) => ({ value: item.key, label: `${item.label} · ${item.count}` }))}
        />
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
      <Pressable accessibilityRole="button" onPress={onReset} hitSlop={8} style={styles.reset}>
        <ThemedText type="bodyBold" themeColor="primary">
          Tampilkan semua santri
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  empty: { gap: 8, paddingVertical: 12 },
  reset: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
