/* ADAMAS interactive decision-ledger demo.
   Client-side only. All entries are SAMPLE DATA — illustrative, anonymized,
   modeled on a fictional industrial-automation integrator (~$3M revenue, 18 people).
   No real client data appears here. */
(function () {
  'use strict';

  var UI = {
    en: {
      all: 'All domains',
      context: 'Context',
      decision: 'Decision',
      owner: 'Decided by',
      tradeoffs: 'Trade-offs accepted',
      linked: 'Linked decisions',
      close: 'Back to ledger',
      sample: 'Sample data — illustrative',
      hint: 'Click any decision to see its context, trade-offs, and links.',
      stats: function (n, l) { return n + ' decisions · 5 domains · ' + l + ' bi-directional links'; },
      domains: { Hiring: 'Hiring', Sales: 'Sales', Product: 'Product', Finance: 'Finance', Ops: 'Ops' }
    },
    de: {
      all: 'Alle Bereiche',
      context: 'Kontext',
      decision: 'Entscheidung',
      owner: 'Entschieden von',
      tradeoffs: 'Akzeptierte Trade-offs',
      linked: 'Verknüpfte Entscheidungen',
      close: 'Zurück zum Ledger',
      sample: 'Beispieldaten — illustrativ',
      hint: 'Klicken Sie auf eine Entscheidung, um Kontext, Trade-offs und Verknüpfungen zu sehen.',
      stats: function (n, l) { return n + ' Entscheidungen · 5 Bereiche · ' + l + ' bidirektionale Verknüpfungen'; },
      domains: { Hiring: 'Personal', Sales: 'Vertrieb', Product: 'Produkt', Finance: 'Finanzen', Ops: 'Betrieb' }
    }
  };

  var DATA = {
    en: [
      { id: 'OPS-005', domain: 'Ops', date: '2024-02-12', title: 'Hold a weekly 30-minute decision review',
        context: 'Decisions were being made in hallway conversations and Slack threads, then forgotten. Three commitments made to clients in one month never reached the project team.',
        decision: 'Every Friday, 30 minutes: log the week’s significant decisions with their reasoning. No meeting minutes — decisions only.',
        owner: 'Founder',
        tradeoffs: ['Costs ~10 founder-hours per quarter', 'Some small decisions still slip through', 'Team initially saw it as bureaucracy — adoption took ~6 weeks'],
        links: ['HIR-009', 'OPS-013'] },
      { id: 'FIN-007', domain: 'Finance', date: '2024-03-04', title: 'Buy test equipment instead of leasing',
        context: 'Commissioning projects kept renting the same signal analyzers. Rental spend hit $2,100/month across projects, and availability delayed two jobs.',
        decision: 'Buy the three most-rented instruments outright (~$38k capex); keep leasing anything used fewer than 4 weeks per year.',
        owner: 'Founder + external accountant',
        tradeoffs: ['Ties up cash in a slow quarter', 'Calibration and maintenance are now our problem', 'Equipment could be obsolete in 5 years'],
        links: ['FIN-016'] },
      { id: 'PRD-008', domain: 'Product', date: '2024-04-22', title: 'Sunset the legacy SCADA maintenance offering',
        context: 'Legacy SCADA maintenance was 9% of revenue but 30% of unplanned interruptions, and only two engineers could service it — both senior.',
        decision: 'Stop selling new SCADA maintenance contracts; serve existing contracts until expiry; offer a paid migration path.',
        owner: 'Founder, after team review',
        tradeoffs: ['Walks away from ~$270k/yr of renewals over 3 years', 'Two long-standing clients pushed back hard', 'Senior engineers freed for higher-margin work'],
        links: ['SAL-011', 'HIR-014'] },
      { id: 'HIR-009', domain: 'Hiring', date: '2024-05-13', title: 'Build onboarding from the decision ledger, not shadowing',
        context: 'New hires learned by shadowing seniors for 3–4 months. The two seniors carrying the load were also the bottleneck on every project.',
        decision: 'New hires start with a structured reading path through the ledger: the 25 decisions that define how we quote, build, and hand over.',
        owner: 'Ops lead',
        tradeoffs: ['Writing the reading path cost ~2 weeks once', 'Ledger had gaps that had to be backfilled first', 'Shadowing still needed for hands-on skills — reduced, not eliminated'],
        links: ['OPS-005', 'OPS-013', 'HIR-018'] },
      { id: 'SAL-011', domain: 'Sales', date: '2024-06-10', title: 'Fixed-scope paid discovery before any fixed-price quote',
        context: 'Two fixed-price projects overran by 40%+ because scope was quoted from a single client meeting. Sales wanted speed; engineering wanted certainty.',
        decision: 'No fixed-price quote without a paid discovery phase (2–5 days, standard rate). Quote-from-meeting allowed only for time-and-materials work.',
        owner: 'Founder + head of sales',
        tradeoffs: ['Longer sales cycle — some prospects walk', 'Discovery fee is a hurdle for smaller deals', 'Quotes after discovery have been within 10% of actuals'],
        links: ['PRD-008', 'FIN-022', 'SAL-017'] },
      { id: 'OPS-013', domain: 'Ops', date: '2024-08-19', title: 'Mandatory handover protocol after the M. departure',
        context: 'A senior engineer of 9 years left with 4 weeks’ notice. Client history, undocumented workarounds, and two supplier relationships lived only in his head.',
        decision: 'Every role gets a living handover file generated from the ledger: owned decisions, open trade-offs, key contacts. Updated quarterly, not at resignation.',
        owner: 'Founder',
        tradeoffs: ['Quarterly maintenance discipline required', 'Some knowledge (client rapport) doesn’t transfer on paper', 'Felt morbid to the team at first — framing mattered'],
        links: ['OPS-005', 'HIR-009'] },
      { id: 'HIR-014', domain: 'Hiring', date: '2024-09-02', title: 'One senior PLC engineer over two juniors',
        context: 'Budget allowed either one senior hire or two juniors. The pipeline was full of Siemens commissioning work; mentoring capacity was already maxed.',
        decision: 'Hire the senior engineer at the top of the band, even though it eats the full hiring budget for the year.',
        owner: 'Founder + ops lead',
        tradeoffs: ['No bench depth added — headcount risk stays', 'Salary anchor for future senior hires', 'Productive in week 2 instead of month 4'],
        links: ['PRD-019', 'PRD-008'] },
      { id: 'FIN-016', domain: 'Finance', date: '2024-10-07', title: 'Milestone billing replaces monthly hourly invoicing',
        context: 'Hourly invoicing created end-of-project disputes and 60+ day receivables. Cash dipped dangerously during two parallel builds.',
        decision: 'All projects >$25k bill on milestones: 30% on order, then per acceptance gate. Hourly remains for service contracts only.',
        owner: 'Founder + external accountant',
        tradeoffs: ['Milestone definitions must be airtight — more contract work upfront', 'One client negotiated 20/40/40 as an exception', 'DSO dropped from 64 to 31 days'],
        links: ['FIN-007', 'SAL-021', 'FIN-022'] },
      { id: 'SAL-017', domain: 'Sales', date: '2024-11-11', title: 'Raise day rates 12% for new clients only',
        context: 'Utilization had been >90% for two quarters and the backlog was 11 weeks. Rates hadn’t moved in three years; market comparables were 10–18% higher.',
        decision: 'New-client rates up 12% from January. Existing clients keep current rates for 12 months, then +6%.',
        owner: 'Head of sales',
        tradeoffs: ['Two price-sensitive prospects dropped out immediately', 'Grandfathering splits the rate card — admin overhead', 'Backlog normalized to 6 weeks at higher margin'],
        links: ['SAL-011', 'SAL-021'] },
      { id: 'HIR-018', domain: 'Hiring', date: '2025-01-20', title: 'Promote internal lead to PM instead of hiring externally',
        context: 'Project volume justified a dedicated PM. External candidates wanted $15–20k more and knew neither our clients nor our commissioning protocol.',
        decision: 'Promote the senior automation engineer who had informally coordinated the last three projects; backfill her engineering seat instead.',
        owner: 'Founder',
        tradeoffs: ['Lose senior engineering capacity for ~2 quarters', 'First-time PM — needs coaching and air cover', 'Internal promotion signal worth more than the salary saved'],
        links: ['HIR-009', 'HIR-014'] },
      { id: 'PRD-019', domain: 'Product', date: '2025-02-17', title: 'Standardize on TIA Portal as the primary platform',
        context: 'Projects split across three PLC ecosystems. Every context switch cost setup time, and library reuse across projects was near zero.',
        decision: 'Siemens TIA Portal becomes the default for all new projects; other platforms only when the client’s installed base demands it (priced accordingly).',
        owner: 'Engineering team, founder ratified',
        tradeoffs: ['Turns away some Allen-Bradley-first work', 'Deepens dependency on one vendor’s roadmap', 'Internal library reuse jumped — quoted hours down ~8% on comparable jobs'],
        links: ['HIR-014', 'SAL-021'] },
      { id: 'OPS-020', domain: 'Ops', date: '2025-03-10', title: 'Two-person rule for all commissioning visits',
        context: 'A solo commissioning visit went wrong: an undocumented machine state cost a full extra day on site and nearly caused a safety incident.',
        decision: 'No solo commissioning. Every site visit is two people minimum — one may be junior. Priced into every quote from now on.',
        owner: 'Ops lead, founder ratified',
        tradeoffs: ['Raises delivery cost ~15% on small jobs', 'Makes us pricier than one-man-band competitors', 'Junior engineers now learn on real sites — feeds the hiring pipeline'],
        links: ['SAL-021', 'FIN-022'] },
      { id: 'SAL-021', domain: 'Sales', date: '2025-04-14', title: 'Decline the automotive OEM frame contract',
        context: 'A large OEM offered a frame contract worth ~35% of annual revenue — at rates 20% below card, with penalty clauses and 90-day payment terms.',
        decision: 'Decline. The volume would crowd out three existing A-clients and concentrate revenue risk in one buyer with the weakest terms.',
        owner: 'Founder, against head of sales’ initial recommendation',
        tradeoffs: ['Walks away from guaranteed volume in a soft quarter', 'Possible door closed at that OEM for years', 'Kept pricing power and client mix intact — see SAL-017'],
        links: ['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019'] },
      { id: 'FIN-022', domain: 'Finance', date: '2025-05-19', title: '15% contingency line on every fixed-price project',
        context: 'A rework incident (wrong sensor spec from the client, caught late) cost $42k unbudgeted. The margin for the whole quarter went with it.',
        decision: 'Every fixed-price quote carries a visible 15% contingency line. If unused, 5% is rebated at acceptance — clients see honesty, we keep a buffer.',
        owner: 'Founder + external accountant',
        tradeoffs: ['Headline price looks higher in competitive bids', 'Rebate mechanism adds invoicing complexity', 'Two clients explicitly praised the transparency'],
        links: ['SAL-011', 'FIN-016', 'OPS-020'] }
    ],
    de: [
      { id: 'OPS-005', domain: 'Ops', date: '2024-02-12', title: 'Wöchentliches 30-Minuten-Decision-Review einführen',
        context: 'Entscheidungen fielen in Flurgesprächen und Slack-Threads — und wurden vergessen. Drei Kundenzusagen aus einem Monat erreichten das Projektteam nie.',
        decision: 'Jeden Freitag 30 Minuten: Die wesentlichen Entscheidungen der Woche werden mit Begründung erfasst. Keine Protokolle — nur Entscheidungen.',
        owner: 'Gründer',
        tradeoffs: ['Kostet ca. 10 Gründerstunden pro Quartal', 'Kleinere Entscheidungen rutschen weiter durch', 'Team sah es anfangs als Bürokratie — Akzeptanz dauerte ca. 6 Wochen'],
        links: ['HIR-009', 'OPS-013'] },
      { id: 'FIN-007', domain: 'Finance', date: '2024-03-04', title: 'Messtechnik kaufen statt leasen',
        context: 'Inbetriebnahme-Projekte mieteten immer wieder dieselben Signalanalysatoren. Die Mietkosten erreichten 2.100 $/Monat, und Verfügbarkeit verzögerte zwei Aufträge.',
        decision: 'Die drei meistgemieteten Geräte kaufen (ca. 38 k$ Capex); alles, was weniger als 4 Wochen pro Jahr genutzt wird, weiter leasen.',
        owner: 'Gründer + externer Steuerberater',
        tradeoffs: ['Bindet Liquidität in einem schwachen Quartal', 'Kalibrierung und Wartung sind jetzt unser Problem', 'Geräte können in 5 Jahren veraltet sein'],
        links: ['FIN-016'] },
      { id: 'PRD-008', domain: 'Product', date: '2024-04-22', title: 'Legacy-SCADA-Wartungsgeschäft auslaufen lassen',
        context: 'Die Legacy-SCADA-Wartung brachte 9 % des Umsatzes, verursachte aber 30 % der ungeplanten Unterbrechungen — und nur zwei (Senior-)Ingenieure konnten sie leisten.',
        decision: 'Keine neuen SCADA-Wartungsverträge mehr; Bestandsverträge bis zum Auslaufen bedienen; bezahlten Migrationspfad anbieten.',
        owner: 'Gründer, nach Team-Review',
        tradeoffs: ['Verzichtet über 3 Jahre auf ca. 270 k$ Verlängerungsumsatz', 'Zwei langjährige Kunden protestierten deutlich', 'Senior-Ingenieure frei für margenstärkere Arbeit'],
        links: ['SAL-011', 'HIR-014'] },
      { id: 'HIR-009', domain: 'Hiring', date: '2024-05-13', title: 'Onboarding aus dem Ledger statt Shadowing',
        context: 'Neue Mitarbeiter lernten 3–4 Monate durch Mitlaufen bei Senioren. Genau diese zwei Senioren waren zugleich der Engpass in jedem Projekt.',
        decision: 'Neue Mitarbeiter starten mit einem strukturierten Lesepfad durch das Ledger: die 25 Entscheidungen, die definieren, wie wir kalkulieren, bauen und übergeben.',
        owner: 'Ops-Lead',
        tradeoffs: ['Lesepfad zu erstellen kostete einmalig ca. 2 Wochen', 'Lücken im Ledger mussten zuerst nachgetragen werden', 'Shadowing für Praxisfertigkeiten weiter nötig — reduziert, nicht ersetzt'],
        links: ['OPS-005', 'OPS-013', 'HIR-018'] },
      { id: 'SAL-011', domain: 'Sales', date: '2024-06-10', title: 'Bezahlte Discovery-Phase vor jedem Festpreisangebot',
        context: 'Zwei Festpreisprojekte liefen um über 40 % aus dem Ruder, weil der Umfang nach einem einzigen Kundentermin kalkuliert wurde. Vertrieb wollte Tempo, Technik Sicherheit.',
        decision: 'Kein Festpreisangebot ohne bezahlte Discovery (2–5 Tage, Standardsatz). Angebot direkt nach Termin nur noch für Dienstleistung nach Aufwand.',
        owner: 'Gründer + Vertriebsleitung',
        tradeoffs: ['Längerer Vertriebszyklus — manche Interessenten springen ab', 'Discovery-Gebühr ist eine Hürde bei kleineren Deals', 'Angebote nach Discovery lagen binnen 10 % der Ist-Kosten'],
        links: ['PRD-008', 'FIN-022', 'SAL-017'] },
      { id: 'OPS-013', domain: 'Ops', date: '2024-08-19', title: 'Verbindliches Übergabeprotokoll nach dem Abgang von M.',
        context: 'Ein Senior-Ingenieur ging nach 9 Jahren mit 4 Wochen Kündigungsfrist. Kundenhistorie, undokumentierte Workarounds und zwei Lieferantenbeziehungen existierten nur in seinem Kopf.',
        decision: 'Jede Rolle erhält eine lebende Übergabedatei aus dem Ledger: verantwortete Entscheidungen, offene Trade-offs, Schlüsselkontakte. Quartalsweise aktualisiert — nicht erst bei Kündigung.',
        owner: 'Gründer',
        tradeoffs: ['Erfordert quartalsweise Pflegedisziplin', 'Manches Wissen (Kundenbeziehung) überträgt sich nicht auf Papier', 'Wirkte auf das Team zunächst makaber — das Framing war entscheidend'],
        links: ['OPS-005', 'HIR-009'] },
      { id: 'HIR-014', domain: 'Hiring', date: '2024-09-02', title: 'Ein Senior-SPS-Ingenieur statt zwei Junioren',
        context: 'Das Budget erlaubte entweder einen Senior oder zwei Junioren. Die Pipeline war voller Siemens-Inbetriebnahmen; Mentoring-Kapazität war bereits ausgereizt.',
        decision: 'Den Senior am oberen Ende des Bandes einstellen, auch wenn das das gesamte Jahresbudget für Einstellungen verbraucht.',
        owner: 'Gründer + Ops-Lead',
        tradeoffs: ['Keine Bankbreite aufgebaut — Personalrisiko bleibt', 'Gehaltsanker für künftige Senior-Einstellungen', 'Produktiv in Woche 2 statt Monat 4'],
        links: ['PRD-019', 'PRD-008'] },
      { id: 'FIN-016', domain: 'Finance', date: '2024-10-07', title: 'Meilenstein-Abrechnung statt monatlicher Stundenabrechnung',
        context: 'Stundenabrechnung erzeugte Streit am Projektende und Forderungslaufzeiten von 60+ Tagen. Während zweier paralleler Projekte wurde die Liquidität gefährlich knapp.',
        decision: 'Alle Projekte >25 k$ laufen über Meilensteine: 30 % bei Auftrag, dann je Abnahme-Gate. Stundenabrechnung nur noch für Serviceverträge.',
        owner: 'Gründer + externer Steuerberater',
        tradeoffs: ['Meilenstein-Definitionen müssen wasserdicht sein — mehr Vertragsarbeit vorab', 'Ein Kunde verhandelte 20/40/40 als Ausnahme', 'Forderungslaufzeit sank von 64 auf 31 Tage'],
        links: ['FIN-007', 'SAL-021', 'FIN-022'] },
      { id: 'SAL-017', domain: 'Sales', date: '2024-11-11', title: 'Tagessätze für Neukunden um 12 % erhöhen',
        context: 'Auslastung lag zwei Quartale über 90 %, der Auftragsbestand bei 11 Wochen. Die Sätze waren seit drei Jahren unverändert; Marktvergleiche lagen 10–18 % höher.',
        decision: 'Neukundensätze ab Januar +12 %. Bestandskunden behalten 12 Monate die aktuellen Sätze, danach +6 %.',
        owner: 'Vertriebsleitung',
        tradeoffs: ['Zwei preissensible Interessenten sprangen sofort ab', 'Bestandsschutz spaltet die Preisliste — Verwaltungsaufwand', 'Auftragsbestand normalisierte sich bei höherer Marge auf 6 Wochen'],
        links: ['SAL-011', 'SAL-021'] },
      { id: 'HIR-018', domain: 'Hiring', date: '2025-01-20', title: 'Interne Beförderung zur PM statt externer Einstellung',
        context: 'Das Projektvolumen rechtfertigte eine dedizierte Projektleitung. Externe Kandidaten verlangten 15–20 k$ mehr und kannten weder unsere Kunden noch unser Inbetriebnahme-Protokoll.',
        decision: 'Die Senior-Automatisierungsingenieurin befördern, die die letzten drei Projekte informell koordiniert hatte; stattdessen ihre Ingenieursstelle nachbesetzen.',
        owner: 'Gründer',
        tradeoffs: ['Verlust von Senior-Ingenieurskapazität für ca. 2 Quartale', 'Erste PM-Rolle — braucht Coaching und Rückendeckung', 'Das Signal der internen Beförderung war mehr wert als die Gehaltsersparnis'],
        links: ['HIR-009', 'HIR-014'] },
      { id: 'PRD-019', domain: 'Product', date: '2025-02-17', title: 'TIA Portal als primäre Plattform standardisieren',
        context: 'Projekte verteilten sich auf drei SPS-Ökosysteme. Jeder Kontextwechsel kostete Rüstzeit, Bibliotheks-Wiederverwendung lag nahe null.',
        decision: 'Siemens TIA Portal wird Standard für alle Neuprojekte; andere Plattformen nur, wenn der Anlagenbestand des Kunden es verlangt (entsprechend bepreist).',
        owner: 'Engineering-Team, vom Gründer bestätigt',
        tradeoffs: ['Weist manche Allen-Bradley-Anfragen ab', 'Vertieft die Abhängigkeit von der Roadmap eines Herstellers', 'Bibliotheks-Wiederverwendung sprang an — kalkulierte Stunden ca. 8 % niedriger'],
        links: ['HIR-014', 'SAL-021'] },
      { id: 'OPS-020', domain: 'Ops', date: '2025-03-10', title: 'Zwei-Personen-Regel für alle Inbetriebnahmen',
        context: 'Ein Solo-Einsatz ging schief: Ein undokumentierter Maschinenzustand kostete einen vollen Zusatztag vor Ort und führte beinahe zu einem Sicherheitsvorfall.',
        decision: 'Keine Solo-Inbetriebnahmen mehr. Jeder Einsatz mit mindestens zwei Personen — eine darf Junior sein. Ab sofort in jedem Angebot eingepreist.',
        owner: 'Ops-Lead, vom Gründer bestätigt',
        tradeoffs: ['Erhöht die Lieferkosten kleiner Aufträge um ca. 15 %', 'Macht uns teurer als Ein-Mann-Wettbewerber', 'Junioren lernen jetzt auf echten Anlagen — speist die Hiring-Pipeline'],
        links: ['SAL-021', 'FIN-022'] },
      { id: 'SAL-021', domain: 'Sales', date: '2025-04-14', title: 'Rahmenvertrag des Automobil-OEM ablehnen',
        context: 'Ein großer OEM bot einen Rahmenvertrag über ca. 35 % des Jahresumsatzes — zu Sätzen 20 % unter Liste, mit Pönalen und 90 Tagen Zahlungsziel.',
        decision: 'Ablehnen. Das Volumen hätte drei A-Kunden verdrängt und das Umsatzrisiko beim Käufer mit den schwächsten Konditionen konzentriert.',
        owner: 'Gründer, gegen die ursprüngliche Empfehlung der Vertriebsleitung',
        tradeoffs: ['Verzichtet in einem schwachen Quartal auf garantiertes Volumen', 'Tür bei diesem OEM möglicherweise auf Jahre zu', 'Preissetzungsmacht und Kundenmix blieben intakt — siehe SAL-017'],
        links: ['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019'] },
      { id: 'FIN-022', domain: 'Finance', date: '2025-05-19', title: '15 % Contingency-Position in jedem Festpreisprojekt',
        context: 'Ein Nacharbeitsvorfall (falsche Sensorspezifikation vom Kunden, spät entdeckt) kostete ungeplante 42 k$. Die Marge des gesamten Quartals war dahin.',
        decision: 'Jedes Festpreisangebot enthält eine sichtbare Contingency-Position von 15 %. Bleibt sie ungenutzt, werden 5 % bei Abnahme erstattet — Kunden sehen Ehrlichkeit, wir behalten den Puffer.',
        owner: 'Gründer + externer Steuerberater',
        tradeoffs: ['Der Angebotspreis wirkt im Wettbewerb höher', 'Erstattungsmechanik macht die Rechnungsstellung komplexer', 'Zwei Kunden lobten die Transparenz ausdrücklich'],
        links: ['SAL-011', 'FIN-016', 'OPS-020'] }
    ]
  };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount(sel, lang) {
    var root = document.querySelector(sel);
    if (!root) return;
    var ui = UI[lang] || UI.en;
    var data = DATA[lang] || DATA.en;
    var byId = {};
    data.forEach(function (d) { byId[d.id] = d; });
    var linkCount = data.reduce(function (n, d) { return n + d.links.length; }, 0) / 2;
    var activeDomain = null;
    var activeId = null;

    root.innerHTML = '';
    var head = el('div', 'dl-head');
    head.appendChild(el('span', 'dl-sample', ui.sample));
    head.appendChild(el('span', 'dl-stats', ui.stats(data.length, Math.round(linkCount))));
    root.appendChild(head);

    var filters = el('div', 'dl-filters');
    root.appendChild(filters);
    var hint = el('p', 'dl-hint', ui.hint);
    root.appendChild(hint);
    var body = el('div', 'dl-body');
    root.appendChild(body);
    var list = el('div', 'dl-list');
    var detail = el('div', 'dl-detail');
    detail.hidden = true;
    body.appendChild(list);
    body.appendChild(detail);

    function renderFilters() {
      filters.innerHTML = '';
      var domains = ['Hiring', 'Sales', 'Product', 'Finance', 'Ops'];
      var allBtn = el('button', 'dl-pill' + (activeDomain === null ? ' on' : ''), ui.all);
      allBtn.type = 'button';
      allBtn.onclick = function () { activeDomain = null; activeId = null; render(); };
      filters.appendChild(allBtn);
      domains.forEach(function (dm) {
        var b = el('button', 'dl-pill dm-' + dm.toLowerCase() + (activeDomain === dm ? ' on' : ''), ui.domains[dm]);
        b.type = 'button';
        b.onclick = function () { activeDomain = (activeDomain === dm ? null : dm); activeId = null; render(); };
        filters.appendChild(b);
      });
    }

    function renderList() {
      list.innerHTML = '';
      data.filter(function (d) { return !activeDomain || d.domain === activeDomain; })
        .forEach(function (d) {
          var card = el('button', 'dl-card' + (activeId === d.id ? ' on' : ''));
          card.type = 'button';
          card.setAttribute('aria-expanded', activeId === d.id ? 'true' : 'false');
          card.appendChild(el('span', 'dl-id dm-' + d.domain.toLowerCase(), d.id));
          card.appendChild(el('span', 'dl-card-t', d.title));
          card.appendChild(el('span', 'dl-card-m', ui.domains[d.domain] + ' · ' + d.date + ' · ' + d.links.length + ' ⟷'));
          card.onclick = function () { open(d.id); };
          list.appendChild(card);
        });
    }

    function open(id) {
      activeId = id;
      render();
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderDetail() {
      var d = activeId && byId[activeId];
      detail.hidden = !d;
      detail.innerHTML = '';
      if (!d) return;
      var top = el('div', 'dl-d-top');
      top.appendChild(el('span', 'dl-id dm-' + d.domain.toLowerCase(), d.id));
      top.appendChild(el('span', 'dl-d-meta', ui.domains[d.domain] + ' · ' + d.date));
      var x = el('button', 'dl-d-close', ui.close);
      x.type = 'button';
      x.onclick = function () { activeId = null; render(); };
      top.appendChild(x);
      detail.appendChild(top);
      detail.appendChild(el('h3', 'dl-d-title', d.title));
      detail.appendChild(el('h4', 'dl-d-h', ui.context));
      detail.appendChild(el('p', 'dl-d-p', d.context));
      detail.appendChild(el('h4', 'dl-d-h', ui.decision));
      detail.appendChild(el('p', 'dl-d-p dl-d-dec', d.decision));
      detail.appendChild(el('h4', 'dl-d-h', ui.owner));
      detail.appendChild(el('p', 'dl-d-p', d.owner));
      detail.appendChild(el('h4', 'dl-d-h', ui.tradeoffs));
      var ul = el('ul', 'dl-d-ul');
      d.tradeoffs.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      detail.appendChild(ul);
      if (d.links.length) {
        detail.appendChild(el('h4', 'dl-d-h', ui.linked));
        var ln = el('div', 'dl-d-links');
        d.links.forEach(function (lid) {
          var t = byId[lid];
          if (!t) return;
          var b = el('button', 'dl-link dm-' + t.domain.toLowerCase());
          b.type = 'button';
          b.innerHTML = '<b>' + lid + '</b> ' + t.title;
          b.onclick = function () { activeDomain = null; open(lid); };
          ln.appendChild(b);
        });
        detail.appendChild(ln);
      }
    }

    function render() { renderFilters(); renderList(); renderDetail(); }
    render();
  }

  window.ADAMAS_DEMO = { mount: mount };
})();
