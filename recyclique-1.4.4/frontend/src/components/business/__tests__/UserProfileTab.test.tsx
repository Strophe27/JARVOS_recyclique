import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileTab } from '../UserProfileTab';
import { AdminUser } from '../../../services/adminService';
import { UserRole, UserStatus } from '../../../generated';

import { vi } from 'vitest';

// Mock du service admin
vi.mock('../../../services/adminService', () => ({
  adminService: {
    updateUser: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
    triggerResetPassword: vi.fn(),
  }
}));

// Mock des notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn()
  }
}));

const mockUser: AdminUser = {
  id: '1',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  full_name: 'Test User',
  role: UserRole.USER,
  status: UserStatus.APPROVED,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(component);
};

describe('UserProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should display user information', () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    expect(screen.getByText('Bénévole')).toBeInTheDocument();
    expect(screen.getByText('Oui')).toBeInTheDocument();
  });

  it('sans username : pas de @ Telegram, libellé explicite', () => {
    renderWithProvider(
      <UserProfileTab
        user={{
          ...mockUser,
          username: undefined,
        }}
      />
    );

    expect(screen.getByText('Pas de nom d’utilisateur')).toBeInTheDocument();
    expect(screen.queryByText('ID Telegram:')).not.toBeInTheDocument();
  });

  it('affiche le bouton de modification', () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);
    
    expect(screen.getByText('Modifier le profil')).toBeInTheDocument();
  });

  it('ouvre la modale d\'édition quand on clique sur le bouton', () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);
    
    const editButton = screen.getByText('Modifier le profil');
    fireEvent.click(editButton);
    
    expect(screen.getByText('Modifier le profil utilisateur')).toBeInTheDocument();
  });

  it('pré-remplit le formulaire avec les données de l\'utilisateur', () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);
    
    const editButton = screen.getByText('Modifier le profil');
    fireEvent.click(editButton);
    
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
  });

  it('permet de fermer la modale', () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);
    
    const editButton = screen.getByText('Modifier le profil');
    fireEvent.click(editButton);
    
    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Modifier le profil utilisateur')).not.toBeInTheDocument();
  });

  it('sauvegarde les modifications et met à jour l\'utilisateur', async () => {
    const user = userEvent.setup();
    const mockUpdateUser = vi.fn().mockResolvedValue({});
    const { adminService } = await import('../../../services/adminService');
    adminService.updateUser = mockUpdateUser;

    const mockOnUserUpdate = vi.fn();

    renderWithProvider(<UserProfileTab user={mockUser} onUserUpdate={mockOnUserUpdate} />);
    
    await user.click(screen.getByText('Modifier le profil'));

    await user.clear(screen.getByLabelText('Prénom'));
    await user.type(screen.getByLabelText('Prénom'), 'Jane');
    
    await user.clear(screen.getByLabelText('Nom d\'utilisateur'));
    await user.type(screen.getByLabelText('Nom d\'utilisateur'), 'jane_doe');

    await user.click(screen.getByText('Sauvegarder'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith('1', expect.objectContaining({
        first_name: 'Jane',
        username: 'jane_doe'
      }));
    });
    
    await waitFor(() => {
      expect(mockOnUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
        first_name: 'Jane',
        username: 'jane_doe'
      }));
    });

    // Vérifier que la modale est fermée
    expect(screen.queryByText('Modifier le profil utilisateur')).not.toBeInTheDocument();
  });

  it('appelle triggerResetPassword quand on clique sur le bouton', async () => {
    const user = userEvent.setup();
    const mockTriggerResetPassword = vi.fn().mockResolvedValue({});
    const { adminService } = await import('../../../services/adminService');
    adminService.triggerResetPassword = mockTriggerResetPassword;

    renderWithProvider(<UserProfileTab user={mockUser} />);
    
    await user.click(screen.getByText('Modifier le profil'));

    const resetButtons = screen.getAllByRole('button', { name: /réinitialiser le mot de passe/i });
    await user.click(resetButtons[resetButtons.length - 1]);

    await waitFor(() => {
      expect(mockTriggerResetPassword).toHaveBeenCalledWith('1');
    });
  });

  it('ne doit pas afficher de données sensibles dans le formulaire', async () => {
    const sensitiveUser = {
      ...mockUser,
      hashed_password: 'sensitive_password_hash',
    };
    
    renderWithProvider(<UserProfileTab user={sensitiveUser} />);
    
    const editButton = screen.getByText('Modifier le profil');
    await userEvent.click(editButton);
    
    // Vérifier qu'aucun champ n'affiche le mot de passe
    const passwordInFirstName = screen.queryByDisplayValue('sensitive_password_hash');
    expect(passwordInFirstName).not.toBeInTheDocument();
  });

  it('valide les champs requis', async () => {
    renderWithProvider(<UserProfileTab user={mockUser} />);

    const editButton = screen.getByText('Modifier le profil');
    fireEvent.click(editButton);

    // Vider le champ prénom
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'A' } });

    const saveButton = screen.getByText('Sauvegarder');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Le prénom doit contenir au moins 2 caractères')).toBeInTheDocument();
    });
  });

  it('affiche le libellé Utilisateur actif dans la modale d’édition', async () => {
    const user = userEvent.setup();
    renderWithProvider(<UserProfileTab user={mockUser} />);
    await user.click(screen.getByText('Modifier le profil'));
    expect(screen.getByText('Utilisateur actif')).toBeInTheDocument();
  });
});
