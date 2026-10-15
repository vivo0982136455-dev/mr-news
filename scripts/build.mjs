// Turns the robot's raw state into what the pages show:
//   data/latest.json        today's Mr News (Thai + Lao)
//   data/days/<date>.json   one Thai day (kept for ever: the history)
//   data/months/<yyyy-mm>.json, data/years/<yyyy>.json   sums of the days
//   data/ideas.json         Mr Idea of the day (scripts/ideas.mjs)
// "Views gained in 24 h" is MEASURED when we have a reading of the same video about a day earlier;
// otherwise ESTIMATED from its age (views per hour since upload x 24) and marked so on the page.
// Every row says how sure its number is (q): "m" measured, "n" new (under 24 h old: all its views are today's),
// "e" estimated. And ×N (x): the video's views ÷ what its channel usually gets for that format (Shorts / long).
// The creator view keeps ORIGINAL creators only: no TV/news/music companies, no dubbed / spoiler / re-uploaded
// clips (shown apart as "อย่าเลียนแบบ"), no news or politics.
import fs from "node:fs";
import path from "node:path";
import { DATA, ROOT, readJson, writeJson, thaiDate, hoursBetween, log, isMain } from "./lib/util.mjs";
import { themesOf, isCreatorVideo, isShort, isCopyText, SENSITIVE, MEDIA_CHANNEL, THEMES } from "../js/shared/themes.js";
import { buildIdeas } from "./ideas.mjs";

const TOP = 100;          // the "Top 100" the statistics are about
const LIST = 200;         // rows the page can filter (Shorts / long, measured only)
const KEEP_IN_DAY = 200;
const X_MIN_BASE = 50;    // a channel that usually gets under 50 views gives no meaningful ×N
const X_MIN_VIEWS = 10000; // the ×N list starts at 10,000 views
const HISTORY_DAYS = 90;   // data/history.json keeps the theme shares of the last 90 days
export const COMPARE_DAYS = 7; // "▲ from 7 days" needs 7 real days before it is shown

// views gained in the last 24 h for one followed video
export function gain(v, nowIso) {
  const s = v.s || [];
  if (!s.length) return null;
  const [lastTs, views] = s[s.length - 1];
  const ageH = Math.max(1, hoursBetween(v.p, lastTs));
  // an earlier reading 18-40 h before the last one -> measured
  for (let i = s.length - 2; i >= 0; i--) {
    const h = hoursBetween(s[i][0], lastTs);
    if (h >= 18 && h <= 40) return { g: Math.max(0, Math.round(((views - s[i][1]) / h) * 24)), m: 1, views, ageH };
    if (h > 40) break;
  }
  // younger than a day: everything it has is "today"
  if (ageH <= 24) return { g: views, m: 0, views, ageH };
  // older, first seen recently: average per day since upload (a video earns most views early, so this is low-ish for
  // young videos and high-ish for old ones - good enough for a ranking, labelled "estimated")
  return { g: Math.round((views / ageH) * 24), m: 0, views, ageH };
}

const short = (v, extra) => ({ id: v.id, t: v.t, cn: v.cn, ch: v.ch, cat: v.cat, d: v.d, p: v.p, th: v.th, ...extra });
const config = (file, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "config", file), "utf8")); } catch { return fallback; } };

// views ÷ the channel's typical views for the same format; null when the channel's typical number is unknown
export function timesUsual(v, channel) {
  const base = isShort(v) ? channel?.med?.s : channel?.med?.l;
  return base >= X_MIN_BASE ? Math.round((v.views / base) * 10) / 10 : null;
}

function sumBy(list, keyFn, valFn) {
  const m = new Map();
  for (const x of list) for (const k of [].concat(keyFn(x))) {
    if (k == null) continue;
    const o = m.get(k) || { k, v: 0, n: 0 };
    o.v += valFn(x);
    o.n++;
    m.set(k, o);
  }
  return [...m.values()].sort((a, b) => b.v - a.v);
}

const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

function hashtags(list) {
  const m = new Map();
  for (const v of list) for (const tag of new Set((v.t.match(/#[^\s#]+/g) || []).map((x) => x.toLowerCase()))) {
    const o = m.get(tag) || { k: tag, v: 0, n: 0 };
    o.v += v.g;
    o.n++;
    m.set(tag, o);
  }
  return [...m.values()].filter((x) => x.n >= 2).sort((a, b) => b.v - a.v).slice(0, 24);
}

function readDays(n, beforeDate) {
  const dir = path.join(DATA, "days");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f.slice(0, 10) < beforeDate).sort().slice(-n)
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function analyse(list) {
  const total = list.reduce((a, v) => a + v.g, 0) || 1;
  const themes = sumBy(list, (v) => v.themes, (v) => v.g).map((x) => ({ id: x.k, v: x.v, n: x.n, share: x.v / total }));
  const cats = sumBy(list, (v) => v.cat, (v) => v.g).map((x) => ({ id: x.k, v: x.v, n: x.n, share: x.v / total }));
  const shorts = list.filter(isShort);
  const formats = {
    short: { v: shorts.reduce((a, v) => a + v.g, 0), n: shorts.length },
    long: { v: total - shorts.reduce((a, v) => a + v.g, 0), n: list.length - shorts.length },
    medianTop50: median(list.slice(0, 50).map((v) => v.d)),
  };
  // when were the top videos uploaded (Thai hour) - helps to choose a posting time
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, n: 0, v: 0 }));
  for (const v of list.slice(0, TOP)) {
    const h = (new Date(v.p).getUTCHours() + 7) % 24;
    hours[h].n++;
    hours[h].v += v.g;
  }
  const none = list.filter((v) => !v.themes.length).reduce((a, v) => a + v.g, 0) / total; // share no theme fits
  return { total, themes, cats, formats, hours, none, tags: hashtags(list.slice(0, 300)) };
}

export function build() {
  const videos = readJson("state/videos.json", {});
  const channels = readJson("state/channels.json", {});
  const charts = readJson("state/charts.json", {});
  const trends = readJson("state/trends.json", {});
  const nowIso = new Date().toISOString();
  // The day of the DATA is the Thai day YouTube was last read, not the day this build runs: the robot rebuilds
  // every 6 hours, and naming the day file by build time made a copy of yesterday under today's name (2026-10-15).
  const ytAt = lastReading(videos);
  const trendsAt = lastTrends(trends);
  const day = ytAt ? thaiDate(new Date(ytAt)) : thaiDate();
  const today = thaiDate();
  const chCfg = config("channels.json", {});
  const isCopy = (v) => (chCfg.original?.[v.ch] ? false : !!chCfg.copy?.[v.ch] || isCopyText(v.t, v.cn));

  const all = [];
  for (const [id, v] of Object.entries(videos)) {
    const r = gain(v, nowIso);
    if (!r) continue;
    const o = { ...v, id, g: r.g, m: r.m, q: r.m ? "m" : r.ageH <= 24 ? "n" : "e", views: r.views, ageH: Math.round(r.ageH), themes: themesOf(v.t, v.k) };
    o.x = timesUsual(o, channels[v.ch]);
    o.copy = isCopy(o);
    o.sens = SENSITIVE.test(v.t);
    all.push(o);
  }
  all.sort((a, b) => b.g - a.g);
  const th = all.filter((v) => v.lang === "th");
  const lo = all.filter((v) => v.lang === "lo");
  const original = (v) => isCreatorVideo(v) && !v.copy && !v.sens;
  const creator = th.filter(original);
  const copies = th.filter((v) => isCreatorVideo(v) && v.copy);
  const loCreator = lo.filter(original);
  const outliers = creator.filter((v) => v.x != null && v.views >= X_MIN_VIEWS).sort((a, b) => b.x - a.x);
  const kw = config("keywords.json", {});
  const words = [...new Set([...(kw.th_week || []), ...(kw.th_day || []), ...(kw.th_new || [])])];

  const row = (v) => short(v, { g: v.g, m: v.m, q: v.q, x: v.x, views: v.views, ageH: v.ageH, themes: v.themes });
  const statsCreator = analyse(creator);
  const statsAll = analyse(th);

  // momentum: today's share of each theme vs the average share of the last 7 days
  // shown only once 7 real days exist: fewer days give a number that looks precise but means little
  const past = readDays(7, day);
  for (const t of statsCreator.themes) {
    const shares = past.map((d) => (d.creator.themes.find((x) => x.id === t.id) || { share: 0 }).share);
    t.prev = shares.length >= COMPARE_DAYS ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
  }

  // channels
  const chList = Object.entries(channels).map(([id, c]) => {
    const s = c.s || [];
    const last = s[s.length - 1] || [];
    let subsGain = null;
    for (let i = s.length - 2; i >= 0; i--) {
      const h = hoursBetween(s[i][0], last[0]);
      if (h >= 18 && h <= 40 && last[1] != null && s[i][1] != null) { subsGain = Math.round(((last[1] - s[i][1]) / h) * 24); break; }
      if (h > 40) break;
    }
    return { id, t: c.t, c: c.c, img: c.img, h: c.h, lang: c.lang, subs: last[1], views: last[2], vids: last[3], subsGain };
  });
  const viewsToday = sumBy(th, (v) => v.ch, (v) => v.g);
  const chTodayMap = new Map(viewsToday.map((x) => [x.k, x]));
  const thCh = chList.filter((c) => c.lang === "th" && c.subs);
  const loCh = chList.filter((c) => c.lang === "lo" && c.subs);
  const rising = thCh.filter((c) => !MEDIA_CHANNEL.test(c.t)).map((c) => ({ ...c, g: chTodayMap.get(c.id)?.v || 0, n: chTodayMap.get(c.id)?.n || 0 }))
    .filter((c) => c.g > 0).sort((a, b) => (b.subsGain ?? -1) - (a.subsGain ?? -1) || b.g - a.g).slice(0, 50);

  const latest = {
    updated: nowIso,     // when this file was built (every 6 h) - NOT how fresh the numbers are
    ytAt,                // when YouTube was last read: the time of every view number
    trendsAt,            // when Google Trends was last read
    day,                 // the Thai day of ytAt
    pastDays: past.length,
    measured: th.filter((v) => v.m).length,
    counts: {
      th: th.length, creator: creator.length, lo: lo.length, channels: thCh.length,
      reliable: creator.filter((v) => v.q !== "e").length, // measured + new: numbers we can stand behind
      copies: copies.length, hiddenSensitive: th.filter((v) => isCreatorVideo(v) && !v.copy && v.sens).length,
      withX: creator.filter((v) => v.x != null).length, loCreator: loCreator.length,
    },
    // what the numbers are a sample OF: Thai videos found by these search words, not all of Thai YouTube
    sample: { words: words.map((w) => w || "(ไม่ใส่คำ)"), searches: words.length },
    creator: {
      top: creator.slice(0, LIST).map(row),
      sure: creator.filter((v) => v.q !== "e").slice(0, 100).map(row), // measured + new only, by 24 h views
      outliers: outliers.slice(0, 100).map(row), // by ×N
      ...statsCreator,
    },
    copies: copies.slice(0, 30).map(row),
    all: { top: th.slice(0, TOP).map(row), ...statsAll },
    fresh: th.filter((v) => v.ageH <= 24).sort((a, b) => b.views - a.views).slice(0, 30).map(row),
    freshCreator: creator.filter((v) => v.ageH <= 24).sort((a, b) => b.views - a.views).slice(0, 30).map(row),
    channels: {
      bySubs: thCh.sort((a, b) => b.subs - a.subs).slice(0, 100),
      rising,
    },
    lao: {
      top: loCreator.slice(0, 50).map(row),
      ...analyse(loCreator),
      channels: loCh.sort((a, b) => b.subs - a.subs).slice(0, 30),
    },
    charts: { updated: charts.updated, TH: (charts.TH || []).slice(0, 30), LA: (charts.LA || []).slice(0, 30) },
    trends: { today: trends[today] || [], yesterday: trends[thaiDate(new Date(Date.now() - 864e5))] || [] },
  };
  writeJson("latest.json", latest);

  const ls = (dir) => (fs.existsSync(path.join(DATA, dir)) ? fs.readdirSync(path.join(DATA, dir)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort() : []);
  if (!ytAt) {
    log("build: no YouTube reading yet - no day record");
    writeJson("ideas.json", buildIdeas(latest, past));
    return latest;
  }

  // ---- the day record (history): one file per Thai day YouTube was read; a rebuild of the same read rewrites
  // the same file with the same content (so git sees no change) ----
  const dayRec = {
    day,
    updated: ytAt,
    creator: {
      // [id, gain, title, channel, category, seconds, themes, measured, ×N, q] (×N and q added 2026-10-15)
      top: creator.slice(0, KEEP_IN_DAY).map((v) => [v.id, v.g, v.t, v.cn, v.cat, v.d, v.themes.join(" "), v.m, v.x, v.q]),
      themes: statsCreator.themes.map(({ id, v, n, share }) => ({ id, v, n, share })),
      cats: statsCreator.cats,
      formats: statsCreator.formats,
      total: statsCreator.total,
    },
    allTotal: statsAll.total,
    lao: loCreator.slice(0, 50).map((v) => [v.id, v.g, v.t, v.cn, v.cat, v.d, v.themes.join(" "), v.m, v.x, v.q]),
    trends: (trends[day] || []).map((t) => [t.q, t.n]),
  };
  writeJson(`days/${day}.json`, dayRec);

  // ---- months and years: sums of the days ----
  const month = day.slice(0, 7);
  const monthDays = fs.readdirSync(path.join(DATA, "days")).filter((f) => f.startsWith(month)).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, "days", f), "utf8")));
  writeJson(`months/${month}.json`, sumPeriod(month, monthDays.map((d) => ({ top: d.creator.top, themes: d.creator.themes, total: d.creator.total, trends: d.trends, days: [d.day] }))));
  const year = day.slice(0, 4);
  const months = fs.readdirSync(path.join(DATA, "months")).filter((f) => f.startsWith(year)).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA, "months", f), "utf8")));
  writeJson(`years/${year}.json`, sumPeriod(year, months));

  // the list of periods the page can open
  writeJson("index.json", { days: ls("days"), months: ls("months"), years: ls("years"), updated: nowIso });

  // the theme history the news page draws: one small file instead of up to 30 day files (~56 KB each)
  const histDays = ls("days").slice(-HISTORY_DAYS).map((d) => JSON.parse(fs.readFileSync(path.join(DATA, "days", d + ".json"), "utf8")));
  writeJson("history.json", { days: histDays.map((d) => ({ day: d.day, themes: Object.fromEntries(d.creator.themes.map((t) => [t.id, Math.round(t.share * 1e4) / 1e4])) })) });

  const ideas = buildIdeas(latest, past);
  writeJson("ideas.json", ideas);
  log(`build: ${th.length} Thai (${creator.length} creator, ${latest.measured} measured), ${lo.length} Lao, ideas ${ideas.cards.length}`);
  return latest;
}

// the newest YouTube reading of any followed video = when YouTube was last read (null before the first read)
export function lastReading(videos) {
  let best = 0;
  for (const v of Object.values(videos)) {
    const t = Date.parse(v.s?.at(-1)?.[0] || "");
    if (t > best) best = t;
  }
  return best ? new Date(best).toISOString() : null;
}
function lastTrends(trends) {
  let best = 0;
  for (const list of Object.values(trends)) for (const t of list || []) best = Math.max(best, Date.parse(t.last || "") || 0);
  return best ? new Date(best).toISOString() : null;
}


// sum several days (or months) into one period: views gained per video, per theme, trends seen
function sumPeriod(name, parts) {
  const vids = new Map();
  const themes = new Map();
  const trends = new Map();
  let total = 0;
  const days = [];
  for (const p of parts) {
    total += p.total || 0;
    days.push(...(p.days || []));
    for (const r of p.top || []) {
      const o = vids.get(r[0]) || { r: [...r], g: 0, days: 0 };
      o.g += r[1];
      o.days += r.daysIn || 1;
      o.r[2] = r[2];
      vids.set(r[0], o);
    }
    for (const t of p.themes || []) {
      const o = themes.get(t.id) || { id: t.id, v: 0, n: 0 };
      o.v += t.v;
      o.n += t.n;
      themes.set(t.id, o);
    }
    for (const [q, n] of p.trends || []) {
      const o = trends.get(q) || [q, 0, 0];
      o[1] = Math.max(o[1], n);
      o[2] += 1;
      trends.set(q, o);
    }
  }
  const top = [...vids.values()].sort((a, b) => b.g - a.g).slice(0, KEEP_IN_DAY).map((o) => {
    const r = [...o.r];
    r[1] = o.g;
    return r;
  });
  const t = [...themes.values()].sort((a, b) => b.v - a.v).map((x) => ({ ...x, share: total ? x.v / total : 0 }));
  return { period: name, days, total, top, themes: t, trends: [...trends.values()].sort((a, b) => b[2] - a[2] || b[1] - a[1]).slice(0, 60) };
}

if (isMain(import.meta.url)) build();
export { THEMES };
