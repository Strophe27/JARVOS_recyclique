import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { getSalesByCategory } from '../../services/api';
import { categoryService, Category } from '../../services/categoryService';
import PeriodSelector from '../../components/Admin/PeriodSelector';
import ComparisonCards from '../../components/Admin/ComparisonCards';
import ComparisonChart from '../../components/Admin/ComparisonChart';

const Container = styled.div`
  padding: 24px;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  color: #1f2937;
`;

const FiltersSection = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #111827;
  }
`;

const ResultsSection = styled.div`
  margin-bottom: 24px;
`;

const ActionsSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button<{ $variant?: 'primary' | 'ghost'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: ${p => p.$variant === 'ghost' ? '1px solid #e5e7eb' : 'none'};
  background: ${p => {
    if (p.$disabled) return '#f3f4f6';
    return p.$variant === 'ghost' ? '#fff' : '#111827';
  }};
  color: ${p => {
    if (p.$disabled) return '#9ca3af';
    return p.$variant === 'ghost' ? '#111827' : '#fff';
  }};
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${p => p.$variant === 'ghost' ? '#f3f4f6' : '#374151'};
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #6b7280;
  font-size: 0.95rem;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-bottom: 16px;
`;

interface PeriodData {
  weight: number;
  items: number;
}

interface ComparisonData {
  period1: PeriodData;
  period2: PeriodData;
  difference: {
    weight_diff: number;
    weight_percent: number;
    items_diff: number;
  };
}

const QuickAnalysis: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [period1Start, setPeriod1Start] = useState<string>('');
  const [period1End, setPeriod1End] = useState<string>('');
  const [period2Start, setPeriod2Start] = useState<string>('');
  const [period2End, setPeriod2End] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Charger les catégories au montage
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await categoryService.getCategories(true); // Seulement les actives
        // Filtrer pour ne garder que les catégories principales (parent_id === null)
        const mainCats = cats.filter(cat => !cat.parent_id);
        setCategories(mainCats);
        // Sélectionner "Toutes" par défaut (vide = toutes)
        setSelectedCategory('');
      } catch (err: any) {
        console.error('Erreur lors du chargement des catégories:', err);
        setError('Impossible de charger les catégories');
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Fonction pour charger les données d'une période
  const loadPeriodData = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<PeriodData> => {
    if (!startDate || !endDate) {
      return { weight: 0, items: 0 };
    }

    try {
      // Formater les dates en ISO 8601
      const startISO = new Date(startDate).toISOString();
      const endISO = new Date(endDate + 'T23:59:59.999Z').toISOString();

      const stats = await getSalesByCategory(startISO, endISO);
      
      if (!Array.isArray(stats)) {
        return { weight: 0, items: 0 };
      }

      // Filtrer par catégorie si sélectionnée
      let filteredStats = stats;
      if (selectedCategory) {
        filteredStats = stats.filter(
          (stat: any) => stat.category_name === selectedCategory
        );
      }

      // Agréger les données (s'assurer que les valeurs sont des nombres)
      const totalWeight = filteredStats.reduce(
        (sum: number, stat: any) => {
          const weight = typeof stat.total_weight === 'number' 
            ? stat.total_weight 
            : parseFloat(String(stat.total_weight || 0));
          return sum + (isNaN(weight) ? 0 : weight);
        },
        0
      );
      const totalItems = filteredStats.reduce(
        (sum: number, stat: any) => {
          const items = typeof stat.total_items === 'number'
            ? stat.total_items
            : parseInt(String(stat.total_items || 0), 10);
          return sum + (isNaN(items) ? 0 : items);
        },
        0
      );

      return { weight: totalWeight, items: totalItems };
    } catch (err: any) {
      console.error('Erreur lors du chargement des stats:', err);
      throw err;
    }
  }, [selectedCategory]);

  // Charger les données de comparaison
  const loadComparisonData = useCallback(async () => {
    if (!period1Start || !period1End || !period2Start || !period2End) {
      setComparisonData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [data1, data2] = await Promise.all([
        loadPeriodData(period1Start, period1End),
        loadPeriodData(period2Start, period2End)
      ]);

      // Calculer la différence
      const weightDiff = data1.weight - data2.weight;
      const weightPercent = data2.weight > 0 
        ? ((weightDiff / data2.weight) * 100) 
        : (data1.weight > 0 ? 100 : 0);
      const itemsDiff = data1.items - data2.items;

      setComparisonData({
        period1: data1,
        period2: data2,
        difference: {
          weight_diff: weightDiff,
          weight_percent: weightPercent,
          items_diff: itemsDiff
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des données');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  }, [period1Start, period1End, period2Start, period2End, loadPeriodData]);

  // Recharger automatiquement quand les périodes ou la catégorie changent
  useEffect(() => {
    if (period1Start && period1End && period2Start && period2End) {
      const timer = setTimeout(() => {
        loadComparisonData();
      }, 300); // Debounce de 300ms
      return () => clearTimeout(timer);
    }
  }, [period1Start, period1End, period2Start, period2End, selectedCategory, loadComparisonData]);

  const handlePeriod1Change = (start: string, end: string) => {
    setPeriod1Start(start);
    setPeriod1End(end);
  };

  const handlePeriod2Change = (start: string, end: string) => {
    setPeriod2Start(start);
    setPeriod2End(end);
  };

  const handleRefresh = () => {
    loadComparisonData();
  };

  return (
    <Container>
      <TitleBar>
        <Title>Analyse Rapide - Comparaison de Périodes</Title>
      </TitleBar>

      <FiltersSection>
        <FiltersGrid>
          <FilterGroup>
            <Label>Catégorie</Label>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loadingCategories}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FilterGroup>

          <FilterGroup>
            <Label>Période 1</Label>
            <PeriodSelector
              onPeriodChange={handlePeriod1Change}
              quickButtons={[
                { label: 'Aujourd\'hui', daysOffset: 0 },
                { label: 'Hier', daysOffset: -1 },
                { label: 'Avant-hier', daysOffset: -2 }
              ]}
            />
          </FilterGroup>

          <FilterGroup>
            <Label>Période 2</Label>
            <PeriodSelector
              onPeriodChange={handlePeriod2Change}
              quickButtons={[
                { label: 'Il y a 7 jours', daysOffset: -7 },
                { label: 'Semaine dernière', daysOffset: -7, sameDayOfWeek: true },
                { label: 'Mois dernier', daysOffset: -30, sameDayOfWeek: true }
              ]}
            />
          </FilterGroup>
        </FiltersGrid>
      </FiltersSection>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading && <LoadingSpinner>Chargement des données...</LoadingSpinner>}

      {!loading && comparisonData && (
        <ResultsSection>
          <ComparisonCards data={comparisonData} />
          <ComparisonChart data={comparisonData} />
        </ResultsSection>
      )}

      {!loading && !comparisonData && period1Start && period1End && period2Start && period2End && (
        <LoadingSpinner>Aucune donnée disponible pour ces périodes</LoadingSpinner>
      )}

      <ActionsSection>
        <Button $disabled onClick={() => {}}>
          <Download size={18} />
          Exporter (À venir)
        </Button>
        <Button $variant="ghost" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={18} />
          Actualiser
        </Button>
      </ActionsSection>
    </Container>
  );
};

export default QuickAnalysis;

