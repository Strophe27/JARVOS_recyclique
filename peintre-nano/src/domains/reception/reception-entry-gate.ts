import { useMemo } from 'react';
import { PERMISSION_RECEPTION_ACCESS } from '../../app/auth/default-demo-auth-adapter';
import { useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';

export type ReceptionEntryBlock =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly title: string; readonly body: string };

/** Story 7.2 — même logique pour le nominal et l’historique (7.4). */
export function useReceptionEntryBlock(): ReceptionEntryBlock {
  const envelope = useContextEnvelope();
  return useMemo((): ReceptionEntryBlock => {
    if (envelope.runtimeStatus === 'forbidden') {
      return {
        blocked: true,
        title: 'Contexte bloqué',
        body:
          envelope.restrictionMessage?.trim() ||
          'Accès réception refusé par le serveur (enveloppe runtime « forbidden »).',
      };
    }
    if (envelope.runtimeStatus === 'degraded') {
      return {
        blocked: true,
        title: 'Contexte restreint',
        body:
          envelope.restrictionMessage?.trim() ||
          'Contexte dégradé — rafraîchir le contexte ou corriger l’affectation avant la réception.',
      };
    }
    if (!envelope.siteId?.trim()) {
      return {
        blocked: true,
        title: 'Site actif non résolu',
        body:
          'L’enveloppe de contexte ne fournit pas de site : le parcours ne peut pas continuer tant que le serveur n’expose pas un site.',
      };
    }
    if (!envelope.permissions.permissionKeys.includes(PERMISSION_RECEPTION_ACCESS)) {
      return {
        blocked: true,
        title: 'Permission réception absente',
        body: `Les permissions effectives du serveur ne contiennent pas « ${PERMISSION_RECEPTION_ACCESS} ».`,
      };
    }
    return { blocked: false };
  }, [envelope]);
}
