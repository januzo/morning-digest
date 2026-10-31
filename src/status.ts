import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import type { RunStatus } from './digest/types.js';

export type Counts = Record<RunStatus, number>;

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  /** per night: log lines by status; null when the night cannot be read */
  nightCounts: Record<string, Counts | null>;
};

// Counts every log line of runs/<night>.jsonl by its status. Lines that do not parse are skipped.
export function countStatuses(runsDir: string, night: string): Counts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    try {
      const status: unknown = JSON.parse(raw)?.status;
      if (status === 'ok' || status === 'retry' || status === 'fail') counts[status]++;
    } catch {
      // not a JSON line: skip
    }
  }
  return counts;
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    nightCounts: Object.fromEntries(nights.map((n) => [n, countStatuses(config.runsDir, n)])),
  };
}
