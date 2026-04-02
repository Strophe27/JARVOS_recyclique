import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoListSimple.module.css';

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export function DemoListSimple({ widgetProps }: RegisteredWidgetProps) {
  const items = readStringArray(widgetProps?.items);
  return (
    <ul className={classes.root} data-testid="widget-demo-list-simple">
      {items.map((item, i) => (
        <li key={`${i}-${item}`} className={classes.item}>
          {item}
        </li>
      ))}
    </ul>
  );
}
