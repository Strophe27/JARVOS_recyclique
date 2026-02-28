import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '@mantine/core';
import { cssVariablesResolver, mantineTheme } from './mantineTheme';
import { visualTokens } from './tokens';

describe('mantineTheme', () => {
  it('definit la couleur primaire partagee', () => {
    const brandColors = mantineTheme.colors?.brand;
    expect(mantineTheme.primaryColor).toBe('brand');
    expect(brandColors).toBeDefined();
    expect(brandColors).toHaveLength(10);
  });

  it('harmonise les composants UI critiques', () => {
    const components = mantineTheme.components;
    const buttonRootStyles = components?.Button?.styles?.root as Record<string, unknown>;

    expect(components?.Button?.defaultProps?.radius).toBe('md');
    expect(buttonRootStyles['&[data-variant="filled"]']).toBeDefined();
    expect(buttonRootStyles['&[data-variant="default"]']).toBeDefined();
    expect(buttonRootStyles['&[data-variant="outline"]']).toBeDefined();
    expect(buttonRootStyles['&[data-color="red"][data-variant="filled"]']).toBeDefined();
    expect(buttonRootStyles['&[data-disabled], &:disabled']).toBeDefined();
    expect(components?.TextInput?.defaultProps?.size).toBe('sm');
    expect(components?.Table?.defaultProps?.striped).toBe(true);
    expect(components?.Alert?.defaultProps?.variant).toBe('light');
    expect(components?.Modal?.defaultProps?.centered).toBe(true);
    expect(components?.Drawer?.defaultProps?.radius).toBe('md');
  });

  it('genere les variables CSS depuis les tokens', () => {
    const resolved = cssVariablesResolver(DEFAULT_THEME);
    expect(resolved.variables['--ui-color-app-background']).toBe(visualTokens.colors.appBackground);
    expect(resolved.variables['--ui-radius-md']).toBe(`${visualTokens.radius.md}px`);
  });
});
