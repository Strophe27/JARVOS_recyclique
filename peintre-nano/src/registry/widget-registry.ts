import type { ComponentType } from 'react';

/** Props communes passées par le moteur de composition (manifest JSON-serializable). */
export type RegisteredWidgetProps = {
  readonly widgetProps?: Readonly<Record<string, unknown>>;
};

export type WidgetRegistryError = {
  readonly code: 'UNKNOWN_WIDGET_TYPE';
  readonly widgetType: string;
};

const registry = new Map<string, ComponentType<RegisteredWidgetProps>>();

export function registerWidget(type: string, component: ComponentType<RegisteredWidgetProps>): void {
  if (!type.trim()) {
    throw new Error('registerWidget: widgetType ne peut pas être vide');
  }
  registry.set(type, component);
}

export function resolveWidget(
  widgetType: string,
):
  | { readonly ok: true; readonly Component: ComponentType<RegisteredWidgetProps> }
  | { readonly ok: false; readonly error: WidgetRegistryError } {
  const Component = registry.get(widgetType);
  if (!Component) {
    return { ok: false, error: { code: 'UNKNOWN_WIDGET_TYPE', widgetType } };
  }
  return { ok: true, Component };
}

export function getRegisteredWidgetTypeSet(): ReadonlySet<string> {
  return new Set(registry.keys());
}

export function getRegisteredWidgetTypes(): readonly string[] {
  return [...registry.keys()].sort((a, b) => a.localeCompare(b));
}
