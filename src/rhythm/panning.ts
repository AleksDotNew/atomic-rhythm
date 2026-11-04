export const MAX_STEREO_PAN = 0.85;

/**
 * Computes spatial stereo pan values in [-0.85, +0.85] for each atom
 * based on its horizontal coordinate in the 2D molecular layout.
 *
 * Leftmost atoms sound towards the left channel,
 * rightmost atoms sound towards the right channel,
 * central atoms / rings sound in the center.
 */
export function computeAtomPans(coords: readonly { x: number; y: number }[]): number[] {
  const n = coords.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  let minX = Infinity;
  let maxX = -Infinity;

  for (const pt of coords) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
  }

  const span = maxX - minX;
  if (span < 1e-4) {
    return new Array(n).fill(0);
  }

  const midX = (minX + maxX) / 2;
  const halfSpan = span / 2;

  return coords.map(pt => {
    const rawPan = ((pt.x - midX) / halfSpan) * MAX_STEREO_PAN;
    return Math.max(-MAX_STEREO_PAN, Math.min(MAX_STEREO_PAN, rawPan));
  });
}

/**
 * Adjusts stereo pan based on instrument acoustic characteristics.
 * Low-frequency instruments (Kick / Bass) are anchored closer to the center
 * to maintain stereo stability and low-end mono punch.
 */
export function adjustPanForVoice(pan: number, voice: string): number {
  if (voice === 'kick' || voice.startsWith('proton') || voice.includes('kick')) {
    return pan * 0.25;
  }
  return pan;
}

/**
 * Formats a pan value (-1..1) as a human-friendly string for the UI.
 * e.g. "L 45%", "Center", "R 60%".
 */
export function formatPanLabel(pan: number): string {
  const pct = Math.round(Math.abs(pan) * 100);
  if (pct < 3) {
    return 'Center';
  }
  if (pan < 0) {
    return `L ${pct}%`;
  }
  return `R ${pct}%`;
}
