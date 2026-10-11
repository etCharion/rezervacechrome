# Rozšíření „Rezervace BMA“ pro EduPage

Rozšíření do Chromu přidá v **třídní knize** EduPage (denní přehled hodin)
ke každé hodině malé tlačítko **💻** (popis se ukáže při najetí myší). Po
kliknutí se otevře malé okno rezervační aplikace s předvyplněným datem, hodinou,
patrem a poznámkou (předmět + třída). Stačí vybrat volný vozík a potvrdit.

## Co znamenají barvy

| Barva | Význam |
|---|---|
| 🟩 zelená | na tuto hodinu máte rezervovaný vozík na stejném patře, kde učíte |
| 🟧 oranžová | vozík máte, ale v jiném patře (popis řekne který) – možná omyl |
| 🟥 červená | v tomto patře jsou všechny vozíky obsazené; kliknutím uvidíte jiná patra |
| 🟦 modrá | nic z toho – běžné tlačítko pro rezervaci |

Barvy vycházejí z přehledu, který rozšíření **posílá rezervační aplikace,
kdykoli je v Chromu otevřená** (v kartě nebo v okně z tlačítka). Proto:

- po rezervaci přes tlačítko ikona zezelená hned,
- rezervace udělaná jinde (na mobilu, na jiném počítači, admin za vás) se
  projeví, až aplikaci na tomto počítači znovu otevřete,
- dokud aplikaci po instalaci rozšíření ani jednou neotevřete, jsou všechna
  tlačítka modrá,
- popis při najetí myší říká, z kdy přehled je („podle aplikace otevřené …“),
- červená se počítá jen na **tento a příští týden** (aplikace kvůli ní načítá
  rezervace celé školy, a to jen tomu, kdo má rozšíření); zelená a oranžová
  platí do konce školního roku,
- po odhlášení v aplikaci rozšíření přehled zapomene (sdílený počítač).

## Co rozšíření dělá a co ne

- **Dělá:** čte ze stránky text (datum, číslo hodiny, učebnu, předmět, třídu)
  a otevře okno aplikace s odkazem `…/#rezervace?…`
  (formát je v [hlavním README](../README.md#rychlá-rezervace-přes-odkaz)).
- **Nedělá:** nic neposílá do EduPage, nemění jeho data ani formuláře, nic
  neukládá do databáze a nepřihlašuje se. Rezervaci uloží až aplikace, a to
  teprve po potvrzení učitelem – se stejnou kontrolou kolizí jako jinde.
- Jediné oprávnění je `storage` – úložiště rozšíření pro přehled rezervací
  (Chrome kvůli němu nic nehlásí). Tlačítka běží jen na
  `https://gymnaziumbma.edupage.org` (celá doména – odkaz na třídní knihu
  v EduPage nemění adresu, takže se nedá omezit na jednu stránku). Mimo třídní
  knihu nic nedělá.
- Přehled rezervací přijímá `background.js` **jen od rezervační aplikace**
  (`externally_connectable` v `manifest.json`) a jde přímo z aplikace do
  rozšíření – stránka EduPage ho nevidí. Obsahuje jen data, hodiny, názvy
  a patra vozíků, ne jména kolegů.
- Položka `key` v `manifest.json` zajistí, že rozšíření má u všech stejné ID
  (`gbdfghjcpkabcoglgcbaekhfoecjfdne`), podle kterého ho aplikace najde.
  Není to nic tajného – **neměnit ani nemazat**, jinak barvy přestanou fungovat.

**Bezpečnost:** rozšíření vidí stránky EduPage stejně jako učitel (včetně
známek a docházky). Proto ho instalujte **jen z tohoto repozitáře**, ne
z kopie, kterou vám někdo pošle. Kód je krátký – `content.js` (tlačítka) a `background.js` (příjem přehledu).
Nerozbalené rozšíření se samo neaktualizuje, takže ho nikdo nezmění na dálku.

## Instalace (krok za krokem)

1. Stáhněte si složku `edupage-extension` do počítače:
   na GitHubu u repozitáře klikněte na zelené tlačítko **Code → Download ZIP**,
   ZIP rozbalte a složku `edupage-extension` si dejte někam, kde zůstane
   (např. do Dokumentů). **Složku pak nemažte ani nepřesouvejte** – Chrome si
   rozšíření načítá přímo z ní.
2. V Chromu otevřete adresu `chrome://extensions` (napište ji do řádku
   s adresou a stiskněte Enter).
3. Vpravo nahoře zapněte přepínač **Režim pro vývojáře**.
4. Vlevo nahoře klikněte na **Načíst nerozbalené** a vyberte složku
   `edupage-extension` (tu, ve které je soubor `manifest.json`).
5. Otevřete EduPage (nebo ho znovu načtěte klávesou F5) a přejděte do třídní
   knihy.
6. Po každé změně souborů rozšíření klikněte v `chrome://extensions`
   u rozšíření na kulatou šipku **Načíst znovu** a EduPage znovu načtěte.

> ⚠️ Na **školních (spravovaných) Chromebookách a počítačích** může být režim
> pro vývojáře vypnutý správcem. Pak rozšíření takto nainstalovat nejde – je
> potřeba domluvit se se správcem IT.

> Chrome může při spuštění upozorňovat, že máte zapnutá rozšíření v režimu
> pro vývojáře. To je u ručně nahraného rozšíření normální.

## Zkouška ve skutečném EduPage

1. Otevřete třídní knihu – u hodin s výukou se objeví tlačítko 💻, při
   najetí myší popis. U prázdných hodin („Přidat hodinu“) tlačítko není.
2. Přepněte den šipkou – tlačítka jsou tam znovu, u každé hodiny jen jedno.
3. Klikněte na tlačítko – otevře se malé okno se správným datem, hodinou,
   poznámkou a nahoře vozíky ze správného patra.
4. Klikněte u jiné hodiny – použije se stejné okno (neotevře se další).
5. Vyberte vozík → **Rezervovat** → v dialogu znovu **Rezervovat**. Okno se
   za chvíli samo zavře, rezervace je vidět v aplikaci a ikona u hodiny
   zezelená.
6. Otevřete aplikaci v jiné kartě a vraťte se do EduPage – hodiny, kde už
   vozík máte, jsou zelené (případně oranžové), plná patra červená.
7. Zkontrolujte, že třídní kniha funguje jako dřív: klik na název hodiny
   otevře nabídku EduPage, zápis učiva, docházka a uložení jdou normálně.

Když něco nefunguje, otevřete v EduPage klávesou F12 **Konzoli** a hledejte
řádky začínající `[Rezervace BMA]`.

### Co zatím ověřené není

- **Dělené skupiny** (dvě hodiny ve stejné vyučovací hodině) – tlačítko se
  přidá ke každé hodině zvlášť, ale skutečný tvar v EduPage neznáme.
- **Hodina bez učebny nebo s více učebnami** – patro se nepřečte a okno ukáže
  všechny vozíky.
- **EduPage v angličtině** – datum má jiný tvar; tlačítko pak místo otevření
  okna ukáže „Nepodařilo se zjistit datum“ (nikdy nepošle špatné datum).
- Jestli Chrome při druhém kliknutí přenese už otevřené okno do popředí.

## Když EduPage změní vzhled

Tlačítka zmizí, ale nic se nerozbije. Názvy částí stránky, které rozšíření
hledá, jsou pohromadě nahoře v `content.js` v konstantě `SEL` – opravuje se
jen tam. Zjištěná struktura stránky (stav k 11. 10. 2026):

| Co | Kde na stránce |
|---|---|
| Datum | `.dashboard-header .header`, text např. `St, 14. 10. 2026` |
| Seznam hodin | `.dashboard-lessons` (řádky oddělené `div.separator`) |
| Hodina s výukou | `.pd.lesson` (prázdná hodina má jen `.pd`) |
| Číslo hodiny | `.pd > .pn`, text `0`–`9` |
| Předmět, třída | `.item.subjects`, `.item.classes` (u semináře jen jeden `.item`) |
| Učebna a patro | `.item.classrooms`, text např. `3. Patro - 1. A` |

## Zkouška bez EduPage (pro úpravy kódu)

Soubor `test/fixture.html` napodobuje třídní knihu. Otevřete ho v Chromu
přímo ze složky (dvojklik). Rozšíření se do něj načte samo:

- tlačítka mají být jen u hodin s výukou,
- šipka ▶ přepne den a tlačítka se objeví znovu, u každé hodiny právě jednou,
- klik na tlačítko vypíše do „Záznamu“ adresu, která by se otevřela
  (zaškrtnutím „opravdu otevírat okno“ se otevře skutečná aplikace),
- „přepnout formát data“ napodobí anglickou EduPage – tlačítko má ohlásit chybu,
- „zkušební barvy“ ukáže zelenou, oranžovou a červenou (středa 1., 3. a 7. hodina).

Pro zkoušku s aplikací spuštěnou u sebe (`python3 -m http.server` v kořeni
repozitáře) dočasně změňte adresu aplikace na `http://localhost:8000/` na
**třech** místech: `APP_URL` v `content.js`, `APP_PREFIX` v `background.js`
a `externally_connectable` v `manifest.json` (tam `http://localhost/*`).
**Před commitem vraťte zpět.**
