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
- **Role a schvalování** — nový účet čeká na schválení adminem; admin může
  e-maily předschválit (allowlist), spravuje učebny, pomůcky a uživatele.

### Barvy v plánu

| Barva | Význam |
|---|---|
| zelená | volno |
| červená | jednorázová rezervace |
| žlutá | opakovaná — hodina musí být v učebně |
| modrá | opakovaná — hodina může být i jinde |

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
| `meta` | interní příznaky (např. provedené migrace dat) |

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
