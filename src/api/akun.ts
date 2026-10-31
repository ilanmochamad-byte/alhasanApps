import type { ProfileIdentitas } from '@/api/types';
import { request } from './client';

// Penugasan lintas guru/pengurus Fase 4: identitas guru dan identitas pengurus
// akun yang sama (PK-1), hanya untuk tampilan Profil. Endpoint terpisah agar
// bentuk `/profile` dan respons login tetap seperti sebelumnya.
export const akun = {
  identitas: () => request<ProfileIdentitas>('/profile/identitas'),
};
