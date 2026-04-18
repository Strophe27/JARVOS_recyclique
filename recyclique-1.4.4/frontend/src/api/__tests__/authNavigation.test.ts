import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  registerAuthNavigate,
  unregisterAuthNavigate,
  navigateToLoginReplace,
} from '../authNavigation';

describe('authNavigation', () => {
  afterEach(() => {
    unregisterAuthNavigate();
  });

  it('appelle navigate(/login, { replace: true }) quand une fonction est enregistrée', () => {
    const navigate = vi.fn();
    registerAuthNavigate(navigate);
    navigateToLoginReplace();
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
