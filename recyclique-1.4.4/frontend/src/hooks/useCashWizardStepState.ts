import { useCallback, useEffect, useState } from 'react';
import { StepState } from '../components/ui/StepIndicator';

export type CashWizardStep = 'category' | 'subcategory' | 'weight' | 'quantity' | 'price';

export interface CashWizardStepStateInfo {
  currentStep: CashWizardStep;
  categoryState: StepState;
  subcategoryState: StepState;
  weightState: StepState;
  quantityState: StepState;
  priceState: StepState;
  stepStartTime: Date | null;
  lastActivity: Date;
}

/**
 * Singleton class managing cash wizard step state across the application.
 * Ensures consistent state and navigation behavior regardless of component mounting/unmounting.
 */
class CashWizardStepStateManager {
  private static instance: CashWizardStepStateManager;
  private listeners: Set<(state: CashWizardStepStateInfo) => void> = new Set();
  private inactivityTimeoutId: number | null = null;
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private state: CashWizardStepStateInfo = {
    currentStep: 'category',
    categoryState: 'active',
    subcategoryState: 'inactive',
    weightState: 'inactive',
    quantityState: 'inactive',
    priceState: 'inactive',
    stepStartTime: new Date(),
    lastActivity: new Date(),
  };

  // Add subcategory state to interface
  subcategoryState: StepState = 'inactive';

  static getInstance(): CashWizardStepStateManager {
    if (!CashWizardStepStateManager.instance) {
      CashWizardStepStateManager.instance = new CashWizardStepStateManager();
    }
    return CashWizardStepStateManager.instance;
  }

  private constructor() {
    this.startInactivityTimer();
  }

  // Get current state
  getState(): CashWizardStepStateInfo {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(callback: (state: CashWizardStepStateInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.getState()));
  }

  // Reset inactivity timer
  private resetInactivityTimer(): void {
    this.state.lastActivity = new Date();
    this.startInactivityTimer();
  }

  // Start inactivity timer
  private startInactivityTimer(): void {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }

    this.inactivityTimeoutId = window.setTimeout(() => {
      // Auto-transition to category step after inactivity
      this.transitionToStep('category');
    }, this.INACTIVITY_TIMEOUT);
  }

  // Transition to a specific step with state updates
  // Updates step states: previous steps → completed, current step → active, future steps → inactive
  transitionToStep(step: CashWizardStep): void {
    const now = new Date();

    // Update step states
    this.state.currentStep = step;
    this.state.stepStartTime = now;
    this.state.lastActivity = now;

    // Reset all states to inactive
    this.state.categoryState = 'inactive';
    this.state.subcategoryState = 'inactive';
    this.state.weightState = 'inactive';
    this.state.quantityState = 'inactive';
    this.state.priceState = 'inactive';

    // Set current step to active, mark previous steps as completed
    switch (step) {
      case 'category':
        this.state.categoryState = 'active';
        break;
      case 'subcategory':
        this.state.categoryState = 'completed';
        this.state.subcategoryState = 'active';
        break;
      case 'weight':
        this.state.categoryState = 'completed';
        this.state.subcategoryState = 'completed';
        this.state.weightState = 'active';
        break;
      case 'quantity':
        this.state.categoryState = 'completed';
        this.state.subcategoryState = 'completed';
        this.state.weightState = 'completed';
        this.state.quantityState = 'active';
        break;
      case 'price':
        this.state.categoryState = 'completed';
        this.state.subcategoryState = 'completed';
        this.state.weightState = 'completed';
        this.state.quantityState = 'completed';
        this.state.priceState = 'active';
        break;
    }

    this.resetInactivityTimer();
    this.notifyListeners();
  }

  // Handle category selection completed
  handleCategorySelected(): void {
    if (this.state.currentStep === 'category') {
      this.transitionToStep('weight');
    }
  }

  // Handle subcategory selection completed
  handleSubcategorySelected(): void {
    if (this.state.currentStep === 'subcategory') {
      this.transitionToStep('weight');
    }
  }

  // Handle weight input started
  handleWeightInputStarted(): void {
    if (this.state.currentStep === 'weight') {
      // Weight step is already active, just update activity
      this.resetInactivityTimer();
    }
  }

  // Handle weight input completed
  handleWeightInputCompleted(): void {
    if (this.state.currentStep === 'weight') {
      this.transitionToStep('quantity');
    }
  }

  // Handle quantity input completed
  handleQuantityInputCompleted(): void {
    if (this.state.currentStep === 'quantity') {
      this.transitionToStep('price');
    }
  }

  // Handle price input completed / item validated
  handlePriceInputCompleted(): void {
    if (this.state.currentStep === 'price') {
      // After price validation, return to category for next item
      this.transitionToStep('category');
    }
  }

  // Handle ticket closed
  handleTicketClosed(): void {
    // Reset to initial state
    this.transitionToStep('category');
  }

  // Cleanup
  destroy(): void {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
const cashWizardStepStateManager = CashWizardStepStateManager.getInstance();

// React hook for using cash wizard step state
/**
 * React hook providing access to the cash wizard step state manager.
 * Returns the current state and control functions for step navigation.
 */
export function useCashWizardStepState(): {
  stepState: CashWizardStepStateInfo;
  transitionToStep: (step: CashWizardStep) => void;
  handleCategorySelected: () => void;
  handleSubcategorySelected: () => void;
  handleWeightInputStarted: () => void;
  handleWeightInputCompleted: () => void;
  handleQuantityInputCompleted: () => void;
  handlePriceInputCompleted: () => void;
  handleTicketClosed: () => void;
} {
  const [stepState, setStepState] = useState<CashWizardStepStateInfo>(cashWizardStepStateManager.getState());

  useEffect(() => {
    const unsubscribe = cashWizardStepStateManager.subscribe(setStepState);
    return unsubscribe;
  }, []);

  return {
    stepState,
    transitionToStep: useCallback((step: CashWizardStep) => cashWizardStepStateManager.transitionToStep(step), []),
    handleCategorySelected: useCallback(() => cashWizardStepStateManager.handleCategorySelected(), []),
    handleSubcategorySelected: useCallback(() => cashWizardStepStateManager.handleSubcategorySelected(), []),
    handleWeightInputStarted: useCallback(() => cashWizardStepStateManager.handleWeightInputStarted(), []),
    handleQuantityInputCompleted: useCallback(() => cashWizardStepStateManager.handleQuantityInputCompleted(), []),
    handlePriceInputCompleted: useCallback(() => cashWizardStepStateManager.handlePriceInputCompleted(), []),
    handleWeightInputCompleted: useCallback(() => cashWizardStepStateManager.handleWeightInputCompleted(), []),
    handleTicketClosed: useCallback(() => cashWizardStepStateManager.handleTicketClosed(), []),
  };
}

export { cashWizardStepStateManager };
export default CashWizardStepStateManager;
