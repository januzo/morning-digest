import { Hono } from 'hono';
import { readNight } from './digest/reader.js';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
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

  app.get('/digest/:night', async (c) => {
    const night = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.notFound();
    let data;
    try {
      data = await readNight(config.runsDir, night);
    } catch {
      return c.notFound();
    }
    data.rows.sort((a, b) => a.job.localeCompare(b.job));
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage night={night} data={data} />
      </Layout>,
    );
  });

  return app;
}
