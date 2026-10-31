import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function runsWith(files: Record<string, string[]>): string {
  const dir = mkdtempSync(join(tmpdir(), 'digest-routes-'));
  for (const [night, lines] of Object.entries(files)) {
    writeFileSync(join(dir, `${night}.jsonl`), lines.join('\n'));
  }
  return dir;
}

const good = [
  '{"at":"2026-01-01T01:00:00Z","job":"zeta/run","status":"ok","owner":"x"}',
  '{"at":"2026-01-01T02:00:00Z","job":"alpha/run","status":"retry","owner":null,"error":"e1"}',
  '{"at":"2026-01-01T03:00:00Z","job":"mid/run","status":"fail","owner":"y","error":"boom"}',
];

const withBadLine = [good[0], 'this is not json', good[1], good[2]];

function appFor(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('GET /digest/:night', () => {
  it('returns 200 for an existing night', async () => {
    const res = await appFor(runsWith({ '2026-01-01': good })).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await appFor(runsWith({ '2026-01-01': good })).request('/digest/2026-01-02');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty file', async () => {
    const res = await appFor(runsWith({ '2026-01-01': [] })).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still returns 200 and shows the good rows when a line is bad', async () => {
    const res = await appFor(runsWith({ '2026-01-01': withBadLine })).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('alpha/run');
    expect(html).toContain('mid/run');
    expect(html).toContain('zeta/run');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 with night, badLines and rows', async () => {
    const res = await appFor(runsWith({ '2026-01-01': good })).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ night: '2026-01-01', badLines: 0 });
    expect(body.rows).toHaveLength(3);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await appFor(runsWith({ '2026-01-01': good })).request('/api/digest/2026-01-02');
    expect(res.status).toBe(404);
  });

  it('returns rows: [] for an empty file', async () => {
    const res = await appFor(runsWith({ '2026-01-01': [] })).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ night: '2026-01-01', badLines: 0, rows: [] });
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await appFor(runsWith({ '2026-01-01': withBadLine })).request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['alpha/run', 'mid/run', 'zeta/run']);
  });
});

describe('digest page and JSON', () => {
  it('list the same jobs in the same order', async () => {
    const app = appFor(runsWith({ '2026-01-01': withBadLine }));
    const pageRes = await app.request('/digest/2026-01-01');
    const apiRes = await app.request('/api/digest/2026-01-01');
    expect(pageRes.status).toBe(200);
    expect(apiRes.status).toBe(200);
    const html = await pageRes.text();
    const body = await apiRes.json();
    const positions = body.rows.map((r: { job: string }) => html.indexOf(r.job));
    expect(positions.every((p: number) => p >= 0)).toBe(true);
    expect([...positions].sort((a: number, b: number) => a - b)).toEqual(positions);
  });
});
