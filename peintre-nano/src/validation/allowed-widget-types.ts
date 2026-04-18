/**
 * Allowlist des `widgetType` : **source unique** = types enregistrés dans `src/registry/`
 * (story 3.3). Importer ce module charge le registre démo (side-effect via `../registry`).
 */
import { getRegisteredWidgetTypeSet } from '../registry';

export function defaultAllowedWidgetTypeSet(): ReadonlySet<string> {
  return getRegisteredWidgetTypeSet();
}
