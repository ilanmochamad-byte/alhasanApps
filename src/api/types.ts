export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export type Profile = {
  id: number;
  name: string;
  username: string;
  guru: { id: number; nip: string | null; name: string } | null;
  roles: string[];
};

export type MeetingSummary = {
  id: number;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  opened_at: string | null;
  completed_at: string | null;
};

export type ScheduleOccurrence = {
  id: number;
  occurrence_date: string;
  day: string;
  start_time: string;
  end_time: string;
  subject: string;
  book: string;
  place: string;
  class: { id: number; name: string; level: string };
  teacher: { id: number; nip: string | null; name: string };
  academic_year: { id: number; year: string; semester: string };
  meeting: MeetingSummary | null;
};

export type TodayResponse = {
  date: string;
  schedules: ScheduleOccurrence[];
  next_schedule: ScheduleOccurrence | null;
};

export type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type ScheduleListResponse = {
  items: ScheduleOccurrence[];
  pagination: Pagination;
  filters: { date_from: string; date_to: string };
};

export type StudentMeetingRow = {
  student_id: number;
  nis: string;
  name: string;
  attendance: {
    id: number;
    status: AttendanceStatus;
    notes: string | null;
    recorded_at: string;
    updated_at: string;
  } | null;
};

export type MeetingDetail = {
  id: number;
  schedule_id: number;
  date: string;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  notes: string | null;
  opened_at: string | null;
  completed_at: string | null;
  task: {
    day: string;
    start_time: string;
    end_time: string;
    subject: string;
    book: string;
    place: string;
    class: { id: number; name: string; level: string };
    teacher: { id: number; nip: string | null; name: string };
    academic_year: { id: number; year: string; semester: string };
  };
  teacher_attendance: {
    id: number;
    teacher_id: number;
    status: AttendanceStatus;
    notes: string | null;
    recorded_at: string;
    updated_at: string;
  } | null;
  students: StudentMeetingRow[];
};

export type LoginResponse = {
  token: string;
  token_type: 'Bearer';
  expires_at: string;
  profile: Profile;
};

export type AttendancePayload = {
  idempotency_key: string;
  teacher: { status: AttendanceStatus; notes: string };
  students: { student_id: number; status: AttendanceStatus; notes: string }[];
  correction_reason?: string | null;
};

export type ReportFilters = {
  date_from: string;
  date_to: string;
  academic_year_id?: number;
  teacher_id?: number;
  class_id?: number;
  schedule_id?: number;
  status?: AttendanceStatus;
};

export type ReportSummary = {
  meeting_count: number;
  detail_count: number;
  teacher_attendance_count: number;
  student_attendance_count: number;
  statuses: Record<AttendanceStatus, number>;
};

export type ReportRow = {
  attendance_id: number;
  meeting_id: number;
  schedule_id: number;
  meeting_date: string;
  meeting_status: 'Draf' | 'Dibuka' | 'Selesai';
  academic_year_id: number;
  academic_year: string;
  teacher_id: number;
  teacher_name: string;
  class_id: number;
  class_name: string;
  subject: string;
  book: string;
  place: string;
  subject_type: 'Guru' | 'Santri';
  subject_id: number;
  identity_number: string;
  subject_name: string;
  attendance_status: AttendanceStatus;
  notes: string | null;
  recorder_name: string | null;
  recorded_at: string;
  updated_at: string;
};

export type ReportScheduleSummary = {
  schedule_id: number;
  teacher: { id: number; name: string };
  class: { id: number; name: string };
  subject: string;
  book: string;
  meeting_count: number;
  detail_count: number;
  statuses: Record<AttendanceStatus, number>;
};

export type ReportResponse = {
  summary: ReportSummary;
  schedules: ReportScheduleSummary[];
  items: ReportRow[];
  pagination: Pagination;
  filters: ReportFilters;
  active_filters: Record<string, string>;
};

export type ReportOptions = {
  academic_years: { id: number; year: string; semester: string }[];
  teachers: { id: number; nip: string | null; name: string }[];
  classes: { id: number; name: string; level: string }[];
  schedules: {
    id: number;
    teacher_id: number;
    class_id: number;
    academic_year_id: number;
    label: string;
  }[];
  statuses: AttendanceStatus[];
};

export type ReportMeetingDetail = {
  id: number;
  schedule_id: number;
  date: string;
  status: 'Draf' | 'Dibuka' | 'Selesai';
  notes: string | null;
  opened_at: string | null;
  completed_at: string | null;
  updated_at: string;
  created_by: string | null;
  task: MeetingDetail['task'];
  teacher_attendance: null | {
    teacher_id: number;
    nip: string | null;
    name: string;
    status: AttendanceStatus;
    notes: string | null;
    recorded_by: string | null;
    recorded_at: string;
    updated_at: string;
  };
  students: {
    student_id: number;
    nis: string;
    name: string;
    status: AttendanceStatus | null;
    notes: string | null;
    recorded_by: string | null;
    recorded_at: string | null;
    updated_at: string | null;
  }[];
  student_summary: {
    participant_count: number;
    recorded_count: number;
    statuses: Record<AttendanceStatus, number>;
  };
};
