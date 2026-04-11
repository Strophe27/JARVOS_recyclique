import { Menu, UnstyledButton } from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import classes from './LiveShellUserMenu.module.css';

export type LiveShellUserMenuProps = {
  readonly displayLabel: string;
  readonly onLogout: () => void;
  /** Route manifestée `/dashboard/benevole` (CREOS) — alignement menu utilisateur legacy. */
  readonly onPersonalDashboard?: () => void;
};

/**
 * Menu utilisateur auth live : libellé issu de {@link AuthSessionState.userDisplayLabel}
 * (dérivé `AuthUserV2` au login OpenAPI, persisté avec le jeton).
 */
export function LiveShellUserMenu({ displayLabel, onLogout, onPersonalDashboard }: LiveShellUserMenuProps) {
  const label = displayLabel.trim() || 'Utilisateur';
  return (
    <Menu position="bottom-end" shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton
          type="button"
          className={classes.trigger}
          aria-haspopup="menu"
          data-testid="live-shell-user-menu-trigger"
        >
          <span className={classes.triggerLabel}>{label}</span>
          <ChevronDown size={16} aria-hidden />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {onPersonalDashboard ? (
          <Menu.Item onClick={onPersonalDashboard} data-testid="live-shell-user-menu-personal-dashboard">
            Dashboard personnel
          </Menu.Item>
        ) : null}
        <Menu.Item onClick={onLogout} data-testid="live-shell-user-menu-logout">
          Déconnexion
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
