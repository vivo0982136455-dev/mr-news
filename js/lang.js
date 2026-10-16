// The book's language: ไทย (default) or ລາວ, chosen on this phone (localStorage "mn_lang").
// Lao words come from js/content/lao.js: Steep's draft, checked line by line by Win on the page #/lao.
// Win's own corrections (localStorage "mn_lao_fix") win over the draft at once, on his phone, until Steep copies
// them into lao.js.
// ui.h() passes every piece of text and every title / aria-label / placeholder / alt through tr(), so a page needs no
// change to be translated: a text is translated only when lao.js has it EXACTLY (an emoji or ✓ → ↗ … around it is
// kept). Text from data (YouTube titles, Win's notes, hashtags) is not in lao.js, so it stays as it is.
import { LO } from "./content/lao.js";

const read = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
let cur = read("mn_lang", "th") === "lo" ? "lo" : "th";
let fixes = read("mn_lao_fix", {});

export const lang = () => cur;
export function setLang(l) {
  cur = l === "lo" ? "lo" : "th";
  try { localStorage.setItem("mn_lang", JSON.stringify(cur)); } catch { /* private mode: this visit only */ }
  markHtml();
}
export function markHtml() {
  document.documentElement.lang = cur;
  document.documentElement.classList.toggle("lo", cur === "lo");
}
// after Win corrects a word on #/lao
export const reloadFixes = () => { fixes = read("mn_lao_fix", {}); };

// keys with {n} (a number like 3, 1/3, 2.5) or {} (anything) are patterns: "อ่านแล้ว {n}/{n} บท" -> "ອ່ານແລ້ວ {n}/{n} ບົດ";
// a {} part is translated too ("จากหมวด {}" + "🍜 กิน / อาหาร")
const esc = (s) => s.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
const PATTERNS = Object.keys(LO).filter((k) => /\{n?\}/.test(k)).map((k) =>
  [new RegExp("^" + k.split(/(\{n?\})/).map((p) => (p === "{n}" ? "([\\d.,/+%−-]+)" : p === "{}" ? "(.+?)" : esc(p))).join("") + "$"), k]);
// emoji, ✓ → ↗ … : ( ) and spaces around a text are kept, the words inside are looked up
// (not # or @: a hashtag or a channel handle is data and is never translated)
const EDGE = /^([^\p{L}\p{M}\p{N}#@"]*)([\s\S]*?)([^\p{L}\p{M}\p{N}"]*)$/u;

const word = (k) => fixes[k] || LO[k];
export function tr(s) {
  if (cur !== "lo" || typeof s !== "string" || !s) return s;
  // the whole text first (a key may carry its emoji or ✓), then the words inside
  const t = s.trim();
  if (word(t)) return s.slice(0, s.indexOf(t)) + word(t) + s.slice(s.indexOf(t) + t.length);
  const [, pre, core, post] = EDGE.exec(s);
  if (!core) return s;
  if (word(core)) return pre + word(core) + post;
  const lead = s.slice(0, s.indexOf(t)), tail = s.slice(s.indexOf(t) + t.length);
  for (const [text, before, after] of [[t, lead, tail], [core, pre, post]]) {
    for (const [re, k] of PATTERNS) {
      const m = re.exec(text);
      if (!m) continue;
      let i = 1;
      return before + word(k).replace(/\{n?\}/g, () => tr(m[i++])) + after;
    }
  }
  return s;
}
