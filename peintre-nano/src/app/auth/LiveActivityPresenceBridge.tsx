import { useEffect, useRef } from 'react';
import { postActivityPing } from '../../api/activity-client';
import { useAuthPort } from './AuthRuntimeProvider';

/** Même ordre de grandeur que le legacy post-B42 (5 min) ; réapplique le TTL Redis d’activité. */
const PING_INTERVAL_MS = 120_000;

/**
 * Pendant une session **Bearer** (terrain `LiveAuthShell`), enregistre l’activité côté API pour que
 * `GET /v1/admin/users/statuses` et les vues profil admin reflètent la présence en ligne.
 * Sans effet si `getAccessToken` est absent (démo Piste A).
 */
export function LiveActivityPresenceBridge(): null {
  const auth = useAuthPort();
  const authRef = useRef(auth);
  authRef.current = auth;

  const token = auth.getAccessToken?.()?.trim() ?? '';

  useEffect(() => {
    if (!token) return;

    const ping = () => void postActivityPing(authRef.current);

    void ping();
    const intervalId = window.setInterval(ping, PING_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) void ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token]);

  return null;
}
