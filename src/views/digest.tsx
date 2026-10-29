import type { DigestRow } from '../digest/types.js';

export function DigestView({ night, rows }: { night: string; rows: DigestRow[] }) {
  if (rows.length === 0) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }
  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last</th><th>error</th><th>window</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr>
              <td>{r.job}</td>
              <td>{r.owner ?? '—'}</td>
              <td>{r.runs}</td>
              <td>{r.retries >= 3 ? <span class="warn">{r.retries}</span> : r.retries}</td>
              <td>{r.lastStatus === 'fail' ? <span class="warn">{r.lastStatus}</span> : r.lastStatus}</td>
              <td>{r.lastError ?? '—'}</td>
              <td>{r.firstAt} → {r.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
