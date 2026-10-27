export const PPQ = 96; // Pulses Per Quarter note (1 sixteenth = 24 ticks, 1 eighth = 48 ticks)

export type Articulation = 'normal' | 'ghost' | 'flam' | 'roll' | 'fill';

export interface RhythmEvent {
  readonly tick: number;
  readonly velocity: number; // 0..1
  readonly durationTicks: number;
  readonly articulation: Articulation;
  readonly atomIndex?: number;
}

export interface Track {
  readonly voice: string;
  readonly cycleTicks: number;
  readonly events: readonly RhythmEvent[];
}

export interface Pattern {
  readonly timeSignature: readonly [number, number];
  readonly bars: number;
  readonly tracks: readonly Track[];
}

export function createPattern(
  bars: number,
  tracks: Track[],
  timeSignature: readonly [number, number] = [4, 4]
): Pattern {
  return {
    bars: Math.max(1, bars),
    tracks: tracks.map(t => ({
      voice: t.voice,
      cycleTicks: t.cycleTicks,
      events: [...t.events].sort((a, b) => a.tick - b.tick),
    })),
    timeSignature,
  };
}
