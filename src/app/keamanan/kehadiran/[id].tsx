import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { keamanan } from '@/api/keamanan';
import { Baris, tanggalPanjang } from '@/components/kesehatan-shared';
import { CatatanHanyaBaca, Halaman, Lencana } from '@/components/keamanan-shared';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Badge, ChipRow } from '@/components/ui/chip';
import { Panel } from '@/components/ui/surface';
import { usePrivateResource } from '@/hooks/use-private-resource';
import { nadaKehadiran } from '@/keamanan/format';
import { daftarKelas, labelKelas, namaKelasAsal } from '@/lib/kelas-jadwal';

/** Rincian pertemuan, peserta santri aktif kini. Setiap pembukaan diaudit server tanpa isi. */
export default function KeamananPertemuanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const fetcher = useCallback(() => keamanan.pertemuan(nomor), [nomor]);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState label="Memuat rincian pertemuan…" />;
  const t = data.task;
  const kelasTask = { class: { id: t.class.id ?? 0, name: t.class.name }, classes: t.classes };
  const kelas = daftarKelas(kelasTask);
  const gabungan = kelas.length > 1;
  return (
    <Halaman>
      <ThemedText type="h3">{t.subject} · {labelKelas(kelasTask)}</ThemedText>
      <ChipRow><Badge label={data.status} /></ChipRow>
      <Panel>
        <View style={{ gap: 10 }}>
          <Baris label="Tanggal" value={tanggalPanjang(data.date)} />
          <Baris label="Jadwal" value={`${t.day}, ${t.start_time}–${t.end_time} · ${t.place}`} />
          <Baris label="Guru" value={`${t.teacher.name} · ${data.teacher_attendance === null ? 'kehadiran belum dicatat' : data.teacher_attendance.status}`} />
          <Baris label="Kitab" value={t.book} />
          {gabungan ? <Baris label="Kelas gabungan" value={`${kelas.length} kelas dalam satu pertemuan`} /> : null}
        </View>
      </Panel>
      <ThemedText type="h3">
        Peserta{data.student_summary ? ` (${data.student_summary.recorded_count}/${data.student_summary.participant_count} tercatat)` : ''}
      </ThemedText>
      <Panel>
        <View style={{ gap: 12 }}>
          {data.students.length === 0 ? <ThemedText themeColor="textSecondary">Belum ada peserta santri aktif pada pertemuan ini.</ThemedText> : null}
          {data.students.map(s => (
            <View key={s.student_id} style={{ gap: 4 }}>
              <ThemedText type="bodyBold">{s.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">NIS {s.nis}{gabungan && namaKelasAsal(s, kelas) ? ` · Kelas ${namaKelasAsal(s, kelas)}` : ''}{s.recorded_by ? ` · dicatat ${s.recorded_by}` : ''}</ThemedText>
              <ChipRow>
                <Lencana label={s.status ?? 'Belum dicatat'} nada={nadaKehadiran(s.status)} />
                {s.izin_id !== null ? <Badge label={`Sedang izin #${s.izin_id}`} /> : null}
              </ChipRow>
              {s.notes ? <ThemedText>{s.notes}</ThemedText> : null}
            </View>
          ))}
        </View>
      </Panel>
      <CatatanHanyaBaca text="Hanya baca. Pembukaan rincian ini tercatat di jejak audit tanpa isi. Koreksi kehadiran dilakukan guru pengampu; cetak/PDF di website." />
    </Halaman>
  );
}
