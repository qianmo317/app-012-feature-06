import type { GameState, GamePhase, Prescription, WeighResult, LevelConfig, PackageRecord, ReviewItem, ReviewDecision, ReworkRecord } from '../types';
import { getLevelConfig } from '../levels';
import { generatePrescription } from '../prescription';
import { judgeWeight, getWeightStatus } from '../weighing';
import { scoreRound } from '../scoring';
import { buildReviewItems, reviewComplete, itemsNeedingRework, acceptedItems, latestAttempt } from '../review';
import { getRandomHerbs } from '../herbs';
import type { HerbMeta } from '../types';

export class GameManager {
  state: GameState = {
    level: 1,
    score: 0,
    combo: 0,
    queue: 3,
    satisfaction: 100,
    expired: false,
  };

  phase: GamePhase = 'menu';
  endless = false;
  prescription: Prescription | null = null;
  herbs: HerbMeta[] = [];
  currentWeight = 0;
  zeroOffset = 0;
  targetGrams = 0;
  currentHerb: string | null = null;
  weighed = new Set<string>();
  results: WeighResult[] = [];
  packages: PackageRecord[] = [];
  reviewItems: ReviewItem[] = [];
  reworkLog: ReworkRecord[] = [];
  reviewRound = 0;
  pendingPackage: { herb: string; grams: number } | null = null;
  pkgSeparate = false;
  pkgLabeled = true;
  levelConfig: LevelConfig = getLevelConfig(1);

  timeLeft: number | null = null;
  timeUsed = 0;
  lastTick = 0;

  drawerOpen = new Set<string>();
  draggingHerb: string | null = null;
  dragX = 0;
  dragY = 0;
  onScale = false;
  flashingDrawer: string | null = null;
  flashTime = 0;

  startLevel(level: number, endless = false): void {
    this.endless = endless;
    this.state.level = level;
    this.state.expired = false;
    this.levelConfig = getLevelConfig(level);
    this.prescription = generatePrescription(this.levelConfig);
    this.herbs = getRandomHerbs(this.levelConfig.herbCount + (this.levelConfig.hasSimilarHerbs ? 2 : 0), this.levelConfig.hasSimilarHerbs);
    this.currentWeight = 0;
    this.zeroOffset = 0;
    this.targetGrams = 0;
    this.currentHerb = null;
    this.weighed = new Set();
    this.results = [];
    this.packages = [];
    this.reviewItems = [];
    this.reworkLog = [];
    this.reviewRound = 0;
    this.pendingPackage = null;
    this.pkgSeparate = false;
    this.pkgLabeled = true;
    this.timeLeft = this.levelConfig.timeLimit;
    this.timeUsed = 0;
    this.lastTick = performance.now();
    this.drawerOpen = new Set();
    this.draggingHerb = null;
    this.phase = 'playing';
  }

  tick(now: number): void {
    if (this.phase !== 'playing' && this.phase !== 'weighing') return;
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.timeUsed += dt;

    if (this.timeLeft !== null) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.handleTimeout();
      }
    }

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) this.flashingDrawer = null;
    }
  }

  selectDrawer(herb: string): boolean {
    if (!this.prescription) return false;
    const needed = this.prescription.items.find(i => i.herb === herb && !this.weighed.has(i.herb));
    if (!needed) {
      this.flashingDrawer = herb;
      this.flashTime = 0.5;
      return false;
    }
    this.drawerOpen.add(herb);
    this.currentHerb = herb;
    this.targetGrams = needed.grams;
    this.currentWeight = 0;
    this.phase = 'weighing';
    return true;
  }

  setWeight(w: number): void {
    this.currentWeight = Math.max(0, w);
  }

  addWeight(delta: number): void {
    this.currentWeight = Math.max(0, parseFloat((this.currentWeight + delta).toFixed(1)));
  }

  tare(): void {
    this.zeroOffset = this.currentWeight;
  }

  confirmWeight(): WeighResult | null {
    if (!this.currentHerb || !this.prescription) return null;
    const result = judgeWeight(this.currentWeight, this.targetGrams, this.levelConfig.tolerance);
    result.herb = this.currentHerb;
    this.results.push(result);

    const status = getWeightStatus(result, this.levelConfig.tolerance);
    const timeLimit = this.levelConfig.timeLimit;
    const breakdown = scoreRound(result, this.levelConfig.tolerance, this.state.combo, this.timeUsed, timeLimit);

    const herb = this.currentHerb;
    const grams = this.currentWeight;
    this.drawerOpen.delete(herb);
    this.currentHerb = null;
    this.currentWeight = 0;
    this.zeroOffset = 0;

    if (status === 'fail') {
      this.state.combo = 0;
      this.phase = 'playing';
      return result;
    }

    this.state.combo++;
    this.state.score += breakdown.total;
    this.weighed.add(herb);

    // 返工回来的药：把重抓后的克数回填进返工记录
    const openRework = [...this.reworkLog].reverse().find(r => r.herb === herb && r.afterActual === null);
    if (openRework) openRework.afterActual = grams;

    if (this.levelConfig.enableDecoctSplit) {
      this.pendingPackage = { herb, grams };
      this.pkgSeparate = false;
      this.pkgLabeled = true;
      this.phase = 'packaging';
    } else {
      this.addPackage(herb, grams, false, true);
      this.afterWeighDone();
    }

    return result;
  }

  private addPackage(herb: string, grams: number, separate: boolean, labeled: boolean): void {
    if (!this.prescription) return;
    const item = this.prescription.items.find(i => i.herb === herb);
    if (!item) return;
    // 同一味重抓后只留最新一包
    this.packages = this.packages.filter(p => p.herb !== herb);
    this.packages.push({ herb, grams, decoct: item.decoct, separate, labeled });
  }

  private afterWeighDone(): void {
    if (this.prescription && this.weighed.size >= this.prescription.items.length) {
      this.startReview();
    } else {
      this.phase = 'playing';
    }
  }

  confirmPackaging(separate: boolean, labeled: boolean): void {
    if (this.phase !== 'packaging' || !this.pendingPackage) return;
    this.addPackage(this.pendingPackage.herb, this.pendingPackage.grams, separate, labeled);
    this.pendingPackage = null;
    this.afterWeighDone();
  }

  startReview(): void {
    if (!this.prescription) return;
    this.reviewRound++;
    this.reviewItems = buildReviewItems(this.prescription, this.results, this.packages, this.levelConfig.tolerance);
    this.phase = 'review';
  }

  decideReviewItem(herb: string, decision: ReviewDecision): void {
    const item = this.reviewItems.find(i => i.herb === herb);
    if (!item || item.issues.length === 0) return;
    item.decision = decision;
    item.note = '';
  }

  setReviewNote(herb: string, note: string): void {
    const item = this.reviewItems.find(i => i.herb === herb);
    if (!item || !item.decision) return;
    item.note = note;
  }

  canApplyReview(): boolean {
    return this.reviewItems.length > 0 && reviewComplete(this.reviewItems);
  }

  applyReview(): void {
    if (!this.canApplyReview()) return;

    const reweigh = itemsNeedingRework(this.reviewItems);
    const accepted = acceptedItems(this.reviewItems);
    const cleanCount = this.reviewItems.length - reweigh.length - accepted.length;

    this.state.satisfaction = Math.min(100, this.state.satisfaction + cleanCount * 2);
    this.state.satisfaction = Math.max(0, this.state.satisfaction - accepted.length * 5);

    if (reweigh.length > 0) {
      for (const item of reweigh) {
        const last = latestAttempt(item.attempts);
        this.reworkLog.push({
          herb: item.herb,
          round: this.reworkLog.filter(r => r.herb === item.herb).length + 1,
          issues: item.issues.map(i => i.detail),
          note: item.note,
          beforeActual: last ? last.actual : 0,
          afterActual: null,
          at: Date.now(),
        });
        this.weighed.delete(item.herb);
        this.packages = this.packages.filter(p => p.herb !== item.herb);
      }
      this.state.combo = 0;
      this.phase = 'playing';
      return;
    }

    this.finishLevel();
  }

  levelPassed(): boolean {
    return this.reviewItems.length > 0 && this.reviewItems.every(i => i.issues.length === 0 || i.decision === 'accept');
  }

  finishLevel(): void {
    const passed = this.levelPassed() && this.state.satisfaction > 0;
    if (passed) {
      this.state.queue = Math.min(10, this.state.queue + 1);
    } else {
      this.state.queue--;
      this.state.satisfaction = Math.max(0, this.state.satisfaction - 20);
    }

    if (this.state.queue <= 0 || this.state.satisfaction <= 0) {
      this.phase = 'gameover';
    } else {
      this.phase = 'result';
    }
  }

  nextLevel(): void {
    this.startLevel(this.state.level + 1, this.endless);
  }

  retryLevel(): void {
    this.startLevel(this.state.level, this.endless);
  }

  handleTimeout(): void {
    this.state.queue--;
    this.state.satisfaction -= 15;
    this.state.combo = 0;
    if (this.state.queue <= 0 || this.state.satisfaction <= 0) {
      this.phase = 'gameover';
    } else {
      this.startLevel(this.state.level, this.endless);
    }
  }

  getTimeLeft(): number | null {
    return this.timeLeft;
  }

  isDrawerOpen(herb: string): boolean {
    return this.drawerOpen.has(herb);
  }
}
