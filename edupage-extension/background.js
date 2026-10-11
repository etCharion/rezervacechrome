// Rezervace BMA – „přijímač“ dat z rezervační aplikace.
//
// Když je rezervační aplikace v Chromu otevřená, pošle sem přehled:
//   mine – kde máte vy rezervovaný vozík (datum, hodina, název, patro),
//   full – ve kterých patrech jsou na danou hodinu všechny vozíky obsazené.
// Tady se jen zkontroluje a uloží do úložiště rozšíření. Tlačítka v EduPage
// (content.js) si ho přečtou a obarví se. Nic jiného se tu neděje – rozšíření
// se nepřihlašuje a do databáze nepřistupuje.

// Zprávy přijímáme jen od rezervační aplikace (viz externally_connectable
// v manifest.json). Pro zkoušku s aplikací u sebe změnit i tady.
const APP_PREFIX = 'https://etcharion.github.io/rezervacechrome/';

const KEY_RE = /^\d{4}-\d{2}-\d{2}\|\d$/;   // „2026-10-15|5“ = datum | hodina
const MAX_KEYS = 3000;

const isFloor = (f) => Number.isInteger(f) && f >= 0 && f <= 9;

// Zkontroluje tvar dat (pro jistotu, i když přicházejí jen z naší aplikace).
// Vrátí vyčištěná data, nebo null.
function sanitize(msg) {
  if (!msg || typeof msg.mine !== 'object' || typeof msg.full !== 'object') return null;
  const mine = {};
  const full = {};
  let count = 0;
  for (const [key, list] of Object.entries(msg.mine || {})) {
    if (!KEY_RE.test(key) || !Array.isArray(list) || ++count > MAX_KEYS) return null;
    mine[key] = list.slice(0, 20).map((x) => ({
      name: String((x && x.name) || '').slice(0, 60),
      floor: x && isFloor(x.floor) ? x.floor : null,
    }));
  }
  for (const [key, floors] of Object.entries(msg.full || {})) {
    if (!KEY_RE.test(key) || !Array.isArray(floors) || ++count > MAX_KEYS) return null;
    full[key] = floors.filter(isFloor);
  }
  const at = Number(msg.at) || Date.now();
  const fullUntil = /^\d{4}-\d{2}-\d{2}$/.test(msg.fullUntil) ? msg.fullUntil : null;
  return { at, fullUntil, mine, full };
}

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (!sender.url || !sender.url.startsWith(APP_PREFIX) || !msg) return;

  // aplikace se ptá, jestli je rozšíření nainstalované
  if (msg.type === 'ping') {
    sendResponse({ ok: true });
    return;
  }
  // odhlášení v aplikaci → zapomenout přehled (sdílený počítač)
  if (msg.type === 'clear') {
    chrome.storage.local.remove('reservations', () => sendResponse({ ok: true }));
    return true;   // odpověď přijde později
  }
  if (msg.type === 'reservations') {
    const data = sanitize(msg);
    if (!data) {
      sendResponse({ ok: false });
      return;
    }
    chrome.storage.local.set({ reservations: data }, () => sendResponse({ ok: true }));
    return true;
  }
});
