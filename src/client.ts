/**
 * Thrown for every non-2xx response. `message` is the backend's message (validation messages are
 * joined with ", "). `errorCode` is set for the account-gating 403s the backend returns with a
 * machine-readable code: `PARTNER_SUSPENDED` (write calls while your account is suspended) and
 * `PARTNER_CONTRACT_REQUIRED` (write calls before a billing contract is configured). `body` is the
 * parsed JSON body as returned, or null when the body wasn't JSON.
 */
export class ProtegeyApiError extends Error {
  readonly errorCode: string | null;
  readonly body: unknown;

  constructor(
    public status: number,
    message: string,
    details: { errorCode?: string | null; body?: unknown } = {},
  ) {
    super(message);
    this.name = 'ProtegeyApiError';
    this.errorCode = details.errorCode ?? null;
    this.body = details.body ?? null;
  }
}

/** Query-string values the SDK accepts — `undefined`/`null` entries are dropped. */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Appends `params` to `path` as a query string, skipping undefined/null values. */
export function withQuery(path: string, params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Thin fetch wrapper shared by every SDK module — one place that knows about auth, base URL and
 * error shape. `baseUrl` is deliberately required, with NO built-in default: this SDK ships
 * inside partner apps (especially mobile), which can't be force-updated the moment Protegey's own
 * production domain changes. Baking in a guess now would risk every already-shipped app silently
 * talking to a stale/wrong host later — requiring it here means the value only ever needs
 * updating in the caller's own config, never in this package.
 */
export class ProtegeyHttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    if (!apiKey) {
      throw new Error('Protegey: apiKey is required');
    }
    if (!baseUrl) {
      throw new Error('Protegey: baseUrl is required — point it at your Protegey API environment (e.g. https://api.protegey.com)');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>('POST', path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>('PATCH', path, body);
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
      },
    });
    return this.parseResponse<T>(response);
  }

  private async send<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const record = data && typeof data === 'object' ? (data as { message?: unknown; errorCode?: unknown }) : null;
      const rawMessage = record?.message ?? response.statusText;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
      const errorCode = typeof record?.errorCode === 'string' ? record.errorCode : null;
      throw new ProtegeyApiError(response.status, message, { errorCode, body: data });
    }

    return data as T;
  }
}
