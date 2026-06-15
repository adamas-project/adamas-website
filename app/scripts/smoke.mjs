// End-to-end smoke test for a running ADAMAS instance. Exercises the full
// Definition of Done against a live HTTP server. Usable against a deployed
// staging instance: `node scripts/smoke.mjs http://host:port`.

export async function runSmoke(base, log = () => {}) {
  const results = [];
  // Optional basic-auth credentials (for an authed staging instance).
  const authHeaders = {};
  if (process.env.ADAMAS_BASIC_USER && process.env.ADAMAS_BASIC_PASS) {
    const token = Buffer.from(`${process.env.ADAMAS_BASIC_USER}:${process.env.ADAMAS_BASIC_PASS}`).toString('base64');
    authHeaders.authorization = `Basic ${token}`;
  }
  const assert = (name, cond, detail = '') => {
    results.push({ name, ok: Boolean(cond), detail });
    log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    if (!cond) throw new Error(`Smoke assertion failed: ${name} ${detail}`);
  };
  const get = async (p) => {
    const r = await fetch(base + p, { headers: { ...authHeaders } });
    if (!r.ok) throw new Error(`GET ${p} -> ${r.status}`);
    return r.json();
  };
  const post = async (p, body) => {
    const r = await fetch(base + p, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders },
      body: JSON.stringify(body ?? {}),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };

  // 1. health + browse + filter
  assert('health', (await get('/api/health')).ok === true);
  const meta = await get('/api/meta');
  assert('ledger has >=14 decisions', meta.count >= 14, `count=${meta.count}`);
  const sales = await get('/api/decisions?domain=sales');
  assert('domain filter', sales.decisions.every((d) => d.domain === 'sales') && sales.decisions.length > 0);

  // 2. bi-directional links + graph
  const sal = await get('/api/decisions/SAL-021');
  assert('SAL-021 links to its four decisions', ['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019'].every((x) => sal.neighbors.includes(x)));
  const graph = await get('/api/graph');
  assert('graph nodes == ledger count', graph.nodes.length === meta.count);
  assert('graph has edges', graph.edges.length > 0, `edges=${graph.edges.length}`);

  // 3. role-based visibility
  const member = await get('/api/decisions?role=member');
  const cfo = await get('/api/decisions?role=cfo');
  assert('finance hidden from member', !member.decisions.some((d) => d.domain === 'finance'));
  assert('finance visible to cfo', cfo.decisions.some((d) => d.domain === 'finance'));

  // 4. capture inbox: nothing enters unreviewed; confirm adds exactly one
  await post('/api/inbox/ingest');
  const inbox = await get('/api/inbox');
  assert('Hermes surfaced candidates', inbox.candidates.length > 0, `pending=${inbox.pending}`);
  const before = (await get('/api/meta')).count;
  const confirm = await post(`/api/inbox/${inbox.candidates[0].candidateId}/confirm`);
  assert('confirm created a decision', confirm.status === 201);
  const afterConfirm = (await get('/api/meta')).count;
  assert('ledger grew by exactly one on confirm', afterConfirm === before + 1, `${before}->${afterConfirm}`);

  // 5. asset generation + SRC traceability + whole-ledger
  const binder = (await post('/api/assets/decision-diligence-binder/generate')).json.asset;
  const domains = new Set(binder.sections.map((s) => s.key));
  assert('binder covers all domains', ['hiring', 'sales', 'product', 'finance', 'ops'].every((d) => domains.has(d)));
  assert('every binder section has SRC ids', binder.sections.every((s) => s.src.length > 0));
  assert('binder markdown renders SRC tags', binder.markdown.includes('SRC:'));
  const dossier = (await post('/api/assets/founder-continuity-dossier/generate')).json.asset;
  assert('dossier includes every decision', dossier.header.sourceDecisionCount === afterConfirm);

  // 6. staleness + regeneration
  await fetch(base + '/api/decisions/SAL-021', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...authHeaders },
    body: JSON.stringify({ tradeoffs: ['smoke-test edit'] }),
  });
  const stale = (await get('/api/assets/decision-diligence-binder')).asset;
  assert('asset marked stale after source change', stale.stale === true, `staleSections=${stale.staleSections}`);
  const regen = (await post('/api/assets/decision-diligence-binder/regenerate')).json.asset;
  assert('regeneration clears stale', regen.stale === false);

  // 7. hard data boundary: prepare transmits nothing; approve logs cloud route
  const t0 = (await get('/api/security')).cloudTransmissions;
  const prep = (await post('/api/boundary/prepare', { purpose: 'smoke' })).json.preview;
  assert('prepare shows exact content', Array.isArray(prep.exactContent) && prep.exactContent.length > 0);
  assert('prepare transmits nothing', (await get('/api/security')).cloudTransmissions === t0);
  const declined = (await post(`/api/boundary/${prep.taskId}/decline`)).json;
  assert('decline runs locally', declined.route === 'local');
  assert('decline transmitted nothing', (await get('/api/security')).cloudTransmissions === t0);
  const prep2 = (await post('/api/boundary/prepare', { purpose: 'smoke2' })).json.preview;
  const approved = (await post(`/api/boundary/${prep2.taskId}/approve`)).json;
  assert('approve runs cloud route', approved.route === 'cloud');
  const status = await get('/api/boundary/status');
  assert('cloud transmission logged', status.cloudTransmissions > t0 && status.log.some((e) => e.route === 'cloud'));

  // 8. full export
  const exp = await get('/api/export');
  assert('export is complete', exp.count === (await get('/api/meta')).count && Object.keys(exp.markdown).length === exp.count);

  // 9. pricing: 3 tiers, identical amounts per locale, never a 200 tier
  const en = (await get('/api/pricing?locale=en')).pricing;
  const de = (await get('/api/pricing?locale=de')).pricing;
  const tierMap = (p) => p.tiers.map((t) => t.monthly).join(',');
  assert('three subscription tiers', en.tiers.length === 3);
  assert('tiers are 300/600/1200', tierMap(en) === '300,600,1200');
  assert('locales share amounts, differ only by currency', tierMap(en) === tierMap(de) && en.currency === '$' && de.currency === '€');
  const allAmounts = [...en.tiers.map((t) => t.monthly), ...en.oneTime.map((o) => o.amount), ...de.tiers.map((t) => t.monthly)];
  assert('no $200 tier anywhere', !allAmounts.includes(200));

  return results;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const base = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
  runSmoke(base, (m) => console.log(m))
    .then((r) => {
      console.log(`\nSMOKE PASSED — ${r.length} checks against ${base}`);
    })
    .catch((err) => {
      console.error(`\nSMOKE FAILED: ${err.message}`);
      process.exit(1);
    });
}
