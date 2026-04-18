import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Calendar } from 'lucide-react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DateInput = styled.input`
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

const QuickButtons = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const QuickButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  &:active {
    background: #e5e7eb;
  }
`;

interface PeriodSelectorProps {
  onPeriodChange: (start: string, end: string) => void;
  quickButtons?: Array<{
    label: string;
    daysOffset: number;
    sameDayOfWeek?: boolean;
  }>;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  onPeriodChange,
  quickButtons = []
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Formater la date en YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculer une date avec offset
  const getDateWithOffset = (
    daysOffset: number,
    sameDayOfWeek: boolean = false
  ): Date => {
    const today = new Date();
    const targetDate = new Date(today);
    
    if (sameDayOfWeek) {
      // Pour "semaine dernière" ou "mois dernier", on veut le même jour de la semaine/mois
      // Exemple: si aujourd'hui est mercredi, "semaine dernière" = mercredi de la semaine dernière
      targetDate.setDate(today.getDate() + daysOffset);
    } else {
      // Pour "il y a X jours", on soustrait simplement
      targetDate.setDate(today.getDate() + daysOffset);
    }
    
    return targetDate;
  };

  // Gérer le changement de date de début
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (newStart && endDate) {
      onPeriodChange(newStart, endDate);
    } else if (newStart && !endDate) {
      // Si on a une date de début mais pas de fin, utiliser la même date
      setEndDate(newStart);
      onPeriodChange(newStart, newStart);
    }
  };

  // Gérer le changement de date de fin
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    if (startDate && newEnd) {
      onPeriodChange(startDate, newEnd);
    }
  };

  // Gérer les boutons rapides
  const handleQuickButton = (
    daysOffset: number,
    sameDayOfWeek: boolean = false
  ) => {
    const targetDate = getDateWithOffset(daysOffset, sameDayOfWeek);
    const dateStr = formatDate(targetDate);
    setStartDate(dateStr);
    setEndDate(dateStr);
    onPeriodChange(dateStr, dateStr);
  };

  return (
    <Container>
      <DateInput
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
        placeholder="Date début"
      />
      {startDate && (
        <DateInput
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Date fin"
          min={startDate}
        />
      )}
      {quickButtons.length > 0 && (
        <QuickButtons>
          {quickButtons.map((btn, idx) => (
            <QuickButton
              key={idx}
              onClick={() => handleQuickButton(btn.daysOffset, btn.sameDayOfWeek)}
            >
              {btn.label}
            </QuickButton>
          ))}
        </QuickButtons>
      )}
    </Container>
  );
};

export default PeriodSelector;

