import { describe, expect, it } from 'vitest';
import { TRUTH_STACK_STUB_FOR_TESTS } from '../../src/runtime/conceptual-artifacts.stub';

describe('conceptual-artifacts.stub (TRUTH_STACK_STUB_FOR_TESTS)', () => {
  it('expose une pile stub sans contenu métier inventé (entrées vides)', () => {
    expect(TRUTH_STACK_STUB_FOR_TESTS.navigation.entries).toEqual([]);
    expect(TRUTH_STACK_STUB_FOR_TESTS.context.permissions.permissionKeys).toEqual([]);
    expect(TRUTH_STACK_STUB_FOR_TESTS.page.slots).toEqual([]);
  });

  it('aligne les versions et clés sur des marqueurs stub explicites', () => {
    expect(TRUTH_STACK_STUB_FOR_TESTS.context.schemaVersion).toBe('stub-0');
    expect(TRUTH_STACK_STUB_FOR_TESTS.navigation.version).toBe('stub-0');
    expect(TRUTH_STACK_STUB_FOR_TESTS.page.version).toBe('stub-0');
    expect(TRUTH_STACK_STUB_FOR_TESTS.page.pageKey).toBe('stub');
  });

  it('contexte stub sans site ni caisse résolue (null)', () => {
    expect(TRUTH_STACK_STUB_FOR_TESTS.context.siteId).toBeNull();
    expect(TRUTH_STACK_STUB_FOR_TESTS.context.activeRegisterId).toBeNull();
  });

  it('prefs runtime restent des valeurs par défaut non métier', () => {
    expect(TRUTH_STACK_STUB_FOR_TESTS.prefs.uiDensity).toBe('comfortable');
    expect(TRUTH_STACK_STUB_FOR_TESTS.prefs.sidebarPanelOpen).toBe(true);
    expect(TRUTH_STACK_STUB_FOR_TESTS.prefs.onboardingCompleted).toBe(false);
  });
});
