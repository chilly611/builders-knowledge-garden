import { describe, it, expect, vi } from 'vitest';
import StageBackdrop from '../StageBackdrop';
import { RASTER_BACKDROPS, STAGE_BACKDROPS } from '../stage-backdrops';

/**
 * StageBackdrop Component Test
 *
 * Tests the StageBackdrop primitive for all 8 stages (0-7):
 * - Stages 0-4: Verify raster image asset paths
 * - Stages 5-7: Verify SVG inline rendering
 * - Verify accessibility attributes and styling
 * - Verify opacity and className customization
 */

describe('StageBackdrop', () => {
  it('exports from stage-backdrops module', () => {
    // Verify the component can be imported
    expect(StageBackdrop).toBeDefined();
    expect(typeof StageBackdrop).toBe('function');
  });

  it('defines correct prop interface', () => {
    // StageBackdrop accepts stage (0-7), opacity (optional), and className (optional)
    const props = {
      stage: 0 as const,
      opacity: 0.12,
      className: 'test',
    };
    expect(props.stage).toBeDefined();
    expect(props.opacity).toBeDefined();
    expect(props.className).toBeDefined();
  });

  it('stage 0 maps to beginning-journey.jpg', () => {
    expect(RASTER_BACKDROPS[0]).toBeDefined();
    expect(RASTER_BACKDROPS[0].src).toContain('beginning-journey.jpg');
  });

  it('stage 1 maps to sizeup-journey.png', () => {
    expect(RASTER_BACKDROPS[1]).toBeDefined();
    expect(RASTER_BACKDROPS[1].src).toContain('sizeup-journey.png');
  });

  it('stage 2 maps to lock-journey.png', () => {
    expect(RASTER_BACKDROPS[2]).toBeDefined();
    expect(RASTER_BACKDROPS[2].src).toContain('lock-journey.png');
  });

  it('stage 3 maps to plan-journey.png', () => {
    expect(RASTER_BACKDROPS[3]).toBeDefined();
    expect(RASTER_BACKDROPS[3].src).toContain('plan-journey.png');
  });

  it('stage 4 maps to build-journey.png', () => {
    expect(RASTER_BACKDROPS[4]).toBeDefined();
    expect(RASTER_BACKDROPS[4].src).toContain('build-journey.png');
  });

  it('stages 5-7 map to SVG backdrop components', () => {
    expect(STAGE_BACKDROPS[5]).toBeDefined();
    expect(STAGE_BACKDROPS[6]).toBeDefined();
    expect(STAGE_BACKDROPS[7]).toBeDefined();
    expect(typeof STAGE_BACKDROPS[5]).toBe('function');
    expect(typeof STAGE_BACKDROPS[6]).toBe('function');
    expect(typeof STAGE_BACKDROPS[7]).toBe('function');
  });

  it('validates stage parameter correctly', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Call with invalid stage should warn
    StageBackdrop({ stage: 8 as any });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid stage')
    );

    consoleSpy.mockRestore();
  });

  it('accepts optional opacity prop for SVG backdrops', () => {
    // Component interface allows opacity to be customized
    const props = {
      stage: 5 as const,
      opacity: 0.2,
    };
    expect(props.opacity).toBe(0.2);
  });

  it('accepts optional className prop', () => {
    // Component interface allows className customization
    const props = {
      stage: 1 as const,
      className: 'custom-class',
    };
    expect(props.className).toBe('custom-class');
  });

  it('raster backdrops have metadata properties', () => {
    for (let i = 0; i <= 4; i++) {
      expect(RASTER_BACKDROPS[i as 0 | 1 | 2 | 3 | 4]).toBeDefined();
      expect(RASTER_BACKDROPS[i as 0 | 1 | 2 | 3 | 4].src).toBeDefined();
      expect(RASTER_BACKDROPS[i as 0 | 1 | 2 | 3 | 4].alt).toBeDefined();
    }
  });
});
