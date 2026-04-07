import { describe, expect, it } from 'vitest';
import {
  createDefaultDemoEnvelope,
  DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD,
  NAV_LABEL_KEY_TRANSVERSE_DASHBOARD,
} from '../../src/app/auth/default-demo-auth-adapter';
import { resolveNavEntryDisplayLabel } from '../../src/runtime/resolve-nav-entry-display-label';
import type { NavigationEntry } from '../../src/types/navigation-manifest';

describe('resolveNavEntryDisplayLabel (story 5.5)', () => {
  const entryWithKey = (labelKey: string): NavigationEntry => ({
    id: 'e1',
    routeKey: 'r1',
    labelKey,
  });

  it('utilise presentation_labels quand la clé est présente et non vide', () => {
    const envelope = createDefaultDemoEnvelope();
    expect(
      resolveNavEntryDisplayLabel(entryWithKey(NAV_LABEL_KEY_TRANSVERSE_DASHBOARD), envelope),
    ).toBe(DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD);
  });

  it('fallback sur label_key si aucune entrée dans presentation_labels', () => {
    const envelope = createDefaultDemoEnvelope({
      presentationLabels: {},
    });
    expect(resolveNavEntryDisplayLabel(entryWithKey('nav.custom.key'), envelope)).toBe('nav.custom.key');
  });

  it('fallback sur route_key si label_key absent', () => {
    const envelope = createDefaultDemoEnvelope();
    expect(
      resolveNavEntryDisplayLabel({ id: 'x', routeKey: 'only-route' }, envelope),
    ).toBe('only-route');
  });

  it('ignore une valeur vide dans presentation_labels (fallback clé)', () => {
    const envelope = createDefaultDemoEnvelope({
      presentationLabels: { 'nav.x': '' },
    });
    expect(resolveNavEntryDisplayLabel(entryWithKey('nav.x'), envelope)).toBe('nav.x');
  });

  it('trim les espaces en tête et fin du libellé presentation_labels', () => {
    const envelope = createDefaultDemoEnvelope({
      presentationLabels: { 'nav.x': '  Libellé servi  ' },
    });
    expect(resolveNavEntryDisplayLabel(entryWithKey('nav.x'), envelope)).toBe('Libellé servi');
  });

  it('fallback sur label_key si presentation_labels ne contient que des espaces (trim vide)', () => {
    const envelope = createDefaultDemoEnvelope({
      presentationLabels: { 'nav.x': '   \t  ' },
    });
    expect(resolveNavEntryDisplayLabel(entryWithKey('nav.x'), envelope)).toBe('nav.x');
  });

  it('ne dépend que de envelope.presentationLabels pour le texte (hors UserRuntimePrefs, story 3.5 / 5.5)', () => {
    const entry = entryWithKey(NAV_LABEL_KEY_TRANSVERSE_DASHBOARD);
    const a = createDefaultDemoEnvelope();
    const b = createDefaultDemoEnvelope({
      presentationLabels: { [NAV_LABEL_KEY_TRANSVERSE_DASHBOARD]: 'Libellé alternatif serveur' },
    });
    expect(resolveNavEntryDisplayLabel(entry, a)).toBe(DEMO_PRESENTATION_LABEL_TRANSVERSE_DASHBOARD);
    expect(resolveNavEntryDisplayLabel(entry, b)).toBe('Libellé alternatif serveur');
  });
});
