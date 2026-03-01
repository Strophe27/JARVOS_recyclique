import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useCashRegisterLock } from '../../caisse/useCashRegisterLock';
import { CAISSE_PIN_PATH } from '../../caisse/cashRegisterRoutes';
import './app-shell.css';

export interface ShellNavItem {
  to: string;
  label: string;
  caisseOnly?: boolean;
  permissionCode?: string;
}

/** Onglets principaux — navigation horizontale parite 1.4.4. */
const HORIZONTAL_NAV_ITEMS: ShellNavItem[] = [
  { to: '/caisse', label: 'Tableau de bord' },
  { to: '/caisse', label: 'Caisse' },
  { to: '/reception', label: 'Réception', permissionCode: 'reception.access' },
  { to: '/admin', label: 'Administration', permissionCode: 'admin' },
];

/** Mode caisse verrouille : uniquement Caisse + deverrouiller PIN. */
const CAISSE_LOCKED_ITEMS: ShellNavItem[] = [
  { to: '/caisse', label: 'Caisse', caisseOnly: true },
  { to: CAISSE_PIN_PATH, label: 'Déverrouiller par PIN', caisseOnly: true },
];

function isVisible(item: ShellNavItem, permissions: string[]): boolean {
  if (!item.permissionCode) return true;
  return permissions.length > 0 && permissions.includes(item.permissionCode);
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

function isActivePath(currentPathname: string, itemPath: string): boolean {
  const current = normalizePath(currentPathname);
  const target = normalizePath(itemPath);

  if (target === '/') return current === '/';

  if (target === '/caisse') {
    return current === '/caisse' || current.startsWith('/cash-register/');
  }
  if (target === '/admin') {
    return current === '/admin' || current.startsWith('/admin/');
  }
  if (target === '/reception') {
    return current === '/reception' || current.startsWith('/reception/');
  }

  return current === target || current.startsWith(`${target}/`);
}

export function AppShellNav() {
  const { isRestricted } = useCashRegisterLock();
  const { permissions } = useAuth();
  const location = useLocation();
  const resolvedPermissions = Array.isArray(permissions) ? permissions : [];

  const items = isRestricted
    ? CAISSE_LOCKED_ITEMS
    : HORIZONTAL_NAV_ITEMS.filter((item) => isVisible(item, resolvedPermissions));

  return (
    <nav aria-label="Navigation principale" className="app-shell-nav app-shell-nav--horizontal" data-testid="app-shell-nav">
      <ul className="app-shell-nav__list">
        {items.map((item) => {
          const isActive = isActivePath(location.pathname, item.to);

          return (
            <li key={`${item.to}-${item.label}`} className="app-shell-nav__item">
              <Link
                to={item.to}
                data-testid={`nav-${item.to.replace(/\//g, '-').replace(/^-/, '') || 'root'}-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
