/**
 * Layout — interfaces et services pour configuration d'affichage (v1 stubs, v2+ API préférences).
 */
export type { LayoutConfig, LayoutConfigService, LayoutContext } from './types';
export { layoutConfigStub } from './layout-config.stub';
export { useLayoutConfig } from './useLayoutConfig';
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';
export { AppShellNav } from './AppShellNav';
export type { ShellNavItem } from './AppShellNav';
export { PageContainer, PageSection } from './PageLayout';
export { ErrorBoundary } from './ErrorBoundary';
