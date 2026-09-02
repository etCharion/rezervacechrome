# Rezervace Chromebooků a učeben

Jednoduchá webová aplikace pro učitele: rezervace odborných učeben a pomůcek
(např. sad Chromebooků) na vyučovací hodiny a přestávky. Jeden soubor
`index.html`, bez build kroku — React 18 (UMD), Tailwind CDN, Babel standalone
a Firebase (Google přihlášení + Firestore).

## Funkce

- **Denní plán** — tabulka učeben/pomůcek × hodin (0.–9.) nebo přestávek,
  kliknutím na volnou buňku vznikne rezervace.
- **Týdenní náhled** — obsazenost Po–Pá se štítky, kliknutím se přepne den.
- **Opakované rezervace** — každý týden, na počet týdnů (kdokoli) nebo
  do konce školního roku (jen admin); jednotlivé výskyty lze rušit
  samostatně.
- **Moje rezervace** — přehled vlastních jednorázových i opakovaných
  rezervací s možností rušení a proklikem na den.
- **Stav techniky** — samostatná záložka: tabulka tříd × vybavení, ve které
  učitelé hlásí, co nefunguje (viz níže).
- **Role a schvalování** — nový účet čeká na schválení adminem; admin může
  e-maily předschválit (allowlist), spravuje učebny, pomůcky a uživatele.

### Barvy v plánu

| Barva | Význam |
|---|---|
| zelená | volno |
| červená | jednorázová rezervace |
| žlutá | opakovaná — hodina musí být v učebně |
| modrá | opakovaná — hodina může být i jinde |

## Stav techniky ve třídách

Záložka **Technika** je samostatný systém — má **vlastní seznam tříd**, který
nijak nesouvisí s učebnami a pomůckami v rozvrhu.

- **Tabulka** — řádky jsou třídy, sloupce sledované vybavení (televize,
  Chromecast, prezentér…). Každá buňka je barevný stav s ikonou.
- **Hlášení problému** — kdokoli klikne na stav, zvolí *Nahlásit problém* a
  napíše, co je špatně. Stav se přepne na růžový otazník („nahlášený problém“)
  a hlášení se počítá jako nevyřízené. Po dalším kliknutí je popis vidět.
- **Shrnutí pod tabulkou** — seznam všech problémů a nevyřízených věcí; nová
  hlášení jsou nahoře se štítkem *nové*.
- **Admin** — v horní liště má zvoneček s počtem nevyřízených hlášení. U každé
  buňky i u každého řádku shrnutí může problém *vyřídit* (stav se vrátí na
  „funkční“) nebo nastavit libovolný jiný stav s komentářem.

### Výchozí stavy

| Ikona | Stav | Význam | Ve shrnutí |
|---|---|---|---|
| ✓ zelená | Funkční | vše v pořádku (výchozí stav buňky) | ne |
| ✗ červená | Nefunkční | nefunguje, je potřeba oprava | ano |
| ! žlutá | Drobný problém | funguje, ale pracuje se na tom / pozor | ano |
| ? růžová | Nahlášený problém | hlášení od učitele, admin ho ještě neviděl | ano |
| – modrá | Není k dispozici | vybavení ve třídě není | ne |

Pětice se **jednorázově založí sama** při prvním otevření aplikace adminem
(příznak `meta/techSeed`). Admin může v *Nastavení → Stavy a ikony* přidat
vlastní stavy — vybere ikonu, barvu, název a jestli se mají počítat mezi
problémy. Stav „nahlášený problém“ používá formulář hlášení, proto ho nelze
smazat.

### Kdo co smí

- **Učitel** — čte tabulku a hlásí problémy. Stav ručně přepnout nemůže
  (aby zůstalo dohledatelné, kdo co nahlásil).
- **Admin** — spravuje třídy, vybavení i stavy, mění stavy ručně a vyřizuje
  hlášení.

## Nasazení

1. Soubor `index.html` stačí vystavit na libovolném statickém hostingu
   (GitHub Pages, Firebase Hosting…). Žádný build není potřeba.
2. Ve [Firebase konzoli](https://console.firebase.google.com/) měj projekt s:
   - **Authentication** → poskytovatel Google,
   - **Firestore Database**.
3. Konfigurace projektu je v `index.html` v konstantě `firebaseConfig`
   (Firebase API klíče jsou určené ke zveřejnění; ochranu dat zajišťují
   security rules, viz níže).
4. **Nasaď bezpečnostní pravidla** ze souboru `firestore.rules`:
   - Firebase konzole → Firestore Database → záložka *Rules* → vložit obsah
     souboru → *Publish*, nebo
   - `firebase deploy --only firestore:rules` (s nainstalovaným Firebase CLI).

   ⚠️ Bez nasazených rules může kterýkoli přihlášený uživatel obejít
   omezení aplikace přímým zápisem do databáze.

## Role a první přihlášení

- **Bootstrap admin** — e-mail je natvrdo v `index.html` (konstanta
  `isBootstrapAdmin`) i ve `firestore.rules`; při změně je nutné upravit obě
  místa. Tento účet je po přihlášení vždy admin a schválený.
- **Učitel** — po prvním přihlášení Googlem čeká na schválení adminem
  (Nastavení → Uživatelé), nebo je schválen rovnou, pokud admin jeho e-mail
  předem přidal do allowlistu.
- **Admin** — uživatel se zaškrtnutým „admin“; spravuje učebny, uživatele,
  allowlist a může rezervovat za ostatní učitele.

## Datový model (Firestore)

| Kolekce | Obsah |
|---|---|
| `users` | profil uživatele: `email`, `displayName`, `approved`, `isAdmin` |
| `rooms` | učebny a pomůcky: `name`, `floor`, `code`, `type`, `usage`, `max` |
| `reservations` | jednorázové rezervace: `dateISO`, `roomId`, `period`, `teacherId`, `note`, `createdBy` |
| `recurring` | týdenní série: `startISO`, `endISO`, `mode` (`weeks`/`until`), `weeks`, `exceptions[]`, `allowElsewhere`, … |
| `allowlist` | předschválené e-maily (ID dokumentu = e-mail) |
| `techRooms` | třídy pro záložku Technika: `name`, `floor`, `order` |
| `techItems` | sledované vybavení (sloupce tabulky): `name`, `order` |
| `techStatusTypes` | stavy/ikony: `label`, `glyph`, `color`, `counts`, `order`, `locked` |
| `techStatus` | stav jedné položky v jedné třídě, ID `{roomId}__{itemId}`: `statusId`, `note`, `handled`, `reportedBy(Name)`, `updatedBy(Name)`, `updatedAt` |
| `meta` | interní příznaky (např. provedené migrace dat, založení výchozích stavů) |

Datumy se ukládají jako řetězce `RRRR-MM-DD` v místním (českém) čase.

## Migrace dat po opravě časového pásma

Starší verze aplikace ukládala kvůli chybě časového pásma všechna data o den
menší, než odpovídalo skutečnosti. Po nasazení opravené verze spusť
**jednou** v Nastavení (jako admin) tlačítko **„Opravit posunutá data
(+1 den)“**. Provedení se zaznamená do `meta/migrations` a tlačítko zmizí.

## Vývoj

- Kód je v jediném `<script type="text/babel">` bloku v `index.html`;
  JSX se transpiluje v prohlížeči (Babel standalone).
- Lokální spuštění: `python3 -m http.server` a otevřít
  `http://localhost:8000` (přihlášení vyžaduje, aby doména byla povolená ve
  Firebase Authentication → *Authorized domains*; pro `localhost` je povolená
  ve výchozím stavu).
