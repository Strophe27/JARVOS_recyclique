import { List, Text, Title } from '@mantine/core';
import classes from './App.module.css';

export function App() {
  return (
    <main className={classes.shell} data-testid="peintre-nano-shell">
      <div className={classes.shellContent}>
        <Title order={1}>Socle Peintre_nano</Title>
        <Text c="dimmed">
          Fondation React + TypeScript + Vite (story 3.0). La navigation, les pages et le contexte
          autoritatif viendront des contrats commanditaires ; ce socle ne les substitue pas par des routes
          ou permissions métier codées en dur.
        </Text>
        <div>
          <Text fw={600} mb="xs">
            Quatre artefacts minimaux (hiérarchie de vérité)
          </Text>
          <List className={classes.list} spacing="xs" type="ordered">
            <List.Item>
              <strong>ContextEnvelope</strong> — OpenAPI / backend ; Piste A : mocks structurels jusqu’à
              Convergence 1.
            </List.Item>
            <List.Item>
              <strong>NavigationManifest</strong> — contrats CREOS / commanditaire ; le runtime interprète.
            </List.Item>
            <List.Item>
              <strong>PageManifest</strong> — composition déclarative (slots / widgets CREOS).
            </List.Item>
            <List.Item>
              <strong>UserRuntimePrefs</strong> — préférences UI locales, jamais source de vérité métier.
            </List.Item>
          </List>
        </div>
      </div>
    </main>
  );
}
