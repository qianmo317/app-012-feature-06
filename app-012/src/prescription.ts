import type { Prescription, PrescriptionItem, LevelConfig } from './types';
import { getRandomHerbs } from './herbs';

let prescriptionIdCounter = 0;

export function generatePrescription(config: LevelConfig): Prescription {
  const herbs = getRandomHerbs(config.herbCount, config.hasSimilarHerbs);
  const items: PrescriptionItem[] = herbs.map(herb => {
    const grams = Math.floor(Math.random() * 20) + 5;
    let decoct: 'normal' | 'first' | 'last' = 'normal';
    if (config.enableDecoctSplit) {
      const r = Math.random();
      if (r < 0.15) decoct = 'first';
      else if (r < 0.3) decoct = 'last';
    }
    return { herb: herb.name, grams, decoct };
  });

  return {
    id: `rx-${++prescriptionIdCounter}-${Date.now()}`,
    items
  };
}
