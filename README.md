# Der Lithium-Ionen-Akku – interaktives 3D-Modell

3D-Modell der Elektrodenprozesse im Lithium-Ionen-Akku für den Chemieunterricht in Klasse 9 (Blender → Three.js, Stil wie `BLENDERgehirn`).
Es passt inhaltlich und optisch zum Infotext und zu den Arbeitsblättern des Unterrichtsmoduls (die liegen nicht im Repo).

**Online:** https://wil318.github.io/BLENDERlithiumakku/ · Schülerfassung: https://wil318.github.io/BLENDERlithiumakku/?aufgabe

- **Rundgang** mit 9 Stationen: Aufbau → Graphit-Halbzelle → Cobalt-Oxid-Halbzelle → Entladen am Minuspol → Entladen am Pluspol (Co⁴⁺ → Co³⁺) → Akku leer → Laden → Schaukelstuhl-Prinzip → *optional* Anode und Kathode.
- **Zwei Fassungen** über die Adresse (wie beim Gehirn und beim Verkupfern):
  - `index.html` ist die **Vollfassung**. Gleichungen (C₆⁻ → C₆ + e⁻, Co⁴⁺ + e⁻ → Co³⁺ …), Pfeile, die Pole des Ladegeräts und Anode/Kathode sind direkt sichtbar.
  - `index.html?aufgabe` ist die **Schülerfassung**. Sie hat dieselben Stationen, aber nur Beobachtungsaufträge zu Aufgabenblatt 2 (A1–A4, V1) und die Nummern 1–6 wie in Abb. A. Es gibt keine Bauteil-Liste, keine Namen und keine Lösungen.
- **Akku-Steuerung** oben rechts: Ladestand, *Entladen* (Lämpchen leuchtet) und *Laden* (Ladegerät).
- **Kristall:** schaltet von der Schemaansicht auf Graphit-Sechseckschichten und CoO₂-Schichten (Co blau, O hellgrau) um.
- **Video** `video/akku.mp4` (90 s, 1080p, Eevee) mit Titel, Erklärungen und Gleichungen im Bild, für den Beamer ohne Internet.

## Lokal ansehen

```bash
python3 serve.py
```

Dann http://127.0.0.1:5174 öffnen (Schülerfassung: http://127.0.0.1:5174/?aufgabe). Es gibt keinen Build-Schritt und kein npm. Three.js wird per Import-Map von jsDelivr geladen, beim ersten Aufruf ist also Internet nötig.

## Modell bauen

```bash
./build.sh            # Modell + Vorschaubild + Icons (≈ 10 s)
./build.sh --video    # zusätzlich das Video (≈ 45 min)
```

`blender/build_akku.py` erzeugt die Szene komplett per Python (getestet mit Blender 4.0.2). Am Skriptanfang stehen die Farben (`C`), die Plätze der Teilchen (`G_SITES_RAW`, `O_SITES`), die Zeitfenster (`WINDOWS`) und das Drehbuch des Videos (`S_KEYS`, `CAM_KEYS`, `CAPTIONS`, `EQUATIONS`, `LABELS`).
Viewer und Video lesen dieselben Wege aus dem Skript, deshalb laufen die Teilchen in beiden gleich.

## Aufbau

- `blender/build_akku.py`: Szene, Export (`web/models/akku.glb`, `meta.json`), Vorschaubild, Icons, `akku.blend` mit Video-Animation, `video/plan.json`
- `video/video_overlay.py`: blendet Texte in die Einzelbilder ein und erzeugt `video/akku.mp4` (Pillow + ffmpeg)
- `web/`: statische Seite (`index.html`, `src/main.js`, `src/content.js` = alle Texte, `src/style.css`), PWA (`manifest.webmanifest`, `sw.js`)
- `docs/PROTOKOLL.md`: Arbeitsprotokoll mit allen fachlichen Entscheidungen und Vereinfachungen
