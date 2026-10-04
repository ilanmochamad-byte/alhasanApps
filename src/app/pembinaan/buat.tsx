import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView as ScrollView } from '@/components/keyboard-aware-scroll-view';
import { pembinaan, pembinaanOptions, type Student, type Catalog, type V3Row } from '@/api/pembinaan';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/app-button';
import { PrivateField as Field } from '@/components/private-field';
import { DateTimeField } from '@/components/ui/date-time-field';
import { DropdownField } from '@/components/ui/dropdown-field';
import { isLocalDateTime } from '@/lib/date-time';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/screen-state';
import { useMutationGuard } from '@/hooks/use-mutation-guard';
import { usePrivateResource } from '@/hooks/use-private-resource';
export default function Create() {
  const params = useLocalSearchParams<{ jenis: string; rekomendasi?: string; santri?: string; tahun?: string }>(); const { profile } = useAuth();
  return <CreateSession key={`${profile?.id}:${params.jenis}:${params.rekomendasi}`} params={params} />;
}
function CreateSession({ params }: { params: { jenis: string; rekomendasi?: string; santri?: string; tahun?: string } }) {
  const router = useRouter();
  const [studentDraft, setStudent] = useState<Student | null>(null); const [catalogDraft, setCatalog] = useState<Catalog | null>(null);
  const [text, setText] = useState(''); const [time, setTime] = useState(''); const [privacy, setPrivacy] = useState(''); const guard = useMutationGuard('v3-create', true);
  const fetcher = useCallback(async () => {
    const options = await pembinaanOptions();
    if (!options.dapat_mencatat) throw new ApiError('Penugasan pembimbing aktif diperlukan.', 403, 'FORBIDDEN');
    return options;
  }, []);
  const clear = () => { setStudent(null); setCatalog(null); setText(''); setTime(''); setPrivacy(''); guard.reset(); };
  const { data, error, load, active, generation } = usePrivateResource(fetcher, clear, true);
  const student = data?.santri.find(s => s.santri_id === studentDraft?.santri_id && s.tahun_ajaran_id === studentDraft?.tahun_ajaran_id) ?? null;
  const catalog = data?.katalog.find(k => k.id === catalogDraft?.id) ?? null;
  const violation = params.jenis === 'pelanggaran';
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState />;
  if (!data.dapat_mencatat) return <ErrorState message="Penugasan pembimbing aktif diperlukan." onRetry={() => void load()} />;
  const save = async () => {
    if (!student || !text.trim() || (violation && (!catalog || !isLocalDateTime(time))) || (!violation && (!privacy || (time !== '' && !isLocalDateTime(time))))) return;
    const body = violation ? { santri_id: student.santri_id, tahun_ajaran_id: student.tahun_ajaran_id, katalog_id: catalog!.id, waktu_kejadian: time, uraian: text } : { santri_id: student.santri_id, tahun_ajaran_id: student.tahun_ajaran_id, tujuan: text, kerahasiaan: privacy, ...(time ? { dibuka_pada: time } : {}), rekomendasi_ids: params.rekomendasi ? [Number(params.rekomendasi)] : [] };
    const epoch = generation.current;
    const r = await guard.run(JSON.stringify(body), key => pembinaan.mutate<{ kasus?: V3Row; pelanggaran?: V3Row }>(violation ? 'pelanggaran' : 'konseling/kasus', { ...body, idempotency_key: key }));
    const row = r?.kasus ?? r?.pelanggaran;
    if (row && active.current && epoch === generation.current) { clear(); router.replace({ pathname: '/pembinaan/detail', params: { jenis: params.jenis, id: String(row.id) } }); }
  };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
    <DropdownField label="Santri dalam cakupan aktif" searchable disabled={guard.isBusy}
      value={student ? `${student.santri_id}:${student.tahun_ajaran_id}` : ''}
      options={data.santri.map(s => ({ value: `${s.santri_id}:${s.tahun_ajaran_id}`, label: `${s.nama}${s.tahun ? ` · ${s.tahun} / ${s.semester}` : ''}` }))}
      onChange={value => setStudent(data.santri.find(s => `${s.santri_id}:${s.tahun_ajaran_id}` === value) ?? null)} />
    {violation && <DropdownField label="Jenis pelanggaran" searchable disabled={guard.isBusy}
      value={catalog ? String(catalog.id) : ''}
      options={data.katalog.map(k => ({ value: String(k.id), label: `${k.nama} · ${k.tingkat} · ${k.poin_default} poin` }))}
      onChange={value => setCatalog(data.katalog.find(k => String(k.id) === value) ?? null)} />}
    {params.rekomendasi && <ThemedText>Rekomendasi #{params.rekomendasi} akan ditautkan. Pilih santri yang sama; server memeriksa cakupan dan subjek kembali.</ThemedText>}
    <DateTimeField label={violation ? 'Waktu kejadian' : 'Waktu dibuka (opsional)'} value={time} onChange={setTime} disabled={guard.isBusy} />
    <Field label={violation ? 'Uraian kejadian' : 'Tujuan pendampingan'} value={text} onChangeText={setText} multiline maxLength={5000} editable={!guard.isBusy} autoCorrect={false} />
    {!violation && <><ThemedText>Rahasia: pemilik kasus dan admin. Internal: pembimbing dalam cakupan serta murobi terkait.</ThemedText><DropdownField label="Kerahasiaan (wajib dipilih)" value={privacy} onChange={setPrivacy} disabled={guard.isBusy} options={[{ value: 'Rahasia', label: 'Rahasia' }, { value: 'Internal', label: 'Internal' }]} /></>}
    {guard.error && <ThemedText>{guard.error}</ThemedText>}
    <AppButton label="Simpan" loading={guard.isBusy} disabled={!student || !text.trim() || (violation && (!catalog || !isLocalDateTime(time))) || (!violation && (!privacy || (time !== '' && !isLocalDateTime(time))))} onPress={() => void save()} />
  </ScrollView>;
}
