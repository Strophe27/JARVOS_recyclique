import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyRecycliqueContextBindingHeaders,
  clearRecycliqueContextBindingHeaders,
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

  it('supprime les en-têtes résiduels si le même objet headers est réutilisé (session puis site seul)', () => {
    const h: Record<string, string> = {};
    applyRecycliqueContextBindingHeaders(h, {
      siteId: '11111111-1111-4111-8111-111111111111',
      cashSessionId: '22222222-2222-4222-8222-222222222222',
    });
    applyRecycliqueContextBindingHeaders(h, {
      siteId: '33333333-3333-4333-8333-333333333333',
    });
    expect(h[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBe('33333333-3333-4333-8333-333333333333');
    expect(h[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]).toBeUndefined();
  });

  it('écrase des en-têtes pré-remplis conflictuels avant d’appliquer le binding courant', () => {
    const staleSite = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const h: Record<string, string> = {
      [HEADER_RECYCLIQUE_CONTEXT_SITE_ID]: staleSite,
      [HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    applyRecycliqueContextBindingHeaders(h, {
      siteId: '11111111-1111-4111-8111-111111111111',
      cashSessionId: '22222222-2222-4222-8222-222222222222',
    });
    expect(h[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBe('11111111-1111-4111-8111-111111111111');
    expect(h[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('normalise aussi l’API Web Headers (casing canonique)', () => {
    const h = new Headers();
    h.set('Authorization', 'Bearer x');
    applyRecycliqueContextBindingHeaders(h, {
      siteId: '11111111-1111-4111-8111-111111111111',
    });
    expect(h.get(HEADER_RECYCLIQUE_CONTEXT_SITE_ID)).toBe('11111111-1111-4111-8111-111111111111');
    expect(h.get(HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID)).toBeNull();
  });

  it('clearRecycliqueContextBindingHeaders retire les deux clés sur Record ou Headers', () => {
    const r: Record<string, string> = {
      [HEADER_RECYCLIQUE_CONTEXT_SITE_ID]: '11111111-1111-4111-8111-111111111111',
      [HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]: '22222222-2222-4222-8222-222222222222',
    };
    clearRecycliqueContextBindingHeaders(r);
    expect(r[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBeUndefined();
    expect(r[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]).toBeUndefined();

    const wh = new Headers();
    wh.set(HEADER_RECYCLIQUE_CONTEXT_SITE_ID, '11111111-1111-4111-8111-111111111111');
    clearRecycliqueContextBindingHeaders(wh);
    expect(wh.get(HEADER_RECYCLIQUE_CONTEXT_SITE_ID)).toBeNull();
  });

  describe('réinitialisation entre réutilisations (Vitest)', () => {
    let shared: Record<string, string>;

    beforeEach(() => {
      shared = { Authorization: 'Bearer reset-test' };
    });

    afterEach(() => {
      clearRecycliqueContextBindingHeaders(shared);
      expect(shared[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBeUndefined();
      expect(shared[HEADER_RECYCLIQUE_CONTEXT_CASH_SESSION_ID]).toBeUndefined();
    });

    it('après binding puis clear, aucun résidu Recyclique', () => {
      applyRecycliqueContextBindingHeaders(shared, {
        siteId: '11111111-1111-4111-8111-111111111111',
        cashSessionId: '22222222-2222-4222-8222-222222222222',
      });
      expect(shared[HEADER_RECYCLIQUE_CONTEXT_SITE_ID]).toBeDefined();
      clearRecycliqueContextBindingHeaders(shared);
      expect(shared.Authorization).toBe('Bearer reset-test');
    });
  });
});
