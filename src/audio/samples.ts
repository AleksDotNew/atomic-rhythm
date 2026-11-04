import { SynthVoiceName } from './synth';

/**
 * Standard relative file paths for Strudel / TidalCycles Dirt drum samples.
 */
export const STRUDEL_VOICE_SAMPLE_PATHS: Record<SynthVoiceName, string> = {
  kick: 'bd/0.wav',
  snare: 'sd/0.wav',
  hat: 'hh/0.wav',
  openhat: 'oh/0.wav',
  crash: 'cr/0.wav',
  clap: 'cp/0.wav',
  rim: 'rim/0.wav',
};

export const DEFAULT_STRUDEL_DIRT_CDN = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/master/';

export interface SampleBank {
  name: string;
  getBuffer(voice: SynthVoiceName): AudioBuffer | null;
  hasVoice(voice: SynthVoiceName): boolean;
  setSample(voice: SynthVoiceName, buffer: AudioBuffer): void;
  loadFromUrl(baseUrl?: string): Promise<{ loaded: number; failed: number }>;
  loadLocalFiles(files: FileList | File[]): Promise<number>;
  clear(): void;
}

export function createSampleBank(ctx: AudioContext, name: string = 'Default Bank'): SampleBank {
  const buffers = new Map<SynthVoiceName, AudioBuffer>();

  const normalizeFilenameToVoice = (filename: string): SynthVoiceName | null => {
    const lower = filename.toLowerCase();
    if (lower.startsWith('bd') || lower.includes('kick')) return 'kick';
    if (lower.startsWith('sd') || lower.includes('snare')) return 'snare';
    if (lower.startsWith('hh') || lower.includes('hat') || lower.includes('closed')) return 'hat';
    if (lower.startsWith('oh') || lower.includes('open')) return 'openhat';
    if (lower.startsWith('cr') || lower.includes('crash')) return 'crash';
    if (lower.startsWith('cp') || lower.includes('clap')) return 'clap';
    if (lower.startsWith('rim')) return 'rim';
    return null;
  };

  return {
    name,

    getBuffer(voice: SynthVoiceName): AudioBuffer | null {
      return buffers.get(voice) || null;
    },

    hasVoice(voice: SynthVoiceName): boolean {
      return buffers.has(voice);
    },

    setSample(voice: SynthVoiceName, buffer: AudioBuffer): void {
      buffers.set(voice, buffer);
    },

    async loadFromUrl(baseUrl: string = DEFAULT_STRUDEL_DIRT_CDN): Promise<{ loaded: number; failed: number }> {
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      let loaded = 0;
      let failed = 0;

      const entries = Object.entries(STRUDEL_VOICE_SAMPLE_PATHS) as [SynthVoiceName, string][];

      await Promise.all(
        entries.map(async ([voice, relPath]) => {
          try {
            const fullUrl = `${cleanBase}${relPath}`;
            const res = await fetch(fullUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuf = await res.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(arrayBuf);
            buffers.set(voice, audioBuf);
            loaded++;
          } catch {
            failed++;
          }
        })
      );

      return { loaded, failed };
    },

    async loadLocalFiles(files: FileList | File[]): Promise<number> {
      let loadedCount = 0;
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const voice = normalizeFilenameToVoice(file.name);
        if (voice) {
          try {
            const arrayBuf = await file.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(arrayBuf);
            buffers.set(voice, audioBuf);
            loadedCount++;
          } catch {
            // Ignore corrupted audio files
          }
        }
      }

      return loadedCount;
    },

    clear(): void {
      buffers.clear();
    },
  };
}
