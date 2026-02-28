import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core';
import { visualTokens } from './tokens';

const BRAND_COLORS = [...visualTokens.colors.brandScale] as unknown as MantineColorsTuple;
const pxToRem = (px: number): string => `${px / 16}rem`;

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--ui-color-app-background': visualTokens.colors.appBackground,
    '--ui-color-surface': visualTokens.colors.surface,
    '--ui-color-border': visualTokens.colors.border,
    '--ui-color-text-primary': visualTokens.colors.textPrimary,
    '--ui-color-text-secondary': visualTokens.colors.textSecondary,
    '--ui-color-nav-hover': visualTokens.colors.navHover,
    '--ui-color-nav-active-bg': visualTokens.colors.navActiveBackground,
    '--ui-color-nav-active-text': visualTokens.colors.navActiveText,
    '--ui-color-focus-ring': visualTokens.colors.focusRing,
    '--ui-spacing-xs': `${visualTokens.spacing.xs}px`,
    '--ui-spacing-sm': `${visualTokens.spacing.sm}px`,
    '--ui-spacing-md': `${visualTokens.spacing.md}px`,
    '--ui-spacing-lg': `${visualTokens.spacing.lg}px`,
    '--ui-spacing-xl': `${visualTokens.spacing.xl}px`,
    '--ui-radius-sm': `${visualTokens.radius.sm}px`,
    '--ui-radius-md': `${visualTokens.radius.md}px`,
    '--ui-radius-lg': `${visualTokens.radius.lg}px`,
    '--ui-border-width': `${visualTokens.border.width}px`,
  },
  light: {},
  dark: {},
});

export const mantineTheme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: BRAND_COLORS,
  },
  fontFamily: visualTokens.typography.fontFamily,
  fontSizes: {
    xs: pxToRem(visualTokens.typography.fontSizeXs),
    sm: pxToRem(visualTokens.typography.fontSizeSm),
    md: pxToRem(visualTokens.typography.fontSizeMd),
    lg: pxToRem(visualTokens.typography.fontSizeLg),
    xl: pxToRem(visualTokens.typography.fontSizeXl),
  },
  headings: {
    fontFamily: visualTokens.typography.fontFamily,
    fontWeight: `${visualTokens.typography.headingWeight}`,
  },
  spacing: {
    xs: pxToRem(visualTokens.spacing.xs),
    sm: pxToRem(visualTokens.spacing.sm),
    md: pxToRem(visualTokens.spacing.md),
    lg: pxToRem(visualTokens.spacing.lg),
    xl: pxToRem(visualTokens.spacing.xl),
  },
  radius: {
    sm: pxToRem(visualTokens.radius.sm),
    md: pxToRem(visualTokens.radius.md),
    lg: pxToRem(visualTokens.radius.lg),
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: visualTokens.button.fontWeight,
          '&[data-variant="filled"]': {
            backgroundColor: visualTokens.colors.navActiveText,
            borderColor: visualTokens.colors.navActiveText,
            color: visualTokens.colors.surface,
            '&:hover': {
              backgroundColor: visualTokens.colors.brandScale[7],
            },
          },
          '&[data-variant="default"]': {
            backgroundColor: visualTokens.colors.secondaryButtonBackground,
            borderColor: visualTokens.colors.border,
            color: visualTokens.colors.textPrimary,
            '&:hover': {
              backgroundColor: visualTokens.colors.secondaryButtonHover,
            },
          },
          '&[data-variant="outline"]': {
            backgroundColor: visualTokens.colors.surface,
            borderColor: visualTokens.colors.navActiveText,
            color: visualTokens.colors.navActiveText,
            '&:hover': {
              backgroundColor: visualTokens.colors.navActiveBackground,
            },
          },
          '&[data-color="red"][data-variant="filled"]': {
            backgroundColor: visualTokens.colors.danger,
            borderColor: visualTokens.colors.danger,
            color: visualTokens.colors.surface,
            '&:hover': {
              backgroundColor: visualTokens.colors.dangerHover,
            },
          },
          '&[data-disabled], &:disabled': {
            backgroundColor: visualTokens.colors.disabledBackground,
            borderColor: visualTokens.colors.border,
            color: visualTokens.colors.disabledText,
            opacity: 1,
          },
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
        size: 'sm',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'md',
        size: 'sm',
      },
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        withTableBorder: true,
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
    Alert: {
      defaultProps: {
        radius: 'md',
        variant: 'light',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
        shadow: 'sm',
      },
    },
    Drawer: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        withBorder: true,
        radius: 'md',
      },
    },
  },
});
