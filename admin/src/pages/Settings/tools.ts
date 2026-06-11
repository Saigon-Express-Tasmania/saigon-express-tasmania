interface RevalidateFrontendParams {
  frontendUrl: string;
  revalidateToken: string;
}

export async function revalidateFrontendCache({
  frontendUrl,
  revalidateToken,
}: RevalidateFrontendParams): Promise<void> {

  if (!frontendUrl) {
    throw new Error('Missing frontend URL in settings table.');
  }

  if (!revalidateToken) {
    throw new Error('Missing VITE_CACHE_REVALIDATE_SECRET.');
  }

  const response = await fetch(`${frontendUrl.replace(/\/$/, '')}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-token': revalidateToken,
    },
    body: JSON.stringify({}),
  });

  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to revalidate frontend cache.');
  }
}
