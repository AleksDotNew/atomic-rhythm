import { AtomConfig } from '../chem/atom';
import { PPQ, RhythmEvent, Track } from './ir';
import { MeterInfo } from './time-signature';

export type GenreSkeletonId = 'raw' | 'dnb' | 'techno' | 'hiphop';

export const GENRE_DEFAULT_BPM: Record<GenreSkeletonId, number> = {
  raw: 120,
  dnb: 174,
  techno: 128,
  hiphop: 90,
};

export function applyGenreSkeleton(
  tracks: Track[],
  atom: AtomConfig,
  genre: GenreSkeletonId,
  meter: MeterInfo,
  _barIndex: number = 0
): Track[] {
  if (genre === 'raw') {
    return tracks;
  }

  const sixteenthTicks = PPQ / 4; // 24 ticks
  const barTicks = meter.ticks;
  const steps = meter.steps;

  if (genre === 'dnb') {
    return applyDnbSkeleton(tracks, atom, meter, sixteenthTicks, barTicks, steps);
  }

  if (genre === 'techno') {
    return applyTechnoSkeleton(tracks, atom, meter, sixteenthTicks, barTicks, steps);
  }

  if (genre === 'hiphop') {
    return applyHiphopSkeleton(tracks, atom, meter, sixteenthTicks, barTicks, steps);
  }

  return tracks;
}

function applyDnbSkeleton(
  tracks: Track[],
  atom: AtomConfig,
  meter: MeterInfo,
  sixteenthTicks: number,
  barTicks: number,
  steps: number
): Track[] {
  const result: Track[] = [];

  // 1. Kick (Proton): Downbeat step 0 + syncopated step (10 or 11 in 4/4)
  const kickEvents: RhythmEvent[] = [
    {
      tick: 0,
      velocity: 1.0,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    },
  ];

  let syncStep = steps === 16 ? (atom.protons % 2 === 0 ? 10 : 11) : Math.round(steps * 0.65);
  if (syncStep < steps) {
    kickEvents.push({
      tick: syncStep * sixteenthTicks,
      velocity: 0.85,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  // Heavy atoms (Z >= 8) get an extra syncopated ghost kick
  if (atom.protons >= 8 && steps === 16) {
    kickEvents.push({
      tick: 14 * sixteenthTicks,
      velocity: 0.6,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'proton',
    cycleTicks: barTicks,
    events: kickEvents,
  });

  // 2. Snare (Electrons): Rigid Backbeats (steps 4 & 12 in 4/4) + ghost notes
  const snareSteps = steps === 16 ? [4, 12] : [Math.floor(steps / 2)];
  const snareEvents: RhythmEvent[] = snareSteps.map(s => ({
    tick: s * sixteenthTicks,
    velocity: 0.95,
    durationTicks: sixteenthTicks,
    articulation: 'normal',
  }));

  // Map valence electrons to ghost notes in gaps (e.g. steps 7, 14, 15)
  if (steps === 16) {
    if (atom.valenceElectrons >= 2) {
      snareEvents.push({
        tick: 7 * sixteenthTicks,
        velocity: 0.45,
        durationTicks: sixteenthTicks / 2,
        articulation: 'ghost',
      });
    }
    if (atom.valenceElectrons >= 4) {
      snareEvents.push({
        tick: 15 * sixteenthTicks,
        velocity: 0.4,
        durationTicks: sixteenthTicks / 2,
        articulation: 'ghost',
      });
    }
  }

  result.push({
    voice: 'electron.s1',
    cycleTicks: barTicks,
    events: snareEvents,
  });

  // 3. Hats (Neutron): Dense rolling 16th-note groove
  const hatEvents: RhythmEvent[] = [];
  for (let s = 0; s < steps; s++) {
    const isOffbeat = s % 2 !== 0;
    const neutronMod = (atom.neutrons + s) % 4;
    const vel = 0.5 + 0.35 * (neutronMod / 3.0) + (isOffbeat ? 0.05 : -0.05);

    hatEvents.push({
      tick: s * sixteenthTicks,
      velocity: Math.min(1.0, Math.max(0.3, vel)),
      durationTicks: sixteenthTicks / 2,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'neutron',
    cycleTicks: barTicks,
    events: hatEvents,
  });

  // Keep other tracks (bonds, motifs, openhat)
  for (const t of tracks) {
    if (t.voice !== 'proton' && t.voice !== 'neutron' && !t.voice.startsWith('electron')) {
      result.push(t);
    }
  }

  return result;
}

function applyTechnoSkeleton(
  tracks: Track[],
  _atom: AtomConfig,
  _meter: MeterInfo,
  sixteenthTicks: number,
  barTicks: number,
  steps: number
): Track[] {
  const result: Track[] = [];

  // 1. Kick: Four-on-the-floor (quarter notes: steps 0, 4, 8, 12 in 4/4)
  const kickEvents: RhythmEvent[] = [];
  for (let s = 0; s < steps; s += 4) {
    kickEvents.push({
      tick: s * sixteenthTicks,
      velocity: 1.0,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'proton',
    cycleTicks: barTicks,
    events: kickEvents,
  });

  // 2. Clap / Snare: on beats 2 & 4 (steps 4 & 12 in 4/4)
  const clapEvents: RhythmEvent[] = [];
  for (let s = 4; s < steps; s += 8) {
    clapEvents.push({
      tick: s * sixteenthTicks,
      velocity: 0.85,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'electron.s1',
    cycleTicks: barTicks,
    events: clapEvents,
  });

  // 3. Open Hat: offbeat eighths (steps 2, 6, 10, 14 in 4/4)
  const ohEvents: RhythmEvent[] = [];
  for (let s = 2; s < steps; s += 4) {
    ohEvents.push({
      tick: s * sixteenthTicks,
      velocity: 0.8,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'openhat',
    cycleTicks: barTicks,
    events: ohEvents,
  });

  // 4. Closed Hat / Percussion: sixteenth notes from existing neutron/electron tracks
  const originalHat = tracks.find(t => t.voice === 'neutron');
  if (originalHat) {
    result.push(originalHat);
  }

  // Keep other tracks
  for (const t of tracks) {
    if (t.voice !== 'proton' && t.voice !== 'neutron' && !t.voice.startsWith('electron') && t.voice !== 'openhat') {
      result.push(t);
    }
  }

  return result;
}

function applyHiphopSkeleton(
  tracks: Track[],
  _atom: AtomConfig,
  _meter: MeterInfo,
  sixteenthTicks: number,
  barTicks: number,
  steps: number
): Track[] {
  const result: Track[] = [];

  // 1. Kick: Downbeat step 0 + syncopated step 10
  const kickEvents: RhythmEvent[] = [
    {
      tick: 0,
      velocity: 1.0,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    },
  ];

  if (steps >= 12) {
    kickEvents.push({
      tick: 10 * sixteenthTicks,
      velocity: 0.85,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    });
  }

  result.push({
    voice: 'proton',
    cycleTicks: barTicks,
    events: kickEvents,
  });

  // 2. Snare: Halftime beat 3 (step 8) or steps 4 & 12
  const snareEvents: RhythmEvent[] = [
    {
      tick: Math.floor(steps / 2) * sixteenthTicks,
      velocity: 0.95,
      durationTicks: sixteenthTicks,
      articulation: 'normal',
    },
  ];

  result.push({
    voice: 'electron.s1',
    cycleTicks: barTicks,
    events: snareEvents,
  });

  // 3. Hats: Eighth notes + trap rolls on steps 14-15
  const hatEvents: RhythmEvent[] = [];
  for (let s = 0; s < steps; s += 2) {
    hatEvents.push({
      tick: s * sixteenthTicks,
      velocity: s % 4 === 0 ? 0.75 : 0.6,
      durationTicks: sixteenthTicks / 2,
      articulation: 'normal',
    });
  }

  if (steps === 16) {
    hatEvents.push({
      tick: 15 * sixteenthTicks,
      velocity: 0.5,
      durationTicks: sixteenthTicks / 4,
      articulation: 'roll',
    });
  }

  result.push({
    voice: 'neutron',
    cycleTicks: barTicks,
    events: hatEvents,
  });

  // Keep other tracks
  for (const t of tracks) {
    if (t.voice !== 'proton' && t.voice !== 'neutron' && !t.voice.startsWith('electron')) {
      result.push(t);
    }
  }

  return result;
}
