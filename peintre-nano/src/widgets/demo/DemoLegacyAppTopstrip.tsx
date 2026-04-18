import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoLegacyAppTopstrip.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function DemoLegacyAppTopstrip({ widgetProps }: RegisteredWidgetProps) {
  const title = readString(widgetProps?.brandTitle) ?? 'RecyClique';
  const sub = readString(widgetProps?.welcomeLine);
  return (
    <div
      className={classes.root}
      data-testid="widget-demo-legacy-app-topstrip"
      role="banner"
      aria-label="En-tête application"
    >
      <div className={classes.brand}>
        <p className={classes.title}>{title}</p>
        {sub ? <p className={classes.sub}>{sub}</p> : null}
      </div>
    </div>
  );
}
