/**
 * Tokens visuels partages (Story 13.1.2).
 * Source: alignement RecyClique 1.4.4 + socle Epic 11.
 */
export const visualTokens = {
  colors: {
    brandScale: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
    appBackground: '#f8f9fa',
    surface: '#ffffff',
    border: '#dee2e6',
    textPrimary: '#212529',
    textSecondary: '#495057',
    navHover: '#f1f3f5',
    navActiveBackground: '#e7f5ff',
    navActiveText: '#1864ab',
    focusRing: '#4dabf7',
    secondaryButtonBackground: '#f1f3f5',
    secondaryButtonHover: '#e9ecef',
    danger: '#e03131',
    dangerHover: '#c92a2a',
    disabledBackground: '#e9ecef',
    disabledText: '#868e96',
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
