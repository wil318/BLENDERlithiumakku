# Protokoll – 3D-Modell „Der Lithium-Ionen-Akku“

Laufendes Arbeitsprotokoll (neueste Einträge unten).

## 17.11.2026

### Auftrag und Grundlage
- 3D-Modell der Elektrodenprozesse im Lithium-Ionen-Akku im Stil von `BLENDERgehirn`, mit dem lokalen Blender (4.0.2).
- Grundlage: `Chemie-Modul-Elektrochemie/PROJEKT-UEBERGABE.md`, die beiden Word-Dateien (Einstiegstext und Infotext mit Aufgaben) und `Quellen/schema.py` (Geometrie und Farben von Abb. 1–3).

### Entscheidungen im Planungsgespräch
| Frage | Entscheidung |
| --- | --- |
| Ausgabe | Web-App wie beim Gehirn **und** gerendertes Video |
| Detailgrad | Schemaansicht wie Abb. 1, per Knopf **Kristallansicht** |
| Inhalte | Elektronen sichtbar auf dem Draht, Co⁴⁺ ↔ Co³⁺ sichtbar, Gleichungen einblendbar, Ladestand-Anzeige |
| Einsatz | Rundgang **und** Aufgabenmodus passend zu Abb. 2 |
| Hintergrund | dunkel wie beim Gehirn, Graphit aufgehellt |
| Lösungen im Rundgang | **Gleichungen, Pfeile und die Pole des Ladegeräts erst auf Klick** |
| Video | Eevee, 1080p, ca. 90 s, Texte im Bild |
| Veröffentlichung | zunächst nur lokal, GitHub später |
| Teilchenzahl | 6 wandernde Li⁺ + 2 Li⁺, die immer im Elektrolyten bleiben |
| Wanderung | dasselbe Li⁺ wandert von Elektrode zu Elektrode (Vereinfachung, s. u.) |
| Cobalt | nur die 6 Cobalt-Ionen an den Li⁺-Plätzen wechseln die Farbe (Vereinfachung, s. u.) |

### Umsetzung
- **Blender-Skript** `blender/build_akku.py`: Maßstab = `schema.py` × 2, Mitte bei x = 0. Graphit links (6 Platten an einem Ableiter), Lithium-Cobalt-Oxid rechts (6 Schichten zu je 8 × 10 Kugeln), Elektrolyt-Behälter, gestrichelter Separator (Li⁺ wandert durch die Lücken), Draht mit Lämpchen (Kreis mit Kreuz) bzw. Ladegerät, Polzeichen, Pfeile.
- **Kristallansicht:** Graphit als Bienenwaben-Schichten (116 C-Atome je Schicht); die Li⁺-Plätze liegen über den Sechseck-Mitten. Oxid als CoO₂-Schichten: eine Co-Ebene (blau) zwischen zwei O-Ebenen (hellgrau, bewusst nicht rot, weil Rot für Elektronen steht).
- **Bewegung:** Jedes der 6 wandernden Li⁺ hat einen festen Weg (Graphit-Platz → Lücke im Separator → Oxid-Platz), jedes Elektron einen Weg über Ableiter, Draht und Lämpchen bis zum Cobalt-Ion. Beide laufen im selben Zeitfenster, also gleichzeitig. Die Fenster sind gestaffelt (`WINDOWS`). Ein einziger Wert `s` (0 = voll, 1 = leer) beschreibt den Zustand. Laden ist exakt die Umkehrung (s läuft zurück).
- Im geladenen Zustand sitzt neben jedem Li⁺ im Graphit ein Elektron. Das zeigt „LiC₆: ein Li⁺ und ein zusätzliches Elektron“ aus dem Infotext. Am Pluspol verschwindet das Elektron im Cobalt-Ion, das dabei von violett (Co⁴⁺) zu blau (Co³⁺) wechselt. Beim Laden ist es umgekehrt.
- **Export:** `web/models/akku.glb` (0,74 MB). Der lokale Blender hat kein Draco, deshalb gehen die Kugelgitter als eine Vorlage + Positionen in `meta.json` und werden im Viewer als `InstancedMesh` aufgebaut.
- **Web-App** (`web/`): Design, Bedienung und PWA vom Gehirn übernommen. Neu sind Akku-Steuerung (Ladestand, Entladen, Laden), Aufdeck-Knöpfe in den Stationen, 3D-Gleichungskästen über den Elektroden, Co⁴⁺/Co³⁺-Schildchen, Anode/Kathode-Schildchen und der Aufgabenmodus.
- **Video:** Die Animation ist in `blender/akku.blend` gekeyframet (2250 Bilder, 25 fps). Titel, Erklärungen, Gleichungen und Beschriftungen setzt `video/video_overlay.py` nachträglich ein (Positionen aus `video/plan.json`).

### Farben (Abschnitt 4 der Übergabe) – Anpassungen für den dunklen Hintergrund
| Element | Abb. | Modell | Grund |
| --- | --- | --- | --- |
| Graphit | `#3d3d3d` | `#6e7680` | sonst auf `#060c18` unsichtbar |
| Separator | `#555555` | `#98a1ae` | dto. |
| Draht | `#222222` | `#aab3c0` | dto. |
| Polzeichen | schwarz | hellgrau | dto. |
| Elektronen | `#c0392b` | `#d8432f` | etwas heller |
| Co⁴⁺ | – | `#b47cff` (violett) | neu, Co³⁺ behält das Blau der Abbildung `#2f6db5` |
| Li⁺, Oxid, Lämpchen, Pfeile | wie Abb. | wie Abb. | – |

### Hinweise für die Lehrkraft: bewusste Vereinfachungen
Diese Punkte stehen nur hier und nicht in den Schülertexten:
1. **Dasselbe Li⁺ wandert durch.** Im realen Akku tritt am Pluspol meist ein anderes Li⁺ aus dem Elektrolyten in die Elektrode ein als das, das den Graphit verlassen hat. Die Konzentration im Elektrolyten bleibt dabei gleich. Die 2 Li⁺, die immer im Elektrolyten bleiben, deuten das gelöste Lithiumsalz an.
2. **Teilchenzahlen.** In Abb. 1/2 sind 8 Li⁺ zu sehen, in Abb. 3 nur 6. Das Modell nutzt 6 wandernde + 2 ständige Li⁺. Voll geladen: 6 / 2 / 0 (Graphit / Elektrolyt / Oxid), leer: 0 / 2 / 6.
3. **Cobalt.** Nur die 6 Cobalt-Ionen an den Li⁺-Plätzen wechseln die Farbe. Die übrigen Kugeln gelten als „Gerüst“. Wörtlich genommen müsste im vollen Akku jedes Co ein Co⁴⁺ sein.
4. Aus dem Infotext übernommen: LiCoO₂ wird real nur bis etwa Li₀,₅CoO₂ **geladen** (nicht „entladen“, wie es in einer früheren Fassung hieß), und Graphit ist selten vollständig zu LiC₆ beladen.
5. Die Elektronen sind als Kügelchen gezeigt, die mit den Li⁺ gleichzeitig ankommen. Dass Strom im Draht „sofort“ fließt, während einzelne Elektronen langsam driften, wird nicht dargestellt.
6. Der Separator ist als gestrichelte Wand mit großen Lücken gezeichnet (wie in Abb. 1). Echte Poren sind viel kleiner.
7. Die Farben der Ionen sind Lehrfarben, keine echten Stofffarben.

### Lösungen hinter Klicks
- Rundgang: In den Stationen 4–7 und 9 gibt es die Knöpfe „Gleichung(en) zeigen“, „Pfeile zeigen“ bzw. „Pfeile & Pole zeigen“ und „Anode / Kathode zeigen“. Beim Stationswechsel werden sie wieder verdeckt.
- Die Bewegung selbst läuft in allen Stationen automatisch. Die Wanderrichtung der Li⁺ steht ohnehin im Infotext (Abschnitt 3).
- Info-Panel und Stationstexte gehen nicht über den Infotext hinaus. Donator/Akzeptor, Teilgleichungen und Ladungsbilanz stehen nur hinter Klicks.
- Aufgabenmodus: Nummern 1–6, ohne Bauteil-Liste und ohne Namen beim Anklicken oder Überfahren. Pfeile, Gleichungen und die Pole des Ladegeräts bleiben verdeckt, bis man die Knöpfe drückt.
- Das **Video** zeigt alles (Pfeile, Pole, Gleichungen). Es ist für die Sicherung gedacht.

### Offen
- Texte der Stationen von der Lehrkraft prüfen lassen (`web/src/content.js`).
- Test auf dem iPad (Touch, Leistung) steht aus.
- Veröffentlichung auf GitHub Pages: später entscheiden.

## 24.11.2026 – Anpassung an den neuen Infotext, zwei Fassungen

### Grundlage
- `Chemie-Modul-Elektrochemie-neu/`: Infotext Abschnitte 9 und 11–13 (`Infotexte-…_korrigiert.odt`), `Aufgabenblatt-2-Lithium-Ionen-Akku_korrigiert.odt`, `Loesungsblatt-2-Lithium-Ionen-Akku.odt`.
- Die alte `PROJEKT-UEBERGABE.md` ist teilweise überholt.

### Entscheidungen
| Frage | Entscheidung |
| --- | --- |
| Gleichungen | neue Form wie Infotext/Lösungsblatt: Minuspol C₆⁻ → C₆ + e⁻, Pluspol Co⁴⁺ + e⁻ → Co³⁺, gesamt C₆⁻ + Co⁴⁺ → C₆ + Co³⁺ (Laden umgekehrt). LiC₆, CoO₂ und LiCoO₂ bleiben als Zustandsnamen |
| Begriffe | „Graphit-Halbzelle“ (Minuspol) und „Cobalt-Oxid-Halbzelle“ (Pluspol); Separator lässt „freie Elektronen nicht“ durch |
| Fassungen | wie Gehirn und Verkupfern: `index.html` = Vollfassung (Gleichungen, Pfeile, Pole des Ladegeräts, Anode/Kathode direkt sichtbar), `index.html?aufgabe` = Schülerfassung |
| Aufgabenmodus | geht in `?aufgabe` auf: Nummern 1–6 wie Abb. A (ohne Namen), keine Bauteil-Liste, kein Anklicken von Namen, Stationen mit Beobachtungsaufträgen zu A1–A4 und V1, neutrale Stationstitel. Der Knopf „Aufgaben“ entfällt |
| Video | wird mit den neuen Gleichungen und Begriffen neu gerendert |

### Fachlich
- Begründung, warum Li⁺ wandert, jetzt wie in Abschnitt 12: Beim Entladen wird die Graphit-Halbzelle positiver und die Cobalt-Oxid-Halbzelle negativer. Die Li⁺ wandern deshalb dorthin, wohin auch die Elektronen fließen, und gleichen die negative Ladung aus.
- Korrigiert (aus der alten Übergabe übernommen): LiCoO₂ wird real nur bis etwa Li₀,₅CoO₂ **geladen**.

## 26.11.2026 – C₆-Einheiten am Minuspol

### Anlass
Am Pluspol sieht man ein bestimmtes Teilchen seine Ladung ändern (Co⁴⁺ violett → Co³⁺ blau, mit Schildchen). Am Minuspol lag dagegen nur ein Elektron neben dem Li⁺. Ein Teilchen „C₆⁻“, das zu „C₆“ wird, war nicht zu sehen. So konnten die Lernenden die Teilgleichung C₆⁻ → C₆ + e⁻ kaum ablesen.

### Umsetzung (Blender und Viewer, Video noch nicht neu gerendert)
- Unter jedem der 6 Li⁺-Plätze in der Graphit-Halbzelle ist ein **Sechsring als C₆-Einheit** markiert:
  - Schemaansicht (`C6s_1…6`): Ring auf der Graphitplatte.
  - Kristallansicht (`C6k_1…6`): die 6 C-Atome des Gitter-Sechsecks direkt unter dem Li⁺.
- Das zusätzliche Elektron sitzt **in der Mitte des Rings**, nicht mehr daneben. Das Li⁺ sitzt etwas höher darüber, man sieht also LiC₆ = Li⁺ + C₆⁻ als Paar.
- **Farben:** C₆⁻ ist ein rötlicher Ring `#d8665a` (Elektronenüberschuss). Sobald das Elektron den Ring verlässt, wird er grau `#a3aab3` (C₆). Beim Laden läuft es umgekehrt. Das entspricht der Logik am Pluspol: violett = Elektronenmangel (Co⁴⁺).
- **Schildchen C₆⁻/C₆** gibt es in beiden Fassungen, wie Co⁴⁺/Co³⁺. Sie sind Beobachtung, keine Lösung. In den Messwerten steht „C₆⁻ / C₆“.
- Stationstexte 2, 4 und 6 (Voll- und Schülerfassung) sind angepasst, dazu kommt ein neuer Eintrag „C₆-Einheiten“ im Info-Panel (Vollfassung).
- Die Blender-Szene enthält die C₆-Animation schon (Materialfarbe gekeyframet). Das Video `akku.mp4` ist aber noch die alte Fassung.

### Hinweis für die Lehrkraft (bewusste Vereinfachung)
Im echten Graphit gehört das zusätzliche Elektron keinem bestimmten Sechsring, es ist über die Schicht verteilt (delokalisiert). Die C₆-Einheit ist eine **Rechen-Einheit** („Für Gleichungen betrachten wir immer 6 Kohlenstoffatome“, Infotext Abschnitt 11). Das Modell zeigt sie wie die markierten Cobalt-Ionen als einzelnes Teilchen.

### Nachtrag: Zeitpunkt des Farbwechsels
- Bisher wechselten die Cobalt-Ionen die Farbe schon bei 90 % des Elektronenwegs. Das Elektron war da noch 2,5–3 Einheiten entfernt, im Ableiter.
- Jetzt berechnet das Skript für jedes Elektron den Punkt, an dem es das Cobalt-Ion erreicht (`u_arrive` in `meta.json`). Erst dann wird Co⁴⁺ zu Co³⁺, und das Elektron verschwindet im Ion.
- Ebenso wird der C₆-Ring grau, während das Elektron ihn verlässt (`u_depart`). Beim Laden läuft alles umgekehrt.
- Viewer und Blender-Szene nutzen dieselben Werte. Das Video ist noch nicht neu gerendert.

### Video neu gerendert (26.11.2026)
- `video/akku.mp4` zeigt jetzt die C₆-Ringe (C₆⁻ rötlich → C₆ grau) und den Farbwechsel der Cobalt-Ionen erst bei Ankunft des Elektrons.
- In der Graphit-Nahaufnahme steht die neue Beschriftung „C₆⁻-Einheit mit zusätzlichem e⁻“.
