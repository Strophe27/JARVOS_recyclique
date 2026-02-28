import type { ReactNode } from 'react';
import { Paper, Stack, Title } from '@mantine/core';

interface PageContainerProps {
  title: string;
  children: ReactNode;
  maxWidth?: number;
  gap?: string;
  topMargin?: string;
  testId?: string;
}

interface PageSectionProps {
  children: ReactNode;
  testId?: string;
}

export function PageContainer({
  title,
  children,
  maxWidth = 800,
  gap = 'md',
  topMargin,
  testId,
}: PageContainerProps) {
  return (
    <Stack gap={gap} maw={maxWidth} mx="auto" p="md" mt={topMargin} data-testid={testId}>
      <Title order={1}>{title}</Title>
      {children}
    </Stack>
  );
}

export function PageSection({ children, testId }: PageSectionProps) {
  return (
    <Paper p="lg" shadow="sm" radius="md" withBorder data-testid={testId}>
      {children}
    </Paper>
  );
}
