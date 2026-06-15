import { useEffect, useState } from 'react';
import { api } from '../api';

export function BoundaryView({ onChanged }: { onChanged: () => void }) {
  const [preview, setPreview] = useState<any | null>(null);
  const [status, setStatus] = useState<any | null>(null);
  const [security, setSecurity] = useState<any | null>(null);
  const [result, setResult] = useState<string>('');
  const [passphrase, setPassphrase] = useState('');
  const [backupMsg, setBackupMsg] = useState('');

  async function loadStatus() {
    setStatus(await api.boundaryStatus());
    setSecurity(await api.security());
  }
  useEffect(() => {
    void loadStatus();
  }, []);

  async function prepare() {
    setResult('');
    const r = await api.prepare('Evaluate local sources with the cloud model');
    setPreview(r.preview);
  }
  async function approve() {
    const r = await api.approve(preview.taskId);
    setResult(`Route: ${r.route.toUpperCase()} — content transmitted, ${r.added.length} candidate(s) returned to the local vault.`);
    setPreview(null);
    await loadStatus();
    onChanged();
  }
  async function decline() {
    const r = await api.decline(preview.taskId);
    setResult(`Route: ${r.route.toUpperCase()} — ran on the local machine, nothing transmitted. ${r.added.length} candidate(s) added.`);
    setPreview(null);
    await loadStatus();
    onChanged();
  }
  async function backup() {
    setBackupMsg('');
    try {
      const r = await api.backup(passphrase);
      setBackupMsg(`Encrypted backup written: ${r.file}`);
    } catch (e) {
      setBackupMsg((e as Error).message);
    }
  }

  return (
    <div className="layout">
      <div className="panel">
        <h2>Hybrid-cloud approval (per task)</h2>
        <p className="muted">
          ADAMAS is local-first by default — nothing leaves the machine. A cloud route is opt-in per task: you see exactly
          what would be transmitted before anything is sent.
        </p>
        {!preview && <button className="primary" onClick={prepare}>Prepare a cloud evaluation task…</button>}
        {result && <div className="notice ok" style={{ marginTop: 10 }}>{result}</div>}

        {preview && (
          <div className="notice warn" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>This is exactly what would be transmitted</h3>
            <p className="muted">
              {preview.documents.length} document(s) · {preview.totalChars} characters → cloud provider
            </p>
            <pre className="doc" style={{ maxHeight: 260 }}>{preview.exactContent.join('\n\n— — —\n\n')}</pre>
            <div style={{ marginTop: 10 }}>
              <button className="primary" onClick={approve}>Approve & send to cloud</button>{' '}
              <button onClick={decline}>Decline — run locally instead</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Security & data ownership</h2>
        {security && (
          <dl className="kv">
            <dt>Local-first</dt><dd className="ok">{String(security.localFirst)}</dd>
            <dt>External telemetry</dt><dd className="ok">{String(security.externalTelemetry)}</dd>
            <dt>Tracking cookies</dt><dd className="ok">{String(security.trackingCookies)}</dd>
            <dt>Restricted domains</dt><dd>{security.restrictedDomains.join(', ')}</dd>
            <dt>Cloud transmissions</dt><dd>{security.cloudTransmissions}</dd>
          </dl>
        )}

        <div className="section-title">Encrypted local backup</div>
        <div className="toolbar">
          <input
            type="password"
            placeholder="passphrase (min 8 chars)"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button onClick={backup} disabled={passphrase.length < 8}>Create backup</button>
          <a href="/api/export" download>Export vault (MD+JSON)</a>
        </div>
        {backupMsg && <p className="muted">{backupMsg}</p>}

        <div className="section-title">Route log (recorded in the vault)</div>
        <table>
          <thead><tr><th>route</th><th>purpose</th><th>approved</th><th>chars sent</th><th>when</th></tr></thead>
          <tbody>
            {(status?.log ?? []).slice().reverse().map((e: any, i: number) => (
              <tr key={i}>
                <td className={e.route === 'cloud' ? 'err' : 'ok'}>{e.route}</td>
                <td>{e.purpose}</td>
                <td>{String(e.approved)}</td>
                <td>{e.transmittedChars}</td>
                <td>{new Date(e.at).toLocaleTimeString()}</td>
              </tr>
            ))}
            {(!status?.log || status.log.length === 0) && <tr><td colSpan={5} className="muted">No routes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
