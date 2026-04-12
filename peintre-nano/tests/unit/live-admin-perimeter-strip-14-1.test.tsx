// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LiveAdminPerimeterStrip } from '../../src/app/shell/LiveAdminPerimeterStrip';
import { CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY } from '../../src/runtime/context-presentation-keys';
import type { ContextEnvelopeStub } from '../../src/types/context-envelope';

afterEach(() => {
  cleanup();
});

beforeAll(() => {
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

function baseEnvelope(over: Partial<ContextEnvelopeStub> = {}): ContextEnvelopeStub {
  return {
    schemaVersion: 'recyclique-context-envelope-v2',
    siteId: '00000000-0000-0000-0000-000000000001',
    activeRegisterId: null,
    permissions: { permissionKeys: ['transverse.admin.view'] },
    issuedAt: Date.now(),
    runtimeStatus: 'ok',
    ...over,
  };
}

function renderStrip(envelope: ContextEnvelopeStub) {
  return render(
    <MantineProvider>
      <LiveAdminPerimeterStrip envelope={envelope} />
    </MantineProvider>,
  );
}

describe('LiveAdminPerimeterStrip (Epic 14.1)', () => {
  it('affiche le libellé site issu du ContextEnvelope', () => {
    const envelope = baseEnvelope({
      presentationLabels: {
        [CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY]: '  La Clique  ',
      },
    });
    renderStrip(envelope);
    expect(screen.getByTestId('live-admin-perimeter-strip').getAttribute('data-admin-perimeter')).toBe('ok');
    expect(screen.getByText('La Clique')).toBeTruthy();
  });

  it('affiche un gap explicite sans UUID si le libellé est absent', () => {
    const envelope = baseEnvelope({ presentationLabels: { 'nav.transverse.admin': 'Administration' } });
    renderStrip(envelope);
    expect(screen.getByTestId('live-admin-perimeter-strip').getAttribute('data-admin-perimeter')).toBe('gap');
    expect(screen.getByText(/Périmètre site/i)).toBeTruthy();
    expect(screen.queryByText(/00000000/)).toBeNull();
  });
});
