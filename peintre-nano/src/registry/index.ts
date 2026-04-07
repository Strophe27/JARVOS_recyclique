import { registerBandeauLiveWidgets } from './register-bandeau-live-widgets';
import { registerDemoWidgets } from './register-demo-widgets';

registerDemoWidgets();
registerBandeauLiveWidgets();

export {
  getRegisteredWidgetTypeSet,
  getRegisteredWidgetTypes,
  registerWidget,
  resolveWidget,
  type RegisteredWidgetProps,
  type WidgetRegistryError,
} from './widget-registry';
