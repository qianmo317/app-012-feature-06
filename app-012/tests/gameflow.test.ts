import { describe, it, expect } from 'vitest';
import { GameManager } from '../src/game/state';

function weighOne(gm: GameManager, herb: string, actual: number): void {
  expect(gm.selectDrawer(herb)).toBe(true);
  gm.setWeight(actual);
  gm.confirmWeight();
}

function packIfNeeded(gm: GameManager, separate: boolean, labeled: boolean): void {
  if (gm.phase === 'packaging') {
    gm.confirmPackaging(separate, labeled);
  }
}

describe('复核流程', () => {
  it('全部合格：复核无问题，直接发药过关', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    for (const item of gm.prescription!.items) {
      weighOne(gm, item.herb, item.grams);
      packIfNeeded(gm, true, true);
    }
    expect(gm.phase).toBe('review');
    expect(gm.reviewItems).toHaveLength(gm.prescription!.items.length);
    expect(gm.reviewItems.every(i => i.issues.length === 0)).toBe(true);
    expect(gm.canApplyReview()).toBe(true);

    gm.applyReview();
    expect(gm.phase).toBe('result');
    expect(gm.levelPassed()).toBe(true);
  });

  it('超差的药被当场挑出，重抓退回抓药并留下返工记录', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const items = gm.prescription!.items;
    const bad = items[0];

    weighOne(gm, bad.herb, bad.grams + 1.5); // 超差但在 2 倍允差内，会进入复核
    packIfNeeded(gm, true, true);
    for (const item of items.slice(1)) {
      weighOne(gm, item.herb, item.grams);
      packIfNeeded(gm, true, true);
    }

    expect(gm.phase).toBe('review');
    const flagged = gm.reviewItems.find(i => i.herb === bad.herb)!;
    expect(flagged.issues.some(i => i.type === 'weight')).toBe(true);
    expect(gm.canApplyReview()).toBe(false);

    // 复核人写下「重抓」+ 一句批注
    gm.decideReviewItem(bad.herb, 'reweigh');
    gm.setReviewNote(bad.herb, '超差明显，退回重抓');
    expect(gm.canApplyReview()).toBe(true);

    gm.applyReview();
    expect(gm.phase).toBe('playing');
    expect(gm.weighed.has(bad.herb)).toBe(false);
    expect(gm.packages.find(p => p.herb === bad.herb)).toBeUndefined();
    expect(gm.reworkLog).toHaveLength(1);
    expect(gm.reworkLog[0].herb).toBe(bad.herb);
    expect(gm.reworkLog[0].note).toBe('超差明显，退回重抓');
    expect(gm.reworkLog[0].afterActual).toBeNull();

    // 退回抓药：重抓这一味
    weighOne(gm, bad.herb, bad.grams);
    packIfNeeded(gm, true, true);

    // 第二轮回复核：两回的结果都摆出来
    expect(gm.phase).toBe('review');
    expect(gm.reviewRound).toBe(2);
    const rechecked = gm.reviewItems.find(i => i.herb === bad.herb)!;
    expect(rechecked.attempts).toHaveLength(2);
    expect(rechecked.issues).toHaveLength(0);
    expect(gm.reworkLog[0].afterActual).toBe(bad.grams);

    gm.applyReview();
    expect(gm.phase).toBe('result');
    expect(gm.levelPassed()).toBe(true);
  });

  it('认下的药不重抓，扣满意度后过关', () => {
    const gm = new GameManager();
    gm.startLevel(1, false);
    const items = gm.prescription!.items;
    const bad = items[0];

    weighOne(gm, bad.herb, bad.grams + 1.5);
    packIfNeeded(gm, true, true);
    for (const item of items.slice(1)) {
      weighOne(gm, item.herb, item.grams);
      packIfNeeded(gm, true, true);
    }

    gm.decideReviewItem(bad.herb, 'accept');
    gm.setReviewNote(bad.herb, '误差可接受，认下');
    gm.applyReview();

    expect(gm.phase).toBe('result');
    expect(gm.reworkLog).toHaveLength(0);
    expect(gm.state.satisfaction).toBe(95); // 干净两味 +4（封顶100），认下一味 -5
    expect(gm.levelPassed()).toBe(true);
  });

  it('先煎药未单独分包会被复核挑出', () => {
    const gm = new GameManager();
    gm.startLevel(9, false);
    gm.prescription!.items[0].decoct = 'first';
    const first = gm.prescription!.items[0];

    weighOne(gm, first.herb, first.grams);
    expect(gm.phase).toBe('packaging');
    gm.confirmPackaging(false, true); // 忘了单独分包

    for (const item of gm.prescription!.items.slice(1)) {
      weighOne(gm, item.herb, item.grams);
      gm.confirmPackaging(item.decoct !== 'normal', true);
    }

    expect(gm.phase).toBe('review');
    const flagged = gm.reviewItems.find(i => i.herb === first.herb)!;
    expect(flagged.issues.some(i => i.type === 'split')).toBe(true);
  });

  it('药包没贴签会被复核挑出', () => {
    const gm = new GameManager();
    gm.startLevel(9, false);
    const first = gm.prescription!.items[0];

    weighOne(gm, first.herb, first.grams);
    gm.confirmPackaging(first.decoct !== 'normal', false); // 没贴签

    for (const item of gm.prescription!.items.slice(1)) {
      weighOne(gm, item.herb, item.grams);
      gm.confirmPackaging(item.decoct !== 'normal', true);
    }

    const flagged = gm.reviewItems.find(i => i.herb === first.herb)!;
    expect(flagged.issues.some(i => i.type === 'label')).toBe(true);
  });
});
