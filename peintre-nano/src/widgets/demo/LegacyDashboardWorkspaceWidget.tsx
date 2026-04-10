import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transversePageStateFromSearch } from '../../app/demo/runtime-demo-transverse-state';
import { TransversePageStateSlot } from '../../app/states/transverse/TransversePageStateSlot';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, Package, Scale, TrendingUp, User } from 'lucide-react';
import {
  type CashSessionStatsSummary,
  type CategoryStatRow,
  DashboardLegacyApiError,
  fetchCashSessionStatsSummary,
  fetchCategoriesList,
  fetchReceptionByCategory,
  fetchReceptionStatsSummary,
  fetchSalesByCategory,
  type ReceptionStatsSummary,
} from '../../api/dashboard-legacy-stats-client';
import { useAuthPort, useAuthSession } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import classes from './LegacyDashboardWorkspaceWidget.module.css';

type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const COLORS = ['#1976d2', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd', '#0d47a1', '#1565c0'];

function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Même logique que `UnifiedDashboard` (recyclique-1.4.4). */
function getDateRange(
  preset: DateRangePreset,
  startDate: string,
  endDate: string,
): { start: string | undefined; end: string | undefined } {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'all':
      return { start: undefined, end: undefined };
    case 'today':
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'custom': {
      const customStart = startDate ? new Date(startDate) : undefined;
      if (customStart) customStart.setHours(0, 0, 0, 0);
      const customEnd = endDate ? new Date(endDate) : undefined;
      if (customEnd) customEnd.setHours(23, 59, 59, 999);
      return { start: customStart?.toISOString(), end: customEnd?.toISOString() };
    }
    default:
      break;
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Tableau de bord aligné sur `UnifiedDashboard.tsx` (legacy) : endpoints v1 documentés,
 * filtres de période réels, graphiques Recharts — pas de agrégation métier côté client.
 */
export function LegacyDashboardWorkspaceWidget({ widgetProps }: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const session = useAuthSession();

  const welcomeTitle = readString(widgetProps?.welcomeTitle) ?? 'Bienvenue sur RecyClique';
  const welcomeSubtitle =
    readString(widgetProps?.welcomeSubtitle) ??
    'Plateforme de gestion pour ressourceries. Gérez vos dépôts, suivez vos ventes et analysez vos performances.';
  const personalLabel = readString(widgetProps?.personalDashboardLabel) ?? 'Dashboard personnel';
  const personalPath = readString(widgetProps?.personalDashboardPath) ?? '/dashboard/benevole';

  const [salesStats, setSalesStats] = useState<CashSessionStatsSummary | null>(null);
  const [receptionStats, setReceptionStats] = useState<ReceptionStatsSummary | null>(null);
  const [receptionByCategoryRaw, setReceptionByCategoryRaw] = useState<CategoryStatRow[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<CategoryStatRow[]>([]);
  const [mainCategories, setMainCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const acRef = useRef<AbortController | null>(null);

  const [transverseSearchTick, setTransverseSearchTick] = useState(0);
  useEffect(() => {
    const onPop = () => setTransverseSearchTick((n) => n + 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const transverseDemoPageState = useMemo(
    () => transversePageStateFromSearch(typeof window !== 'undefined' ? window.location.search : ''),
    [transverseSearchTick],
  );

  const heroHeading = session.userDisplayLabel
    ? `${welcomeTitle}, ${session.userDisplayLabel}`
    : welcomeTitle;

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const categories = await fetchCategoriesList(auth, ac.signal);
        const mainCats = categories.filter((c) => !c.parent_id && c.name).map((c) => c.name);
        setMainCategories(mainCats);
      } catch {
        setMainCategories([]);
      }
    })();
    return () => ac.abort();
  }, [auth]);

  const categoryStats = useMemo(() => {
    if (mainCategories.length === 0) {
      return receptionByCategoryRaw;
    }
    return receptionByCategoryRaw.filter((stat) => mainCategories.includes(stat.category_name));
  }, [receptionByCategoryRaw, mainCategories]);

  const loadStats = useCallback(async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);

    try {
      const { start, end } = getDateRange(dateRange, startDate, endDate);

      if (dateRange === 'custom' && start && end && start > end) {
        setError('La date de début doit être antérieure à la date de fin');
        setLoading(false);
        return;
      }

      setError(null);
      const range = { start, end };

      const [cash, reception, receptionByCat, salesCat] = await Promise.all([
        fetchCashSessionStatsSummary(auth, range, ac.signal),
        fetchReceptionStatsSummary(auth, range, ac.signal),
        fetchReceptionByCategory(auth, range, ac.signal),
        fetchSalesByCategory(auth, range, ac.signal).catch(() => [] as CategoryStatRow[]),
      ]);

      if (ac.signal.aborted) {
        return;
      }

      setSalesStats(cash);
      setReceptionStats(reception);
      setReceptionByCategoryRaw(Array.isArray(receptionByCat) ? receptionByCat : []);
      setSalesByCategory(salesCat ?? []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      if (e instanceof DashboardLegacyApiError) {
        if (e.status === 403) {
          setError(
            "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques globales. Utilisez le Dashboard Personnel pour vos informations.",
          );
        } else {
          setError(`Impossible de charger les statistiques: ${e.message}`);
        }
      } else {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue';
        setError(`Impossible de charger les statistiques: ${msg}`);
      }
      setSalesStats(null);
      setReceptionStats(null);
      setReceptionByCategoryRaw([]);
      setSalesByCategory([]);
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
    }
  }, [auth, dateRange, startDate, endDate]);

  useEffect(() => {
    void loadStats();
    return () => acRef.current?.abort();
  }, [loadStats]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        setError('La date de début doit être antérieure à la date de fin');
        return;
      }
      setDateRange('custom');
    }
  };

  const dataSourceAttr = loading ? 'legacy-api-loading' : error ? 'legacy-api-error' : 'legacy-api';

  return (
    <div
      className={classes.page}
      data-testid="widget-legacy-dashboard-workspace"
      data-dashboard-kpi-source={dataSourceAttr}
      data-period-preset={dateRange}
      aria-label="Tableau de bord"
    >
      <TransversePageStateSlot pageState={transverseDemoPageState} />
      <section className={classes.welcomeSection}>
        <div className={classes.welcomeContent}>
          <h1 className={classes.welcomeTitle}>{heroHeading}</h1>
          <p className={classes.welcomeText}>{welcomeSubtitle}</p>
        </div>
        <a
          className={classes.personalDashLink}
          href={personalPath}
          data-testid="legacy-dashboard-personal-btn"
        >
          <User size={18} aria-hidden />
          <span>{personalLabel}</span>
        </a>
      </section>

      <section className={classes.filterSection}>
        <div className={classes.filtersRow} role="group" aria-label="Filtres de période">
          <button
            type="button"
            className={dateRange === 'all' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-all"
            aria-pressed={dateRange === 'all'}
            onClick={() => handlePresetChange('all')}
          >
            Tout
          </button>
          <button
            type="button"
            className={dateRange === 'today' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-today"
            aria-pressed={dateRange === 'today'}
            onClick={() => handlePresetChange('today')}
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            className={dateRange === 'week' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-week"
            aria-pressed={dateRange === 'week'}
            onClick={() => handlePresetChange('week')}
          >
            Cette semaine
          </button>
          <button
            type="button"
            className={dateRange === 'month' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-month"
            aria-pressed={dateRange === 'month'}
            onClick={() => handlePresetChange('month')}
          >
            Ce mois-ci
          </button>
          <button
            type="button"
            className={dateRange === 'year' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-year"
            aria-pressed={dateRange === 'year'}
            onClick={() => handlePresetChange('year')}
          >
            Cette année
          </button>

          <input
            className={classes.dateInput}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Date de début"
            data-testid="filter-start-date"
          />
          <input
            className={classes.dateInput}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Date de fin"
            data-testid="filter-end-date"
          />
          <button
            type="button"
            className={dateRange === 'custom' ? classes.filterBtnLegacyActive : classes.filterBtnLegacy}
            data-testid="filter-apply-custom"
            disabled={!startDate || !endDate}
            aria-pressed={dateRange === 'custom'}
            onClick={handleCustomDateChange}
          >
            Appliquer dates
          </button>
        </div>
      </section>

      {error ? <div className={classes.errorMessage}>{error}</div> : null}

      {loading ? (
        <div className={classes.loadingSpinner}>Chargement des statistiques...</div>
      ) : (
        <>
          <section className={classes.statsSection}>
            <h3 className={classes.sectionTitle}>Ventes (Sorties)</h3>
            <div className={classes.statsGrid}>
              <div className={classes.statCard}>
                <div className={classes.statIcon}>
                  <DollarSign size={24} data-testid="sales-revenue-icon" />
                </div>
                <div className={classes.statContent}>
                  <div className={classes.statValue} data-testid="stat-sales-revenue">
                    {salesStats?.total_sales != null ? `${Number(salesStats.total_sales).toFixed(2)}€` : '0€'}
                  </div>
                  <div className={classes.statLabel}>Chiffre d&apos;affaires</div>
                </div>
              </div>

              <div className={classes.statCard}>
                <div className={classes.statIcon}>
                  <TrendingUp size={24} data-testid="sales-donations-icon" />
                </div>
                <div className={classes.statContent}>
                  <div className={classes.statValue} data-testid="stat-sales-donations">
                    {salesStats?.total_donations != null
                      ? `${Number(salesStats.total_donations).toFixed(2)}€`
                      : '0€'}
                  </div>
                  <div className={classes.statLabel}>Total des dons</div>
                </div>
              </div>

              <div className={classes.statCard}>
                <div className={classes.statIcon}>
                  <Scale size={24} data-testid="sales-weight-icon" />
                </div>
                <div className={classes.statContent}>
                  <div className={classes.statValue} data-testid="stat-sales-weight">
                    {salesStats?.total_weight_sold != null
                      ? `${Number(salesStats.total_weight_sold).toFixed(1)} kg`
                      : '0 kg'}
                  </div>
                  <div className={classes.statLabel}>Poids vendu</div>
                </div>
              </div>
            </div>
          </section>

          <section className={classes.statsSection}>
            <h3 className={classes.sectionTitle}>Réception (Entrées)</h3>
            <div className={classes.statsGrid}>
              <div className={classes.statCard}>
                <div className={classes.statIcon}>
                  <Scale size={24} data-testid="reception-weight-icon" />
                </div>
                <div className={classes.statContent}>
                  <div className={classes.statValue} data-testid="stat-reception-weight">
                    {receptionStats?.total_weight != null
                      ? `${Number(receptionStats.total_weight).toFixed(1)} kg`
                      : '0 kg'}
                  </div>
                  <div className={classes.statLabel}>Poids reçu</div>
                </div>
              </div>

              <div className={classes.statCard}>
                <div className={classes.statIcon}>
                  <Package size={24} data-testid="reception-items-icon" />
                </div>
                <div className={classes.statContent}>
                  <div className={classes.statValue} data-testid="stat-reception-items">
                    {receptionStats?.total_items ?? 0}
                  </div>
                  <div className={classes.statLabel}>Lignes de réception</div>
                </div>
              </div>
            </div>
          </section>

          {categoryStats.length > 0 ? (
            <>
              <section className={classes.chartSection} data-testid="legacy-dashboard-chart-reception-bar">
                <h2 className={classes.chartTitle}>Analyse Détaillée de la Réception - Poids par Catégorie</h2>
                <div className={classes.chartViewport}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={categoryStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category_name" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value) => {
                          const v = value ?? 0;
                          const numValue = typeof v === 'number' ? v : parseFloat(String(v));
                          return [`${Number.isFinite(numValue) ? numValue.toFixed(1) : '0.0'} kg`, 'Poids'];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total_weight" fill="#1976d2" name="Poids (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className={classes.chartSection} data-testid="legacy-dashboard-chart-reception-pie">
                <h2 className={classes.chartTitle}>Analyse Détaillée de la Réception - Articles par Catégorie</h2>
                <div className={classes.chartViewport}>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="total_items"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label
                      >
                        {categoryStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          ) : null}

          {categoryStats.length === 0 && !loading ? (
            <section className={classes.chartSection} data-testid="legacy-dashboard-empty-reception-categories">
              <p className={classes.emptyChartsMessage}>
                Aucune donnée de catégorie disponible pour la période sélectionnée
              </p>
            </section>
          ) : null}

          {salesByCategory.length > 0 ? (
            <>
              <section className={classes.chartSection} data-testid="legacy-dashboard-chart-sales-bar">
                <h2 className={classes.chartTitle}>Analyse Détaillée des Sorties - Poids par Catégorie</h2>
                <div className={classes.chartViewport}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={salesByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category_name" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value) => {
                          const v = value ?? 0;
                          const numValue = typeof v === 'number' ? v : parseFloat(String(v));
                          return [`${Number.isFinite(numValue) ? numValue.toFixed(1) : '0.0'} kg`, 'Poids'];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total_weight" fill="#42a5f5" name="Poids (kg)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className={classes.chartSection} data-testid="legacy-dashboard-chart-sales-pie">
                <h2 className={classes.chartTitle}>Analyse Détaillée des Sorties - Articles par Catégorie</h2>
                <div className={classes.chartViewport}>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={salesByCategory}
                        dataKey="total_items"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label
                      >
                        {salesByCategory.map((_, index) => (
                          <Cell key={`cell-sales-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          ) : null}

          {salesByCategory.length === 0 && !loading ? (
            <section className={classes.chartSection} data-testid="legacy-dashboard-empty-sales-categories">
              <h2 className={classes.chartTitle}>Analyse Détaillée des Sorties</h2>
              <p className={classes.emptyChartsMessage}>
                Aucune donnée de vente par catégorie disponible pour la période sélectionnée
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
