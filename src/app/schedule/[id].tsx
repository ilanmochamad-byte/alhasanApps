import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actionableError, api, createIdempotencyKey } from '@/api/client';
import type { ScheduleOccurrence } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { formatDate } from '@/components/schedule-card';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { Badge } from '@/components/ui/chip';
import { Divider, Overline, Panel } from '@/components/ui/surface';
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
      setError('Parameter jadwal atau tanggal tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSchedule(await api.schedule(scheduleId, date));
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setLoading(false);
    }
  }, [date, scheduleId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openMeeting() {
    const normalizedNotes = notes.trim();
    if (!attempt.current || attempt.current.notes !== normalizedNotes) {
      attempt.current = { notes: normalizedNotes, key: createIdempotencyKey('open') };
    }
    setOpening(true);
    setError(null);
    try {
      const meeting = await api.openMeeting(scheduleId, date, attempt.current.key, normalizedNotes);
      router.replace({ pathname: '/meeting/[id]', params: { id: String(meeting.id) } });
    } catch (caught) {
      setError(actionableError(caught));
    } finally {
      setOpening(false);
    }
  }

  if (loading && !schedule) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}>
        <LoadingState label="Memuat detail tugas…" />
      </ScrollView>
    );
  }
  if (error && !schedule) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.background }}>
        <ErrorState message={error} onRetry={() => void load()} />
      </ScrollView>
    );
  }
  if (!schedule) return null;

  const sudahAda = Boolean(schedule.meeting);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        <Panel>
          <View style={styles.headerRow}>
            <View style={styles.time}>
              <ThemedText selectable style={styles.timeStart}>
                {schedule.start_time}
              </ThemedText>
              <ThemedText selectable style={[styles.timeEnd, { color: theme.textMuted }]}>
                {schedule.end_time}
              </ThemedText>
            </View>
            <View style={[styles.rail, { backgroundColor: theme.primary }]} />
            <View style={styles.headerText}>
              <ThemedText selectable type="h2">
                {schedule.subject}
              </ThemedText>
              <ThemedText selectable type="caption" themeColor="textSecondary">
                {formatDate(schedule.occurrence_date)}
              </ThemedText>
            </View>
            <Badge label={schedule.meeting ? schedule.meeting.status : 'Belum dibuka'} tone={sudahAda ? 'primary' : 'warning'} />
          </View>

          <Divider />

          <Detail label="Kelas" value={`${schedule.class.name} · ${schedule.class.level}`} />
          <Detail label="Kitab" value={schedule.book} />
          <Detail label="Tempat" value={schedule.place} />
          <Detail label="Tahun ajaran" value={`${schedule.academic_year.year} · ${schedule.academic_year.semester}`} />
          <Detail label="Guru" value={schedule.teacher.name} />
        </Panel>

        {sudahAda ? (
          <Panel>
            <Overline>Pertemuan sudah tersedia</Overline>
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Status pertemuan: {schedule.meeting?.status}.
            </ThemedText>
          </Panel>
        ) : (
          <Panel>
            <Overline>Buka pertemuan</Overline>
            <ThemedText selectable type="caption" themeColor="textSecondary">
              Daftar santri akan dibekukan dari keanggotaan kelas saat pertemuan dibuka.
            </ThemedText>
            <Field
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Catatan pertemuan (opsional)"
            />
          </Panel>
        )}

        {error ? (
          <ThemedText selectable type="caption" themeColor="danger" accessibilityLiveRegion="assertive">
            {error}
          </ThemedText>
        ) : null}
      </KeyboardAwareScrollView>

      <ActionBar>
        {sudahAda ? (
          <AppButton
            label={schedule.meeting?.status === 'Selesai' ? 'Buka absensi tersimpan' : 'Isi absensi'}
            icon="check"
            style={styles.grow}
            onPress={() =>
              router.push({ pathname: '/meeting/[id]', params: { id: String(schedule.meeting!.id) } })
            }
          />
        ) : (
          <AppButton
            label="Buka pertemuan"
            icon="plus"
            style={styles.grow}
            onPress={() => void openMeeting()}
            loading={opening}
          />
        )}
      </ActionBar>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <ThemedText selectable type="caption" themeColor="textMuted" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText selectable type="caption" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  time: { width: 52, gap: 2 },
  timeStart: { fontSize: 16, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: 12, lineHeight: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  rail: { width: 2, borderRadius: 2, alignSelf: 'stretch' },
  headerText: { flex: 1, gap: 3 },
  detail: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailLabel: { width: 112 },
  detailValue: { flex: 1, minWidth: 140, fontWeight: '600' },
  grow: { flex: 1 },
});
