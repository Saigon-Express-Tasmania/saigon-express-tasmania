import supabase from '@/lib/supabase/client';
import type { AdminPartnerInput, PartnerBusinessType } from '@/types/UserProfile';

type PartnerApiResponse = {
  userId?: string;
  error?: string;
};

async function invokePartnerApi(
  method: 'POST' | 'DELETE',
  body: Record<string, unknown>,
): Promise<PartnerApiResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in as an administrator.');
  }

  const { data, error } = await supabase.functions.invoke('admin-partner', {
    method,
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Partner request failed.');
  }

  const response = data as PartnerApiResponse | null;
  if (response?.error) {
    throw new Error(response.error);
  }

  return response ?? {};
}

export async function createPartnerAccount(
  input: AdminPartnerInput & { email: string; password: string },
): Promise<string> {
  const result = await invokePartnerApi('POST', input);
  if (!result.userId) {
    throw new Error('Partner account was created but no user id was returned.');
  }
  return result.userId;
}

export async function deletePartnerAccount(userId: string): Promise<void> {
  await invokePartnerApi('DELETE', { userId });
}

export function isPartnerBusinessType(value: string): value is PartnerBusinessType {
  return value === 'wholesale' || value === 'warehouse';
}
