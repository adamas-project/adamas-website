import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

const KINDS = ['founder', 'employee', 'advisor', 'board', 'contractor'];
const RENDER_CAP = 60; // keep the DOM light; search to find anyone beyond this.

export function PeopleView() {
  const { t } = useLang();
  const [people, setPeople] = useState<any[]>([]);
  const [dupes, setDupes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');

  // Form state (shared by Add + Edit). `editingId` null = adding.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [kind, setKind] = useState('employee');
  const [cv, setCv] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [keyPerson, setKeyPerson] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');

  async function load() {
    try {
      const r = await api.people();
      setPeople(r.people);
      setDupes(r.duplicates ?? 0);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((p) =>
      [p.name, p.role, p.summary, ...(p.skills ?? [])].join(' ').toLowerCase().includes(needle),
    );
  }, [people, q]);
  const shown = filtered.slice(0, RENDER_CAP);

  function resetForm() {
    setEditingId(null);
    setName('');
    setRole('');
    setKind('employee');
    setCv('');
    setSummary('');
    setSkills('');
    setKeyPerson(false);
    setStartDate('');
    setLocation('');
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setName(p.name ?? '');
    setRole(p.role ?? '');
    setKind(p.kind ?? 'employee');
    setCv('');
    setSummary(p.summary ?? '');
    setSkills((p.skills ?? []).join(', '));
    setKeyPerson(!!p.keyPerson);
    setStartDate(p.startDate ?? '');
    setLocation(p.location ?? '');
    setMsg('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function mergeDuplicates() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.mergePeople();
      setMsg(r.merged ? `${t('Merged duplicates')}: ${r.names.join(', ')}` : t('No duplicates found.'));
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!name.trim() || !role.trim()) {
      setMsg(t('Name and role are required.'));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      if (editingId) {
        await api.updatePerson(editingId, {
          name: name.trim(),
          role: role.trim(),
          kind,
          summary: summary.trim() || undefined,
          skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
          keyPerson,
          startDate: startDate.trim(),
          location: location.trim(),
        });
        setMsg(t('Saved changes.'));
      } else {
        await api.addPerson({
          name: name.trim(),
          role: role.trim(),
          kind,
          cv: cv.trim() || undefined,
          keyPerson,
          startDate: startDate || undefined,
          location: location.trim() || undefined,
        });
        setMsg(t('Added. CV summarized into the knowledge base.'));
      }
      resetForm();
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, who: string) {
    if (typeof window !== 'undefined' && !window.confirm(`${t('Remove this person?')}\n\n${who}`)) return;
    const snapshot = people;
    setPeople((prev) => prev.filter((p) => p.id !== id)); // optimistic
    setMsg('');
    if (editingId === id) resetForm();
    try {
      await api.deletePerson(id);
      await load();
    } catch (e) {
      setPeople(snapshot); // restore on failure
      setMsg(`${t('Could not remove')}: ${(e as Error).message}`);
    }
  }

  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 420px' }}>
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ marginTop: 0 }}>{t('People')} ({people.length})</h2>
          <span style={{ flex: 1 }} />
          {dupes > 0 && (
            <button onClick={mergeDuplicates} disabled={busy} title={t('Combine records that share the same name into one.')}>
              {busy ? t('Merging…') : `${t('Merge duplicates')} (${dupes})`}
            </button>
          )}
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('The team a buyer underwrites. Each person’s CV is summarized on-device into a bio, highlights, and skills, and linked to the decisions they own. Flag key people so key-person risk is documented.')}
        </p>

        <input
          style={{ width: '100%', marginBottom: 10 }}
          placeholder={t('Search people by name, role, or skill…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {people.length === 0 && <p className="muted">{t('No team members yet. Add your first on the right.')}</p>}
        {people.length > 0 && filtered.length === 0 && <p className="muted">{t('No people match your search.')}</p>}
        {filtered.length > RENDER_CAP && (
          <p className="muted" style={{ fontSize: 12 }}>
            {t('Showing')} {RENDER_CAP} {t('of')} {filtered.length} — {t('search to narrow down.')}
          </p>
        )}

        {shown.map((p) => (
          <div key={p.id} className={`card ${editingId === p.id ? 'selected' : ''}`} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <strong>{p.name}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{p.role}</span>
              <span className="badge">{t(p.kind)}</span>
              {p.keyPerson && <span className="badge live">{t('key person')}</span>}
              <span style={{ flex: 1 }} />
              <button className="tag linkbtn" onClick={() => startEdit(p)}>{t('edit')}</button>
              <button className="tag linkbtn" onClick={() => remove(p.id, `${p.name} · ${p.role}`)}>{t('remove')}</button>
            </div>
            <p style={{ margin: '6px 0', fontSize: 14 }}>{p.summary}</p>
            {p.skills?.length ? (
              <div className="tagrow">{p.skills.map((s: string) => <span key={s} className="tag">{s}</span>)}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? t('Edit team member') : t('Add a team member')}</h3>
          <span style={{ flex: 1 }} />
          {editingId && <button onClick={resetForm} disabled={busy}>{t('Cancel')}</button>}
        </div>
        {editingId && <div className="muted mono" style={{ fontSize: 12, marginBottom: 6 }}>{editingId}</div>}
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

        {editingId ? (
          <>
            <label>{t('Bio / summary')}</label>
            <textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t('Short bio shown on the card.')} />
            <label>{t('Skills (comma-separated)')}</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="plc, cad, sales" />
          </>
        ) : (
          <>
            <label>{t('CV / résumé (paste text — summarized on-device)')}</label>
            <textarea rows={8} value={cv} onChange={(e) => setCv(e.target.value)} placeholder={t('Paste the CV or a bio here…')} />
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={keyPerson} onChange={(e) => setKeyPerson(e.target.checked)} />
          {t('Key person (departure is a material risk)')}
        </label>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="primary" onClick={save} disabled={busy}>
            {busy ? t('Saving…') : editingId ? t('Save changes') : t('Add team member')}
          </button>
        </div>
        {msg && <div className="notice ok" style={{ marginTop: 10 }}>{msg}</div>}
      </div>
    </div>
  );
}
