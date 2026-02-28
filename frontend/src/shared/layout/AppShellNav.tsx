import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useCashRegisterLock } from '../../caisse/useCashRegisterLock';
import { CAISSE_PIN_PATH, CAISSE_SESSION_CLOSE_PATH } from '../../caisse/cashRegisterRoutes';
import './app-shell.css';

export interface ShellNavItem {
  to: string;
  label: string;
  caisseOnly?: boolean;
  permissionCode?: string;
  permissionCodes?: string[];
}

const FULL_NAV_ITEMS: ShellNavItem[] = [
  { to: '/caisse', label: 'Dashboard caisses', caisseOnly: true },
  { to: '/cash-register/session/open', label: 'Ouverture session', caisseOnly: true },
  { to: '/cash-register/sale', label: 'Saisie vente', caisseOnly: true },
  { to: CAISSE_SESSION_CLOSE_PATH, label: 'Fermeture session', caisseOnly: true },
  { to: '/admin', label: 'Admin' },
  { to: '/admin/users', label: 'Utilisateurs', permissionCode: 'admin' },
  { to: '/admin/sites', label: 'Sites', permissionCode: 'admin' },
  { to: '/admin/cash-registers', label: 'Postes caisse', permissionCode: 'admin' },
  { to: '/admin/session-manager', label: 'Sessions caisse', permissionCode: 'admin' },
  { to: '/admin/reports', label: 'Rapports caisse', permissionCode: 'admin' },
  { to: '/admin/reception', label: 'Réception admin', permissionCode: 'admin' },
  { to: '/admin/health', label: 'Santé', permissionCode: 'admin' },
  { to: '/admin/audit-log', label: 'Audit log', permissionCode: 'admin' },
  { to: '/admin/email-logs', label: 'Logs email', permissionCode: 'admin' },
  { to: '/admin/settings', label: 'Paramètres', permissionCode: 'admin' },
  { to: '/admin/db', label: 'BDD (export, purge, import)', permissionCode: 'admin' },
  { to: '/admin/import/legacy', label: 'Import legacy', permissionCode: 'admin' },
  { to: '/admin/groups', label: 'Groupes', permissionCode: 'admin' },
  { to: '/admin/permissions', label: 'Permissions', permissionCode: 'admin' },
  { to: '/reception', label: 'Réception', permissionCode: 'reception.access' },
  { to: '/profil', label: 'Profil' },
  { to: '/admin/categories', label: 'Catégories', permissionCode: 'admin' },
  { to: '/admin/quick-analysis', label: 'Analyse rapide', permissionCode: 'admin' },
  { to: '/admin/vie-associative', label: 'Vie associative', permissionCodes: ['admin', 'vie_asso.access'] },
];

function isVisible(item: ShellNavItem, permissions: string[]) {
  if (item.permissionCodes) {
    return permissions.length > 0 && item.permissionCodes.some((permission) => permissions.includes(permission));
  }

  if (!item.permissionCode) {
    return true;
  }

  return permissions.length > 0 && permissions.includes(item.permissionCode);
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

function isActivePath(currentPathname: string, itemPath: string): boolean {
  const current = normalizePath(currentPathname);
  const target = normalizePath(itemPath);

  if (target === '/') {
    return current === '/';
  }

  return current === target || current.startsWith(`${target}/`);
}

export function AppShellNav() {
  const { isRestricted } = useCashRegisterLock();
  const { permissions } = useAuth();
  const location = useLocation();
  const resolvedPermissions = Array.isArray(permissions) ? permissions : [];

  const items = isRestricted
    ? [
        ...FULL_NAV_ITEMS.filter((item) => item.caisseOnly),
        { to: CAISSE_PIN_PATH, label: 'Déverrouiller par PIN', caisseOnly: true as const },
      ]
    : FULL_NAV_ITEMS.filter((item) => isVisible(item, resolvedPermissions));

  return (
    <nav aria-label="Navigation principale" className="app-shell-nav" data-testid="app-shell-nav">
      <ul className="app-shell-nav__list">
        {items.map((item) => {
          const isActive = isActivePath(location.pathname, item.to);

          return (
            <li key={item.to} className="app-shell-nav__item">
              <Link
                to={item.to}
                data-testid={`nav-${item.to.replace(/\//g, '-').replace(/^\-/, '') || 'root'}`}
                className={`app-shell-nav__link${isActive ? ' app-shell-nav__link--active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
