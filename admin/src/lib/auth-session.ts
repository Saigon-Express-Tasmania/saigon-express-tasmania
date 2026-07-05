const SESSION_EXPIRED_KEY = 'admin_session_expired';

let authFailureHandler: (() => void) | null = null;

export const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.';

export function registerAuthFailureHandler(handler: () => void): () => void {
  authFailureHandler = handler;
  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
}

export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

export function consumeSessionExpiredNotice(): boolean {
  try {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (!value) return false;
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return true;
  } catch {
    return false;
  }
}

export function notifyAuthFailure(): void {
  markSessionExpired();
  authFailureHandler?.();
}

export function isAuthFailureError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const authError = error as { message?: string; code?: string; status?: number };
  const message = (authError.message ?? '').toLowerCase();
  const code = (authError.code ?? '').toLowerCase();

  return (
    authError.status === 401 ||
    code === 'pgrst301' ||
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('not authenticated') ||
    message.includes('session expired') ||
    message.includes('invalid claim')
  );
}

export function isUnauthorizedApiResponse(
  response: Response,
  requestUrl: string,
): boolean {
  if (response.status !== 401) return false;

  // Let Supabase auth client handle token refresh / sign-out flows.
  if (requestUrl.includes('/auth/v1/')) return false;

  return true;
}
