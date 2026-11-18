import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtegeyApiError, ProtegeyHttpClient, withQuery } from '../src/client.js';

describe('ProtegeyHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when constructed without an apiKey', () => {
    expect(() => new ProtegeyHttpClient('', 'https://api.example.com')).toThrow(/apiKey/);
  });

  it('throws when constructed without a baseUrl — no silent default, ever', () => {
    expect(() => new ProtegeyHttpClient('key', '')).toThrow(/baseUrl/);
  });

  it('sends the api key as the x-api-key header, never Authorization', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ProtegeyHttpClient('secret-key', 'https://api.example.com');
    await client.post('/foo', { a: 1 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret-key');
    expect(headers.Authorization).toBeUndefined();
  });

  it('sends a GET request with the api key header and no body', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'APPROVED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ProtegeyHttpClient('secret-key', 'https://api.example.com');
    const result = await client.get('/foo/bar');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/foo/bar');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('secret-key');
    expect(result).toEqual({ status: 'APPROVED' });
  });

  it('strips a trailing slash from a custom baseUrl', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ProtegeyHttpClient('key', 'https://api.example.com/');
    await client.post('/foo', {});

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/foo');
  });

  it('throws ProtegeyApiError with the backend message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'Insufficient permissions' }), { status: 403 })),
    );

    const client = new ProtegeyHttpClient('key', 'https://api.example.com');
    await expect(client.post('/foo', {})).rejects.toMatchObject({ status: 403, message: 'Insufficient permissions' });
  });

  it('joins an array-shaped validation error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: ['amount must be positive', 'currency required'] }), { status: 400 })),
    );

    const client = new ProtegeyHttpClient('key', 'https://api.example.com');
    await expect(client.post('/foo', {})).rejects.toThrow('amount must be positive, currency required');
  });

  it('falls back to statusText when the response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not json', { status: 500, statusText: 'Internal Server Error' })),
    );

    const client = new ProtegeyHttpClient('key', 'https://api.example.com');
    await expect(client.post('/foo', {})).rejects.toThrow('Internal Server Error');
  });
});

describe('ProtegeyHttpClient.patch / withQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a PATCH with a JSON body and the api key header', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await new ProtegeyHttpClient('key', 'https://api.example.com').patch('/foo', { a: 1 });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('key');
  });

  it('withQuery skips undefined/null values and encodes the rest', () => {
    expect(withQuery('/x', { a: 'b c', n: 2, u: undefined, z: null })).toBe('/x?a=b+c&n=2');
    expect(withQuery('/x', {})).toBe('/x');
  });

  it('exposes errorCode and the raw body on ProtegeyApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ errorCode: 'PARTNER_CONTRACT_REQUIRED', message: 'No contract' }), { status: 403 })),
    );
    const error = await new ProtegeyHttpClient('key', 'https://api.example.com').post('/foo', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProtegeyApiError);
    expect(error).toMatchObject({ status: 403, errorCode: 'PARTNER_CONTRACT_REQUIRED', body: { message: 'No contract' } });
  });
});
