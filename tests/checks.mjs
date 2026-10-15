// The layout check run inside the page by tests/all.mjs (local) and tests/live.mjs (the real site).
export const LAYOUT_CHECK = `
  const vw = window.innerWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push("page wider than screen: " + document.documentElement.scrollWidth);
  const scrollers = ".chips,.seg,.table-wrap,.minis,.toc,.prompt,pre";
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
  if (/undefined|NaN|\\[object/.test(txt)) out.push("bad text: " + (txt.match(/.{0,30}(undefined|NaN|\\[object).{0,20}/) || [""])[0]);
  if (txt.includes("เปิดหน้านี้ไม่ได้")) out.push("page failed: " + txt.slice(0, 200));
  if (!document.querySelector("main h1")) out.push("no heading");
  return out;`;
