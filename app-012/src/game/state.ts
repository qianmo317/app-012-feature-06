import type { GameState, GamePhase, Prescription, PrescriptionItem, WeighResult, LevelConfig, Package, ReviewEntry, ReviewDecision, ReworkRecord } from '../types';
import { getLevelConfig } from '../levels';
import { generatePrescription } from '../prescription';
import { judgeWeight, getWeightStatus } from '../weighing';
import { scoreRound } from '../scoring';
import { buildReviewEntries, allDecided, getReweighHerbs } from '../review';
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
  packages: Package[] = [];
  packSeparated = false;
  packLabeled = false;
  reviewEntries: ReviewEntry[] = [];
  reviewRound = 0;
  reworkLog: ReworkRecord[] = [];
  lastLevelPassed = false;
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
    this.packSeparated = false;
    this.packLabeled = false;
    this.reviewEntries = [];
    this.reviewRound = 0;
    this.reworkLog = [];
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
    this.packSeparated = false;
    this.packLabeled = false;
    this.phase = 'weighing';
    return true;
  }

  currentItem(): PrescriptionItem | null {
    if (!this.prescription || !this.currentHerb) return null;
    return this.prescription.items.find(i => i.herb === this.currentHerb) ?? null;
  }

  togglePackSeparated(): void {
    const item = this.currentItem();
    if (!item || item.decoct === 'normal') return;
    this.packSeparated = !this.packSeparated;
  }

  togglePackLabeled(): void {
    const item = this.currentItem();
    if (!item || item.decoct === 'normal') return;
    this.packLabeled = !this.packLabeled;
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

    if (status === 'fail') {
      this.state.combo = 0;
    } else {
      this.state.combo++;
      this.state.score += breakdown.total;
      this.weighed.add(this.currentHerb);
      const item = this.prescription.items.find(i => i.herb === this.currentHerb);
      if (item) {
        const isSpecial = item.decoct !== 'normal';
        this.packages = this.packages.filter(p => p.herb !== item.herb);
        this.packages.push({
          herb: item.herb,
          grams: this.currentWeight,
          decoct: item.decoct,
          separated: isSpecial ? this.packSeparated : true,
          labeled: isSpecial ? this.packLabeled : true,
        });
      }
    }

    this.drawerOpen.delete(this.currentHerb);
    this.currentHerb = null;
    this.currentWeight = 0;
    this.zeroOffset = 0;
    this.packSeparated = false;
    this.packLabeled = false;

    if (this.weighed.size >= this.prescription.items.length) {
      this.startReview();
    } else {
      this.phase = 'playing';
    }

    return result;
  }

  startReview(): void {
    if (!this.prescription) return;
    this.reviewRound++;
    const previous = this.reviewEntries;
    this.reviewEntries = buildReviewEntries(this.prescription, this.results, this.packages, this.levelConfig.tolerance);
    for (const entry of this.reviewEntries) {
      const old = previous.find(p => p.herb === entry.herb);
      if (old && old.decision === 'accept' && old.attempts.length === entry.attempts.length) {
        entry.decision = 'accept';
      }
    }
    this.phase = 'review';
  }

  decideReview(herb: string, decision: ReviewDecision): boolean {
    const entry = this.reviewEntries.find(e => e.herb === herb);
    if (!entry || entry.issues.length === 0 || entry.decision !== null) return false;
    entry.decision = decision;
    const latest = entry.attempts.length > 0 ? entry.attempts[entry.attempts.length - 1] : null;
    this.reworkLog.push({
      round: this.reviewRound,
      herb,
      issues: [...entry.issues],
      decision,
      actual: latest ? latest.actual : 0,
    });
    if (decision === 'accept') {
      this.state.satisfaction = Math.max(0, this.state.satisfaction - 10);
      this.state.combo = 0;
    }
    return true;
  }

  completeReview(): 'rework' | 'finish' | 'pending' {
    if (!allDecided(this.reviewEntries)) return 'pending';
    const reweighHerbs = getReweighHerbs(this.reviewEntries);
    if (reweighHerbs.length > 0) {
      for (const herb of reweighHerbs) {
        this.weighed.delete(herb);
        this.packages = this.packages.filter(p => p.herb !== herb);
      }
      this.phase = 'playing';
      return 'rework';
    }
    this.finishLevel();
    return 'finish';
  }

  finishLevel(): void {
    const allResolved = this.reviewEntries.every(e => e.issues.length === 0 || e.decision === 'accept');
    const passed = allResolved && this.state.satisfaction > 0;
    this.lastLevelPassed = passed;
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
