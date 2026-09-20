import { describe, it, expect } from 'vitest';
import { UIRenderer } from '../src/renderer/ui';
import { GameManager } from '../src/game/state';

function stubCtx(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 100 });
      return () => {};
    },
    set: () => true,
  });
}

function driveToReview(gm: GameManager, badHerbOffBy = 1.5): void {
  gm.startLevel(1, false);
  gm.prescription!.items.forEach((item, i) => {
    gm.selectDrawer(item.herb);
    gm.setWeight(item.grams + (i === 0 ? badHerbOffBy : 0));
    gm.confirmWeight();
    if (gm.phase === 'packaging') gm.confirmPackaging(true, true);
  });
}

describe('UI 渲染冒烟', () => {
  it('复核面板：逐味行、批注按钮、返工记录都能画', () => {
    const gm = new GameManager();
    driveToReview(gm);
    const ui = new UIRenderer();
    const ctx = stubCtx();

    ui.drawReview(ctx, 960, 640, gm.reviewItems, gm.reworkLog, gm.reviewRound, gm.canApplyReview());
    const actions = ui.buttonRects.map(b => b.action);
    expect(actions.some(a => a.startsWith('decide|reweigh|'))).toBe(true);
    expect(actions.some(a => a.startsWith('decide|accept|'))).toBe(true);
    expect(actions).not.toContain('apply-review'); // 还没写批注，不能提交

    const bad = gm.prescription!.items[0].herb;
    gm.decideReviewItem(bad, 'reweigh');
    ui.drawReview(ctx, 960, 640, gm.reviewItems, gm.reworkLog, gm.reviewRound, gm.canApplyReview());
    expect(ui.buttonRects.some(b => b.action.startsWith(`note|${bad}|`))).toBe(true);

    gm.setReviewNote(bad, '超差明显，退回重抓');
    ui.drawReview(ctx, 960, 640, gm.reviewItems, gm.reworkLog, gm.reviewRound, gm.canApplyReview());
    expect(ui.buttonRects.map(b => b.action)).toContain('apply-review');

    // 退回重抓后再进复核：返工记录区也要画出来
    gm.applyReview();
    gm.selectDrawer(bad);
    gm.setWeight(gm.prescription!.items[0].grams);
    gm.confirmWeight();
    expect(gm.phase).toBe('review');
    ui.drawReview(ctx, 960, 640, gm.reviewItems, gm.reworkLog, gm.reviewRound, gm.canApplyReview());
    expect(gm.reworkLog).toHaveLength(1);
  });

  it('复核面板在小画布上滚动不溢出', () => {
    const gm = new GameManager();
    gm.startLevel(12, false); // 7 味药，允差 ±0.3
    for (const item of gm.prescription!.items) {
      gm.selectDrawer(item.herb);
      gm.setWeight(item.grams + 0.5); // 超差但在 2 倍允差内，进入复核被挑出
      gm.confirmWeight();
      if (gm.phase === 'packaging') gm.confirmPackaging(false, false);
    }
    expect(gm.phase).toBe('review');
    const ui = new UIRenderer();
    const ctx = stubCtx();
    ui.reviewScroll = 50;
    ui.drawReview(ctx, 800, 500, gm.reviewItems, gm.reworkLog, gm.reviewRound, false);
    expect(ui.reviewMaxScroll).toBeGreaterThan(0);
    expect(ui.reviewScroll).toBeLessThanOrEqual(ui.reviewMaxScroll);
  });

  it('分包弹窗与结算页能画', () => {
    const gm = new GameManager();
    gm.startLevel(9, false);
    const item = gm.prescription!.items[0];
    gm.selectDrawer(item.herb);
    gm.setWeight(item.grams);
    gm.confirmWeight();
    expect(gm.phase).toBe('packaging');

    const ui = new UIRenderer();
    const ctx = stubCtx();
    ui.drawPackaging(ctx, 960, 640, item.herb, item.grams, item.decoct, false, true);
    const actions = ui.buttonRects.map(b => b.action);
    expect(actions).toContain('pkg|separate');
    expect(actions).toContain('pkg|label');
    expect(actions).toContain('pkg|confirm');

    gm.confirmPackaging(true, true);
    for (const it of gm.prescription!.items.slice(1)) {
      gm.selectDrawer(it.herb);
      gm.setWeight(it.grams);
      gm.confirmWeight();
      gm.confirmPackaging(true, true);
    }
    gm.applyReview();
    expect(gm.phase).toBe('result');
    ui.drawResult(ctx, 960, 640, gm.state.score, gm.state.level, gm.reviewItems, gm.reworkLog, gm.levelPassed());
    expect(ui.buttonRects.map(b => b.action)).toContain('next');
  });
});
