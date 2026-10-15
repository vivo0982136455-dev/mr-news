// Install as an app + a copy for use without a connection (the work is done by sw.js at the site root).
// Keeps the browser's "install" offer for the button on the cover page. Without service-worker support the
// site simply works as a normal web page.

let offer = null; // the browser's install offer (Chrome / Edge / Samsung), kept until the button is tapped
let done = false;
let notify = () => {};
export const onInstallChange = (fn) => { notify = fn; };

const standalone = () => ["standalone", "window-controls-overlay", "minimal-ui"].some((m) => window.matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// "app" = opened from the icon · "installed" = just installed · "ready" = the button can install · "manual" = use the browser menu
export function installState() {
  if (standalone()) return "app";
  if (done) return "installed";
  return offer ? "ready" : "manual";
}

export async function askInstall() {
  if (!offer) return "unavailable";
  const ev = offer;
  offer = null;
  try {
    ev.prompt();
    const choice = await ev.userChoice;
    return choice && choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "unavailable";
  } finally {
    notify();
  }
}

// lesson chapters are loaded only when opened: list them too, so the whole book can be read offline
const BOOK_FILES = ["js/pages/chapter.js", "js/pages/learn.js", "js/pages/notes.js", "js/pages/idea.js", "js/pages/news.js", "js/pages/home.js",
  "js/pages/start.js", "js/pages/plan.js", "js/pages/results.js", "js/my-store.js", "js/shared/patterns.js",
  "js/pages/ladder.js", "js/pages/review.js", "js/quiz-ui.js", "js/content/quiz.js", "js/content/ladder.js",
  "js/pages/search.js", "js/content/glossary.js", "js/backup.js",
  "js/content/handbook.js", "js/content/human.js", "js/content/ai.js", "js/content/figures.js", "js/content/widgets.js",
  "data/latest.json", "data/ideas.json", "data/index.json", "data/history.json", "data/famous.json", "data/learn.json", "manifest.webmanifest", "icons/icon-192.png"];
function loadedFiles() {
  const base = new URL("./", location.href).href;
  const list = performance.getEntriesByType("resource").map((e) => e.name);
  list.push(location.href.split("#")[0], ...BOOK_FILES.map((f) => base + f));
  return list;
}

export function startPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // no automatic banner: the cover page has the button
    offer = e;
    notify();
  });
  window.addEventListener("appinstalled", () => { offer = null; done = true; notify(); });
  if (!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  const warm = () => { if (sw.controller) sw.controller.postMessage({ type: "warm", urls: loadedFiles() }); };
  sw.addEventListener("controllerchange", () => { warm(); setTimeout(warm, 5000); });
  const register = () => sw.register("sw.js").then(() => setTimeout(warm, 3000)).catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}
