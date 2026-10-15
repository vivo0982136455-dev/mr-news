// สมุดโน้ตของ Win: trends, ideas, scripts, own results. Lives in this browser only; backup = export file.
import { h, thTime, toast, copy, store, fill } from "../ui.js";
import { allNotes, saveNotes, addNote, PAGES_FOR, KINDS } from "../notes-store.js";
import { KEYS as MY_KEYS } from "../my-store.js";
import { backupNow, backupNag, download } from "../backup.js";

const FIELDS = [
  ["topic", "หัวข้อ / ชื่อคลิป / ไอเดีย", "input", true],
  ["kind", "ประเภท", KINDS],
  ["page", "ใช้กับเพจไหน", PAGES_FOR],
  ["source", "ได้มาจากไหน", "input"],
  ["link", "ลิงก์", "input"],
  ["format", "รูปแบบ (POV, ก่อน-หลัง, ทายราคา…) / ความยาว", "input"],
  ["sound", "เพลง / เสียง", "input"],
  ["views", "ยอดวิว / ผล", "input"],
  ["why", "ทำไมคนดู (ความเห็นของ Win)", "textarea", true],
  ["plan", "แผนของเรา / บท", "textarea", true],
];

export async function render(main) {
  let filter = { q: "", kind: "", page: "" };
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "📒 สมุดโน้ตของ Win"),
    h("p", {}, "จดเทรนด์ ไอเดีย บท และผลคลิปของเราไว้ที่เดียว กด 📌 ในหน้า Mr News / Mr Idea ก็จดมาที่นี่อัตโนมัติ"),
    h("div", { class: "row", style: { margin: "0 0 10px" } }, h("a", { class: "btn", href: "#/plan" }, "🗓️ แผนสัปดาห์นี้"), h("a", { class: "btn", href: "#/results" }, "📈 ผลคลิปของเรา")),
    backupNag(() => location.reload()),
    h("div", { class: "warn" }, "🔒 โน้ต แผนสัปดาห์ และผลคลิป เก็บในเบราว์เซอร์นี้เท่านั้น (ไม่ขึ้นเว็บ ไม่มีใครเห็น) ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่องจะหาย — กด \"สำรองเป็นไฟล์\" เป็นประจำ (ไฟล์เดียวเก็บครบทุกอย่าง)")));

  // ---- the form ----
  const inputs = {};
  const form = h("form", { class: "form card", onsubmit: (e) => {
    e.preventDefault();
    const n = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()]));
    if (!n.topic) return toast("ใส่หัวข้อก่อน");
    addNote(n);
    for (const [k, el] of Object.entries(inputs)) if (el.tagName !== "SELECT") el.value = "";
    draw();
  } });
  for (const [key, label, type, wide] of FIELDS) {
    const el = Array.isArray(type) ? h("select", {}, type.map((o) => h("option", {}, o))) : type === "textarea" ? h("textarea", {}) : h("input", { type: key === "link" ? "url" : "text", inputmode: key === "link" ? "url" : undefined });
    inputs[key] = el;
    form.append(h("label", { class: wide ? "wide" : "" }, label, el));
  }
  form.append(h("div", { class: "wide row" }, h("button", { class: "btn primary", type: "submit" }, "บันทึกลงสมุด")));
  main.append(h("details", { class: "card", open: allNotes().length === 0 || undefined }, h("summary", { style: { cursor: "pointer", fontWeight: 600 } }, "✏️ จดโน้ตใหม่"), h("div", { style: { marginTop: "10px" } }, form)));

  // ---- tools ----
  const search = h("input", { type: "search", placeholder: "ค้นหาในสมุด…", class: "btn", style: { flex: "1 1 200px", textAlign: "left" }, oninput: (e) => { filter.q = e.target.value.toLowerCase(); draw(); } });
  const kindSel = h("select", { class: "btn small", onchange: (e) => { filter.kind = e.target.value; draw(); } }, h("option", { value: "" }, "ทุกประเภท"), KINDS.map((k) => h("option", {}, k)));
  const pageSel = h("select", { class: "btn small", onchange: (e) => { filter.page = e.target.value; draw(); } }, h("option", { value: "" }, "ทุกเพจ"), PAGES_FOR.map((k) => h("option", {}, k)));
  const fileIn = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: importFile });
  main.append(h("div", { class: "controls", style: { marginTop: "16px" } }, search, kindSel, pageSel),
    h("div", { class: "row", style: { marginBottom: "12px" } },
      h("button", { class: "btn small", onclick: () => backupNow() }, "💾 สำรองเป็นไฟล์"),
      h("button", { class: "btn small", onclick: () => fileIn.click() }, "📂 เปิดไฟล์สำรอง"),
      h("button", { class: "btn small", onclick: exportCsv }, "📊 ส่งออกให้ Excel"), fileIn));

  const list = h("div", { class: "grid", style: { gap: "10px" } });
  main.append(list);

  function draw() {
    const notes = allNotes().filter((n) => (!filter.kind || n.kind === filter.kind) && (!filter.page || n.page === filter.page) &&
      (!filter.q || JSON.stringify(n).toLowerCase().includes(filter.q)));
    if (!notes.length) return fill(list, h("div", { class: "empty" }, allNotes().length ? "ไม่มีโน้ตที่ตรงกับตัวกรอง" : "ยังไม่มีโน้ต — ลองกด 📌 จดลงสมุด ที่การ์ดคลิปในหน้า Mr News"));
    fill(list, ...notes.map(noteItem));
  }
  function noteItem(n) {
    const field = (k, label) => n[k] ? h("div", { class: "note", style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" } }, h("b", {}, label + ": "), n[k]) : null;
    return h("div", { class: "note-item" },
      h("div", { class: "h" }, h("span", { class: "pill" }, n.kind || "โน้ต"), h("span", { class: "pill brand" }, n.page || ""), h("span", {}, thTime(n.at))),
      h("div", { class: "tt" }, n.topic),
      field("source", "ที่มา"), field("channel", "ช่อง"), n.link ? h("div", { class: "note" }, h("a", { href: /^https?:\/\//.test(n.link) ? n.link : "#", target: "_blank", rel: "noopener" }, "เปิดลิงก์ ↗")) : null,
      field("format", "รูปแบบ"), field("sound", "เสียง"), field("views", "ยอดวิว"), field("why", "ทำไมคนดู"), field("plan", "แผน"),
      h("div", { class: "row", style: { marginTop: "8px" } },
        h("button", { class: "btn small", onclick: () => editWhy(n) }, "✏️ เขียนความเห็น"),
        h("button", { class: "btn small", onclick: () => copy(Object.entries(n).filter(([k]) => !["id", "at"].includes(k)).map(([k, v]) => `${k}: ${v}`).join("\n")) }, "คัดลอก"),
        h("button", { class: "btn small", onclick: () => { if (confirm("ลบโน้ตนี้?")) { saveNotes(allNotes().filter((x) => x.id !== n.id)); draw(); } } }, "ลบ")));
  }
  function editWhy(n) {
    const v = prompt("ทำไมคนดูคลิปนี้ / ความเห็นของ Win:", n.why || "");
    if (v == null) return;
    saveNotes(allNotes().map((x) => (x.id === n.id ? { ...x, why: v } : x)));
    draw();
  }
  function exportCsv() {
    const cols = ["at", "kind", "page", "topic", "source", "link", "channel", "format", "sound", "views", "why", "plan"];
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [cols.join(","), ...allNotes().map((n) => cols.map((c) => q(n[c])).join(","))];
    download(`mr-news-notes-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + rows.join("\r\n"), "text/csv");
  }
  async function importFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const incoming = Array.isArray(j) ? j : j.notes;
      if (!Array.isArray(incoming)) throw new Error("ไม่ใช่ไฟล์สำรองของสมุดนี้");
      const have = new Set(allNotes().map((n) => n.id));
      const add = incoming.filter((n) => n && n.id && n.topic && !have.has(n.id)).map((n) => Object.fromEntries(Object.entries(n).map(([k, v]) => [k, String(v).slice(0, 5000)])));
      saveNotes([...add, ...allNotes()]);
      // plan / results / reviews: lists are merged by id, the setup and plan are taken only when this browser has none
      let more = 0;
      for (const [k, v] of Object.entries(j.mine || {})) {
        if (!MY_KEYS.includes(k) || v == null) continue;
        const cur = store.get(k, null);
        if (Array.isArray(v)) {
          const have = new Set((cur || []).map((x) => x.id));
          const extra = v.filter((x) => x && x.id && !have.has(x.id));
          if (extra.length) { store.set(k, [...(cur || []), ...extra]); more += extra.length; }
        } else if (cur == null && typeof v === "object") { store.set(k, v); more++; }
      }
      toast(`เพิ่ม ${add.length} โน้ตจากไฟล์` + (more ? ` และงานของ Win ${more} รายการ` : ""));
      draw();
    } catch (err) {
      toast("เปิดไฟล์ไม่ได้: " + err.message);
    }
    e.target.value = "";
  }
  draw();
}
