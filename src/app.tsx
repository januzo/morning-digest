import { Hono } from 'hono';
import { readNight } from './digest/reader.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/api/digest/:night', async (c) => {
    const night = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.json({ error: 'not found' }, 404);
    try {
      const { rows, badLines } = await readNight(config.runsDir, night);
      rows.sort((a, b) => a.job.localeCompare(b.job));
      return c.json({ night, badLines, rows });
    } catch {
      return c.json({ error: 'not found' }, 404);
    }
  });

  return app;
}
