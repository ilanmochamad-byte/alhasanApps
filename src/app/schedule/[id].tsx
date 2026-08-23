import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api, createIdempotencyKey } from '@/api/client';
import type { ScheduleOccurrence } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '@/components/keyboard-aware-scroll-view';
import { formatDate } from '@/components/schedule-card';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function ScheduleDetailScreen() {
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const scheduleId = Number(params.id);
  const date = typeof params.date === 'string' ? params.date : '';
  const [schedule, setSchedule] = useState<ScheduleOccurrence | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const attempt = useRef<{ notes: string; key: string } | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(scheduleId) || scheduleId < 1 || !date) {
      setError('Parameter jadwal atau tanggal tidak valid.'); setLoading(false); return;
    }
    setLoading(true); setError(null);
    try { setSchedule(await api.schedule(scheduleId, date)); } catch (caught) { setError(actionableError(caught)); }
    finally { setLoading(false); }
  }, [date, scheduleId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function openMeeting() {
    const normalizedNotes = notes.trim();
    if (!attempt.current || attempt.current.notes !== normalizedNotes) {
      attempt.current = { notes: normalizedNotes, key: createIdempotencyKey('open') };
    }
    setOpening(true); setError(null);
    try {
      const meeting = await api.openMeeting(scheduleId, date, attempt.current.key, normalizedNotes);
      router.replace({ pathname: '/meeting/[id]', params: { id: String(meeting.id) } });
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setOpening(false);
    }
  }

  if (loading && !schedule) return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}><LoadingState label="Memuat detail tugas…" /></ScrollView>;
  if (error && !schedule) return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}><ErrorState message={error} onRetry={() => void load()} /></ScrollView>;

  return (
    <KeyboardAwareScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {schedule ? <>
        <View style={[styles.hero, { backgroundColor: theme.primary }]}><ThemedText selectable style={[styles.subject, { color: theme.onPrimary }]}>{schedule.subject}</ThemedText><ThemedText selectable style={{ color: theme.onPrimary }}>{formatDate(schedule.occurrence_date)} · {schedule.start_time}–{schedule.end_time}</ThemedText></View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><Detail label="Kelas" value={`${schedule.class.name} · ${schedule.class.level}`} /><Detail label="Kitab" value={schedule.book} /><Detail label="Tempat" value={schedule.place} /><Detail label="Tahun ajaran" value={`${schedule.academic_year.year} · ${schedule.academic_year.semester}`} /><Detail label="Guru" value={schedule.teacher.name} /></View>
        {schedule.meeting ? <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.heading}>Pertemuan sudah tersedia</ThemedText><ThemedText selectable themeColor="textSecondary">Status: {schedule.meeting.status}</ThemedText><AppButton label={schedule.meeting.status === 'Selesai' ? 'Buka absensi tersimpan' : 'Isi absensi'} onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: String(schedule.meeting!.id) } })} /></View> : <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}><ThemedText selectable style={styles.heading}>Buka pertemuan</ThemedText><ThemedText selectable themeColor="textSecondary">Daftar santri akan dibekukan dari keanggotaan kelas saat pertemuan dibuka.</ThemedText><KeyboardAwareTextInput multiline value={notes} onChangeText={setNotes} placeholder="Catatan pertemuan (opsional)" placeholderTextColor={theme.textSecondary} style={[styles.notes, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} /><AppButton label="Buka pertemuan" onPress={() => void openMeeting()} loading={opening} /></View>}
        {error ? <ThemedText selectable themeColor="danger" accessibilityLiveRegion="assertive">{error}</ThemedText> : null}
      </> : null}
    </KeyboardAwareScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><ThemedText selectable type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText selectable>{value}</ThemedText></View>;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 50, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: 22, borderCurve: 'continuous', padding: 20, gap: 7 },
  subject: { fontSize: 25, lineHeight: 31, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 18, borderCurve: 'continuous', padding: 17, gap: 14 },
  heading: { fontSize: 19, fontWeight: '900' },
  detail: { gap: 2 },
  notes: { minHeight: 90, borderWidth: 1, borderRadius: 13, borderCurve: 'continuous', padding: 13, textAlignVertical: 'top', fontSize: 16 },
});
