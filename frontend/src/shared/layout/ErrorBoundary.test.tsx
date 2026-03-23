import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenChild(): React.JSX.Element {
  throw new Error('Boom');
}

function GoodChild() {
  return <div data-testid="good-child">OK</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('affiche les enfants quand tout va bien', () => {
    render(
      <MantineProvider>
        <ErrorBoundary>
          <GoodChild />
        </ErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByTestId('good-child')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('affiche un fallback lisible en cas de crash React', () => {
    render(
      <MantineProvider>
        <ErrorBoundary>
          <BrokenChild />
        </ErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-retry')).toBeInTheDocument();
  });

  it('accepte un titre personnalise', () => {
    render(
      <MantineProvider>
        <ErrorBoundary fallbackTitle="Erreur reception">
          <BrokenChild />
        </ErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByText('Erreur reception')).toBeInTheDocument();
  });

  it('le bouton Reessayer reset le state et re-rend les enfants', () => {
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) throw new Error('Boom');
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <MantineProvider>
        <ErrorBoundary>
          <ConditionalChild />
        </ErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId('error-boundary-retry'));

    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('utilise un testId personnalise', () => {
    render(
      <MantineProvider>
        <ErrorBoundary testId="custom-boundary">
          <BrokenChild />
        </ErrorBoundary>
      </MantineProvider>
    );

    expect(screen.getByTestId('custom-boundary')).toBeInTheDocument();
  });
});
