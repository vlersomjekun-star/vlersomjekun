# Raport Faza 6 — Mjekë Familjes dhe Qendrat Shëndetësore

Data: 2026-07-03

## HAPI 1 — Sondazh API (scripts/family-doctors/probe-api.ts)

Rezultat: **API_NOT_FOUND**. 13 endpoint të mundshëm u sonduan:
- `portaliimjekut.gov.al/api/*` → mbrojtur nga **Incapsula/Imperva WAF** (faqe sfide JS,
  jo JSON real — sinjal eksplicit anti-automatizim). NDALUAR menjëherë, siç kërkon
  rregulli i projektit ("nëse kërkon login → ndalo, mos insisto").
- `shendeti.gov.al`, `fsdksh.gov.al`, `api.shendeti.al` → DNS/timeout, asnjë API publike.

Konfirmon analizën paraprake të task-ut: Portali i Mjekut të Familjes është një SPA
e mbyllur pas login-it e-Albania, e mbrojtur shtesë nga WAF. Rrugë e mbyllur.

## Burimi A — FSDKSH Raport Vjetor 2024 (PDF)

Shkarkuar me 1 kërkesë të vetme (1.5 MB). Ekstraktuar me `pdf-parse` (89 faqe).

**Gjetje e vlefshme (validim)**: konfirmohet numri zyrtar prej **1,483 Mjekë të
Përgjithshëm dhe të Familjes** kombëtare (Dhjetor 2024), plus tabela e numrit të QSH
për DRF (zyrë rajonale FSDKSH — jo saktësisht qark):

| DRF | Nr. QSH | Mjekë |
|---|---|---|
| Berat | 21 | 98 |
| Dibër | 28 | 77 |
| Durrës | 32 | 353 |
| Elbasan | 46 | 251 |
| Fier | 23 | 162 |
| Gjirokastër | 18 | 79 |
| Kamëz-Vorë | 8 | 131 |
| Korçë | 25 | 113 |
| Kukës | 16 | 50 |
| Lezhë | 18 | 125 |
| Lushnje | 17 | 84 |
| Pogradec | 8 | 49 |
| Sarandë | 13 | 42 |
| Shkodër | 31 | 179 |
| Tiranë | 27 | 697 |
| Tropojë | 8 | 19 |
| Vlorë | 17 | 149 |
| **Total** | **356** | — |

**Kufizim**: raporti NUK përmban listë emrash individualë QSH (vetëm 8 mencione të
fjalës "QSH" në tërë dokumentin, të gjitha në kontekste financiare/statistikore
agregate). Prandaj s'mund të përdoret për të krijuar rekorde Clinic të emërtuara —
vetëm si burim validimi në këtë raport.

## Burimi B — OpenStreetMap (i vetmi me emra reale)

Ripërdorur `scripts/osm/output/osm-raw.json` (Faza 4, 1269 elementë).
Filtruar me fjalë kyçe (qendër shëndetësore, QSH, poliklinikë, ambulancë),
përjashtuar farmaci/veterinare/dentare/klinika private me emra të ngjashëm.

- Kandidatë QSH-like: 30
- **QSH të krijuara si Clinic (sectorType PUBLIC): 22**
- Skip (pa qytet të përcaktueshëm nga koordinatat): 8

Shpërndarja: Tiranë 11, Shkodër 4, Korçë 2, Durrës/Vlorë/Elbasan/Fier/Gjirokastër 1 secili.

Idempotencë e verifikuar (2 ekzekutime → 0 duplikatë të krijuar në të dytën).

## Burimi C — shendetesia.gov.al

Kontrolluar; nuk u gjet listë e strukturuar publike (HTML/PDF) e QSH-ve e
adresueshme pa navigim manual. S'u shty më tej sipas rregullit anti-guess.

## HAPI 3-4 — Linkimi mjek→QSH (admin, manual)

Meqë asnjë burim automatik s'dha emra QSH në shkallë të mjaftueshme, u ndërtua
infrastruktura e planifikuar në HAPI 3: **asnjë lidhje automatike mjek→QSH**.

- 3,304 mjekë me specialty "Mjek i Përgjithshëm" në DB (nga UMSH, Faza 1)
- Shënuar `familyLinkStatus: UNLINKED_FAMILY_DOCTOR` për 3,253 pa klinikë
  (50 kishin tashmë klinikë nga Faza 2 — scraper klinikash private)
- **Admin UI `/admin/family-doctors`**: filtër për qark, tabelë me checkbox,
  select QSH, buton "Lidh të zgjedhurit" (bulk assign), progress bar.
  Testuar drejtpërdrejt në shfletues: 2 mjekë lidhur me sukses (50→52),
  1 shkëputur (52→51) — cikli i plotë funksionon.

## HAPI 5 — Template fallback (Excel)

Gjeneruar `scripts/family-doctors/output/manual-import-template.xlsx` me
**3,253 rreshta** (mjekë të palidhur), kolonat FirstName/LastName/Specialty/City/
QSH_Name/QSH_Address (+ DoctorId i brendshëm për match të saktë në riimport).
Damiano e plotëson me njohuri lokale → `npx tsx scripts/family-doctors/import-from-xlsx.ts`.

## Rezultati final (HAPI 6)

| Metrikë | Para Fazës 6 | Pas Fazës 6 |
|---|---|---|
| Mjekë familjes me klinikë | 50 | 51 (+ testim; 3,253 gati për linkim admini) |
| QSH publike në DB | 0 | 22 |
| Sektori i klinikave i klasifikuar | jo | PUBLIC/PRIVATE (fushë e re) |

**Konkluzion**: siç parashikohej në "Nota operativa" e task-ut, importi automatik
solli mbulim modest (22 QSH nga OSM, 0 nga API/PDF-listë emrash). Vlera kryesore
e fazës është infrastruktura: admin UI për linkim manual + shpejtë (bulk), dhe
template Excel për plotësim me njohuri lokale. Build i pastër, asnjë lidhje e
gabuar automatike (rreziku i "gabimit të shumëzuar x3253" i shmangur plotësisht).
