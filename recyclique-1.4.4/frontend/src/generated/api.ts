/**
 * Client API généré automatiquement à partir de la spécification OpenAPI
 * Source: ../api/openapi.json
 * Généré le: 2026-03-26T23:12:28.535Z
 */

import type { AxiosResponse } from 'axios';
import apiClient from '../api/axiosClient';
import {
  UserResponse,
  UserCreate,
  UserUpdate,
  UserRoleUpdate,
  UserStatusUpdate,
  ApiResponse,
  PaginatedResponse,
  ApiError
} from './types';

// Utilise l'instance centralisée axiosClient
// ============================================================================
// API CLASSES
// ============================================================================

export class HealthApi {
    /**
   * Health Check
   */
  static async checkv1healthget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/health/`);
    return response.data;
  }

    /**
   * Get Version
   */
  static async versionv1healthversionget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/health/version`);
    return response.data;
  }
}
export class UsersApi {
    /**
   * Get Me
   */
  static async mev1usersmeget(): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await apiClient.get(`/v1/users/me`);
    return response.data;
  }

    /**
   * Update Me
   */
  static async mev1usersmeput(data?: any): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await apiClient.put(`/v1/users/me`, data);
    return response.data;
  }

    /**
   * Change My Password
   */
  static async mypasswordv1usersmepasswordput(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.put(`/v1/users/me/password`, data);
    return response.data;
  }

    /**
   * Set User Pin
   */
  static async userpinv1usersmepinput(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.put(`/v1/users/me/pin`, data);
    return response.data;
  }

    /**
   * Get My Permissions
   */
  static async mypermissionsv1usersmepermissionsget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/users/me/permissions`);
    return response.data;
  }

    /**
   * Get Active Operators
   */
  static async activeoperatorsv1usersactiveoperatorsget(): Promise<UserResponse[]> {
    const response: AxiosResponse<UserResponse[]> = await apiClient.get(`/v1/users/active-operators`);
    return response.data;
  }

    /**
   * Get Users
   */
  static async usersv1usersget(params?: any): Promise<UserResponse[]> {
    const response: AxiosResponse<UserResponse[]> = await apiClient.get(`/v1/users/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Create User
   */
  static async userv1userspost(data?: any): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await apiClient.post(`/v1/users/`, data);
    return response.data;
  }

    /**
   * Get User
   */
  static async userv1usersuseridget(user_id): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await apiClient.get(`/v1/users/${user_id}`);
    return response.data;
  }

    /**
   * Update User
   */
  static async userv1usersuseridput(user_id, data?: any): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await apiClient.put(`/v1/users/${user_id}`, data);
    return response.data;
  }

    /**
   * Delete User
   */
  static async userv1usersuseriddelete(user_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/users/${user_id}`);
    return response.data;
  }
}
export class SitesApi {
    /**
   * Lister les sites
   */
  static async sitesv1sitesget(params?: any): Promise<SiteResponse[]> {
    const response: AxiosResponse<SiteResponse[]> = await apiClient.get(`/v1/sites/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Créer un site
   */
  static async sitev1sitespost(data?: any): Promise<SiteResponse> {
    const response: AxiosResponse<SiteResponse> = await apiClient.post(`/v1/sites/`, data);
    return response.data;
  }

    /**
   * Récupérer un site par ID
   */
  static async sitev1sitessiteidget(site_id): Promise<SiteResponse> {
    const response: AxiosResponse<SiteResponse> = await apiClient.get(`/v1/sites/${site_id}`);
    return response.data;
  }

    /**
   * Mettre à jour un site
   */
  static async sitev1sitessiteidpatch(site_id, data?: any): Promise<SiteResponse> {
    const response: AxiosResponse<SiteResponse> = await apiClient.patch(`/v1/sites/${site_id}`, data);
    return response.data;
  }

    /**
   * Supprimer un site
   */
  static async sitev1sitessiteiddelete(site_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/sites/${site_id}`);
    return response.data;
  }
}
export class DepositsApi {
    /**
   * Get Deposits
   */
  static async depositsv1depositsget(params?: any): Promise<DepositResponse[]> {
    const response: AxiosResponse<DepositResponse[]> = await apiClient.get(`/v1/deposits/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Create Deposit
   */
  static async depositv1depositspost(data?: any): Promise<DepositResponse> {
    const response: AxiosResponse<DepositResponse> = await apiClient.post(`/v1/deposits/`, data);
    return response.data;
  }

    /**
   * Get Deposit
   */
  static async depositv1depositsdepositidget(deposit_id): Promise<DepositResponse> {
    const response: AxiosResponse<DepositResponse> = await apiClient.get(`/v1/deposits/${deposit_id}`);
    return response.data;
  }

    /**
   * Finalize Deposit
   */
  static async depositv1depositsdepositidput(deposit_id, data?: any): Promise<DepositResponse> {
    const response: AxiosResponse<DepositResponse> = await apiClient.put(`/v1/deposits/${deposit_id}`, data);
    return response.data;
  }

    /**
   * Get Validation Metrics
   */
  static async validationmetricsv1depositsmetricsvalidationperformanceget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/deposits/metrics/validation-performance`);
    return response.data;
  }
}
export class SalesApi {
    /**
   * Get Sales
   */
  static async salesv1salesget(params?: any): Promise<SaleResponse[]> {
    const response: AxiosResponse<SaleResponse[]> = await apiClient.get(`/v1/sales/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Create Sale
   */
  static async salev1salespost(data?: any): Promise<SaleResponse> {
    const response: AxiosResponse<SaleResponse> = await apiClient.post(`/v1/sales/`, data);
    return response.data;
  }

    /**
   * Get Sale
   */
  static async salev1salessaleidget(sale_id): Promise<SaleResponse> {
    const response: AxiosResponse<SaleResponse> = await apiClient.get(`/v1/sales/${sale_id}`);
    return response.data;
  }

    /**
   * Update Sale Note
   */
  static async salenotev1salessaleidput(sale_id, data?: any): Promise<SaleResponse> {
    const response: AxiosResponse<SaleResponse> = await apiClient.put(`/v1/sales/${sale_id}`, data);
    return response.data;
  }

    /**
   * Update Sale Item Weight
   */
  static async saleitemweightv1salessaleiditemsitemidweightpatch(sale_id, item_id, data?: any): Promise<SaleItemResponse> {
    const response: AxiosResponse<SaleItemResponse> = await apiClient.patch(`/v1/sales/${sale_id}/items/${item_id}/weight`, data);
    return response.data;
  }

    /**
   * Update Sale Item
   */
  static async saleitemv1salessaleiditemsitemidpatch(sale_id, item_id, data?: any): Promise<SaleItemResponse> {
    const response: AxiosResponse<SaleItemResponse> = await apiClient.patch(`/v1/sales/${sale_id}/items/${item_id}`, data);
    return response.data;
  }
}
export class CashSessionsApi {
    /**
   * Créer une session de caisse
   */
  static async cashsessionv1cashsessionspost(data?: any): Promise<CashSessionResponse> {
    const response: AxiosResponse<CashSessionResponse> = await apiClient.post(`/v1/cash-sessions/`, data);
    return response.data;
  }

    /**
   * Lister les sessions de caisse
   */
  static async cashsessionsv1cashsessionsget(params?: any): Promise<CashSessionListResponse> {
    const response: AxiosResponse<CashSessionListResponse> = await apiClient.get(`/v1/cash-sessions/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Statut de session pour un poste de caisse
   */
  static async cashsessionstatusv1cashsessionsstatusregisteridget(register_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/cash-sessions/status/${register_id}`);
    return response.data;
  }

    /**
   * Vérifier si une session différée existe pour une date
   */
  static async deferredsessionbydatev1cashsessionsdeferredcheckget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/cash-sessions/deferred/check?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Session de caisse ouverte pour l'utilisateur connecté
   */
  static async currentcashsessionv1cashsessionscurrentget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/cash-sessions/current`);
    return response.data;
  }

    /**
   * Récupérer les détails d'une session de caisse
   */
  static async cashsessiondetailv1cashsessionssessionidget(session_id): Promise<CashSessionDetailResponse> {
    const response: AxiosResponse<CashSessionDetailResponse> = await apiClient.get(`/v1/cash-sessions/${session_id}`);
    return response.data;
  }

    /**
   * Update Cash Session
   */
  static async cashsessionv1cashsessionssessionidput(session_id, data?: any): Promise<CashSessionResponse> {
    const response: AxiosResponse<CashSessionResponse> = await apiClient.put(`/v1/cash-sessions/${session_id}`, data);
    return response.data;
  }

    /**
   * Fermer une session de caisse
   */
  static async cashsessionv1cashsessionssessionidclosepost(session_id, data?: any): Promise<CashSessionResponse> {
    const response: AxiosResponse<CashSessionResponse> = await apiClient.post(`/v1/cash-sessions/${session_id}/close`, data);
    return response.data;
  }

    /**
   * Get Cash Session Stats
   */
  static async cashsessionstatsv1cashsessionsstatssummaryget(params?: any): Promise<CashSessionStats> {
    const response: AxiosResponse<CashSessionStats> = await apiClient.get(`/v1/cash-sessions/stats/summary?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Récupérer les métriques d'étape d'une session
   */
  static async sessionstepmetricsv1cashsessionssessionidstepget(session_id): Promise<CashSessionStepResponse> {
    const response: AxiosResponse<CashSessionStepResponse> = await apiClient.get(`/v1/cash-sessions/${session_id}/step`);
    return response.data;
  }

    /**
   * Mettre à jour l'étape d'une session
   */
  static async sessionstepv1cashsessionssessionidstepput(session_id, data?: any): Promise<CashSessionStepResponse> {
    const response: AxiosResponse<CashSessionStepResponse> = await apiClient.put(`/v1/cash-sessions/${session_id}/step`, data);
    return response.data;
  }
}
export class CashRegistersApi {
    /**
   * Lister les postes de caisse
   */
  static async cashregistersv1cashregistersget(params?: any): Promise<CashRegisterResponse[]> {
    const response: AxiosResponse<CashRegisterResponse[]> = await apiClient.get(`/v1/cash-registers/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Créer un poste de caisse
   */
  static async cashregisterv1cashregisterspost(data?: any): Promise<CashRegisterResponse> {
    const response: AxiosResponse<CashRegisterResponse> = await apiClient.post(`/v1/cash-registers/`, data);
    return response.data;
  }

    /**
   * Statut des postes de caisse
   */
  static async cashregistersstatusv1cashregistersstatusget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/cash-registers/status`);
    return response.data;
  }

    /**
   * Récupérer un poste de caisse par ID
   */
  static async cashregisterv1cashregistersregisteridget(register_id): Promise<CashRegisterResponse> {
    const response: AxiosResponse<CashRegisterResponse> = await apiClient.get(`/v1/cash-registers/${register_id}`);
    return response.data;
  }

    /**
   * Mettre à jour un poste de caisse
   */
  static async cashregisterv1cashregistersregisteridpatch(register_id, data?: any): Promise<CashRegisterResponse> {
    const response: AxiosResponse<CashRegisterResponse> = await apiClient.patch(`/v1/cash-registers/${register_id}`, data);
    return response.data;
  }

    /**
   * Supprimer un poste de caisse
   */
  static async cashregisterv1cashregistersregisteriddelete(register_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/cash-registers/${register_id}`);
    return response.data;
  }
}
export class AdminApi {
    /**
   * Test simple de l'endpoint admin
   */
  static async adminendpointv1adminhealthtestget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health-test`);
    return response.data;
  }

    /**
   * Health check public
   */
  static async publichealthv1adminhealthpublicget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health/public`);
    return response.data;
  }

    /**
   * Health check base de données
   */
  static async databasehealthv1adminhealthdatabaseget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health/database`);
    return response.data;
  }

    /**
   * Métriques de santé du système
   */
  static async systemhealthv1adminhealthget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health`);
    return response.data;
  }

    /**
   * Anomalies détectées
   */
  static async anomaliesv1adminhealthanomaliesget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health/anomalies`);
    return response.data;
  }

    /**
   * Statut du scheduler
   */
  static async schedulerstatusv1adminhealthschedulerget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/health/scheduler`);
    return response.data;
  }

    /**
   * Logs transactionnels (Admin)
   */
  static async transactionlogsv1admintransactionlogsget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/transaction-logs?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Journal d'audit (Admin)
   */
  static async auditlogv1adminauditlogget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/audit-log?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Liste des logs d'emails (Admin)
   */
  static async emaillogsv1adminemaillogsget(params?: any): Promise<EmailLogListResponse> {
    const response: AxiosResponse<EmailLogListResponse> = await apiClient.get(`/v1/admin/email-logs?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Récupérer le seuil d'activité
   */
  static async activitythresholdv1adminsettingsactivitythresholdget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/settings/activity-threshold`);
    return response.data;
  }

    /**
   * Modifier le seuil d'activité
   */
  static async activitythresholdv1adminsettingsactivitythresholdput(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.put(`/v1/admin/settings/activity-threshold`, data);
    return response.data;
  }

    /**
   * Liste des utilisateurs (Admin)
   */
  static async usersv1adminusersget(params?: any): Promise<AdminUser[]> {
    const response: AxiosResponse<AdminUser[]> = await apiClient.get(`/v1/admin/users?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Statuts des utilisateurs (Admin)
   */
  static async usersstatusesv1adminusersstatusesget(): Promise<UserStatusesResponse> {
    const response: AxiosResponse<UserStatusesResponse> = await apiClient.get(`/v1/admin/users/statuses`);
    return response.data;
  }

    /**
   * Liste des utilisateurs en attente (Admin)
   */
  static async pendingusersv1adminuserspendingget(): Promise<PendingUserResponse[]> {
    const response: AxiosResponse<PendingUserResponse[]> = await apiClient.get(`/v1/admin/users/pending`);
    return response.data;
  }

    /**
   * Historique d'activité d'un utilisateur (Admin)
   */
  static async userhistoryv1adminusersuseridhistoryget(user_id, params?: any): Promise<UserHistoryResponse> {
    const response: AxiosResponse<UserHistoryResponse> = await apiClient.get(`/v1/admin/users/${user_id}/history?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Modifier le rôle d'un utilisateur (Admin)
   */
  static async userrolev1adminusersuseridroleput(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.put(`/v1/admin/users/${user_id}/role`, data);
    return response.data;
  }

    /**
   * Modifier le statut actif d'un utilisateur (Admin)
   */
  static async userstatusv1adminusersuseridstatusput(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.put(`/v1/admin/users/${user_id}/status`, data);
    return response.data;
  }

    /**
   * Mettre à jour le profil d'un utilisateur (Admin)
   */
  static async userprofilev1adminusersuseridput(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.put(`/v1/admin/users/${user_id}`, data);
    return response.data;
  }

    /**
   * Mettre à jour les groupes d'un utilisateur (Admin)
   */
  static async usergroupsv1adminusersuseridgroupsput(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.put(`/v1/admin/users/${user_id}/groups`, data);
    return response.data;
  }

    /**
   * Déclencher la réinitialisation du mot de passe (Admin)
   */
  static async resetpasswordv1adminusersuseridresetpasswordpost(user_id): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.post(`/v1/admin/users/${user_id}/reset-password`);
    return response.data;
  }

    /**
   * Forcer un nouveau mot de passe (Super Admin uniquement)
   */
  static async userpasswordv1adminusersuseridforcepasswordpost(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.post(`/v1/admin/users/${user_id}/force-password`, data);
    return response.data;
  }

    /**
   * Réinitialiser le PIN d'un utilisateur
   */
  static async userpinv1adminusersuseridresetpinpost(user_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/users/${user_id}/reset-pin`);
    return response.data;
  }

    /**
   * Corriger les sessions différées bloquées (Super Admin uniquement)
   */
  static async blockeddeferredsessionsv1admincashsessionsfixblockeddeferredpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/cash-sessions/fix-blocked-deferred`);
    return response.data;
  }

    /**
   * Fusionner les sessions différées dupliquées pour une même date (Super Admin uniquement)
   */
  static async duplicatedeferredsessionsv1admincashsessionsmergeduplicatedeferredpost(params?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.post(`/v1/admin/cash-sessions/merge-duplicate-deferred?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Télécharger le template CSV offline pour les réceptions
   */
  static async receptionofflinetemplatev1admintemplatesreceptionofflinecsvget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/templates/reception-offline.csv`);
    return response.data;
  }

    /**
   * Approuver un utilisateur (Admin)
   */
  static async userv1adminusersuseridapprovepost(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.post(`/v1/admin/users/${user_id}/approve`, data);
    return response.data;
  }

    /**
   * Rejeter un utilisateur (Admin)
   */
  static async userv1adminusersuseridrejectpost(user_id, data?: any): Promise<AdminResponse> {
    const response: AxiosResponse<AdminResponse> = await apiClient.post(`/v1/admin/users/${user_id}/reject`, data);
    return response.data;
  }

    /**
   * Test des notifications (retiré)
   */
  static async notificationsv1adminhealthtestnotificationspost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/health/test-notifications`);
    return response.data;
  }

    /**
   * Get Admin Session Metrics
   */
  static async adminsessionmetricsv1adminsessionsmetricsget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/sessions/metrics?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Lister les rapports de sessions de caisse
   */
  static async cashsessionreportsv1adminreportscashsessionsget(): Promise<ReportListResponse> {
    const response: AxiosResponse<ReportListResponse> = await apiClient.get(`/v1/admin/reports/cash-sessions`);
    return response.data;
  }

    /**
   * Télécharger un rapport de session de caisse par ID de session
   */
  static async cashsessionreportbyidv1adminreportscashsessionsbysessionsessionidget(session_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/reports/cash-sessions/by-session/${session_id}`);
    return response.data;
  }

    /**
   * Telecharger un rapport de session de caisse
   */
  static async cashsessionreportv1adminreportscashsessionsfilenameget(filename, params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/admin/reports/cash-sessions/${filename}?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Exporter toutes les sessions de caisse filtrées
   */
  static async bulkcashsessionsv1adminreportscashsessionsexportbulkpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/reports/cash-sessions/export-bulk`, data);
    return response.data;
  }

    /**
   * Exporter tous les tickets de réception filtrés
   */
  static async bulkreceptionticketsv1adminreportsreceptionticketsexportbulkpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/reports/reception-tickets/export-bulk`, data);
    return response.data;
  }

    /**
   * Get Alert Thresholds
   */
  static async alertthresholdsv1adminsettingsalertthresholdsget(params?: any): Promise<AlertThresholdsResponse> {
    const response: AxiosResponse<AlertThresholdsResponse> = await apiClient.get(`/v1/admin/settings/alert-thresholds?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Put Alert Thresholds
   */
  static async alertthresholdsv1adminsettingsalertthresholdsput(data?: any): Promise<AlertThresholdsResponse> {
    const response: AxiosResponse<AlertThresholdsResponse> = await apiClient.put(`/v1/admin/settings/alert-thresholds`, data);
    return response.data;
  }

    /**
   * Get Session Settings
   */
  static async sessionsettingsv1adminsettingssessionget(): Promise<SessionSettingsResponse> {
    const response: AxiosResponse<SessionSettingsResponse> = await apiClient.get(`/v1/admin/settings/session`);
    return response.data;
  }

    /**
   * Update Session Settings
   */
  static async sessionsettingsv1adminsettingssessionput(data?: any): Promise<SessionSettingsResponse> {
    const response: AxiosResponse<SessionSettingsResponse> = await apiClient.put(`/v1/admin/settings/session`, data);
    return response.data;
  }

    /**
   * Get Email Settings
   */
  static async emailsettingsv1adminsettingsemailget(): Promise<EmailSettingsResponse> {
    const response: AxiosResponse<EmailSettingsResponse> = await apiClient.get(`/v1/admin/settings/email`);
    return response.data;
  }

    /**
   * Update Email Settings
   */
  static async emailsettingsv1adminsettingsemailput(data?: any): Promise<EmailSettingsResponse> {
    const response: AxiosResponse<EmailSettingsResponse> = await apiClient.put(`/v1/admin/settings/email`, data);
    return response.data;
  }

    /**
   * Test Email Settings
   */
  static async emailsettingsv1adminsettingsemailtestpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/settings/email/test`, data);
    return response.data;
  }

    /**
   * Get Dashboard Stats
   */
  static async dashboardstatsv1admindashboardstatsget(params?: any): Promise<DashboardStatsResponse> {
    const response: AxiosResponse<DashboardStatsResponse> = await apiClient.get(`/v1/admin/dashboard/stats?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Export manuel de la base de données (Super Admin uniquement)
   */
  static async databasev1admindbexportpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/db/export`);
    return response.data;
  }

    /**
   * Purge sécurisée des données transactionnelles (Super Admin uniquement)
   */
  static async transactionaldatav1admindbpurgetransactionspost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/db/purge-transactions`);
    return response.data;
  }

    /**
   * Import de sauvegarde de base de données (Super Admin uniquement)
   */
  static async databasev1admindbimportpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/db/import`, data);
    return response.data;
  }

    /**
   * Liste des groupes
   */
  static async groupsv1admingroupsget(params?: any): Promise<GroupResponse[]> {
    const response: AxiosResponse<GroupResponse[]> = await apiClient.get(`/v1/admin/groups/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Créer un groupe
   */
  static async groupv1admingroupspost(data?: any): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.post(`/v1/admin/groups/`, data);
    return response.data;
  }

    /**
   * Détails d'un groupe
   */
  static async groupv1admingroupsgroupidget(group_id): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.get(`/v1/admin/groups/${group_id}`);
    return response.data;
  }

    /**
   * Mettre à jour un groupe
   */
  static async groupv1admingroupsgroupidput(group_id, data?: any): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.put(`/v1/admin/groups/${group_id}`, data);
    return response.data;
  }

    /**
   * Supprimer un groupe
   */
  static async groupv1admingroupsgroupiddelete(group_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/admin/groups/${group_id}`);
    return response.data;
  }

    /**
   * Assigner des permissions à un groupe
   */
  static async permissionstogroupv1admingroupsgroupidpermissionspost(group_id, data?: any): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.post(`/v1/admin/groups/${group_id}/permissions`, data);
    return response.data;
  }

    /**
   * Retirer une permission d'un groupe
   */
  static async permissionfromgroupv1admingroupsgroupidpermissionspermissioniddelete(group_id, permission_id): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.delete(`/v1/admin/groups/${group_id}/permissions/${permission_id}`);
    return response.data;
  }

    /**
   * Assigner des utilisateurs à un groupe
   */
  static async userstogroupv1admingroupsgroupiduserspost(group_id, data?: any): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.post(`/v1/admin/groups/${group_id}/users`, data);
    return response.data;
  }

    /**
   * Retirer un utilisateur d'un groupe
   */
  static async userfromgroupv1admingroupsgroupidusersuseriddelete(group_id, user_id): Promise<GroupDetailResponse> {
    const response: AxiosResponse<GroupDetailResponse> = await apiClient.delete(`/v1/admin/groups/${group_id}/users/${user_id}`);
    return response.data;
  }

    /**
   * Liste des permissions
   */
  static async permissionsv1adminpermissionsget(params?: any): Promise<PermissionResponse[]> {
    const response: AxiosResponse<PermissionResponse[]> = await apiClient.get(`/v1/admin/permissions/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Créer une permission
   */
  static async permissionv1adminpermissionspost(data?: any): Promise<PermissionResponse> {
    const response: AxiosResponse<PermissionResponse> = await apiClient.post(`/v1/admin/permissions/`, data);
    return response.data;
  }

    /**
   * Détails d'une permission
   */
  static async permissionv1adminpermissionspermissionidget(permission_id): Promise<PermissionResponse> {
    const response: AxiosResponse<PermissionResponse> = await apiClient.get(`/v1/admin/permissions/${permission_id}`);
    return response.data;
  }

    /**
   * Mettre à jour une permission
   */
  static async permissionv1adminpermissionspermissionidput(permission_id, data?: any): Promise<PermissionResponse> {
    const response: AxiosResponse<PermissionResponse> = await apiClient.put(`/v1/admin/permissions/${permission_id}`, data);
    return response.data;
  }

    /**
   * Supprimer une permission
   */
  static async permissionv1adminpermissionspermissioniddelete(permission_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/admin/permissions/${permission_id}`);
    return response.data;
  }

    /**
   * Lister les modèles LLM OpenRouter pour l'import legacy
   */
  static async legacyimportllmmodelsv1adminimportlegacyllmmodelsget(): Promise<LLMModelsResponse> {
    const response: AxiosResponse<LLMModelsResponse> = await apiClient.get(`/v1/admin/import/legacy/llm-models`);
    return response.data;
  }

    /**
   * Analyser un CSV legacy pour import
   */
  static async legacyimportv1adminimportlegacyanalyzepost(data?: any): Promise<LegacyImportAnalyzeResponse> {
    const response: AxiosResponse<LegacyImportAnalyzeResponse> = await apiClient.post(`/v1/admin/import/legacy/analyze`, data);
    return response.data;
  }

    /**
   * Exécuter l'import legacy avec mapping validé
   */
  static async legacyimportv1adminimportlegacyexecutepost(data?: any): Promise<LegacyImportExecuteResponse> {
    const response: AxiosResponse<LegacyImportExecuteResponse> = await apiClient.post(`/v1/admin/import/legacy/execute`, data);
    return response.data;
  }

    /**
   * Relancer uniquement le LLM sur des catégories non mappées
   */
  static async legacyimportllmonlyv1adminimportlegacyanalyzellmonlypost(data?: any): Promise<LLMOnlyResponse> {
    const response: AxiosResponse<LLMOnlyResponse> = await apiClient.post(`/v1/admin/import/legacy/analyze/llm-only`, data);
    return response.data;
  }

    /**
   * Valider la conformité d'un CSV legacy
   */
  static async legacyimportv1adminimportlegacyvalidatepost(data?: any): Promise<LegacyImportValidationResponse> {
    const response: AxiosResponse<LegacyImportValidationResponse> = await apiClient.post(`/v1/admin/import/legacy/validate`, data);
    return response.data;
  }

    /**
   * Prévisualiser le récapitulatif d'import
   */
  static async legacyimportv1adminimportlegacypreviewpost(data?: any): Promise<LegacyImportPreviewResponse> {
    const response: AxiosResponse<LegacyImportPreviewResponse> = await apiClient.post(`/v1/admin/import/legacy/preview`, data);
    return response.data;
  }

    /**
   * Exporter le CSV avec les catégories remappées
   */
  static async remappedlegacyimportv1adminimportlegacyexportremappedpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/admin/import/legacy/export-remapped`, data);
    return response.data;
  }

    /**
   * Nettoyer un CSV legacy
   */
  static async legacyimportv1adminimportlegacycleanpost(data?: any): Promise<LegacyImportCleanResponse> {
    const response: AxiosResponse<LegacyImportCleanResponse> = await apiClient.post(`/v1/admin/import/legacy/clean`, data);
    return response.data;
  }
}
export class MonitoringApi {
    /**
   * Send Test Email
   */
  static async testemailv1monitoringtestemailpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/test-email`, data);
    return response.data;
  }

    /**
   * Get Email Metrics
   */
  static async emailmetricsv1monitoringemailmetricsget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/email/metrics?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Email Metrics Prometheus
   */
  static async emailmetricsprometheusv1monitoringemailmetricsprometheusget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/email/metrics/prometheus`);
    return response.data;
  }

    /**
   * Reset Email Metrics
   */
  static async emailmetricsv1monitoringemailmetricsresetpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/email/metrics/reset`);
    return response.data;
  }

    /**
   * Get Classification Performance
   */
  static async classificationperformancev1monitoringclassificationperformanceget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/classification/performance?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Export Classification Metrics
   */
  static async classificationmetricsv1monitoringclassificationperformanceexportpost(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/classification/performance/export?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Classification Health
   */
  static async classificationhealthv1monitoringclassificationhealthget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/classification/health`);
    return response.data;
  }

    /**
   * Get Cache Stats
   */
  static async cachestatsv1monitoringclassificationcachestatsget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/classification/cache/stats`);
    return response.data;
  }

    /**
   * Clear Classification Cache
   */
  static async classificationcachev1monitoringclassificationcacheclearpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/classification/cache/clear`);
    return response.data;
  }

    /**
   * Export Classification Cache
   */
  static async classificationcachev1monitoringclassificationcacheexportpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/classification/cache/export`);
    return response.data;
  }

    /**
   * Get Auth Metrics
   */
  static async authmetricsv1monitoringauthmetricsget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/auth/metrics?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Auth Metrics Prometheus
   */
  static async authmetricsprometheusv1monitoringauthmetricsprometheusget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/auth/metrics/prometheus`);
    return response.data;
  }

    /**
   * Reset Auth Metrics
   */
  static async authmetricsv1monitoringauthmetricsresetpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/auth/metrics/reset`);
    return response.data;
  }

    /**
   * Get Session Metrics
   */
  static async sessionmetricsv1monitoringsessionsmetricsget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/sessions/metrics?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Session Metrics Prometheus
   */
  static async sessionmetricsprometheusv1monitoringsessionsmetricsprometheusget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/monitoring/sessions/metrics/prometheus`);
    return response.data;
  }

    /**
   * Reset Session Metrics
   */
  static async sessionmetricsv1monitoringsessionsmetricsresetpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/monitoring/sessions/metrics/reset`);
    return response.data;
  }
}
export class AuthApi {
    /**
   * Login
   */
  static async v1authloginpost(data?: any): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(`/v1/auth/login`, data);
    return response.data;
  }

    /**
   * Signup
   */
  static async v1authsignuppost(data?: any): Promise<SignupResponse> {
    const response: AxiosResponse<SignupResponse> = await apiClient.post(`/v1/auth/signup`, data);
    return response.data;
  }

    /**
   * Forgot Password
   */
  static async passwordv1authforgotpasswordpost(data?: any): Promise<ForgotPasswordResponse> {
    const response: AxiosResponse<ForgotPasswordResponse> = await apiClient.post(`/v1/auth/forgot-password`, data);
    return response.data;
  }

    /**
   * Reset Password
   */
  static async passwordv1authresetpasswordpost(data?: any): Promise<ResetPasswordResponse> {
    const response: AxiosResponse<ResetPasswordResponse> = await apiClient.post(`/v1/auth/reset-password`, data);
    return response.data;
  }

    /**
   * Authenticate With Pin
   */
  static async withpinv1authpinpost(data?: any): Promise<PinAuthResponse> {
    const response: AxiosResponse<PinAuthResponse> = await apiClient.post(`/v1/auth/pin`, data);
    return response.data;
  }

    /**
   * Logout
   */
  static async v1authlogoutpost(): Promise<LogoutResponse> {
    const response: AxiosResponse<LogoutResponse> = await apiClient.post(`/v1/auth/logout`);
    return response.data;
  }

    /**
   * Renouveler l'access token
   */
  static async tokenv1authrefreshpost(data?: any): Promise<RefreshTokenResponse> {
    const response: AxiosResponse<RefreshTokenResponse> = await apiClient.post(`/v1/auth/refresh`, data);
    return response.data;
  }
}
export class EmailApi {
    /**
   * Brevo Webhook
   */
  static async webhookv1emailwebhookpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/email/webhook`);
    return response.data;
  }

    /**
   * Get Email Status
   */
  static async emailstatusv1emailstatusemailaddressget(email_address, params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/email/status/${email_address}?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Email Events
   */
  static async emaileventsv1emaileventsemailaddressget(email_address, params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/email/events/${email_address}?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Email Service Health
   */
  static async servicehealthv1emailhealthget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/email/health`);
    return response.data;
  }
}
export class ReceptionApi {
    /**
   * Open Poste
   */
  static async postev1receptionpostesopenpost(data?: any): Promise<OpenPosteResponse> {
    const response: AxiosResponse<OpenPosteResponse> = await apiClient.post(`/v1/reception/postes/open`, data);
    return response.data;
  }

    /**
   * Close Poste
   */
  static async postev1receptionpostesposteidclosepost(poste_id): Promise<CloseResponse> {
    const response: AxiosResponse<CloseResponse> = await apiClient.post(`/v1/reception/postes/${poste_id}/close`);
    return response.data;
  }

    /**
   * Create Ticket
   */
  static async ticketv1receptionticketspost(data?: any): Promise<CreateTicketResponse> {
    const response: AxiosResponse<CreateTicketResponse> = await apiClient.post(`/v1/reception/tickets`, data);
    return response.data;
  }

    /**
   * Get Tickets
   */
  static async ticketsv1receptionticketsget(params?: any): Promise<TicketListResponse> {
    const response: AxiosResponse<TicketListResponse> = await apiClient.get(`/v1/reception/tickets?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Close Ticket
   */
  static async ticketv1receptionticketsticketidclosepost(ticket_id): Promise<CloseResponse> {
    const response: AxiosResponse<CloseResponse> = await apiClient.post(`/v1/reception/tickets/${ticket_id}/close`);
    return response.data;
  }

    /**
   * Add Ligne
   */
  static async lignev1receptionlignespost(data?: any): Promise<LigneResponse> {
    const response: AxiosResponse<LigneResponse> = await apiClient.post(`/v1/reception/lignes`, data);
    return response.data;
  }

    /**
   * Get Lignes Depot
   */
  static async lignesdepotv1receptionlignesget(params?: any): Promise<LigneDepotListResponse> {
    const response: AxiosResponse<LigneDepotListResponse> = await apiClient.get(`/v1/reception/lignes?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Categories
   */
  static async categoriesv1receptioncategoriesget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/reception/categories`);
    return response.data;
  }

    /**
   * Update Ligne
   */
  static async lignev1receptionlignesligneidput(ligne_id, data?: any): Promise<LigneResponse> {
    const response: AxiosResponse<LigneResponse> = await apiClient.put(`/v1/reception/lignes/${ligne_id}`, data);
    return response.data;
  }

    /**
   * Delete Ligne
   */
  static async lignev1receptionlignesligneiddelete(ligne_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/reception/lignes/${ligne_id}`);
    return response.data;
  }

    /**
   * Update Ligne Weight
   */
  static async ligneweightv1receptionticketsticketidlignesligneidweightpatch(ticket_id, ligne_id, data?: any): Promise<LigneResponse> {
    const response: AxiosResponse<LigneResponse> = await apiClient.patch(`/v1/reception/tickets/${ticket_id}/lignes/${ligne_id}/weight`, data);
    return response.data;
  }

    /**
   * Get Ticket Detail
   */
  static async ticketdetailv1receptionticketsticketidget(ticket_id): Promise<TicketDetailResponse> {
    const response: AxiosResponse<TicketDetailResponse> = await apiClient.get(`/v1/reception/tickets/${ticket_id}`);
    return response.data;
  }

    /**
   * Generate Ticket Download Token
   */
  static async ticketdownloadtokenv1receptionticketsticketiddownloadtokenpost(ticket_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/reception/tickets/${ticket_id}/download-token`);
    return response.data;
  }

    /**
   * Export Ticket Csv
   */
  static async ticketcsvv1receptionticketsticketidexportcsvget(ticket_id, params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/reception/tickets/${ticket_id}/export-csv?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Export Lignes Depot Csv
   */
  static async lignesdepotcsvv1receptionlignesexportcsvget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/reception/lignes/export-csv?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Live Reception Stats
   */
  static async livereceptionstatsv1receptionstatsliveget(params?: any): Promise<ReceptionLiveStatsResponse> {
    const response: AxiosResponse<ReceptionLiveStatsResponse> = await apiClient.get(`/v1/reception/stats/live?${new URLSearchParams(params).toString()}`);
    return response.data;
  }
}
export class StatsApi {
    /**
   * Get reception summary statistics
   */
  static async receptionsummaryv1statsreceptionsummaryget(params?: any): Promise<ReceptionSummaryStats> {
    const response: AxiosResponse<ReceptionSummaryStats> = await apiClient.get(`/v1/stats/reception/summary?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get reception statistics by category
   */
  static async receptionbycategoryv1statsreceptionbycategoryget(params?: any): Promise<CategoryStats[]> {
    const response: AxiosResponse<CategoryStats[]> = await apiClient.get(`/v1/stats/reception/by-category?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get sales statistics by category
   */
  static async salesbycategoryv1statssalesbycategoryget(params?: any): Promise<CategoryStats[]> {
    const response: AxiosResponse<CategoryStats[]> = await apiClient.get(`/v1/stats/sales/by-category?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Unified Live Stats
   */
  static async unifiedlivestatsv1statsliveget(params?: any): Promise<UnifiedLiveStatsResponse> {
    const response: AxiosResponse<UnifiedLiveStatsResponse> = await apiClient.get(`/v1/stats/live?${new URLSearchParams(params).toString()}`);
    return response.data;
  }
}
export class CategoriesApi {
    /**
   * Create a new category
   */
  static async categoryv1categoriespost(data?: any): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.post(`/v1/categories/`, data);
    return response.data;
  }

    /**
   * List all categories
   */
  static async categoriesv1categoriesget(params?: any): Promise<CategoryRead[]> {
    const response: AxiosResponse<CategoryRead[]> = await apiClient.get(`/v1/categories/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get categories hierarchy
   */
  static async categorieshierarchyv1categorieshierarchyget(params?: any): Promise<CategoryWithChildren[]> {
    const response: AxiosResponse<CategoryWithChildren[]> = await apiClient.get(`/v1/categories/hierarchy?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Export categories configuration
   */
  static async categoriesv1categoriesactionsexportget(params?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/categories/actions/export?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Télécharger le modèle CSV d'import des catégories
   */
  static async categoriesimporttemplatev1categoriesimporttemplateget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/categories/import/template`);
    return response.data;
  }

    /**
   * Analyser un CSV d'import de catégories
   */
  static async categoriesimportv1categoriesimportanalyzepost(data?: any): Promise<CategoryImportAnalyzeResponse> {
    const response: AxiosResponse<CategoryImportAnalyzeResponse> = await apiClient.post(`/v1/categories/import/analyze`, data);
    return response.data;
  }

    /**
   * Exécuter un import de catégories depuis une session
   */
  static async categoriesimportv1categoriesimportexecutepost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/categories/import/execute`, data);
    return response.data;
  }

    /**
   * Get a category by ID
   */
  static async categoryv1categoriescategoryidget(category_id): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.get(`/v1/categories/${category_id}`);
    return response.data;
  }

    /**
   * Update a category
   */
  static async categoryv1categoriescategoryidput(category_id, data?: any): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.put(`/v1/categories/${category_id}`, data);
    return response.data;
  }

    /**
   * Soft delete a category
   */
  static async categoryv1categoriescategoryiddelete(category_id): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.delete(`/v1/categories/${category_id}`);
    return response.data;
  }

    /**
   * Restore a soft-deleted category
   */
  static async categoryv1categoriescategoryidrestorepost(category_id): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.post(`/v1/categories/${category_id}/restore`);
    return response.data;
  }

    /**
   * Hard delete a category
   */
  static async deletecategoryv1categoriescategoryidharddelete(category_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/categories/${category_id}/hard`);
    return response.data;
  }

    /**
   * Check if category has usage
   */
  static async categoryusagev1categoriescategoryidhasusageget(category_id): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/categories/${category_id}/has-usage`);
    return response.data;
  }

    /**
   * Get category children
   */
  static async categorychildrenv1categoriescategoryidchildrenget(category_id): Promise<CategoryRead[]> {
    const response: AxiosResponse<CategoryRead[]> = await apiClient.get(`/v1/categories/${category_id}/children`);
    return response.data;
  }

    /**
   * Get category parent
   */
  static async categoryparentv1categoriescategoryidparentget(category_id): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.get(`/v1/categories/${category_id}/parent`);
    return response.data;
  }

    /**
   * Get category breadcrumb
   */
  static async categorybreadcrumbv1categoriescategoryidbreadcrumbget(category_id): Promise<CategoryRead[]> {
    const response: AxiosResponse<CategoryRead[]> = await apiClient.get(`/v1/categories/${category_id}/breadcrumb`);
    return response.data;
  }

    /**
   * Update category visibility
   */
  static async categoryvisibilityv1categoriescategoryidvisibilityput(category_id, data?: any): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.put(`/v1/categories/${category_id}/visibility`, data);
    return response.data;
  }

    /**
   * Update category display order
   */
  static async categorydisplayorderv1categoriescategoryiddisplayorderput(category_id, data?: any): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.put(`/v1/categories/${category_id}/display-order`, data);
    return response.data;
  }

    /**
   * Update category display order for ENTRY/DEPOT
   */
  static async categorydisplayorderentryv1categoriescategoryiddisplayorderentryput(category_id, data?: any): Promise<CategoryRead> {
    const response: AxiosResponse<CategoryRead> = await apiClient.put(`/v1/categories/${category_id}/display-order-entry`, data);
    return response.data;
  }

    /**
   * Get categories for ENTRY tickets
   */
  static async categoriesforentryticketsv1categoriesentryticketsget(params?: any): Promise<CategoryRead[]> {
    const response: AxiosResponse<CategoryRead[]> = await apiClient.get(`/v1/categories/entry-tickets?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get categories for SALE tickets
   */
  static async categoriesforsaleticketsv1categoriessaleticketsget(params?: any): Promise<CategoryRead[]> {
    const response: AxiosResponse<CategoryRead[]> = await apiClient.get(`/v1/categories/sale-tickets?${new URLSearchParams(params).toString()}`);
    return response.data;
  }
}
export class SettingsApi {
    /**
   * Get Settings
   */
  static async settingsv1settingsget(): Promise<SettingResponse[]> {
    const response: AxiosResponse<SettingResponse[]> = await apiClient.get(`/v1/settings/`);
    return response.data;
  }

    /**
   * Create Setting
   */
  static async settingv1settingspost(data?: any): Promise<SettingResponse> {
    const response: AxiosResponse<SettingResponse> = await apiClient.post(`/v1/settings/`, data);
    return response.data;
  }

    /**
   * Get Setting
   */
  static async settingv1settingskeyget(key): Promise<SettingResponse> {
    const response: AxiosResponse<SettingResponse> = await apiClient.get(`/v1/settings/${key}`);
    return response.data;
  }

    /**
   * Update Setting
   */
  static async settingv1settingskeyput(key, data?: any): Promise<SettingResponse> {
    const response: AxiosResponse<SettingResponse> = await apiClient.put(`/v1/settings/${key}`, data);
    return response.data;
  }

    /**
   * Delete Setting
   */
  static async settingv1settingskeydelete(key): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.delete(`/v1/settings/${key}`);
    return response.data;
  }
}
export class WebhooksApi {
    /**
   * Brevo Email Status Webhook
   */
  static async emailstatuswebhookv1webhooksbrevoemailstatuspost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/webhooks/brevo/email-status`);
    return response.data;
  }

    /**
   * Test Brevo Webhook
   */
  static async brevowebhookv1webhooksbrevotestget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/v1/webhooks/brevo/test`);
    return response.data;
  }
}
export class ActivityApi {
    /**
   * Enregistrer l'activité
   */
  static async pingv1activitypingpost(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/activity/ping`);
    return response.data;
  }
}
export class PresetsApi {
    /**
   * Get Preset Buttons
   */
  static async presetbuttonsv1presetsget(params?: any): Promise<PresetButtonWithCategory[]> {
    const response: AxiosResponse<PresetButtonWithCategory[]> = await apiClient.get(`/v1/presets/?${new URLSearchParams(params).toString()}`);
    return response.data;
  }

    /**
   * Get Active Preset Buttons
   */
  static async activepresetbuttonsv1presetsactiveget(): Promise<PresetButtonWithCategory[]> {
    const response: AxiosResponse<PresetButtonWithCategory[]> = await apiClient.get(`/v1/presets/active`);
    return response.data;
  }

    /**
   * Get Preset Button
   */
  static async presetbuttonv1presetspresetidget(preset_id): Promise<PresetButtonWithCategory> {
    const response: AxiosResponse<PresetButtonWithCategory> = await apiClient.get(`/v1/presets/${preset_id}`);
    return response.data;
  }
}
export class TransactionsApi {
    /**
   * Create Transaction
   */
  static async transactionv1transactionspost(data?: any): Promise<SaleResponse> {
    const response: AxiosResponse<SaleResponse> = await apiClient.post(`/v1/transactions/`, data);
    return response.data;
  }

    /**
   * Log Transaction
   */
  static async transactionv1transactionslogpost(data?: any): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.post(`/v1/transactions/log`, data);
    return response.data;
  }
}
export class DefaultApi {
    /**
   * Root
   */
  static async get(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/`);
    return response.data;
  }

    /**
   * Health Check
   */
  static async checkhealthget(): Promise<any> {
    const response: AxiosResponse<any> = await apiClient.get(`/health`);
    return response.data;
  }
}

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default {
  client: apiClient
};