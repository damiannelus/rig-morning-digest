import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, ReadNight } from './types.js';

// One parsed run-log line. We trust these fields only after the checks below.
type RunLine = { at: string; job: string; status: JobStatus; owner?: string | null; error?: string };

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

function parseLine(line: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null; // a line that doesn't parse is skipped, never thrown
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.at !== 'string' || typeof v.job !== 'string') return null;
  if (typeof v.status !== 'string' || !STATUSES.includes(v.status)) return null;
  return {
    at: v.at,
    job: v.job,
    status: v.status as JobStatus,
    owner: typeof v.owner === 'string' ? v.owner : null,
    error: typeof v.error === 'string' && v.error.length > 0 ? v.error : undefined,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  let data: string;
  try {
    data = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  const byJob = new Map<string, RunLine[]>();
  for (const line of data.split('\n')) {
    if (line.trim().length === 0) continue;
    const parsed = parseLine(line);
    if (!parsed) continue; // bad line: counted out, the night still renders
    const list = byJob.get(parsed.job);
    if (list) list.push(parsed);
    else byJob.set(parsed.job, [parsed]);
  }

  const rows: DigestRow[] = [];
  for (const [job, lines] of byJob) {
    lines.sort((a, b) => a.at.localeCompare(b.at));
    const last = lines[lines.length - 1];
    let lastError: string | null = null;
    for (const line of lines) if (line.error) lastError = line.error; // latest error wins
    rows.push({
      job,
      owner: last.owner ?? null,
      runs: lines.length,
      retries: lines.filter((l) => l.status === 'retry').length,
      lastStatus: last.status,
      lastError,
      firstAt: lines[0].at,
      lastAt: last.at,
    });
  }
  rows.sort((a, b) => a.job.localeCompare(b.job));
  return rows;
};

export function nightCounts(rows: DigestRow[]): { ok: number; retry: number; fail: number } {
  const counts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) counts[r.lastStatus] += 1;
  return counts;
}
