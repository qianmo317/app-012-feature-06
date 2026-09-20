import type { PackageRecord, Prescription, ReviewItem, ReviewIssue, WeighResult, DecoctType } from './types';

export const REWEIGH_NOTES = ['超差明显，退回重抓', '未单独分包，重抓', '标签不清，重抓'];
export const ACCEPT_NOTES = ['误差可接受，认下', '病人急用，认下', '老药师把关，认下'];

export function decoctLabel(decoct: DecoctType): string {
  if (decoct === 'first') return '先煎';
  if (decoct === 'last') return '后下';
  return '';
}

export function latestAttempt(attempts: WeighResult[]): WeighResult | null {
  return attempts.length > 0 ? attempts[attempts.length - 1] : null;
}

function checkWeight(attempts: WeighResult[], tolerance: number): ReviewIssue | null {
  const last = latestAttempt(attempts);
  if (!last) return { type: 'weight', detail: '还没有称量记录' };
  if (Math.abs(last.deltaG) <= tolerance) return null;
  const sign = last.deltaG > 0 ? '+' : '';
  return {
    type: 'weight',
    detail: `实称 ${last.actual.toFixed(1)}g，差 ${sign}${last.deltaG.toFixed(1)}g（允差 ±${tolerance}g）`,
  };
}

function checkSplit(decoct: DecoctType, pkg: PackageRecord | undefined): ReviewIssue | null {
  if (decoct === 'normal') return null;
  if (pkg && pkg.separate) return null;
  return { type: 'split', detail: `「${decoctLabel(decoct)}」药未单独分包` };
}

function checkLabel(pkg: PackageRecord | undefined): ReviewIssue | null {
  if (pkg && pkg.labeled) return null;
  return { type: 'label', detail: '药包上没写清是哪一味' };
}

export function buildReviewItems(
  prescription: Prescription,
  results: WeighResult[],
  packages: PackageRecord[],
  tolerance: number,
): ReviewItem[] {
  return prescription.items.map(item => {
    const attempts = results.filter(r => r.herb === item.herb);
    const pkg = [...packages].reverse().find(p => p.herb === item.herb);
    const issues: ReviewIssue[] = [];
    const weight = checkWeight(attempts, tolerance);
    if (weight) issues.push(weight);
    if (!pkg) {
      issues.push({ type: 'split', detail: '尚未分包' });
    } else {
      const split = checkSplit(item.decoct, pkg);
      if (split) issues.push(split);
      const label = checkLabel(pkg);
      if (label) issues.push(label);
    }
    return {
      herb: item.herb,
      target: item.grams,
      decoct: item.decoct,
      attempts,
      issues,
      decision: null,
      note: '',
    };
  });
}

export function reviewComplete(items: ReviewItem[]): boolean {
  return items.every(item => item.issues.length === 0 || (item.decision !== null && item.note !== ''));
}

export function itemsNeedingRework(items: ReviewItem[]): ReviewItem[] {
  return items.filter(item => item.issues.length > 0 && item.decision === 'reweigh');
}

export function acceptedItems(items: ReviewItem[]): ReviewItem[] {
  return items.filter(item => item.issues.length > 0 && item.decision === 'accept');
}
