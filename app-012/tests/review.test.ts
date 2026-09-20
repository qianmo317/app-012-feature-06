import { describe, it, expect } from 'vitest';
import { buildReviewEntries, checkIssues, allDecided, getReweighHerbs, isFlagged, latestAttempt, ISSUE_LABELS } from '../src/review';
import type { Package, Prescription, ReviewIssue, WeighResult } from '../src/types';

const rx: Prescription = {
  id: 'test-rx',
  items: [
    { herb: '白芍', grams: 12, decoct: 'normal' },
    { herb: '熟地', grams: 15, decoct: 'normal' },
    { herb: '薄荷', grams: 6, decoct: 'last' },
  ],
};

function weigh(herb: string, target: number, actual: number): WeighResult {
  return { herb, target, actual, ok: Math.abs(actual - target) <= 1, deltaG: actual - target };
}

function pkg(herb: string, separated: boolean, labeled: boolean): Package {
  return { herb, grams: 6, decoct: 'last', separated, labeled };
}

describe('checkIssues', () => {
  it('should pass when weight within tolerance', () => {
    expect(checkIssues('normal', weigh('白芍', 12, 12.5), undefined, 1)).toEqual([]);
  });

  it('should flag weight beyond tolerance', () => {
    expect(checkIssues('normal', weigh('白芍', 12, 13.5), undefined, 1)).toEqual(['weight']);
  });

  it('should flag missing attempt as weight issue', () => {
    expect(checkIssues('normal', null, undefined, 1)).toEqual(['weight']);
  });

  it('should flag decoct herb not separated', () => {
    const issues = checkIssues('last', weigh('薄荷', 6, 6.1), pkg('薄荷', false, true), 1);
    expect(issues).toContain('not-separated');
    expect(issues).not.toContain('unlabeled');
  });

  it('should flag decoct herb not labeled', () => {
    const issues = checkIssues('first', weigh('薄荷', 6, 6.1), pkg('薄荷', true, false), 1);
    expect(issues).toContain('unlabeled');
    expect(issues).not.toContain('not-separated');
  });

  it('should flag decoct herb with no package at all', () => {
    const issues = checkIssues('first', weigh('薄荷', 6, 6), undefined, 1);
    expect(issues).toContain('not-separated');
    expect(issues).toContain('unlabeled');
  });

  it('should not check packaging for normal herbs', () => {
    expect(checkIssues('normal', weigh('白芍', 12, 12), undefined, 1)).toEqual([]);
  });
});

describe('buildReviewEntries', () => {
  it('should build one entry per prescription item', () => {
    const results = [weigh('白芍', 12, 12), weigh('熟地', 15, 15), weigh('薄荷', 6, 6)];
    const packages = [pkg('薄荷', true, true)];
    const entries = buildReviewEntries(rx, results, packages, 1);
    expect(entries.length).toBe(3);
    expect(entries.map(e => e.herb)).toEqual(['白芍', '熟地', '薄荷']);
    expect(entries.every(e => e.issues.length === 0)).toBe(true);
  });

  it('should flag herb weighed off target', () => {
    const results = [weigh('白芍', 12, 12), weigh('熟地', 15, 17), weigh('薄荷', 6, 6)];
    const entries = buildReviewEntries(rx, results, [pkg('薄荷', true, true)], 1);
    const shu = entries.find(e => e.herb === '熟地')!;
    expect(shu.issues).toEqual(['weight']);
    expect(isFlagged(shu)).toBe(true);
  });

  it('should keep all attempts when a herb was weighed twice', () => {
    const results = [
      weigh('白芍', 12, 12),
      weigh('熟地', 15, 17),
      weigh('薄荷', 6, 6),
      weigh('熟地', 15, 15.2),
    ];
    const entries = buildReviewEntries(rx, results, [pkg('薄荷', true, true)], 1);
    const shu = entries.find(e => e.herb === '熟地')!;
    expect(shu.attempts.length).toBe(2);
    expect(shu.attempts[0].actual).toBe(17);
    expect(shu.attempts[1].actual).toBe(15.2);
    expect(latestAttempt(shu)!.actual).toBe(15.2);
    expect(shu.issues).toEqual([]);
  });

  it('should judge by the latest attempt, not earlier ones', () => {
    const results = [weigh('白芍', 12, 12), weigh('白芍', 12, 14)];
    const entries = buildReviewEntries(rx, results, [], 1);
    const bai = entries.find(e => e.herb === '白芍')!;
    expect(bai.attempts.length).toBe(2);
    expect(bai.issues).toEqual(['weight']);
  });
});

describe('review decisions', () => {
  function flaggedEntries() {
    const results = [weigh('白芍', 12, 12), weigh('熟地', 15, 17), weigh('薄荷', 6, 6)];
    return buildReviewEntries(rx, results, [pkg('薄荷', true, true)], 1);
  }

  it('should not be decided while flagged entries lack decisions', () => {
    expect(allDecided(flaggedEntries())).toBe(false);
  });

  it('should be decided once every flagged entry has a decision', () => {
    const entries = flaggedEntries();
    entries.find(e => e.herb === '熟地')!.decision = 'reweigh';
    expect(allDecided(entries)).toBe(true);
  });

  it('should collect herbs sent back for reweighing', () => {
    const entries = flaggedEntries();
    entries.find(e => e.herb === '熟地')!.decision = 'reweigh';
    expect(getReweighHerbs(entries)).toEqual(['熟地']);
  });

  it('should not collect accepted herbs for reweighing', () => {
    const entries = flaggedEntries();
    entries.find(e => e.herb === '熟地')!.decision = 'accept';
    expect(getReweighHerbs(entries)).toEqual([]);
    expect(allDecided(entries)).toBe(true);
  });

  it('should have a label for every issue type', () => {
    const issues: ReviewIssue[] = ['weight', 'not-separated', 'unlabeled'];
    for (const i of issues) {
      expect(ISSUE_LABELS[i]).toBeTruthy();
    }
  });
});
