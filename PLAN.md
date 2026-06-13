# Plán změn — Rezervace Chromebooků a učeben

> **Tento soubor je sdílený plán napříč konverzacemi.** Každé sezení Claude je
> izolované a nevidí historii ostatních; jediné společné je tento repozitář.
> V nové konverzaci stačí říct „přečti si PLAN.md" a pokračovat odsud.

Živý plán; u každé položky je stav: ⬜ čeká · 🔄 rozpracováno · ✅ hotovo · ❌ zamítnuto/odloženo.
Vše se týká `index.html`, pokud není uvedeno jinak. Zachováváme jednosouborovou architekturu bez build kroku.
Práce probíhá na větvi `claude/blissful-fermi-nsr0b5` (PR #2 proti `main`).

## Kontext

Jednosouborová aplikace (React 18 UMD + Tailwind CDN + Babel standalone + Firebase Auth/Firestore) pro rezervace učeben a sad Chromebooků učiteli. Audit našel kritické chyby (posun data o den, duplicity při editaci, chybějící kontrola kolizí, chybějící security rules), řadu UX nedostatků a chybějících funkcí. Plán je seřazen podle priorit; pracujeme postupně po položkách.

### Poznámka k chybě s datem (1.1)
`toISO()` převádělo lokální půlnoc přes `toISOString()` (UTC) → v pásmu UTC+1/+2 vracelo vždy **předchozí den**. Posun byl konzistentní na zápisu i čtení, takže se uvnitř aplikace vyrušil. **Důsledek:** po nasazení opravy jsou stará data v DB o den posunutá vůči novým → součástí 1.1 je jednorázová migrace (+1 den), spouští se tlačítkem v Nastavení (jen admin, jen jednou; provedení v `meta/migrations`).

---

## Priorita 1 — Kritické opravy (integrita dat a bezpečnost) — HOTOVO

- ✅ (e809cb9 + 7b44e9b) **1.1 Oprava posunu data** — `toISO`/`schoolYearEndISO` formátovat lokálně, bez `toISOString()`. + jednorázový migrační nástroj (+1 den).
- ✅ (8a87bb4) **1.2 Firestore security rules** — `firestore.rules`: čtení jen schválení; zápis rezervací jen vlastník/admin; `users`/`rooms`/`allowlist` admin-only; uživatel si nesmí měnit roli.
- ✅ (814e915) **1.3 Editace bez duplicit** — update existujícího dokumentu místo add (ukládání ID dokumentů).
- ✅ (52ae5bb) **1.4 Kontrola kolizí** — ověření obsazenosti slotu před uložením (jednorázové i celé období série).
- ✅ (bdc0fb9) **1.5 Vlastnictví i přes `teacherId`** — canEdit/canDelete = admin ∨ createdBy ∨ teacherId.
- ✅ (2d73696) **1.6 Živý stav účtu** — `onSnapshot` na vlastní `users/{uid}` místo `get()`.
- ✅ (1dba9d1) **1.7 Ošetření chyb zápisu** — try/catch + toast místo `alert`.

## Priorita 2 — UX a intuitivnost — HOTOVO

- ✅ (f605efe) **2.1 Potvrzení destruktivních akcí** — confirm u smazání rezervace, série a místnosti.
- ✅ (3558ecd) **2.2 Kontext v dialogu rezervace** — učebna/datum/hodina v hlavičce.
- ✅ (ee80da1) **2.3 Detail cizí rezervace** — read-only detail po kliknutí na obsazenou buňku.
- ✅ (aeaba92) **2.4 Zrušení jednoho výskytu série** — `exceptions: [dateISO]`.
- ✅ (a2f247d) **2.5 Navigace** — tlačítka Den/Dnes/Datum, zvýraznění dnešního dne.
- ✅ (9235456) **2.6 Legenda barev** — vysvětlivka pod náhledem.
- ✅ (5fa7edc) **2.7 Moje rezervace** — správa ze seznamu, proklik, česká data, řazení.
- ✅ (df8d872 + e0b4ca0) **2.8 Drobnosti** — abecední učitelé, varování při rezervaci do minulosti a při vypnutí opakování, úklid mrtvého DnD kódu.
- ✅ (37951d8) **2.9 Pětidenní týden** — navigace po dnech přeskakuje víkend (pátek↔pondělí); otevření o víkendu, „Dnes" i ruční výběr víkendu skočí na pondělí. Utility `isWeekend`/`toWeekday`/`addWeekday`.

## Priorita 3 — Nové funkce (rozsah odsouhlasit před začátkem) — DALŠÍ NA ŘADĚ

- ⬜ **3.1 Rezervace Chromebooků po kusech** — u pomůcek povolit více rezervací na slot s polem `count`, buňka ukazuje „12/30", kolizní kontrola hlídá součet proti `max`.
- ⬜ **3.2 Rezervace více hodin najednou** — výběr rozsahu period v dialogu (např. 3.–4. hod.).
- ⬜ **3.3 Prázdniny/svátky** — admin spravuje seznam volných dnů; série je přeskakují, případně se v plánu zobrazí jako „volno".
- ⬜ **3.4 Časy zvonění** — u hodin zobrazit časy (konfigurace v nastavení adminem).
- ⬜ **3.5 Notifikace** — upozornění adminovi na čekající schválení (badge v UI); informace učiteli, že mu admin smazal rezervaci.

## Priorita 4 — Technika a údržba

- ✅ (442fefe) **4.1 README.md** — popis, nasazení, Firebase konfigurace, role, nasazení rules.
- ✅ (7372dae) **4.2 Produkční závislosti** — react.production.min.js, pinované verze CDN.
- ⬜ **4.3 Úklid dat** — mazání/archivace starých rezervací a vypršených sérií (admin akce).
- ⬜ **4.4 Statistiky pro admina** — vytíženost místností/pomůcek za období.
- ⬜ **4.5 Export/tisk denního plánu.**

## Pracovní postup

1. Jedeme po položkách v pořadí priorit; po dokončení ✅ (+ poznámka co/kde, ID commitu).
2. Po každé logické skupině commit + push na větev `claude/blissful-fermi-nsr0b5` a aktualizace PR #2.
3. U položek priority 3 si před implementací vyžádat potvrzení rozsahu.

## Po nasazení je potřeba ručně (mimo kód)

1. Nasadit `firestore.rules` ve Firebase konzoli (Firestore → Rules → Publish).
2. Po nasazení opravené verze spustit **jednou** v Nastavení (jako admin) tlačítko „Opravit posunutá data (+1 den)".
3. Bootstrap admin e-mail je natvrdo v `index.html` i ve `firestore.rules` (`dgunka@gymnaziumbma.cz`) — při změně upravit na obou místech.
