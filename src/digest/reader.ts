import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunStatus } from './types.js';

const STATUSES: RunStatus[] = ['ok', 'retry', 'fail'];

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error?: string };

// A line is good only if it parses and has the fields we rely on.
function parseLine(text: string): Line | null {
  try {
    const o = JSON.parse(text);
    if (typeof o?.at !== 'string' || typeof o?.job !== 'string') return null;
    if (!STATUSES.includes(o.status)) return null;
    return { at: o.at, job: o.job, status: o.status, owner: o.owner ?? null, error: o.error };
  } catch {
    return null;
  }
}

export const readNight: ReadNight = async (runsDir, night) => {
  const text = await readFile(join(runsDir, `${night}.jsonl`), 'utf8');
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    const row = byJob.get(line.job);
    if (!row) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        firstAt: line.at,
        lastAt: line.at,
      });
    } else {
      row.runs++;
      if (line.status === 'retry') row.retries++;
      row.lastStatus = line.status;
      row.lastError = line.error;
      row.lastAt = line.at;
      row.owner = line.owner ?? row.owner;
    }
  }

  return { rows: [...byJob.values()], badLines };
};
