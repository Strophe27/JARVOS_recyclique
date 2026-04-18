import { Alert, List, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getSale, type SaleResponseV1 } from '../../api/sales-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  setCashflowWidgetDataState,
  ticketLineDisplayLabel,
  useCashflowDraft,
} from './cashflow-draft-store';
import { KioskFinalizeSaleDock } from './KioskFinalizeSaleDock';
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
  /**
   * Kiosque unifié : après une vente finalisée, on garde la référence serveur/confirmation,
   * mais on repart visuellement sur un ticket vide pour enchaîner le produit suivant,
   * comme sur le legacy. Les tickets "held" restent affichés depuis la vérité serveur.
   */
  const showServerTicket = Boolean(activeTicketId && serverSale && !(unified && draft.lastSaleId));
  const displayLines = showServerTicket
    ? serverSale!.items.map((it, i) => ({
        key: it.id ?? `srv-${i}`,
        label: unified
          ? `${it.category} ×${it.quantity} — ${Number(it.total_price).toFixed(2)} €`
          : `${it.category} ×${it.quantity} — ${Number(it.total_price).toFixed(2)} € (poids ${it.weight} kg)`,
      }))
    : draft.lines.map((l) => {
        const designation = ticketLineDisplayLabel(l);
        return {
          key: l.id,
          label: unified
            ? `${designation} ×${l.quantity} — ${l.totalPrice.toFixed(2)} €`
            : `${designation} ×${l.quantity} — ${l.totalPrice.toFixed(2)} € (poids ${l.weight} kg)`,
        };
      });

  const unifiedGridRows = showServerTicket
    ? serverSale!.items.map((it, i) => ({
        key: it.id ?? `srv-${i}`,
        category: it.category,
        quantity: it.quantity,
        weight: it.weight,
        total: Number(it.total_price),
      }))
    : draft.lines.map((l) => ({
        key: l.id,
        category: ticketLineDisplayLabel(l),
        quantity: l.quantity,
        weight: l.weight,
        total: l.totalPrice,
      }));

  const displayTotal = showServerTicket ? serverSale!.total_amount : draft.totalAmount;

  const kioskParcoursHint = (() => {
    if (!unified) return null;
    if (draft.lastSaleId) return null;
    if (draft.activeHeldSaleId) {
      return (
        <p className={classes.kioskTicketParcours} data-testid="caisse-ticket-parcours-hint">
          <strong>Reprise</strong> : contrôlez le total, puis encaissez via le bloc <strong>Finaliser la vente</strong> ci-dessous.
        </p>
      );
    }
    if (draft.lines.length === 0) return null;
    if (draft.totalAmount <= 0) {
      return (
        <p className={classes.kioskTicketParcours} data-testid="caisse-ticket-parcours-hint">
          Puis allez à l’étape <strong>Montant</strong> pour confirmer le total à facturer.
        </p>
      );
    }
    return (
      <p className={classes.kioskTicketParcours} data-testid="caisse-ticket-parcours-hint">
        Puis encaissement : moyen de paiement et enregistrement dans le bloc <strong>Finaliser la vente</strong> ci-dessous.
      </p>
    );
  })();

  const unifiedInner = (
    <>
      {draft.activeHeldSaleId ? (
        <Alert color="blue" mb="sm" data-testid="caisse-held-ticket-banner">
          {unified ? (
            'Reprise d’un ticket en attente — contrôlez le total avant encaissement.'
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
            ? 'Les montants affichés ne sont plus garantis. Réessayez ou actualisez avant d’encaisser.'
            : 'Les informations du ticket critique ne sont plus fiables (réseau ou réponse API). Le paiement est bloqué jusqu’à rafraîchissement du contexte ou nouvelle tentative.'}
        </Alert>
      ) : null}
      {activeTicketId && ticketLoading ? (
        <Text size="sm" data-testid="caisse-ticket-loading">
          {unified ? 'Chargement du ticket…' : 'Chargement du ticket serveur…'}
        </Text>
      ) : null}

      <div className={unified ? classes.ticketSection : undefined}>
        {unified ? (
          <Text className={classes.ticketSectionLabel} component="h3">
            Articles
          </Text>
        ) : null}
        {displayLines.length === 0 && !ticketLoading ? (
          <Text size="sm">
            {unified
              ? 'Aucun article pour l’instant — la saisie se fait à gauche.'
              : 'Aucune ligne — étape « Lignes » du flux.'}
          </Text>
        ) : displayLines.length > 0 && unified ? (
          <>
            <Text className={classes.unifiedSummary} data-testid="caisse-ticket-lines-summary">
              {unifiedGridRows.length} article{unifiedGridRows.length > 1 ? 's' : ''} — {Number(displayTotal).toFixed(2)} €
            </Text>
            <div className={classes.unifiedGrid} data-testid="caisse-ticket-lines-grid">
              <div className={classes.unifiedGridHead}>
                <span>Désignation</span>
                <span className={classes.unifiedGridCellNum}>Qté</span>
                <span className={classes.unifiedGridCellNum}>Poids</span>
                <span className={classes.unifiedGridCellNum}>Montant</span>
              </div>
              {unifiedGridRows.map((row) => (
                <div key={row.key} className={classes.unifiedGridRow}>
                  <span>{row.category}</span>
                  <span className={classes.unifiedGridCellNum}>{row.quantity}</span>
                  <span className={classes.unifiedGridCellNum}>{`${Number(row.weight).toFixed(2)} kg`}</span>
                  <span className={classes.unifiedGridCellNum}>{`${row.total.toFixed(2)} €`}</span>
                </div>
              ))}
            </div>
          </>
        ) : displayLines.length > 0 ? (
          <List size="sm" spacing="xs">
            {displayLines.map((row) => (
              <List.Item key={row.key}>{row.label}</List.Item>
            ))}
          </List>
        ) : null}
      </div>

      <div className={unified ? `${classes.ticketSection} ${classes.ticketSectionTotal}` : undefined}>
        {unified ? (
          kioskParcoursHint
        ) : (
          <Text fw={600} mt="sm">
            {`Total ${showServerTicket ? '(serveur)' : '(saisi)'} : ${Number(displayTotal).toFixed(2)} €`}
          </Text>
        )}
      </div>

      {draft.lastSaleId || (draft.activeHeldSaleId && !draft.lastSaleId) ? (
        <div className={unified ? `${classes.ticketSection} ${classes.ticketSectionRefs}` : undefined}>
          {unified ? (
            <Text className={classes.ticketSectionLabel} component="h3">
              Références
            </Text>
          ) : null}
          {draft.lastSaleId ? (
            <Text size="sm" mt={unified ? 'xs' : 'xs'} data-testid="caisse-last-sale-id" data-sale-id={draft.lastSaleId}>
              {unified
                ? `Dernière vente : ${shortRef(draft.lastSaleId)}`
                : `Dernier ticket enregistré : ${draft.lastSaleId}`}
            </Text>
          ) : null}
          {draft.activeHeldSaleId && !draft.lastSaleId ? (
            <Text
              size="sm"
              mt={unified ? 'xs' : 'xs'}
              data-testid="caisse-active-held-id"
              data-held-sale-id={draft.activeHeldSaleId}
            >
              {unified
                ? `Ticket en attente : ${shortRef(draft.activeHeldSaleId)}`
                : `Ticket en attente actif : ${draft.activeHeldSaleId}`}
            </Text>
          ) : null}
        </div>
      ) : null}

      {draft.localIssueMessage ? (
        <Alert
          color={draft.lastSaleId ? 'green' : 'blue'}
          title={draft.lastSaleId ? 'Vente enregistree avec succes' : undefined}
          mt="sm"
          data-testid="caisse-local-issue-message"
        >
          {draft.localIssueMessage}
        </Alert>
      ) : null}
    </>
  );

  return (
    <section
      className={`${classes.root}${unified ? ` ${classes.rootUnified}` : ''}`}
      data-testid="caisse-current-ticket"
      data-widget-data-state={draft.widgetDataState}
      data-operation-id="recyclique_sales_getSale"
    >
      {unified ? (
        <div className={classes.ticketKioskShell}>
          <div className={classes.ticketKioskTitleBar}>Ticket de Caisse</div>
          <div className={classes.ticketKioskBody}>{unifiedInner}</div>
          <KioskFinalizeSaleDock />
        </div>
      ) : (
        <>
          <Title order={4}>Ticket courant</Title>
          <Text size="sm" c="dimmed" mb="xs">
            Contrat : lecture ticket via <code>recyclique_sales_getSale</code> (vente finalisée ou ticket en attente
            repris) ; brouillon local jusqu’au POST / finalisation.
          </Text>
          {unifiedInner}
        </>
      )}
    </section>
  );
}
