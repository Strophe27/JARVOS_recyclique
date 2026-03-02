/**
 * Garde auth — Story 17-HF-1.
 * Redirige vers /login si l'utilisateur n'est pas authentifié.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuth();
  const location = useLocation();

  if (!isHydrated) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
