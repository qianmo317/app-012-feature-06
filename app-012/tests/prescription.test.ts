import { describe, it, expect } from 'vitest';
import { generatePrescription } from '../src/prescription';
import { getLevelConfig } from '../src/levels';

describe('generatePrescription', () => {
  it('should generate prescription with correct herb count', () => {
    const config = getLevelConfig(1);
    const rx = generatePrescription(config);
    expect(rx.items.length).toBe(config.herbCount);
  });

  it('should generate unique IDs', () => {
    const config = getLevelConfig(1);
    const rx1 = generatePrescription(config);
    const rx2 = generatePrescription(config);
    expect(rx1.id).not.toBe(rx2.id);
  });

  it('should have grams between 5 and 24', () => {
    const config = getLevelConfig(1);
    const rx = generatePrescription(config);
    for (const item of rx.items) {
      expect(item.grams).toBeGreaterThanOrEqual(5);
      expect(item.grams).toBeLessThanOrEqual(24);
    }
  });

  it('should default to normal decoct', () => {
    const config = getLevelConfig(1);
    const rx = generatePrescription(config);
    for (const item of rx.items) {
      expect(item.decoct).toBe('normal');
    }
  });

  it('should have first/last decoct when enabled', () => {
    const config = getLevelConfig(9);
    let hasSpecial = false;
    for (let i = 0; i < 50; i++) {
      const rx = generatePrescription(config);
      if (rx.items.some(item => item.decoct !== 'normal')) {
        hasSpecial = true;
        break;
      }
    }
    expect(hasSpecial).toBe(true);
  });

  it('should have herb names', () => {
    const config = getLevelConfig(1);
    const rx = generatePrescription(config);
    for (const item of rx.items) {
      expect(item.herb).toBeTruthy();
      expect(typeof item.herb).toBe('string');
    }
  });
});
