// Small UI toolkit. Every text from data (YouTube titles, Wikipedia, notes) goes in as TEXT, never as HTML.
import { THEME_BY_ID } from "./shared/themes.js";

// h("div", { class: "x", onclick: fn }, "text", child, [more]) -> element
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v; // only for our own trusted strings (md() output, SVG figures)
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// tiny markup for OUR lesson texts: **bold**, *italic*, [text](https://url), `code`, line breaks. Escapes first.
export function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br>");
}
export const mdEl = (tag, s, attrs = {}) => h(tag, { ...attrs, html: md(s) });

// numbers the Thai way: 2,929,830 -> "2.9 ล้าน"; 845,000 -> "8.5 แสน"; 12,300 -> "12,300"
export function num(n, { compact = true } = {}) {
  if (n == null || isNaN(n)) return "–";
  const a = Math.abs(n);
  if (compact && a >= 1e6) return (n / 1e6).toLocaleString("th-TH", { maximumFractionDigits: a >= 1e8 ? 0 : 1 }) + " ล้าน";
  if (compact && a >= 1e5) return (n / 1e5).toLocaleString("th-TH", { maximumFractionDigits: 1 }) + " แสน";
  return Math.round(n).toLocaleString("th-TH");
}
export const pct = (x, d = 0) => (x == null || isNaN(x) ? "–" : (x * 100).toLocaleString("th-TH", { maximumFractionDigits: d }) + "%");
export const signedPct = (x) => (x == null ? "" : (x >= 0 ? "+" : "") + (x * 100).toFixed(0) + "%");
export function dur(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function ago(iso) {
  const h = (Date.now() - Date.parse(iso)) / 3600e3;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} นาทีที่แล้ว`;
  if (h < 48) return `${Math.round(h)} ชม. ที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const thDay = (ymd) => { const [y, m, d] = ymd.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y + 543}`; };
export const thMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return `${MONTHS_FULL[m - 1]} ${y + 543}`; };
export const thTime = (iso) => { const d = new Date(Date.parse(iso) + 7 * 3600e3); return `${thDay(d.toISOString().slice(0, 10))} ${d.toISOString().slice(11, 16)} น.`; };

export const thaiToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

// How fresh the numbers are, said honestly: the time YouTube was READ (every view number is from then), not the
// time the file was rebuilt. Yellow after 26 h, a red banner after 36 h (the robot reads YouTube about once a day).
// A file built before "ytAt" existed falls back to "updated".
export const YT_LATE_H = 26, YT_STALE_H = 36;
export function freshness(d, { trends = true } = {}) {
  const yt = d.ytAt || d.updated;
  const ageH = (Date.now() - Date.parse(yt)) / 3600e3;
  const level = ageH >= YT_STALE_H ? "stale" : ageH >= YT_LATE_H ? "late" : "ok";
  const notToday = d.day && d.day !== thaiToday();
  const line = h("div", { class: "fresh " + level },
    "ข้อมูล YouTube อ่านเมื่อ ", h("b", {}, thTime(yt)), ` (${ago(yt)})`,
    trends && d.trendsAt ? [" · Google Trends อ่านเมื่อ ", thTime(d.trendsAt)] : null,
    notToday && level !== "stale" ? h("div", {}, `วันนี้ยังไม่ได้อ่าน YouTube — ตัวเลขเป็นของวันที่ ${thDay(d.day)} (ระบบอ่านวันละครั้ง)`) : null);
  const banner = level === "stale" ? h("div", { class: "warn bad", role: "alert" },
    `⚠️ ข้อมูล YouTube ค้างตั้งแต่ ${thTime(yt)} — ระบบยังอ่านใหม่ไม่ได้ ตัวเลขทุกตัวในหน้านี้เป็นของวันนั้น ไม่ใช่วันนี้`) : null;
  return [line, banner];
}

// a label you can TAP to read what it means: a one-line Thai explanation opens under it
// (the old hover tooltip never showed on a phone)
export function info(label, text, cls = "") {
  const pop = h("span", { class: "info-pop", hidden: true }, text);
  const btn = h("button", { type: "button", class: ("info " + cls).trim(), "aria-expanded": "false", onclick: (e) => {
    e.preventDefault();
    const open = pop.hidden;
    pop.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
  } }, label, h("span", { "aria-hidden": "true" }, " ⓘ"));
  return h("span", { class: "info-wrap" }, btn, pop);
}
export const EST_TEXT = "ค่าประมาณ = ยอดวิวทั้งหมด ÷ ชั่วโมงตั้งแต่โพสต์ × 24 (คลิปที่โพสต์ไม่ถึง 24 ชม. = ยอดวิวทั้งหมด) เพราะระบบยังไม่ได้อ่านคลิปนี้ซ้ำครบ 1 วัน · ที่มา: YouTube · ไม่ได้บอกวิวจริงของวันนี้: คลิปเก่ามักได้ค่าสูงเกินจริง คลิปใหม่ได้ต่ำเกินจริง";
export const MEASURED_TEXT = "วัดจริง = ระบบอ่านยอดวิวคลิปนี้ 2 ครั้ง ห่างกัน 18-40 ชม. แล้วปรับเป็น 24 ชม. · ที่มา: YouTube · ไม่ได้บอกว่าคนดูเป็นคนไทยหรือคนลาวกี่คน";
export const NEW_TEXT = "คลิปใหม่ = โพสต์ไม่ถึง 24 ชม. ยอดวิวทั้งหมดจึงเป็นวิวของวันนี้ (ตัวเลขจริง ไม่ใช่ค่าประมาณ) · ที่มา: YouTube · คลิปที่เพิ่งโพสต์ไม่กี่ชั่วโมงยังโตไม่เต็มที่";
export const X_TEXT = "×N = ยอดวิวคลิปนี้ ÷ ค่ากลางยอดวิวของคลิปแบบเดียวกัน (Shorts หรือคลิปยาว) 50 คลิปล่าสุดของช่องเดียวกัน ไม่นับคลิปที่อายุไม่ถึง 2 วัน · ที่มา: YouTube (อ่านสัปดาห์ละครั้ง) · บอกว่าคลิปนี้ \"เกินปกติ\" ของช่องตัวเองแค่ไหน — ช่องเล็กก็ได้ ×สูงได้ — ไม่ได้บอกว่าช่องใหญ่หรือเล็ก";

// what a reader can SEE in a video that did well: length, how the title opens, the posting hour (Thai time).
// Facts only - it does not claim these are the reason.
export function looks(v) {
  const out = [];
  if (v.d) out.push(v.d <= 60 ? `สั้นมาก ${dur(v.d)}` : v.d <= 180 ? `Shorts ${dur(v.d)}` : `คลิปยาว ${dur(v.d)}`);
  const t = String(v.t || "").replace(/#\S+/g, "").trim();
  if (/\?|ไหม|มั้ย|ยังไง|อะไร|ทำไม|ใคร(?!ๆ)|เท่าไร|กี่/.test(t)) out.push("ชื่อเป็นคำถาม");
  else if (/^เมื่อ|^ตอนที่|^วันที่|^พอ/.test(t)) out.push("ชื่อเล่าเรื่อง (เมื่อ…)");
  if (/(^|\s)\d+\s?(อันดับ|วิธี|ข้อ|เมนู|ชั่วโมง|วัน|บาท)/.test(t)) out.push("มีตัวเลขในชื่อ");
  if (/[“”"]/.test(t)) out.push("มีคำพูดในชื่อ");
  if (v.p) out.push(`โพสต์ ${(new Date(v.p).getUTCHours() + 7) % 24} น.`);
  return out;
}
// share of the numbers that are measured (not estimated); under half = the whole block is labelled "ประมาณ"
export const measuredShare = (list) => (list.length ? list.filter((v) => v.m).length / list.length : 0);
export const estBadge = (what) => info("ประมาณ", `${what}: ส่วนใหญ่รวมจากค่าประมาณ เพราะคลิปส่วนใหญ่ยังไม่ได้วัดซ้ำครบ 1 วัน · ${EST_TEXT}`, "est");

export const ytUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export const ytThumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;

// localStorage that never breaks the page (private mode / blocked storage)
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

let toastTimer;
export function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) document.body.append((el = h("div", { class: "toast", role: "status" })));
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 2200);
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("คัดลอกแล้ว ✓");
  } catch {
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } }, text);
    document.body.append(ta);
    ta.select();
    try { document.execCommand("copy"); toast("คัดลอกแล้ว ✓"); } catch { toast("คัดลอกไม่ได้ ให้กดค้างแล้วเลือกคัดลอกเอง"); }
    ta.remove();
  }
}

export const themeChips = (ids) => (ids || []).map((id) => THEME_BY_ID[id] && h("span", { class: "tag" }, THEME_BY_ID[id].icon + " " + THEME_BY_ID[id].name));

// one video row: thumbnail, title, channel, views gained, actions
export function videoCard(v, rank, { onSave, showGain = true, why = false, onFlag } = {}) {
  // how sure the number is: q from the robot ("m" measured, "n" new, "e" estimate); older files only have m
  const q = v.q || (v.m ? "m" : "e");
  const label = q === "m" ? info("วัดจริง", MEASURED_TEXT, "up") : q === "n" ? info("คลิปใหม่", NEW_TEXT, "up") : info("ประมาณ", EST_TEXT, "est");
  return h("div", { class: "vcard" },
    h("a", { class: "thumb", href: ytUrl(v.id), target: "_blank", rel: "noopener", "aria-label": "เปิดคลิปใน YouTube" },
      h("img", { src: ytThumb(v.id), alt: "", loading: "lazy", referrerpolicy: "no-referrer" }),
      rank ? h("span", { class: "rank" }, "#" + rank) : null,
      v.d ? h("span", { class: "len" }, dur(v.d)) : null),
    h("div", { style: { minWidth: 0 } },
      h("a", { class: "t", href: ytUrl(v.id), target: "_blank", rel: "noopener", style: { color: "inherit", textDecoration: "none" } }, v.t),
      h("div", { class: "meta" }, v.cn, " · ", v.d && v.d <= 180 ? "Shorts" : "คลิปยาว", v.ageH != null ? ` · โพสต์ ${v.ageH < 48 ? v.ageH + " ชม. ก่อน" : Math.round(v.ageH / 24) + " วันก่อน"}` : ""),
      showGain && v.g != null ? h("div", { class: "meta" },
        h("span", { class: "g" }, "+" + num(v.g)), " วิวใน 24 ชม. ",
        label,
        v.views != null ? ` · รวม ${num(v.views)}` : "") : v.v != null ? h("div", { class: "meta" }, h("span", { class: "g" }, num(v.v)), " วิว") : null,
      v.x != null ? h("div", { class: "meta" }, info(`×${num(v.x, { compact: false })} ของปกติช่อง`, X_TEXT, "x")) : null,
      why ? h("div", { class: "meta looks" }, "ดูอะไรจากคลิปนี้: ", looks(v).join(" · ")) : null,
      h("div", {}, themeChips(v.themes)),
      onSave || onFlag ? h("div", { class: "acts" },
        onSave ? h("button", { class: "btn small", onclick: () => onSave(v) }, "📌 จดลงสมุด") : null,
        onFlag && v.ch ? h("button", { class: "btn small", title: "ช่องนี้ไม่ใช่งานต้นฉบับ (พากย์ / เอาคลิปคนอื่นมาลง) — ซ่อนจากอันดับในเครื่องนี้", onclick: () => onFlag(v) }, "🚩 ไม่ใช่ต้นฉบับ") : null) : null));
}

// a YouTube lesson video that only loads YouTube when tapped (saves data, no tracking before the tap)
export function embed(v) {
  const box = h("div", { class: "frame" });
  const play = () => {
    box.replaceChildren(h("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`,
      title: v.t, allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share", allowfullscreen: true, loading: "lazy",
    }));
  };
  box.append(h("img", { src: ytThumb(v.id), alt: "", loading: "lazy", referrerpolicy: "no-referrer" }), h("button", { onclick: play, "aria-label": "เล่นคลิป: " + v.t }, h("span", {}, "▶")));
  return h("div", { class: "embed" }, box,
    h("div", { class: "cap" }, h("b", {}, v.t), h("span", {}, `${v.cn} · ${num(v.v)} วิว · ${dur(v.d)} · `), h("a", { href: ytUrl(v.id), target: "_blank", rel: "noopener" }, "เปิดใน YouTube")));
}

export function seg(options, value, onChange, label) {
  const wrap = h("div", { class: "seg", role: "group", "aria-label": label || "" });
  for (const [val, text] of options) {
    wrap.append(h("button", { type: "button", "aria-pressed": String(val === value), onclick: () => {
      for (const b of wrap.children) b.setAttribute("aria-pressed", "false");
      wrap.querySelector(`[data-v="${CSS.escape(String(val))}"]`).setAttribute("aria-pressed", "true");
      onChange(val);
    }, "data-v": String(val) }, text));
  }
  return wrap;
}

export function tile(label, value, delta) {
  return h("div", { class: "tile" }, h("div", { class: "label" }, label), h("div", { class: "value" }, value), delta ? h("div", { class: "delta" }, delta) : null);
}

export function section(title, sub, ...kids) {
  return h("section", { class: "section" }, h("h2", {}, title, sub ? h("small", {}, sub) : null), ...kids);
}

export function promptBox(text) {
  return h("div", { class: "prompt" }, h("button", { class: "btn small copy", onclick: () => copy(text) }, "คัดลอก"), h("pre", {}, text));
}
