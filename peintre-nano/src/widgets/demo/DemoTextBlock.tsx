import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoTextBlock.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function DemoTextBlock({ widgetProps }: RegisteredWidgetProps) {
  const title = readString(widgetProps?.title);
  const body = readString(widgetProps?.body);
  const titleLevelRaw =
    readString(widgetProps?.titleLevel) ?? readString(widgetProps?.title_level);
  const TitleTag = titleLevelRaw === '1' ? 'h1' : 'h2';
  return (
    <div className={classes.root} data-testid="widget-demo-text-block">
      {title ? (
        <TitleTag className={classes.title} data-demo-text-title-level={titleLevelRaw === '1' ? '1' : '2'}>
          {title}
        </TitleTag>
      ) : null}
      {body ? <p className={classes.body}>{body}</p> : null}
    </div>
  );
}
