import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/fingerprint.js', () => ({
  computeFingerprint: vi.fn(async () => ({ visitorId: 'computed-visitor-1', attributes: { platform: 'Web' } })),
}));

const { DeviceModule } = await import('../src/device.js');

function buildHttp(response: unknown = { recorded: true, action: 'allow', riskScore: 0 }) {
  return { post: vi.fn(async () => response) };
}

describe('DeviceModule.identify', () => {
  it('computes a fingerprint and reports it when no visitorId override is given', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    const result = await device.identify({ externalCustomerId: 'cust-1' });

    expect(http.post).toHaveBeenCalledWith(
      '/partner-api/device-events',
      expect.objectContaining({ externalCustomerId: 'cust-1', visitorId: 'computed-visitor-1' }),
    );
    expect(result.visitorId).toBe('computed-visitor-1');
  });

  it('uses the provided visitorId override instead of computing one (Node.js/React Native path)', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    await device.identify({ visitorId: 'my-own-stable-id', externalCustomerId: 'cust-1' });

    expect(http.post).toHaveBeenCalledWith('/partner-api/device-events', expect.objectContaining({ visitorId: 'my-own-stable-id' }));
  });

  it('merges caller-supplied deviceAttributes on top of the computed ones', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    await device.identify({ deviceAttributes: { isRooted: true } });

    const [, body] = http.post.mock.calls[0] as [string, { deviceAttributes: Record<string, unknown> }];
    expect(body.deviceAttributes).toEqual({ platform: 'Web', isRooted: true });
  });

  it('passes phoneNumber through untouched', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    await device.identify({ phoneNumber: '+22890000001' });

    expect(http.post).toHaveBeenCalledWith('/partner-api/device-events', expect.objectContaining({ phoneNumber: '+22890000001' }));
  });

  it('generates a random eventId when none is given', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    await device.identify({});

    const [, body] = http.post.mock.calls[0] as [string, { eventId: string }];
    expect(body.eventId).toBeTruthy();
  });

  it('uses the caller-supplied eventId when given', async () => {
    const http = buildHttp();
    const device = new DeviceModule(http as never);

    await device.identify({ eventId: 'my-idempotency-key' });

    expect(http.post).toHaveBeenCalledWith('/partner-api/device-events', expect.objectContaining({ eventId: 'my-idempotency-key' }));
  });

  it('returns the backend result alongside the resolved visitorId', async () => {
    const http = buildHttp({ recorded: true, action: 'soft_challenge', riskScore: 15 });
    const device = new DeviceModule(http as never);

    const result = await device.identify({ visitorId: 'v1' });

    expect(result).toEqual({ recorded: true, action: 'soft_challenge', riskScore: 15, visitorId: 'v1' });
  });
});
