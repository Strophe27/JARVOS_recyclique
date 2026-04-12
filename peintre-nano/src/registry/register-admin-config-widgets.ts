import { AdminReceptionTicketDetailWidget } from '../domains/admin-config/AdminReceptionTicketDetailWidget';
import { AdminReceptionTicketsListWidget } from '../domains/admin-config/AdminReceptionTicketsListWidget';
import { AdminReceptionStatsSupervisionWidget } from '../domains/admin-config/AdminReceptionStatsSupervisionWidget';
import { AdminReportsSupervisionHubWidget } from '../domains/admin-config/AdminReportsSupervisionHubWidget';
import { CashRegistersAdminDemoPlaceholder } from '../domains/admin-config/CashRegistersAdminDemoPlaceholder';
import { PendingUsersDemoPlaceholder } from '../domains/admin-config/PendingUsersDemoPlaceholder';
import { SessionManagerAdminDemoPlaceholder } from '../domains/admin-config/SessionManagerAdminDemoPlaceholder';
import { SitesAdminDemoPlaceholder } from '../domains/admin-config/SitesAdminDemoPlaceholder';
import { registerWidget } from './widget-registry';

/** Stories 17.1–17.3 — widgets admin mutualisables (`admin-config/`), allowlist CREOS ; coquille `AdminListPageShell`. */
export function registerAdminConfigWidgets(): void {
  registerWidget('admin.pending-users.demo', PendingUsersDemoPlaceholder);
  /** Stories 17.2–17.3 — placeholders honnêtes sans `data_contract` (gaps OpenAPI → Epic 16). */
  registerWidget('admin.cash-registers.demo', CashRegistersAdminDemoPlaceholder);
  registerWidget('admin.sites.demo', SitesAdminDemoPlaceholder);
  /** Story 18.1 — hub rapports / supervision (gap K + liens manifeste servi uniquement). */
  registerWidget('admin.reports.supervision.hub', AdminReportsSupervisionHubWidget);
  /** Story 18.2 — session manager : placeholder gaps liste/KPIs + exports B exclus visuellement. */
  registerWidget('admin.session-manager.demo', SessionManagerAdminDemoPlaceholder);
  /** Story 19.1 — stats réception + live unifié (`recyclique_stats_*`) + gaps K nominatifs explicites. */
  registerWidget('admin.reception.stats.supervision', AdminReceptionStatsSupervisionWidget);
  /** Story 19.2 — liste tickets (`recyclique_reception_listTickets`) + détail (`recyclique_reception_getTicketDetail`). */
  registerWidget('admin.reception.tickets.list', AdminReceptionTicketsListWidget);
  registerWidget('admin-reception-ticket-detail', AdminReceptionTicketDetailWidget);
}
