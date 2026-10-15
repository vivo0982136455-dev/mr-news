// Hand-made SVG charts (no library to download - the company network resets some CDNs).
// Rules from the dataviz method: bars <= 24 px thick with a 4 px rounded data end and a square baseline,
// 2 px lines, hairline grid, values at the bar tip, text in ink colours (never the series colour),
// a legend for 2+ series, a hover/tap tooltip on every mark, and a table view for every chart.
// Every chart is drawn at the REAL width of its box (redrawn when the box changes size), so text stays 12 px
// on a phone and on a computer instead of being scaled down.
import { h, num } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
};
export const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

// ---- one shared tooltip ----
let tipEl;
function tip(e, text) {
  if (!tipEl) document.body.append((tipEl = h("div", { class: "tip", role: "tooltip" })));
  if (!text || !e) return tipEl.classList.remove("on");
  tipEl.replaceChildren(...text.split("\n").map((line, i) => h("div", i === 0 ? { style: { fontWeight: 600 } } : {}, line)));
  tipEl.classList.add("on");
  const r = tipEl.getBoundingClientRect();
  tipEl.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, e.clientX + 12)) + "px";
  tipEl.style.top = Math.max(8, e.clientY - r.height - 12) + "px";
}
function bindTip(el, text) {
  el.addEventListener("pointermove", (e) => tip(e, text));
  el.addEventListener("pointerdown", (e) => tip(e, text));
  el.addEventListener("pointerleave", () => tip(null));
}
document.addEventListener("scroll", () => tip(null), { passive: true });

function hbarPath(x, y, w, hgt, r = 4) {
  r = Math.min(r, w, hgt / 2);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt - r}Q${x + w},${y + hgt} ${x + w - r},${y + hgt}H${x}Z`;
}
function vbarPath(x, base, w, hgt, r = 4) {
  r = Math.min(r, hgt, w / 2);
  const top = base - hgt;
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}
// text width estimate for layout (~0.58 em per glyph). Thai / Lao vowel and tone marks above or below a letter
// take no width of their own, so they are not counted.
const MARKS = /[ัิ-ฺ็-๎ັິ-ຼ່-ໍ]/g;
// an emoji (even a joined one like 👨‍👩‍👧) is drawn as ONE wide picture = about 2 letters
const EMOJI = /\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu;
const glyphs = (t) => Array.from(String(t).replace(EMOJI, "WW").replace(MARKS, "")).length;
const textW = (t, size = 12) => glyphs(t) * size * 0.58;
const cut = (t, maxW, size) => {
  const max = Math.max(4, Math.floor(maxW / (size * 0.58)));
  if (glyphs(t) <= max) return t;
  let out = "";
  for (const ch of String(t).match(/\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*|[\s\S]/gu)) {
    if (glyphs(out + ch) > max - 1) break;
    out += ch;
  }
  return out + "…";
};

// a chart box that draws itself at its own width, plus a "show as table" switch
function frame(draw, rows, head, extra) {
  const box = h("div", { class: "chart" });
  let lastW = 0;
  let tries = 0;
  const paint = () => {
    const w = Math.round(box.clientWidth);
    if (!w) {
      // not on the page yet (or hidden): look again shortly - a ResizeObserver alone does not fire in a background tab
      if (tries++ < 40 && !box.hidden) setTimeout(paint, 50);
      return;
    }
    if (Math.abs(w - lastW) < 2) return;
    lastW = w;
    box.replaceChildren(draw(w));
  };
  new ResizeObserver(() => paint()).observe(box);
  setTimeout(paint, 0);
  const tableWrap = h("div", { class: "table-wrap", hidden: true },
    h("table", { class: "data" }, h("thead", {}, h("tr", {}, head.map((x, i) => h("th", { class: i ? "num" : "" }, x)))),
      h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c, i) => h("td", { class: i ? "num" : "" }, c)))))));
  const btn = h("button", { class: "btn small", type: "button", onclick: () => {
    const show = tableWrap.hidden;
    tableWrap.hidden = !show;
    box.hidden = show;
    btn.textContent = show ? "ดูเป็นกราฟ" : "ดูเป็นตาราง";
  } }, "ดูเป็นตาราง");
  return h("div", {}, extra || null, box, tableWrap, h("div", { class: "row", style: { justifyContent: "flex-end", marginTop: "6px" } }, btn));
}
const svgRoot = (width, height, label) => s("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": label });

/**
 * Horizontal bars. items: [{ label, value, display?, tip?, color?, note? }]
 * One series -> one colour, no legend (the card title names it).
 */
export function hbars(items, { color = "var(--s1)", format = (v) => num(v), head = ["", "ค่า"], max } = {}) {
  const draw = (width) => {
    const rowH = 30, bar = 18, top = 4;
    const valTextW = (i) => textW(i.display ?? format(i.value), 12) * 1.2;
    const showNotes = width >= 420; // on a phone the note goes to the tooltip / table only
    const valW = Math.max(...items.map((i) => valTextW(i) + (showNotes && i.note ? textW(i.note, 11) + 12 : 0)), 30) + 10;
    const labelW = Math.min(Math.max(...items.map((i) => textW(i.label, 12.5)), 40) + 16, width * 0.42, 280);
    const plotW = Math.max(40, width - labelW - valW);
    const m = max ?? Math.max(...items.map((i) => i.value), 1);
    const H = top + items.length * rowH + 4;
    const svg = svgRoot(width, H, head.join(" / "));
    svg.append(s("line", { class: "axis", x1: labelW, x2: labelW, y1: 0, y2: H }));
    items.forEach((it, i) => {
      const y = top + i * rowH;
      const w = Math.max(2, (it.value / m) * plotW);
      svg.append(s("text", { class: "lbl", x: labelW - 8, y: y + bar / 2 + 4.5, "text-anchor": "end", "font-size": 12.5 }, cut(it.label, labelW - 10, 12.5)));
      svg.append(s("path", { class: "mark", d: hbarPath(labelW, y, w, bar), fill: it.color || color }));
      svg.append(s("text", { class: "val", x: labelW + w + 6, y: y + bar / 2 + 4.5 }, it.display ?? format(it.value)));
      if (showNotes && it.note) svg.append(s("text", { class: "muted", x: labelW + w + 6 + valTextW(it) + 8, y: y + bar / 2 + 4.5, "font-size": 11 }, it.note));
      const hit = s("rect", { class: "hit", x: 0, y: y - 4, width, height: rowH });
      bindTip(hit, (it.tip || `${it.label}\n${it.display ?? format(it.value)}`) + (it.note && !showNotes && !it.tip ? `\n${it.note}` : ""));
      svg.append(hit);
    });
    return svg;
  };
  const withNote = items.some((i) => i.note);
  return frame(draw, items.map((i) => [i.label, i.display ?? format(i.value), ...(withNote ? [i.note || ""] : [])]), withNote ? [...head, "หมายเหตุ"] : head);
}

/**
 * One 100% stacked bar (shares of a whole). parts in a FIXED order, colours by slot order, 2 px surface gaps,
 * legend always (2+ series); a % label inside a segment only when it fits.
 */
export function stack(parts, { format = (v) => num(v), head = ["", "ค่า", "สัดส่วน"] } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const draw = (width) => {
    const H = 34;
    const svg = svgRoot(width, H, parts.map((p) => p.label).join(", "));
    let x = 0;
    parts.forEach((p, i) => {
      const w = (p.value / total) * width;
      if (w <= 0) return;
      const gap = i < parts.length - 1 ? 2 : 0;
      const color = p.color || SERIES[i % SERIES.length];
      const first = i === 0, last = i === parts.length - 1;
      const r = 6;
      const ww = Math.max(1, w - gap);
      const d = `M${x + (first ? r : 0)},0H${x + ww - (last ? r : 0)}${last ? `Q${x + ww},0 ${x + ww},${r}V${H - r}Q${x + ww},${H} ${x + ww - r},${H}` : `V${H}`}H${x + (first ? r : 0)}${first ? `Q${x},${H} ${x},${H - r}V${r}Q${x},0 ${x + r},0` : `V0`}Z`;
      const mark = s("path", { class: "mark", d, fill: color });
      svg.append(mark);
      const share = (p.value / total) * 100;
      const label = `${share.toFixed(0)}%`;
      if (textW(label, 13) * 1.2 + 12 < ww) svg.append(s("text", { x: x + ww / 2, y: H / 2 + 5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, style: "fill:#fff" }, label));
      bindTip(mark, `${p.label}\n${format(p.value)} (${share.toFixed(1)}%)`);
      x += w;
    });
    return svg;
  };
  const legend = h("div", { class: "legend" }, parts.map((p, i) => h("span", {}, h("i", { style: { background: p.color || SERIES[i % SERIES.length] } }), `${p.label} ${((p.value / total) * 100).toFixed(0)}%`)));
  return frame(draw, parts.map((p) => [p.label, format(p.value), ((p.value / total) * 100).toFixed(1) + "%"]), head, legend);
}

/** Columns over a small ordinal axis (e.g. 24 hours). items: [{ label, value, tip }] single series. */
export function columns(items, { color = "var(--s1)", height = 170, format = (v) => num(v), head = ["", "ค่า"], every = 1 } = {}) {
  const draw = (width) => {
    const left = 4, bottom = 22, top = 18;
    const plotH = height - bottom - top;
    const n = items.length;
    const slot = (width - left) / n;
    const bw = Math.max(3, Math.min(24, slot - 2));
    const m = Math.max(...items.map((i) => i.value), 1);
    const svg = svgRoot(width, height, head.join(" / "));
    for (const f of [0.5, 1]) svg.append(s("line", { class: "gridline", x1: left, x2: width, y1: top + plotH * (1 - f), y2: top + plotH * (1 - f) }));
    svg.append(s("line", { class: "axis", x1: left, x2: width, y1: top + plotH, y2: top + plotH }));
    const best = items.reduce((b, it, i) => (it.value > items[b].value ? i : b), 0);
    const step = slot < 16 ? Math.max(every, 4) : every;
    items.forEach((it, i) => {
      const x = left + i * slot + (slot - bw) / 2;
      const hh = (it.value / m) * plotH;
      if (hh > 0) svg.append(s("path", { class: "mark", d: vbarPath(x, top + plotH, bw, Math.max(2, hh)), fill: color }));
      if (i % step === 0) svg.append(s("text", { x: x + bw / 2, y: height - 6, "text-anchor": "middle", "font-size": 11, class: "muted" }, it.label));
      if (i === best && it.value) svg.append(s("text", { class: "val", x: x + bw / 2, y: top + plotH - hh - 5, "text-anchor": "middle", "font-size": 11 }, format(it.value)));
      const hit = s("rect", { class: "hit", x: left + i * slot, y: 0, width: slot, height });
      bindTip(hit, it.tip || `${it.label}\n${format(it.value)}`);
      svg.append(hit);
    });
    return svg;
  };
  return frame(draw, items.map((i) => [i.label, format(i.value)]), head);
}

/**
 * Lines over dates. series: [{ label, color, points: [{ x: "2026-10-14", y }] }] (max 4 series + legend + end labels).
 * Single axis only. Crosshair tooltip on hover / tap.
 */
export function lines(series, { height = 230, format = (v) => num(v), head = ["วัน"], xLabel = (x) => x } = {}) {
  const xs = [...new Set(series.flatMap((sr) => sr.points.map((p) => p.x)))].sort();
  const draw = (width) => {
    const left = 44, top = 12, bottom = 24;
    const right = width >= 520 ? 120 : 14;
    const plotW = width - left - right, plotH = height - top - bottom;
    const maxY = Math.max(...series.flatMap((sr) => sr.points.map((p) => p.y)), 0) * 1.1 || 1;
    const X = (x) => left + (xs.length === 1 ? plotW / 2 : (xs.indexOf(x) / (xs.length - 1)) * plotW);
    const Y = (y) => top + plotH - (y / maxY) * plotH;
    const svg = svgRoot(width, height, series.map((x) => x.label).join(", "));
    for (let i = 0; i <= 4; i++) {
      const v = (maxY / 4) * i;
      svg.append(s("line", { class: i ? "gridline" : "axis", x1: left, x2: left + plotW, y1: Y(v), y2: Y(v) }));
      svg.append(s("text", { x: left - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, class: "muted" }, format(v)));
    }
    const step = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor(plotW / 70))));
    // date labels: the first hangs to the right of its point, the last to the left, so neither leaves the picture
    xs.forEach((x, i) => {
      if (!(i % step === 0 || i === xs.length - 1)) return;
      const anchor = xs.length > 1 && i === 0 ? "start" : xs.length > 1 && i === xs.length - 1 ? "end" : "middle";
      svg.append(s("text", { x: X(x), y: height - 6, "text-anchor": anchor, "font-size": 11, class: "muted" }, xLabel(x)));
    });
    const ends = [];
    series.forEach((sr, si) => {
      const color = sr.color || SERIES[si];
      const pts = sr.points.filter((p) => xs.includes(p.x));
      if (pts.length > 1) svg.append(s("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(""), fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      const last = pts[pts.length - 1];
      if (last) {
        svg.append(s("circle", { cx: X(last.x), cy: Y(last.y), r: 4.5, fill: color, stroke: "var(--surface)", "stroke-width": 2 }));
        ends.push({ y: Y(last.y), label: `${sr.label} ${format(last.y)}`, x: X(last.x) });
      }
    });
    // end labels only with room on the right and no collision; otherwise the legend + tooltip carry identity
    ends.sort((a, b) => a.y - b.y);
    const collide = ends.some((e, i) => i && e.y - ends[i - 1].y < 14);
    if (right > 60 && !collide) for (const e of ends) svg.append(s("text", { x: e.x + 8, y: e.y + 4, "font-size": 11, class: "lbl" }, cut(e.label, right - 10, 11)));
    const cross = s("line", { x1: 0, x2: 0, y1: top, y2: top + plotH, stroke: "var(--axis)", "stroke-width": 1, visibility: "hidden" });
    svg.append(cross);
    const hit = s("rect", { x: left, y: top, width: plotW, height: plotH, fill: "transparent" });
    const move = (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * width;
      let best = xs[0];
      for (const x of xs) if (Math.abs(X(x) - px) < Math.abs(X(best) - px)) best = x;
      cross.setAttribute("x1", X(best));
      cross.setAttribute("x2", X(best));
      cross.setAttribute("visibility", "visible");
      tip(e, [xLabel(best), ...series.map((sr) => { const p = sr.points.find((q) => q.x === best); return `${sr.label}: ${p ? format(p.y) : "–"}`; })].join("\n"));
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tip(null); });
    svg.append(hit);
    return svg;
  };
  const legend = series.length > 1 ? h("div", { class: "legend" }, series.map((sr, i) => h("span", {}, h("i", { style: { background: sr.color || SERIES[i] } }), sr.label))) : null;
  const rows = xs.map((x) => [xLabel(x), ...series.map((sr) => { const p = sr.points.find((q) => q.x === x); return p ? format(p.y) : "–"; })]);
  return frame(draw, rows, [...head, ...series.map((x) => x.label)], legend);
}
