import { Alert, List, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getSale, type SaleResponseV1 } from '../../api/sales-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  setCashflowWidgetDataState,
  useCashflowDraft,
} from './cashflow-draft-store';
import classes from './CaisseCurrentTicket.module.css';

function shortRef(id: string): string {
  const t = id.trim();
  if (t.length <= 10) return t;
  return `${t.slice(0, 8)}…`;
}

/**
 * Ticket courant (brouillon + GET vente après finalisation) — manifeste : `data_contract.critical: true`,
 * `operation_id` = recyclique_sales_getSale. Erreur réseau / GET → contribution DATA_STALE (store partagé avec le wizard).
 */
export function CaisseCurrentTicketWidget(props: RegisteredWidgetProps): ReactNode {
  const unified = props.widgetProps?.sale_kiosk_unified_ui === true;
  const draft = useCashflowDraft();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;
  const [serverSale, setServerSale] = useState<SaleResponseV1 | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    const ticketId = draft.activeHeldSaleId ?? draft.lastSaleId;
    if (!ticketId) {
      setServerSale(null);
      return;
    }

    let cancelled = false;
    setTicketLoading(true);

    void (async () => {
      const res = await getSale(ticketId, authRef.current);
      if (cancelled) return;
      setTicketLoading(false);
      if (!res.ok) {
        setServerSale(null);
        setCashflowWidgetDataState('DATA_STALE');
        return;
      }
      setCashflowWidgetDataState('NOMINAL');
      setServerSale(res.sale);
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.activeHeldSaleId, draft.lastSaleId]);

  const activeTicketId = draft.activeHeldSaleId ?? draft.lastSaleId;
  const showServerTicket = Boolean(activeTicketId && serverSale);
  const displayLines = showServerTicket
    ? serverSale!.items.map((it, i) => ({
        key: it.id ?? `srv-${i}`,
        label: unified
          ? `${it.category} ×${it.quantity} — ${Number(it.total_price).toFixed(2)} €`
          : `${it.category} ×${it.quantity} — ${Number(it.total_price).toFixed(2)} € (poids ${it.weight} kg)`,
      }))
    : draft.lines.map((l) => ({
        key: l.id,
        label: unified
          ? `${l.category} ×${l.quantity} — ${l.totalPrice.toFixed(2)} €`
          : `${l.category} ×${l.quantity} — ${l.totalPrice.toFixed(2)} € (poids ${l.weight} kg)`,
      }));

  const displayTotal = showServerTicket ? serverSale!.total_amount : draft.totalAmount;

  return (
    <section
      className={`${classes.root}${unified ? ` ${classes.rootUnified}` : ''}`}
      data-testid="caisse-current-ticket"
      data-widget-data-state={draft.widgetDataState}
      data-operation-id="recyclique_sales_getSale"
    >
      <Title order={4}>{unified ? 'Ticket' : 'Ticket courant'}</Title>
      {!unified ? (
        <Text size="sm" c="dimmed" mb="xs">
          Contrat : lecture ticket via <code>recyclique_sales_getSale</code> (vente finalisée ou ticket en attente
          repris) ; brouillon local jusqu’au POST / finalisation.
        </Text>
      ) : null}
      {draft.activeHeldSaleId ? (
        <Alert color="blue" mb="sm" data-testid="caisse-held-ticket-banner">
          {unified ? (
            'Reprise d’un ticket en attente — vérifiez le total avant encaissement.'
          ) : (
            <>
              Mode reprise : ticket en attente — finalisation via <code>recyclique_sales_finalizeHeldSale</code>.
            </>
          )}
        </Alert>
      ) : null}
      {stale ? (
        <Alert
          color="orange"
          title={unified ? 'Vérification requise' : 'Données périmées (DATA_STALE)'}
          mb="sm"
          data-testid="caisse-ticket-stale-banner"
        >
          {unified
            ? 'Les montants affichés ne sont plus garantis. Réessayez ou rafraîchissez avant d’encaisser.'
            : 'Les informations du ticket critique ne sont plus fiables (réseau ou réponse API). Le paiement est bloqué jusqu’à rafraîchissement du contexte ou nouvelle tentative.'}
        </Alert>
      ) : null}
      {activeTicketId && ticketLoading ? (
        <Text size="sm" data-testid="caisse-ticket-loading">
          Chargement du ticket serveur…
        </Text>
      ) : null}
      {displayLines.length === 0 && !ticketLoading ? (
        <Text size="sm">{unified ? 'Aucune ligne pour le moment.' : 'Aucune ligne — étape « Lignes » du flux.'}</Text>
      ) : displayLines.length > 0 ? (
        <List size="sm" spacing="xs">
          {displayLines.map((row) => (
            <List.Item key={row.key}>{row.label}</List.Item>
          ))}
        </List>
      ) : null}
      <Text fw={600} mt="sm">
        {unified ? `Total : ${Number(displayTotal).toFixed(2)} €` : `Total ${showServerTicket ? '(serveur)' : '(saisi)'} : ${Number(displayTotal).toFixed(2)} €`}
      </Text>
      {draft.lastSaleId ? (
        <Text size="sm" mt="xs" data-testid="caisse-last-sale-id" data-sale-id={draft.lastSaleId}>
          {unified
            ? `Dernier enregistrement : réf. ${shortRef(draft.lastSaleId)}`
            : `Dernier ticket enregistré : ${draft.lastSaleId}`}
        </Text>
      ) : null}
      {draft.activeHeldSaleId && !draft.lastSaleId ? (
        <Text size="sm" mt="xs" data-testid="caisse-active-held-id" data-held-sale-id={draft.activeHeldSaleId}>
          {unified
            ? `En attente · réf. ${shortRef(draft.activeHeldSaleId)}`
            : `Ticket en attente actif : ${draft.activeHeldSaleId}`}
        </Text>
      ) : null}
      {draft.localIssueMessage ? (
        <Alert color="blue" mt="sm" data-testid="caisse-local-issue-message">
          {draft.localIssueMessage}
        </Alert>
      ) : null}
    </section>
  );
}
