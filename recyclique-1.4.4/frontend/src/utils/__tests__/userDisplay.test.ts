import { describe, it, expect } from 'vitest';
import {
  displayAtUsername,
  fullNameOrUsernameDisplayFallback,
} from '../userDisplay';

describe('displayAtUsername', () => {
  it('retourne le username trimé', () => {
    expect(displayAtUsername('  alice  ')).toBe('alice');
  });

  it('retourne chaîne vide sans username', () => {
    expect(displayAtUsername(undefined)).toBe('');
    expect(displayAtUsername('')).toBe('');
    expect(displayAtUsername('   ')).toBe('');
  });
});

describe('fullNameOrUsernameDisplayFallback', () => {
  it('priorise prénom + nom', () => {
    expect(
      fullNameOrUsernameDisplayFallback('Alice', 'Martin', 'alice', 'uuid'),
    ).toBe('Alice Martin');
  });

  it('utilise le username seul', () => {
    expect(
      fullNameOrUsernameDisplayFallback(undefined, undefined, 'alice', 'uuid'),
    ).toBe('alice');
  });

  it('repli sur id utilisateur court sans nom ni username', () => {
    expect(
      fullNameOrUsernameDisplayFallback(
        undefined,
        undefined,
        undefined,
        '123e4567-e89b-12d3-a456-426614174000',
      ),
    ).toBe('Utilisateur (123e4567…)');
  });

  it('accepte un seul prénom ou nom', () => {
    expect(
      fullNameOrUsernameDisplayFallback('Alice', undefined, 'alice', 'uuid'),
    ).toBe('Alice');
  });

  it('sans rien : libellé générique', () => {
    expect(
      fullNameOrUsernameDisplayFallback(undefined, undefined, undefined, undefined),
    ).toBe('Sans identifiant affichable');
  });
});
