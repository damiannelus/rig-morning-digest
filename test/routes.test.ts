import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

let dir: string;
const config = (): RigConfig => ({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}\n' +
      '{"at":"2026-01-01T02:00:00+01:00","job":"b","status":"fail","owner":null,"error":"boom"}\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-03.jsonl'),
    '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}\n' +
      'this is not json\n' +
      '{"at":"2026-01-03T02:00:00+01:00","job":"a","status":"retry","owner":"rook"}\n',
  );
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('digest page GET /digest/:night', () => {
  it('renders a night (200)', async () => {
    const res = await createApp(config()).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('boom');
  });

  it('404 when the night has no file', async () => {
    const res = await createApp(config()).request('/digest/1999-12-31');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night (200)', async () => {
    const res = await createApp(config()).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night that has a bad line (200)', async () => {
    const res = await createApp(config()).request('/digest/2026-01-03');
    expect(res.status).toBe(200);
  });
});

describe('digest JSON GET /api/digest/:night', () => {
  it('returns rows in job order (200)', async () => {
    const res = await createApp(config()).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const rows = (await res.json()) as Array<{ job: string }>;
    expect(rows.map((r) => r.job)).toEqual(['a', 'b']);
  });

  it('404 when the night has no file', async () => {
    const res = await createApp(config()).request('/api/digest/1999-12-31');
    expect(res.status).toBe(404);
  });

  it('counts around a bad line', async () => {
    const res = await createApp(config()).request('/api/digest/2026-01-03');
    const rows = (await res.json()) as Array<{ job: string; runs: number; retries: number }>;
    expect(rows.length).toBe(1);
    expect(rows[0].runs).toBe(2);
    expect(rows[0].retries).toBe(1);
  });
});
