import { AdminAuditLogWidget } from '../domains/admin-config/AdminAuditLogWidget';
import { AdminCategoriesWidget } from '../domains/admin-config/AdminCategoriesWidget';
import { AdminGroupsWidget } from '../domains/admin-config/AdminGroupsWidget';
import { AdminReceptionTicketDetailWidget } from '../domains/admin-config/AdminReceptionTicketDetailWidget';
import { AdminReceptionTicketsListWidget } from '../domains/admin-config/AdminReceptionTicketsListWidget';
import { AdminReceptionStatsSupervisionWidget } from '../domains/admin-config/AdminReceptionStatsSupervisionWidget';
import { AdminReportsSupervisionHubWidget } from '../domains/admin-config/AdminReportsSupervisionHubWidget';
import { AdminUsersWidget } from '../domains/admin-config/AdminUsersWidget';
import { AdminCashRegistersWidget } from '../domains/admin-config/AdminCashRegistersWidget';
import { AdminSitesWidget } from '../domains/admin-config/AdminSitesWidget';
import { SessionManagerAdminWidget } from '../domains/admin-config/SessionManagerAdminWidget';
import { registerWidget } from './widget-registry';

/** Stories 17.1–17.3 — widgets admin mutualisables (`admin-config/`), allowlist CREOS ; coquille `AdminListPageShell`. */
export function registerAdminConfigWidgets(): void {
  registerWidget('admin.users.demo', AdminUsersWidget);
  /** Story 14.5 — liste/détail/mutations `adminGroups*` (`admin-groups-client.ts`). */
  registerWidget('admin.groups.demo', AdminGroupsWidget);
  registerWidget('admin.categories.demo', AdminCategoriesWidget);
  /** Lecture live `adminAuditLogList` — id manifeste historique `admin.audit-log.demo`. */
  registerWidget('admin.audit-log.demo', AdminAuditLogWidget);
  /** Postes de caisse et sites — listes et mutations branchées sur l’API v1. */
  registerWidget('admin.cash-registers.demo', AdminCashRegistersWidget);
  registerWidget('admin.sites.demo', AdminSitesWidget);
  /** Accès secondaires admin (slot placeholder / compact ; `/admin` = legacy seul). */
  registerWidget('admin.reports.supervision.hub', AdminReportsSupervisionHubWidget);
  /** Story 18.2 — session manager (liste, KPIs, export par session + export groupé borné). */
  registerWidget('admin.session-manager.demo', SessionManagerAdminWidget);
  /** Story 19.1 — stats réception + live unifié (`recyclique_stats_*`) + gaps K nominatifs explicites. */
  registerWidget('admin.reception.stats.supervision', AdminReceptionStatsSupervisionWidget);
  /** Story 19.2 — liste tickets (`recyclique_reception_listTickets`) + détail (`recyclique_reception_getTicketDetail`). */
  registerWidget('admin.reception.tickets.list', AdminReceptionTicketsListWidget);
  registerWidget('admin-reception-ticket-detail', AdminReceptionTicketDetailWidget);
}
