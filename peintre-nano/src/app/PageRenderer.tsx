import { useEffect, type ReactNode } from 'react';
import { resolveWidget } from '../registry';
import { mapSlotIdToShellRegion, type ShellSlotRegionId } from '../registry/shell-slot-regions';
import { reportRuntimeFallback } from '../runtime/report-runtime-fallback';
import type { PageManifest, PageSlotPlacement } from '../types/page-manifest';
import classes from './PageRenderer.module.css';

export type BuildPageManifestRegionsOptions = {
  /**
   * Enveloppe optionnelle du contenu des slots non mappés (ex. gabarits transverses sous `main`).
   * Reste purement présentationnelle ; le manifeste et le registre de widgets ne changent pas.
   */
  readonly wrapUnmappedSlotContent?: (children: ReactNode) => ReactNode;
};

type WidgetResolveFallbackProps = {
  readonly widgetType: string;
  readonly errorCode: string;
};

function WidgetResolveFallback({ widgetType, errorCode }: WidgetResolveFallbackProps) {
  useEffect(() => {
    reportRuntimeFallback({
      code: errorCode,
      message: 'Type de widget inconnu ou non enregistré.',
      severity: 'degraded',
      detail: { widgetType },
      state: 'widget_resolve_failed',
    });
  }, [widgetType, errorCode]);

  return (
    <div
      data-testid="widget-resolve-error"
      data-widget-type={widgetType}
      data-runtime-severity="degraded"
      data-runtime-code={errorCode}
      className={classes.resolveError}
    >
      {errorCode}: {widgetType}
    </div>
  );
}

type UnmappedSlotsRegionProps = {
  readonly placementCount: number;
  readonly children: ReactNode;
};

function UnmappedSlotsRegion({ placementCount, children }: UnmappedSlotsRegionProps) {
  useEffect(() => {
    if (placementCount > 0) {
      reportRuntimeFallback({
        code: 'PAGE_SLOT_UNMAPPED',
        message: 'Slots non mappés vers le shell : contenu regroupé dans la zone principale.',
        severity: 'info',
        detail: { placementCount },
        state: 'page_slot_unmapped',
      });
    }
  }, [placementCount]);

  return (
    <div
      data-testid="page-slot-unmapped"
      data-runtime-severity="info"
      data-runtime-code="PAGE_SLOT_UNMAPPED"
      className={classes.unmapped}
    >
      {children}
    </div>
  );
}

export type PageManifestRegions = {
  readonly header?: ReactNode;
  readonly nav?: ReactNode;
  readonly aside?: ReactNode;
  readonly footer?: ReactNode;
  /** Contenu déclaratif pour la zone `main` (slots `main` + slots non mappés). */
  readonly mainWidgets?: ReactNode;
};

function renderPlacements(list: readonly PageSlotPlacement[]): ReactNode {
  return list.map((p, i) => {
    const res = resolveWidget(p.widgetType);
    if (!res.ok) {
      return (
        <WidgetResolveFallback
          key={`${p.slotId}-${p.widgetType}-${i}`}
          widgetType={p.widgetType}
          errorCode={res.error.code}
        />
      );
    }
    const C = res.Component;
    return <C key={`${p.slotId}-${p.widgetType}-${i}`} widgetProps={p.widgetProps} />;
  });
}

/**
 * À partir d’un PageManifest validé, produit les nœuds React par région du shell.
 */
export function buildPageManifestRegions(
  page: PageManifest,
  options?: BuildPageManifestRegionsOptions,
): PageManifestRegions {
  const buckets: Record<ShellSlotRegionId | 'unmapped', PageSlotPlacement[]> = {
    header: [],
    nav: [],
    main: [],
    aside: [],
    footer: [],
    unmapped: [],
  };

  for (const p of page.slots) {
    const region = mapSlotIdToShellRegion(p.slotId);
    const key = region === 'unmapped' ? 'unmapped' : region;
    buckets[key].push(p);
  }

  const out: {
    header?: ReactNode;
    nav?: ReactNode;
    aside?: ReactNode;
    footer?: ReactNode;
    mainWidgets?: ReactNode;
  } = {};

  if (buckets.header.length) {
    out.header = <div className={classes.slotStack}>{renderPlacements(buckets.header)}</div>;
  }
  if (buckets.nav.length) {
    out.nav = <div className={classes.slotStack}>{renderPlacements(buckets.nav)}</div>;
  }
  if (buckets.aside.length) {
    out.aside = <div className={classes.slotStack}>{renderPlacements(buckets.aside)}</div>;
  }
  if (buckets.footer.length) {
    out.footer = <div className={classes.slotStack}>{renderPlacements(buckets.footer)}</div>;
  }

  const mainParts: ReactNode[] = [];
  if (buckets.main.length) {
    mainParts.push(
      <div key="main-slots" className={classes.slotStack} data-pn-main-slot-stack="true">
        {renderPlacements(buckets.main)}
      </div>,
    );
  }
  if (buckets.unmapped.length) {
    const count = buckets.unmapped.length;
    const rawUnmapped = renderPlacements(buckets.unmapped);
    const wrappedUnmapped = options?.wrapUnmappedSlotContent
      ? options.wrapUnmappedSlotContent(rawUnmapped)
      : rawUnmapped;
    mainParts.push(
      <UnmappedSlotsRegion key="unmapped" placementCount={count}>
        {wrappedUnmapped}
      </UnmappedSlotsRegion>,
    );
  }
  if (mainParts.length) {
    out.mainWidgets = <div className={classes.mainManifest}>{mainParts}</div>;
  }

  return out;
}
