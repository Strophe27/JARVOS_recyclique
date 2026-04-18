import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerAuthNavigate,
  unregisterAuthNavigate,
} from '../../api/authNavigation';

/**
 * Enregistre `navigate` pour les flux hors arbre React (ex. intercepteur axios 401).
 * Doit rester monté sous BrowserRouter.
 */
export default function RegisterRouterNavigate(): null {
  const navigate = useNavigate();

  useEffect(() => {
    registerAuthNavigate(navigate);
    return () => unregisterAuthNavigate();
  }, [navigate]);

  return null;
}
