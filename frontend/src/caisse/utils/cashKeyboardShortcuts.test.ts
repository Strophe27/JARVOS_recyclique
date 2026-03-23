import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CashKeyboardShortcutHandler,
  getRowFromPosition,
  getPositionsInRow,
} from './cashKeyboardShortcuts';

describe('CashKeyboardShortcutHandler', () => {
  let handler: CashKeyboardShortcutHandler;
  let mockOnShortcut: (categoryId: string) => void;

  beforeEach(() => {
    handler = new CashKeyboardShortcutHandler();
    mockOnShortcut = vi.fn() as (categoryId: string) => void;
  });

  afterEach(() => {
    handler.destroy();
  });

  describe('initialization', () => {
    it('should initialize with categories and assign shortcuts', () => {
      const categories = [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' },
        { id: 'cat3', name: 'Category 3' },
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
        description: 'Sélectionner Category 1 (A)',
      });
    });

    it('should assign correct AZERTY positional keys', () => {
      const categories = Array.from({ length: 10 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));

      handler.initialize(categories, mockOnShortcut);

      const shortcuts = handler.getShortcuts();
      const expectedKeys = ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
      shortcuts.forEach((s, i) => {
        expect(s.key).toBe(expectedKeys[i]);
      });
    });

    it('should limit shortcuts to maximum positions', () => {
      const categories = Array.from({ length: 30 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));

      handler.initialize(categories, mockOnShortcut);

      const shortcuts = handler.getShortcuts();
      expect(shortcuts).toHaveLength(26); // Max 26 positions
    });

    it('should respect custom maxPositions parameter', () => {
      const categories = Array.from({ length: 10 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));

      handler.initialize(categories, mockOnShortcut, 3);

      const shortcuts = handler.getShortcuts();
      expect(shortcuts).toHaveLength(3);
    });

    it('should map only the categories passed (niveau affiche), not a longer API list — Story 19-8', () => {
      const visibleRoots = [
        { id: 'root-b', name: 'B' },
        { id: 'root-a', name: 'A' },
      ];
      handler.initialize(visibleRoots, mockOnShortcut);

      expect(handler.getKeyForCategory('root-b')).toBe('A');
      expect(handler.getKeyForCategory('root-a')).toBe('Z');
      expect(handler.getKeyForCategory('other')).toBeUndefined();
    });
  });

  describe('shortcut activation / deactivation', () => {
    it('should activate and add event listener', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      handler.activate();
      expect(handler.getIsActive()).toBe(true);
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addSpy.mockRestore();
    });

    it('should deactivate and remove event listener', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      handler.deactivate();
      expect(handler.getIsActive()).toBe(false);
      expect(removeSpy).toHaveBeenCalled();

      removeSpy.mockRestore();
    });

    it('should not activate twice', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      handler.activate();
      handler.activate(); // Second call should be a no-op
      expect(addSpy).toHaveBeenCalledTimes(1);

      handler.deactivate();
      addSpy.mockRestore();
    });

    it('should trigger shortcut action on key press', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

      expect(mockOnShortcut).toHaveBeenCalledWith('cat1');
    });

    it('should handle uppercase key events', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));

      expect(mockOnShortcut).toHaveBeenCalledWith('cat1');
    });
  });

  describe('conflict prevention', () => {
    it('should prevent shortcuts when input is focused (event bubbled from input)', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      // Dispatch from an input element — bubbles to document with event.target = input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      document.body.removeChild(input);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts when textarea is focused', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      document.body.removeChild(textarea);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts with Ctrl modifier key', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts with Alt modifier key', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true }));

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts with Meta modifier key', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts on element with data-prevent-shortcuts', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      const div = document.createElement('div');
      div.setAttribute('data-prevent-shortcuts', '');
      document.body.appendChild(div);
      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      document.body.removeChild(div);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });

    it('should prevent shortcuts on element with role=textbox', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);
      handler.activate();

      const div = document.createElement('div');
      div.setAttribute('role', 'textbox');
      document.body.appendChild(div);
      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      document.body.removeChild(div);

      expect(mockOnShortcut).not.toHaveBeenCalled();
    });
  });

  describe('utility functions — getShortcutForCategory / getKeyForCategory', () => {
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

    it('should return undefined for unknown category', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      expect(handler.getKeyForCategory('unknown')).toBeUndefined();
    });

    it('should check if category has shortcut', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      expect(handler.hasShortcutForCategory('cat1')).toBe(true);
      expect(handler.hasShortcutForCategory('cat2')).toBe(false);
    });

    it('should check if key is registered', () => {
      const categories = [{ id: 'cat1', name: 'Category 1' }];
      handler.initialize(categories, mockOnShortcut);

      expect(handler.hasShortcut('A')).toBe(true);
      expect(handler.hasShortcut('a')).toBe(true); // case-insensitive
      expect(handler.hasShortcut('Z')).toBe(false);
    });

    it('should get available keys', () => {
      const categories = [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' },
      ];
      handler.initialize(categories, mockOnShortcut);

      const keys = handler.getAvailableKeys();
      expect(keys).toContain('A');
      expect(keys).toContain('Z');
      expect(keys).toHaveLength(2);
    });

    it('should get available positions up to maxPositions', () => {
      const categories = Array.from({ length: 5 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));
      // Passer maxPositions=5 pour limiter les positions disponibles
      handler.initialize(categories, mockOnShortcut, 5);

      const positions = handler.getAvailablePositions();
      expect(positions).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('limits — 26 positions max', () => {
    it('should correctly assign all 26 positions', () => {
      const categories = Array.from({ length: 26 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));
      handler.initialize(categories, mockOnShortcut);

      const shortcuts = handler.getShortcuts();
      expect(shortcuts).toHaveLength(26);

      // Check first and last
      expect(shortcuts[0].key).toBe('A');
      expect(shortcuts[25].key).toBe('N');
    });

    it('should not exceed 26 positions even when maxPositions > 26', () => {
      const categories = Array.from({ length: 30 }, (_, i) => ({
        id: `cat${i + 1}`,
        name: `Category ${i + 1}`,
      }));
      handler.initialize(categories, mockOnShortcut, 30);

      expect(handler.getShortcuts()).toHaveLength(26);
    });
  });
});

describe('position utility functions', () => {
  describe('getRowFromPosition', () => {
    it('should return row 1 for positions 1-10', () => {
      expect(getRowFromPosition(1)).toBe(1);
      expect(getRowFromPosition(5)).toBe(1);
      expect(getRowFromPosition(10)).toBe(1);
    });

    it('should return row 2 for positions 11-20', () => {
      expect(getRowFromPosition(11)).toBe(2);
      expect(getRowFromPosition(15)).toBe(2);
      expect(getRowFromPosition(20)).toBe(2);
    });

    it('should return row 3 for positions 21+', () => {
      expect(getRowFromPosition(21)).toBe(3);
      expect(getRowFromPosition(26)).toBe(3);
    });
  });

  describe('getPositionsInRow', () => {
    it('should return positions 1-10 for row 1', () => {
      expect(getPositionsInRow(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should return positions 11-20 for row 2', () => {
      expect(getPositionsInRow(2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('should return positions 21-26 for row 3', () => {
      expect(getPositionsInRow(3)).toEqual([21, 22, 23, 24, 25, 26]);
    });

    it('should return empty array for unknown row', () => {
      expect(getPositionsInRow(0)).toEqual([]);
      expect(getPositionsInRow(4)).toEqual([]);
    });
  });
});
