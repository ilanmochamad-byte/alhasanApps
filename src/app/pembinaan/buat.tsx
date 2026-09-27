import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView as ScrollView } from '@/components/keyboard-aware-scroll-view';
import { pembinaan, type Student, type Catalog, type V3Row } from '@/api/pembinaan';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField as Field } from '@/components/private-field';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
export default function Create() {
  const params = useLocalSearchParams<{ jenis: string; rekomendasi?: string; santri?: string; tahun?: string }>(); const { profile } = useAuth();
  return <CreateSession key={`${profile?.id}:${params.jenis}:${params.rekomendasi}`} params={params} />;
}
function CreateSession({ params }: { params: { jenis: string; rekomendasi?: string; santri?: string; tahun?: string } }) {
  const router = useRouter(); const [page, setPage] = useState(1);
  const [student, setStudent] = useState<Student | null>(null); const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [text, setText] = useState(''); const [time, setTime] = useState(''); const [privacy, setPrivacy] = useState('Rahasia'); const guard = useMutationGuard('v3-create');
  const fetcher = useCallback(() => pembinaan.options(page), [page]);
  const clear = () => { setStudent(null); setCatalog(null); setText(''); setTime(''); guard.reset(); };
  const { data, error, load, active, generation } = usePrivateResource(fetcher, clear);
  const violation = params.jenis === 'pelanggaran';
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  if (!data.dapat_mencatat) return <ErrorState message="Penugasan pembimbing aktif diperlukan." onRetry={() => void load()} />;
  const save = async () => {
    if (!student || (violation && !catalog)) return;
    const body = violation ? { santri_id: student.santri_id, tahun_ajaran_id: student.tahun_ajaran_id, katalog_id: catalog!.id, waktu_kejadian: time, uraian: text } : { santri_id: student.santri_id, tahun_ajaran_id: student.tahun_ajaran_id, tujuan: text, kerahasiaan: privacy, ...(time ? { dibuka_pada: time } : {}), rekomendasi_ids: params.rekomendasi ? [Number(params.rekomendasi)] : [] };
    const epoch = generation.current;
    const r = await guard.run(JSON.stringify(body), key => pembinaan.mutate<{ kasus?: V3Row; pelanggaran?: V3Row }>(violation ? 'pelanggaran' : 'konseling/kasus', { ...body, idempotency_key: key }));
    const row = r?.kasus ?? r?.pelanggaran;
    if (row && active.current && epoch === generation.current) { clear(); router.replace({ pathname: '/pembinaan/detail', params: { jenis: params.jenis, id: String(row.id) } }); }
  };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <ThemedText>Pilih santri dalam cakupan aktif</ThemedText>
    {student && <ThemedText>Terpilih: {student.nama}</ThemedText>}
    {data.santri.map(s => <AppButton key={`${s.santri_id}:${s.tahun_ajaran_id}`} variant="secondary" label={s.nama} disabled={guard.isBusy} onPress={() => setStudent(s)} />)}
    {violation && <><ThemedText>Jenis pelanggaran {catalog ? `· ${catalog.nama}` : ''}</ThemedText>{data.katalog.map(k => <AppButton key={k.id} variant="secondary" label={`${k.nama} · ${k.tingkat} · ${k.poin_default} poin`} disabled={guard.isBusy} onPress={() => setCatalog(k)} />)}</>}
    <AppButton label="Pilihan sebelumnya" disabled={page === 1 || guard.isBusy} onPress={() => setPage(page - 1)} />
    <AppButton label="Pilihan berikutnya" disabled={guard.isBusy || (data.santri.length < 25 && (!violation || data.katalog.length < 25))} onPress={() => setPage(page + 1)} />
    {params.rekomendasi && <ThemedText>Rekomendasi #{params.rekomendasi} akan ditautkan. Pilih santri yang sama; server memeriksa cakupan dan subjek kembali.</ThemedText>}
    <Field label={violation ? 'Waktu kejadian (YYYY-MM-DD HH:mm)' : 'Waktu dibuka (opsional, YYYY-MM-DD HH:mm)'} value={time} onChangeText={setTime} editable={!guard.isBusy} autoCorrect={false} />
    <Field label={violation ? 'Uraian kejadian' : 'Tujuan pendampingan'} value={text} onChangeText={setText} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
    {!violation && <><ThemedText>Rahasia: pemilik kasus dan admin. Internal: pembimbing dalam cakupan serta murobi terkait.</ThemedText><AppButton label={`Kerahasiaan: ${privacy} · ketuk untuk mengganti`} disabled={guard.isBusy} variant="secondary" onPress={() => setPrivacy(privacy === 'Rahasia' ? 'Internal' : 'Rahasia')} /></>}
    {guard.error && <ThemedText>{guard.error}</ThemedText>}
    <AppButton label="Simpan" loading={guard.isBusy} disabled={!student || !text.trim() || (violation && (!catalog || !time))} onPress={() => void save()} />
  </ScrollView>;
}
