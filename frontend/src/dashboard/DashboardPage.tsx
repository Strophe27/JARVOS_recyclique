import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconScale,
  IconPackage,
  IconUser,
} from '@tabler/icons-react';
import { useAuth } from '../auth/AuthContext';
import {
  getCashSessionStats,
  getReceptionSummary,
  getReceptionByCategory,
  getSalesByCategory,
} from '../api/stats';
import type { CashSessionStats, ReceptionSummary, CategoryStat } from '../api/stats';
import styles from './DashboardPage.module.css';

const CHART_COLORS = [
  '#1976d2', '#42a5f5', '#64b5f6', '#90caf9',
  '#bbdefb', '#e3f2fd', '#0d47a1', '#1565c0',
];

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const PRESET_LABELS: { key: DatePreset; label: string; testId: string }[] = [
  { key: 'all', label: 'Tout', testId: 'filter-all' },
  { key: 'today', label: "Aujourd'hui", testId: 'filter-today' },
  { key: 'week', label: 'Cette semaine', testId: 'filter-week' },
  { key: 'month', label: 'Ce mois-ci', testId: 'filter-month' },
  { key: 'year', label: 'Cette annee', testId: 'filter-year' },
];

function computeDateRange(preset: DatePreset, customStart: string, customEnd: string) {
  if (preset === 'all') return { start: undefined, end: undefined };

  if (preset === 'custom') {
    const s = customStart ? new Date(customStart) : undefined;
    if (s) s.setHours(0, 0, 0, 0);
    const e = customEnd ? new Date(customEnd) : undefined;
    if (e) e.setHours(23, 59, 59, 999);
    return { start: s?.toISOString(), end: e?.toISOString() };
  }

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
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
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user
    ? (user.first_name || user.username || '')
    : '';

  const [salesStats, setSalesStats] = useState<CashSessionStats | null>(null);
  const [receptionStats, setReceptionStats] = useState<ReceptionSummary | null>(null);
  const [receptionByCategory, setReceptionByCategory] = useState<CategoryStat[]>([]);
  const [salesByCategory, setSalesByCat] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = computeDateRange(preset, startDate, endDate);

      if (preset === 'custom' && start && end && start > end) {
        setError('La date de debut doit etre anterieure a la date de fin');
        setLoading(false);
        return;
      }

      const [cash, reception, recByCat, salesByCat] = await Promise.all([
        getCashSessionStats(start, end),
        getReceptionSummary(start, end),
        getReceptionByCategory(start, end),
        getSalesByCategory(start, end),
      ]);

      setSalesStats(cash);
      setReceptionStats(reception);
      setReceptionByCategory(recByCat);
      setSalesByCat(salesByCat);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Impossible de charger les statistiques: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handlePreset = (p: DatePreset) => setPreset(p);

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        setError('La date de debut doit etre anterieure a la date de fin');
        return;
      }
      setPreset('custom');
    }
  };

  const fmt = (v: number | undefined | null, suffix: string, decimals = 2) => {
    if (v == null) return `0${suffix}`;
    return `${Number(v).toFixed(decimals)}${suffix}`;
  };

  return (
    <div className={styles.container} data-testid="dashboard-page">
      {/* Welcome */}
      <section className={styles.welcome}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle} data-testid="dashboard-welcome">
            Bienvenue sur RecyClique{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className={styles.welcomeText}>
            Plateforme de gestion pour ressourceries.
            Gerez vos depots, suivez vos ventes et analysez vos performances.
          </p>
        </div>
        <Link to="/profil" className={styles.personalLink} data-testid="personal-dashboard-link">
          <IconUser size={18} />
          <span>Dashboard personnel</span>
        </Link>
      </section>

      {/* Filters */}
      <section className={styles.filterSection}>
        <div className={styles.filtersRow} role="group" aria-label="Filtres de periode">
          {PRESET_LABELS.map(({ key, label, testId }) => (
            <button
              key={key}
              type="button"
              className={`${styles.filterBtn} ${preset === key ? styles.filterBtnActive : ''}`}
              onClick={() => handlePreset(key)}
              data-testid={testId}
            >
              {label}
            </button>
          ))}

          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Date de debut"
            data-testid="filter-start-date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Date de fin"
            data-testid="filter-end-date"
          />
          <button
            type="button"
            className={`${styles.filterBtn} ${preset === 'custom' ? styles.filterBtnActive : ''}`}
            onClick={handleApplyCustom}
            disabled={!startDate || !endDate}
            data-testid="filter-apply-custom"
          >
            Appliquer dates
          </button>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Chargement des statistiques...</div>
      ) : (
        <>
          {/* Sales (Sorties) */}
          <section className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>Ventes (Sorties)</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard} data-testid="stat-sales-revenue">
                <div className={styles.statIcon}>
                  <IconCurrencyDollar size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {fmt(salesStats?.total_sales, '\u202F\u20AC')}
                  </div>
                  <div className={styles.statLabel}>Chiffre d'affaires</div>
                </div>
              </div>

              <div className={styles.statCard} data-testid="stat-sales-donations">
                <div className={styles.statIcon}>
                  <IconTrendingUp size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {fmt(salesStats?.total_donations, '\u202F\u20AC')}
                  </div>
                  <div className={styles.statLabel}>Total des dons</div>
                </div>
              </div>

              <div className={styles.statCard} data-testid="stat-sales-weight">
                <div className={styles.statIcon}>
                  <IconScale size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {fmt(salesStats?.total_weight_sold, ' kg', 1)}
                  </div>
                  <div className={styles.statLabel}>Poids vendu</div>
                </div>
              </div>
            </div>
          </section>

          {/* Reception (Entrees) */}
          <section className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>Reception (Entrees)</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard} data-testid="stat-reception-weight">
                <div className={styles.statIcon}>
                  <IconScale size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {fmt(receptionStats?.total_weight, ' kg', 1)}
                  </div>
                  <div className={styles.statLabel}>Poids recu</div>
                </div>
              </div>

              <div className={styles.statCard} data-testid="stat-reception-items">
                <div className={styles.statIcon}>
                  <IconPackage size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {receptionStats?.total_items ?? 0}
                  </div>
                  <div className={styles.statLabel}>Lignes de reception</div>
                </div>
              </div>
            </div>
          </section>

          {/* Charts — Reception */}
          {receptionByCategory.length > 0 && (
            <>
              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  Analyse Detaillee de la Reception - Poids par Categorie
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={receptionByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)} kg`, 'Poids']} />
                    <Legend />
                    <Bar dataKey="total_weight" fill="#1976d2" name="Poids (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  Analyse Detaillee de la Reception - Articles par Categorie
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={receptionByCategory}
                      dataKey="total_items"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label
                    >
                      {receptionByCategory.map((_entry, idx) => (
                        <Cell key={`rec-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </section>
            </>
          )}

          {receptionByCategory.length === 0 && (
            <section className={styles.chartSection}>
              <p className={styles.emptyChart}>
                Aucune donnee de categorie disponible pour la periode selectionnee
              </p>
            </section>
          )}

          {/* Charts — Sorties */}
          {salesByCategory.length > 0 && (
            <>
              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  Analyse Detaillee des Sorties - Poids par Categorie
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salesByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)} kg`, 'Poids']} />
                    <Legend />
                    <Bar dataKey="total_weight" fill="#42a5f5" name="Poids (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  Analyse Detaillee des Sorties - Articles par Categorie
                </h2>
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
                      {salesByCategory.map((_entry, idx) => (
                        <Cell key={`sales-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </section>
            </>
          )}

          {salesByCategory.length === 0 && (
            <section className={styles.chartSection}>
              <h2 className={styles.chartTitle}>Analyse Detaillee des Sorties</h2>
              <p className={styles.emptyChart}>
                Aucune donnee de vente par categorie disponible pour la periode selectionnee
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
