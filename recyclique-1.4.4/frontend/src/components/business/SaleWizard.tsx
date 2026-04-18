import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Text } from '@mantine/core';
import CategorySelector from './CategorySelector';
import EnhancedCategorySelector from '../categories/EnhancedCategorySelector';
import MultipleWeightEntry from './MultipleWeightEntry';
import StagingItem from './StagingItem';
import PresetButtonGrid from '../presets/PresetButtonGrid';
import PriceCalculator from '../presets/PriceCalculator';
import { useCategoryStore } from '../../stores/categoryStore';
import { usePresetStore } from '../../stores/presetStore';
import { PresetButtonWithCategory } from '../../services/presetService';
import { useCashStores } from '../../providers/CashStoreProvider';  // B50-P10: Utiliser le store injecté
import { keyboardShortcutHandler } from '../../utils/keyboardShortcuts';
import { cashKeyboardShortcutHandler } from '../../utils/cashKeyboardShortcuts';
import {
  applyDigit,
  applyDecimalPoint,
  formatWeightDisplay,
  handleAZERTYWeightKey,
} from '../../utils/weightMask';
import { computeLineAmount, formatLineAmount } from '../../utils/lineAmount';
import { createAZERTYHandler } from '../../utils/azertyKeyboard';
import { useFeatureFlag } from '../../utils/features';
import { useCashWizardStepState, CashWizardStep } from '../../hooks/useCashWizardStepState';

// Removed TwoColumnLayout - numpad is now in parent Sale.tsx

const WizardContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModeSelector = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const CategoryContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin: 0.5rem 0;
`;

const CategoryButton = styled.button<{ $selected?: boolean }>`
  padding: 0.75rem;
  min-height: 44px;
  border: 2px solid ${props => props.$selected ? '#2c5530' : '#ddd'};
  background: ${props => props.$selected ? '#e8f5e8' : 'white'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    border-color: #2c5530;
    background: #f0f8f0;
  }

  &:focus {
    outline: 2px solid #2c5530;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CategoryName = styled.div`
  font-weight: bold;
  margin-bottom: 0.25rem;
`;

const CategoryDescription = styled.div`
  font-size: 0.85rem;
  color: #666;
  text-align: right;
  padding-right: 3rem; /* Espace pour éviter le badge de raccourci */
`;

const ShortcutBadge = styled.div`
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(44, 85, 48, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  pointer-events: none;
`;

const ModeButton = styled.button<{ $active?: boolean, $completed?: boolean, $inactive?: boolean }>`
  padding: 0.6rem 1.25rem;
  min-height: 44px;
  border: 2px solid ${props => {
    if (props.$active) return '#2c5530';
    if (props.$completed) return '#4CAF50';
    return '#ddd';
  }};
  background: ${props => {
    if (props.$active) return '#2c5530';
    if (props.$completed) return '#e8f5e8';
    return 'white';
  }};
  color: ${props => {
    if (props.$active) return '#ffffff';
    if (props.$completed) return '#2c5530';
    return '#333';
  }};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 0.9rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 8px;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      if (props.$active) return '#fff';
      if (props.$completed) return '#4CAF50';
      return '#ccc';
    }};
  }

  &:hover {
    border-color: #2c5530;
    background: ${props => {
      if (props.$active) return '#2c5530';
      if (props.$completed) return '#e8f5e8';
      return '#f0f8f0';
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ModeContent = styled.div`
  min-height: 0; /* IMPORTANT pour flexbox */
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 0.5rem;
  scrollbar-gutter: stable;
`;

const ModeTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #2c5530;
  font-size: 1.1rem;
`;

const StepContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
`;

const StepTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c5530;
  font-size: 1.2rem;
  text-align: center;
`;

const DisplayValue = styled.div<{ $isValid?: boolean }>`
  background: #f8f9fa;
  border: 2px solid ${props => props.$isValid === false ? '#dc3545' : '#ddd'};
  border-radius: 8px;
  padding: 1rem;
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  margin: 0.5rem 0;
  transition: border-color 0.2s;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
  min-height: 1.25rem;
`;

const HelpMessage = styled.div`
  color: #6c757d;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  text-align: center;
  min-height: 1rem;
`;

const InfoSection = styled.div`
  background: #f8f9fa;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  flex: 1;
`;

const PriceStepLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;

  @media (min-width: 1200px) {
    flex-direction: row;
    align-items: flex-start;
  }
`;

const PriceColumn = styled.div<{ $secondary?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  flex: 1;

  ${({ $secondary }) =>
    $secondary &&
    `
      @media (min-width: 1200px) {
        max-width: 380px;
      }
    `}
`;

const ValidateButton = styled.button`
  padding: 1rem 2rem;
  background: #2c5530;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 1.1rem;
  transition: background 0.2s;
  margin-top: auto;

  &:hover {
    background: #1e3d21;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export interface SaleItemData {
  category: string;
  subcategory?: string;
  quantity: number;
  weight: number;
  price: number;
  total: number;
  preset_id?: string;
  notes?: string;
}

export interface NumpadCallbacks {
  quantityValue: string;
  quantityError: string;
  priceValue: string;
  priceError: string;
  weightValue: string;
  weightError: string;
  setQuantityValue: (value: string) => void;
  setQuantityError: (error: string) => void;
  setPriceValue: (value: string) => void;
  setPriceError: (error: string) => void;
  setWeightValue: (value: string) => void;
  setWeightError: (error: string) => void;
  setMode: (mode: 'quantity' | 'price' | 'weight' | 'idle') => void;
  setPricePrefilled: (prefilled: boolean) => void;
}

export interface SaleWizardProps {
  registerOptions?: Record<string, any>;  // B49-P3: Options de workflow du register
  onItemComplete: (item: SaleItemData) => void;
  numpadCallbacks: NumpadCallbacks;
  currentMode: 'quantity' | 'price' | 'weight' | 'idle';
}

export const SaleWizard: React.FC<SaleWizardProps> = ({ onItemComplete, numpadCallbacks, currentMode, registerOptions }) => {
  const { getCategoryById, activeCategories } = useCategoryStore();
  const { selectedPreset, notes, clearSelection } = usePresetStore();
  const { cashSessionStore } = useCashStores();  // B50-P10: Utiliser le store injecté
  const { currentRegisterOptions: storeOptions, currentSaleItems } = cashSessionStore;
  const {
    stepState,
    transitionToStep,
    handleCategorySelected,
    handleSubcategorySelected,
    handleWeightInputStarted,
    handleWeightInputCompleted,
    handleQuantityInputCompleted,
    handlePriceInputCompleted
  } = useCashWizardStepState();

  // B49-P3: Utiliser les options passées en props (priorité) ou depuis le store
  const effectiveOptions = registerOptions || storeOptions;
  // Story B49-P2: Détecter si le mode prix global est activé
  const isNoItemPricingEnabled = effectiveOptions?.features?.no_item_pricing?.enabled === true;
  
  // Story B49-P6: Détection type premier article (recyclage/déchèterie)
  const isRecyclingTicket = useMemo(() => {
    return currentSaleItems[0]?.presetId === 'recyclage' || currentSaleItems[0]?.presetId === 'decheterie';
  }, [currentSaleItems]);

  // Feature flag for cash keyboard shortcuts
  const enableCashHotkeys = useFeatureFlag('enableCashHotkeys');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [weightError, setWeightError] = useState<string>('');
  const [shortcutKeys, setShortcutKeys] = useState<{ [categoryId: string]: string }>({});

  // État local pour gérer les presets/notes par transaction (au lieu du store global)
  const [currentTransactionPreset, setCurrentTransactionPreset] = useState<PresetButtonWithCategory | null>(null);
  const [currentTransactionNotes, setCurrentTransactionNotes] = useState<string>('');


  // Initialize keyboard shortcuts when categories are available
  useEffect(() => {
    if (activeCategories.length === 0) {
      return;
    }

    // Root categories (no parent) sorted like CategorySelector
    const rootCategories = activeCategories
      .filter(category => !category.parent_id)
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return a.name.localeCompare(b.name);
      });

    // Subcategories of the currently selected category (will be sorted by AZERTY shortcut after initialization)
    const subcategories = selectedCategory
      ? activeCategories.filter(category => category.parent_id === selectedCategory)
      : [];

    // Handle cash keyboard shortcuts if feature flag is enabled
    if (enableCashHotkeys) {
      const newShortcutKeys: { [categoryId: string]: string } = {};

      if (stepState.currentStep === 'category') {
        // AZERTY mapping for root categories
        cashKeyboardShortcutHandler.initialize(
          rootCategories.map(cat => ({ id: cat.id, name: cat.name })),
          handleCategorySelect
        );

        cashKeyboardShortcutHandler.getShortcuts().forEach(shortcut => {
          newShortcutKeys[shortcut.categoryId] = shortcut.key;
        });

        setShortcutKeys(newShortcutKeys);

        if (rootCategories.length > 0) {
          cashKeyboardShortcutHandler.activate();
        } else {
          cashKeyboardShortcutHandler.deactivate();
        }
      } else if (stepState.currentStep === 'subcategory' && subcategories.length > 0) {
        // AZERTY mapping for subcategories of the selected category
        cashKeyboardShortcutHandler.initialize(
          subcategories.map(cat => ({ id: cat.id, name: cat.name })),
          handleSubcategorySelect
        );

        cashKeyboardShortcutHandler.getShortcuts().forEach(shortcut => {
          newShortcutKeys[shortcut.categoryId] = shortcut.key;
        });

        setShortcutKeys(newShortcutKeys);

        cashKeyboardShortcutHandler.activate();
      } else {
        // Other steps: no category shortcuts
        cashKeyboardShortcutHandler.deactivate();
        setShortcutKeys({});
      }

      // Deactivate legacy handler when using new cash shortcuts
      keyboardShortcutHandler.deactivate();
    } else {
      // Legacy keyboardShortcutHandler (backward compatibility)
      const categoriesForLegacy =
        stepState.currentStep === 'category'
          ? rootCategories
          : stepState.currentStep === 'subcategory' && subcategories.length > 0
            ? subcategories
            : [];

      keyboardShortcutHandler.initialize(
        categoriesForLegacy,
        stepState.currentStep === 'category' ? handleCategorySelect : handleSubcategorySelect
      );

      setShortcutKeys({});

      if (
        categoriesForLegacy.length > 0 &&
        (stepState.currentStep === 'category' || stepState.currentStep === 'subcategory')
      ) {
        keyboardShortcutHandler.activate();
      } else {
        keyboardShortcutHandler.deactivate();
      }

      // Deactivate cash shortcuts when not using them
      cashKeyboardShortcutHandler.deactivate();
    }

    // Cleanup on unmount / step change
    return () => {
      keyboardShortcutHandler.deactivate();
      cashKeyboardShortcutHandler.deactivate();
    };
  }, [activeCategories, stepState.currentStep, selectedCategory, enableCashHotkeys]);

  // Use numpad state from parent - now properly separated
  const quantity = numpadCallbacks.quantityValue;
  const quantityError = numpadCallbacks.quantityError;
  const price = numpadCallbacks.priceValue;
  const priceError = numpadCallbacks.priceError;


  // Helper function to sort categories/subcategories by AZERTY shortcut order
  const sortByAZERTYShortcut = useCallback((items: typeof activeCategories, shortcuts: { [categoryId: string]: string }) => {
    const keyOrder = 'AZERTYUIOPQSDFGHJKLMWXCVBN';
    return [...items].sort((a, b) => {
      const keyA = shortcuts[a.id]?.toUpperCase() || '';
      const keyB = shortcuts[b.id]?.toUpperCase() || '';
      const posA = keyOrder.indexOf(keyA);
      const posB = keyOrder.indexOf(keyB);
      
      // Items with shortcuts come first, sorted by AZERTY order
      if (posA !== -1 && posB !== -1) {
        return posA - posB;
      }
      // Items without shortcuts come last, sorted by name
      if (posA === -1 && posB === -1) {
        return a.name.localeCompare(b.name);
      }
      // Items with shortcuts come before items without
      return posA !== -1 ? -1 : 1;
    });
  }, []);

  // Keyboard handling removed - numpad in parent handles all input


  // Validation functions
  const validateWeight = (value: string): boolean => {
    if (!value) {
      setWeightError('Poids requis');
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0 || num > 9999.99) {
      setWeightError('Poids doit être supérieur à 0 et inférieur à 9999.99 kg');
      return false;
    }
    setWeightError('');
    return true;
  };

  const validatePrice = (value: string): boolean => {
    if (!value) {
      numpadCallbacks.setPriceError('Prix requis');
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      numpadCallbacks.setPriceError('Prix invalide');
      return false;
    }
    if (num < 0) {
      numpadCallbacks.setPriceError('Prix négatif interdit');
      return false;
    }
    if (num < 0.01 || num > 9999.99) {
      numpadCallbacks.setPriceError('Prix doit être entre 0.01€ et 9999.99€');
      return false;
    }
    numpadCallbacks.setPriceError('');
    return true;
  };

  const validateQuantity = (value: string): boolean => {
    if (!value) {
      numpadCallbacks.setQuantityError('Quantité requise');
      return false;
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 9999 || !Number.isInteger(parseFloat(value))) {
      numpadCallbacks.setQuantityError('La quantité minimale est 1');
      return false;
    }
    numpadCallbacks.setQuantityError('');
    return true;
  };

  const isQuantityValid = useMemo(() => {
    if (!quantity) return false;
    const num = parseInt(quantity, 10);
    return !isNaN(num) && num >= 1 && num <= 9999 && Number.isInteger(parseFloat(quantity));
  }, [quantity]);

  const isWeightValid = useMemo(() => {
    if (!weight) return false;
    const num = parseFloat(weight);
    return !isNaN(num) && num > 0 && num <= 9999.99;
  }, [weight]);

  const isPriceValid = useMemo(() => {
    // Les presets sont toujours valides
    if (currentTransactionPreset) {
      return true;
    }

    // Story B49-P2: En mode prix global, 0€ est valide
    if (isNoItemPricingEnabled) {
      if (!price) {
        return true; // 0€ par défaut est valide
      }
      const num = parseFloat(price);
      if (isNaN(num) || num < 0 || num > 9999.99) {
        return false;
      }
      return true;
    }

    // Workflow standard : prix requis et >= 0.01€
    if (!price) {
      return false;
    }

    const num = parseFloat(price);
    if (isNaN(num) || num < 0.01 || num > 9999.99) {
      return false;
    }
    return true;
  }, [price, currentTransactionPreset, isNoItemPricingEnabled]);

  // Removed handleNumberClick, handleDecimalClick, handleClear - now handled by parent numpad

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);

    // Check if this category has children (subcategories)
    const hasChildren = activeCategories.some(cat => cat.parent_id === categoryId);

    if (hasChildren) {
      // Go to subcategory step for subcategory selection
      transitionToStep('subcategory');
      numpadCallbacks.setMode('idle');
    } else {
      // No children, go to weight step
      transitionToStep('weight');
      // Initialize numpad for weight input
      numpadCallbacks.setWeightValue('');
      numpadCallbacks.setWeightError('');
      numpadCallbacks.setMode('weight');

      // Auto-focus sur le champ poids après sélection de catégorie (comme en Réception)
      setTimeout(() => {
        const weightInput = document.querySelector('[data-testid="weight-input"]');
        if (weightInput instanceof HTMLElement) {
          weightInput.focus();
        }
      }, 100);
    }
  };

  // Ordre de tabulation linéaire selon séquence Reception
  // Story B49-P2: Exclure 'quantity' de l'ordre si mode prix global activé
  const tabOrder: CashWizardStep[] = isNoItemPricingEnabled 
    ? ['category', 'subcategory', 'weight', 'price']
    : ['category', 'subcategory', 'weight', 'quantity', 'price'];

  // Détermine quels domaines sont actifs (déjà renseignés) pour la navigation TAB
  // Story B49-P2: Exclure 'quantity' si mode prix global activé
  const getActiveDomains = useCallback((): CashWizardStep[] => {
    const active: CashWizardStep[] = ['category']; // Catégorie toujours active
    
    // Sous-catégorie active seulement si catégorie sélectionnée ET sous-catégories existent
    // (même si pas encore sélectionnée, elle est disponible pour navigation)
    if (selectedCategory) {
      const hasSubcategories = activeCategories.some(cat => cat.parent_id === selectedCategory);
      if (hasSubcategories) {
        active.push('subcategory');
      }
    }
    
    // Poids actif si catégorie (ou sous-catégorie si nécessaire) sélectionnée
    // (même si pas encore renseigné, il est disponible pour navigation)
    if (selectedCategory) {
      const hasSubcategories = activeCategories.some(cat => cat.parent_id === selectedCategory);
      if (!hasSubcategories || selectedSubcategory) {
        active.push('weight');
      }
    }
    
    // Story B49-P2: Quantité active seulement si poids déjà renseigné ET mode prix global désactivé
    if (!isNoItemPricingEnabled && numpadCallbacks.weightValue && parseFloat(numpadCallbacks.weightValue) > 0) {
      active.push('quantity');
    }
    
    // Prix actif si :
    // - Mode prix global activé ET poids renseigné (on saute quantité)
    // - OU mode standard ET quantité déjà complétée
    if (isNoItemPricingEnabled) {
      if (numpadCallbacks.weightValue && parseFloat(numpadCallbacks.weightValue) > 0) {
        active.push('price');
      }
    } else {
      if (stepState.quantityState === 'completed') {
        active.push('price');
      }
    }
    
    return active;
  }, [selectedCategory, selectedSubcategory, activeCategories, numpadCallbacks.weightValue, stepState.quantityState, isNoItemPricingEnabled]);

  // Navigation tab uniquement entre domaines actifs
  const navigateToNextStep = useCallback((): void => {
    const activeDomains = getActiveDomains();
    if (activeDomains.length === 0) return;
    
    const currentIndex = activeDomains.indexOf(stepState.currentStep);
    let nextIndex: number;
    
    // Si on est au dernier domaine, boucler vers le premier
    if (currentIndex === -1 || currentIndex === activeDomains.length - 1) {
      nextIndex = 0;
    } else {
      nextIndex = currentIndex + 1;
    }
    
    const nextStep = activeDomains[nextIndex];
    transitionToStep(nextStep);
    
    switch (nextStep) {
      case 'category':
        numpadCallbacks.setMode('idle');
        break;
      case 'subcategory':
        numpadCallbacks.setMode('idle');
        break;
      case 'weight':
        numpadCallbacks.setMode('weight');
        break;
      case 'quantity':
        numpadCallbacks.setMode('quantity');
        break;
      case 'price':
        numpadCallbacks.setMode('price');
        break;
    }
  }, [stepState.currentStep, getActiveDomains, transitionToStep, numpadCallbacks]);

  const navigateToPreviousStep = useCallback((): void => {
    const activeDomains = getActiveDomains();
    if (activeDomains.length === 0) return;
    
    const currentIndex = activeDomains.indexOf(stepState.currentStep);
    let prevIndex: number;
    
    // Si on est au premier domaine, boucler vers le dernier
    if (currentIndex === -1 || currentIndex === 0) {
      prevIndex = activeDomains.length - 1;
    } else {
      prevIndex = currentIndex - 1;
    }
    
    const prevStep = activeDomains[prevIndex];
    transitionToStep(prevStep);
    
    switch (prevStep) {
      case 'category':
        numpadCallbacks.setMode('idle');
        break;
      case 'subcategory':
        numpadCallbacks.setMode('idle');
        break;
      case 'weight':
        numpadCallbacks.setMode('weight');
        break;
      case 'quantity':
        numpadCallbacks.setMode('quantity');
        break;
      case 'price':
        numpadCallbacks.setMode('price');
        break;
    }
  }, [stepState.currentStep, getActiveDomains, transitionToStep, numpadCallbacks]);

  // Refs pour stabiliser les valeurs dans le gestionnaire TAB (après déclaration des fonctions)
  const stepStateRef = useRef(stepState);
  const selectedCategoryRef = useRef(selectedCategory);
  const selectedSubcategoryRef = useRef(selectedSubcategory);
  const numpadCallbacksRef = useRef(numpadCallbacks);
  const quantityRef = useRef(quantity);
  const getActiveDomainsRef = useRef(getActiveDomains);
  const navigateToNextStepRef = useRef(navigateToNextStep);
  const navigateToPreviousStepRef = useRef(navigateToPreviousStep);
  
  // Mettre à jour les refs à chaque changement
  useEffect(() => {
    stepStateRef.current = stepState;
    selectedCategoryRef.current = selectedCategory;
    selectedSubcategoryRef.current = selectedSubcategory;
    numpadCallbacksRef.current = numpadCallbacks;
    quantityRef.current = quantity;
    getActiveDomainsRef.current = getActiveDomains;
    navigateToNextStepRef.current = navigateToNextStep;
    navigateToPreviousStepRef.current = navigateToPreviousStep;
  }, [stepState, selectedCategory, selectedSubcategory, numpadCallbacks, quantity, getActiveDomains, navigateToNextStep, navigateToPreviousStep]);

  // Gestionnaire d'événements Tab personnalisé - navigation uniquement entre domaines actifs
  useEffect(() => {
    const handleTabKey = (event: KeyboardEvent) => {
      // Ne gérer que les événements Tab
      if (event.key !== 'Tab') {
        return;
      }

      // Vérifier si le wizard existe dans le DOM et est visible
      const wizardElement = document.querySelector('[data-wizard="cash"]') as HTMLElement;
      if (!wizardElement) {
        return; // Pas de wizard, laisser le comportement par défaut
      }

      // Vérifier si le wizard est visible (pas caché par display:none ou visibility:hidden)
      const wizardStyle = window.getComputedStyle(wizardElement);
      if (wizardStyle.display === 'none' || wizardStyle.visibility === 'hidden') {
        return; // Wizard caché, laisser le comportement par défaut
      }

      // Vérifier si l'élément actif est dans le wizard
      const activeElement = document.activeElement as HTMLElement;
      const target = (event.target instanceof HTMLElement ? event.target : activeElement) as HTMLElement;
      
      // Vérifier si l'élément cible ou actif est dans le wizard
      // Si l'élément actif est body ou html, on considère qu'on est dans le wizard si le wizard est visible
      // Sinon, vérifier si l'élément est dans le wizard
      const isInWizard = !activeElement || 
                         activeElement === document.body || 
                         activeElement === document.documentElement ||
                         wizardElement.contains(target) || 
                         wizardElement.contains(activeElement) ||
                         (target && target.closest && target.closest('[data-wizard="cash"]') === wizardElement);

      // Si on n'est pas dans le wizard, laisser le comportement par défaut
      if (!isInWizard) {
        return;
      }

      // TOUJOURS empêcher le comportement par défaut de TAB dans le wizard IMMÉDIATEMENT
      // Appeler preventDefault AVANT toute autre logique pour garantir l'interception
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation(); // Empêcher d'autres gestionnaires d'être appelés

      // Utiliser les refs pour obtenir les valeurs actuelles sans dépendre des closures
      const currentStepState = stepStateRef.current;
      const currentGetActiveDomains = getActiveDomainsRef.current;
      const currentNavigateToNext = navigateToNextStepRef.current;
      const currentNavigateToPrev = navigateToPreviousStepRef.current;

      // Calculer la prochaine étape avant de naviguer
      const activeDomains = currentGetActiveDomains();
      if (activeDomains.length === 0) return;
      
      const currentIndex = activeDomains.indexOf(currentStepState.currentStep);
      let targetStep: CashWizardStep;
      
      if (event.shiftKey) {
        // Navigation arrière
        const prevIndex = currentIndex === -1 || currentIndex === 0 
          ? activeDomains.length - 1 
          : currentIndex - 1;
        targetStep = activeDomains[prevIndex];
        currentNavigateToPrev();
      } else {
        // Navigation avant
        const nextIndex = currentIndex === -1 || currentIndex === activeDomains.length - 1
          ? 0
          : currentIndex + 1;
        targetStep = activeDomains[nextIndex];
        currentNavigateToNext();
      }

      // Focus sur le premier élément focusable de l'étape cible
      setTimeout(() => {
        // Essayer d'abord le bouton du fil d'Ariane correspondant
        const breadcrumbButton = document.querySelector(
          `[role="tab"][aria-controls="step-${targetStep}"]`
        );
        if (breadcrumbButton instanceof HTMLButtonElement && !breadcrumbButton.disabled) {
          breadcrumbButton.focus();
          return;
        }

        // Sinon, chercher un élément focusable dans l'étape
        const focusableElement = document.querySelector(
          `[data-step="${targetStep}"] button:not([disabled]):not([tabindex="-1"]), [data-step="${targetStep}"] input:not([disabled]), [data-step="${targetStep}"] [tabindex="0"]:not([disabled])`
        );
        if (focusableElement instanceof HTMLElement) {
          focusableElement.focus();
        }
      }, 100);
    };

    // Attacher le gestionnaire sur document avec capture phase pour intercepter tôt
    // Utiliser capture phase pour intercepter avant les autres gestionnaires
    document.addEventListener('keydown', handleTabKey, true);
    return () => document.removeEventListener('keydown', handleTabKey, true);
  }, []); // Dépendances vides - utilise les refs pour les valeurs actuelles

  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    handleSubcategorySelected();
    // Initialize numpad for weight input
    numpadCallbacks.setWeightValue('');
    numpadCallbacks.setWeightError('');
    numpadCallbacks.setMode('weight');

    // Auto-focus sur le champ poids après sélection de sous-catégorie
    setTimeout(() => {
      const weightInput = document.querySelector('[data-testid="weight-input"]');
      if (weightInput instanceof HTMLElement) {
        weightInput.focus();
      }
    }, 100);
  };

  const handleQuantityConfirm = () => {
    if (!isQuantityValid) return;

    // Use subcategory if selected, otherwise use category
    const actualCategoryId = selectedSubcategory || selectedCategory;
    const category = getCategoryById(actualCategoryId);

    // Nouvelle logique:
    // - Toujours passer par l'étape prix pour permettre la sélection des boutons prédéfinis
    handleQuantityInputCompleted();

    // B39-P4: Pré-remplir avec le prix catalogue par défaut quand disponible
    const hasCatalogPrice = category?.price != null;
    if (hasCatalogPrice) {
      const priceValue =
        typeof category!.price === 'number'
          ? category!.price.toString()
          : category!.price ?? '';
      numpadCallbacks.setPriceValue(priceValue);
      numpadCallbacks.setPricePrefilled(true);
    } else {
      // Prix libre : champ vide pour saisie manuelle
      numpadCallbacks.setPriceValue('');
      numpadCallbacks.setPricePrefilled(false);
    }

    numpadCallbacks.setPriceError('');
    numpadCallbacks.setMode('price');

    // Auto-focus sur la section prix après validation de la quantité
    setTimeout(() => {
      const priceInput = document.querySelector('[data-testid="price-input"]');
      if (priceInput instanceof HTMLElement) {
        priceInput.focus();
      } else {
        // Si pas d'input prix (prix prédéfini), focus sur le bouton valider
        const validateButton = document.querySelector('[data-testid="add-item-button"]');
        if (validateButton instanceof HTMLElement) {
          validateButton.focus();
        }
      }
    }, 100);
  };

  const handleWeightConfirm = (totalWeight: number) => {
    // Store the total weight in state
    setWeight(totalWeight.toString());
    handleWeightInputCompleted();
    
    // Story B49-P2: Si mode prix global activé, passer directement à prix (sauter quantité)
    if (isNoItemPricingEnabled) {
      // Quantité = 1 par défaut en mode prix global
      numpadCallbacks.setQuantityValue('1');
      numpadCallbacks.setQuantityError('');
      // Passer directement à l'étape prix
      transitionToStep('price');
      numpadCallbacks.setMode('price');
      
      // Auto-focus sur la section prix après validation du poids
      setTimeout(() => {
        const priceInput = document.querySelector('[data-testid="price-input"]');
        if (priceInput instanceof HTMLElement) {
          priceInput.focus();
        }
      }, 100);
    } else {
      // Workflow standard : passer à quantité
      numpadCallbacks.setQuantityValue('1');
      numpadCallbacks.setQuantityError('');
      numpadCallbacks.setMode('quantity');

      // Auto-focus sur le champ quantité après validation du poids
      setTimeout(() => {
        const quantityInput = document.querySelector('[data-testid="quantity-input"]');
        if (quantityInput instanceof HTMLElement) {
          quantityInput.focus();
        }
      }, 100);
    }
  };

  const handlePriceConfirm = () => {
    if (!isPriceValid || !isWeightValid || !isQuantityValid) return;

    // Use subcategory if selected, otherwise use category
    const actualCategoryId = selectedSubcategory || selectedCategory;
    const category = getCategoryById(actualCategoryId);

    const numWeight = parseFloat(weight);
    const numQuantity = parseInt(quantity, 10);

    // Calcul du prix unitaire
    // IMPORTANT: Les presets (Don 0€, Don -18 ans, Recyclage, Déchèterie) ont toujours un prix unitaire de 0€
    // Le preset_price sert uniquement à identifier le type de transaction, pas à calculer le prix
    let finalPrice = 0;
    if (currentTransactionPreset) {
      // Si un preset est sélectionné, le prix unitaire est toujours 0€
      finalPrice = 0;
    } else if (price) {
      // Si pas de preset mais prix saisi manuellement, utiliser ce prix
      finalPrice = parseFloat(price);
    } else if (!isNoItemPricingEnabled && category?.price && !category?.max_price) {
      // Story B49-P2: En mode prix global, ne pas utiliser le prix automatique de la catégorie
      // Seuls les prix saisis manuellement doivent compter
      // En mode standard, si pas de prix saisi et pas de max_price (prix fixe), utiliser le prix minimum
      finalPrice = Number(category.price);
    }
    // En mode prix global, si pas de prix saisi, finalPrice reste à 0

    const totalPrice = finalPrice * numQuantity;

    onItemComplete({
      category: selectedCategory,
      subcategory: selectedSubcategory || undefined,
      quantity: numQuantity,
      weight: numWeight,
      price: finalPrice,
      total: totalPrice,
      preset_id: currentTransactionPreset?.id,
      notes: currentTransactionPreset ? currentTransactionNotes : undefined,
    });

    // Mark item as validated and reset wizard
    handlePriceInputCompleted();
    resetWizard();
  };

  const resetWizard = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setWeight('');
    setWeightError('');
    numpadCallbacks.setQuantityValue('1');
    numpadCallbacks.setQuantityError('');
    numpadCallbacks.setPriceValue('');
    numpadCallbacks.setPricePrefilled(false);
    numpadCallbacks.setPriceError('');
    numpadCallbacks.setWeightValue('');
    numpadCallbacks.setWeightError('');
    numpadCallbacks.setMode('idle');

    // Réinitialiser l'état local des presets/notes pour la prochaine transaction
    setCurrentTransactionPreset(null);
    setCurrentTransactionNotes('');
  };

  // Gestionnaire séparé pour la touche Entrée
  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        return; // Ignorer si on est dans un input
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (stepState.currentStep === 'quantity' && isQuantityValid) {
          handleQuantityConfirm();
        } else if (stepState.currentStep === 'price' && isPriceValid) {
          handlePriceConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleEnterKey);
    return () => document.removeEventListener('keydown', handleEnterKey);
  }, [stepState.currentStep, isQuantityValid, isPriceValid, handleQuantityConfirm, handlePriceConfirm]);

  const renderStepContent = () => {
    switch (stepState.currentStep) {
      case 'category':
        return (
          <ModeContent data-step="category" id="step-category" role="tabpanel" aria-labelledby="tab-category">
            <CategorySelector
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory}
              shortcutKeys={shortcutKeys}
            />
          </ModeContent>
        );

      case 'subcategory': {
        const subcategoriesRaw = activeCategories.filter(cat => cat.parent_id === selectedCategory);
        // Sort subcategories by AZERTY shortcut order (not by name)
        const subcategories = sortByAZERTYShortcut(subcategoriesRaw, shortcutKeys);
        return (
          <ModeContent data-step="subcategory" id="step-subcategory" role="tabpanel" aria-labelledby="tab-subcategory">
            <ModeTitle>Sélectionner la sous-catégorie</ModeTitle>
            <CategoryContainer role="group" aria-label="Sélection de sous-catégorie">
              {subcategories.map((subcat) => {
                // Format price display
                const formatPrice = () => {
                  if (subcat.price && subcat.max_price && Number(subcat.max_price) > 0) {
                    const minPrice = Number(subcat.price).toFixed(2);
                    const maxPrice = Number(subcat.max_price).toFixed(2);
                    return `${minPrice}€ - ${maxPrice}€`;
                  } else if (subcat.price) {
                    return `${Number(subcat.price).toFixed(2)}€`;
                  }
                  return 'Prix non défini';
                };

                return (
                  <CategoryButton
                    key={subcat.id}
                    $selected={selectedSubcategory === subcat.id}
                    onClick={() => handleSubcategorySelect(subcat.id)}
                    data-testid={`subcategory-${subcat.id}`}
                    data-selected={selectedSubcategory === subcat.id ? 'true' : 'false'}
                    aria-pressed={selectedSubcategory === subcat.id}
                    title={subcat.official_name ? `Dénomination officielle : ${subcat.official_name}` : undefined}  // Story B48-P5: Tooltip avec nom complet officiel si présent
                    aria-label={
                      shortcutKeys[subcat.id]
                        ? `Sélectionner la sous-catégorie ${subcat.name}. Raccourci clavier: ${shortcutKeys[subcat.id].toUpperCase()}`
                        : `Sélectionner la sous-catégorie ${subcat.name}`
                    }
                    style={{ position: 'relative' }}
                    tabIndex={-1}
                  >
                    <CategoryName>{subcat.name}</CategoryName>  {/* Story B48-P5: Nom court/rapide (toujours utilisé) */}
                    <CategoryDescription>{formatPrice()}</CategoryDescription>
                    {shortcutKeys[subcat.id] && (
                      <ShortcutBadge
                        aria-hidden="true"
                        data-testid={`subcategory-shortcut-${subcat.id}`}
                      >
                        {shortcutKeys[subcat.id].toUpperCase()}
                      </ShortcutBadge>
                    )}
                  </CategoryButton>
                );
              })}
            </CategoryContainer>
          </ModeContent>
        );
      }

      case 'quantity':
        // Calcul du prix total en temps réel
        const actualCategoryId = selectedSubcategory || selectedCategory;
        const category = getCategoryById(actualCategoryId);
        const unitPrice = category?.price ? Number(category.price) : 0;
        const quantityNum = quantity ? parseInt(quantity, 10) : 0;
        const lineAmount = computeLineAmount(unitPrice, quantityNum);

        return (
          <StepContent data-step="quantity" id="step-quantity" role="tabpanel" aria-labelledby="tab-quantity">
            <StepTitle>Quantité</StepTitle>
            <DisplayValue $isValid={!quantityError} data-testid="quantity-input">
              {quantity || '0'}
            </DisplayValue>
            <ErrorMessage>{quantityError}</ErrorMessage>

            {category?.price && !category?.max_price && quantity && isQuantityValid && (
              <InfoSection>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Calcul automatique
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2c5530' }}>
                  {formatLineAmount(unitPrice)} × {quantity} = {formatLineAmount(lineAmount)}
                </div>
              </InfoSection>
            )}

            <ValidateButton
              disabled={!isQuantityValid}
              onClick={handleQuantityConfirm}
              data-testid="validate-quantity-button"
            >
              Valider la quantité
            </ValidateButton>
          </StepContent>
        );

      case 'weight':
        return (
          <ModeContent data-step="weight" id="step-weight" role="tabpanel" aria-labelledby="tab-weight">
            <MultipleWeightEntry
              onValidate={handleWeightConfirm}
              currentWeight={numpadCallbacks.weightValue}
              weightError={numpadCallbacks.weightError}
              onClearWeight={() => {
                numpadCallbacks.setWeightValue('');
                numpadCallbacks.setWeightError('');
              }}
            />
          </ModeContent>
        );

      case 'price':
        // Story B49-P6: Filtrage presets selon nombre d'items et type de ticket
        const isFirstItem = currentSaleItems.length === 0;
        const hiddenPresetIds: string[] = [];
        
        if (!isFirstItem) {
          // À partir du 2ème article, filtrer les presets selon le type de ticket
          if (!isRecyclingTicket) {
            // Si premier article = vente normale (pas de Recyclage/Déchèterie), masquer Recyclage/Déchèterie
            // Garder uniquement Don et Don-18
            hiddenPresetIds.push('recyclage', 'decheterie');
          } else {
            // Si premier article = recyclage/déchèterie, masquer Don/Don-18
            // Garder uniquement Recyclage et Déchèterie
            hiddenPresetIds.push('don-0', 'don-18');
          }
        }
        
        return (
          <StepContent data-step="price" id="step-price" role="tabpanel" aria-labelledby="tab-price">
            <StepTitle>Prix unitaire</StepTitle>
            <PriceStepLayout>
              <PriceColumn>
                <PresetButtonGrid
                  selectedPreset={currentTransactionPreset}
                  onPresetSelect={setCurrentTransactionPreset}
                  onPresetSelected={(preset) => {
                    if (preset) {
                      // When a preset is selected, set the price to 0€ (presets always have 0€ unit price)
                      numpadCallbacks.setPriceValue('0');
                      numpadCallbacks.setPricePrefilled(false);
                    } else {
                      // When deselected, clear the price value to allow manual input
                      numpadCallbacks.setPriceValue('');
                      numpadCallbacks.setPricePrefilled(false);
                    }
                  }}
                  hiddenPresetIds={hiddenPresetIds}
                />

                {currentTransactionPreset && (() => {
                  // Récupérer le nom de la catégorie actuellement sélectionnée
                  const actualCategoryId = selectedSubcategory || selectedCategory;
                  const currentCategory = getCategoryById(actualCategoryId);
                  const currentCategoryName = currentCategory?.name;

                  return (
                    <PriceCalculator
                      selectedPreset={currentTransactionPreset}
                      notes={currentTransactionNotes}
                      onNotesChange={setCurrentTransactionNotes}
                      categoryName={currentCategoryName}
                      onPriceCalculated={(calculatedPrice) => {
                        numpadCallbacks.setPriceValue(calculatedPrice.toString());
                        numpadCallbacks.setPricePrefilled(false);
                      }}
                    />
                  );
                })()}

                {/* B39-P4: Toujours afficher le champ prix manuel, même avec tarif catalogue */}
                {/* Story B49-P2: Comportement dynamique en mode prix global */}
                <div>
                  <Text size="sm" fw={500} mb="xs" c="dimmed">
                    Prix manuel
                  </Text>
                  <DisplayValue 
                    $isValid={!priceError} 
                    data-testid="price-input"
                    style={{
                      // Story B49-P2: Grisé si 0€ et mode prix global (lecture seule)
                      opacity: isNoItemPricingEnabled && (!price || price === '0') ? 0.5 : 1,
                      cursor: isNoItemPricingEnabled && (!price || price === '0') ? 'default' : 'text'
                    }}
                  >
                    {price || '0'} €
                  </DisplayValue>
                </div>
              </PriceColumn>

              <PriceColumn $secondary>
                {(() => {
                  const cat = getCategoryById(selectedCategory);
                  const hasMax = cat?.max_price != null && Number(cat.max_price) > 0;
                  const hasMin = cat?.price != null;
                  if (hasMin && hasMax) {
                    const min = Number(cat!.price).toFixed(2);
                    const max = Number(cat!.max_price).toFixed(2);
                    return (
                      <InfoSection style={{ margin: 0 }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                          Fourchette de prix autorisée
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2c5530' }}>
                          {min} € – {max} €
                        </div>
                      </InfoSection>
                    );
                  } else if (hasMin && !hasMax) {
                    const min = Number(cat!.price).toFixed(2);
                    return (
                      <InfoSection style={{ margin: 0 }}>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                          Prix fixe (boutons prédéfinis disponibles)
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2c5530' }}>
                          {min} € (ou sélectionner un bouton)
                        </div>
                      </InfoSection>
                    );
                  }
                  return null;
                })()}

                <ErrorMessage>{priceError}</ErrorMessage>

                <ValidateButton
                  disabled={!isPriceValid}
                  onClick={handlePriceConfirm}
                  data-testid="add-item-button"
                >
                  {/* Story B49-P2: Bouton "Valider" en mode prix global, "Valider le prix" en mode standard */}
                  {isNoItemPricingEnabled ? 'Valider' : 'Valider le prix'}
                </ValidateButton>
              </PriceColumn>
            </PriceStepLayout>
          </StepContent>
        );

      default:
        return null;
    }
  };

  // Build staging item data for breadcrumb
  const stagingItemData = useMemo(() => {
    const categoryName = selectedCategory ? getCategoryById(selectedCategory)?.name : undefined;
    const subcategoryName = selectedSubcategory ? getCategoryById(selectedSubcategory)?.name : undefined;
    const quantityNum = quantity ? parseInt(quantity, 10) : undefined;
    const weightNum = weight ? parseFloat(weight) : undefined;
    const priceNum = price ? parseFloat(price) : undefined;

    return {
      categoryName,
      subcategoryName,
      quantity: quantityNum,
      weight: weightNum,
      price: priceNum,
    };
  }, [selectedCategory, selectedSubcategory, quantity, weight, price, getCategoryById]);

  return (
    <WizardContainer data-wizard="cash">
      <div>
        <ModeSelector role="tablist" aria-label="Étapes de création d'article">
          <ModeButton
            $active={stepState.categoryState === 'active'}
            $completed={stepState.categoryState === 'completed'}
            $inactive={stepState.categoryState === 'inactive'}
            data-active={stepState.categoryState === 'active'}
            data-completed={stepState.categoryState === 'completed'}
            onClick={() => {
              transitionToStep('category');
              numpadCallbacks.setMode('idle');
            }}
            role="tab"
            id="tab-category"
            aria-selected={stepState.categoryState === 'active'}
            aria-controls="step-category"
            aria-label={`Étape 1: Sélection de catégorie${stepState.categoryState === 'completed' ? ' - Terminée' : stepState.categoryState === 'active' ? ' - En cours' : ''}`}
          >
            Catégorie
          </ModeButton>
          <ModeButton
            $active={stepState.subcategoryState === 'active'}
            $completed={stepState.subcategoryState === 'completed'}
            $inactive={stepState.subcategoryState === 'inactive'}
            data-active={stepState.subcategoryState === 'active'}
            data-completed={stepState.subcategoryState === 'completed'}
            disabled={!selectedCategory || activeCategories.filter(cat => cat.parent_id === selectedCategory).length === 0}
            onClick={() => {
              if (selectedCategory && activeCategories.filter(cat => cat.parent_id === selectedCategory).length > 0) {
                transitionToStep('subcategory');
                numpadCallbacks.setMode('idle');
              }
            }}
            role="tab"
            id="tab-subcategory"
            aria-selected={stepState.subcategoryState === 'active'}
            aria-controls="step-subcategory"
            aria-label={`Étape 1.5: Sélection de sous-catégorie${stepState.subcategoryState === 'completed' ? ' - Terminée' : stepState.subcategoryState === 'active' ? ' - En cours' : stepState.subcategoryState === 'inactive' ? ' - Non accessible' : ''}`}
          >
            Sous-catégorie
          </ModeButton>
          <ModeButton
            $active={stepState.weightState === 'active'}
            $completed={stepState.weightState === 'completed'}
            $inactive={stepState.weightState === 'inactive'}
            data-active={stepState.weightState === 'active'}
            data-completed={stepState.weightState === 'completed'}
            disabled={!selectedCategory}
            onClick={() => selectedCategory && transitionToStep('weight')}
            role="tab"
            id="tab-weight"
            aria-selected={stepState.weightState === 'active'}
            aria-controls="step-weight"
            aria-label={`Étape 2: Saisie du poids${stepState.weightState === 'completed' ? ' - Terminée' : stepState.weightState === 'active' ? ' - En cours' : stepState.weightState === 'inactive' ? ' - Non accessible' : ''}`}
          >
            Poids
          </ModeButton>
          {/* Story B49-P2: Masquer l'onglet Quantité si mode prix global activé */}
          {!isNoItemPricingEnabled && (
            <ModeButton
              $active={stepState.quantityState === 'active'}
              $completed={stepState.quantityState === 'completed'}
              $inactive={stepState.quantityState === 'inactive'}
              data-active={stepState.quantityState === 'active'}
              data-completed={stepState.quantityState === 'completed'}
              disabled={!numpadCallbacks.weightValue || parseFloat(numpadCallbacks.weightValue) <= 0}
              onClick={() => numpadCallbacks.weightValue && parseFloat(numpadCallbacks.weightValue) > 0 && transitionToStep('quantity')}
              role="tab"
              id="tab-quantity"
              aria-selected={stepState.quantityState === 'active'}
              aria-controls="step-quantity"
              aria-label={`Étape 3: Saisie de la quantité${stepState.quantityState === 'completed' ? ' - Terminée' : stepState.quantityState === 'active' ? ' - En cours' : stepState.quantityState === 'inactive' ? ' - Non accessible' : ''}`}
            >
              Quantité
            </ModeButton>
          )}
          <ModeButton
            $active={stepState.priceState === 'active'}
            $completed={stepState.priceState === 'completed'}
            $inactive={stepState.priceState === 'inactive'}
            data-active={stepState.priceState === 'active'}
            data-completed={stepState.priceState === 'completed'}
            disabled={isNoItemPricingEnabled 
              ? !numpadCallbacks.weightValue || parseFloat(numpadCallbacks.weightValue) <= 0
              : stepState.quantityState !== 'completed'}
            onClick={() => {
              if (isNoItemPricingEnabled) {
                if (numpadCallbacks.weightValue && parseFloat(numpadCallbacks.weightValue) > 0) {
                  transitionToStep('price');
                }
              } else {
                if (stepState.quantityState === 'completed') {
                  transitionToStep('price');
                }
              }
            }}
            role="tab"
            id="tab-price"
            aria-selected={stepState.priceState === 'active'}
            aria-controls="step-price"
            aria-label={`Étape 4: Saisie du prix${stepState.priceState === 'completed' ? ' - Terminée' : stepState.priceState === 'active' ? ' - En cours' : stepState.priceState === 'inactive' ? ' - Non accessible' : ''}`}
          >
            Prix
          </ModeButton>
        </ModeSelector>
      </div>

      <StagingItem data={stagingItemData} />

      {renderStepContent()}
    </WizardContainer>
  );
};

export default SaleWizard;
