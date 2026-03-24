import React, { useState } from 'react'
import styled from 'styled-components'
import { ChevronDown, ChevronUp } from 'lucide-react'

const AccordionContainer = styled.div`
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
`

const AccordionHeader = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: ${p => p.$isOpen ? '#f9fafb' : '#fff'};
  border: none;
  border-bottom: ${p => p.$isOpen ? '1px solid #e5e7eb' : 'none'};
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #111827;
  transition: background-color 0.2s;
  
  &:hover {
    background: #f9fafb;
  }
`

const AccordionContent = styled.div<{ $isOpen: boolean }>`
  max-height: ${p => p.$isOpen ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.2s ease-out;
  padding: ${p => p.$isOpen ? '16px' : '0 16px'};
`

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: #4b5563;
`

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #111827;
  }
`

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
  background: #fff;
  
  &:focus {
    outline: none;
    border-color: #111827;
  }
`

const MultiSelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  user-select: none;
  
  input[type="checkbox"] {
    cursor: pointer;
    pointer-events: auto;
  }
`

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ToggleSwitch = styled.input.attrs({ type: 'checkbox' })`
  width: 40px;
  height: 20px;
  appearance: none;
  background: #e5e7eb;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:checked {
    background: #111827;
  }
  
  &:before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }
  
  &:checked:before {
    transform: translateX(20px);
  }
`

interface AdvancedFiltersAccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export const AdvancedFiltersAccordion: React.FC<AdvancedFiltersAccordionProps> = ({
  title,
  children,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <AccordionContainer>
      <AccordionHeader $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <span>{title}</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </AccordionHeader>
      <AccordionContent $isOpen={isOpen}>
        {children}
      </AccordionContent>
    </AccordionContainer>
  )
}

// Composants de formulaire réutilisables
export const FilterInput: React.FC<{
  label: string
  type?: string
  value: string | number | undefined
  onChange: (value: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
}> = ({ label, type = 'text', value, onChange, placeholder, min, max, step }) => (
  <FilterGroup>
    <Label>{label}</Label>
    <Input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
    />
  </FilterGroup>
)

export const FilterSelect: React.FC<{
  label: string
  value: string | undefined
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}> = ({ label, value, onChange, options }) => (
  <FilterGroup>
    <Label>{label}</Label>
    <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Tous</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  </FilterGroup>
)

export const FilterMultiSelect: React.FC<{
  label: string
  selected: string[]
  onChange: (selected: string[]) => void
  options: Array<{ value: string; label: string }>
}> = ({ label, selected, onChange, options }) => (
  <FilterGroup>
    <Label>{label}</Label>
    <MultiSelectContainer>
      <CheckboxGroup onClick={(e) => e.stopPropagation()}>
        {options.map(opt => (
          <CheckboxLabel 
            key={opt.value}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={(e) => {
                e.stopPropagation()
                if (e.target.checked) {
                  onChange([...selected, opt.value])
                } else {
                  onChange(selected.filter(v => v !== opt.value))
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span>{opt.label}</span>
          </CheckboxLabel>
        ))}
      </CheckboxGroup>
    </MultiSelectContainer>
  </FilterGroup>
)

export const FilterToggle: React.FC<{
  label: string
  checked: boolean | undefined
  onChange: (checked: boolean) => void
}> = ({ label, checked, onChange }) => (
  <FilterGroup>
    <ToggleContainer>
      <Label>{label}</Label>
      <ToggleSwitch
        checked={checked || false}
        onChange={(e) => onChange(e.target.checked)}
      />
    </ToggleContainer>
  </FilterGroup>
)

export const FiltersGridContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FiltersGrid>{children}</FiltersGrid>
)

