// "Who has the most followers in the world" for the Handbook: Wikipedia's lists (CC BY-SA, linked on the page).
// YouTube top 100 channels, TikTok top 50, Facebook top 50. Read once a week.
import { fetchText, writeJson, log, isMain } from "./lib/util.mjs";

const PAGES = {
  youtube: "List_of_most-subscribed_YouTube_channels",
  tiktok: "List_of_most-followed_TikTok_accounts",
  facebook: "List_of_most-followed_Facebook_pages",
};

const clean = (html) =>
  html.replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;|&#160;/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, "").replace(/\s+/g, " ").trim();
const num = (s) => {
  const m = /[\d.,]+/.exec(String(s).replace(/,/g, ""));
  return m ? Number(m[0]) : null;
};

function firstTable(html) {
  const table = (/<table[^>]*class="[^"]*wikitable[^"]*"[\s\S]*?<\/table>/.exec(html) || [])[0];
  if (!table) throw new Error("no table");
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/g)].map((c) => clean(c[2])));
  const head = rows.shift().map((h) => h.toLowerCase());
  const col = (...names) => head.findIndex((h) => names.some((n) => h.includes(n)));
  return { rows: rows.filter((r) => r.length >= head.length - 1), col };
}

export async function fetchFamous() {
  const out = { retrieved: new Date().toISOString(), source: "Wikipedia (CC BY-SA 4.0)", pages: {} };
  for (const [key, page] of Object.entries(PAGES)) {
    try {
      const html = await fetchText(`https://en.wikipedia.org/api/rest_v1/page/html/${page}`);
      const { rows, col } = firstTable(html);
      const iName = col("name", "username", "page name");
      const iOwner = col("owner");
      const iCount = col("subscribers", "followers");
      const iCountry = col("country");
      const iCat = col("category", "description");
      const iJoined = col("joined");
      const iLang = col("language");
      const list = rows.map((r) => ({
        name: r[iOwner >= 0 && key === "tiktok" ? iOwner : iName] || r[iName],
        handle: key === "tiktok" ? r[iName] : undefined,
        m: num(r[iCount]), // millions
        country: iCountry >= 0 ? r[iCountry] : "",
        cat: iCat >= 0 ? r[iCat].slice(0, 60) : "",
        joined: iJoined >= 0 ? r[iJoined] : undefined,
        lang: iLang >= 0 ? r[iLang] : undefined,
      })).filter((x) => x.name && x.m);
      if (list.length < 10) throw new Error(`only ${list.length} rows - table changed?`);
      out[key] = list;
      out.pages[key] = `https://en.wikipedia.org/wiki/${page}`;
      log(`Wikipedia ${key}: ${list.length} rows, #1 ${list[0].name} ${list[0].m}M`);
    } catch (e) {
      log(`Wikipedia ${key} failed: ${e.message}`);
    }
  }
  if (!out.youtube && !out.tiktok && !out.facebook) throw new Error("Wikipedia: nothing read");
  writeJson("famous.json", out);
  return out;
}

if (isMain(import.meta.url)) fetchFamous().catch((e) => { console.error(e.message); process.exit(1); });
