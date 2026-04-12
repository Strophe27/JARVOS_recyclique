import { Paper, Text } from '@mantine/core';
import type { ContextEnvelopeStub } from '../../types/context-envelope';
import { CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY } from '../../runtime/context-presentation-keys';
import classes from './LiveAdminPerimeterStrip.module.css';

export type LiveAdminPerimeterStripProps = {
  readonly envelope: ContextEnvelopeStub;
};

/**
 * Bandeau périmètre admin (Epic 14.1) : affiche uniquement des libellés fournis par le backend
 * dans {@link ContextEnvelopeStub.presentationLabels} — jamais d’UUID ou d’identifiants techniques bruts.
 */
export function LiveAdminPerimeterStrip({ envelope }: LiveAdminPerimeterStripProps) {
  const siteLabel = envelope.presentationLabels?.[CONTEXT_ACTIVE_SITE_DISPLAY_NAME_KEY]?.trim();
  if (!siteLabel) {
    return (
      <Paper
        radius="md"
        p="sm"
        withBorder
        className={classes.strip}
        data-testid="live-admin-perimeter-strip"
        data-admin-perimeter="gap"
      >
        <Text size="sm" c="dimmed">
          Périmètre site : aucun libellé d’exploitation n’a été fourni dans l’enveloppe de contexte pour cette session.
          Le filtrage des données reste du ressort du serveur ; cette bannière documente l’écart tant que la clé de
          présentation « site actif » n’est pas servie.
        </Text>
      </Paper>
    );
  }
  return (
    <Paper
      radius="md"
      p="sm"
      withBorder
      className={classes.strip}
      data-testid="live-admin-perimeter-strip"
      data-admin-perimeter="ok"
    >
      <Text size="sm" fw={600} className={classes.title}>
        Site d’exploitation actif
      </Text>
      <Text size="sm" mt={4}>
        {siteLabel}
      </Text>
    </Paper>
  );
}
