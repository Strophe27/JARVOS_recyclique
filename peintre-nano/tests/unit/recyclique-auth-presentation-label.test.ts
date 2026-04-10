import { describe, expect, it } from 'vitest';
import { presentationLabelFromAuthUserV2 } from '../../src/api/recyclique-auth-client';

describe('presentationLabelFromAuthUserV2', () => {
  it('privilégie prénom + nom', () => {
    expect(
      presentationLabelFromAuthUserV2({
        first_name: 'Marie',
        last_name: 'Curie',
        username: 'mcurie',
        role: 'admin',
      }),
    ).toBe('Marie Curie');
  });

  it('sinon login, sinon rôle', () => {
    expect(
      presentationLabelFromAuthUserV2({
        username: 'admin',
        role: 'admin',
      }),
    ).toBe('admin');
    expect(presentationLabelFromAuthUserV2({ role: 'benevole' })).toBe('benevole');
  });

  it('retourne undefined si rien d’exploitable', () => {
    expect(presentationLabelFromAuthUserV2({})).toBeUndefined();
    expect(presentationLabelFromAuthUserV2(null)).toBeUndefined();
  });
});
