import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate, formatCurrency, generateId } from '../lib/utils';

describe('Utils', () => {
  describe('formatDate', () => {
    it('formats valid date object correctly to DD/MM/YYYY', () => {
      const date = new Date(2023, 10, 5); // Month is 0-indexed, so 10 = Nov
      expect(formatDate(date)).toBe('05/11/2023');
    });

    it('formats valid date string correctly', () => {
      expect(formatDate('2023-11-05T12:00:00Z')).toBe('05/11/2023');
    });

    it('returns empty string for null, undefined or empty', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('generateId', () => {
    it('generates a string of expected length', () => {
      const id = generateId();
      expect(id).toBeTypeOf('string');
      expect(id.length).toBe(7); // math.random string chunk
    });
  });

  describe('formatCurrency', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('formats with MAD standard format by default', () => {
      localStorage.removeItem('khayatpro_setting_currency');
      expect(formatCurrency(100)).toContain('د.م.');
      expect(formatCurrency(100)).toContain('100');
    });

    it('returns with custom currency', () => {
      localStorage.setItem('khayatpro_setting_currency', 'USD');
      expect(formatCurrency(150.5)).toContain('150,50');
      expect(formatCurrency(150.5)).toContain('USD');
    });
  });
});
