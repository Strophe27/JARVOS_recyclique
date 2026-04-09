import { ReceptionHistoryPanel } from '../domains/reception/ReceptionHistoryPanel';
import { ReceptionNominalWizard } from '../domains/reception/ReceptionNominalWizard';
import { registerWidget } from './widget-registry';

/** Story 7.1 — aligné `contracts/creos/manifests/widgets-catalog-reception-nominal.json`. */
export function registerReceptionWidgets(): void {
  registerWidget('reception-nominal-wizard', ReceptionNominalWizard);
  registerWidget('reception-history-panel', ReceptionHistoryPanel);
}
