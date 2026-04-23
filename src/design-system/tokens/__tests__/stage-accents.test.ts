import { describe, it, expect } from 'vitest';
import { STAGE_ACCENTS, stageAccent, STAGE_ACCENT_LIST, type StageId } from '../stage-accents';

describe('Stage Accents', () => {
  it('should export STAGE_ACCENTS object with 7 entries', () => {
    expect(Object.keys(STAGE_ACCENTS)).toHaveLength(7);
  });

  it('should have distinct hex values for each stage', () => {
    const hexValues = Object.values(STAGE_ACCENTS).map((accent) => accent.hex);
    const uniqueHexValues = new Set(hexValues);
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
    const expectedNames = ['ochre', 'indigo', 'teal', 'coral', 'magenta', 'brass', 'duskPurple'];
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

  it('should return all 7 stages via stageAccent()', () => {
    for (let i = 1; i <= 7; i++) {
      const result = stageAccent(i as StageId);
      expect(result).toBeDefined();
      expect(result.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('should throw error for invalid stage ID', () => {
    expect(() => stageAccent(0 as StageId)).toThrow('Invalid stage ID: 0');
    expect(() => stageAccent(8 as StageId)).toThrow('Invalid stage ID: 8');
  });

  it('should export STAGE_ACCENT_LIST as array with 7 items', () => {
    expect(STAGE_ACCENT_LIST).toHaveLength(7);
  });

  it('STAGE_ACCENT_LIST should have correct structure', () => {
    STAGE_ACCENT_LIST.forEach((item, index) => {
      expect(item.id).toBe(index + 1);
      expect(item.hex).toBeDefined();
      expect(item.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(item.name).toBeDefined();
      expect(item.cssVar).toBe(`--stage-accent-${index + 1}`);
    });
  });

  it('should have Stage 6 (Collect) accent as canonical Brass', () => {
    const stage6 = stageAccent(6);
    expect(stage6.name).toBe('brass');
    expect(stage6.hex).toBe('#B6873A');
  });
});
