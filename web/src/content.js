// Inhalte in zwei Fassungen:
//   Vollfassung (index.html): Erklärungen, Gleichungen, Pfeile, Pole des Ladegeräts – direkt sichtbar (zur Besprechung).
//   Schülerfassung (index.html?aufgabe): gleiche Stationen und Nummern, nur Beobachtungsaufträge und Fragen (passend zu Aufgabenblatt 2, A1–A4, V1).
// Fachlich nach Infotext Abschnitt 9 und 11–13 (Stand 24.11.2026): Teilgleichungen C₆⁻ → C₆ + e⁻ und Co⁴⁺ + e⁻ → Co³⁺.
// Koordinaten (three.js): +x rechts, +y oben, +z zum Betrachter. Graphit links, Cobalt-Oxid rechts.

export const GROUPS = [
  ['Halbzellen', ['graphit', 'c6', 'oxid', 'cobalt']],
  ['Dazwischen', ['elektrolyt', 'separator']],
  ['Teilchen', ['li', 'elektron']],
  ['Äußerer Stromkreis', ['draht', 'lampe', 'ladegeraet']],
];

export const ANNOTATIONS = [
  {
    id: 'graphit', title: 'Minuspol: Graphit-Halbzelle', kicker: 'C₆ · C₆⁻', color: '#a7b0bb', anchor: 'graphit',
    meshes: ['Graphit_'],
    text:
      'Graphit ist eine Form des Kohlenstoffs und besteht aus vielen dünnen Schichten. Für Gleichungen betrachtet man immer 6 Kohlenstoffatome (C₆). ' +
      'Im geladenen Akku sind zwischen den Schichten Lithium-Ionen eingelagert, und für jedes Lithium-Ion trägt eine C₆-Einheit ein zusätzliches Elektron (C₆⁻). Geladen: LiC₆ (Li⁺ + C₆⁻).',
    facts: [['Pol', 'Minuspol (−)'], ['geladen', 'LiC₆ (Li⁺ + C₆⁻)'], ['entladen', 'C₆'], ['Bild', 'Regal für Lithium-Ionen']],
  },
  {
    id: 'c6', title: 'C₆-Einheiten', kicker: 'C₆⁻ ↔ C₆', color: '#d8665a', anchor: 'dyn:c60',
    meshes: ['C6s_', 'C6k_'],
    text:
      'Für Gleichungen betrachtet man immer 6 Kohlenstoffatome als Einheit (C₆). Hervorgehoben ist unter jedem Lithium-Ion eine solche Einheit als Sechsring. ' +
      'Trägt sie ein zusätzliches Elektron (rot, in der Mitte), ist sie eine C₆⁻-Einheit (rötlicher Ring). Gibt sie das Elektron ab, wird sie zu C₆ (grauer Ring).',
    facts: [['rötlich', 'C₆⁻ (ein Elektron zu viel)'], ['grau', 'C₆'], ['im Modell', '6 markierte Einheiten']],
  },
  {
    id: 'oxid', title: 'Pluspol: Cobalt-Oxid-Halbzelle', kicker: 'CoO₂ · LiCoO₂', color: '#4f8fd8', anchor: 'oxid',
    meshes: ['Oxid_'],
    text:
      'Dieses Metalloxid ist ebenfalls schichtartig aufgebaut. Im geladenen Zustand (CoO₂) besteht es aus Cobalt-Ionen (Co⁴⁺) und Oxid-Ionen (O²⁻). ' +
      'Im entladenen Zustand sind zwischen den Schichten Lithium-Ionen eingelagert. Man spricht dann von Lithium-Cobalt-Oxid (LiCoO₂).',
    facts: [['Pol', 'Pluspol (+)'], ['geladen', 'CoO₂ (Co⁴⁺ + 2 O²⁻)'], ['entladen', 'LiCoO₂ (Li⁺ + Co³⁺ + 2 O²⁻)'], ['Kristallansicht', 'Co blau, O hellgrau']],
  },
  {
    id: 'cobalt', title: 'Cobalt-Ionen', kicker: 'Co⁴⁺ ↔ Co³⁺', color: '#b47cff', anchor: 'dyn:co0',
    meshes: ['Co_'],
    text:
      'Hervorgehoben sind die sechs Cobalt-Ionen, die im Modell ein Elektron aufnehmen oder abgeben. Violett bedeutet Co⁴⁺, blau bedeutet Co³⁺. ' +
      'Jedes dieser Cobalt-Ionen gehört zu einem Platz für ein Lithium-Ion direkt darüber.',
    facts: [['violett', 'Co⁴⁺'], ['blau', 'Co³⁺'], ['im Modell', '6 markierte Ionen']],
  },
  {
    id: 'elektrolyt', title: 'Elektrolyt', kicker: 'wasserfrei', color: '#8cc4ee', anchor: 'elektrolyt',
    meshes: ['Behaelter', 'Elektrolyt_Rueckwand'],
    text: 'Zwischen den Elektroden befindet sich eine wasserfreie Flüssigkeit, in der ein Lithiumsalz gelöst ist. Darin können sich Lithium-Ionen bewegen.',
    facts: [['enthält', 'gelöstes Lithiumsalz'], ['beweglich', 'Lithium-Ionen'], ['Wasser', 'keines']],
  },
  {
    id: 'separator', title: 'Separator', kicker: 'poröse Kunststofffolie', color: '#b9c1cc', anchor: 'separator',
    meshes: ['Separator'],
    text:
      'Eine hauchdünne, poröse Kunststofffolie trennt die beiden Elektroden voneinander, damit sie sich nicht berühren und kein Kurzschluss entsteht. ' +
      'Lithium-Ionen können sich durch die winzigen Poren hindurchbewegen, freie Elektronen nicht.',
    facts: [['Aufgabe', 'Elektroden trennen'], ['durchlässig für', 'Lithium-Ionen'], ['nicht für', 'freie Elektronen']],
  },
  {
    id: 'li', title: 'Lithium-Ion', kicker: 'Li⁺', color: '#f2a900', anchor: 'dyn:elyt0',
    meshes: ['Li_'],
    text:
      'In einem Lithium-Ionen-Akku kommt Lithium nie als Metall vor, sondern immer nur als positiv geladenes Lithium-Ion (Li⁺). ' +
      'Die Lithium-Ionen wandern immer zu der Elektrode, zu der auch die Elektronen wandern, und gleichen dort die negative Ladung aus.',
    facts: [['Ladung', '+1'], ['im Modell', '6 wandernde + 2 im Elektrolyten'], ['als Metall', 'nie']],
  },
  {
    id: 'elektron', title: 'Elektronen', kicker: 'e⁻', color: '#e0503f', anchor: 'dyn:e0',
    meshes: ['e_'],
    text:
      'Die Elektronen können nicht durch den Elektrolyten und den Separator wandern, sondern fließen über den äußeren Stromkreis. ' +
      'Im geladenen Akku trägt für jedes Lithium-Ion eine C₆-Einheit ein zusätzliches Elektron (C₆⁻).',
    facts: [['Ladung', '−1'], ['Weg', 'nur über den Draht'], ['im Modell', 'rote Kügelchen']],
  },
  {
    id: 'draht', title: 'Äußerer Stromkreis', kicker: 'Draht und Pole', color: '#c3cbd6', anchor: 'draht',
    meshes: ['Draht', 'Pol_Minus', 'Pol_Plus'],
    text:
      'Die beiden Pole sind außen über einen Draht mit einem Gerät verbunden, z. B. mit einem Smartphone. Beim Laden ist ein Ladegerät angeschlossen. ' +
      'Ein Elektronenfluss durch einen Draht ist elektrischer Strom.',
    facts: [['links', 'Minuspol (Graphit)'], ['rechts', 'Pluspol (Cobalt-Oxid)']],
  },
  {
    id: 'lampe', title: 'Lämpchen', kicker: 'Verbraucher', color: '#fff2a8', anchor: 'lampe',
    meshes: ['Lampe_'],
    text: 'Das Lämpchen steht für ein Gerät, das die elektrische Energie des Akkus nutzt. Es leuchtet, solange Elektronen durch den Draht fließen.',
    facts: [['leuchtet', 'beim Entladen'], ['Schaltzeichen', 'Kreis mit Kreuz']],
  },
  {
    id: 'ladegeraet', title: 'Ladegerät', kicker: 'äußere Stromquelle', color: '#e9edf2', anchor: 'ladegeraet',
    meshes: ['Ladegeraet', 'Ladegeraet_', 'Pol_Lader_'],
    text:
      'Beim Laden ersetzt ein Ladegerät das Lämpchen. Sein Minuspol ist mit der Graphit-Halbzelle verbunden. Es zieht Elektronen von der Cobalt-Oxid-Halbzelle ab ' +
      'und „pumpt“ sie zur Graphit-Halbzelle.',
    facts: [['Reaktion', 'erzwungen'], ['Minuspol', 'an der Graphit-Halbzelle']],
  },
];

// Gleichungen für die Kästen in der 3D-Ansicht (nur Vollfassung)
export const EQ_3D = {
  entladen: {
    links: ['Minuspol · Oxidation', 'C₆⁻ → C₆ + e⁻'],
    rechts: ['Pluspol · Reduktion', 'Co⁴⁺ + e⁻ → Co³⁺'],
  },
  laden: {
    links: ['Minuspol · Reduktion', 'C₆ + e⁻ → C₆⁻'],
    rechts: ['Pluspol · Oxidation', 'Co³⁺ → Co⁴⁺ + e⁻'],
  },
};

// Ansichten: az = Drehung um die Hochachse (0 = frontal), el = Höhe, d = Abstand, t = Zielpunkt
const OVERVIEW = { az: -6, el: 6, d: 33, t: [-2.6, 1.6, 0] };
const GRAPHIT = { az: 18, el: 9, d: 17, t: [-5.6, 0.4, 0] };
const OXID = { az: -18, el: 9, d: 19, t: [5.6, 0.4, 0] };

// proc: from = Startzustand (0 = voll, 1 = leer), run = +1 entladen / −1 laden / 0 Ruhe, to = Endwert, speed = Anteil pro Sekunde,
//       loop = hin und her (Schaukelstuhl), device = 'lampe' | 'lader'
// eq: Zeilen [Beschriftung, Formel] (nur Vollfassung), arrows: Pfeile/Pole zeigen (nur Vollfassung)
export const TOUR = [
  {
    kicker: 'Aufbau', title: 'Der Lithium-Ionen-Akku', seconds: 12,
    view: OVERVIEW, proc: { from: 0, run: 0, device: 'lampe' },
    highlight: ['graphit', 'oxid', 'elektrolyt', 'separator', 'lampe'],
    text:
      'Links liegt der Minuspol, die Graphit-Halbzelle, rechts der Pluspol, die Cobalt-Oxid-Halbzelle. Dazwischen befinden sich der Elektrolyt und der poröse Separator. ' +
      'Außen verbindet ein Draht beide Pole mit einem Lämpchen. Der Akku ist gerade voll geladen.',
    aufgabe: 'Vergleiche das Modell mit Abb. A auf dem Aufgabenblatt. Die Nummern 1–6 stimmen überein. Benenne die Teile und überlege, welche Funktion sie haben (A1).',
  },
  {
    kicker: 'Minuspol', title: 'Die Graphit-Halbzelle', seconds: 12,
    view: GRAPHIT, proc: { from: 0, run: 0, device: 'lampe' }, c6Labels: true,
    highlight: ['c6', 'li', 'elektron'],
    text:
      'Graphit besteht aus vielen übereinanderliegenden Kohlenstoffschichten. Im geladenen Akku stecken die Lithium-Ionen zwischen diesen Schichten wie Bücher in einem Regal. ' +
      'Unter jedem Li⁺ ist eine C₆-Einheit als Sechsring markiert. Sie trägt ein zusätzliches Elektron (rot) und ist deshalb eine C₆⁻-Einheit (rötlicher Ring). Zusammen schreibt man LiC₆ (Li⁺ + C₆⁻). Tipp: „Kristall“ zeigt die Sechseck-Schichten.',
    aufgabe: 'Sieh dir die Graphit-Halbzelle im geladenen Akku an. Welche Teilchen sitzen zwischen den Schichten? Was siehst du direkt unter jedem Lithium-Ion, und welche Ladung hat diese C₆-Einheit? Tipp: „Kristall“ zeigt die Sechseck-Schichten.',
  },
  {
    kicker: 'Pluspol', title: 'Die Cobalt-Oxid-Halbzelle', seconds: 12,
    view: OXID, proc: { from: 0, run: 0, device: 'lampe' }, coLabels: true,
    highlight: ['oxid', 'cobalt'],
    text:
      'Auch das Cobalt-Oxid ist aus Schichten aufgebaut. Im geladenen Akku (CoO₂) besteht es aus Co⁴⁺- und O²⁻-Ionen, hier herrscht Elektronenmangel. ' +
      'Die markierten Cobalt-Ionen sind deshalb Co⁴⁺ (violett). Lithium-Ionen sind hier noch keine eingelagert.',
    aufgabe: 'Sieh dir die Cobalt-Oxid-Halbzelle im geladenen Akku an. Welche Ladung haben die markierten Cobalt-Ionen? Sind hier schon Lithium-Ionen eingelagert?',
  },
  {
    kicker: 'Entladen · Minuspol', title: 'Der Akku liefert Strom', titleAufgabe: 'Am Minuspol beim Entladen', seconds: 14,
    view: { az: 10, el: 8, d: 22, t: [-3.2, 1.4, 0] }, proc: { from: 0, run: 1, to: 0.45, speed: 0.04, device: 'lampe' }, c6Labels: true,
    highlight: ['c6', 'li', 'elektron'], arrows: true,
    text:
      'Mit dem Lämpchen beginnt eine freiwillige, exergonische Redoxreaktion: Der Akku arbeitet wie eine galvanische Zelle. Eine C₆⁻-Einheit gibt ihr Elektron ab, ' +
      'der Ring wird grau: Aus C₆⁻ wird C₆, sie wird oxidiert. Die Elektronen fließen über den Draht zum Pluspol, das Lämpchen leuchtet. Die Graphit-Halbzelle wird positiver, deshalb wandern die Lithium-Ionen hinaus.',
    eq: [['Minuspol', 'C₆⁻ → C₆ + e⁻'], ['', 'Oxidation · Elektronendonator: C₆⁻']],
    aufgabe: 'Beobachte eine C₆⁻-Einheit beim Entladen: Was gibt sie ab, und was wird aus ihr? Was geschieht mit dem Lithium-Ion darüber? Stelle die Teilgleichung für den Minuspol auf (A3).',
  },
  {
    kicker: 'Entladen · Pluspol', title: 'Co⁴⁺ nimmt ein Elektron auf', titleAufgabe: 'Am Pluspol beim Entladen', seconds: 16,
    view: OXID, proc: { from: 0.3, run: 1, to: 1, speed: 0.045, device: 'lampe' }, coLabels: true,
    highlight: ['cobalt', 'li', 'elektron'], arrows: true,
    text:
      'Kommt ein Elektron an, wird ein violettes Cobalt-Ion blau: Aus Co⁴⁺ wird Co³⁺, es wird reduziert. Dadurch wird die Cobalt-Oxid-Halbzelle negativer. ' +
      'Ein Lithium-Ion lagert sich ein und gleicht die negative Ladung aus. Elektronen und Lithium-Ionen wandern beide vom Graphit zum Cobalt-Oxid.',
    eq: [['Pluspol', 'Co⁴⁺ + e⁻ → Co³⁺'], ['', 'Reduktion · Elektronenakzeptor: Co⁴⁺'],
      ['CoO₂', '(4+) + 2·(2−) = 0'], ['nach e⁻', '(3+) + 2·(2−) = 1−'], ['mit Li⁺', '(1+) + (3+) + (4−) = 0 → LiCoO₂']],
    aufgabe: 'Beobachte ein violettes Cobalt-Ion: Was passiert, wenn ein Elektron ankommt? Was geschieht im selben Moment direkt darüber? Begründe mit den Ionenladungen (A3).',
  },
  {
    kicker: 'Entladen · Ende', title: 'Der Akku ist leer', seconds: 12,
    view: OVERVIEW, proc: { from: 1, run: 0, device: 'lampe' }, c6Labels: true, coLabels: true,
    highlight: ['graphit', 'oxid'], arrows: true,
    text:
      'Alle beweglichen Lithium-Ionen sind jetzt in der Cobalt-Oxid-Halbzelle eingelagert (LiCoO₂), alle markierten Cobalt-Ionen sind Co³⁺. ' +
      'Alle markierten C₆-Einheiten sind grau (C₆), sie tragen keine zusätzlichen Elektronen mehr. Das Lämpchen geht aus.',
    eq: [['Gesamt', 'C₆⁻ + Co⁴⁺ → C₆ + Co³⁺'], ['Donator', 'C₆⁻ (wird oxidiert)'], ['Akzeptor', 'Co⁴⁺ (wird reduziert)']],
    aufgabe: 'Der Akku ist leer. Wo sind jetzt die Lithium-Ionen? Welche Ladung haben jetzt die markierten Cobalt-Ionen und die C₆-Einheiten? Stelle die Gesamtgleichung für das Entladen auf (A3).',
  },
  {
    kicker: 'Laden', title: 'Das Ladegerät zwingt zurück', titleAufgabe: 'Laden mit dem Ladegerät', seconds: 24,
    view: OVERVIEW, proc: { from: 1, run: -1, to: 0, speed: 0.05, device: 'lader' }, c6Labels: true, coLabels: true,
    highlight: ['ladegeraet', 'li', 'elektron'], arrows: true,
    text:
      'Jetzt ist ein Ladegerät angeschlossen. Es zwingt die Reaktion in die Gegenrichtung: Das Laden ist erzwungen und endergonisch, der Akku arbeitet wie eine Elektrolysezelle. ' +
      'Der Minuspol des Ladegeräts ist mit der Graphit-Halbzelle verbunden. Es zieht Elektronen vom Cobalt-Oxid ab und „pumpt“ sie zum Graphit. Elektronen und Lithium-Ionen wandern beide zum Graphit.',
    eq: [['Minuspol', 'C₆ + e⁻ → C₆⁻ (Reduktion)'], ['Pluspol', 'Co³⁺ → Co⁴⁺ + e⁻ (Oxidation)'], ['Gesamt', 'C₆ + Co³⁺ → C₆⁻ + Co⁴⁺']],
    aufgabe: 'Jetzt ist ein Ladegerät angeschlossen. Beobachte, in welche Richtung sich Elektronen und Lithium-Ionen bewegen. Welcher Anschluss des Ladegeräts muss der Minuspol sein? (A4)',
  },
  {
    kicker: 'Schaukelstuhl-Prinzip', title: 'Hin und her', seconds: 26,
    view: { az: 14, el: 10, d: 34, t: [-2.6, 1.6, 0] }, proc: { from: 0, run: 1, speed: 0.1, loop: true, device: 'lampe' },
    highlight: ['li'],
    text:
      'Beim Entladen wandern die Lithium-Ionen vom Graphit zum Lithium-Cobalt-Oxid, beim Laden wieder zurück, wie ein Schaukelstuhl. Sie wandern immer dorthin, wohin auch die Elektronen fließen, ' +
      'und gleichen dort die negative Ladung aus. Lithium liegt dabei nie als Metall vor, sondern immer als Li⁺.',
    aufgabe: 'Beobachte mehrmals Entladen und Laden. Beschreibe, wie sich die Lithium-Ionen bewegen. Warum passt der Name „Schaukelstuhl-Prinzip“?',
  },
  {
    kicker: 'Vertiefung (optional)', title: 'Anode und Kathode', seconds: 26,
    view: OVERVIEW, proc: { from: 0, run: 1, speed: 0.08, loop: true, device: 'lampe' },
    highlight: ['graphit', 'oxid'], anode: true,
    text:
      'An – Ox – Ab: An der Anode findet die Oxidation statt, dort werden Elektronen abgegeben. Kat – Red – Auf: An der Kathode findet die Reduktion statt. ' +
      'Beim Entladen ist die Graphit-Halbzelle die Anode (Minuspol), beim Laden die Cobalt-Oxid-Halbzelle (Pluspol). Frag dich immer zuerst: Wo werden Elektronen abgegeben?',
    eq: [['Entladen', 'Anode = Graphit-Halbzelle (Minuspol)'], ['Laden', 'Anode = Cobalt-Oxid-Halbzelle (Pluspol)']],
    aufgabe: 'Merkhilfe: An – Ox – Ab und Kat – Red – Auf. Beobachte, wo beim Entladen und wo beim Laden Elektronen abgegeben werden. Welche Elektrode ist jeweils die Anode? (V1)',
  },
];

// Schülerfassung: Nummern wie in Abb. A des Aufgabenblatts (A1), ohne Namen
export const TASK_PARTS = [
  { no: 1, id: 'graphit', anchor: 'graphit' },
  { no: 2, id: 'oxid', anchor: 'oxid' },
  { no: 3, id: 'elektrolyt', anchor: 'elektrolyt' },
  { no: 4, id: 'separator', anchor: 'separator' },
  { no: 5, id: 'lampe', anchor: 'lampe' },
  { no: 6, id: 'li', anchor: 'dyn:elyt0' },
];
