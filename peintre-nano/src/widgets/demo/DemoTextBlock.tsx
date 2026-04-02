import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoTextBlock.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function DemoTextBlock({ widgetProps }: RegisteredWidgetProps) {
  const title = readString(widgetProps?.title);
  const body = readString(widgetProps?.body);
  return (
    <div className={classes.root} data-testid="widget-demo-text-block">
      {title ? <h2 className={classes.title}>{title}</h2> : null}
      {body ? <p className={classes.body}>{body}</p> : null}
    </div>
  );
}
