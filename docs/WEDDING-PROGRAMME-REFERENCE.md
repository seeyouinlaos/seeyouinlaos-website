# H&S Wedding · verbindlicher Programm- und Website-Stand (Referenz und Backup)

| | |
|---|---|
| **Version** | 1.1 · 24. November 2026 (v1.0 angelegt **vor** der Änderung HS-058.18, Commit c1d8a07; v1.1 nach der Umsetzung, Abschnitt 9) |
| **Basis** | `main` 60ef6e8 (live) · Task-Branch `hs-058-18-pool-area` |
| **Auftrag** | Owners, 24.11.2026 (HS-058.18): Wedding Dinner zurück an den Poolbereich, Wedding Schedule website-weit abgleichen, Karte zurück auf Pool Area, letztes Hero-Video entfernen |
| **Zweck** | Eine Stelle, an der der verbindliche Ablauf und alle Seiten, Komponenten und Datenquellen stehen, die ihn zeigen. Jede künftige Änderung am Programm prüft diese Liste. |
| **Regeln** | Das Repository ist öffentlich: keine Hotel-Zimmernummern, keine Gästedaten, keine Einladungscodes, keine Inhalte des Master Brief. Bestehende Dokumentation und historische Daten werden nicht überschrieben; neue Stände kommen als neue Version (Abschnitt 8). |

Quelle der Wahrheit für das Programm ist die ausdrückliche Owner-Entscheidung. Interne Planungswerte des Operations Master
(Tab `000_Master_Timeline`) werden nicht automatisch übernommen (Abschnitt 7).

---

## 1. Der verbindliche Ablauf

### Samstag, 27. Februar 2027 · Vientiane

| Zeit | Programmpunkt | Ort | Hinweise |
|---|---|---|---|
| ganztägig | Anreise · Wedding Stay beginnt | Souphattra Heritage Vientiane · Lobby (Building A: Reception & Check-in) | Website: „The wedding stay · 27 February – 1 March 2027“; Zimmer „Up to four nights · 25 February – 1 March“; Lobby „Arrival · 25 or 27 February“ |
| 18:30 | **Pre-Wedding Dinner** | Cảm Ơn – Pho, Banh Mi & Coffee, Rue Manthatourath, Vientiane (Google-Maps-Link auf der Seite) | Owner-Auftrag 22.11.2026 (HS-058). Menüvorauswahl in My Profile: 2 Speisen · 1 Getränk · 1 Dessert, complimentary. Seite `pre-wedding-dinner.html` |

**„Welcome Day“:** Diesen Begriff gibt es auf der Website nicht. Die Website kennt den 27. Februar als Anreisetag des Wedding Stay
und den Pre-Wedding Dinner. Der Operations Master nennt intern einen „Welcome Moment“ am 27.02. (siehe Abschnitt 7); er ist nicht
Teil des Website-Programms und wird nicht ergänzt.

### Sonntag, 28. Februar 2027 · der Hochzeitstag („One day, four moments.“)

| Zeit | Programmpunkt | Ort | Dresscode | Gastgeber |
|---|---|---|---|---|
| 09:00 – about 12:00 | **Temple Ceremony** (mit Morning Alms-Giving, Tak Bat / Sai Bat, eigene Gabe) | Wat Ong Teu, Vientiane | Lao Traditional Dress | Sangkhathan Temple Offering optional, USD 15 pro Person (eigene Gabe) |
| 12:00 – 15:30 | **Coffee & Cake** („On the return“) | Souphattra Heritage · Peacock Bistro (Building F) | Resort Wear | Haruthai & Suthep |
| 15:30 | **Vow Ceremony** | Souphattra Heritage · **Green Doors** (zwischen Lobby und Peacock Bistro) | Black Tie | Haruthai & Suthep |
| 19:30 | **Wedding Dinner** | Souphattra Heritage Vientiane · **Pool Area** | Black Tie | Haruthai & Suthep, Getränke zum Dinner inklusive; später am Abend eigene Getränke |
| danach | BARON Vientiane · VIP After Party („The wedding night“) | BARON, Vientiane (Google Maps) | – | kein Ticket, keine Liste |

**Verbindliche Änderung (Owners, 24.11.2026):** *Wedding Dinner – 28 February 2027, 19:30 – Pool Area, Souphattra Heritage Vientiane.*
Das Dinner findet wieder im Poolbereich statt, nicht mehr an den Green Doors. Die Vow Ceremony bleibt an den Green Doors.
Datum, Uhrzeiten und Reihenfolge aller Programmpunkte bleiben unverändert.

**Wedding Dinner im Detail:** eine lange Tafel mit 54 Plätzen (Seite A 27, Seite B 27; A1–A12, A14–A28 · B1–B12, B14–B28), zwei davon
für das Brautpaar. Seite A liegt am Pool, Seite B gegenüber (Owner, 15.09.2026: „run A = poolside“). Set Menu, chinesisch, zum Teilen
am Tisch (Datensatz `assets/wedding-dinner.js`).

**Vow Ceremony im Detail:** die festen Plätze von Braut und Bräutigam vorne in der Mitte und 52 wählbare Gästeplätze (links 11 Reihen × 2,
rechts 10 Reihen × 3, Mittelgang).

### Dresscodes (`dress.html`)

| Anlass | Dresscode |
|---|---|
| Temple Ceremony | Lao Traditional Dress (Schultern und Knie bedeckt, Schuhe vor dem Tempel aus; Leihkleidung über Guest Relations) |
| Coffee & Cake | Resort Wear |
| Vow Ceremony und Wedding Dinner | Black Tie („From the Vow Ceremony until the end of dinner, the day is black tie.“) |

Gäste bestätigen den Dresscode in ihrer Einladung (Wedding Preparation).

---

## 2. Orte, Karte, Navigation und Wege

**Souphattra Heritage Vientiane** – Lageplan `assets/images/venue/souphattra-site-plan.svg` (schematisch, nicht maßstäblich, nach dem
offiziellen Hotelplan; keine Zimmernummern, keine Belegung). Er erscheint auf `voyage.html`, `index.html`, `accommodation.html` und in
My Profile („Where you stay“, mit dem eigenen Gebäude).

| Ort auf dem Plan | Nutzung (Zielstand) |
|---|---|
| Lobby (Building A) | Reception & Check-in |
| Peacock Bistro (Building F) | Breakfast · Coffee & Cake |
| Green Doors | **Vow Ceremony** |
| **Pool Area** (zentraler Pool mit Deck) | **Wedding Dinner** |
| Peacock Court | – |
| Garden | – |
| Guest Rooms | Buildings B, C, D und E |

Die Position des Dinners am Pool entspricht der Owner-Zuordnung vom 16.09.2026 auf dem damaligen Luftbild („centre pool / poolside →
Wedding Dinner“).

**Wege:** Die Website enthält keine eigene Wegbeschreibung zwischen Vow Ceremony und Dinner. Der Lageplan zeigt Green Doors und Pool Area
mit den Wegen dazwischen. Externe Karten-Links: Cảm Ơn (Pre-Wedding Dinner, Google Maps), BARON (Google-Maps-Suche). Für das Souphattra
Heritage gibt es keinen separaten Kartenlink zum Dinner.

**Navigation (Menü, `assets/aman.js`):** The Wedding → `voyage.html` mit „Pre-Wedding Dinner · 27 February“ → `pre-wedding-dinner.html`
und „Wedding Dinner“ → `voyage.html#dinner`. Mobile und Desktop nutzen dasselbe Menü.

---

## 3. Gästeinformationen und organisatorische Hinweise

- Coffee & Cake, Vow Ceremony und Wedding Dinner sind für jeden Gast Gastgeberleistung von Haruthai & Suthep; Getränke zum Dinner
  inklusive, später am Abend eigene Getränke. Die Gaben im Tempel sind die eigenen.
- Jeder Gast beantwortet jeden der vier Programmpunkte (joining · not joining · not yet decided) in „The Wedding“ (`wedding.html`).
- Sitzplätze: Ceremony- und Dinner-Platz wählt der Gast in Wedding Preparation; Seat Tickets in `tickets.html`; die Owners verwalten alle
  Plätze in der Admin-Konsole (Seating).
- Wedding Stay: erste Nacht auf eigene Kosten, zweite Nacht complimentary (Haruthai & Suthep).
- Pre-Wedding Dinner: Menüauswahl in My Profile, „submitted“, Änderung über „Change my order“; nichts geht automatisch ans Restaurant.

---

## 4. Seiten, Komponenten, Datenquellen und Abhängigkeiten

| Datenquelle (eine Stelle) | Inhalt | Wird gezeigt in |
|---|---|---|
| `assets/temple.js` `EVENTS` | die vier Programmpunkte mit Zeit und Ort (Antworten je Gast) | `wedding.html`, `wedding-preparation.html`, `voyage.html`, `review.html`, `your-journey.html`, `profile.html`, `invitation.html`, `cart.html`, `tickets.html`, `about-you.html` |
| `assets/journey.js` `WEDDING` | Programmzeilen im persönlichen Ablauf (My Trip) | `your-journey.html`, `profile.html`, `review.html`, `journeys.html`, `room.html`, `cart.html`, `invitation.html`, `voyage.html`, `wedding.html`, `wedding-preparation.html`, `tickets.html`, `transport.html`, `about-you.html` |
| `assets/wedding-dinner.js` `WD` | Dinner: Ort, Text, Sitzordnung, Galerie, Set Menu | `voyage.html#dinner`, `profile.html` |
| `assets/venue-data.js` + `assets/venue.js` + Lageplan-SVG | Lageplan, Legende, Orte mit Fotos | `voyage.html`, `index.html`, `accommodation.html`, `profile.html` |
| `assets/seating.js`, `assets/seatlabels.js`, `assets/seatpass.js` | Sitzpläne (Zeichnung Dinner-Tafel), Platzbezeichnungen, Seat Tickets und PDF | `wedding.html`, `wedding-preparation.html`, `tickets.html`, `review.html`, `your-journey.html`, `profile.html`, `invitation.html`, `cart.html`, `transport.html`, `about-you.html` |
| `assets/admin-assign.js`, `src/billing/assignments.js` `EVENTS` | Admin-Konsole: Sitzplatzverwaltung, Veranstaltungsdaten | `/admin/billing` (Seating, Room assignments) |
| `src/mail-templates.js` | E-Mails mit Programm und Plätzen | Bestätigungs- und Ablauf-Mails |
| statische Seitentexte | Programm-Intro, Eyebrows, Karten | `index.html`, `voyage.html`, `wedding.html`, `wedding-preparation.html`, `profile.html`, `experiences.html`, `journey/index.html` |
| `assets/experiences.js` | BARON, Restaurants, Cafés | `experiences.html`, `experience.html`, `profile.html` |
| `src/i18n-th.json` → `assets/i18n/th.js`, `src/i18n-th.dict.js`, `assets/i18n/catalog.js` | Thai-Fassung aller Texte | jede Seite in Thai |
| `src/release-check.cjs` Gate P8 | prüft Ort und Zeit des Dinners auf `voyage.html` | Release |
| `src/media/manifest.json` (Sammlung 001) → `src/build-hero.cjs` | Hero-Slider der Startseite | `index.html` |

Nach jeder Änderung an Skripten werden die Versionsstempel aller Seiten erneuert (`src/asset-versions.cjs`, Gate C1).

---

## 5. Stand vor dieser Änderung (Backup · `main` 60ef6e8)

Wiederherstellbar mit `git show 60ef6e8:<datei>`.

**Wedding Dinner an den Green Doors (Owner-Entscheidung 22.11.2026, HS-058.9/.10):**

| Datei | bisheriger Text |
|---|---|
| `voyage.html` | Eyebrow „19:30 · Souphattra Heritage · Green Doors“; „An evening at the Green Doors, bringing the wedding day …“; Intro „… the vows and the dinner at the Green Doors.“ |
| `index.html` | „… the vows and the dinner at the Green Doors.“ · „… from the temple in the morning to dinner at the Green Doors.“ |
| `wedding.html` | Intro „… the vows and the dinner at the Green Doors.“ |
| `wedding.html`, `wedding-preparation.html` | Dinner-Platz „Souphattra Heritage · Green Doors · 28 February · 19:30“ |
| `profile.html` | Karte Wedding Dinner: „Souphattra Heritage, Vientiane · Green Doors“ |
| `assets/temple.js`, `assets/journey.js`, `assets/seatlabels.js`, `src/billing/assignments.js` | „Souphattra Heritage Vientiane · Green Doors“ |
| `assets/seatpass.js` | „Wedding Dinner · Green Doors“ |
| `src/mail-templates.js` | „Souphattra Heritage · Green Doors“ |
| `assets/wedding-dinner.js` | place „Green Doors“; Sitzordnung „One long table at the Green Doors, with side A and side B.“ |
| `assets/seating.js` | Dinner-Plan ohne Wasser, Kopf „Wedding Dinner · Green Doors“, Seiten ohne Lagebezug |
| `assets/seatlabels.js`, `assets/admin-assign.js` | Seiten „side A“ / „side B“ ohne „poolside“ |
| `assets/venue-data.js` | Legende „Green Doors — Vow Ceremony · Wedding Dinner“, „Swimming Pool“ ohne Nutzung; Ort 05 „Wedding Dinner · Green Doors“ |
| Lageplan-SVG | Green Doors mit „VOW CEREMONY“ und „WEDDING DINNER“; Pool beschriftet „Swimming Pool“ |
| `assets/experiences.js`, `experiences.html` | BARON: „After the dinner at the Green Doors …“ |
| `journey/index.html` | „The day gathers at the Green Doors in golden hour …“ |
| `src/release-check.cjs` P8 | verlangt „19:30 · Souphattra Heritage · Green Doors“, verbietet „poolside“ im Dinner-Abschnitt |

**Davor (bis 22.11.2026, z. B. `0fac148`):** Dinner „poolside“, Tafel mit gezeichnetem Pool („Swimming pool“), Seite A „poolside“, Seite B
„facing the pool“. Diese Konfiguration ist die Grundlage der Wiederherstellung.

**Hero-Slider der Startseite (Sammlung 001, 6 Elemente, in dieser Reihenfolge):**
1. Video „000 - Hero_Main_Video 02“ (Terrasse am Meer bei Sonnenuntergang, ohne Ton) – zugleich das Startbild
2. Bild „001 - Hero“
3. Bild „002 - Hero“
4. Bild „003 - Hero“
5. Bild „004 - Hero“
6. Video „000 - Hero_Main_Video 01“ (nächtlicher Straßenverkehr, eingeblendeter Text „They say …“, mit Ton) – **wird entfernt**

---

## 6. Änderungen gegenüber dem bisherigen Stand (HS-058.18)

| # | Änderung | Umfang |
|---|---|---|
| 1 | Wedding Dinner: Ort „Pool Area“ statt „Green Doors“ überall, wo der Ort des Dinners steht | alle Datenquellen aus Abschnitt 4, statische Texte, E-Mails, Admin, Thai |
| 2 | Tafel wieder am Pool: Plan mit gezeichnetem Pool, Seite A „poolside“, Seite B „facing the pool“ (Konfiguration vor dem 22.11.2026) | `seating.js`, `seatlabels.js`, `admin-assign.js`, `wedding-dinner.js`, `venue-data.js` |
| 3 | Lageplan: „WEDDING DINNER“ von den Green Doors an den Pool; Pool als „Pool Area“ markiert; Legende entsprechend | SVG, `venue-data.js` |
| 4 | Vow Ceremony bleibt an den Green Doors; alle Zeiten und die Reihenfolge bleiben | – |
| 5 | Hero-Slider: nur das letzte Video („They say …“) entfernt; die Punkte zählen sich selbst (5 statt 6); das Video bleibt für die Bangkok-Karte erhalten | `src/media/manifest.json`, `index.html` (erzeugt) |
| 6 | Gate P8 und Tests auf den neuen Ort | `src/release-check.cjs`, `test/*` |

Nicht geändert: Buchungen, Preise, Zahlungen, Gästezuordnungen, Sitzplätze und Holds, Infrastruktur.

---

## 7. Abweichungen zu anderen Quellen (nicht übernommen, für die Owners)

- **Operations Master, Tab `000_Master_Timeline` (Stand 24.11.2026):** nennt intern u. a. Wedding ceremony 16:30–17:00 und Wedding Dinner
  19:15–21:30 sowie am 27.02. „Welcome Moment“ 15:15–16:00. Die Website zeigt die freigegebenen Zeiten (Vow Ceremony 15:30, Dinner 19:30);
  der Auftrag vom 24.11.2026 bestätigt 19:30. Nichts davon wurde übernommen.
- **Restaurantkarte Cảm Ơn (`assets/experiences.js`, `vte-camon`):** nennt „26 February Dinner“ und „27 February Lunch“, der Pre-Wedding
  Dinner ist am 27.02. um 18:30 (bekannter offener Punkt HS-058.4).

---

## 8. Versionen

| Version | Datum | Inhalt |
|---|---|---|
| 1.0 | 24.11.2026 | Angelegt vor HS-058.18: verbindlicher Ablauf, Backup des Stands 60ef6e8, geplante Änderungen |
| 1.1 | 24.11.2026 | HS-058.18 umgesetzt (lokal, Branch `hs-058-18-pool-area`, nicht veröffentlicht): Abschnitt 9 |

---

## 9. Umsetzung HS-058.18 (v1.1)

**Geänderte Dateien und Komponenten**

| Bereich | Dateien |
|---|---|
| Datensätze Programm | `assets/temple.js`, `assets/journey.js`, `assets/wedding-dinner.js` (Ort, Text, Sitzordnung, Galerie-Beschreibungen) |
| Sitzplan, Tickets, Admin | `assets/seating.js` (Tafel mit Pool, wie vor dem 22.11.), `assets/seatlabels.js`, `assets/seatpass.js`, `assets/admin-assign.js`, `src/billing/assignments.js` |
| Karte | `assets/images/venue/souphattra-site-plan.svg`, `assets/venue-data.js` |
| Seiten | `index.html`, `voyage.html`, `wedding.html`, `wedding-preparation.html`, `profile.html`, `experiences.html` (+ `assets/experiences.js`), `journey/index.html` (nicht ausgeliefert) |
| E-Mails | `src/mail-templates.js` |
| Thai | `src/i18n-th.json` (16 neue Einträge, nichts überschrieben) → erzeugt `assets/i18n/th.js`, `src/i18n-th.dict.js`, `assets/i18n/catalog.js` |
| Hero | `src/media/manifest.json` (Sammlung 001 „partial“, Element „000 - Hero_Main_Video 01“ „excluded“ mit Begründung) → erzeugt `index.html` |
| Gate und Tests | `src/release-check.cjs` (P8), `test/*` (Pool-Area-Prüfungen, neuer website-weiter Test in `test/wedding-dinner.test.mjs`) |
| Versionsstempel | alle Seiten, `src/admin-page.js` (erzeugt) |

**Ergebnis:** Das Wedding Dinner steht überall um 19:30 an der Pool Area; die Vow Ceremony bleibt um 15:30 an den Green Doors; Temple Ceremony
und Coffee & Cake unverändert. Der Lageplan zeigt „Pool Area · WEDDING DINNER“ in einer gestrichelten Zone um Pool und Deck. Der Hero
zeigt 5 Elemente mit 5 Punkten; das Video „They say …“ erscheint nicht mehr.

**Offene Punkte für die Owners:**
- Der Pool heißt auf dem Plan und in der Legende jetzt „Pool Area“; der Ortseintrag 06 mit Fotos heißt weiter „Swimming pool“.
- Seat Tickets nennen Seite A immer „poolside“ (Regel vom 15.09.2026); falls Guest Relations die Poolseite je auf B stellt, müsste das
  angepasst werden. Heute ist Seite A die Poolseite.
- Abweichungen in anderen Quellen (Abschnitt 7) bleiben unverändert.
