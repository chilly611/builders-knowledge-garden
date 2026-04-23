import { describe, it, expect } from 'vitest';
import { matchCommand, COMMANDS } from '../voice-commands';

describe('voice-commands :: matchCommand', () => {
  it('matches workflow by single keyword', () => {
    const result = matchCommand('estimating');
    expect(result).toEqual({
      type: 'workflow',
      workflowId: 'q2',
      href: '/killerapp/workflows/estimating',
    });
  });

  it('matches workflow by phrase substring', () => {
    const result = matchCommand('take me to contract templates');
    expect(result).toEqual({
      type: 'workflow',
      workflowId: 'q4',
      href: '/killerapp/workflows/contract-templates',
    });
  });

  it('matches home navigation', () => {
    const result = matchCommand('home');
    expect(result).toEqual({
      type: 'nav',
      target: 'home',
      href: '/killerapp',
    });
  });

  it('matches back to start navigation', () => {
    const result = matchCommand('back to start');
    expect(result).toEqual({
      type: 'nav',
      target: 'home',
      href: '/killerapp',
    });
  });

  it('matches all workflows navigation', () => {
    const result = matchCommand('all workflows');
    expect(result).toEqual({
      type: 'nav',
      target: 'home',
      href: '/killerapp',
    });
  });

  it('matches close UI action', () => {
    const result = matchCommand('close');
    expect(result).toEqual({
      type: 'ui',
      action: 'close_overlay',
    });
  });

  it('matches cancel UI action', () => {
    const result = matchCommand('cancel');
    expect(result).toEqual({
      type: 'ui',
      action: 'close_overlay',
    });
  });

  it('matches done UI action', () => {
    const result = matchCommand('done');
    expect(result).toEqual({
      type: 'ui',
      action: 'close_overlay',
    });
  });

  it('picks longer phrase when multiple match', () => {
    // "crew sizing" (11 chars) is longer than "crew" (4 chars)
    const result = matchCommand('show me crew sizing');
    expect(result?.workflowId).toBe('q7');
    expect(result?.href).toBe('/killerapp/workflows/worker-count');
  });

  it('is case-insensitive', () => {
    const result = matchCommand('CONTRACTS');
    expect(result?.workflowId).toBe('q4');
  });

  it('trims whitespace', () => {
    const result = matchCommand('  permits  ');
    expect(result?.workflowId).toBe('q8');
  });

  it('returns null for no match', () => {
    const result = matchCommand('xyz123abc');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = matchCommand('');
    expect(result).toBeNull();
  });

  it('returns null for whitespace only', () => {
    const result = matchCommand('   ');
    expect(result).toBeNull();
  });

  it('matches code compliance', () => {
    const result = matchCommand('codes');
    expect(result?.workflowId).toBe('q5');
  });

  it('matches sequencing', () => {
    const result = matchCommand('job sequencing');
    expect(result?.workflowId).toBe('q6');
  });

  it('matches workers', () => {
    const result = matchCommand('workers');
    expect(result?.workflowId).toBe('q7');
  });

  it('matches subs', () => {
    const result = matchCommand('subs');
    expect(result?.workflowId).toBe('q9');
  });

  it('matches equipment', () => {
    const result = matchCommand('rent or buy');
    expect(result?.workflowId).toBe('q10');
  });

  it('matches supply ordering', () => {
    const result = matchCommand('supply ordering');
    expect(result?.workflowId).toBe('q11');
  });

  it('matches weather', () => {
    const result = matchCommand('weather');
    expect(result?.workflowId).toBe('q14');
  });

  it('matches daily log', () => {
    const result = matchCommand('daily log');
    expect(result?.workflowId).toBe('q15');
  });

  it('matches expenses', () => {
    const result = matchCommand('receipts');
    expect(result?.workflowId).toBe('q17');
  });

  it('exports COMMANDS array with all 12 workflows', () => {
    expect(COMMANDS).toBeDefined();
    expect(COMMANDS.length).toBe(12);

    // Check structure
    COMMANDS.forEach((cmd) => {
      expect(cmd.workflowId).toBeDefined();
      expect(cmd.phrases).toBeDefined();
      expect(Array.isArray(cmd.phrases)).toBe(true);
      expect(cmd.href).toBeDefined();
    });
  });
});
