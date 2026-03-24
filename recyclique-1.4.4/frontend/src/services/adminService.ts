// Import des types générés automatiquement
import {
  UserResponse,
  UserRole,
  UserStatus,
  UserStatusUpdate,
  UserUpdate,
  AdminUser as GeneratedAdminUser,
  AdminResponse,
  PendingUserResponse,
  UserHistoryResponse,
  ActivityEvent,
  UsersApi,
  AdminApi
} from '../generated';
import axiosClient from '../api/axiosClient';

// Types locaux pour l'historique
export interface HistoryEvent {
  id: string;
  type: 'ADMINISTRATION' | 'VENTE' | 'DÉPÔT' | 'CONNEXION' | 'AUTRE';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Types locaux pour contourner les problèmes d'export
export interface UserRoleUpdate {
  role: UserRole;
}

export interface UserCreate {
  telegram_id?: string | null;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  notes?: string;
  skills?: string;
  availability?: string;
  role?: UserRole;
  status?: UserStatus;
  is_active?: boolean;
  site_id?: string;
}

export interface UserGroupUpdate {
  group_ids: string[];
}

export interface UsersFilter {
  skip?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

// Re-export des types générés pour la compatibilité
export { UserRole, UserStatus };
export type { UserStatusUpdate, UserUpdate };

// UI-facing AdminUser type extended with new optional profile fields
export type AdminUser = GeneratedAdminUser & {
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  notes?: string | null;
  skills?: string | null;
  availability?: string | null;
};

// Helper pour convertir UserResponse en AdminUser
function convertToAdminUser(user: UserResponse): AdminUser {
  return {
    id: user.id,
    telegram_id: typeof user.telegram_id === 'string' ? parseInt(user.telegram_id) : user.telegram_id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || `User ${user.telegram_id}`,
    email: (user as any).email ?? null,
    phone_number: (user as any).phone_number ?? null,
    address: (user as any).address ?? null,
    notes: (user as any).notes ?? null,
    skills: (user as any).skills ?? null,
    availability: (user as any).availability ?? null,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    is_active: user.is_active ?? false,
    site_id: user.site_id,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

// Service d'administration utilisant l'API générée
export const adminService = {
  /**
   * Récupère la liste des utilisateurs avec filtres
   */
  async getUsers(filters: UsersFilter = {}): Promise<AdminUser[]> {
    try {
      // Utiliser l'API générée
      const users = await UsersApi.usersapiv1usersget(filters);

      // Convertir UserResponse en AdminUser et appliquer les filtres
      let adminUsers: AdminUser[] = users.map(convertToAdminUser);

      // Appliquer les filtres côté client (en attendant que l'API les supporte)
      if (filters.role) {
        adminUsers = adminUsers.filter(user => user.role === filters.role);
      }
      if (filters.status) {
        adminUsers = adminUsers.filter(user => user.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        adminUsers = adminUsers.filter(user =>
          user.username?.toLowerCase().includes(searchLower) ||
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower) ||
          user.full_name?.toLowerCase().includes(searchLower)
        );
      }

      return adminUsers;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  },

  /**
   * Met à jour le rôle d'un utilisateur
   */
  async updateUserRole(userId: string, roleUpdate: UserRoleUpdate): Promise<AdminResponse> {
    try {
      // Utiliser l'API générée
      const response = await AdminApi.userroleapiv1adminusersuseridroleput(userId, roleUpdate);
      return response;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      throw error;
    }
  },

  /**
   * Récupère un utilisateur par son ID
   */
  async getUserById(userId: string): Promise<AdminUser> {
    try {
      // Utiliser l'API générée
      const user = await UsersApi.userapiv1usersuseridget(userId);

      // Convertir UserResponse en AdminUser
      return convertToAdminUser(user);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Met à jour le statut d'un utilisateur (admin)
   */
  async updateUserStatus(userId: string, statusUpdate: UserStatusUpdate): Promise<AdminResponse> {
    try {
      // Utiliser l'endpoint Admin dédié (client généré)
      const response = await AdminApi.userstatusapiv1adminusersuseridstatusput(userId, statusUpdate);
      return response;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  },

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(userData: UserCreate): Promise<AdminUser> {
    try {
      // Utiliser l'API générée pour créer un utilisateur
      const newUser = await UsersApi.userapiv1userspost(userData as any);

      // Convertir UserResponse en AdminUser
      const adminUser = convertToAdminUser(newUser);

      return adminUser;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId: string, userData: UserUpdate & Partial<Pick<UserCreate, 'email'|'phone_number'|'address'|'notes'|'skills'|'availability'>>): Promise<AdminResponse> {
    try {
      // Utiliser l'API générée
      const updatedUser = await UsersApi.userapiv1usersuseridput(userId, userData as any);

      // Convertir en AdminUser
      const adminUser = convertToAdminUser(updatedUser);

      return {
        data: adminUser,
        message: 'Bénévole mis à jour avec succès',
        success: true
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Met à jour les groupes d'un utilisateur
   */
  async updateUserGroups(userId: string, groupData: UserGroupUpdate): Promise<AdminResponse> {
    try {
      const response = await axiosClient.put(`/v1/admin/users/${userId}/groups`, groupData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des groupes de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Supprime un utilisateur
   */
  async deleteUser(userId: string): Promise<AdminResponse> {
    try {
      // Utiliser l'API générée
      await UsersApi.userapiv1usersuseriddelete(userId);
      
      return {
        data: undefined,
        message: 'Bénévole supprimé avec succès',
        success: true
      };
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Récupère la liste des utilisateurs en attente d'approbation
   */
  async getPendingUsers(): Promise<AdminUser[]> {
    try {
      // Utiliser l'API générée
      const pendingUsers = await AdminApi.pendingusersapiv1adminuserspendingget();
      
      // Convertir PendingUserResponse en AdminUser
      return pendingUsers.map((user) => ({
        id: user.id,
        telegram_id: typeof user.telegram_id === 'string' ? parseInt(user.telegram_id) : user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        is_active: true, // Les utilisateurs en attente sont considérés comme actifs
        site_id: undefined, // Pas disponible dans PendingUserResponse
        created_at: user.created_at,
        updated_at: user.created_at // Même date pour les utilisateurs en attente
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
      throw error;
    }
  },

  /**
   * Approuve un utilisateur en attente
   */
  async approveUser(userId: string, message?: string): Promise<AdminResponse> {
    try {
      // Utiliser l'API générée
      const result = await AdminApi.userapiv1adminusersuseridapprovepost(userId, { message });
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Rejette un utilisateur en attente
   */
  async rejectUser(userId: string, reason?: string): Promise<AdminResponse> {
    try {
      // Utiliser l'API générée
      const result = await AdminApi.userapiv1adminusersuseridrejectpost(userId, { reason });
      return result;
    } catch (error) {
      console.error('Erreur lors du rejet de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Déclenche la réinitialisation du mot de passe pour un utilisateur
   */
  async triggerResetPassword(userId: string): Promise<AdminResponse> {
    try {
      const response = await axiosClient.post(`/v1/admin/users/${userId}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du déclenchement de la réinitialisation du mot de passe:', error);
      throw error;
    }
  },

  /**
   * Récupère l'historique d'un utilisateur avec filtres optionnels
   */
  async getUserHistory(userId: string, filters: any = {}): Promise<HistoryEvent[]> {
    try {
      // Construire les paramètres de requête pour l'API
      const params: any = {};
      
      // Convertir les dates au format ISO pour l'API
      if (filters.startDate) {
        params.date_from = filters.startDate.toISOString();
      }
      if (filters.endDate) {
        params.date_to = filters.endDate.toISOString();
      }
      
      // Convertir les types d'événements pour l'API
      if (filters.eventType && filters.eventType.length > 0) {
        // Mapper les types frontend vers les types API
        const typeMapping: Record<string, string> = {
          'ADMINISTRATION': 'ADMINISTRATION',
          'VENTE': 'VENTE',
          'DÉPÔT': 'DEPOT',
          'CONNEXION': 'LOGIN',
          'AUTRE': 'AUTRE'
        };
        params.event_type = filters.eventType
          .map((type: string) => typeMapping[type] || type)
          .join(',');
      }
      
      // Ajouter la pagination
      if (filters.skip !== undefined) {
        params.skip = filters.skip;
      }
      if (filters.limit !== undefined) {
        params.limit = filters.limit;
      }

      console.log(`Récupération de l'historique pour l'utilisateur ${userId} avec filtres:`, params);

      // Appel à l'API réelle
      const response = await AdminApi.userhistoryapiv1adminusersuseridhistoryget(userId, params);
      
      // Convertir les données de l'API vers le format attendu par le frontend
      const historyEvents = response.events.map((event: any) => ({
        id: event.id,
        type: adminService.mapEventTypeFromApi(event.event_type),
        description: event.description,
        timestamp: event.date,
        metadata: event.metadata || {}
      }));

      return historyEvents;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique utilisateur:', error);
      throw error;
    }
  },

  /**
   * Mappe les types d'événements de l'API vers les types frontend
   */
  mapEventTypeFromApi(apiEventType: string): 'ADMINISTRATION' | 'VENTE' | 'DÉPÔT' | 'CONNEXION' | 'AUTRE' {
    const typeMapping: Record<string, 'ADMINISTRATION' | 'VENTE' | 'DÉPÔT' | 'CONNEXION' | 'AUTRE'> = {
      'ADMINISTRATION': 'ADMINISTRATION',
      'VENTE': 'VENTE',
      'DEPOT': 'DÉPÔT',
      'LOGIN': 'CONNEXION',
      'SESSION CAISSE': 'CONNEXION', // Les sessions de caisse sont considérées comme des connexions
      'AUTRE': 'AUTRE'
    };
    
    return typeMapping[apiEventType] || 'AUTRE';
  },

  /**
   * Exporte la base de données (réservé aux Super-Admins)
   * Télécharge un fichier .dump (format binaire PostgreSQL) de backup de la base de données
   */
  async exportDatabase(): Promise<void> {
    try {
      // Utiliser axiosClient directement car c'est un téléchargement de fichier
      const response = await axiosClient.post('/v1/admin/db/export', {}, {
        responseType: 'blob', // Important pour recevoir un fichier binaire
        timeout: 1200000, // 20 minutes timeout (import peut être long, surtout avec --clean qui supprime les contraintes)
      });

      // Créer un blob à partir de la réponse (format binaire)
      const blob = new Blob([response.data], { type: 'application/octet-stream' });

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'recyclic_db_export.dump';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Créer un lien temporaire et déclencher le téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`Export de base de données téléchargé: ${filename}`);
    } catch (error) {
      console.error('Erreur lors de l\'export de la base de données:', error);
      throw error;
    }
  },

  /**
   * Purge les données transactionnelles (réservé aux Super-Admins)
   * Supprime toutes les données de ventes, réceptions et sessions de caisse
   */
  async purgeTransactionalData(): Promise<{ message: string; deleted_records: Record<string, number>; timestamp: string }> {
    try {
      const response = await axiosClient.post('/v1/admin/db/purge-transactions');
      console.log('Purge des données transactionnelles réussie:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la purge des données transactionnelles:', error);
      throw error;
    }
  },

  /**
   * Récupère les paramètres de session (durée d'expiration des tokens)
   */
  async getSessionSettings(): Promise<{ token_expiration_minutes: number }> {
    try {
      const response = await axiosClient.get('/v1/admin/settings/session');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres de session:', error);
      throw error;
    }
  },

  /**
   * Met à jour les paramètres de session (durée d'expiration des tokens)
   */
  async updateSessionSettings(tokenExpirationMinutes: number): Promise<{ token_expiration_minutes: number }> {
    try {
      const response = await axiosClient.put('/v1/admin/settings/session', {
        token_expiration_minutes: tokenExpirationMinutes
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres de session:', error);
      throw error;
    }
  },

  async getActivityThreshold(): Promise<{ activity_threshold_minutes: number; description?: string }> {
    try {
      const response = await axiosClient.get('/v1/admin/settings/activity-threshold');
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du seuil d'activité:", error);
      throw error;
    }
  },

  async updateActivityThreshold(minutes: number): Promise<{ message: string; activity_threshold_minutes: number }> {
    try {
      const response = await axiosClient.put('/v1/admin/settings/activity-threshold', {
        activity_threshold_minutes: minutes,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du seuil d'activité:", error);
      throw error;
    }
  },

  /**
   * Importe une sauvegarde de base de données (réservé aux Super-Admins)
   * Remplace la base de données existante par le contenu du fichier .dump (format binaire PostgreSQL)
   */
  async importDatabase(file: File): Promise<{ message: string; imported_file: string; backup_created: string; backup_path: string; timestamp: string }> {
    try {
      // Créer un FormData pour l'upload de fichier
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post('/v1/admin/db/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes timeout (import peut être long)
      });

      console.log('Import de base de données réussi:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'import de la base de données:', error);
      throw error;
    }
  },

  /**
   * Récupère les paramètres email (Brevo)
   */
  async getEmailSettings(): Promise<{
    from_name: string;
    from_address: string;
    default_recipient: string | null;
    has_api_key: boolean;
    webhook_secret_configured: boolean;
  }> {
    try {
      const response = await axiosClient.get('/v1/admin/settings/email');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres email:', error);
      throw error;
    }
  },

  /**
   * Met à jour les paramètres email (Brevo)
   */
  async updateEmailSettings(settings: {
    from_name?: string;
    from_address?: string;
    default_recipient?: string;
  }): Promise<{
    from_name: string;
    from_address: string;
    default_recipient: string | null;
    has_api_key: boolean;
    webhook_secret_configured: boolean;
  }> {
    try {
      const response = await axiosClient.put('/v1/admin/settings/email', settings);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres email:', error);
      throw error;
    }
  },

  /**
   * Envoie un email de test
   */
  async sendTestEmail(to_email: string): Promise<{
    success: boolean;
    message: string;
    to_email: string;
    from_email: string;
    from_name: string;
  }> {
    try {
      const response = await axiosClient.post('/v1/admin/settings/email/test', {
        to_email
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de test:', error);
      throw error;
    }
  },

  /**
   * Récupère les statuts en ligne/hors ligne de tous les utilisateurs
   */
  async getUserStatuses(): Promise<{
    user_statuses: Array<{
      user_id: string;
      is_online: boolean;
      last_login: string | null;
      minutes_since_login: number | null;
    }>;
    total_count: number;
    online_count: number;
    offline_count: number;
    timestamp: string;
  }> {
    try {
      const response = await axiosClient.get('/v1/admin/users/statuses');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statuts des utilisateurs:', error);
      throw error;
    }
  },

  /**
   * Force un nouveau mot de passe pour un utilisateur (Super Admin uniquement)
   */
  async forceUserPassword(userId: string, newPassword: string, reason?: string): Promise<AdminResponse> {
    try {
      const response = await axiosClient.post(`/v1/admin/users/${userId}/force-password`, {
        new_password: newPassword,
        reason: reason
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors du forçage du mot de passe:', error);
      throw error;
    }
  },

  /**
   * Réinitialise le PIN d'un utilisateur
   */
  async resetUserPin(userId: string): Promise<{ message: string; user_id: string; username: string }> {
    try {
      const response = await axiosClient.post(`/admin/users/${userId}/reset-pin`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du PIN:', error);
      throw error;
    }
  },

  /**
   * Récupère les logs d'audit pour les imports de base de données
   */
  async getDatabaseImportHistory(page: number = 1, pageSize: number = 5): Promise<{
    entries: Array<{
      id: string;
      timestamp: string;
      actor_username: string | null;
      description: string;
      details: {
        filename?: string;
        file_size_mb?: number;
        duration_seconds?: number;
        success: boolean;
        error_message?: string;
        backup_created?: string;
      };
    }>;
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      const response = await axiosClient.get('/v1/admin/audit-log', {
        params: {
          page,
          page_size: pageSize,
          action_type: 'db_import'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des imports:', error);
      throw error;
    }
  },

  /**
   * Récupère la liste des modèles LLM OpenRouter disponibles pour l'import legacy
   * Story B47-P6: Amélioration UX LLM
   */
  async getLegacyImportLLMModels(): Promise<{
    models: Array<{
      id: string;
      name: string;
      provider: string | null;
      is_free: boolean;
      context_length: number | null;
      pricing: { prompt: string; completion: string } | null;
    }>;
    error: string | null;
    default_model_id: string | null;
  }> {
    try {
      const response = await axiosClient.get('/v1/admin/import/legacy/llm-models');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles LLM:', error);
      throw error;
    }
  },

  /**
   * Valide la conformité d'un CSV legacy
   * Story B47-P7: Validation de Conformité CSV et Nettoyage Automatique
   * @param file Fichier CSV à valider
   */
  async validateLegacyImportCSV(file: File): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
    statistics: {
      total_lines: number;
      valid_lines: number;
      invalid_lines: number;
      missing_columns: string[];
      extra_columns: string[];
      date_errors: number;
      weight_errors: number;
      structure_issues: number;
    };
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post('/v1/admin/import/legacy/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute timeout
      });

      return response.data;
    } catch (error: any) {
      console.error('Erreur lors de la validation du CSV:', error);
      // En cas d'erreur, retourner un rapport invalide
      return {
        is_valid: false,
        errors: [error.response?.data?.detail || 'Erreur lors de la validation du CSV'],
        warnings: [],
        statistics: {
          total_lines: 0,
          valid_lines: 0,
          invalid_lines: 0,
          missing_columns: [],
          extra_columns: [],
          date_errors: 0,
          weight_errors: 0,
          structure_issues: 0,
        },
      };
    }
  },

  /**
   * Nettoie un CSV legacy non conforme
   * Story B47-P7: Validation de Conformité CSV et Nettoyage Automatique
   * @param file Fichier CSV legacy à nettoyer
   */
  async cleanLegacyImportCSV(file: File): Promise<{
    cleaned_csv_base64: string;
    filename: string;
    statistics: {
      total_lines: number;
      cleaned_lines: number;
      excluded_lines: number;
      orphan_lines: number;
      dates_normalized: number;
      weights_rounded: number;
      date_distribution: Record<string, number>;
    };
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post('/v1/admin/import/legacy/clean', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors du nettoyage du CSV legacy:', error);
      throw error;
    }
  },

  /**
   * Analyse un CSV legacy pour proposer des mappings de catégories
   * @param file Fichier CSV nettoyé à analyser
   * @param confidenceThreshold Seuil de confiance pour le fuzzy matching (0-100, optionnel)
   * @param llmModelId ID du modèle LLM à utiliser (override de la config, optionnel)
   */
  async analyzeLegacyImport(
    file: File,
    confidenceThreshold?: number,
    llmModelId?: string | null
  ): Promise<{
    mappings: Record<string, { category_id: string; category_name: string; confidence: number }>;
    unmapped: string[];
    statistics: {
      total_lines: number;
      valid_lines: number;
      error_lines: number;
      unique_categories: number;
      mapped_categories: number;
      unmapped_categories: number;
      llm_attempted: boolean;
      llm_model_used: string | null;
      llm_batches_total: number;
      llm_batches_succeeded: number;
      llm_batches_failed: number;
      llm_mapped_categories: number;
      llm_unmapped_after_llm: number;
      llm_last_error: string | null;
      llm_avg_confidence: number | null;
      llm_provider_used: string | null;
    };
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (confidenceThreshold !== undefined) {
        formData.append('confidence_threshold', confidenceThreshold.toString());
      }
      if (llmModelId) {
        formData.append('llm_model_id', llmModelId);
      }

      const response = await axiosClient.post('/v1/admin/import/legacy/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'analyse du CSV legacy:', error);
      throw error;
    }
  },

  /**
   * Relance uniquement le LLM sur des catégories spécifiques (sans refaire le fuzzy matching)
   * Story B47-P6: Amélioration UX LLM
   * @param unmappedCategories Liste des catégories à mapper via LLM uniquement
   * @param llmModelId ID du modèle LLM à utiliser (optionnel, utilise la config par défaut si non fourni)
   */
  async analyzeLegacyImportLLMOnly(
    unmappedCategories: string[],
    llmModelId?: string | null
  ): Promise<{
    mappings: Record<string, { category_id: string; category_name: string; confidence: number }>;
    statistics: {
      llm_attempted: boolean;
      llm_model_used: string | null;
      llm_batches_total: number;
      llm_batches_succeeded: number;
      llm_batches_failed: number;
      llm_mapped_categories: number;
      llm_unmapped_after_llm: number;
      llm_last_error: string | null;
      llm_avg_confidence: number | null;
      llm_provider_used: string | null;
    };
  }> {
    try {
      const response = await axiosClient.post('/v1/admin/import/legacy/analyze/llm-only', {
        unmapped_categories: unmappedCategories,
        llm_model_id: llmModelId || null,
      }, {
        timeout: 300000, // 5 minutes timeout
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la relance LLM ciblée:', error);
      throw error;
    }
  },

  /**
   * Calcule le récapitulatif de ce qui sera importé avec les mappings fournis
   * Story B47-P10: Simplification Workflow et Récapitulatif Pré-Import
   * @param csvFile Fichier CSV nettoyé à prévisualiser
   * @param mappingFile Fichier JSON de mapping validé
   */
  async previewLegacyImport(
    csvFile: File,
    mappingFile: File
  ): Promise<{
    total_lines: number;
    total_kilos: number;
    unique_dates: number;
    unique_categories: number;
    by_category: Array<{
      category_name: string;
      category_id: string;
      line_count: number;
      total_kilos: number;
    }>;
    by_date: Array<{
      date: string;
      line_count: number;
      total_kilos: number;
    }>;
    unmapped_categories: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('mapping_file', mappingFile);

      const response = await axiosClient.post('/v1/admin/import/legacy/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute timeout pour le preview
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors du calcul du récapitulatif:', error);
      throw error;
    }
  },

  /**
   * Exécute l'import legacy avec le CSV et le fichier de mapping validé
   * @param csvFile Fichier CSV nettoyé à importer
   * @param mappingFile Fichier JSON de mapping validé
   */
  async executeLegacyImport(
    csvFile: File,
    mappingFile: File,
    importDate?: string
  ): Promise<{
    report: {
      postes_created: number;
      postes_reused: number;
      tickets_created: number;
      lignes_imported: number;
      errors: string[];
      total_errors: number;
    };
    message: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('mapping_file', mappingFile);
      if (importDate) {
        formData.append('import_date', importDate);
      }

      const response = await axiosClient.post('/v1/admin/import/legacy/execute', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes timeout pour l'import
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'import legacy:', error);
      throw error;
    }
  },

  /**
   * Télécharge le template CSV offline pour les réceptions
   * Story B47-P4: Template CSV Offline & Documentation
   */
  async downloadReceptionOfflineTemplate(): Promise<void> {
    try {
      const response = await axiosClient.get('/v1/admin/templates/reception-offline.csv', {
        responseType: 'blob',
      });

      // Créer un blob à partir de la réponse
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'template-reception-offline.csv';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Créer un lien temporaire et déclencher le téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`Template CSV offline téléchargé: ${filename}`);
    } catch (error) {
      console.error('Erreur lors du téléchargement du template:', error);
      throw error;
    }
  },

  async exportRemappedLegacyImportCSV(
    csvFile: File,
    mappingFile: File
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('mapping_file', mappingFile);

      const response = await axiosClient.post('/v1/admin/import/legacy/export-remapped', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        timeout: 60000, // 1 minute timeout
      });

      // Créer un blob à partir de la réponse
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'import_legacy_remappe.csv';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Créer un lien temporaire et déclencher le téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`CSV remappé téléchargé: ${filename}`);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV remappé:', error);
      throw error;
    }
  }
};

export default adminService;
