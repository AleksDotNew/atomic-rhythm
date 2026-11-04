import { describe, it, expect } from 'vitest';
import {
  calculateBpm,
  getPhaseState,
  sliderToTemperature,
  temperatureToSlider,
  formatTemperature,
} from '../../src/rhythm/temperature';

describe('Thermodynamic Temperature & Phase Transitions', () => {
  it('calculates BPM non-linearly across cryogenic and superheated ranges', () => {
    const baseBpm = 120;

    // Absolute zero (-273.15°C / 0 K) should be 1 BPM
    expect(calculateBpm(baseBpm, -273.15)).toBe(1);
    expect(calculateBpm(baseBpm, -300)).toBe(1); // Clamped at absolute zero

    // Liquid nitrogen (-196°C) should be around 45-60 BPM
    const liquidN2Bpm = calculateBpm(baseBpm, -196);
    expect(liquidN2Bpm).toBeGreaterThan(40);
    expect(liquidN2Bpm).toBeLessThan(70);

    // 0°C (ambient baseline) must equal baseBpm (120)
    expect(calculateBpm(baseBpm, 0)).toBe(120);

    // Boiling water (100°C) should be around 150-160 BPM
    const boilingWaterBpm = calculateBpm(baseBpm, 100);
    expect(boilingWaterBpm).toBeGreaterThan(145);
    expect(boilingWaterBpm).toBeLessThan(165);

    // Molten iron (1500°C) should be around 240-260 BPM
    const moltenIronBpm = calculateBpm(baseBpm, 1500);
    expect(moltenIronBpm).toBeGreaterThan(230);
    expect(moltenIronBpm).toBeLessThan(270);

    // Plasma limit (5000°C) should be around 360 BPM (clamped)
    expect(calculateBpm(baseBpm, 5000)).toBe(360);
    expect(calculateBpm(baseBpm, 8000)).toBe(360);
  });

  it('classifies aggregate phase states according to temperature thresholds', () => {
    expect(getPhaseState(-273.15)).toBe('solid');
    expect(getPhaseState(-50)).toBe('solid');
    expect(getPhaseState(-11)).toBe('solid');

    expect(getPhaseState(-10)).toBe('liquid');
    expect(getPhaseState(0)).toBe('liquid');
    expect(getPhaseState(25)).toBe('liquid');
    expect(getPhaseState(149)).toBe('liquid');

    expect(getPhaseState(150)).toBe('gas');
    expect(getPhaseState(800)).toBe('gas');
    expect(getPhaseState(2499)).toBe('gas');

    expect(getPhaseState(2500)).toBe('plasma');
    expect(getPhaseState(5000)).toBe('plasma');
  });

  it('maps normalized slider values to temperature and round-trips accurately', () => {
    // Slider u in [-1, 1], where 0 is 0°C
    expect(sliderToTemperature(0)).toBe(0);
    expect(sliderToTemperature(-1)).toBeCloseTo(-273.15, 1);
    expect(sliderToTemperature(1)).toBe(5000);

    // Positive temperatures use power law u^3
    const uAt100 = temperatureToSlider(100);
    expect(uAt100).toBeGreaterThan(0.25);
    expect(uAt100).toBeLessThan(0.35);
    expect(sliderToTemperature(uAt100)).toBeCloseTo(100, 0);

    // Negative temperatures
    const uAtNeg100 = temperatureToSlider(-100);
    expect(uAtNeg100).toBeLessThan(0);
    expect(sliderToTemperature(uAtNeg100)).toBeCloseTo(-100, 0);

    // Round-trip edge values
    expect(temperatureToSlider(sliderToTemperature(-0.5))).toBeCloseTo(-0.5, 2);
    expect(temperatureToSlider(sliderToTemperature(0.5))).toBeCloseTo(0.5, 2);
  });

  it('formats temperature strings cleanly', () => {
    expect(formatTemperature(0)).toBe('0°C');
    expect(formatTemperature(-273.15)).toBe('-273°C');
    expect(formatTemperature(-50.4)).toBe('-50°C');
    expect(formatTemperature(100)).toBe('+100°C');
    expect(formatTemperature(5000)).toBe('+5000°C');
  });
});
