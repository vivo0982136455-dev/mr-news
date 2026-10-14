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
export function videoCard(v, rank, { onSave, showGain = true } = {}) {
  const est = !v.m;
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
        est ? h("span", { class: "est", title: "ประมาณจากอายุคลิป (ยอดวิว ÷ ชั่วโมงตั้งแต่โพสต์ × 24) เพราะยังไม่มีการวัดซ้ำครบ 1 วัน" }, "(ประมาณ)") : h("span", { class: "pill up" }, "วัดจริง"),
        v.views != null ? ` · รวม ${num(v.views)}` : "") : v.v != null ? h("div", { class: "meta" }, h("span", { class: "g" }, num(v.v)), " วิว") : null,
      h("div", {}, themeChips(v.themes)),
      onSave ? h("div", { class: "acts" }, h("button", { class: "btn small", onclick: () => onSave(v) }, "📌 จดลงสมุด")) : null));
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
