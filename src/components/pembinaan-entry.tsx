import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { pembinaan } from '@/api/pembinaan';
import { AppButton } from './app-button';
import { usePrivateResource } from '@/hooks/use-private-resource';
export function PembinaanEntry() {
  const router = useRouter(); const fetcher = useCallback(() => pembinaan.capabilities(), []);
  const { data, error, load } = usePrivateResource(fetcher);
  if (error) return <AppButton label="Muat ulang akses pembinaan" variant="secondary" onPress={() => void load()} />;
  if (!data || Object.keys(data.capabilities).length === 0) return null;
  return <AppButton label="Pembinaan & informasi keluarga" onPress={() => router.push('/pembinaan')} />;
}
