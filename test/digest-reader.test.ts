import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

function nightWith(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'digest-'));
  writeFileSync(join(dir, '2026-01-01.jsonl'), lines.join('\n'));
  return dir;
}

describe('readNight', () => {
  it('reads the 2026-10-28 fixture: 5 jobs, 1 bad line', async () => {
    const { rows, badLines } = await readNight('runs', '2026-10-28');
    expect(rows.map((r) => r.job).sort()).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(badLines).toBe(1);
  });

  it('keeps a row whose owner is null', async () => {
    const dir = nightWith(['{"at":"2026-01-01T01:00:00Z","job":"a","status":"ok","owner":null}']);
    const { rows } = await readNight(dir, '2026-01-01');
    expect(rows).toHaveLength(1);
    expect(rows[0].owner).toBeNull();
  });

  it('gives no rows and 0 bad lines for an empty file', async () => {
    const dir = nightWith([]);
    expect(await readNight(dir, '2026-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts retries from retry lines only; last status and error from the final line', async () => {
    const dir = nightWith([
      '{"at":"2026-01-01T01:00:00Z","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-01-01T02:00:00Z","job":"a","status":"retry","owner":"x","error":"e1"}',
      '{"at":"2026-01-01T03:00:00Z","job":"a","status":"retry","owner":"x","error":"e2"}',
      '{"at":"2026-01-01T04:00:00Z","job":"a","status":"fail","owner":"x","error":"boom"}',
    ]);
    const [row] = (await readNight(dir, '2026-01-01')).rows;
    expect(row).toMatchObject({
      runs: 4,
      retries: 2,
      lastStatus: 'fail',
      lastError: 'boom',
      firstAt: '2026-01-01T01:00:00Z',
      lastAt: '2026-01-01T04:00:00Z',
    });
  });
});
