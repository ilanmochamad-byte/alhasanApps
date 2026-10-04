import { View } from 'react-native';
import { DateField } from '@/components/ui/date-field';
import { WebDateInput } from '@/components/ui/web-date-input';

export function DateTimeField({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  if (process.env.EXPO_OS === 'web') return <WebDateInput label={label} type="datetime-local"
    value={value} onChange={onChange} disabled={disabled} />;
  const [date = '', time = ''] = value.split('T');
  // Kedua bagian disimpan di pemilik formulir, termasuk pilihan yang belum lengkap.
  return <View style={{ gap: 12 }}>
    <DateField label={`${label} — tanggal`} value={date} disabled={disabled}
      onChange={next => onChange(`${next}T${time}`)} />
    <DateField label={`${label} — jam`} mode="time" value={time} disabled={disabled}
      onChange={next => onChange(`${date}T${next}`)} />
  </View>;
}
