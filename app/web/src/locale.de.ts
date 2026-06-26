// German translations. Keys are the exact English source strings; anything not
// listed here gracefully falls back to English. This mirrors the marketing
// site's EN/DE split, but at runtime for the single-page app.
export const de: Record<string, string> = {
  // ── App shell ─────────────────────────────────────────────
  'All Decisions And Memory Archive System': 'Alle Entscheidungen und Gedächtnis-Archivsystem',
  'The Ledger': 'Das Hauptbuch',
  'Capture Inbox': 'Erfassungs-Eingang',
  'Decision Graph': 'Entscheidungs-Graph',
  'Asset Generation': 'Asset-Erstellung',
  Knowledge: 'Wissen',
  People: 'Personen',
  'Data Room': 'Datenraum',
  'Boundary & Security': 'Grenze & Sicherheit',
  'Onboarding & Pricing': 'Onboarding & Preise',
  'local-first': 'lokal-zuerst',
  decisions: 'Entscheidungen',
  role: 'Rolle',
  theme: 'Design',
  dark: 'Dunkel',
  light: 'Hell',
  matrix: 'Matrix',

  // ── Common actions / labels ───────────────────────────────
  Confirm: 'Bestätigen',
  Dismiss: 'Verwerfen',
  Remove: 'Entfernen',
  Generate: 'Erstellen',
  Search: 'Suchen',
  'all domains': 'alle Bereiche',
  'all statuses': 'alle Status',
  Title: 'Titel',
  Tags: 'Schlagwörter',
  Summary: 'Zusammenfassung',
  'Key takeaways': 'Kernaussagen',
  Source: 'Quelle',
  Owner: 'Verantwortliche/r',
  Status: 'Status',
  pulses: 'Impulse',
  topics: 'Themen',
  focus: 'Fokus',
  'clear focus': 'Fokus zurücksetzen',

  // ── Ledger ────────────────────────────────────────────────
  Context: 'Kontext',
  Decision: 'Entscheidung',
  'Trade-offs': 'Kompromisse',
  'Trade-offs / what we gave up': 'Kompromisse / worauf wir verzichtet haben',
  Links: 'Verknüpfungen',
  Sources: 'Quellen',
  Dissent: 'Widerspruch',
  active: 'aktiv',
  superseded: 'ersetzt',
  reversed: 'rückgängig gemacht',
  'New decision': 'Neue Entscheidung',

  // ── Capture Inbox ─────────────────────────────────────────
  'Pending candidates': 'Offene Vorschläge',
  'Confirm into ledger': 'Ins Hauptbuch übernehmen',
  '⚡ Auto-file high-confidence': '⚡ Sichere automatisch ablegen',
  'No pending candidates yet. Paste a note above and let Hermes read it.':
    'Noch keine offenen Vorschläge. Füge oben eine Notiz ein und lass Hermes sie lesen.',
  'Extract decisions with Hermes': 'Entscheidungen mit Hermes extrahieren',
  'Reading…': 'Lese…',
  'Or try the built-in sample notes': 'Oder probiere die eingebauten Beispielnotizen',
  'Paste a real meeting note, email, or memo. Hermes (your local model) reads it and proposes candidate decisions. Nothing enters the ledger until you confirm it — and nothing leaves your machine.':
    'Füge eine echte Meeting-Notiz, E-Mail oder ein Memo ein. Hermes (dein lokales Modell) liest es und schlägt Entscheidungs-Kandidaten vor. Nichts gelangt ins Hauptbuch, bis du es bestätigst — und nichts verlässt dein Gerät.',
  'Read-only connectors': 'Schreibgeschützte Konnektoren',
  'Connectors pull source material onto this machine — read-only, inbound only. Nothing is sent out.':
    'Konnektoren holen Quellmaterial auf dieses Gerät — schreibgeschützt, nur eingehend. Nichts wird gesendet.',
  'Local folder': 'Lokaler Ordner',
  'Calendar (Calendar)': 'Kalender',
  'iCal feed (read-only)': 'iCal-Feed (schreibgeschützt)',
  'read-only': 'schreibgeschützt',
  network: 'Netzwerk',
  local: 'lokal',
  Pull: 'Abrufen',
  'Pulling…': 'Rufe ab…',
  'Capture from your own note': 'Aus eigener Notiz erfassen',
  'Paste your note here. e.g. "In the Q3 review we decided to drop the hourly rate card and quote fixed-scope packages. Owner: head of sales. The trade-off is more estimation risk on us."':
    'Füge hier deine Notiz ein. z. B. „Im Q3-Review haben wir entschieden, die Stundensatz-Karte abzuschaffen und Festumfang-Pakete anzubieten. Verantwortlich: Vertriebsleitung. Der Kompromiss: mehr Schätzrisiko bei uns.“',
  'auto-detect domain': 'Bereich automatisch erkennen',
  confidence: 'Konfidenz',
  from: 'aus',
  owner: 'Verantwortliche/r',
  dissent: 'Widerspruch',
  'trade-off(s)': 'Kompromiss(e)',
  doc: 'Dokument',
  meeting: 'Meeting',
  email: 'E-Mail',
  chat: 'Chat',
  'What was decided? e.g. "We decided to move standups to Mondays only. Owner: head of ops. Trade-off: less mid-week visibility."':
    'Was wurde entschieden? z. B. „Wir haben entschieden, Standups nur noch montags abzuhalten. Verantwortlich: Betriebsleitung. Kompromiss: weniger Sichtbarkeit unter der Woche.“',

  // ── Knowledge ─────────────────────────────────────────────
  'Drop a link (article, post, video, blog) or paste text. ADAMAS summarizes it locally and saves an entry linked to the source.':
    'Füge einen Link (Artikel, Post, Video, Blog) ein oder Text. ADAMAS fasst ihn lokal zusammen und speichert einen Eintrag mit Quelle.',
  'Summarize & save': 'Zusammenfassen & speichern',
  'Summarizing…': 'Fasse zusammen…',
  'Search knowledge…': 'Wissen durchsuchen…',
  'all tags': 'alle Schlagwörter',
  'No knowledge yet. Add a link or some text above.': 'Noch kein Wissen. Füge oben einen Link oder Text hinzu.',
  'Select an entry, or add a link/text to build your knowledge base.':
    'Wähle einen Eintrag oder füge einen Link/Text hinzu, um deine Wissensbasis aufzubauen.',
  'Title (optional)': 'Titel (optional)',
  'Tags (comma-separated)': 'Schlagwörter (kommagetrennt)',

  // ── People ────────────────────────────────────────────────
  'Add a team member': 'Teammitglied hinzufügen',
  'Adding…': 'Füge hinzu…',
  Name: 'Name',
  'Role / title': 'Rolle / Titel',
  Type: 'Typ',
  Since: 'Seit',
  Location: 'Standort',
  'CV / résumé (paste text — summarized on-device)': 'Lebenslauf (Text einfügen — lokal zusammengefasst)',
  'Key person (departure is a material risk)': 'Schlüsselperson (Weggang ist ein wesentliches Risiko)',
  'No team members yet. Add your first on the right.': 'Noch keine Teammitglieder. Füge rechts das erste hinzu.',

  // ── Data Room ─────────────────────────────────────────────
  'Diligence records': 'Due-Diligence-Datensätze',
  'Customers & contracts': 'Kunden & Verträge',
  'Financial KPIs': 'Finanz-KPIs',
  'Risk register': 'Risikoregister',
  'IP & assets': 'IP & Vermögenswerte',
  'Data Room — valuation readiness': 'Datenraum — Bewertungsreife',
  'Obsidian vault': 'Obsidian-Tresor',
  'Generating…': 'Erstelle…',
  'Generate / refresh Obsidian vault': 'Obsidian-Tresor erstellen / aktualisieren',
  'Import from _Inbox': 'Aus _Inbox importieren',
  built: 'erstellt',
  'not built yet': 'noch nicht erstellt',
  'auto-sync on': 'Auto-Sync an',

  // ── Graph ─────────────────────────────────────────────────
  knowledge: 'Wissen',
  people: 'Personen',
  records: 'Datensätze',
  topic: 'Thema',
  hub: 'Knoten',
  'Nodes: 300 (fastest)': 'Knoten: 300 (am schnellsten)',
  'Nodes: 600': 'Knoten: 600',
  'Nodes: 1200': 'Knoten: 1200',
  'All nodes (slow)': 'Alle Knoten (langsam)',
  'How many nodes to draw. Fewer = faster; the full vault is unchanged.':
    'Wie viele Knoten gezeichnet werden. Weniger = schneller; der gesamte Tresor bleibt unverändert.',
  nodes: 'Knoten',
  loaded: 'geladen',

  // ── Ledger / Decision detail ──────────────────────────────
  '+ New decision': '+ Neue Entscheidung',
  'No decisions visible for this filter / role.': 'Keine Entscheidungen für diesen Filter / diese Rolle sichtbar.',
  'Export full vault (Markdown + JSON)': 'Gesamten Tresor exportieren (Markdown + JSON)',
  'Select a decision, or add one with “+ New decision”.': 'Wähle eine Entscheidung oder füge mit „+ Neue Entscheidung“ eine hinzu.',
  Domain: 'Bereich',
  Date: 'Datum',
  'none recorded': 'keiner erfasst',
  none: 'keine',
  'Context (the why)': 'Kontext (das Warum)',
  'Links (bi-directional)': 'Verknüpfungen (bidirektional)',
  'Sources (traceable)': 'Quellen (nachverfolgbar)',
  'Supersede this decision…': 'Diese Entscheidung ersetzen…',

  // ── Boundary & Security ───────────────────────────────────
  'Hybrid-cloud approval (per task)': 'Hybrid-Cloud-Freigabe (pro Aufgabe)',
  'ADAMAS is local-first by default — nothing leaves the machine. A cloud route is opt-in per task: you see exactly what would be transmitted before anything is sent.':
    'ADAMAS ist standardmäßig lokal-zuerst — nichts verlässt das Gerät. Eine Cloud-Route ist pro Aufgabe optional: Du siehst genau, was übertragen würde, bevor etwas gesendet wird.',
  'Prepare a cloud evaluation task…': 'Cloud-Auswertung vorbereiten…',
  'This is exactly what would be transmitted': 'Genau das würde übertragen',
  'Approve & send to cloud': 'Freigeben & an Cloud senden',
  'Decline — run locally instead': 'Ablehnen — stattdessen lokal ausführen',
  'Security & data ownership': 'Sicherheit & Datenhoheit',
  'Local-first': 'Lokal-zuerst',
  'External telemetry': 'Externe Telemetrie',
  'Tracking cookies': 'Tracking-Cookies',
  'Restricted domains': 'Eingeschränkte Bereiche',
  'Cloud transmissions': 'Cloud-Übertragungen',
  'Encrypted local backup': 'Verschlüsseltes lokales Backup',
  'passphrase (min 8 chars)': 'Passphrase (mind. 8 Zeichen)',
  'Create backup': 'Backup erstellen',
  'Export vault (MD+JSON)': 'Tresor exportieren (MD+JSON)',
  'Route log (recorded in the vault)': 'Routen-Protokoll (im Tresor gespeichert)',
  route: 'Route',
  purpose: 'Zweck',
  approved: 'freigegeben',
  'chars sent': 'gesendete Zeichen',
  when: 'wann',
  'No routes yet.': 'Noch keine Routen.',

  // ── Asset Generation ──────────────────────────────────────
  'Asset Registry': 'Asset-Register',
  'auto-regenerate': 'auto-regenerieren',
  'Assets are assembled only from existing ledger decisions, with section-level SRC traceability.':
    'Assets werden ausschließlich aus vorhandenen Hauptbuch-Entscheidungen zusammengesetzt, mit SRC-Nachverfolgbarkeit auf Abschnittsebene.',
  'Hiring & People': 'Einstellung & Personal',
  'Sales & Revenue': 'Vertrieb & Umsatz',
  'Product & Delivery': 'Produkt & Lieferung',
  Finance: 'Finanzen',
  Operations: 'Betrieb',
  'Investor & Board': 'Investoren & Beirat',
  'Whole-ledger assets': 'Gesamthauptbuch-Assets',
  Regenerate: 'Neu erstellen',
  View: 'Ansehen',
  'Generated asset': 'Erstelltes Asset',
  'Generate or select an asset to view its SRC-traced output.':
    'Erstelle oder wähle ein Asset, um seine SRC-nachverfolgte Ausgabe zu sehen.',
  'download .md': '.md herunterladen',
  'Affected sections:': 'Betroffene Abschnitte:',
  'Regenerate now': 'Jetzt neu erstellen',

  // ── Onboarding ────────────────────────────────────────────
  'Loading…': 'Lädt…',
  'Onboarding & Engagement Model': 'Onboarding & Zusammenarbeitsmodell',
  locale: 'Region',
  'Your journey': 'Dein Weg',
  'The only recurring task for your team is confirming surfaced decisions — minutes a week.':
    'Die einzige wiederkehrende Aufgabe für dein Team ist das Bestätigen vorgeschlagener Entscheidungen — Minuten pro Woche.',
  'One-time': 'Einmalig',
  'ongoing subscription': 'laufendes Abo',
  'most common': 'am häufigsten',
  '/mo': '/Mon.',

  // ── New decision form ─────────────────────────────────────
  Cancel: 'Abbrechen',
  'The ID is assigned automatically from the domain. Required fields are marked *.':
    'Die ID wird automatisch aus dem Bereich vergeben. Pflichtfelder sind mit * markiert.',
  domain: 'Bereich',
  date: 'Datum',
  'Title* (the choice made, ≤120 chars)': 'Titel* (die getroffene Wahl, ≤120 Zeichen)',
  'Context* (the why)': 'Kontext* (das Warum)',
  'Decision* (exact, falsifiable choice)': 'Entscheidung* (genaue, überprüfbare Wahl)',
  'owner role': 'Verantwortliche Rolle',
  'owner name': 'Name der/des Verantwortlichen',
  optional: 'optional',
  'Dissent (roles, comma-separated)': 'Widerspruch (Rollen, kommagetrennt)',
  'Trade-offs (one per line)': 'Kompromisse (einer pro Zeile)',
  'Links (decision IDs, comma-separated)': 'Verknüpfungen (Entscheidungs-IDs, kommagetrennt)',
  'Sources (one per line)': 'Quellen (eine pro Zeile)',
  'Saving…': 'Speichere…',
  'Save decision': 'Entscheidung speichern',

  // ── Meeting capture ───────────────────────────────────────
  'Log a meeting outcome (no recording needed)': 'Meeting-Ergebnis festhalten (keine Aufnahme nötig)',
  'Meeting title': 'Meeting-Titel',
  'Meeting title (optional)': 'Meeting-Titel (optional)',
  'Attendees (optional, comma-separated)': 'Teilnehmende (optional, kommagetrennt)',
  'Working…': 'Arbeite…',
  'Capture outcome': 'Ergebnis erfassen',
  'Upload or paste a meeting transcript': 'Meeting-Transkript hochladen oder einfügen',
  'ADAMAS summarizes it locally first, then extracts decisions. Text files only (.txt, .md, .vtt, .srt).':
    'ADAMAS fasst es zuerst lokal zusammen und extrahiert dann Entscheidungen. Nur Textdateien (.txt, .md, .vtt, .srt).',
  '…or paste the transcript text here.': '…oder füge den Transkripttext hier ein.',
  'Summarize & extract decisions': 'Zusammenfassen & Entscheidungen extrahieren',
  'Drop a recording (audio / video)': 'Aufnahme ablegen (Audio / Video)',
  'Transcribed on-device, then summarized and extracted. Requires a local transcription engine (set ADAMAS_TRANSCRIBE_CMD; see the README) — otherwise use a text transcript above.':
    'Lokal transkribiert, dann zusammengefasst und extrahiert. Erfordert eine lokale Transkriptions-Engine (ADAMAS_TRANSCRIBE_CMD setzen; siehe README) — andernfalls oben ein Text-Transkript verwenden.',
  'Transcribe & extract': 'Transkribieren & extrahieren',
  'Transcribing…': 'Transkribiere…',
  'Summary (used for extraction)': 'Zusammenfassung (für die Extraktion verwendet)',

  // ── Demo data ─────────────────────────────────────────────
  'Demo data (for showcases)': 'Demodaten (für Präsentationen)',
  'Fill every section with a sample company (decisions, knowledge, people, diligence records) to showcase ADAMAS. Safe to run repeatedly — it only adds what is missing.':
    'Befülle jeden Bereich mit einem Beispielunternehmen (Entscheidungen, Wissen, Personen, Due-Diligence-Datensätze), um ADAMAS zu präsentieren. Mehrfaches Ausführen ist sicher — es fügt nur Fehlendes hinzu.',
  'Load demo data': 'Demodaten laden',
  'Loaded demo data:': 'Demodaten geladen:',
  'All demo data is already loaded.': 'Alle Demodaten sind bereits geladen.',

  // ── Glossary ──────────────────────────────────────────────
  Entries: 'Einträge',
  Glossary: 'Glossar',
  'Your company’s terms, defined in your own words — the source for employee handbooks and new-joiner training.':
    'Die Begriffe deines Unternehmens, in euren eigenen Worten definiert — die Quelle für Mitarbeiterhandbücher und Einarbeitung.',
  Term: 'Begriff',
  'Definition (in your company’s context)': 'Definition (im Kontext deines Unternehmens)',
  'Aliases (comma-separated)': 'Synonyme (kommagetrennt)',
  'Add term': 'Begriff hinzufügen',
  'Search glossary…': 'Glossar durchsuchen…',
  Terms: 'Begriffe',
  'No terms yet. Add your first on the left.': 'Noch keine Begriffe. Füge links den ersten hinzu.',
  'Term and definition are required.': 'Begriff und Definition sind erforderlich.',
  Saved: 'Gespeichert',
  'Could not remove': 'Konnte nicht entfernen',
  'Draft with AI': 'Mit KI entwerfen',
  'Drafting…': 'Wird entworfen…',
  'Draft a definition on-device from the term.': 'Entwirf eine Definition lokal aus dem Begriff.',
  'Type a term first, then let ADAMAS draft it.': 'Gib zuerst einen Begriff ein, dann entwirft ADAMAS ihn.',
  'Drafted from the built-in dictionary — review and edit before saving.':
    'Aus dem integrierten Wörterbuch entworfen — vor dem Speichern prüfen und bearbeiten.',
  'Drafted by your local model — review and edit before saving.':
    'Von deinem lokalen Modell entworfen — vor dem Speichern prüfen und bearbeiten.',
  'No built-in definition — finish it in your own words (or connect a local model).':
    'Keine integrierte Definition — vervollständige sie in deinen eigenen Worten (oder verbinde ein lokales Modell).',

  // ── People: merge duplicates ──────────────────────────────
  'Merge duplicates': 'Duplikate zusammenführen',
  'Merging…': 'Wird zusammengeführt…',
  'Merged duplicates': 'Duplikate zusammengeführt',
  'No duplicates found.': 'Keine Duplikate gefunden.',
  'Combine records that share the same name into one.':
    'Datensätze mit gleichem Namen zu einem zusammenführen.',

  // ── Gmail decision labeling ───────────────────────────────
  'Gmail decision labeling': 'Gmail-Entscheidungsmarkierung',
  'Scan your Gmail and add an “ADAMAS/Decisions” label to threads that look like business decisions. Only adds a label — never deletes, moves, or sends.':
    'Durchsuche dein Gmail und füge Threads, die nach Geschäftsentscheidungen aussehen, das Label „ADAMAS/Decisions“ hinzu. Fügt nur ein Label hinzu — löscht, verschiebt oder sendet nie.',
  'Label decision emails': 'Entscheidungs-E-Mails markieren',
  'Labeling…': 'Markiere…',
  'To enable, set ADAMAS_IMAP_HOST=imap.gmail.com, ADAMAS_IMAP_USER and ADAMAS_IMAP_PASS (a Gmail app password) in your environment.':
    'Zum Aktivieren ADAMAS_IMAP_HOST=imap.gmail.com, ADAMAS_IMAP_USER und ADAMAS_IMAP_PASS (ein Gmail-App-Passwort) in der Umgebung setzen.',
  Labeled: 'Markiert',
  'emails as decisions.': 'E-Mails als Entscheidungen.',
  Scanned: 'Durchsucht',
  'emails — none looked like decisions.': 'E-Mails — keine sah nach einer Entscheidung aus.',
  'Test connection': 'Verbindung testen',
  'Connection failed': 'Verbindung fehlgeschlagen',
  'Connected ✓': 'Verbunden ✓',
  messages: 'Nachrichten',
  'Send test email': 'Test-E-Mail senden',
  'Adds a sample decision email to your inbox so you can see labeling work.':
    'Fügt deinem Posteingang eine Beispiel-Entscheidungs-E-Mail hinzu, damit du die Markierung sehen kannst.',
  'Test email failed': 'Test-E-Mail fehlgeschlagen',
  'Test email added to your inbox:': 'Test-E-Mail zu deinem Posteingang hinzugefügt:',
  'Now click “Label decision emails”.': 'Klicke jetzt auf „Entscheidungs-E-Mails markieren“.',
  'Labeling failed': 'Markierung fehlgeschlagen',

  // ── Data Room (readiness + obsidian + records) ────────────
  'A diligence-ready view of the vault: how complete and traceable your decision record is. Higher = lower perceived risk in an M&A / fundraise evaluation.':
    'Eine due-diligence-fähige Sicht auf den Tresor: wie vollständig und nachverfolgbar deine Entscheidungshistorie ist. Höher = geringeres wahrgenommenes Risiko bei einer M&A-/Finanzierungsbewertung.',
  readiness: 'Reife',
  sourced: 'mit Quelle',
  Component: 'Komponente',
  Score: 'Punktzahl',
  'Coverage gap: no decisions yet in': 'Abdeckungslücke: noch keine Entscheidungen in',
  'Capturing a few there raises the score.': 'Ein paar dort zu erfassen hebt die Punktzahl.',
  'ADAMAS stays the source of truth; this generates a clean Obsidian data-room vault (YAML frontmatter, [[wikilinks]], MOC indexes) — your durable “second brain.”':
    'ADAMAS bleibt die Quelle der Wahrheit; dies erzeugt einen sauberen Obsidian-Datenraum-Tresor (YAML-Frontmatter, [[Wikilinks]], MOC-Indizes) — dein dauerhaftes „zweites Gehirn“.',
  'Import notes you wrote into obsidian/_Inbox/': 'Notizen importieren, die du in obsidian/_Inbox/ geschrieben hast',
  'The vault refreshes automatically whenever a decision or knowledge entry changes — you rarely need this button. Use it to force an immediate rebuild.':
    'Der Tresor aktualisiert sich automatisch, sobald sich eine Entscheidung oder ein Wissenseintrag ändert — diesen Knopf brauchst du selten. Nutze ihn für eine sofortige Neuerstellung.',
  'Vault location': 'Tresor-Speicherort',
  'Open in Obsidian': 'In Obsidian öffnen',
  'In Docker, this is the host folder mapped to': 'In Docker ist dies der Host-Ordner, der verbunden ist mit',
  'e.g.': 'z. B.',
  'Open folder as vault': 'Ordner als Tresor öffnen',
  'choose that folder.': 'diesen Ordner wählen.',
  Open: 'Öffne',
  'that’s the cockpit MOC.': 'das ist die Cockpit-MOC.',
  'Decisions are read-only here (governed in ADAMAS); use the vault for browsing, the graph, and the living knowledge base. Re-run the export to refresh after changes.':
    'Entscheidungen sind hier schreibgeschützt (in ADAMAS verwaltet); nutze den Tresor zum Stöbern, für den Graphen und die lebendige Wissensbasis. Führe den Export erneut aus, um nach Änderungen zu aktualisieren.',
  'The commercial, financial, risk and IP facts a buyer underwrites. Each category you fill in raises the valuation-readiness score and appears in the Obsidian data room.':
    'Die kommerziellen, finanziellen, Risiko- und IP-Fakten, die ein Käufer prüft. Jede ausgefüllte Kategorie hebt die Bewertungsreife und erscheint im Obsidian-Datenraum.',
  'Title *': 'Titel *',
  'Owner (role or name)': 'Verantwortliche/r (Rolle oder Name)',
  'ARR / contract value': 'ARR / Vertragswert',
  'Renewal date (YYYY-MM-DD)': 'Verlängerungsdatum (JJJJ-MM-TT)',
  'recurring revenue': 'wiederkehrender Umsatz',
  'Metric (e.g. Gross margin)': 'Kennzahl (z. B. Bruttomarge)',
  'Value (e.g. 62%)': 'Wert (z. B. 62 %)',
  'Period (e.g. FY2025)': 'Zeitraum (z. B. GJ2025)',
  'severity…': 'Schweregrad…',
  low: 'niedrig',
  medium: 'mittel',
  high: 'hoch',
  Mitigation: 'Gegenmaßnahme',
  'Expiry / renewal date': 'Ablauf-/Verlängerungsdatum',
  'Source (where this is evidenced)': 'Quelle (wo belegt)',
  'Description / notes': 'Beschreibung / Notizen',
  Add: 'Hinzufügen',
  remove: 'entfernen',

  // ── Knowledge placeholders ────────────────────────────────
  'Paste a URL (article / post / video / blog)…': 'Eine URL einfügen (Artikel / Post / Video / Blog)…',
  '…or paste the text directly (for paywalled pages or a video transcript).':
    '…oder den Text direkt einfügen (für Bezahlinhalte oder ein Video-Transkript).',

  // ── People ────────────────────────────────────────────────
  'The team a buyer underwrites. Each person’s CV is summarized on-device into a bio, highlights, and skills, and linked to the decisions they own. Flag key people so key-person risk is documented.':
    'Das Team, das ein Käufer prüft. Der Lebenslauf jeder Person wird lokal zu Kurzbio, Highlights und Fähigkeiten zusammengefasst und mit den Entscheidungen verknüpft, die sie verantwortet. Markiere Schlüsselpersonen, damit das Schlüsselpersonen-Risiko dokumentiert ist.',
  'key person': 'Schlüsselperson',
  'Paste the CV or a bio here…': 'Lebenslauf oder Kurzbio hier einfügen…',
  founder: 'Gründer/in',
  employee: 'Mitarbeiter/in',
  advisor: 'Berater/in',
  board: 'Beirat',
  contractor: 'Auftragnehmer/in',

  // ── Graph hints / panel ───────────────────────────────────
  'Loading 3D view…': '3D-Ansicht wird geladen…',
  'drag a node: neighbors follow · click: open · scroll: zoom · drag bg: rotate':
    'Knoten ziehen: Nachbarn folgen · Klick: öffnen · Scrollen: zoomen · Hintergrund ziehen: drehen',
  'hover: focus · click: open · scroll: zoom · drag: pan':
    'überfahren: fokussieren · Klick: öffnen · Scrollen: zoomen · ziehen: verschieben',
  'Your second brain: decisions (by department) and knowledge, linked. Click a node to open it; hover to highlight its neighborhood. Drag any node and its connections follow.':
    'Dein zweites Gehirn: Entscheidungen (nach Abteilung) und Wissen, verknüpft. Klicke einen Knoten zum Öffnen; überfahre ihn, um seine Nachbarschaft hervorzuheben. Ziehe einen beliebigen Knoten und seine Verbindungen folgen.',
};
