import { useEffect, useRef, useState } from 'react';
import type { AuthContextPort } from '../../app/auth/auth-context-port';
import { getSalePaymentMethodOptions, type SalePaymentMethodOption } from '../../api/sales-client';

/**
 * Moyens de paiement actifs (admin expert) pour UI caisse.
 * Échec HTTP / réseau ou liste vide : `error` renseigné, `options` vide (aucune liste fictive).
 * Re-fetch quand la session (auth) change d'état, sans dépendre de l'identité d'objet `auth` (évite boucles).
 */
export function useCaissePaymentMethodOptions(
  auth: Pick<AuthContextPort, 'getAccessToken' | 'getSession'>,
): {
  readonly options: readonly SalePaymentMethodOption[];
  readonly loading: boolean;
  readonly error: string | null;
} {
  const authRef = useRef(auth);
  authRef.current = auth;

  const session = auth.getSession();
  const sessionKey = `${session.authenticated ? '1' : '0'}:${session.userId ?? ''}`;

  const [options, setOptions] = useState<readonly SalePaymentMethodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fetchOnce = () => getSalePaymentMethodOptions(authRef.current);
      let res = await fetchOnce();
      // Jeton frais juste après login / rotation : un 401 peut précéder la mise à jour du port ; un second essai court.
      if (!res.ok && res.status === 401) {
        await new Promise((r) => setTimeout(r, 400));
        if (!cancelled) res = await fetchOnce();
      }
      if (cancelled) return;
      if (!res.ok) {
        setError(res.detail);
        setOptions([]);
      } else if (res.data.length === 0) {
        setError("Aucun moyen de paiement actif — paramétrez-les dans l'admin comptable expert.");
        setOptions([]);
      } else {
        setError(null);
        setOptions(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  return { options, loading, error };
}
