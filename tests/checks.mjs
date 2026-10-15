// Phone comfort, checked inside the page: every control at least 44 px tall, no text smaller than 13 px.
// A link inside running text (its parent has more text than the link) is exempt, as WCAG 2.5.8 allows.
export const TOUCH_CHECK = `
  const out = [];
  const controls = [...document.querySelectorAll("main a, main button, main select, main input, main summary, main label:has(> input[type=checkbox]), header.top a, header.top button, nav.bottom a, nav.jump a")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent !== null; })
    .filter((e) => !(e.tagName === "INPUT" && (e.type === "checkbox" || e.type === "radio" || e.type === "file") && e.closest("label")))
    .filter((e) => !(e.tagName === "A" && !e.className && e.parentElement && e.parentElement.textContent.trim().length > e.textContent.trim().length + 3));
  for (const e of controls) {
    const r = e.getBoundingClientRect();
    if (r.height < 43.5) out.push(e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0] + " " + Math.round(r.height) + "px: " + (e.textContent || e.value || "").trim().slice(0, 24));
    if (out.length > 5) break;
  }
  for (const e of document.querySelectorAll("main *, nav.bottom *")) {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (e.closest("svg")) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f < 12.9) { out.push("text " + f + "px: " + e.textContent.trim().slice(0, 24)); break; }
  }
  return out;`;

// The layout check run inside the page by tests/all.mjs (local) and tests/live.mjs (the real site).
export const LAYOUT_CHECK = `
  const vw = window.innerWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push("page wider than screen: " + document.documentElement.scrollWidth);
  const scrollers = ".chips,.seg,.table-wrap,.minis,.toc,.prompt,pre,.jump"; // sideways-scrolling rows
  for (const el of document.querySelectorAll("main *")) {
    if (el.closest(scrollers) || el.closest("svg")) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1) { out.push("sticks out: <" + el.tagName.toLowerCase() + " class=" + el.className + "> " + (el.textContent || "").slice(0, 40)); if (out.length > 4) break; }
  }
  for (const c of document.querySelectorAll(".chart")) { if (!c.hidden && c.offsetParent && !c.querySelector("svg")) out.push("chart not drawn"); }
  for (const svg of document.querySelectorAll(".chart svg, .figure svg")) {
    const vb = svg.viewBox.baseVal;
    for (const t of svg.querySelectorAll("text")) { const b = t.getBBox(); if (b.width && (b.x < -1 || b.x + b.width > vb.width + 1)) { out.push("text outside its picture: " + t.textContent.slice(0, 30)); break; } }
  }
  const txt = document.querySelector("main").innerText;
  if (/undefined|NaN|\\[object|null/.test(txt)) out.push("bad text: " + (txt.match(/.{0,30}(undefined|NaN|\\[object|null).{0,20}/) || [""])[0]);
  if (txt.includes("เปิดหน้านี้ไม่ได้")) out.push("page failed: " + txt.slice(0, 200));
  if (!document.querySelector("main h1")) out.push("no heading");
  return out;`;
