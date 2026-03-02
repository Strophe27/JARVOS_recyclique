/**
 * Ticket.tsx — Panneau ticket lateral de caisse (Story 18-8 T1).
 * Affiche les lignes du panier, la distinction visuelle don, le poids total
 * et le bouton Finaliser. Composant d'affichage pur (pas de paiements).
 */
import { Stack, Text, Group, TextInput, Alert, Button } from '@mantine/core';
import type { CartLine } from './CashRegisterSalePage';
import styles from './CashRegisterSalePage.module.css';

export function isDonLine(line: CartLine): boolean {
  const name = (line.preset_name ?? line.category_name ?? '').toLowerCase();
  return line.unit_price === 0 || name.includes('don');
}

interface TicketProps {
  cart: CartLine[];
  onRemoveLine: (id: string) => void;
  onFinalize: () => void;
  total: number;
  note: string;
  onNoteChange: (note: string) => void;
  saleDate: string;
  onSaleDateChange: (date: string) => void;
  error: string | null;
}

export function Ticket({
  cart,
  onRemoveLine,
  onFinalize,
  total,
  note,
  onNoteChange,
  saleDate,
  onSaleDateChange,
  error,
}: TicketProps) {
  const weightTotal = cart
    .filter((l) => l.weight != null)
    .reduce((s, l) => s + (l.weight ?? 0), 0);
  const hasWeight = weightTotal > 0;

  return (
    <aside className={styles.ticketPanel} data-testid="caisse-ticket-panel">
      <div className={styles.ticketHeader}>
        <Text fw={700} size="md">Ticket de Caisse</Text>
      </div>

      <div className={styles.ticketBody}>
        {cart.length === 0 ? (
          <Text size="sm" c="dimmed" data-testid="cart-empty">
            Aucun article ajoute
          </Text>
        ) : (
          <Stack gap={0}>
            {cart.map((l) => (
              <div
                key={l.id}
                className={
                  isDonLine(l)
                    ? `${styles.ticketLine} ${styles.ticketLineDon}`
                    : styles.ticketLine
                }
              >
                <div>
                  <Text size="sm">{l.preset_name ?? l.category_name}</Text>
                  <Text size="xs" c="dimmed">
                    x{l.quantity}
                    {l.weight != null ? ` \u2014 ${l.weight} kg` : ''}
                  </Text>
                </div>
                <Group gap={4} align="center" wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {(l.unit_price / 100).toFixed(2)} €
                  </Text>
                  <Text size="sm" fw={500}>
                    {(l.total_price / 100).toFixed(2)} €
                  </Text>
                  <button
                    type="button"
                    className={styles.ticketLineRemove}
                    data-testid={`remove-line-${l.id}`}
                    aria-label={`Supprimer ${l.preset_name ?? l.category_name ?? "l'article"}`}
                    onClick={() => onRemoveLine(l.id)}
                  >
                    x
                  </button>
                </Group>
              </div>
            ))}
          </Stack>
        )}

        {hasWeight && (
          <Text
            size="xs"
            className={styles.ticketWeightTotal}
            data-testid="ticket-weight-total"
          >
            Poids total : {weightTotal.toFixed(2)} kg
          </Text>
        )}

        <Stack gap="xs" mt="sm">
          <TextInput
            size="xs"
            label="Note"
            id="sale-note"
            data-testid="sale-note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <TextInput
            size="xs"
            label="Date (opt.)"
            id="sale-date"
            type="date"
            data-testid="sale-date"
            value={saleDate}
            onChange={(e) => onSaleDateChange(e.target.value)}
          />
        </Stack>
      </div>

      <div className={styles.ticketFooter}>
        {error && (
          <Alert color="red" p="xs" data-testid="sale-error">
            {error}
          </Alert>
        )}
        <Group justify="space-between">
          <Text size="sm">{cart.length} articles</Text>
          <Text size="md" fw={700} data-testid="cart-total">
            {(total / 100).toFixed(2)} €
          </Text>
        </Group>
        <Button
          color="green"
          fullWidth
          disabled={cart.length === 0}
          data-testid="btn-finaliser"
          onClick={onFinalize}
        >
          Finaliser
        </Button>
      </div>
    </aside>
  );
}
