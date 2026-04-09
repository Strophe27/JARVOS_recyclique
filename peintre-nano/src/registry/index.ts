import { registerBandeauLiveWidgets } from './register-bandeau-live-widgets';
import { registerCashflowWidgets } from './register-cashflow-widgets';
import { registerDemoWidgets } from './register-demo-widgets';
import { registerReceptionWidgets } from './register-reception-widgets';

registerDemoWidgets();
registerBandeauLiveWidgets();
registerCashflowWidgets();
registerReceptionWidgets();

export {
  getRegisteredWidgetTypeSet,
  getRegisteredWidgetTypes,
  registerWidget,
  resolveWidget,
  type RegisteredWidgetProps,
  type WidgetRegistryError,
} from './widget-registry';
