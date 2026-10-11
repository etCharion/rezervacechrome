// Rezervace BMA – tlačítko „Chromebooky“ v třídní knize EduPage.
//
// Co rozšíření dělá: u každé vyučovací hodiny v denním přehledu třídní knihy
// přidá malé tlačítko 💻. Po kliknutí přečte ze stránky datum, číslo hodiny,
// patro a předmět s třídou a otevře s nimi okno rezervační aplikace.
// Barva tlačítka ukazuje stav podle přehledu, který posílá aplikace
// (viz background.js):
//   zelená   – na tuto hodinu máte vozík na stejném patře,
//   oranžová – máte vozík, ale v jiném patře,
//   červená  – na tomto patře jsou všechny vozíky obsazené,
//   modrá    – nic z toho (nebo aplikace zatím nic neposlala).
//
// Co nedělá: nic neposílá do EduPage, nemění jeho data ani formuláře, nic
// neukládá do databáze a nepřihlašuje se. Rezervaci uloží až aplikace,
// a to teprve po potvrzení učitelem.
(function () {
  'use strict';

  // Adresa rezervační aplikace. Pro zkoušku s aplikací spuštěnou u sebe
  // dočasně 'http://localhost:8000/' – před commitem vrátit zpět!
  const APP_URL = 'https://etcharion.github.io/rezervacechrome/';

  // Jak se jmenují části stránky EduPage (ověřeno 11. 10. 2026). Když EduPage
  // změní vzhled a tlačítka zmizí, opravuje se jen tady.
  const SEL = {
    lessons: '.dashboard-lessons',       // seznam hodin v denním přehledu
    lesson: '.pd.lesson',                // hodina, ve které je výuka (prázdná má jen .pd)
    number: '.pn',                       // číslo hodiny, text „0“–„9“
    label: '.pl',                        // název hodiny a učebna
    link: '.link',                       // klikací název hodiny (otevírá nabídku EduPage)
    date: '.dashboard-header .header',   // datum, text „Čt, 15. 10. 2026“
    subject: '.item.subjects',           // předmět, např. „Dějepis“
    classes: '.item.classes',            // třída, např. „1. A“
    classroom: '.item.classrooms',       // učebna, např. „3. Patro - 1. A“
    anyItem: '.link .item',              // u semináře je jen jeden společný název
  };

  const BTN_CLASS = 'bma-rez-btn';
  const BTN_ICON = '💻';
  const TITLE_DEFAULT = 'Rezervovat Chromebooky na tuto hodinu';
  const STATUS_CLASSES = ['bma-rez-mine', 'bma-rez-elsewhere', 'bma-rez-full'];
  const WINDOW_NAME = 'rezervaceBMA';    // stejné jméno = další klik použije stejné okno
  const LOG = '[Rezervace BMA]';

  // text prvku bez zbytečných mezer a zalomení
  const clean = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const pad2 = (n) => String(n).padStart(2, '0');
  const floorLabel = (f) => (f === 0 ? 'přízemí' : `${f}. patro`);

  // ---------- čtení údajů ze stránky EduPage ----------

  // „Čt, 15. 10. 2026“ → „2026-10-15“; když se datum přečíst nedá, vrátí null
  function readDate() {
    const m = clean(document.querySelector(SEL.date)).match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    // kontrola, že takové datum existuje (31. 2. by se jinak posunulo do března)
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // číslo hodiny „0“–„9“, jinak null
  function readPeriod(lessonEl) {
    const text = clean(lessonEl.querySelector(SEL.number));
    return /^\d$/.test(text) ? text : null;
  }

  // „3. Patro - 1. A“ → „3“; když text tento tvar nemá, vrátí null
  function readFloor(lessonEl) {
    const m = clean(lessonEl.querySelector(SEL.classroom)).match(/^\s*(\d+)\.\s*patro/i);
    return m ? m[1] : null;
  }

  // poznámka k rezervaci: „Dějepis 1. A“, u semináře jeho název („D. 4. Mat“)
  function readNote(lessonEl) {
    const parts = [
      clean(lessonEl.querySelector(SEL.subject)),
      clean(lessonEl.querySelector(SEL.classes)),
    ].filter(Boolean);
    if (parts.length) return parts.join(' ');
    for (const item of lessonEl.querySelectorAll(`${SEL.label} ${SEL.anyItem}`)) {
      if (!item.classList.contains('classrooms') && !item.classList.contains('hover')) return clean(item);
    }
    return '';
  }

  // ---------- přehled rezervací z aplikace (barvy tlačítek) ----------

  // Data ukládá background.js do úložiště rozšíření. Na zkušební stránce
  // (test/fixture.html, bez rozšíření) úložiště není – tam se berou
  // z window.bmaTestData.
  const hasStorage = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
  let stored = null;
  const currentData = () => (hasStorage ? stored : window.bmaTestData) || null;

  // jaký stav má tlačítko pro danou hodinu; null = žádný (modrá)
  function statusFor(date, period, floor) {
    const data = currentData();
    if (!data || !date || !period) return null;
    const key = `${date}|${period}`;
    const mine = (data.mine && data.mine[key]) || [];
    const names = (list) => list.map((x) => (x.floor === null ? x.name : `${x.name} (${floorLabel(x.floor)})`)).join(', ');
    const when = new Date(data.at).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    const age = `\n(podle aplikace otevřené ${when})`;

    // patro hodiny neznáme (hodina bez učebny) → stačí jakýkoli váš vozík
    const sameFloor = floor === null ? mine : mine.filter((x) => String(x.floor) === floor);
    if (sameFloor.length) return { cls: 'bma-rez-mine', title: `Máte rezervováno: ${names(sameFloor)}${age}` };
    if (mine.length) return { cls: 'bma-rez-elsewhere', title: `Máte rezervováno, ale v jiném patře: ${names(mine)}${age}` };
    const full = (data.full && data.full[key]) || [];
    if (floor !== null && full.map(String).includes(floor)) {
      return { cls: 'bma-rez-full', title: `V tomto patře jsou všechny Chromebooky obsazené – kliknutím uvidíte jiná patra.${age}` };
    }
    return null;
  }

  // nastaví barvu a popis tlačítka podle stavu
  function updateStatus(btn, lessonEl, date) {
    const s = statusFor(date, readPeriod(lessonEl), readFloor(lessonEl));
    STATUS_CLASSES.forEach((c) => btn.classList.toggle(c, !!s && s.cls === c));
    const title = s ? s.title : TITLE_DEFAULT;
    if (btn.title !== title) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    }
  }

  function loadStored() {
    if (!hasStorage) return;
    try {
      chrome.storage.local.get('reservations', (res) => {
        stored = (res && res.reservations) || null;
        scan();
      });
      // aplikace poslala nová data (např. po rezervaci) → hned přebarvit
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.reservations) {
          stored = changes.reservations.newValue || null;
          scan();
        }
      });
    } catch (err) {
      console.warn(LOG, err);
    }
  }

  // ---------- tlačítko ----------

  // krátce ukáže chybu přímo na tlačítku a pak vrátí ikonu
  function showError(btn, text) {
    btn.textContent = text;
    btn.classList.add('bma-rez-error');
    setTimeout(() => {
      btn.textContent = BTN_ICON;
      btn.classList.remove('bma-rez-error');
    }, 3000);
  }

  function onClick(event) {
    // název hodiny vedle je klikací a otevírá nabídku EduPage – tu nechceme
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    try {
      // údaje čteme až teď, aby po přepnutí dne nebyly zastaralé
      const lessonEl = btn.closest(SEL.lesson);
      const date = readDate();
      if (!date) { showError(btn, 'Nepodařilo se zjistit datum'); return; }
      const period = lessonEl && readPeriod(lessonEl);
      if (!period) { showError(btn, 'Nepodařilo se zjistit hodinu'); return; }

      const params = { date, period };
      const floor = readFloor(lessonEl);
      if (floor !== null) params.floor = floor;
      const note = readNote(lessonEl);
      if (note) params.note = note;
      params.popup = '1';

      const hash = Object.keys(params).map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&');
      const win = window.open(`${APP_URL}#rezervace?${hash}`, WINDOW_NAME, 'popup=yes,width=560,height=760');
      if (win) win.focus();   // už otevřené okno přenést do popředí
    } catch (err) {
      console.warn(LOG, err);
    }
  }

  // přidá tlačítko k jedné hodině (pokud tam ještě není) a vrátí ho
  function addButton(lessonEl) {
    const existing = lessonEl.querySelector('.' + BTN_CLASS);
    if (existing) return existing;
    if (!readPeriod(lessonEl)) return null;   // např. poslední řádek „Přidat hodinu“
    const label = lessonEl.querySelector(SEL.label);
    if (!label) return null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.textContent = BTN_ICON;
    btn.title = TITLE_DEFAULT;               // popis se ukáže při najetí myší
    btn.setAttribute('aria-label', TITLE_DEFAULT);
    btn.addEventListener('click', onClick);
    // pro jistotu: kdyby EduPage otevírala nabídku už při stisku tlačítka myši
    btn.addEventListener('mousedown', (e) => e.stopPropagation());

    const link = label.querySelector(':scope > ' + SEL.link);
    if (link) link.after(btn);   // vpravo od názvu hodiny a učebny
    else label.appendChild(btn);
    return btn;
  }

  // projde stránku, doplní tlačítka ke všem hodinám s výukou a obarví je
  function scan() {
    try {
      const date = readDate();
      document.querySelectorAll(SEL.lessons).forEach((list) => {
        list.querySelectorAll(SEL.lesson).forEach((lessonEl) => {
          try {
            const btn = addButton(lessonEl);
            if (btn) updateStatus(btn, lessonEl, date);
          } catch (err) {
            console.warn(LOG, err);
          }
        });
      });
    } catch (err) {
      console.warn(LOG, err);
    }
  }

  // EduPage při přepnutí dne překreslí obsah (stovky změn naráz) a vložená
  // tlačítka zmizí. Při změně proto naplánujeme jednu kontrolu za 200 ms;
  // další změny mezitím novou kontrolu nepřidávají (stránka se tím nezatíží).
  try {
    let timer = null;
    const observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; scan(); }, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    loadStored();
  } catch (err) {
    console.warn(LOG, err);
  }
})();
