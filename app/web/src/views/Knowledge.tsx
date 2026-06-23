import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

export function KnowledgeView() {
  const { t } = useLang();
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
    <div className="layout">
      <div className="panel">
        <h2>{t('Knowledge')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('Drop a link (article, post, video, blog) or paste text. ADAMAS summarizes it locally and saves an entry linked to the source.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input style={{ width: '100%' }} placeholder="Paste a URL (article / post / video / blog)…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <textarea
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="…or paste the text directly (for paywalled pages or a video transcript)."
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

        <div className="list">
          {entries.map((e) => (
            <button key={e.id} className={`card ${selected?.id === e.id ? 'selected' : ''}`} onClick={() => setSelected(e)}>
              <div className="id">{e.id} · {e.type} · {e.date}</div>
              <div className="title">{e.title}</div>
              {e.tags?.length ? <div className="pill-row" style={{ marginTop: 4 }}>{e.tags.slice(0, 4).map((t: string) => <span key={t} className="tag">{t}</span>)}</div> : null}
            </button>
          ))}
          {entries.length === 0 && <p className="muted">{t('No knowledge yet. Add a link or some text above.')}</p>}
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
  );
}
