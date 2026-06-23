import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

export function BoundaryView({ onChanged }: { onChanged: () => void }) {
  const { t } = useLang();
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
        <h2>{t('Hybrid-cloud approval (per task)')}</h2>
        <p className="muted">
          {t('ADAMAS is local-first by default — nothing leaves the machine. A cloud route is opt-in per task: you see exactly what would be transmitted before anything is sent.')}
        </p>
        {!preview && <button className="primary" onClick={prepare}>{t('Prepare a cloud evaluation task…')}</button>}
        {result && <div className="notice ok" style={{ marginTop: 10 }}>{result}</div>}

        {preview && (
          <div className="notice warn" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>{t('This is exactly what would be transmitted')}</h3>
            <p className="muted">
              {preview.documents.length} document(s) · {preview.totalChars} characters → cloud provider
            </p>
            <pre className="doc" style={{ maxHeight: 260 }}>{preview.exactContent.join('\n\n— — —\n\n')}</pre>
            <div style={{ marginTop: 10 }}>
              <button className="primary" onClick={approve}>{t('Approve & send to cloud')}</button>{' '}
              <button onClick={decline}>{t('Decline — run locally instead')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>{t('Security & data ownership')}</h2>
        {security && (
          <dl className="kv">
            <dt>{t('Local-first')}</dt><dd className="ok">{String(security.localFirst)}</dd>
            <dt>{t('External telemetry')}</dt><dd className="ok">{String(security.externalTelemetry)}</dd>
            <dt>{t('Tracking cookies')}</dt><dd className="ok">{String(security.trackingCookies)}</dd>
            <dt>{t('Restricted domains')}</dt><dd>{security.restrictedDomains.join(', ')}</dd>
            <dt>{t('Cloud transmissions')}</dt><dd>{security.cloudTransmissions}</dd>
          </dl>
        )}

        <div className="section-title">{t('Encrypted local backup')}</div>
        <div className="toolbar">
          <input
            type="password"
            placeholder={t('passphrase (min 8 chars)')}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button onClick={backup} disabled={passphrase.length < 8}>{t('Create backup')}</button>
          <a href="/api/export" download>{t('Export vault (MD+JSON)')}</a>
        </div>
        {backupMsg && <p className="muted">{backupMsg}</p>}

        <div className="section-title">{t('Route log (recorded in the vault)')}</div>
        <table>
          <thead><tr><th>{t('route')}</th><th>{t('purpose')}</th><th>{t('approved')}</th><th>{t('chars sent')}</th><th>{t('when')}</th></tr></thead>
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
            {(!status?.log || status.log.length === 0) && <tr><td colSpan={5} className="muted">{t('No routes yet.')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
