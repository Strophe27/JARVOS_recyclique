import { Text } from '@mantine/core';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './DemoCard.module.css';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function DemoCard({ widgetProps }: RegisteredWidgetProps) {
  const title = readString(widgetProps?.title);
  const body = readString(widgetProps?.body);
  return (
    <section className={classes.root} data-testid="widget-demo-card" aria-label={title ?? 'Carte démo'}>
      {title ? <Text className={classes.title} fw={600}>{title}</Text> : null}
      {body ? (
        <Text className={classes.body} size="sm" c="dimmed">
          {body}
        </Text>
      ) : null}
    </section>
  );
}
