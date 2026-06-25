import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

export function KnowledgeView() {
  const { t } = useLang();
  const [section, setSection] = useState<'entries' | 'glossary'>('entries');
  const [entries, setEntries] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const r = await api.knowledge({ q: q || undefined, tag: tag || undefined });
      setEntries(r.entries);
      setTags(r.tags);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [q, tag]);

  async function add() {
    if (!url.trim() && !text.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api.addKnowledge({
        url: url.trim() || undefined,
        text: text.trim() || undefined,
        title: title.trim() || undefined,
        tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setMsg(`Saved ${r.entry.id}: ${r.entry.title}`);
      setUrl('');
      setText('');
      setTitle('');
      setNewTags('');
      setSelected(r.entry);
      // Show it immediately (like People), then refresh from the server.
      setEntries((prev) => [r.entry, ...prev.filter((e) => e.id !== r.entry.id)]);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(`Remove ${id} from your knowledge base?`)) return;
    await api.deleteKnowledge(id);
    if (selected?.id === id) setSelected(null);
    await load();
  }

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 10 }}>
        <button className={section === 'entries' ? 'primary' : ''} onClick={() => setSection('entries')}>{t('Entries')}</button>
        <button className={section === 'glossary' ? 'primary' : ''} onClick={() => setSection('glossary')}>{t('Glossary')}</button>
      </div>
      {section === 'glossary' ? <GlossaryPanel /> : (
      <div className="layout">
      <div className="panel">
        <h2>{t('Knowledge')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('Drop a link (article, post, video, blog) or paste text. ADAMAS summarizes it locally and saves an entry linked to the source.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input style={{ width: '100%' }} placeholder={t('Paste a URL (article / post / video / blog)…')} value={url} onChange={(e) => setUrl(e.target.value)} />
          <textarea
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder={t('…or paste the text directly (for paywalled pages or a video transcript).')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="toolbar" style={{ margin: 0 }}>
            <input style={{ flex: 1, minWidth: 160 }} placeholder={t('Title (optional)')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <input style={{ flex: 1, minWidth: 160 }} placeholder={t('Tags (comma-separated)')} value={newTags} onChange={(e) => setNewTags(e.target.value)} />
            <button className="primary" onClick={add} disabled={busy || (!url.trim() && !text.trim())}>
              {busy ? t('Summarizing…') : t('Summarize & save')}
            </button>
          </div>
          {msg && <div className="notice ok">{msg}</div>}
        </div>

        <div className="toolbar" style={{ marginTop: 16 }}>
          <input style={{ flex: 1 }} placeholder={t('Search knowledge…')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="">{t('all tags')}</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {entries.length === 0 && <p className="muted">{t('No knowledge yet. Add a link or some text above.')}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((e) => (
            <button key={e.id} className={`card ${selected?.id === e.id ? 'selected' : ''}`} onClick={() => setSelected(e)}>
              <div className="id">{e.id} · {e.type} · {e.date}</div>
              <div className="title">{e.title}</div>
              {e.tags?.length ? <div className="pill-row" style={{ marginTop: 4 }}>{e.tags.slice(0, 4).map((tg: string) => <span key={tg} className="tag">{tg}</span>)}</div> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {selected ? (
          <div>
            <div className="id mono">{selected.id} · {selected.type}</div>
            <h2 style={{ marginTop: 4 }}>{selected.title}</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              Added {selected.date}{selected.author ? ` · ${selected.author}` : ''}
            </div>
            <div style={{ margin: '8px 0' }}>
              {selected.source && selected.source !== 'manual' ? (
                <a href={selected.source} target="_blank" rel="noreferrer">{selected.source}</a>
              ) : (
                <span className="muted">manual entry</span>
              )}
            </div>

            <div className="section-title">{t('Summary')}</div>
            <p>{selected.summary}</p>

            {selected.takeaways?.length ? (
              <>
                <div className="section-title">{t('Key takeaways')}</div>
                <ul>{selected.takeaways.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </>
            ) : null}

            {selected.tags?.length ? (
              <>
                <div className="section-title">{t('Tags')}</div>
                <div className="pill-row">{selected.tags.map((tg: string) => <span key={tg} className="tag">{tg}</span>)}</div>
              </>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <button className="ghost" onClick={() => remove(selected.id)}>{t('Remove')}</button>
            </div>
          </div>
        ) : (
          <p className="muted">{t('Select an entry, or add a link/text to build your knowledge base.')}</p>
        )}
      </div>
      </div>
      )}
    </div>
  );
}

function GlossaryPanel() {
  const { t } = useLang();
  const [terms, setTerms] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [newTags, setNewTags] = useState('');
  const [aliases, setAliases] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const r = await api.glossary({ q: q || undefined, tag: tag || undefined });
      setTerms(r.terms);
      setTags(r.tags);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [q, tag]);

  async function add() {
    if (!term.trim() || !definition.trim()) {
      setMsg(t('Term and definition are required.'));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const r = await api.addGlossary({
        term: term.trim(),
        definition: definition.trim(),
        tags: newTags.split(',').map((s) => s.trim()).filter(Boolean),
        aliases: aliases.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setTerm('');
      setDefinition('');
      setNewTags('');
      setAliases('');
      setTerms((prev) => [r.entry, ...prev.filter((e) => e.id !== r.entry.id)].sort((a, b) => a.term.localeCompare(b.term)));
      setMsg(`${t('Saved')} ${r.entry.term}`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.deleteGlossary(id);
    await load();
  }

  return (
    <div className="layout">
      <div className="panel">
        <h2>{t('Glossary')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('Your company’s terms, defined in your own words — the source for employee handbooks and new-joiner training.')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder={t('Term')} value={term} onChange={(e) => setTerm(e.target.value)} />
          <textarea rows={3} style={{ resize: 'vertical' }} placeholder={t('Definition (in your company’s context)')} value={definition} onChange={(e) => setDefinition(e.target.value)} />
          <div className="toolbar" style={{ margin: 0 }}>
            <input style={{ flex: 1, minWidth: 140 }} placeholder={t('Aliases (comma-separated)')} value={aliases} onChange={(e) => setAliases(e.target.value)} />
            <input style={{ flex: 1, minWidth: 140 }} placeholder={t('Tags (comma-separated)')} value={newTags} onChange={(e) => setNewTags(e.target.value)} />
            <button className="primary" onClick={add} disabled={busy || !term.trim() || !definition.trim()}>{busy ? t('Saving…') : t('Add term')}</button>
          </div>
          {msg && <div className="notice ok">{msg}</div>}
        </div>
        <div className="toolbar" style={{ marginTop: 16 }}>
          <input style={{ flex: 1 }} placeholder={t('Search glossary…')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="">{t('all tags')}</option>
            {tags.map((tg) => <option key={tg} value={tg}>{tg}</option>)}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">{t('Terms')} {terms.length > 0 ? `(${terms.length})` : ''}</div>
        {terms.length === 0 && <p className="muted">{t('No terms yet. Add your first on the left.')}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {terms.map((g) => (
            <div key={g.id} className="card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong>{g.term}</strong>
                {g.aliases?.length ? <span className="muted" style={{ fontSize: 12 }}>({g.aliases.join(', ')})</span> : null}
                <span style={{ flex: 1 }} />
                <button className="tag linkbtn" onClick={() => remove(g.id)}>{t('remove')}</button>
              </div>
              <p style={{ margin: '6px 0', fontSize: 14 }}>{g.definition}</p>
              {g.tags?.length ? <div className="pill-row">{g.tags.map((tg: string) => <span key={tg} className="tag">{tg}</span>)}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
