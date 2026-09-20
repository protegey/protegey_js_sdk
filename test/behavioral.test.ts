import { describe, expect, it, vi } from 'vitest';
import { BehavioralModule } from '../src/behavioral.js';
import type { ReportBehavioralEventInput } from '../src/types.js';

function buildHttp(response: unknown = { status: 'learning', deviationScore: 0, confidenceTier: null, stepUpRecommended: false, escalatedAlertId: null }) {
  return { post: vi.fn(async () => response) };
}

const baseInput: ReportBehavioralEventInput = {
  externalCustomerId: 'cust-1',
  sessionId: 'sess-1',
  keystroke: { avgInterKeyLatencyMs: 145, typingSpeedCharsPerSec: 4.2, errorRate: 0.02 },
  touch: { avgSwipeVelocity: 22, scrollBehaviorScore: 0.8 },
  navigation: { screenSequence: ['login', 'dashboard', 'transfer', 'confirm'] },
  session: { loginHourBucket: 14, loginDayOfWeek: 2, sessionDurationMs: 45000 },
};

describe('BehavioralModule.report', () => {
  it('posts a faithful mapping of the input to /partner-api/behavioral-events', async () => {
    const http = buildHttp();
    const behavioral = new BehavioralModule(http as never);

    await behavioral.report(baseInput);

    expect(http.post).toHaveBeenCalledWith('/partner-api/behavioral-events', baseInput);
  });

  it('returns a "learning" result when no score is available yet', async () => {
    const http = buildHttp();
    const behavioral = new BehavioralModule(http as never);

    const result = await behavioral.report(baseInput);

    expect(result.status).toBe('learning');
    expect(result.confidenceTier).toBeNull();
  });

  it('returns a "scored" result with stepUpRecommended once a baseline exists', async () => {
    const http = buildHttp({ status: 'scored', deviationScore: 35, confidenceTier: 'medium', stepUpRecommended: true, escalatedAlertId: null });
    const behavioral = new BehavioralModule(http as never);

    const result = await behavioral.report(baseInput);

    expect(result.status).toBe('scored');
    expect(result.confidenceTier).toBe('medium');
    expect(result.stepUpRecommended).toBe(true);
  });
});
