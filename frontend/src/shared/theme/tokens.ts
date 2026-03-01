/**
 * Tokens visuels partages (Story 13.1.2).
 * Source: alignement RecyClique 1.4.4 + socle Epic 11.
 */
export const visualTokens = {
  colors: {
    /** Echelle verte issue de #2e7d32 (Material Green 800) — parite 1.4.4. */
    brandScale: [
      '#e8f5e9',
      '#c8e6c9',
      '#a5d6a7',
      '#81c784',
      '#66bb6a',
      '#4caf50',
      '#43a047',
      '#388e3c',
      '#2e7d32',
      '#1b5e20',
    ],
    appBackground: '#f8f9fa',
    surface: '#ffffff',
    border: '#dee2e6',
    textPrimary: '#212529',
    textSecondary: '#495057',
    navHover: '#e8f5e9',
    navActiveBackground: '#c8e6c9',
    navActiveText: '#2e7d32',
    focusRing: '#66bb6a',
    secondaryButtonBackground: '#f1f3f5',
    secondaryButtonHover: '#e9ecef',
    danger: '#e03131',
    dangerHover: '#c92a2a',
    disabledBackground: '#e9ecef',
    disabledText: '#868e96',
    statsBarBg: '#2d2b55',
    /** Orange scale — bouton saisie differee (Material Orange). */
    deferredBackground: '#fff3e0',
    deferredText: '#e65100',
    deferredBorder: '#fb8c00',
    deferredHover: '#ffe0b2',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSizeBase: 15,
    fontSizeXs: 12,
    fontSizeSm: 14,
    fontSizeMd: 15,
    fontSizeLg: 16,
    fontSizeXl: 18,
    lineHeightBase: 1.4,
    headingWeight: 700,
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
  },
  border: {
    width: 1,
  },
  shadows: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.06)',
    sm: '0 2px 6px rgba(15, 23, 42, 0.08)',
  },
  button: {
    fontWeight: 600,
  },
} as const;

export function getHierarchyIndentPx(depth: number): number {
  const safeDepth = Math.max(0, depth);
  return safeDepth * visualTokens.spacing.md + visualTokens.spacing.xs;
}
