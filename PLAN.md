# Plán a znalostní báze — Rezervace Chromebooků a učeben

> **Tento soubor je sdílený plán napříč konverzacemi.** Každé sezení Claude je
> izolované a nevidí historii ostatních konverzací; jediné společné je tento
> repozitář. V nové konverzaci stačí říct „přečti si PLAN.md" a pokračovat odsud.
> Soubor obsahuje nejen seznam úkolů, ale i zjištění z auditu, konvence a
> otevřené otázky — aby nová konverzace mohla navázat bez ztráty kontextu.

Stav položek: ⬜ čeká · 🔄 rozpracováno · ✅ hotovo · ❌ zamítnuto/odloženo.
Vše se týká `index.html`, pokud není uvedeno jinak. **Zachováváme jednosouborovou
architekturu bez build kroku.** Práce probíhá na větvi
`claude/blissful-fermi-nsr0b5` (PR #2 proti `main`).

---

## 1. Architektura

- Jediný soubor `index.html`. Žádný build — JSX se transpiluje **v prohlížeči**
  přes Babel standalone (`<script type="text/babel">`). První načtení je proto
  pomalejší; to je vědomý kompromis za nulový build.
- Stack: **React 18 UMD**, **Tailwind (CDN)**, **Babel standalone**,
  **Firebase** (Google Auth + Firestore). Vše z CDN; verze pinované (4.2).
- `firebaseConfig` je natvrdo v `index.html` (~ř. 88). To je v pořádku — Firebase
  webové klíče jsou určené ke zveřejnění; data chrání **security rules**, ne
  utajení klíče. (Viz `firestore.rules`.)
- Celá aplikace je jedna velká komponenta s `useState`/`useEffect`/`useMemo`;
  data z Firestore se čtou živě přes `onSnapshot`.

## 2. Datový model (Firestore)

| Kolekce | Pole | Pozn. |
|---|---|---|
| `users/{uid}` | `email`, `displayName`, `approved` (bool), `isAdmin` (bool) | profil; roli/schválení mění jen admin |
| `rooms/{id}` | `name`, `floor`, `code` (zkratka), `type` (`room`/`equipment`), `usage` (`hours`/`both`/`breaks`), `max` | `max` jen u `equipment` (počet kusů) |
| `reservations/{id}` | `dateISO`, `roomId`, `period`, `teacherId`, `note`, `createdBy` | jednorázová rezervace na konkrétní den |
| `recurring/{id}` | `startISO`, `endISO`, `mode` (`weeks`/`until`), `weeks`, `exceptions[]`, `allowElsewhere`, `roomId`, `period`, `teacherId`, `createdBy` | týdenní série |
| `allowlist/{email}` | (ID dokumentu = e-mail) | **ID je e-mail malými písmeny** (`.toLowerCase()`, ř. ~430) |
| `meta/migrations` | `dateShiftFixed` (bool), `dateShiftFixedAt` | příznak provedené migrace dat |

**Datumy** se ukládají jako řetězce `RRRR-MM-DD` v **lokálním (českém) čase**
(viz 1.1).

## 3. Klíčové konvence a logika

- **Periody:** `HOURS_PERIODS = "0".."9"` (hodiny 0.–9.) + `BREAKS` (přestávky):
  `brk_before8` (Před 8), `brk_big` (Velká), `brk_lunch1/2/3` (Oběd 1–3),
  `brk_after` (Po). Učebna/pomůcka má `usage` = jen hodiny / obojí / jen přestávky.
- **Barvy buněk** (`CELLCLS`): zelená = volno; červená = jednorázová rezervace;
  **žlutá** = opakovaná, „hodina musí být v učebně" (`allowElsewhere=false`);
  **modrá** = opakovaná, „hodina může být i jinde" (`allowElsewhere=true`).
  `allowElsewhere` má smysl jen u učeben (`type==='room'`).
- **Opakování (`occursOn`, ř. ~531):** podporuje **jen týdenní** opakování
  (každý týden, tj. `diffDays % 7 === 0` od `startISO`). `mode='weeks'` → běží
  `weeks` týdnů; `mode='until'` → do `endISO`. `exceptions[]` vyřazuje jednotlivé
  dny. **Bi-weekly / jiné intervaly nejsou podporované** — pozor při rozšiřování.
- **Kdo smí založit opakování:** série „do konce roku" (`mode='until'`) **jen
  admin**; běžný učitel jen na počet týdnů (`mode='weeks'`). Vynuceno v UI i v rules.
- **Vlastnictví:** upravit/smazat smí admin ∨ `createdBy===uid` ∨ `teacherId===uid`
  (admin může rezervovat „za" jiného učitele přes `teacherId`).
- **Role / první přihlášení:** nový účet `approved=false` (čeká na admina), nebo
  rovnou schválený, je-li e-mail v `allowlist`. **Bootstrap admin** je natvrdo
  `dgunka@gymnaziumbma.cz` — a to **na dvou místech**: v `index.html` (~ř. 419,
  konstanta `isBootstrapAdmin`) i ve `firestore.rules`. Při změně upravit obě.
- **Pětidenní týden:** aplikace pracuje jen s Po–Pá (viz 2.9). `selectedDate` je
  vždy pracovní den; utility `isWeekend`/`toWeekday`/`addWeekday`.

---

## Priorita 1 — Kritické opravy (integrita dat a bezpečnost) — ✅ HOTOVO

### ✅ 1.1 Oprava posunu data o den (e809cb9 + migrace 7b44e9b)
**Zjištění:** `toISO()` převádělo lokální půlnoc přes `toISOString()` (UTC) →
v pásmu UTC+1/+2 vracelo **vždy předchozí den**. Posun byl konzistentní na zápisu
i čtení, takže se uvnitř aplikace vzájemně vyrušil a navenek se zdálo, že vše
funguje. **Viditelné symptomy:** `<input type="date">` v DateModalu ukazoval o den
méně než nadpis dne; klik na zvýrazněný den posunul aplikaci o den zpět; syrová
ISO data v „Moje rezervace" a v DB byla o den menší než realita.
**Oprava:** `toISO`/`schoolYearEndISO` formátují z lokálních složek
(`${y}-${pad(m+1)}-${pad(d)}`), bez `toISOString()`. Přidána `czFromISO`.
**Důsledek — migrace:** stará data v DB jsou po opravě o den posunutá vůči novým.
Proto **jednorázové** tlačítko v Nastavení (jen admin) posune `dateISO` /
`startISO` / `endISO` / `exceptions` o +1 den, po dávkách 400 (limit batch 500),
a zapíše `meta/migrations.dateShiftFixed=true` → tlačítko zmizí.
**⚠️ Migrace je nevratná a musí proběhnout právě jednou** (dvojí spuštění = posun
o 2 dny). Spustit až po nasazení opravené verze, ne během testování.

### ✅ 1.2 Firestore security rules (8a87bb4) — soubor `firestore.rules`
**Zjištění:** aplikace neměla žádná pravidla → kdokoli přihlášený mohl přímým
zápisem do DB obejít všechna UI omezení (schválení, vlastnictví, role).
**Řešení:** pravidla vynucují totéž co UI — čtení jen schválení; zápis rezervací
jen vlastník/admin; `users` (zejm. `isAdmin`/`approved`), `rooms`, `allowlist`,
`meta` jen admin; uživatel si **nesmí** změnit vlastní `isAdmin`/`approved`;
`mode='until'` jen admin. **Nutno nasadit ručně** (viz sekce „Po nasazení").

### ✅ 1.3 Editace bez duplicit (814e915)
**Zjištění:** editace rezervace dělala `add` (nový dokument) místo `update` →
duplicity; převod jednorázová↔opakovaná nemazal originál.
**Oprava:** denní listener ukládá i ID dokumentů; `upsertReservation` dělá
`update` podle ID; převody mažou podle ID.

### ✅ 1.4 Kontrola kolizí (52ae5bb)
**Zjištění:** nic nebránilo dvěma rezervacím na stejný slot; tiché mazání cizí
jednorázové rezervace.
**Oprava:** před uložením se ověří obsazenost slotu (vč. race „uloženo mezitím");
u série se kontroluje celé období proti jednorázovým i opakovaným a vypíšou se
konfliktní dny.

### ✅ 1.5 Vlastnictví i přes `teacherId` (bdc0fb9)
`canEdit`/`canDelete` = admin ∨ `createdBy===uid` ∨ `teacherId===uid`. Promítnuto
i do rules.

### ✅ 1.6 Živý stav účtu (2d73696)
Vlastní `users/{uid}` se čte přes `onSnapshot` místo jednorázového `get()` →
schválení/role se projeví bez nového přihlášení.

### ✅ 1.7 Ošetření chyb zápisu (1dba9d1)
try/catch kolem všech Firestore zápisů + viditelný toast místo `alert`.

## Priorita 2 — UX a intuitivnost — ✅ HOTOVO

- ✅ **2.1** (f605efe) Potvrzení před smazáním rezervace, série (text že ruší celou sérii) a místnosti.
- ✅ **2.2** (3558ecd) Dialog rezervace zobrazuje kontext (učebna/pomůcka, datum, hodina).
- ✅ **2.3** (ee80da1) Read-only detail cizí rezervace po kliknutí na obsazenou buňku (kdo, poznámka, typ, do kdy).
- ✅ **2.4** (aeaba92) Zrušení jednoho výskytu série přes `exceptions:[dateISO]`; volba „jen tento den" vs. „celé opakování".
- ✅ **2.5** (a2f247d) Navigace po dnech (◀/▶), tlačítko Dnes, 📅 Datum; zvýraznění dnešního dne v týdenním náhledu.
- ✅ **2.6** (9235456) Legenda barev pod týdenním náhledem.
- ✅ **2.7** (5fa7edc) „Moje rezervace": správa ze seznamu, proklik na den, česká data, řazení od nejbližších, zpřístupněno i adminovi.
- ✅ **2.8** (df8d872 + e0b4ca0) Abecední řazení učitelů; upozornění při rezervaci do minulosti; varování při vypnutí opakování (smaže sérii); odstranění mrtvého DnD kódu.
- ✅ **2.9** (37951d8) **Pětidenní týden:** posun po dnech přeskakuje víkend (pátek↔pondělí); otevření o víkendu, „Dnes" i ruční výběr víkendu skočí na nejbližší pondělí. Utility `isWeekend`/`toWeekday`/`addWeekday`. Týdenní šipky (◀◀/▶▶) drží stejný den v týdnu.

---

## Priorita 3 — Nové funkce — ⬜ DALŠÍ NA ŘADĚ (rozsah odsouhlasit před začátkem)

> U každé položky jsou návrhové poznámky a **otevřené otázky**, které je třeba
> s uživatelem vyjasnit, než se začne kódovat.

### ⬜ 3.1 Rezervace Chromebooků po kusech
**Cíl:** u pomůcek (`type==='equipment'`, mají `max`) povolit více souběžných
rezervací na jeden slot, dokud součet kusů nepřekročí `max`. Buňka ukazuje např.
„12/30 volných".
**Návrh:** přidat `reservations.count` (default 1). Kolizní kontrola (1.4) u
pomůcek nehlídá „obsazeno ano/ne", ale **součet `count`** v daném slotu ≤ `max`.
**Otevřené otázky:**
- Smí na jeden slot rezervovat víc různých učitelů, dokud je součet < max? (zřejmě ano)
- Jak se `count` chová u **opakované** série (rezervuje N kusů každý týden)?
- UI volby počtu (number input v dialogu, validace 1..zbývající).
- Stará data bez `count` → brát jako 1 (čtení s defaultem, není nutná migrace).
- Zobrazení v buňce a v read-only detailu (2.3) — formát „obsazeno/celkem".

### ⬜ 3.2 Rezervace více hodin najednou
**Cíl:** v dialogu vybrat rozsah period (např. 3.–4. hodina) jedním úkonem.
**Otevřené otázky:**
- Uložit jako **více `reservations` dokumentů** (po jedné periodě), nebo jeden
  dokument s polem period? (Více dokumentů líp sedí na stávající model, kolize a
  rušení; jeden dokument zjednoduší „zruš celý blok".)
- Platí jen pro hodiny, nebo i pro přestávky? (přestávky asi ne — nejsou souvislé)
- Jak se to snese s opakováním a s kolizní kontrolou (kontrola každé periody zvlášť).
- UI: výběr „od–do" v rámci `HOURS_PERIODS`.

### ⬜ 3.3 Prázdniny / svátky
**Cíl:** admin spravuje seznam volných dnů; opakované série je přeskakují,
volitelně se v plánu zobrazí jako „volno".
**Návrh:** nová kolekce (např. `holidays/{dateISO}` nebo rozsahy) spravovaná
adminem; `occursOn` rozšířit, aby svátky vyřadil; rules: admin-only zápis.
**Otevřené otázky:**
- Ukládat jednotlivé dny, nebo **rozsahy** (prázdniny = více dní)?
- Blokovat na svátky i **jednorázové** rezervace, nebo jen vyřadit série?
- Zobrazit svátek v denním/týdenním náhledu (label „volno") vs. jen skrýt.
- Zdroj dat: ruční zadání adminem (žádné externí API).

### ⬜ 3.4 Časy zvonění
**Cíl:** u hodin (a přestávek) zobrazit časy začátku/konce; konfiguruje admin.
**Otevřené otázky:**
- Kde uložit konfiguraci — `meta/bellTimes` (jeden dokument)?
- Časy i pro přestávky (`BREAKS`)?
- Globální pro celou školu (nejspíš ano), nebo per den?
- Zobrazení: vedle popisku periody v hlavičce tabulky.

### ⬜ 3.5 Notifikace
**Cíl:** (a) admin vidí, že někdo čeká na schválení; (b) učitel se dozví, že mu
admin smazal/změnil rezervaci.
**Otevřené otázky:**
- **In-app only**, nebo e-mail? E-mail bez backendu (Cloud Functions) prakticky
  nejde — pravděpodobně zůstat u in-app upozornění (badge), aby se udržela
  bezserverová architektura.
- (a) snadné: badge s počtem `users` kde `approved=false` (admin už je čte).
- (b) potřebuje úložiště zpráv — např. `notifications/{uid}` čtené po přihlášení;
  promyslet rules (učitel čte jen své) a označení „přečteno".

---

## Priorita 4 — Technika a údržba

- ✅ **4.1** (442fefe) `README.md` — popis, nasazení, Firebase konfigurace, role, nasazení rules.
- ✅ **4.2** (7372dae) Produkční build Reactu + pinované verze CDN závislostí (vč. @babel/standalone). Zvážit SRI.
- ⬜ **4.3 Úklid dat** — admin akce: mazání/archivace starých rezervací a vypršených sérií. Otázka: archivovat (přesun) vs. mazat; práh stáří.
- ⬜ **4.4 Statistiky pro admina** — vytíženost místností/pomůcek za období.
- ⬜ **4.5 Export / tisk denního plánu** — tisková sestava / CSV.

---

## Po nasazení je potřeba udělat ručně (mimo kód)

1. **Nasadit `firestore.rules`** — Firebase konzole → Firestore Database → Rules
   → vložit obsah souboru → Publish. (Nebo `firebase deploy --only firestore:rules`.)
   ⚠️ Bez nich jdou klientská omezení obejít přímým zápisem do DB.
2. **Spustit migraci** — po nasazení opravené verze jednou v Nastavení (jako
   admin) tlačítko „Opravit posunutá data (+1 den)". Viz 1.1 (nevratné, jen jednou).
3. **Bootstrap admin e-mail** — `dgunka@gymnaziumbma.cz` je natvrdo v `index.html`
   i `firestore.rules`; při změně upravit na **obou** místech, jinak admin ztratí
   práva po nasazení rules.

## Ověřování

- Lokálně: `python3 -m http.server` → `http://localhost:8000` (přihlášení vyžaduje
  povolenou doménu ve Firebase Auth → Authorized domains; `localhost` je výchozí).
- Syntaxe JSX: transpilovat `text/babel` blok přes `@babel/standalone` (preset
  `react`) — musí projít bez chyby. (Plné ověření chování vyžaduje reálný Firebase
  projekt uživatele.)
- K 1.1: ověřit `toISO(new Date(2026,5,12)) === '2026-06-12'`.

## Pracovní postup

1. Jedeme po položkách v pořadí priorit; po dokončení označit ✅ + poznámka
   co/kde se změnilo a ID commitu, **přímo v tomto souboru**.
2. Po každé logické skupině commit + push na větev `claude/blissful-fermi-nsr0b5`
   a aktualizace PR #2.
3. U položek **priority 3 si před implementací vyžádat potvrzení rozsahu**
   (viz otevřené otázky u každé).
