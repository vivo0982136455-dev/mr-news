// Google Trends "Trending now" for Thailand (the RSS feed Google publishes itself; 10 items per read).
// Every read is merged into the Thai day, so 4 reads a day give up to ~40 different topics.
// Laos is not possible: the feed answers HTTP 400 for geo=LA (tested 2026-10-14).
import { fetchText, readJson, writeJson, thaiDate, log, isMain } from "./lib/util.mjs";

const decode = (s) => String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const traffic = (s) => Number(String(s || "").replace(/[^\d]/g, "")) || 0; // "5000+" -> 5000

export async function fetchTrends() {
  const xml = await fetchText("https://trends.google.com/trending/rss?geo=TH");
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1];
    const tag = (name) => decode((new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(x) || [])[1]);
    return {
      q: tag("title"),
      n: traffic(tag("ht:approx_traffic")),
      news: [...x.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].slice(0, 2).map((n) => decode(n[1])),
      src: tag("ht:news_item_source"),
    };
  }).filter((i) => i.q);
  if (!items.length) throw new Error("Google Trends RSS: no items (format changed?)");

  const all = readJson("state/trends.json", {});
  const day = thaiDate();
  const list = all[day] || [];
  const now = new Date().toISOString();
  for (const it of items) {
    const old = list.find((x) => x.q === it.q);
    if (old) Object.assign(old, { n: Math.max(old.n, it.n), last: now, news: it.news.length ? it.news : old.news });
    else list.push({ ...it, first: now, last: now });
  }
  list.sort((a, b) => b.n - a.n);
  all[day] = list;
  for (const d of Object.keys(all)) if (d < thaiDate(new Date(Date.now() - 40 * 864e5))) delete all[d]; // days files keep the history
  writeJson("state/trends.json", all);
  log(`Google Trends TH: ${items.length} read, ${list.length} topics today`);
  return { read: items.length, today: list.length };
}

if (isMain(import.meta.url)) fetchTrends().catch((e) => { console.error(e.message); process.exit(1); });
