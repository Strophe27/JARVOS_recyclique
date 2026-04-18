/**
 * Types pour les options de workflow des caisses
 * Story B49-P1: Infrastructure Options de Workflow
 */

/**
 * Option de feature dans workflow_options
 */
export interface WorkflowFeatureOption {
  enabled: boolean;
  label?: string;
}

/**
 * Options de workflow d'une caisse
 * Structure:
 * {
 *   "features": {
 *     "no_item_pricing": {
 *       "enabled": true,
 *       "label": "Mode prix global (total saisi manuellement, article sans prix)"
 *     }
 *   }
 * }
 */
export interface WorkflowOptions {
  features: Record<string, WorkflowFeatureOption>;
}

/**
 * Extension de CashRegisterResponse avec les options de workflow
 */
export interface CashRegisterWithOptions {
  id: string;
  name: string;
  location?: string;
  site_id?: string;
  is_active: boolean;
  workflow_options: WorkflowOptions;
  enable_virtual: boolean;
  enable_deferred: boolean;
}

/**
 * Extension de CashSession avec register_options
 */
export interface CashSessionWithOptions {
  id: string;
  operator_id: string;
  site_id: string;
  register_id?: string;
  initial_amount: number;
  current_amount: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  total_sales?: number;
  total_items?: number;
  register_options?: WorkflowOptions;  // Story B49-P1: Options de workflow du register
}



