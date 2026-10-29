import { describe, it, expect } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('reads the night into one row per job, skipping the bad line', () => {
    const rows = readNight('runs', '2026-10-28');
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(5);
    expect(rows!.map((r) => r.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
    const by = Object.fromEntries(rows!.map((r) => [r.job, r]));
    expect(by['digest/render'].owner).toBeNull();
    expect(by['digest/render'].runs).toBe(1);
    expect(by['digest/render'].lastStatus).toBe('ok');
    expect(by['fixtures/refresh'].retries).toBe(3);
    expect(by['fixtures/refresh'].lastStatus).toBe('ok');
    expect(by['fixtures/refresh'].lastError).toBe('upstream 503');
    expect(by['notes/backup'].lastStatus).toBe('fail');
    expect(by['notes/backup'].lastError).toBe('quota exceeded');
    expect(by['notes/backup'].owner).toBe('lane-07');
    expect(by['lane/sync'].runs).toBe(8);
    expect(by['lane/sync'].retries).toBe(1);
  });

  it('returns null when the night has no file', () => {
    expect(readNight('runs', '2000-01-01')).toBeNull();
  });
});
