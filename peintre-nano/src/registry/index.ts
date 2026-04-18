import { registerAuthWidgets } from './register-auth-widgets';
import { registerBandeauLiveWidgets } from './register-bandeau-live-widgets';
import { registerCashflowWidgets } from './register-cashflow-widgets';
import { registerAdminConfigWidgets } from './register-admin-config-widgets';
import { registerCategoryWidgets } from './register-category-widgets';
import { registerDemoWidgets } from './register-demo-widgets';
import { registerReceptionWidgets } from './register-reception-widgets';

registerDemoWidgets();
registerAdminConfigWidgets();
registerAuthWidgets();
registerBandeauLiveWidgets();
registerCashflowWidgets();
registerReceptionWidgets();
registerCategoryWidgets();

export {
  getRegisteredWidgetTypeSet,
  getRegisteredWidgetTypes,
  registerWidget,
  resolveWidget,
  type RegisteredWidgetProps,
  type WidgetRegistryError,
} from './widget-registry';
