export type DecoctType = 'normal' | 'first' | 'last';

export interface PrescriptionItem {
  herb: string;
  grams: number;
  decoct: DecoctType;
}

export interface Prescription {
  id: string;
  items: PrescriptionItem[];
}

export interface WeighResult {
  herb: string;
  target: number;
  actual: number;
  ok: boolean;
  deltaG: number;
}

export interface Package {
  herb: string;
  grams: number;
  decoct: DecoctType;
  separated: boolean;
  labeled: boolean;
}

export type ReviewIssue = 'weight' | 'not-separated' | 'unlabeled';

export type ReviewDecision = 'reweigh' | 'accept';

export interface ReviewEntry {
  herb: string;
  target: number;
  decoct: DecoctType;
  attempts: WeighResult[];
  issues: ReviewIssue[];
  decision: ReviewDecision | null;
}

export interface ReworkRecord {
  round: number;
  herb: string;
  issues: ReviewIssue[];
  decision: ReviewDecision;
  actual: number;
}

export interface GameState {
  level: number;
  score: number;
  combo: number;
  queue: number;
  satisfaction: number;
  expired: boolean;
}

export interface LevelConfig {
  level: number;
  herbCount: number;
  tolerance: number;
  timeLimit: number | null;
  hasSimilarHerbs: boolean;
  requireTare: boolean;
  requireOrganize: boolean;
  enableDecoctSplit: boolean;
}

export interface ScoreBreakdown {
  base: number;
  precisionBonus: number;
  comboBonus: number;
  timePenalty: number;
  total: number;
}

export type GamePhase = 'menu' | 'playing' | 'weighing' | 'review' | 'result' | 'gameover';

export interface HerbMeta {
  name: string;
  color: string;
  similar?: string[];
}
