import { registerWidget } from './widget-registry';
import { DemoCard } from '../widgets/demo/DemoCard';
import { DemoKpi } from '../widgets/demo/DemoKpi';
import { DemoListSimple } from '../widgets/demo/DemoListSimple';
import { DemoTextBlock } from '../widgets/demo/DemoTextBlock';

/**
 * Catalogue starter (infra runtime) — préfixe stable `demo.*`.
 * Appelé une fois au chargement du module `registry/index`.
 */
export function registerDemoWidgets(): void {
  registerWidget('demo.text.block', DemoTextBlock);
  registerWidget('demo.card', DemoCard);
  registerWidget('demo.kpi', DemoKpi);
  registerWidget('demo.list.simple', DemoListSimple);
}
