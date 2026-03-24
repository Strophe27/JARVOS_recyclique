import React from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ChartContainer = styled.div`
  background: #fff;
  padding: 24px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  margin-bottom: 24px;
`;

const ChartTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
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

interface ComparisonChartProps {
  data: ComparisonData;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  // Préparer les données pour le graphique de poids
  const weightData = [
    {
      name: 'Poids',
      'Période 1': data.period1.weight,
      'Période 2': data.period2.weight
    }
  ];

  // Préparer les données pour le graphique d'articles
  const itemsData = [
    {
      name: 'Articles',
      'Période 1': data.period1.items,
      'Période 2': data.period2.items
    }
  ];

  return (
    <>
      <ChartContainer>
        <ChartTitle>Comparaison du Poids (kg)</ChartTitle>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: any) => {
                const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
                return [`${numValue.toFixed(2)} kg`, ''];
              }}
            />
            <Legend />
            <Bar dataKey="Période 1" fill="#1976d2" name="Période 1" />
            <Bar dataKey="Période 2" fill="#42a5f5" name="Période 2" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer>
        <ChartTitle>Comparaison du Nombre d'Articles</ChartTitle>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={itemsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Nombre d\'articles', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: any) => {
                const numValue = typeof value === 'number' ? value : parseInt(String(value || 0), 10);
                return [`${Math.round(numValue)} articles`, ''];
              }}
            />
            <Legend />
            <Bar dataKey="Période 1" fill="#1976d2" name="Période 1" />
            <Bar dataKey="Période 2" fill="#42a5f5" name="Période 2" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </>
  );
};

export default ComparisonChart;

