// The first screen, before the book:
//  - in the INSTALLED app: the opening screen "จากมือใหม่ สู่ครีเอเตอร์มืออาชีพ" with "เปิด", every time the app is
//    opened (a reload inside the same session does not show it again);
//  - in a BROWSER: "ติดตั้งก่อน", with the right way for this phone: the install button (Android Chrome / Edge /
//    Samsung), the steps for iPhone, or "open in your browser" when the link was opened inside LINE / Facebook /
//    Instagram / TikTok (those built-in browsers cannot install). "ใช้บนเว็บไปก่อน" lets anyone in (remembered).
// Tests and Win's own links can skip it with ?web=1 in the address.
import { h, fill } from "./ui.js";
import { installState, askInstall, onInstallChange, isIOS } from "./pwa.js";

export const TAGLINE = "จากมือใหม่ สู่ครีเอเตอร์มืออาชีพ";
export const SUBLINE = "คลิปไทย-ลาวที่กำลังได้วิวทุกวัน · ไอเดียใหม่ทุกเช้า · บันได 5 ขั้น";

// the app a link was opened in, when it is not a real browser
export function inAppBrowser(ua = navigator.userAgent) {
  if (/ Line\//i.test(ua)) return "LINE";
  if (/Messenger|Orca-Android|FB_IAB\/Orca/i.test(ua)) return "Messenger";
  if (/FBAN|FBAV|FB_IAB|FB4A/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return "TikTok";
  return null;
}
const get = (store, k) => { try { return store.getItem(k); } catch { return null; } };
const set = (store, k, v) => { try { store.setItem(k, v); } catch { /* private mode: fine */ } };
const skipByLink = () => new URLSearchParams(location.search).has("web");

// returns true when a screen is shown; onDone runs when it closes (the book is already drawn underneath)
export function showGate(onDone = () => {}) {
  const st = installState();
  if (st === "app") {
    if (get(sessionStorage, "mn_splash") === "1") return false;
    open(splash(() => { set(sessionStorage, "mn_splash", "1"); close(); onDone(); }));
    return true;
  }
  if (skipByLink() || get(localStorage, "mn_web_ok") === "1") return false;
  const box = h("div", { class: "gate-body" });
  const toWeb = () => { set(localStorage, "mn_web_ok", "1"); close(); onDone(); };
  const draw = () => fill(box, ...installSteps(draw), h("button", { class: "gate-web", type: "button", onclick: toWeb }, "ใช้บนเว็บไปก่อน"));
  onInstallChange(draw); // the browser's install offer can arrive a few seconds after the page
  draw();
  open(h("div", { class: "gate install", role: "dialog", "aria-modal": "true", "aria-labelledby": "gate-title" },
    h("img", { src: "icons/icon-192.png", alt: "", width: 72, height: 72, class: "gate-icon" }),
    h("div", { class: "gate-kicker" }, "Mr News · ", TAGLINE),
    h("h1", { id: "gate-title" }, "ติดตั้ง Mr News ก่อน"),
    h("p", { class: "gate-sub" }, "มีไอคอน MN บนหน้าจอ เปิดเต็มจอ อ่านได้แม้เน็ตไม่ดี ฟรี ไม่ต้องผ่าน Play Store หรือ App Store"),
    box));
  return true;
}

function installSteps(redraw) {
  const app = inAppBrowser();
  if (app) {
    // LINE opens a link in the phone's real browser when the address carries openExternalBrowser=1
    const ext = new URL(location.href);
    ext.searchParams.set("openExternalBrowser", "1");
    return [
      h("div", { class: "gate-warn" }, `ตอนนี้เปิดอยู่ใน ${app} ซึ่งติดตั้งแอปไม่ได้ ต้องเปิดในเบราว์เซอร์ของมือถือก่อน`),
      app === "LINE" ? h("a", { class: "gate-go", href: ext.href }, "เปิดในเบราว์เซอร์") : null,
      h("ol", { class: "gate-steps" },
        h("li", {}, `แตะ ⋯ หรือ ⋮ มุมขวาบนของ ${app}`),
        h("li", {}, isIOS() ? "เลือก \"เปิดใน Safari\" (หรือ \"เปิดในเบราว์เซอร์\")" : "เลือก \"เปิดในเบราว์เซอร์\" (Chrome)"),
        h("li", {}, "แล้วติดตั้งจากหน้านี้อีกครั้ง")),
    ];
  }
  const st = installState();
  if (st === "installed") return [h("div", { class: "gate-ok", role: "status" }, "✅ ติดตั้งแล้ว — ปิดหน้านี้ แล้วเปิดจากไอคอน MN บนหน้าจอ")];
  // iPhone first: Apple gives web pages no install button, only "เพิ่มไปยังหน้าจอโฮม"
  if (isIOS()) return [h("ol", { class: "gate-steps" },
    h("li", {}, "เปิดหน้านี้ใน Safari"),
    h("li", {}, "แตะปุ่มแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ด้านล่าง"),
    h("li", {}, "เลือก \"เพิ่มไปยังหน้าจอโฮม\" → แตะ \"เพิ่ม\""))];
  if (st === "ready") return [h("button", { class: "gate-go", type: "button", onclick: async () => { await askInstall(); redraw(); } }, "ติดตั้งแอป")];
  const phone = window.matchMedia("(pointer: coarse)").matches;
  return [h("ol", { class: "gate-steps" }, phone
    ? [h("li", {}, "แตะ ⋮ มุมขวาบนของเบราว์เซอร์"), h("li", {}, "เลือก \"ติดตั้งแอป\" (หรือ \"เพิ่มลงในหน้าจอหลัก\")"), h("li", {}, "แตะ \"ติดตั้ง\"")]
    : [h("li", {}, "คลิกไอคอนติดตั้ง (จอมีลูกศรลง) ท้ายช่องที่อยู่เว็บ"), h("li", {}, "หรือเมนู ⋯ → แอป → \"ติดตั้งเว็บไซต์นี้เป็นแอป\"")])];
}

function splash(onOpen) {
  // each line breaks where the meaning breaks: "จากมือใหม่ / สู่ครีเอเตอร์มืออาชีพ"
  const lines = (text, sep) => text.split(sep).map((part, i, all) => [h("span", { class: "line" }, part.trim()), i < all.length - 1 ? sep : null]);
  return h("div", { class: "gate splash", role: "dialog", "aria-modal": "true", "aria-labelledby": "splash-title" },
    h("img", { src: "icons/icon-192.png", alt: "", width: 72, height: 72, class: "gate-icon" }),
    h("div", { class: "gate-kicker" }, "MR NEWS · สมุดครีเอเตอร์"),
    h("h1", { id: "splash-title" }, lines(TAGLINE, " ")),
    h("p", { class: "gate-sub" }, h("span", { class: "line" }, "คลิปไทย-ลาวที่กำลังได้วิวทุกวัน"), h("span", { class: "line" }, "ไอเดียใหม่ทุกเช้า · บันได 5 ขั้น")),
    h("div", { class: "gate-arrow", "aria-hidden": "true", html: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l6 6 6-6"/><path d="M6 13l6 6 6-6"/></svg>' }),
    h("button", { class: "gate-open", type: "button", onclick: onOpen }, "เปิด ", h("span", { "aria-hidden": "true" }, "→")));
}

let layer = null;
function open(el) {
  layer = h("div", { class: "gate-layer" + (el.classList.contains("splash") ? " dark" : "") }, el);
  document.body.append(layer);
  document.documentElement.classList.add("gated");
  layer.addEventListener("keydown", (e) => { if (e.key === "Escape" && el.classList.contains("splash")) el.querySelector(".gate-open").click(); });
}
function close() {
  layer?.remove();
  layer = null;
  document.documentElement.classList.remove("gated");
}
