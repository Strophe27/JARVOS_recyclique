import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Position to key mapping for cash register interface
// Same AZERTY layout as reception for consistency
// Row 1: A Z E R T Y U I O P (positions 1-10)
// Row 2: Q S D F G H J K L M (positions 11-20)
// Row 3: W X C V B N (positions 21-26)
const POSITION_TO_KEY_MAP: { [position: number]: string } = {
  // Row 1
  1: 'A', 2: 'Z', 3: 'E', 4: 'R', 5: 'T', 6: 'Y', 7: 'U', 8: 'I', 9: 'O', 10: 'P',
  // Row 2
  11: 'Q', 12: 'S', 13: 'D', 14: 'F', 15: 'G', 16: 'H', 17: 'J', 18: 'K', 19: 'L', 20: 'M',
  // Row 3
  21: 'W', 22: 'X', 23: 'C', 24: 'V', 25: 'B', 26: 'N'
};

// Reverse mapping: key to position
const KEY_TO_POSITION_MAP: { [key: string]: number } = {};
Object.entries(POSITION_TO_KEY_MAP).forEach(([position, key]) => {
  KEY_TO_POSITION_MAP[key.toUpperCase()] = parseInt(position, 10);
});

export interface CashShortcutConfig {
  position: number;
  key: string;
  action: () => void;
  description?: string;
}

interface CashShortcutState {
  // State
  maxPositions: number;
  isActive: boolean;
  shortcuts: CashShortcutConfig[];

  // Actions
  initializeShortcuts: (maxPositions: number, onShortcut: (position: number) => void) => void;
  activateShortcuts: () => void;
  deactivateShortcuts: () => void;
  getShortcutForPosition: (position: number) => CashShortcutConfig | undefined;
  getShortcutForKey: (key: string) => CashShortcutConfig | undefined;
  getKeyForPosition: (position: number) => string | undefined;
  getPositionForKey: (key: string) => number | undefined;
  getAvailableKeys: () => string[];
  getAvailablePositions: () => number[];
  hasShortcutForPosition: (position: number) => boolean;
  hasShortcutForKey: (key: string) => boolean;
}

// Handler instance (managed internally by the store)
let shortcutHandler: CashKeyboardShortcutHandler | null = null;

class CashKeyboardShortcutHandler {
  private shortcuts: Map<string, CashShortcutConfig> = new Map();
  private isActive: boolean = false;
  private eventListener: ((event: KeyboardEvent) => void) | null = null;
  private maxPositions: number;

  initialize(maxPositions: number = 26, onShortcut: (position: number) => void): void {
    this.shortcuts.clear();
    this.maxPositions = Math.min(maxPositions, 26); // Max 26 positions (3 rows)

    // Create shortcuts map from position mapping
    for (let position = 1; position <= this.maxPositions; position++) {
      const key = POSITION_TO_KEY_MAP[position];
      if (key) {
        this.shortcuts.set(key, {
          position,
          key,
          action: () => onShortcut(position),
          description: `Select category at position ${position} (${key})`
        });
      }
    }
  }

  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.eventListener = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.eventListener);
  }

  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.eventListener) {
      document.removeEventListener('keydown', this.eventListener);
      this.eventListener = null;
    }
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getShortcuts(): CashShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcut(key: string): CashShortcutConfig | undefined {
    return this.shortcuts.get(key.toUpperCase());
  }

  getShortcutByPosition(position: number): CashShortcutConfig | undefined {
    const key = POSITION_TO_KEY_MAP[position];
    return key ? this.shortcuts.get(key) : undefined;
  }

  getKeyForPosition(position: number): string | undefined {
    return POSITION_TO_KEY_MAP[position];
  }

  getPositionForKey(key: string): number | undefined {
    return KEY_TO_POSITION_MAP[key.toUpperCase()];
  }

  hasShortcut(key: string): boolean {
    return this.shortcuts.has(key.toUpperCase());
  }

  hasShortcutForPosition(position: number): boolean {
    const key = POSITION_TO_KEY_MAP[position];
    return key ? this.shortcuts.has(key) : false;
  }

  getAvailableKeys(): string[] {
    return Array.from(this.shortcuts.keys());
  }

  getAvailablePositions(): number[] {
    return Object.keys(POSITION_TO_KEY_MAP)
      .map(pos => parseInt(pos, 10))
      .filter(pos => pos <= this.maxPositions)
      .sort((a, b) => a - b);
  }

  private shouldPreventShortcut(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }

    const element = target as HTMLElement;

    // Prevent shortcuts when focused on input elements
    if (element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT' ||
        element.contentEditable === 'true') {
      return true;
    }

    // Prevent shortcuts when focused on elements with role="textbox"
    if (element.getAttribute('role') === 'textbox') {
      return true;
    }

    // Prevent shortcuts when focused on elements with specific data attributes
    if (element.hasAttribute('data-prevent-shortcuts')) {
      return true;
    }

    return false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Only handle single character keys without modifiers
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return;
    }

    // Check if shortcuts should be prevented
    if (this.shouldPreventShortcut(event.target)) {
      return;
    }

    const key = event.key.toUpperCase();

    // Only handle keys that are in our mapping
    if (this.shortcuts.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      const shortcut = this.shortcuts.get(key);
      if (shortcut) {
        shortcut.action();
      }
    }
  }

  destroy(): void {
    this.deactivate();
    this.shortcuts.clear();
  }
}

// Stable action references to avoid re-renders
const actions = {
  initializeShortcuts: (maxPositions: number, onShortcut: (position: number) => void) => {
    // Clean up existing handler
    if (shortcutHandler) {
      shortcutHandler.deactivate();
      shortcutHandler.destroy();
    }

    // Create new handler
    shortcutHandler = new CashKeyboardShortcutHandler();
    shortcutHandler.initialize(maxPositions, onShortcut);

    // Update store state
    useCashShortcutStore.setState({
      maxPositions,
      shortcuts: shortcutHandler.getShortcuts(),
      isActive: false
    });
  },

  activateShortcuts: () => {
    if (shortcutHandler) {
      shortcutHandler.activate();
      useCashShortcutStore.setState({ isActive: true });
    }
  },

  deactivateShortcuts: () => {
    if (shortcutHandler) {
      shortcutHandler.deactivate();
      useCashShortcutStore.setState({ isActive: false });
    }
  },
};

export const useCashShortcutStore = create<CashShortcutState>()(
  devtools(
    (set, get) => ({
      // Initial state
      maxPositions: 26,
      isActive: false,
      shortcuts: [],

      // Use stable action references
      initializeShortcuts: actions.initializeShortcuts,
      activateShortcuts: actions.activateShortcuts,
      deactivateShortcuts: actions.deactivateShortcuts,

      // Get shortcut for position
      getShortcutForPosition: (position: number) => {
        return shortcutHandler?.getShortcutByPosition(position);
      },

      // Get shortcut for key
      getShortcutForKey: (key: string) => {
        return shortcutHandler?.getShortcut(key);
      },

      // Get key for position
      getKeyForPosition: (position: number) => {
        return shortcutHandler?.getKeyForPosition(position);
      },

      // Get position for key
      getPositionForKey: (key: string) => {
        return shortcutHandler?.getPositionForKey(key);
      },

      // Get available keys
      getAvailableKeys: () => {
        return shortcutHandler?.getAvailableKeys() || [];
      },

      // Get available positions
      getAvailablePositions: () => {
        return shortcutHandler?.getAvailablePositions() || [];
      },

      // Check if position has shortcut
      hasShortcutForPosition: (position: number) => {
        return shortcutHandler?.hasShortcutForPosition(position) || false;
      },

      // Check if key has shortcut
      hasShortcutForKey: (key: string) => {
        return shortcutHandler?.hasShortcut(key) || false;
      },
    }),
    { name: 'cashShortcutStore' }
  )
);

// Cleanup function for when the store is no longer needed
export const cleanupCashShortcutStore = () => {
  if (shortcutHandler) {
    shortcutHandler.deactivate();
    shortcutHandler.destroy();
    shortcutHandler = null;
  }
};

export default useCashShortcutStore;















