export type PhaseState = 'solid' | 'liquid' | 'gas' | 'plasma';

export const ABSOLUTE_ZERO_CELSIUS = -273.15;
export const MAX_PLASMA_TEMP_CELSIUS = 5000;

/**
 * Calculates effective BPM non-linearly based on thermodynamic temperature (°C).
 *
 * Curve characteristics:
 * - At absolute zero (-273.15°C / 0 K): BPM = 1 (complete cryogenic stasis).
 * - Sub-zero (T <= 0°C): Kinetic energy scales with absolute temperature K = T + 273.15,
 *   reaching baseBpm at 0°C.
 * - Super-zero (T > 0°C): Kinetic thermal velocity scales as sqrt(T), smoothly rising
 *   to baseBpm * 3 (e.g. 360 BPM at 5000°C).
 */
export function calculateBpm(baseBpm: number, temperature: number): number {
  const safeBase = Math.max(10, baseBpm);
  const clampedT = Math.max(ABSOLUTE_ZERO_CELSIUS, Math.min(MAX_PLASMA_TEMP_CELSIUS, temperature));

  if (clampedT <= 0) {
    const kelvin = clampedT - ABSOLUTE_ZERO_CELSIUS; // 0 .. 273.15
    const ratio = Math.max(0, Math.min(1, kelvin / 273.15));
    // Power 0.65 ensures a smooth curve that stays slow in cryogenic range and reaches baseBpm at 0°C
    return Math.max(1, Math.round(1 + (safeBase - 1) * Math.pow(ratio, 0.65)));
  } else {
    const ratio = Math.min(1, clampedT / MAX_PLASMA_TEMP_CELSIUS); // 0 .. 1
    // sqrt(ratio) matches kinetic particle speed v ~ sqrt(T)
    const maxBpmIncrease = safeBase * 2; // e.g. 120 -> 360 (+240)
    return Math.round(safeBase + maxBpmIncrease * Math.sqrt(ratio));
  }
}

/**
 * Classifies the thermodynamic phase state of matter at a given temperature (°C).
 *
 * Thresholds:
 * - Solid: T < -10°C (crystalline freeze)
 * - Liquid: -10°C <= T < +150°C (ambient fluid / aqueous solution)
 * - Gas: +150°C <= T < +2500°C (vaporized / gaseous state)
 * - Plasma: T >= +2500°C (thermal ionization into free electrons and ions)
 */
export function getPhaseState(temperature: number): PhaseState {
  if (temperature < -10) {
    return 'solid';
  }
  if (temperature < 150) {
    return 'liquid';
  }
  if (temperature < 2500) {
    return 'gas';
  }
  return 'plasma';
}

/**
 * Converts a normalized slider position u in [-1.0, +1.0] to temperature in °C.
 *
 * Center u = 0 corresponds to 0°C.
 * Negative u in [-1, 0] scales linearly to [-273.15°C, 0°C].
 * Positive u in [0, 1] scales as a cubic power law (5000 * u^3), giving fine control
 * over 0°C..100°C near the center while smoothly reaching 5000°C at +1.0.
 */
export function sliderToTemperature(sliderNorm: number): number {
  const u = Math.max(-1, Math.min(1, sliderNorm));
  if (u <= 0) {
    return u * -ABSOLUTE_ZERO_CELSIUS; // e.g. -1 * 273.15 = -273.15
  }
  return MAX_PLASMA_TEMP_CELSIUS * Math.pow(u, 3);
}

/**
 * Converts temperature in °C to normalized slider position u in [-1.0, +1.0].
 */
export function temperatureToSlider(temperature: number): number {
  const clampedT = Math.max(ABSOLUTE_ZERO_CELSIUS, Math.min(MAX_PLASMA_TEMP_CELSIUS, temperature));
  if (clampedT <= 0) {
    return clampedT / -ABSOLUTE_ZERO_CELSIUS;
  }
  return Math.cbrt(clampedT / MAX_PLASMA_TEMP_CELSIUS);
}

/**
 * Formats a temperature in °C with degree symbol and appropriate sign.
 */
export function formatTemperature(temperature: number): string {
  const rounded = Math.round(temperature);
  if (rounded > 0) {
    return `+${rounded}°C`;
  }
  return `${rounded}°C`;
}
