import type { Package, Prescription, ReviewEntry, ReviewIssue, WeighResult } from './types';

export const ISSUE_LABELS: Record<ReviewIssue, string> = {
  weight: '超差',
  'not-separated': '未分包',
  unlabeled: '未贴标',
};

export function latestAttempt(entry: ReviewEntry): WeighResult | null {
  return entry.attempts.length > 0 ? entry.attempts[entry.attempts.length - 1] : null;
}

export function checkIssues(
  decoct: ReviewEntry['decoct'],
  latest: WeighResult | null,
  pkg: Package | undefined,
  tolerance: number
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  if (!latest || Math.abs(latest.deltaG) > tolerance) {
    issues.push('weight');
  }
  if (decoct !== 'normal') {
    if (!pkg || !pkg.separated) issues.push('not-separated');
    if (!pkg || !pkg.labeled) issues.push('unlabeled');
  }
  return issues;
}

export function buildReviewEntries(
  prescription: Prescription,
  results: WeighResult[],
  packages: Package[],
  tolerance: number
): ReviewEntry[] {
  return prescription.items.map(item => {
    const attempts = results.filter(r => r.herb === item.herb);
    const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const pkg = [...packages].reverse().find(p => p.herb === item.herb);
    return {
      herb: item.herb,
      target: item.grams,
      decoct: item.decoct,
      attempts,
      issues: checkIssues(item.decoct, latest, pkg, tolerance),
      decision: null,
    };
  });
}

export function isFlagged(entry: ReviewEntry): boolean {
  return entry.issues.length > 0;
}

export function allDecided(entries: ReviewEntry[]): boolean {
  return entries.every(e => e.issues.length === 0 || e.decision !== null);
}

export function getReweighHerbs(entries: ReviewEntry[]): string[] {
  return entries.filter(e => e.decision === 'reweigh').map(e => e.herb);
}
