// @vitest-environment jsdom
import '@mantine/core/styles.css';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  TransverseEmptyState,
  TransverseErrorState,
  TransverseLoadingState,
  TransversePageStateSlot,
} from '../../src/app/states/transverse';
import { TRANSVERSE_RUNTIME_CODES } from '../../src/app/states/transverse/transverse-runtime-codes';
import '../../src/styles/tokens.css';

const { reportRuntimeFallbackMock } = vi.hoisted(() => ({
  reportRuntimeFallbackMock: vi.fn(),
}));

vi.mock('../../src/runtime/report-runtime-fallback', () => ({
  reportRuntimeFallback: reportRuntimeFallbackMock,
}));

afterEach(() => {
  cleanup();
  reportRuntimeFallbackMock.mockClear();
});

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('Story 5.7 — primitives transverses', () => {
  it('TransverseLoadingState : data-testid, data-runtime-*, role=status', () => {
    render(<TransverseLoadingState message="Chargement test" />);
    const el = screen.getByTestId('transverse-state-loading');
    expect(el.getAttribute('data-runtime-code')).toBe(TRANSVERSE_RUNTIME_CODES.LOADING);
    expect(el.getAttribute('data-runtime-severity')).toBe('info');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.textContent).toContain('Chargement test');
  });

  it('TransverseEmptyState : data-testid, data-runtime-*, role=status', () => {
    render(<TransverseEmptyState title="Vide" message="Aucune ligne" />);
    const el = screen.getByTestId('transverse-state-empty');
    expect(el.getAttribute('data-runtime-code')).toBe(TRANSVERSE_RUNTIME_CODES.EMPTY);
    expect(el.getAttribute('data-runtime-severity')).toBe('info');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('TransverseErrorState : data-testid, data-runtime-*, role=alert et reportRuntimeFallback', () => {
    render(
      <TransverseErrorState
        message="Erreur"
        code="TRANSVERSE_ERR_TEST"
        severity="degraded"
      />,
    );
    const el = screen.getByTestId('transverse-state-error');
    expect(el.getAttribute('data-runtime-code')).toBe('TRANSVERSE_ERR_TEST');
    expect(el.getAttribute('data-runtime-severity')).toBe('degraded');
    expect(el.getAttribute('role')).toBe('alert');
    expect(reportRuntimeFallbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'TRANSVERSE_ERR_TEST',
        severity: 'degraded',
        state: 'transverse_page_surface_error',
      }),
    );
  });

  it('TransversePageStateSlot nominal : slot présent, data-transverse-state=nominal', () => {
    render(<TransversePageStateSlot pageState={{ kind: 'nominal' }} />);
    const slot = screen.getByTestId('transverse-page-state-slot');
    expect(slot.getAttribute('data-transverse-state')).toBe('nominal');
    expect(slot.getAttribute('aria-hidden')).toBe('true');
  });

  it('TransversePageStateSlot loading : enfant visible', () => {
    render(<TransversePageStateSlot pageState={{ kind: 'loading' }} />);
    expect(screen.getByTestId('transverse-state-loading')).toBeTruthy();
    expect(screen.getByTestId('transverse-page-state-slot').getAttribute('data-transverse-state')).toBe('loading');
  });
});
