/**
 * Garde super-admin — Story 17.1.
 * Redirige login si non authentifie, refuse explicitement si role non super_admin.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { permissions, user } = useAuth();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'super_admin' || permissions.includes('super_admin');

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isSuperAdmin) {
    return (
      <div data-testid="super-admin-forbidden">
        <p>Acces reserve aux super-administrateurs.</p>
      </div>
    );
  }
  return <>{children}</>;
}
