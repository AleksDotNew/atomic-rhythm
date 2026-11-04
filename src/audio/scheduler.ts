import { Pattern, PPQ, RhythmEvent } from '../rhythm/ir';
import { DrumSynth, SynthVoiceName } from './synth';

export function ticksToSeconds(ticks: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return (ticks / PPQ) * secondsPerBeat;
}

export function secondsToTicks(seconds: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return (seconds / secondsPerBeat) * PPQ;
}

export const DEFAULT_SYNTH_MAP: Record<string, SynthVoiceName> = {
  proton: 'kick',
  neutron: 'hat',
  bond: 'clap',
};

export function resolveSynthVoice(
  voice: string,
  customMap?: Record<string, SynthVoiceName>
): SynthVoiceName {
  if (customMap && customMap[voice]) return customMap[voice];
  if (DEFAULT_SYNTH_MAP[voice]) return DEFAULT_SYNTH_MAP[voice];
  if (voice.startsWith('electron.')) return 'snare';
  if (voice.startsWith('motif.')) return 'rim';
  return 'snare';
}

export interface ScheduledEvent {
  readonly voice: string;
  readonly synthVoice: SynthVoiceName;
  readonly tick: number;
  readonly event: RhythmEvent;
}

export function getEventsInWindow(
  pattern: Pattern,
  startTick: number,
  endTick: number,
  customVoiceMap?: Record<string, SynthVoiceName>
): ScheduledEvent[] {
  const results: ScheduledEvent[] = [];
  const fullCycleTicks = pattern.bars * 16 * (PPQ / 4);

  for (const track of pattern.tracks) {
    if (track.events.length === 0) continue;
    const synthVoice = resolveSynthVoice(track.voice, customVoiceMap);

    // Track cycle length
    const cycle = track.cycleTicks > 0 ? track.cycleTicks : fullCycleTicks;

    // Range of track repetitions that intersect [startTick, endTick)
    const minRep = Math.floor(startTick / cycle);
    const maxRep = Math.floor(endTick / cycle);

    for (let rep = minRep; rep <= maxRep; rep++) {
      const repOffset = rep * cycle;
      for (const evt of track.events) {
        const globalTick = repOffset + evt.tick;
        if (globalTick >= startTick && globalTick < endTick) {
          results.push({
            voice: track.voice,
            synthVoice,
            tick: globalTick,
            event: evt,
          });
        }
      }
    }
  }

  return results;
}

export class AudioScheduler {
  private ctx: AudioContext;
  private synth: DrumSynth;
  private pattern: Pattern | null = null;
  private bpm: number = 120;
  private customVoiceMap?: Record<string, SynthVoiceName>;

  private timerId: number | null = null;
  private _isPlaying: boolean = false;
  private startAudioTime: number = 0;
  private currentScheduledTick: number = 0;

  private onStepCallback?: (atomIndex?: number, voice?: string, tick?: number) => void;

  constructor(ctx: AudioContext, synth: DrumSynth) {
    this.ctx = ctx;
    this.synth = synth;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  setPattern(pattern: Pattern, bpm: number, voiceMap?: Record<string, SynthVoiceName>): void {
    this.pattern = pattern;
    this.bpm = bpm;
    this.customVoiceMap = voiceMap;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  start(onStep?: (atomIndex?: number, voice?: string, tick?: number) => void): void {
    if (this._isPlaying) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this._isPlaying = true;
    this.onStepCallback = onStep;
    this.startAudioTime = this.ctx.currentTime + 0.05;
    this.currentScheduledTick = 0;

    // Look-ahead loop: runs every 25ms, schedules ahead by 100ms
    const LOOKAHEAD_SEC = 0.1;
    const INTERVAL_MS = 25;

    this.timerId = window.setInterval(() => {
      if (!this._isPlaying || !this.pattern) return;

      const elapsedAudioTime = this.ctx.currentTime - this.startAudioTime;
      if (elapsedAudioTime < 0) return;

      const windowStartTick = this.currentScheduledTick;
      const windowEndSeconds = elapsedAudioTime + LOOKAHEAD_SEC;
      const windowEndTick = Math.floor(secondsToTicks(windowEndSeconds, this.bpm));

      if (windowEndTick > windowStartTick) {
        const events = getEventsInWindow(
          this.pattern,
          windowStartTick,
          windowEndTick,
          this.customVoiceMap
        );

        for (const se of events) {
          const eventTime = this.startAudioTime + ticksToSeconds(se.tick, this.bpm);
          this.synth.trigger(se.synthVoice, eventTime, se.event.velocity, se.event.articulation, se.event.pan);

          // Trigger UI step update at scheduled time
          if (this.onStepCallback) {
            const delayMs = Math.max(0, (eventTime - this.ctx.currentTime) * 1000);
            window.setTimeout(() => {
              if (this._isPlaying && this.onStepCallback) {
                this.onStepCallback(se.event.atomIndex, se.voice, se.tick);
              }
            }, delayMs);
          }
        }

        this.currentScheduledTick = windowEndTick;
      }
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this._isPlaying = false;
    this.currentScheduledTick = 0;
  }
}
