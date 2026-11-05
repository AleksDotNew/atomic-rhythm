import { MolecularAnalysis } from '../chem/analysis';
import { Molecule } from '../chem/molecule';
import { PPQ } from './ir';

export type TimeSignatureOption =
  | '4/4'
  | '3/4'
  | '6/8'
  | '7/8'
  | '5/8'
  | '5/4'
  | 'adaptive';

export interface MeterInfo {
  readonly numerator: number;
  readonly denominator: number;
  readonly steps: number;
  readonly ticks: number;
}

export function parseTimeSignatureString(str: string): [number, number] {
  const parts = str.split('/').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
    return [parts[0], parts[1]];
  }
  return [4, 4];
}

export function getMeterInfo(ts: readonly [number, number]): MeterInfo {
  const [num, den] = ts;
  const sixteenthTicks = PPQ / 4; // 24 ticks
  const ticksPerBeat = (4 / den) * PPQ;
  const ticks = Math.round(num * ticksPerBeat);
  const steps = Math.max(1, Math.round(ticks / sixteenthTicks));

  return {
    numerator: num,
    denominator: den,
    steps,
    ticks,
  };
}

export function resolveBarMeters(
  _mol: Molecule,
  analysis: MolecularAnalysis,
  option: TimeSignatureOption,
  totalBars: number
): MeterInfo[] {
  if (totalBars <= 0) return [];

  if (option !== 'adaptive') {
    const ts = parseTimeSignatureString(option);
    const meter = getMeterInfo(ts);
    return new Array(totalBars).fill(meter);
  }

  // Adaptive mode: meter is determined by molecular ring topology
  const meters: MeterInfo[] = [];

  for (let b = 0; b < totalBars; b++) {
    const unit = analysis.structuralUnits[b];
    if (unit) {
      const heavyIdx = unit.heavyAtomIndex;
      const ring = analysis.rings.find(r => r.atomIndices.includes(heavyIdx));
      if (ring) {
        if (ring.size === 5) {
          meters.push(getMeterInfo([5, 8]));
        } else if (ring.size === 6) {
          meters.push(getMeterInfo([6, 8]));
        } else if (ring.size === 7) {
          meters.push(getMeterInfo([7, 8]));
        } else {
          meters.push(getMeterInfo([ring.size, 8]));
        }
        continue;
      }
    }

    // Default for open-chain or non-cyclic atoms: 4/4
    meters.push(getMeterInfo([4, 4]));
  }

  return meters;
}
