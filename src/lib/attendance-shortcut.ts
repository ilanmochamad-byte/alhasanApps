/** Tujuan ubin Absensi hanya sesi hari ini yang belum selesai. */
export function attendanceShortcut<T extends { meeting: { status: string } | null }>(schedules: readonly T[]): T | null {
  return schedules.find((schedule) => schedule.meeting?.status !== 'Selesai') ?? null;
}
