import { describe, it, expect } from 'vitest';
import { STAGE_ACCENTS, stageAccent, STAGE_ACCENT_LIST, type StageAccentKey } from '../stage-accents';

describe('Stage Accents', () => {
  it('should export STAGE_ACCENTS object with 8 entries (stages 0–7)', () => {
    expect(Object.keys(STAGE_ACCENTS)).toHaveLength(8);
  });

  it('should have distinct hex values for each lifecycle stage (1–7)', () => {
    // Stage 0 (Money) intentionally shares Brass with Stage 6 (Collect) for
    // financial/cost semantic alignment — see stage-accents.ts header.
    const lifecycleHexes = [1, 2, 3, 4, 5, 6, 7].map(
      (id) => STAGE_ACCENTS[id as 1 | 2 | 3 | 4 | 5 | 6 | 7].hex
    );
    const uniqueHexValues = new Set(lifecycleHexes);
    expect(uniqueHexValues.size).toBe(7);
  });

  it('should return valid hex colors for all stages', () => {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    Object.values(STAGE_ACCENTS).forEach((accent) => {
      expect(accent.hex).toMatch(hexRegex);
    });
  });

  it('should have a css variable for each stage', () => {
    Object.entries(STAGE_ACCENTS).forEach(([stageId, accent]) => {
      expect(accent.cssVar).toBe(`--stage-accent-${stageId}`);
    });
  });

  it('should have a name for each stage', () => {
    const expectedNames = ['brass', 'ochre', 'indigo', 'teal', 'coral', 'magenta', 'brass', 'duskPurple'];
    Object.values(STAGE_ACCENTS).forEach((accent, index) => {
      expect(accent.name).toBe(expectedNames[index]);
    });
  });

  it('should return correct accent for stageAccent() function', () => {
    const result = stageAccent(1);
    expect(result.name).toBe('ochre');
    expect(result.hex).toBe('#C9913F');
    expect(result.cssVar).toBe('--stage-accent-1');
  });

  it('should return all 8 stages via stageAccent()', () => {
    for (let i = 0; i <= 7; i++) {
      const result = stageAccent(i as StageAccentKey);
      expect(result).toBeDefined();
      expect(result.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('should throw error for invalid stage ID', () => {
    expect(() => stageAccent(8 as unknown as StageAccentKey)).toThrow('Invalid stage ID: 8');
    expect(() => stageAccent(-1 as unknown as StageAccentKey)).toThrow('Invalid stage ID: -1');
  });

  it('should export STAGE_ACCENT_LIST as array with 8 items', () => {
    expect(STAGE_ACCENT_LIST).toHaveLength(8);
  });

  it('STAGE_ACCENT_LIST should have correct structure', () => {
    STAGE_ACCENT_LIST.forEach((item, index) => {
      expect(item.id).toBe(index);
      expect(item.hex).toBeDefined();
      expect(item.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(item.name).toBeDefined();
      expect(item.cssVar).toBe(`--stage-accent-${index}`);
    });
  });

  it('should have Stage 6 (Collect) accent as canonical Brass', () => {
    const stage6 = stageAccent(6);
    expect(stage6.name).toBe('brass');
    expect(stage6.hex).toBe('#B6873A');
  });

  it('should have Stage 0 (Money) accent as canonical Brass', () => {
    const stage0 = stageAccent(0);
    expect(stage0.name).toBe('brass');
    expect(stage0.hex).toBe('#B6873A');
  });
});
