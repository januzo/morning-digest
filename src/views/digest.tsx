import type { Night } from '../digest/types.js';

const dash = <span class="mute">—</span>;

export function DigestPage({ night, data }: { night: string; data: Night }) {
  return (
    <>
      <h1>digest {night}</h1>
      <p class="mute">bad lines: {data.badLines}</p>
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th>
              <th>last status</th><th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr class={r.retries >= 3 || r.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries >= 3 ? `${r.retries} (!)` : r.retries}</td>
                <td>{r.lastStatus === 'fail' ? 'fail (!)' : r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
