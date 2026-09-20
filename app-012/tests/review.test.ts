import { describe, it, expect } from 'vitest';
import { buildReviewItems, reviewComplete, itemsNeedingRework, acceptedItems, latestAttempt } from '../src/review';
import { judgeWeight } from '../src/weighing';
import type { Prescription, PackageRecord, WeighResult } from '../src/types';

const rx: Prescription = {
  id: 'rx-test',
  items: [
    { herb: '白芍', grams: 12, decoct: 'normal' },
    { herb: '熟地', grams: 15, decoct: 'first' },
    { herb: '薄荷', grams: 6, decoct: 'last' },
  ],
};

function weigh(herb: string, actual: number, target: number, tol = 0.5): WeighResult {
  const r = judgeWeight(actual, target, tol);
  r.herb = herb;
  return r;
}

function pkg(herb: string, grams: number, decoct: 'normal' | 'first' | 'last', separate = false, labeled = true): PackageRecord {
  return { herb, grams, decoct, separate, labeled };
}

describe('buildReviewItems', () => {
  it('should pass a herb weighed within tolerance, packed and labeled', () => {
    const results = [weigh('白芍', 12.2, 12)];
    const packages = [pkg('白芍', 12.2, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.issues).toHaveLength(0);
  });

  it('should flag weight mismatch beyond tolerance', () => {
    const results = [weigh('白芍', 13.5, 12)];
    const packages = [pkg('白芍', 13.5, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.issues.some(i => i.type === 'weight')).toBe(true);
    expect(baishao.issues.find(i => i.type === 'weight')!.detail).toContain('+1.5');
  });

  it('should flag first/last decoct herbs not packed separately', () => {
    const results = [weigh('熟地', 15, 15)];
    const packages = [pkg('熟地', 15, 'first', false, true)];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const shudi = items.find(i => i.herb === '熟地')!;
    expect(shudi.issues.some(i => i.type === 'split')).toBe(true);
  });

  it('should not flag first/last decoct herbs packed separately', () => {
    const results = [weigh('熟地', 15, 15), weigh('薄荷', 6, 6)];
    const packages = [pkg('熟地', 15, 'first', true), pkg('薄荷', 6, 'last', true)];
    const items = buildReviewItems(rx, results, packages, 0.5);
    expect(items.find(i => i.herb === '熟地')!.issues).toHaveLength(0);
    expect(items.find(i => i.herb === '薄荷')!.issues).toHaveLength(0);
  });

  it('should flag unlabeled packages', () => {
    const results = [weigh('白芍', 12, 12)];
    const packages = [pkg('白芍', 12, 'normal', false, false)];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.issues.some(i => i.type === 'label')).toBe(true);
  });

  it('should keep all attempts when a herb was weighed twice', () => {
    const results = [weigh('白芍', 14, 12), weigh('白芍', 12.1, 12)];
    const packages = [pkg('白芍', 12.1, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.attempts).toHaveLength(2);
    expect(baishao.attempts[0].actual).toBe(14);
    expect(baishao.attempts[1].actual).toBe(12.1);
  });

  it('should judge weight by the latest attempt after rework', () => {
    const results = [weigh('白芍', 14, 12), weigh('白芍', 12.1, 12)];
    const packages = [pkg('白芍', 12.1, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.issues.some(i => i.type === 'weight')).toBe(false);
  });

  it('should flag a herb with no package', () => {
    const results = [weigh('白芍', 12, 12)];
    const items = buildReviewItems(rx, results, [], 0.5);
    const baishao = items.find(i => i.herb === '白芍')!;
    expect(baishao.issues.length).toBeGreaterThan(0);
  });
});

describe('reviewComplete', () => {
  it('should be complete when no item has issues', () => {
    const results = [weigh('白芍', 12, 12)];
    const packages = [pkg('白芍', 12, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5).filter(i => i.herb === '白芍');
    expect(reviewComplete(items)).toBe(true);
  });

  it('should be incomplete while a flagged item has no decision or note', () => {
    const results = [weigh('白芍', 14, 12)];
    const packages = [pkg('白芍', 14, 'normal')];
    const items = buildReviewItems(rx, results, packages, 0.5).filter(i => i.herb === '白芍');
    expect(reviewComplete(items)).toBe(false);

    items[0].decision = 'reweigh';
    expect(reviewComplete(items)).toBe(false);

    items[0].note = '超差明显，退回重抓';
    expect(reviewComplete(items)).toBe(true);
  });
});

describe('rework / accept filters', () => {
  it('should split flagged items by decision', () => {
    const results = [weigh('白芍', 14, 12), weigh('熟地', 16.2, 15)];
    const packages = [pkg('白芍', 14, 'normal'), pkg('熟地', 16.2, 'first', true)];
    const items = buildReviewItems(rx, results, packages, 0.5)
      .filter(i => i.issues.length > 0 && i.attempts.length > 0);
    expect(items).toHaveLength(2);

    items[0].decision = 'reweigh';
    items[0].note = '超差明显，退回重抓';
    items[1].decision = 'accept';
    items[1].note = '误差可接受，认下';

    expect(itemsNeedingRework(items).map(i => i.herb)).toEqual(['白芍']);
    expect(acceptedItems(items).map(i => i.herb)).toEqual(['熟地']);
  });
});

describe('latestAttempt', () => {
  it('should return null for no attempts', () => {
    expect(latestAttempt([])).toBeNull();
  });

  it('should return the last attempt', () => {
    const attempts = [weigh('白芍', 14, 12), weigh('白芍', 12, 12)];
    expect(latestAttempt(attempts)!.actual).toBe(12);
  });
});
