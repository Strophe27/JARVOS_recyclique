import { AdminCashSessionDetailWidget } from '../domains/cashflow/AdminCashSessionDetailWidget';
import { CaisseCurrentTicketWidget } from '../domains/cashflow/CaisseCurrentTicketWidget';
import { CaisseBrownfieldDashboardWidget } from '../domains/cashflow/CaisseBrownfieldDashboardWidget';
import { CashflowNominalWizard } from '../domains/cashflow/CashflowNominalWizard';
import { CashflowRefundWizard } from '../domains/cashflow/CashflowRefundWizard';
import { CashflowCloseWizard } from '../domains/cashflow/CashflowCloseWizard';
import { CashflowSaleCorrectionWizard } from '../domains/cashflow/CashflowSaleCorrectionWizard';
import { CashflowSpecialOpsHub } from '../domains/cashflow/CashflowSpecialOpsHub';
import { CashflowSocialDonWizard } from '../domains/cashflow/CashflowSocialDonWizard';
import { makeCashflowSpecialEncaissementWizard } from '../domains/cashflow/CashflowSpecialEncaissementWizard';
import { registerWidget } from './widget-registry';

/** Story 6.1 — types alignés sur `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`. */
export function registerCashflowWidgets(): void {
  registerWidget('caisse-brownfield-dashboard', CaisseBrownfieldDashboardWidget);
  registerWidget('caisse-current-ticket', CaisseCurrentTicketWidget);
  registerWidget('cashflow-nominal-wizard', CashflowNominalWizard);
  registerWidget('cashflow-refund-wizard', CashflowRefundWizard);
  registerWidget('cashflow-special-don-wizard', makeCashflowSpecialEncaissementWizard('DON_SANS_ARTICLE'));
  registerWidget(
    'cashflow-special-adhesion-wizard',
    makeCashflowSpecialEncaissementWizard('ADHESION_ASSOCIATION'),
  );
  registerWidget('cashflow-social-don-wizard', CashflowSocialDonWizard);
  registerWidget('cashflow-special-ops-hub', CashflowSpecialOpsHub);
  registerWidget('cashflow-close-wizard', CashflowCloseWizard);
  registerWidget('cashflow-sale-correction-wizard', CashflowSaleCorrectionWizard);
  registerWidget('admin-cash-session-detail', AdminCashSessionDetailWidget);
}
