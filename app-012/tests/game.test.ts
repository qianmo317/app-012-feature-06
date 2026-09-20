import { describe, it, expect } from 'vitest';
import { GameManager } from '../src/game/state';

function weighAll(gm: GameManager, offsetFor?: (herb: string) => number): void {
  for (const item of gm.prescription!.items) {
    const offset = offsetFor ? offsetFor(item.herb) : 0;
    expect(gm.selectDrawer(item.herb)).toBe(true);
    gm.setWeight(item.grams + offset);
    gm.confirmWeight();
  }
}

describe('review flow', () => {
  it('should pass review immediately when everything is weighed correctly', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    weighAll(gm);

    expect(gm.phase).toBe('review');
    expect(gm.reviewRound).toBe(1);
    expect(gm.reviewEntries.length).toBe(gm.prescription!.items.length);
    expect(gm.reviewEntries.every(e => e.issues.length === 0)).toBe(true);

    expect(gm.completeReview()).toBe('finish');
    expect(gm.phase).toBe('result');
  });

  it('should stay pending while flagged entries have no decision', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const badHerb = gm.prescription!.items[0].herb;
    weighAll(gm, herb => (herb === badHerb ? 1.5 : 0));

    expect(gm.phase).toBe('review');
    const entry = gm.reviewEntries.find(e => e.herb === badHerb)!;
    expect(entry.issues).toEqual(['weight']);

    expect(gm.completeReview()).toBe('pending');
    expect(gm.phase).toBe('review');
  });

  it('should send reweigh herbs back to weighing and keep both attempts', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const badHerb = gm.prescription!.items[0].herb;
    const target = gm.prescription!.items[0].grams;
    weighAll(gm, herb => (herb === badHerb ? 1.5 : 0));

    expect(gm.decideReview(badHerb, 'reweigh')).toBe(true);
    expect(gm.completeReview()).toBe('rework');
    expect(gm.phase).toBe('playing');
    expect(gm.weighed.has(badHerb)).toBe(false);
    expect(gm.packages.find(p => p.herb === badHerb)).toBeUndefined();

    expect(gm.reworkLog.length).toBe(1);
    expect(gm.reworkLog[0].decision).toBe('reweigh');
    expect(gm.reworkLog[0].issues).toEqual(['weight']);
    expect(gm.reworkLog[0].round).toBe(1);
    expect(gm.reworkLog[0].actual).toBe(target + 1.5);

    expect(gm.selectDrawer(badHerb)).toBe(true);
    gm.setWeight(target);
    gm.confirmWeight();

    expect(gm.phase).toBe('review');
    expect(gm.reviewRound).toBe(2);
    const entry = gm.reviewEntries.find(e => e.herb === badHerb)!;
    expect(entry.attempts.length).toBe(2);
    expect(entry.attempts[0].actual).toBe(target + 1.5);
    expect(entry.attempts[1].actual).toBe(target);
    expect(entry.issues).toEqual([]);

    expect(gm.completeReview()).toBe('finish');
    expect(gm.phase).toBe('result');
  });

  it('should accept a mismatch at the cost of satisfaction', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const badHerb = gm.prescription!.items[0].herb;
    weighAll(gm, herb => (herb === badHerb ? 1.5 : 0));

    expect(gm.decideReview(badHerb, 'accept')).toBe(true);
    expect(gm.state.satisfaction).toBe(90);
    expect(gm.completeReview()).toBe('finish');
    expect(gm.phase).toBe('result');
    expect(gm.reworkLog[0].decision).toBe('accept');
  });

  it('should not allow deciding an entry twice or a clean entry', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const badHerb = gm.prescription!.items[0].herb;
    const goodHerb = gm.prescription!.items[1].herb;
    weighAll(gm, herb => (herb === badHerb ? 1.5 : 0));

    expect(gm.decideReview(goodHerb, 'accept')).toBe(false);
    expect(gm.decideReview(badHerb, 'reweigh')).toBe(true);
    expect(gm.decideReview(badHerb, 'accept')).toBe(false);
    expect(gm.reworkLog.length).toBe(1);
  });

  it('should flag decoct herbs that were not separated and labeled', () => {
    const gm = new GameManager();
    gm.startLevel(9, false);
    gm.prescription!.items[0].decoct = 'first';
    const special = gm.prescription!.items[0].herb;
    weighAll(gm);

    const entry = gm.reviewEntries.find(e => e.herb === special)!;
    expect(entry.issues).toContain('not-separated');
    expect(entry.issues).toContain('unlabeled');

    expect(gm.decideReview(special, 'reweigh')).toBe(true);
    for (const e of gm.reviewEntries) {
      if (e.issues.length > 0 && e.decision === null) gm.decideReview(e.herb, 'accept');
    }
    expect(gm.completeReview()).toBe('rework');

    expect(gm.selectDrawer(special)).toBe(true);
    gm.togglePackSeparated();
    gm.togglePackLabeled();
    gm.setWeight(gm.prescription!.items[0].grams);
    gm.confirmWeight();

    const pkg = gm.packages.find(p => p.herb === special)!;
    expect(pkg.separated).toBe(true);
    expect(pkg.labeled).toBe(true);

    const entry2 = gm.reviewEntries.find(e => e.herb === special)!;
    expect(entry2.attempts.length).toBe(2);
    expect(entry2.issues).toEqual([]);

    // 上一轮认下的药味在新一轮复核中保持已处置，不用重复决定
    expect(gm.completeReview()).toBe('finish');
    expect(gm.phase).toBe('result');
  });
});
