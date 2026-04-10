import { registerWidget } from './widget-registry';
import { DemoCard } from '../widgets/demo/DemoCard';
import { DemoLegacyAppTopstrip } from '../widgets/demo/DemoLegacyAppTopstrip';
import { DemoKpi } from '../widgets/demo/DemoKpi';
import { DemoListSimple } from '../widgets/demo/DemoListSimple';
import { DemoTextBlock } from '../widgets/demo/DemoTextBlock';
import { LegacyDashboardWorkspaceWidget } from '../widgets/demo/LegacyDashboardWorkspaceWidget';

/**
 * Catalogue starter (infra runtime) — préfixe stable `demo.*`.
 * Appelé une fois au chargement du module `registry/index`.
 */
export function registerDemoWidgets(): void {
  registerWidget('demo.text.block', DemoTextBlock);
  registerWidget('demo.card', DemoCard);
  registerWidget('demo.kpi', DemoKpi);
  registerWidget('demo.list.simple', DemoListSimple);
  registerWidget('demo.legacy.app.topstrip', DemoLegacyAppTopstrip);
  registerWidget('demo.legacy.dashboard.workspace', LegacyDashboardWorkspaceWidget);
}
