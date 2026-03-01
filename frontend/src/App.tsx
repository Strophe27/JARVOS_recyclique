/**
 * App — Story 3.5, 8.1.
 * Structure minimale pour AC1/AC2 : BrowserRouter, CashRegisterGuard, AppNav, Routes.
 * Routes /admin/users protégées par AdminGuard (permission admin).
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CashRegisterGuard, CaisseDashboardPage, CAISSE_PIN_PATH } from './caisse';
import { CashRegisterPinPage } from './caisse/CashRegisterPinPage';
import { CashRegisterSessionOpenPage } from './caisse/CashRegisterSessionOpenPage';
import { CashRegisterSessionClosePage } from './caisse/CashRegisterSessionClosePage';
import { CashRegisterSalePage } from './caisse/CashRegisterSalePage';
import { ReceptionAccueilPage } from './reception/ReceptionAccueilPage';
import { ReceptionTicketDetailPage } from './reception/ReceptionTicketDetailPage';
import { AdminGuard } from './admin/AdminGuard';
import { AdminUsersListPage } from './admin/AdminUsersListPage';
import { AdminUserDetailPage } from './admin/AdminUserDetailPage';
import { AdminUserCreatePage } from './admin/AdminUserCreatePage';
import { AdminDashboardPage } from './admin/AdminDashboardPage';
import { AdminSitesPage } from './admin/AdminSitesPage';
import { AdminCashRegistersPage } from './admin/AdminCashRegistersPage';
import { AdminSessionManagerPage } from './admin/AdminSessionManagerPage';
import { AdminReportsPage } from './admin/AdminReportsPage';
import { AdminCashSessionDetailPage } from './admin/AdminCashSessionDetailPage';
import { AdminCategoriesPage } from './admin/AdminCategoriesPage';
import { AdminReceptionPage } from './admin/AdminReceptionPage';
import { AdminReceptionTicketDetailPage } from './admin/AdminReceptionTicketDetailPage';
import { AdminHealthPage } from './admin/AdminHealthPage';
import { AdminAuditLogPage } from './admin/AdminAuditLogPage';
import { AdminEmailLogsPage } from './admin/AdminEmailLogsPage';
import { AdminSettingsPage } from './admin/AdminSettingsPage';
import { AdminDbPage } from './admin/AdminDbPage';
import { AdminImportLegacyPage } from './admin/AdminImportLegacyPage';
import { AdminGroupsPage } from './admin/AdminGroupsPage';
import { AdminPermissionsPage } from './admin/AdminPermissionsPage';
import { AdminQuickAnalysisPage } from './admin/AdminQuickAnalysisPage';
import { VieAssociativeGuard } from './admin/VieAssociativeGuard';
import { AdminVieAssociativePage } from './admin/AdminVieAssociativePage';
import { LoginPage } from './auth/LoginPage';
import { SignupPage } from './auth/SignupPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';
import { ResetPasswordPage } from './auth/ResetPasswordPage';
import { ProfilPage } from './auth/ProfilPage';
import { useAuth } from './auth/AuthContext';
import { AppShell, AppShellNav } from './shared/layout';

function AppRoutes() {
  const { user, isHydrated } = useAuth();
  const rootRedirect = !isHydrated ? null : (
    <Navigate to={user ? '/caisse' : '/login'} replace />
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/inscription" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/caisse" element={<CaisseDashboardPage />} />
      <Route path="/cash-register/virtual" element={<CaisseDashboardPage />} />
      <Route path="/cash-register/deferred" element={<CaisseDashboardPage />} />
      <Route path="/cash-register/session/open" element={<CashRegisterSessionOpenPage />} />
      <Route path="/cash-register/sale" element={<CashRegisterSalePage />} />
      <Route path="/cash-register/session/close" element={<CashRegisterSessionClosePage />} />
      <Route path={CAISSE_PIN_PATH} element={<CashRegisterPinPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route
        path="/admin/sites"
        element={
          <AdminGuard>
            <AdminSitesPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/sites-and-registers"
        element={
          <AdminGuard>
            <AdminSitesPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/cash-registers"
        element={
          <AdminGuard>
            <AdminCashRegistersPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/session-manager"
        element={
          <AdminGuard>
            <AdminSessionManagerPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminGuard>
            <AdminReportsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/reports/cash-sessions"
        element={
          <AdminGuard>
            <AdminReportsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/cash-sessions/:id"
        element={
          <AdminGuard>
            <AdminCashSessionDetailPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminGuard>
            <AdminUsersListPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <AdminGuard>
            <AdminUserCreatePage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <AdminGuard>
            <AdminUserDetailPage />
          </AdminGuard>
        }
      />
      <Route path="/reception" element={<ReceptionAccueilPage />} />
      <Route path="/reception/tickets/:ticketId" element={<ReceptionTicketDetailPage />} />
      <Route path="/profil" element={<ProfilPage />} />
      <Route
        path="/admin/categories"
        element={
          <AdminGuard>
            <AdminCategoriesPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/reception"
        element={
          <AdminGuard>
            <AdminReceptionPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/reception-tickets/:id"
        element={
          <AdminGuard>
            <AdminReceptionTicketDetailPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/health"
        element={
          <AdminGuard>
            <AdminHealthPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <AdminGuard>
            <AdminAuditLogPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/email-logs"
        element={
          <AdminGuard>
            <AdminEmailLogsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminGuard>
            <AdminSettingsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/db"
        element={
          <AdminGuard>
            <AdminDbPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/import/legacy"
        element={
          <AdminGuard>
            <AdminImportLegacyPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/groups"
        element={
          <AdminGuard>
            <AdminGroupsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <AdminGuard>
            <AdminPermissionsPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/quick-analysis"
        element={
          <AdminGuard>
            <AdminQuickAnalysisPage />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/vie-associative"
        element={
          <VieAssociativeGuard>
            <AdminVieAssociativePage />
          </VieAssociativeGuard>
        }
      />
      <Route path="/" element={rootRedirect} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <CashRegisterGuard>
        <AppShell nav={<AppShellNav />}>
          <AppRoutes />
        </AppShell>
      </CashRegisterGuard>
    </BrowserRouter>
  );
}
