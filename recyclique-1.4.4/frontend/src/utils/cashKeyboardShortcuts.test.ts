import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CashKeyboardShortcutHandler } from './cashKeyboardShortcuts';

// Mock document and window for keyboard events
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
};

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

describe('CashKeyboardShortcutHandler', () => {
  let handler: CashKeyboardShortcutHandler;
  let mockOnShortcut: vi.MockedFunction<(categoryId: string) => void>;

  beforeEach(() => {
    handler = new CashKeyboardShortcutHandler();
    mockOnShortcut = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    handler.destroy();
  });

  describe('initialization', () => {
    it('should initialize with categories and assign shortcuts', () => {
      const categories = [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' },
        { id: 'cat3', name: 'Category 3' }
      ];

      handler.initialize(categories, mockOnShortcut);

      const shortcuts = handler.getShortcuts();
      expect(shortcuts).toHaveLength(3);
      expect(shortcuts[0]).toEqual({
        position: 1,
        key: 'A',
        categoryId: 'cat1',
        categoryName: 'Category 1',
        action: expect.any(Function),
        description: 'Sélectionner Category 1 (A)'
      });
    });

    it('should limit shortcuts to maximum positions', () => {
      const categories = Array.from({ length: 30 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`
      }));

      handler.initialize(categories, mockOnShortcut);

      const shortcuts = handler.getShortcuts();
      expect(shortcuts).toHaveLength(26); // Max 26 positions
    });
  });

  describe('shortcut activation', () => {
    it('should activate and deactivate shortcuts', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      handler.activate();
      expect(handler.getIsActive()).toBe(true);
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

      handler.deactivate();
      expect(handler.getIsActive()).toBe(false);
      expect(mockDocument.removeEventListener).toHaveBeenCalled();
    });

    it('should trigger shortcut action on key press', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      // Simulate keydown event
      const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
      mockDocument.dispatchEvent(keyEvent);

      expect(mockOnShortcut).toHaveBeenCalledWith('cat1');
    });

    it('should handle uppercase keys', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      const keyEvent = new KeyboardEvent('keydown', { key: 'A' });
      mockDocument.dispatchEvent(keyEvent);

      expect(mockOnShortcut).toHaveBeenCalledWith('cat1');
    });
  });

  describe('conflict prevention', () => {
    it('should prevent shortcuts when input is focused', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      // Mock active element as input
      Object.defineProperty(document, 'activeElement', {
        value: { tagName: 'INPUT' },
        writable: true
      });

      const keyEvent = new KeyboardEvent('keydown', { key: 'a' });
      mockDocument.dispatchEvent(keyEvent);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts with modifier keys', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      const keyEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
      mockDocument.dispatchEvent(keyEvent);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should get shortcut for category', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      const shortcut = handler.getShortcutForCategory('cat1');
      expect(shortcut?.key).toBe('A');
    });

    it('should get key for category', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      const key = handler.getKeyForCategory('cat1');
      expect(key).toBe('A');
    });

    it('should check if category has shortcut', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      expect(handler.hasShortcutForCategory('cat1')).toBe(true);
      expect(handler.hasShortcutForCategory('cat2')).toBe(false);
    });
  });

  describe('position calculations', () => {
    it('should calculate row from position', () => {
      const { getRowFromPosition } = require('./cashKeyboardShortcuts');

      expect(getRowFromPosition(1)).toBe(1);
      expect(getRowFromPosition(10)).toBe(1);
      expect(getRowFromPosition(11)).toBe(2);
      expect(getRowFromPosition(20)).toBe(2);
      expect(getRowFromPosition(21)).toBe(3);
    });

    it('should get positions in row', () => {
      const { getPositionsInRow } = require('./cashKeyboardShortcuts');

      expect(getPositionsInRow(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(getPositionsInRow(2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      expect(getPositionsInRow(3)).toEqual([21, 22, 23, 24, 25, 26]);
    });
  });
});
