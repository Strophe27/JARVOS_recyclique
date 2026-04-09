import { Tabs } from '@mantine/core';
import type { ReactElement, ReactNode } from 'react';
import classes from './FlowRenderer.module.css';

export type FlowRendererPanel = {
  readonly id: string;
  readonly title: string;
  readonly content: ReactNode;
};

export type FlowRendererProps = {
  /** Identifiant stable pour tests / telemetrie (non route). */
  readonly flowId: string;
  readonly panels: readonly FlowRendererPanel[];
  readonly activeIndex: number;
  readonly onActiveIndexChange: (index: number) => void;
  /**
   * Si true, les panneaux inactifs restent montés (ex. wizard caisse : ne pas perdre l’état local des champs).
   */
  readonly keepMounted?: boolean;
};

/**
 * Conteneur d'étapes type « onglets » — navigation clavier fournie par Mantine Tabs (flèches, Home/End selon version).
 */
export function FlowRenderer({
  flowId,
  panels,
  activeIndex,
  onActiveIndexChange,
  keepMounted = false,
}: FlowRendererProps): ReactElement {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(panels.length - 1, 0));
  const activeId = panels[safeIndex]?.id ?? 'step-0';

  return (
    <div className={classes.root} data-flow-id={flowId} data-testid={`flow-renderer-${flowId}`}>
      <Tabs
        value={activeId}
        onChange={(v) => {
          if (!v) return;
          const idx = panels.findIndex((p) => p.id === v);
          if (idx >= 0) onActiveIndexChange(idx);
        }}
        keepMounted={keepMounted}
      >
        <Tabs.List>
          {panels.map((p) => (
            <Tabs.Tab key={p.id} value={p.id}>
              {p.title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {panels.map((p) => (
          <Tabs.Panel key={p.id} value={p.id} pt="md">
            {p.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
