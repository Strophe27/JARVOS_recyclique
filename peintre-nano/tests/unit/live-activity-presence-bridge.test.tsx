// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LiveActivityPresenceBridge } from '../../src/app/auth/LiveActivityPresenceBridge';
import { createMockAuthAdapter } from '../../src/app/auth/mock-auth-adapter';
import {
  createDefaultDemoEnvelope,
  DEMO_AUTH_STUB_USER_ID,
} from '../../src/app/auth/default-demo-auth-adapter';
import { RootProviders } from '../../src/app/providers/RootProviders';

describe('LiveActivityPresenceBridge', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeAll(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      writable: true,
      value: false,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('déclenche un ping au montage puis sur intervalle quand un jeton est présent', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

    const adapter = createMockAuthAdapter({
      session: { authenticated: true, userId: DEMO_AUTH_STUB_USER_ID },
      envelope: createDefaultDemoEnvelope(),
      accessToken: 'tok',
    });

    render(
      <RootProviders authAdapter={adapter}>
        <LiveActivityPresenceBridge />
      </RootProviders>,
    );

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
