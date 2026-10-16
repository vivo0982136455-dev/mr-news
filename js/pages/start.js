// "เริ่มที่นี่": 3 questions the first time (which themes the page is about, Shorts / long / both, minutes a day)
// and one plan sentence "หลังจาก [เลิกกะ] ฉันจะ …". Every answer can be skipped; kept in this browser only.
// The cover's "วันนี้" card is built from these answers.
import { h, toast } from "../ui.js";
import { THEMES } from "../shared/themes.js";
import { getSetup, saveSetup } from "../my-store.js";
import { lang, setLang } from "../lang.js";

export async function render(main) {
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "👋 เริ่มที่นี่"),
    h("p", {}, "ตอบ 3 ข้อ (ข้ามได้ทุกข้อ แก้ได้ทุกเมื่อ) แล้วหน้าแรกจะเลือกคลิปตัวอย่าง ไอเดีย และงานเล็กๆ ของวันนี้ให้ตรงกับเพจของ Win")),
    langCard(),
    setupForm(() => { location.hash = "#/"; }));
}

function langCard() {
  const choose = (l) => { if (l !== lang()) { setLang(l); location.reload(); } };
  return h("div", { class: "card", id: "lang" },
    h("h3", {}, "ภาษาของสมุด"),
    h("div", { class: "chips", role: "group", "aria-label": "ภาษา" },
      h("button", { type: "button", lang: "th", "aria-pressed": String(lang() === "th"), onclick: () => choose("th") }, "ไทย"),
      h("button", { type: "button", lang: "lo", "aria-pressed": String(lang() === "lo"), onclick: () => choose("lo") }, "ລາວ")),
    h("p", { class: "note" }, h("a", { href: "#/lao" }, "ตรวจคำลาว"), " · ", "เมนู ปุ่ม และหัวข้อเป็นภาษาลาวแล้ว บทเรียนยังเป็นภาษาไทย"));
}

export function setupForm(onDone) {
  const s = getSetup() || {};
  const chosen = new Set(s.themes || []);
  const themeBtns = THEMES.filter((t) => t.fit >= 1).map((t) => {
    const b = h("button", { type: "button", "aria-pressed": String(chosen.has(t.id)), onclick: () => {
      if (chosen.has(t.id)) chosen.delete(t.id);
      else if (chosen.size < 3) chosen.add(t.id);
      else return toast("เลือกได้ไม่เกิน 3 หมวด");
      b.setAttribute("aria-pressed", String(chosen.has(t.id)));
    } }, `${t.icon} ${t.name}`);
    return b;
  });
  const pick = (name, options, value) => {
    let v = value;
    const box = h("div", { class: "chips", role: "group", "aria-label": name });
    for (const [val, label] of options) {
      const b = h("button", { type: "button", "aria-pressed": String(val === v), "data-v": String(val), onclick: () => {
        v = v === val ? null : val; // tap again = no answer
        for (const x of box.children) x.setAttribute("aria-pressed", String(x.getAttribute("data-v") === String(v)));
      } }, label);
      box.append(b);
    }
    box.value = () => v;
    return box;
  };
  const format = pick("Shorts หรือคลิปยาว", [["short", "Shorts / Reels"], ["long", "คลิปยาว"], ["both", "ทั้งสองแบบ"]], s.format ?? null);
  const minutes = pick("เวลาต่อวัน", [[3, "3 นาที"], [10, "10 นาที"], [30, "30 นาที"]], s.minutes ?? null);
  const when = h("input", { type: "text", maxlength: 60, placeholder: "เลิกกะ / กินข้าวเย็น / ก่อนนอน", value: s.when || "" });
  const what = h("input", { type: "text", maxlength: 120, placeholder: "ถ่ายท่อนสั้น 3 ท่อน / เปิด Mr Idea 3 นาที", value: s.what || "" });

  const save = (skipped) => {
    saveSetup(skipped ? { ...s, skipped: true } : { themes: [...chosen], format: format.value(), minutes: minutes.value(), when: when.value.trim(), what: what.value.trim() });
    toast(skipped ? "ข้ามไปก่อน — กลับมาตอบได้ที่ \"ตั้งค่าหน้าแรก\"" : "บันทึกแล้ว ✓");
    onDone && onDone();
  };
  return h("form", { class: "card setup", onsubmit: (e) => { e.preventDefault(); save(false); } },
    h("h3", {}, "1. เพจของ Win เกี่ยวกับอะไร? ", h("small", { class: "note" }, "(เลือกได้ 1-3 หมวด)")),
    h("div", { class: "chips wrap", role: "group", "aria-label": "หมวดของเพจ" }, themeBtns),
    h("h3", {}, "2. อยากทำคลิปแบบไหน?"), format,
    h("h3", {}, "3. วันหนึ่งมีเวลาให้เพจกี่นาที?"), minutes,
    h("h3", {}, "แผนสั้นๆ 1 ประโยค ", h("small", { class: "note" }, "(คนที่ผูกงานใหม่กับเรื่องที่ทำอยู่แล้วทุกวัน ทำได้ต่อเนื่องกว่า)")),
    h("div", { class: "plan-sentence" }, h("label", {}, "หลังจาก ", when), h("label", {}, " ฉันจะ ", what)),
    h("div", { class: "row", style: { marginTop: "12px" } },
      h("button", { class: "btn primary", type: "submit" }, "บันทึก"),
      h("button", { class: "btn", type: "button", onclick: () => save(true) }, "ข้ามไปก่อน")),
    h("p", { class: "note" }, "🔒 คำตอบเก็บในเครื่องนี้เท่านั้น ไม่ขึ้นเว็บ"));
}
