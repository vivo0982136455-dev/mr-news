// ผลคลิปของเรา: Win types the numbers of each of his own clips (YouTube Studio / Facebook / TikTok show them only to
// the owner - no public API gives them). Each clip is compared with Win's OWN usual (the median of his last 10
// clips on the same platform), never with other people's channels. Then the 30-minute Sunday review: best and
// worst clip → one guess why → change one thing next week. Kept in this browser only.
import { h, num, thDay, toast, store, info } from "../ui.js";
import { PAGES_FOR } from "../notes-store.js";
import { WHERE, getResults, saveResults, myUsual, timesMyUsual, getReviews, saveReviews, thisWeek } from "../my-store.js";
import { thaiDay, thaiNow, addDays } from "../shared/patterns.js";

const WHERE_NAME = Object.fromEntries(WHERE);
const MY_X_TEXT = "×N ของปกติเรา = วิวคลิปนี้ ÷ ค่ากลางวิวของคลิปล่าสุด 10 คลิปของ Win บนแพลตฟอร์มเดียวกัน · ที่มา: ตัวเลขที่ Win จดเอง · เทียบกับตัวเองเท่านั้น เพราะตัวเลขมาตรฐานของวงการขัดกันเอง และช่องใหม่ยังไม่มีอะไรให้เทียบ";

export async function render(main) {
  const box = h("div");
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "📈 ผลคลิปของเรา"),
    h("p", {}, "จดตัวเลขของคลิปที่ Win โพสต์ แล้วดูว่าคลิปไหน \"เกินปกติของเราเอง\" ทุกวันอาทิตย์ใช้ 30 นาทีทบทวน: คลิปดีสุด/แย่สุด → เดาเหตุผล 1 ข้อ → สัปดาห์หน้าเปลี่ยน 1 อย่าง")), box);
  const draw = () => box.replaceChildren(...view(draw));
  draw();
}

function view(draw) {
  const list = getResults().sort((a, b) => (a.date < b.date ? 1 : -1));
  const out = [];
  // own usual per platform
  const used = WHERE.filter(([k]) => list.some((r) => r.where === k));
  if (used.length) out.push(h("div", { class: "grid g4" }, used.map(([k, name]) =>
    h("div", { class: "tile" }, h("div", { class: "label" }, `ปกติของเรา · ${name}`), h("div", { class: "value" }, num(myUsual(list, k))), h("div", { class: "delta" }, (() => { const n = Math.min(10, list.filter((r) => r.where === k).length); return `ค่ากลางวิว ${n} คลิปล่าสุด` + (n < 5 ? " · ยังน้อย จะนิ่งขึ้นเมื่อมี 5 คลิป" : ""); })())))));
  out.push(form(draw));
  out.push(h("div", { class: "section" }, h("h2", {}, "คลิปของเรา ", h("small", {}, `${list.length} คลิป · `, info("×N ของปกติเรา", MY_X_TEXT, "x"))),
    list.length ? h("div", { class: "table-wrap" }, h("table", { class: "data" },
      h("thead", {}, h("tr", {}, ["วันที่", "คลิป", "ที่ไหน", "วิว", "×ปกติเรา", "ดูต่อ", "คอมเมนต์", "แชร์", ""].map((x, i) => h("th", { class: i >= 3 && i < 8 ? "num" : null }, x)))),
      h("tbody", {}, list.map((r) => {
        const x = timesMyUsual(r, list);
        return h("tr", {}, h("td", { style: { whiteSpace: "nowrap" } }, thDay(r.date).split(" ").slice(0, 2).join(" ")), h("td", {}, r.link ? h("a", { href: r.link, target: "_blank", rel: "noopener" }, r.t) : r.t),
          h("td", {}, WHERE_NAME[r.where] || r.where), h("td", { class: "num" }, num(r.views, { compact: false })),
          h("td", { class: "num" }, x == null ? "–" : `×${x}`), h("td", { class: "num" }, r.stay ? r.stay + "%" : "–"),
          h("td", { class: "num" }, num(r.comments, { compact: false })), h("td", { class: "num" }, num(r.shares, { compact: false })),
          h("td", {}, h("button", { class: "btn small", type: "button", "aria-label": "ลบ " + r.t, onclick: () => { if (confirm(`ลบ "${r.t}"?`)) { saveResults(getResults().filter((y) => y.id !== r.id)); draw(); } } }, "ลบ")));
      }))))
      : h("div", { class: "empty" }, "ยังไม่มีคลิป — โพสต์คลิปแรกแล้วกลับมาจดตัวเลขหลังโพสต์ 7 วัน")));
  if (list.some((r) => r.where.startsWith("yt-"))) out.push(yppSync(list));
  out.push(review(list, draw));
  return out;
}

function form(draw) {
  const f = {
    date: h("input", { type: "date", value: thaiDay(), max: thaiDay(), required: true }),
    where: h("select", {}, WHERE.map(([k, n]) => h("option", { value: k }, n))),
    page: h("select", {}, PAGES_FOR.slice(0, 2).map((p) => h("option", {}, p))),
    t: h("input", { type: "text", maxlength: 200, required: true, placeholder: "ชื่อคลิป" }),
    link: h("input", { type: "url", maxlength: 300, placeholder: "https://… (ไม่ใส่ก็ได้)" }),
    views: h("input", { type: "number", inputmode: "numeric", min: 0, required: true }),
    stay: h("input", { type: "number", inputmode: "decimal", min: 0, max: 100, step: "0.1", placeholder: "เช่น 72" }),
    likes: h("input", { type: "number", inputmode: "numeric", min: 0 }),
    comments: h("input", { type: "number", inputmode: "numeric", min: 0 }),
    shares: h("input", { type: "number", inputmode: "numeric", min: 0 }),
    subs: h("input", { type: "number", inputmode: "numeric", min: 0 }),
  };
  const L = (label, el, hint, wide) => h("label", { class: wide ? "wide" : null }, label, el, hint ? h("span", { class: "note" }, hint) : null);
  return h("details", { class: "card more", open: getResults().length === 0 || undefined },
    h("summary", {}, "➕ จดผลคลิปใหม่"),
    h("form", { class: "form", style: { marginTop: "10px" }, onsubmit: (e) => {
      e.preventDefault();
      if (f.link.value && !/^https:\/\//.test(f.link.value)) return toast("ลิงก์ต้องขึ้นต้นด้วย https://");
      const n = (el) => (el.value === "" ? null : Math.max(0, Number(el.value)));
      const r = { id: Date.now().toString(36), date: f.date.value, where: f.where.value, page: f.page.value, t: f.t.value.trim(), link: f.link.value.trim(),
        views: n(f.views), stay: n(f.stay), likes: n(f.likes), comments: n(f.comments), shares: n(f.shares), subs: n(f.subs), at: new Date().toISOString() };
      saveResults([r, ...getResults()]);
      toast("จดผลคลิปแล้ว 📈");
      draw();
    } },
      L("วันที่โพสต์", f.date), L("โพสต์ที่ไหน", f.where), L("เพจ", f.page), L("ชื่อคลิป", f.t, null, true), L("ลิงก์", f.link, null, true),
      L("วิว", f.views, "จดหลังโพสต์ 7 วันเท่ากันทุกคลิป จะเทียบกันได้ยุติธรรม"),
      L("ดูต่อ %", f.stay, "Shorts: \"ดูต่อ / Stayed to watch\" · คลิปยาว: \"ดูเฉลี่ย %\""),
      L("ไลก์", f.likes), L("คอมเมนต์", f.comments), L("แชร์", f.shares), L("ผู้ติดตามที่ได้", f.subs),
      h("div", { class: "wide" }, h("button", { class: "btn primary", type: "submit" }, "บันทึก"))));
}

// fill the "how far from the Partner Program" calculator from the clips Win typed (YouTube only, last 90 days)
function yppSync(list) {
  const from = addDays(thaiDay(), -90);
  const yt = list.filter((r) => r.where.startsWith("yt-") && r.date >= from);
  const shortViews = yt.filter((r) => r.where === "yt-short").reduce((a, r) => a + (r.views || 0), 0);
  return h("div", { class: "card", style: { marginTop: "14px" } },
    h("b", {}, "🎯 ส่งตัวเลขให้ตัวคำนวณ YPP "), h("span", { class: "note" }, `คลิป YouTube ใน 90 วัน ${yt.length} คลิป · วิว Shorts รวม ${num(shortViews, { compact: false })}`),
    h("div", { class: "row", style: { marginTop: "8px" } },
      h("button", { class: "btn small", type: "button", onclick: () => { store.set("mn_ypp_up", yt.length); store.set("mn_ypp_shorts", shortViews); toast("ส่งแล้ว — เปิดดูในบท \"เงินและเกณฑ์\""); } }, "ส่งตัวเลข"),
      h("a", { class: "btn small", href: "#/handbook" }, "เปิดตัวคำนวณ YPP")),
    h("p", { class: "note" }, "เป็นตัวเลขจากที่ Win จดเอง ตัวเลขจริงที่ YouTube ใช้ดูได้ที่ YouTube Studio → หาเงิน"));
}

// ---------------------------------------------------------------- the Sunday review (30 minutes)
function review(list, draw) {
  const week = thisWeek();
  const recent = list.filter((r) => r.date >= addDays(thaiDay(), -7));
  const ranked = recent.map((r) => ({ r, x: timesMyUsual(r, list) ?? 0 })).sort((a, b) => b.x - a.x || b.r.views - a.r.views);
  const reviews = getReviews();
  const last = reviews.find((v) => v.week < week);
  const opt = (sel) => h("select", {}, h("option", { value: "" }, "— เลือกคลิป —"), recent.map((r) => h("option", { value: r.id, selected: sel === r.id }, r.t)));
  const best = opt(ranked[0]?.r.id), worst = opt(ranked.length > 1 ? ranked[ranked.length - 1].r.id : "");
  const why = h("textarea", { maxlength: 600, placeholder: "คลิปดีสุดต่างจากคลิปแย่สุดตรงไหน: ประโยคเปิด ความยาว ชื่อ ภาพปก เวลาโพสต์ เรื่อง…" });
  const hypo = h("input", { type: "text", maxlength: 200, placeholder: "ถ้า … คนจะดูต่อมากขึ้น" });
  const change = h("input", { type: "text", maxlength: 200, placeholder: "เช่น เปิดคลิปด้วยคำถามทุกคลิป" });
  const ics = () => {
    const now = new Date();
    const toSunday = (7 - thaiNow().getUTCDay()) % 7; // 0 when today is Sunday
    const sunday = addDays(thaiDay(), toSunday).replace(/-/g, "");
    const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mr News//TH", "BEGIN:VEVENT", "UID:mr-news-sunday-review", `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART:${sunday}T130000Z`, "DURATION:PT30M", "RRULE:FREQ=WEEKLY;BYDAY=SU", "SUMMARY:ทบทวนคลิป 30 นาที (Mr News)",
      `DESCRIPTION:คลิปดีสุด/แย่สุด → เดาเหตุผล 1 ข้อ → สัปดาห์หน้าเปลี่ยน 1 อย่าง`, `URL:${location.href.split("#")[0]}#/results`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "text/calendar" })), download: "mr-news-sunday-review.ics" });
    document.body.append(a); a.click(); a.remove();
  };
  return h("div", { class: "section" }, h("h2", {}, "🧭 ทบทวนวันอาทิตย์ ", h("small", {}, "30 นาที · สัปดาห์ละครั้ง")),
    last?.change ? h("div", { class: "tip-box" }, `สัปดาห์ที่แล้วตั้งใจเปลี่ยน: “${last.change}” — ได้ผลไหม? ดูคลิปของสัปดาห์นี้ข้างบน`) : null,
    recent.length < 2 ? h("p", { class: "note" }, "ต้องมีคลิปใน 7 วันที่ผ่านมาอย่างน้อย 2 คลิป จึงเทียบดีสุด/แย่สุดได้ — ระหว่างนี้ยังเขียนสมมติฐานได้") : null,
    h("form", { class: "card form", onsubmit: (e) => {
      e.preventDefault();
      if (!hypo.value.trim() && !change.value.trim()) return toast("เขียนอย่างน้อย สมมติฐาน หรือ สิ่งที่จะเปลี่ยน 1 อย่าง");
      saveReviews([{ id: Date.now().toString(36), week, best: best.value, worst: worst.value, why: why.value.trim(), hypo: hypo.value.trim(), change: change.value.trim(), at: new Date().toISOString() },
        ...getReviews().filter((v) => v.week !== week)]);
      toast("บันทึกการทบทวนแล้ว ✓");
      draw();
    } },
      h("label", {}, "1. คลิปดีสุดของสัปดาห์ (เทียบกับปกติของเรา)", best), h("label", {}, "2. คลิปแย่สุด", worst),
      h("label", { class: "wide" }, "3. สองคลิปนี้ต่างกันตรงไหน", why),
      h("label", { class: "wide" }, "4. สมมติฐาน 1 ข้อ", hypo), h("label", { class: "wide" }, "5. สัปดาห์หน้าจะเปลี่ยน 1 อย่าง", change),
      h("div", { class: "wide row" }, h("button", { class: "btn primary", type: "submit" }, "บันทึกการทบทวน"),
        h("button", { class: "btn", type: "button", onclick: ics }, "📅 เตือนทุกวันอาทิตย์ 20:00 (เพิ่มลงปฏิทิน)"))),
    reviews.length ? h("details", { class: "more" }, h("summary", {}, `การทบทวนที่ผ่านมา (${reviews.length})`),
      h("div", { class: "grid", style: { gap: "8px", marginTop: "8px" } }, reviews.slice(0, 8).map((v) => h("div", { class: "note-item" },
        h("div", { class: "h" }, `สัปดาห์ ${thDay(v.week)}`), v.hypo ? h("div", {}, "สมมติฐาน: " + v.hypo) : null, v.change ? h("div", {}, "เปลี่ยน: " + v.change) : null)))) : null);
}
