import React from 'react';
import styled from 'styled-components';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`;

const CardTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`;

const CardSubValue = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
`;

const ComparisonCard = styled(Card).withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'positive' | 'negative' | 'neutral' }>`
  ${props => {
    if (props.variant === 'positive') {
      return `
        border-color: #10b981;
        background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      `;
    }
    if (props.variant === 'negative') {
      return `
        border-color: #ef4444;
        background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
      `;
    }
    return '';
  }}
`;

const TrendIcon = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant'
})<{ variant?: 'positive' | 'negative' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  color: ${props => {
    if (props.variant === 'positive') return '#10b981';
    if (props.variant === 'negative') return '#ef4444';
    return '#6b7280';
  }};
`;

const ComparisonValue = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface ComparisonData {
  period1: { weight: number; items: number };
  period2: { weight: number; items: number };
  difference: {
    weight_diff: number;
    weight_percent: number;
    items_diff: number;
  };
}

interface ComparisonCardsProps {
  data: ComparisonData;
}

const ComparisonCards: React.FC<ComparisonCardsProps> = ({ data }) => {
  const { period1, period2, difference } = data;

  // Déterminer la variante pour la card de comparaison
  const getVariant = (): 'positive' | 'negative' | 'neutral' => {
    if (difference.weight_diff > 0) return 'positive';
    if (difference.weight_diff < 0) return 'negative';
    return 'neutral';
  };

  const variant = getVariant();

  // Formater le pourcentage
  const formatPercent = (value: number | string | undefined | null): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    if (isNaN(numValue)) return '+0.0%';
    const sign = numValue >= 0 ? '+' : '';
    return `${sign}${numValue.toFixed(1)}%`;
  };

  // Formater le poids
  const formatWeight = (value: number | string | undefined | null): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    if (isNaN(numValue)) return '0.00 kg';
    return `${numValue.toFixed(2)} kg`;
  };

  return (
    <CardsGrid>
      <Card>
        <CardTitle>Période 1</CardTitle>
        <CardValue>{formatWeight(period1.weight)}</CardValue>
        <CardSubValue>{period1.items} lignes de vente</CardSubValue>
      </Card>

      <Card>
        <CardTitle>Période 2</CardTitle>
        <CardValue>{formatWeight(period2.weight)}</CardValue>
        <CardSubValue>{period2.items} lignes de vente</CardSubValue>
      </Card>

      <ComparisonCard variant={variant}>
        <CardTitle>Comparaison</CardTitle>
        <ComparisonValue>
          <CardValue>
            {difference.weight_diff >= 0 ? '+' : ''}
            {formatWeight(difference.weight_diff)}
          </CardValue>
          <TrendIcon variant={variant}>
            {variant === 'positive' && <TrendingUp size={20} />}
            {variant === 'negative' && <TrendingDown size={20} />}
            {variant === 'neutral' && <Minus size={20} />}
          </TrendIcon>
        </ComparisonValue>
        <CardSubValue>
          {formatPercent(difference.weight_percent)} de variation
        </CardSubValue>
        <CardSubValue style={{ marginTop: '4px' }}>
          {difference.items_diff >= 0 ? '+' : ''}
          {difference.items_diff} lignes de vente
        </CardSubValue>
      </ComparisonCard>
    </CardsGrid>
  );
};

export default ComparisonCards;

