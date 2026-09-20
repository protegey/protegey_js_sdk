export class ProtegeyApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProtegeyApiError';
  }
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

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const rawMessage = (data && (data as { message?: unknown }).message) ?? response.statusText;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
      throw new ProtegeyApiError(response.status, message);
    }

    return data as T;
  }
}
