import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Stack, Text } from '@mantine/core';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  testId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catch-all React ErrorBoundary — prevents white-page crashes.
 * Displays a user-friendly message and a retry button.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle ?? 'Une erreur est survenue';
      return (
        <Stack gap="md" p="xl" maw={600} mx="auto" mt="xl" data-testid={this.props.testId ?? 'error-boundary-fallback'}>
          <Alert color="red" title={title}>
            <Text size="sm" mb="sm">
              La page n&apos;a pas pu s&apos;afficher correctement. Vous pouvez reessayer ou revenir a l&apos;accueil.
            </Text>
            <Button variant="light" size="compact-sm" onClick={this.handleRetry} data-testid="error-boundary-retry">
              Reessayer
            </Button>
          </Alert>
        </Stack>
      );
    }
    return this.props.children;
  }
}
