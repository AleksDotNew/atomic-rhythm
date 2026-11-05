import { Pattern, PPQ, RhythmEvent } from '../rhythm/ir';

export const DEFAULT_MIDI_NOTES: Record<string, number> = {
  proton: 36,  // Bass Drum 1
  neutron: 42, // Closed Hi-Hat
  bond: 39,    // Hand Clap
};

export function getMidiNote(voice: string, customMap?: Record<string, number>): number {
  if (customMap && customMap[voice] !== undefined) return customMap[voice];
  if (DEFAULT_MIDI_NOTES[voice] !== undefined) return DEFAULT_MIDI_NOTES[voice];
  if (voice.startsWith('electron.')) return 38; // Acoustic Snare
  if (voice.startsWith('motif.')) return 37;    // Side Stick
  return 56; // Cowbell
}

function writeVlq(val: number): number[] {
  let v = val;
  const buffer = [v & 0x7f];
  while ((v >>= 7)) {
    buffer.push((v & 0x7f) | 0x80);
  }
  return buffer.reverse();
}

function writeUint32(val: number): number[] {
  return [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

function writeUint16(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

export function exportToMidi(
  pattern: Pattern,
  bpm: number = 120,
  voiceMap?: Record<string, number>
): Uint8Array {
  const activeTracks = pattern.tracks.filter(t => t.events.length > 0);
  const totalTracks = 1 + activeTracks.length; // 1 tempo track + N note tracks

  const chunks: number[][] = [];

  // 1. MThd Chunk
  const mthd = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    ...writeUint32(6),
    ...writeUint16(1),      // Format 1 (multi-track synchronous)
    ...writeUint16(totalTracks),
    ...writeUint16(PPQ),    // 96 PPQ
  ];
  chunks.push(mthd);

  // 2. Tempo Track (Track 0)
  const tempoTrackData: number[] = [];
  const usPerBeat = Math.round(60_000_000 / bpm);
  // Set tempo event: Delta 0, Meta 0x51, length 3
  tempoTrackData.push(
    ...writeVlq(0),
    0xff, 0x51, 0x03,
    (usPerBeat >> 16) & 0xff,
    (usPerBeat >> 8) & 0xff,
    usPerBeat & 0xff
  );

  const writeTimeSigEvent = (delta: number, num: number, den: number): number[] => {
    const denPower = Math.round(Math.log2(den || 4));
    return [
      ...writeVlq(delta),
      0xff, 0x58, 0x04,
      num & 0xff,
      denPower & 0xff,
      24, // MIDI clocks per metronome click
      8,  // 32nd notes per 24 MIDI clocks
    ];
  };

  // Write Time Signature Events
  if (pattern.timeSignatures && pattern.timeSignatures.length > 0) {
    // Initial Time Signature at delta 0
    const firstTs = pattern.timeSignatures[0];
    tempoTrackData.push(...writeTimeSigEvent(0, firstTs[0], firstTs[1]));

    let lastTick = 0;
    let currentTick = 0;

    for (let b = 1; b < pattern.timeSignatures.length; b++) {
      currentTick += pattern.barTicks ? pattern.barTicks[b - 1] : 384;
      const prevTs = pattern.timeSignatures[b - 1];
      const curTs = pattern.timeSignatures[b];

      if (curTs[0] !== prevTs[0] || curTs[1] !== prevTs[1]) {
        const delta = currentTick - lastTick;
        tempoTrackData.push(...writeTimeSigEvent(delta, curTs[0], curTs[1]));
        lastTick = currentTick;
      }
    }
  } else {
    const ts = pattern.timeSignature || [4, 4];
    tempoTrackData.push(...writeTimeSigEvent(0, ts[0], ts[1]));
  }

  // End of Track event
  tempoTrackData.push(...writeVlq(0), 0xff, 0x2f, 0x00);

  const tempoTrack = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    ...writeUint32(tempoTrackData.length),
    ...tempoTrackData,
  ];
  chunks.push(tempoTrack);

  // 3. One MTrk per active voice (MIDI Channel 10 = 0x99 note on, 0x89 note off)
  const channel = 9; // 0-indexed channel 10 (drums)

  for (const track of activeTracks) {
    const note = getMidiNote(track.voice, voiceMap);
    const trackEvents: { tick: number; type: 'on' | 'off'; velocity: number }[] = [];

    for (const evt of track.events) {
      const vel = Math.max(1, Math.min(127, Math.round(evt.velocity * 127)));
      trackEvents.push({ tick: evt.tick, type: 'on', velocity: vel });
      trackEvents.push({
        tick: evt.tick + Math.max(12, evt.durationTicks),
        type: 'off',
        velocity: 0,
      });
    }

    trackEvents.sort((a, b) => a.tick - b.tick);

    const trackData: number[] = [];
    let lastTick = 0;

    for (const te of trackEvents) {
      const delta = te.tick - lastTick;
      lastTick = te.tick;
      trackData.push(...writeVlq(delta));
      if (te.type === 'on') {
        trackData.push(0x90 | channel, note, te.velocity);
      } else {
        trackData.push(0x80 | channel, note, 0);
      }
    }

    // End of track
    trackData.push(...writeVlq(0), 0xff, 0x2f, 0x00);

    const noteTrack = [
      0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
      ...writeUint32(trackData.length),
      ...trackData,
    ];
    chunks.push(noteTrack);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
