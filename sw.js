// Service worker: lets Mr News be installed as an app and keeps it usable without a connection
// (same rules as the Lao Kip project's sw.js, which has been in use since 2026-10-01):
//   - files of this site (page, scripts, styles, data): ALWAYS ask the network first; the copy saved on the phone is
//     used only when the network fails, answers with a server error, or is slower than 4 s. A saved data file is
//     marked with the header "X-Offline-Copy" so the page can say "offline".
//   - Google Fonts (never change): saved copy first.
//   - everything else (YouTube pictures and videos, links) is not touched at all.
// Only copies of files this site itself loaded are stored. No key, no personal data (notes live in localStorage).
//
// To switch it off one day: publish a sw.js containing only
//   self.addEventListener("install", () => self.skipWaiting());
//   self.addEventListener("activate", (e) => e.waitUntil(self.registration.unregister()));

const SITE_CACHE = "mrn-site-1";
const LIB_CACHE = "mrn-libs-1";
const TIMEOUT_MS = 4000;
const SLOW_MS = 30000;
const SCOPE = self.registration.scope;
let slowUntil = 0;

function kindOf(url) {
  if (url.startsWith(SCOPE)) return url.slice(SCOPE.length).startsWith("sw.js") ? null : "site";
  if (url.startsWith("https://fonts.googleapis.com/")) return "font-css";
  if (url.startsWith("https://fonts.gstatic.com/")) return "lib";
  return null;
}
const keyOf = (url) => { const u = new URL(url); u.search = ""; u.hash = ""; return u.href; };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith("mrn-") && name !== SITE_CACHE && name !== LIB_CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

function savedCopy(res, url) {
  if (!url.endsWith(".json")) return res;
  const headers = new Headers(res.headers);
  headers.set("X-Offline-Copy", "1");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function keep(key, copy, savedPromise, cachePromise) {
  const saved = await savedPromise.catch(() => null);
  const tag = copy.headers.get("etag");
  if (saved && tag && saved.headers.get("etag") === tag) {
    if (copy.body) copy.body.cancel().catch(() => {});
    return;
  }
  await (await cachePromise).put(key, copy);
}

async function siteFile(event) {
  const req = event.request;
  const key = keyOf(req.url);
  const cachePromise = caches.open(SITE_CACHE);
  const savedPromise = cachePromise.then((cache) => cache.match(key));
  const network = fetch(req, { cache: "no-cache" }).then((res) => {
    if (res.status === 200 && res.type === "basic") event.waitUntil(keep(key, res.clone(), savedPromise, cachePromise).catch(() => {}));
    return res;
  });
  network.catch(() => {});
  const saved = await savedPromise.catch(() => null);
  if (!saved) return network;
  event.waitUntil(network.catch(() => {}));
  if (Date.now() < slowUntil) return savedCopy(saved, key);
  let timer;
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve(null), TIMEOUT_MS); });
  try {
    const res = await Promise.race([network, late]);
    if (!res) { slowUntil = Date.now() + SLOW_MS; return savedCopy(saved, key); }
    return res.status >= 500 ? savedCopy(saved, key) : res;
  } catch {
    return savedCopy(saved, key);
  } finally {
    clearTimeout(timer);
  }
}

async function libFile(event) {
  const url = event.request.url;
  const cache = await caches.open(LIB_CACHE);
  const saved = await cache.match(url, { ignoreVary: true });
  if (saved) return saved;
  const res = await fetch(event.request);
  if (res.status === 200 && res.type === "cors") event.waitUntil(cache.put(url, res.clone()).catch(() => {}));
  return res;
}

async function fontCss(event) {
  const url = event.request.url;
  const cache = await caches.open(LIB_CACHE);
  const saved = await cache.match(url, { ignoreVary: true });
  const network = fetch(event.request).then((res) => {
    if (res.status === 200 && res.type === "cors") event.waitUntil(cache.put(url, res.clone()).catch(() => {}));
    return res;
  });
  if (!saved) return network;
  event.waitUntil(network.catch(() => {}));
  return saved;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const kind = kindOf(req.url);
  if (!kind) return;
  const answer = kind === "site" ? siteFile(event) : kind === "font-css" ? fontCss(event) : libFile(event);
  event.respondWith(answer.catch(() => fetch(req)));
});

// First visit: the page loaded before this worker existed, so the page sends the list of files it has loaded
// (js/pwa.js) and they are saved now. Lesson pages are added too, so the book can be read offline.
async function warm(urls) {
  const site = await caches.open(SITE_CACHE);
  const libs = await caches.open(LIB_CACHE);
  const list = [...new Set(urls.filter((u) => typeof u === "string"))].slice(0, 300);
  await Promise.all(list.map(async (url) => {
    const kind = kindOf(url);
    if (!kind) return;
    const cache = kind === "site" ? site : libs;
    const key = kind === "site" ? keyOf(url) : url;
    try {
      if (await cache.match(key, { ignoreVary: true })) return;
      const res = await fetch(url, kind === "site" ? { credentials: "same-origin" } : { mode: "cors", credentials: "omit" });
      if (res.status === 200 && (res.type === "basic" || res.type === "cors")) await cache.put(key, res);
    } catch { /* saved on a later visit */ }
  }));
}
self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "warm" && Array.isArray(msg.urls)) event.waitUntil(warm(msg.urls));
});
