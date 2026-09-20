const DEFAULT_BASE_URL = 'https://api.protegey.com';

export class ProtegeyApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProtegeyApiError';
  }
}

/** Thin fetch wrapper shared by every SDK module — one place that knows about auth, base URL and error shape. */
export class ProtegeyHttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!apiKey) {
      throw new Error('Protegey: apiKey is required');
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
