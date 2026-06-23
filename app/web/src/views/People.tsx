import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

const KINDS = ['founder', 'employee', 'advisor', 'board', 'contractor'];

export function PeopleView() {
  const { t } = useLang();
  const [people, setPeople] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('employee');
  const [cv, setCv] = useState('');
  const [keyPerson, setKeyPerson] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');

  async function load() {
    try {
      setPeople((await api.people()).people);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    if (!name.trim() || !role.trim()) {
      setMsg('Name and role are required.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api.addPerson({
        name,
        role,
        kind,
        cv: cv.trim() || undefined,
        keyPerson,
        startDate: startDate || undefined,
        location: location.trim() || undefined,
      });
      setName('');
      setRole('');
      setCv('');
      setKeyPerson(false);
      setStartDate('');
      setLocation('');
      setMsg('Added. CV summarized into the knowledge base.');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.deletePerson(id);
    await load();
  }

  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 420px' }}>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('People')} ({people.length})</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('The team a buyer underwrites. Each person’s CV is summarized on-device into a bio, highlights, and skills, and linked to the decisions they own. Flag key people so key-person risk is documented.')}
        </p>
        {people.length === 0 && <p className="muted">{t('No team members yet. Add your first on the right.')}</p>}
        {people.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <strong>{p.name}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{p.role}</span>
              <span className="badge">{t(p.kind)}</span>
              {p.keyPerson && <span className="badge live">{t('key person')}</span>}
              <span style={{ flex: 1 }} />
              <button className="tag linkbtn" onClick={() => remove(p.id)}>{t('remove')}</button>
            </div>
            <p style={{ margin: '6px 0', fontSize: 14 }}>{p.summary}</p>
            {p.skills?.length ? (
              <div className="tagrow">{p.skills.map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>{t('Add a team member')}</h3>
        <label>{t('Name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        <label>{t('Role / title')}</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Head of Engineering" />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>{t('Type')}</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>{t('Since')}</label>
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="2021-03" />
          </div>
        </div>
        <label>{t('Location')}</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Berlin, DE" />
        <label>{t('CV / résumé (paste text — summarized on-device)')}</label>
        <textarea rows={8} value={cv} onChange={(e) => setCv(e.target.value)} placeholder={t('Paste the CV or a bio here…')} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={keyPerson} onChange={(e) => setKeyPerson(e.target.checked)} />
          {t('Key person (departure is a material risk)')}
        </label>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="primary" onClick={add} disabled={busy}>{busy ? t('Adding…') : t('Add team member')}</button>
        </div>
        {msg && <div className="notice ok" style={{ marginTop: 10 }}>{msg}</div>}
      </div>
    </div>
  );
}
