import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function WebDateInput({ label, type, value, onChange, min, max, disabled }: {
  label?: string; type: 'date' | 'time' | 'datetime-local'; value: string;
  onChange: (value: string) => void; min?: string; max?: string; disabled?: boolean;
}) {
  const theme = useTheme();
  return <View style={{ gap: 7 }}>
    {label && <ThemedText type="label">{label}</ThemedText>}
    <input aria-label={label} type={type} value={value} min={min} max={max} disabled={disabled}
      onChange={event => onChange(event.target.value)}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 48, borderRadius: 12,
        padding: 12, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
        fontFamily: 'inherit', fontSize: 16 }} />
  </View>;
}
