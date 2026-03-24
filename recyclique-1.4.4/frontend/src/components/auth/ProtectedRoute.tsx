import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: 'user' | 'admin' | 'super-admin' | 'manager';
  requiredRoles?: Array<'user' | 'admin' | 'super-admin' | 'manager'>;
  requiredPermission?: string; // ex: 'caisse.access'
  requiredPermissions?: string[]; // B50-P4: Array of permissions (OR logic - at least one required)
  adminOnly?: boolean;
  adminPathFallback?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions, // B50-P4
  adminOnly = false,
  adminPathFallback = '/'
}: ProtectedRouteProps): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérification de rôle pour les routes admin génériques
  if (adminOnly) {
    const role = currentUser?.role;
    const isAdmin = role === 'admin' || role === 'super-admin';
    if (!isAdmin) return <Navigate to={adminPathFallback} replace />;
  }

  // Vérification de rôle simple (un seul rôle requis)
  if (requiredRole) {
    const userRole = currentUser?.role;
    if (userRole !== requiredRole) {
      return <Navigate to={adminPathFallback} replace />;
    }
  }

  // Vérification de rôles multiples (l'un des rôles est suffisant) — comme requiredPermissions : ignoré si liste vide
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = currentUser?.role;
    if (!requiredRoles.includes(userRole as any)) {
      return <Navigate to={adminPathFallback} replace />;
    }
  }

  // Permission granulaire : même logique que authStore.hasPermission (admin + super-admin = tout)
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <Navigate to={adminPathFallback} replace />;
    }
  }

  // B50-P4: permissions multiples (OR — au moins une), via hasPermission pour cohérence
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAnyPermission = requiredPermissions.some((perm) => hasPermission(perm));
    if (!hasAnyPermission) {
      return <Navigate to={adminPathFallback} replace />;
    }
  }

  return children;
}
