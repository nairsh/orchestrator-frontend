export interface ApiConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  hasAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly meta?: {
      type?: string;
      code?: string;
      param?: string;
      retry_after?: number;
    }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function normalizeApiErrorMessage(message: string): string {
  const lowered = message.toLowerCase();
  if (
    lowered.includes('invalid api key') ||
    lowered.includes('invalid or missing api key') ||
    lowered.includes('invalid or expired clerk token') ||
    lowered.includes('invalid auth token') ||
    lowered.includes('missing authentication token')
  ) {
    return 'Sign in with Clerk to continue.';
  }
  return message;
}

export async function resolveAuthToken(config: Pick<ApiConfig, 'getAuthToken'>): Promise<string | null> {
  const clerkToken = config.getAuthToken ? await config.getAuthToken() : null;
  if (clerkToken && clerkToken.trim().length > 0) {
    return clerkToken.trim();
  }
  return null;
}

export async function request<T>(config: ApiConfig, path: string, init?: RequestInit): Promise<T> {
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;

  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  // Only set Content-Type for JSON bodies.
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = await resolveAuthToken(config);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let meta: ApiError['meta'] | undefined;
    try {
      const body = (await response.json()) as {
        error?: { type?: string; message?: string; code?: string; param?: string; retry_after?: number };
      };
      message = body.error?.message ?? message;
      meta = body.error;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(response.status, normalizeApiErrorMessage(message), meta);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return (await response.text()) as unknown as T;
}
