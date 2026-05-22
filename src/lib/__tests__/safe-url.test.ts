/**
 * Tests for safe-url.ts — open-redirect defense.
 * 2026-05-22 (Sec+Auth Burn 6).
 */
import { describe, it, expect } from 'vitest';
import { safeNext } from '../safe-url';

describe('safeNext', () => {
  it('allows simple server-relative paths', () => {
    expect(safeNext('/killerapp')).toBe('/killerapp');
    expect(safeNext('/welcome?next=%2Fkillerapp')).toBe('/welcome?next=%2Fkillerapp');
    expect(safeNext('/killerapp/workflows/estimating')).toBe('/killerapp/workflows/estimating');
  });

  it('falls back when input is null, undefined, or empty', () => {
    expect(safeNext(null)).toBe('/welcome');
    expect(safeNext(undefined)).toBe('/welcome');
    expect(safeNext('')).toBe('/welcome');
  });

  it('rejects absolute URLs even on our own domain', () => {
    expect(safeNext('https://builders.theknowledgegardens.com/killerapp')).toBe('/welcome');
    expect(safeNext('http://localhost:3000/killerapp')).toBe('/welcome');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeNext('//evil.example.com/path')).toBe('/welcome');
    expect(safeNext('//evil.example.com')).toBe('/welcome');
  });

  it('rejects backslash-prefixed paths (Windows / old-IE quirks)', () => {
    expect(safeNext('/\\evil.example.com')).toBe('/welcome');
    expect(safeNext('/foo\\bar')).toBe('/welcome');
  });

  it('rejects javascript: scheme', () => {
    expect(safeNext('javascript:alert(1)')).toBe('/welcome');
  });

  it('rejects CR/LF (header injection defense)', () => {
    expect(safeNext('/foo\nLocation: https://evil')).toBe('/welcome');
    expect(safeNext('/foo\rbar')).toBe('/welcome');
  });

  it('honors a custom default path', () => {
    expect(safeNext(null, '/killerapp')).toBe('/killerapp');
    expect(safeNext('https://evil.com', '/killerapp')).toBe('/killerapp');
  });

  it('rejects bare paths without leading slash', () => {
    expect(safeNext('killerapp')).toBe('/welcome');
    expect(safeNext('killerapp?x=1')).toBe('/welcome');
  });
});
