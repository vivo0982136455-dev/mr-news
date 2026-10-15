// The book's shell: table of contents (side on computers, bottom bar on phones), page switching by #/address,
// light/dark choice. Each page module exports render(main, arg).
import { h, store } from "./ui.js";
import { CHAPTERS, chapterProgress } from "./book.js";
import { startPwa } from "./pwa.js";
import { showGate } from "./gate.js";

startPwa();

const PAGES = {
  "": () => import("./pages/home.js"),
  news: () => import("./pages/news.js"),
  idea: () => import("./pages/idea.js"),
  handbook: () => import("./pages/chapter.js"),
  human: () => import("./pages/chapter.js"),
  ai: () => import("./pages/chapter.js"),
  learn: () => import("./pages/learn.js"),
  notes: () => import("./pages/notes.js"),
  start: () => import("./pages/start.js"),
  plan: () => import("./pages/plan.js"),
  results: () => import("./pages/results.js"),
  ladder: () => import("./pages/ladder.js"),
  review: () => import("./pages/review.js"),
  search: () => import("./pages/search.js"),
};
const BOTTOM = [
  ["", "🏠", "หน้าแรก"],
  ["news", "📰", "Mr News"],
  ["idea", "💡", "Mr Idea"],
  ["learn", "📚", "เรียน"],
  ["notes", "📒", "สมุด"],
];

// ---- theme: auto (follows the phone) / light / dark ----
function applyTheme(t) {
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}
applyTheme(store.get("mn_theme", "auto"));
function themeButton() {
  const names = { auto: "🌗 อัตโนมัติ", light: "☀️ สว่าง", dark: "🌙 มืด" };
  const b = h("button", { class: "icon-btn", type: "button", title: "เปลี่ยนโหมดสี" }, names[store.get("mn_theme", "auto")]);
  b.addEventListener("click", () => {
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(store.get("mn_theme", "auto")) + 1) % 3];
    store.set("mn_theme", next);
    applyTheme(next);
    for (const x of document.querySelectorAll(".theme-btn")) x.textContent = names[next];
  });
  b.classList.add("theme-btn");
  return b;
}

function shell() {
  const side = h("aside", { class: "side" },
    h("a", { class: "logo", href: "#/" }, h("b", {}, "MN"), "สมุดครีเอเตอร์ของ Win"),
    h("nav", { "aria-label": "สารบัญ" },
      h("div", { class: "ch" }, "ทุกวัน"),
      link("news", "📰", "Mr News"), link("idea", "💡", "Mr Idea"), link("notes", "📒", "สมุดโน้ตของ Win"),
      h("div", { class: "ch" }, "งานของ Win"),
      link("plan", "🗓️", "แผนสัปดาห์นี้"), link("results", "📈", "ผลคลิปของเรา"),
      h("div", { class: "ch" }, "บทเรียน"),
      link("ladder", "🪜", "บันได 5 ขั้น"), link("review", "🧠", "ทวนความจำ"), link("search", "🔎", "ค้นหา + อภิธานศัพท์"),
      CHAPTERS.map((c) => link(c.id, c.icon, c.title, true)),
      h("div", { class: "ch" }, "อื่นๆ"), link("", "🏠", "หน้าแรก / ปก")),
    h("div", { class: "foot" }, themeButton(), h("p", { style: { marginTop: "10px" } }, "ข้อมูลอัปเดตเองทุก 6 ชั่วโมง โน้ตของ Win เก็บในเครื่องนี้เท่านั้น")));
  const top = h("header", { class: "top" }, h("a", { class: "logo", href: "#/" }, h("b", {}, "MN"), "สมุดครีเอเตอร์"), h("span", { class: "spacer" }),
    h("a", { class: "icon-btn", href: "#/search", "aria-label": "ค้นหาทั้งเล่ม", style: { display: "inline-flex", alignItems: "center", textDecoration: "none" } }, "🔎"), themeButton());
  const main = h("main", { id: "main", tabindex: "-1" });
  const bottom = h("nav", { class: "bottom", "aria-label": "เมนูหลัก" }, BOTTOM.map(([id, ico, name]) => h("a", { href: "#/" + id, "data-id": id }, h("span", { class: "ico" }, ico), name)));
  document.body.replaceChildren(h("div", { class: "app" }, side, h("div", { style: { minWidth: 0 } }, top, main)), bottom);
  return main;
}
function link(id, ico, name, prog) {
  return h("a", { href: "#/" + id, "data-id": id }, h("span", {}, ico), h("span", {}, name), prog ? h("span", { class: "prog", "data-prog": id }) : null);
}

function markCurrent(id) {
  const learnIds = new Set(["learn", "ladder", "review", "search", ...CHAPTERS.map((c) => c.id)]);
  for (const a of document.querySelectorAll(".side nav a, .bottom a")) {
    const aid = a.getAttribute("data-id");
    const on = aid === id || (a.closest(".bottom") && ((aid === "learn" && learnIds.has(id)) || (aid === "notes" && (id === "plan" || id === "results")) || (aid === "" && id === "start")));
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  for (const el of document.querySelectorAll("[data-prog]")) {
    const p = chapterProgress(el.getAttribute("data-prog"));
    el.textContent = p.total ? `${p.done}/${p.total}` : "";
  }
}

const main = shell();
let renderSeq = 0;
async function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [id, ...rest] = hash.split("/");
  const page = PAGES[id] ? id : "";
  const seq = ++renderSeq;
  markCurrent(page);
  main.replaceChildren(h("div", { class: "loading" }, "กำลังเปิด…"));
  try {
    const mod = await PAGES[page]();
    if (seq !== renderSeq) return;
    main.replaceChildren();
    await mod.render(main, page, rest.join("/"));
    if (seq !== renderSeq) return;
    markCurrent(page);
    const anchor = rest.join("/");
    if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
    else window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    if (seq === renderSeq) main.replaceChildren(h("div", { class: "card" }, h("h2", {}, "เปิดหน้านี้ไม่ได้"), h("p", {}, "ลองกดรีเฟรช ถ้ายังไม่ได้ ให้บอก Steep พร้อมข้อความนี้:"), h("code", {}, String(e.message || e))));
  }
}
window.addEventListener("hashchange", route);
showGate(); // "ติดตั้งก่อน" in a browser, the opening screen in the installed app; the book draws underneath
window.addEventListener("mn-progress", () => markCurrent((location.hash.replace(/^#\/?/, "").split("/")[0])));
route();
