import { describe, expect, it } from 'vitest';
import {
  applyRecycliqueContextBindingHeaders,
  HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID,
  HEADER_RECYCLIQUE_CONTEXT_SITE_ID,
} from '../../src/api/context-binding-headers';

describe('context-binding-headers (Story 25.8)', () => {
  it('n’ajoute aucun en-tête si binding absent', () => {
    const h: Record<string, string> = { Authorization: 'Bearer x' };
    applyRecycliqueContextBindingHeaders(h, undefined);
    expect(h).toEqual({ Authorization: 'Bearer x' });
  });

  it('n’ajoute aucun en-tête si site et session vides', () => {
    const h: Record<string, string> = {};
    applyRecycliqueContextBindingHeaders(h, { siteId: '  ', cashSessionId: null });
    expect(Object.keys(h)).toHaveLength(0);
  });

  it('pose les en-têtes OpenAPI lorsque les valeurs sont non vides', () => {
    const h: Record<string, string> = {};
    applyRecycliqueContextBindingHeaders(h, {
      siteId: '11111111-1111-4111-8111-111111111111',
      cashSessionId: '22222222-2222-4222-8222-222222222222',
    });
    expect(h[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBe('11111111-1111-4111-8111-111111111111');
    expect(h[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]).toBe('22222222-2222-4222-8222-222222222222');
  });
});
