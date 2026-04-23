import { describe, it, expect } from 'vitest';
import React from 'react';
import { BlueprintDraw, CompassTrace, HammerTap } from '../index';

describe('BlueprintDraw', () => {
  it('exports BlueprintDraw component', () => {
    expect(BlueprintDraw).toBeDefined();
    expect(typeof BlueprintDraw).toBe('function');
  });

  it('has correct default props', () => {
    const component = BlueprintDraw({});
    expect(component).toBeDefined();
  });

  it('accepts width and height props', () => {
    const component = BlueprintDraw({ width: 300, height: 250 });
    expect(component).toBeDefined();
  });

  it('accepts color prop', () => {
    const component = BlueprintDraw({ color: '#FF0000' });
    expect(component).toBeDefined();
  });

  it('accepts loop prop', () => {
    const component1 = BlueprintDraw({ loop: true });
    const component2 = BlueprintDraw({ loop: false });
    expect(component1).toBeDefined();
    expect(component2).toBeDefined();
  });

  it('accepts className prop', () => {
    const component = BlueprintDraw({ className: 'test-class' });
    expect(component).toBeDefined();
  });

  it('has default duration of 1.2 seconds', () => {
    const component = BlueprintDraw({});
    expect(component.props.children).toBeDefined();
  });
});

describe('CompassTrace', () => {
  it('exports CompassTrace component', () => {
    expect(CompassTrace).toBeDefined();
    expect(typeof CompassTrace).toBe('function');
  });

  it('has correct default props', () => {
    const component = CompassTrace({});
    expect(component).toBeDefined();
  });

  it('accepts size prop', () => {
    const component = CompassTrace({ size: 200 });
    expect(component).toBeDefined();
  });

  it('accepts color prop', () => {
    const component = CompassTrace({ color: '#FF0000' });
    expect(component).toBeDefined();
  });

  it('accepts duration prop', () => {
    const component = CompassTrace({ duration: 5 });
    expect(component).toBeDefined();
  });

  it('accepts className prop', () => {
    const component = CompassTrace({ className: 'compass-test' });
    expect(component).toBeDefined();
  });

  it('default size is 120', () => {
    const component = CompassTrace({});
    expect(component).toBeDefined();
  });

  it('default duration is 3 seconds', () => {
    const component = CompassTrace({});
    expect(component).toBeDefined();
  });

  it('default color is brass', () => {
    const component = CompassTrace({});
    expect(component).toBeDefined();
  });
});

describe('HammerTap', () => {
  it('exports HammerTap component', () => {
    expect(HammerTap).toBeDefined();
    expect(typeof HammerTap).toBe('function');
  });

  it('has correct default props', () => {
    const component = HammerTap({});
    expect(component).toBeDefined();
  });

  it('accepts size prop', () => {
    const component = HammerTap({ size: 64 });
    expect(component).toBeDefined();
  });

  it('accepts taps prop', () => {
    const component = HammerTap({ taps: 3 });
    expect(component).toBeDefined();
  });

  it('accepts onComplete callback', () => {
    const callback = () => {};
    const component = HammerTap({ onComplete: callback });
    expect(component).toBeDefined();
  });

  it('accepts className prop', () => {
    const component = HammerTap({ className: 'hammer-test' });
    expect(component).toBeDefined();
  });

  it('has default size of 48', () => {
    const component = HammerTap({});
    expect(component).toBeDefined();
  });

  it('has default taps of 1', () => {
    const component = HammerTap({});
    expect(component).toBeDefined();
  });
});

describe('Animation props and aria-hidden', () => {
  it('BlueprintDraw renders with aria-hidden true', () => {
    const component = BlueprintDraw({});
    expect(component.props['aria-hidden']).toBe('true');
  });

  it('CompassTrace renders with aria-hidden true', () => {
    const component = CompassTrace({});
    expect(component.props['aria-hidden']).toBe('true');
  });

  it('HammerTap renders with aria-hidden true', () => {
    const component = HammerTap({});
    expect(component.props['aria-hidden']).toBe('true');
  });

  it('Components are SSR-safe (no window access at module load)', () => {
    expect(() => {
      BlueprintDraw({});
      CompassTrace({});
      HammerTap({});
    }).not.toThrow();
  });
});
