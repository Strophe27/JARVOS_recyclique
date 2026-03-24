/**
 * Service pour logger les événements transactionnels depuis le frontend.
 * 
 * B48-P2: Permet d'envoyer des logs pour les événements qui se produisent côté client
 * (TICKET_OPENED, TICKET_RESET, etc.) au backend pour analyse.
 */
import axiosClient from '../api/axiosClient';

export interface TransactionLogRequest {
  event: 'TICKET_OPENED' | 'TICKET_RESET' | 'ANOMALY_DETECTED';
  session_id: string;
  cart_state?: {
    items_count: number;
    items: Array<{
      id: string;
      category: string;
      weight: number;
      price: number;
    }>;
    total: number;
  };
  cart_state_before?: {
    items_count: number;
    items: Array<{
      id: string;
      category: string;
      weight: number;
      price: number;
    }>;
    total: number;
  };
  anomaly?: boolean;
  details?: string; // B48-P2: Détails pour les anomalies (ex: "Item added but no ticket is explicitly opened")
}

export const transactionLogService = {
  /**
   * Envoie un log transactionnel au backend.
   * Best-effort: les erreurs sont silencieuses pour ne pas interrompre les opérations.
   */
  async logEvent(logData: TransactionLogRequest): Promise<void> {
    try {
      const response = await axiosClient.post('/v1/transactions/log', logData);
      console.debug('[TransactionLog] Log envoyé avec succès:', logData.event, response.data);
    } catch (error) {
      // Best-effort: ne pas interrompre les opérations si le logging échoue
      // Mais logger l'erreur pour diagnostic
      console.error('[TransactionLog] Erreur lors de l\'envoi du log:', error, 'Event:', logData.event);
    }
  },

  /**
   * Log l'ouverture d'un ticket (quand le panier est initialisé ou qu'un item est ajouté).
   */
  async logTicketOpened(
    sessionId: string,
    cartState: TransactionLogRequest['cart_state'],
    anomaly: boolean = false
  ): Promise<void> {
    await this.logEvent({
      event: 'TICKET_OPENED',
      session_id: sessionId,
      cart_state: cartState,
      anomaly
    });
  },

  /**
   * Log le reset d'un ticket (quand le panier est vidé).
   */
  async logTicketReset(
    sessionId: string,
    cartStateBefore: TransactionLogRequest['cart_state_before'],
    anomaly: boolean = false
  ): Promise<void> {
    await this.logEvent({
      event: 'TICKET_RESET',
      session_id: sessionId,
      cart_state_before: cartStateBefore,
      anomaly
    });
  },

  /**
   * Log une anomalie détectée (ex: item ajouté sans ticket ouvert).
   */
  async logAnomaly(
    sessionId: string,
    cartState?: TransactionLogRequest['cart_state'],
    details?: string
  ): Promise<void> {
    await this.logEvent({
      event: 'ANOMALY_DETECTED',
      session_id: sessionId,
      cart_state: cartState,
      anomaly: true,
      details: details || "Item added but no ticket is explicitly opened"
    });
  }
};

