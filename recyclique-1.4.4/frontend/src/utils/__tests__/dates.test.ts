import { describe, it, expect } from 'vitest';
import { formatReceptionTimestamp, formatTimestampForExport } from '../dates';

describe('formatReceptionTimestamp', () => {
  it('should format valid date string to DD/MM/YYYY HH:mm format', () => {
    // Test with a known date
    const dateString = '2025-11-26T14:30:45Z';
    const result = formatReceptionTimestamp(dateString);

    // Should match DD/MM/YYYY HH:mm pattern
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

    // For this specific date in UTC, it should be formatted in local timezone
    // We can't predict the exact local formatting, but we can verify it's not "—"
    expect(result).not.toBe('—');
  });

  it('should return "—" for null input', () => {
    expect(formatReceptionTimestamp(null)).toBe('—');
  });

  it('should return "—" for undefined input', () => {
    expect(formatReceptionTimestamp(undefined)).toBe('—');
  });

  it('should return "—" for empty string', () => {
    expect(formatReceptionTimestamp('')).toBe('—');
  });

  it('should return "—" for invalid date string', () => {
    expect(formatReceptionTimestamp('invalid-date')).toBe('—');
  });

  it('should handle ISO date strings without time', () => {
    const dateString = '2025-11-26';
    const result = formatReceptionTimestamp(dateString);

    // Should still format as date with time (00:00)
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(result).not.toBe('—');
  });
});

describe('formatTimestampForExport', () => {
  it('should return ISO string for valid date', () => {
    const dateString = '2025-11-26T14:30:45Z';
    const result = formatTimestampForExport(dateString);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result).not.toBe('');
  });

  it('should return empty string for null input', () => {
    expect(formatTimestampForExport(null)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(formatTimestampForExport(undefined)).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(formatTimestampForExport('invalid-date')).toBe('');
  });
});















