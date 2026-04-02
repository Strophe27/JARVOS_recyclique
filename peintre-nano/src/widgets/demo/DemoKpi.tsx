import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoKpi.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function formatValue(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') return v;
  return '—';
}

export function DemoKpi({ widgetProps }: RegisteredWidgetProps) {
  const label = readString(widgetProps?.label) ?? 'KPI';
  const value = formatValue(widgetProps?.value);
  return (
    <div className={classes.root} data-testid="widget-demo-kpi">
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{value}</span>
    </div>
  );
}
