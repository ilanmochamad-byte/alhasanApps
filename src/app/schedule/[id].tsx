import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, actionableError, api, createIdempotencyKey } from '@/api/client';
import type { ScheduleOccurrence } from '@/api/types';
import { AppButton } from '@/components/app-button';
import { KeyboardAwareScrollView } from '@/components/keyboard-aware-scroll-view';
import { formatDate } from '@/components/schedule-card';
import { StackScreen } from '@/components/screen-shell';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { ActionBar, AksiAkhirIsi, bilahTetap } from '@/components/ui/action-bar';
import { Field } from '@/components/ui/app-field';
import { Badge, ChipRow } from '@/components/ui/chip';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { StatusPill } from '@/components/ui/status-pill';
import { Overline, Panel } from '@/components/ui/surface';
import { Layout, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daftarKelas } from '@/lib/kelas-jadwal';

const JUDUL = 'Rincian tugas';

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
  // Ketukan ganda sebelum status `opening` sempat dirender tidak mengirim
  // permintaan kedua; percobaan ulang setelah gagal memakai kunci yang sama.
  const inFlight = useRef(false);

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
    if (inFlight.current) return;
    inFlight.current = true;
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
      // Pertemuan sudah dibuka di perangkat/website lain: perbarui status tanpa
      // menghapus pesan agar tombol berganti menjadi "Isi absensi".
      if (caught instanceof ApiError && caught.status === 409) {
        try {
          setSchedule(await api.schedule(scheduleId, date));
        } catch {
          // Pesan 409 tetap tampil; muat ulang manual tetap tersedia.
        }
      }
    } finally {
      inFlight.current = false;
      setOpening(false);
    }
  }

  if (loading && !schedule) {
    return (
      <StackScreen title={JUDUL}>
        <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }}>
          <LoadingState label="Memuat detail tugas…" />
        </ScrollView>
      </StackScreen>
    );
  }
  if (error && !schedule) {
    return (
      <StackScreen title={JUDUL}>
        <ScrollView contentInsetAdjustmentBehavior="never" style={{ backgroundColor: theme.background }}>
          <ErrorState message={error} onRetry={() => void load()} />
        </ScrollView>
      </StackScreen>
    );
  }
  if (!schedule) return <StackScreen title={JUDUL}>{null}</StackScreen>;

  const sudahAda = Boolean(schedule.meeting);
  const kelas = daftarKelas(schedule);
  const gabungan = kelas.length > 1;
  const selesai = schedule.meeting?.status === 'Selesai';

  // TL-22: tindakan di bilah tetap, atau di akhir isi pada teks sangat besar.
  const aksiBawah = (<>
        {sudahAda ? (
          <AppButton
            label={selesai ? 'Buka absensi tersimpan' : 'Isi absensi'}
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
      </>);
  return (
    <StackScreen title={JUDUL}>
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="never"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}>
        {/* Kartu kepala hijau pucat: kitab, jam, status pertemuan. */}
        <View style={[styles.kepala, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
          <ThemedText selectable type="h2">
            {schedule.subject}
          </ThemedText>
          <ThemedText selectable type="caption" themeColor="textSecondary">
            {formatDate(schedule.occurrence_date)}
          </ThemedText>
          <ThemedText selectable type="numeralCard" style={styles.jam}>
            {schedule.start_time} – {schedule.end_time}
          </ThemedText>
          <StatusPill
            label={schedule.meeting ? schedule.meeting.status : 'Belum dibuka'}
            tone={selesai ? 'success' : 'warning'}
            icon={selesai ? 'check' : 'clock'}
          />
        </View>

        <Panel style={styles.rincian}>
          <InfoRow icon="person" label="Guru" value={schedule.teacher.name} />
          {gabungan ? (
            <InfoRow icon="users" label="Kelas gabungan" value={kelas.map((k) => (k.level ? `${k.name} · ${k.level}` : k.name)).join(', ')}>
              <ChipRow>
                {kelas.map((k) => (
                  <Badge key={k.id} label={k.level ? `${k.name} · ${k.level}` : k.name} tone="primary" />
                ))}
              </ChipRow>
            </InfoRow>
          ) : (
            <InfoRow icon="users" label="Kelas" value={`${schedule.class.name} · ${schedule.class.level}`} />
          )}
          <InfoRow icon="book" label="Kitab" value={schedule.book} />
          <InfoRow icon="pin" label="Tempat" value={schedule.place} />
          <InfoRow
            icon="calendar"
            label="Tahun ajaran"
            value={`${schedule.academic_year.year} · ${schedule.academic_year.semester}`}
            last
          />
        </Panel>

        {sudahAda ? (
          <Notice
            tone={selesai ? 'success' : 'info'}
            title="Pertemuan sudah tersedia"
            text={`Status pertemuan: ${schedule.meeting?.status}.`}
          />
        ) : (
          <Panel>
            <Overline>Buka pertemuan</Overline>
            <ThemedText selectable type="caption" themeColor="textSecondary">
              {gabungan
                ? `Satu pertemuan untuk ${kelas.length} kelas. Daftar santri seluruh kelas akan dibekukan dari keanggotaan kelas saat pertemuan dibuka.`
                : 'Daftar santri akan dibekukan dari keanggotaan kelas saat pertemuan dibuka.'}
            </ThemedText>
            <Field
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Catatan pertemuan (opsional)"
            />
          </Panel>
        )}

        <Notice tone="danger" text={error} />
        {!bilahTetap() ? <AksiAkhirIsi>{aksiBawah}</AksiAkhirIsi> : null}
      </KeyboardAwareScrollView>

      {bilahTetap() ? <ActionBar>{aksiBawah}</ActionBar> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.screen,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  kepala: { borderWidth: 1, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: 16, gap: 6 },
  jam: { fontVariant: ['tabular-nums'], paddingVertical: 2 },
  rincian: { gap: 0, paddingVertical: 4 },
  grow: { flex: 1 },
});
