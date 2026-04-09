import { registerBandeauLiveWidgets } from './register-bandeau-live-widgets';
import { registerCashflowWidgets } from './register-cashflow-widgets';
import { registerDemoWidgets } from './register-demo-widgets';

registerDemoWidgets();
registerBandeauLiveWidgets();
registerCashflowWidgets();

export {
  getRegisteredWidgetTypeSet,
  getRegisteredWidgetTypes,
  registerWidget,
  resolveWidget,
  type RegisteredWidgetProps,
  type WidgetRegistryError,
} from './widget-registry';
