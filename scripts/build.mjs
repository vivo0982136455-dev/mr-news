// Turns the robot's raw state into what the pages show:
//   data/latest.json        today's Mr News (Thai + Lao)
//   data/days/<date>.json   one Thai day (kept for ever: the history)
//   data/months/<yyyy-mm>.json, data/years/<yyyy>.json   sums of the days
//   data/ideas.json         Mr Idea of the day (scripts/ideas.mjs)
// "Views gained in 24 h" is MEASURED when we have a reading of the same video about a day earlier;
// otherwise ESTIMATED from its age (views per hour since upload x 24) and marked so on the page.
import fs from "node:fs";
import path from "node:path";
import { DATA, readJson, writeJson, thaiDate, hoursBetween, log, isMain } from "./lib/util.mjs";
import { themesOf, isCreatorVideo, isShort, THEMES } from "../js/shared/themes.js";
import { buildIdeas } from "./ideas.mjs";

const TOP = 100;
const KEEP_IN_DAY = 200;

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
  return { total, themes, cats, formats, hours, tags: hashtags(list.slice(0, 300)) };
}

export function build() {
  const videos = readJson("state/videos.json", {});
  const channels = readJson("state/channels.json", {});
  const charts = readJson("state/charts.json", {});
  const trends = readJson("state/trends.json", {});
  const nowIso = new Date().toISOString();
  const day = thaiDate();

  const all = [];
  for (const [id, v] of Object.entries(videos)) {
    const r = gain(v, nowIso);
    if (!r) continue;
    all.push({ ...v, id, g: r.g, m: r.m, views: r.views, ageH: Math.round(r.ageH), themes: themesOf(v.t + " " + (v.k || "")) });
  }
  all.sort((a, b) => b.g - a.g);
  const th = all.filter((v) => v.lang === "th");
  const lo = all.filter((v) => v.lang === "lo");
  const creator = th.filter(isCreatorVideo);

  const row = (v) => short(v, { g: v.g, m: v.m, views: v.views, ageH: v.ageH, themes: v.themes });
  const statsCreator = analyse(creator);
  const statsAll = analyse(th);

  // momentum: today's share of each theme vs the average share of the last 7 days
  const past = readDays(7, day);
  for (const t of statsCreator.themes) {
    const shares = past.map((d) => (d.creator.themes.find((x) => x.id === t.id) || { share: 0 }).share);
    t.prev = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
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
  const rising = thCh.filter((c) => !MEDIA(c.t)).map((c) => ({ ...c, g: chTodayMap.get(c.id)?.v || 0, n: chTodayMap.get(c.id)?.n || 0 }))
    .filter((c) => c.g > 0).sort((a, b) => (b.subsGain ?? -1) - (a.subsGain ?? -1) || b.g - a.g).slice(0, 50);

  const latest = {
    updated: nowIso,
    day,
    measured: th.filter((v) => v.m).length,
    counts: { th: th.length, creator: creator.length, lo: lo.length, channels: thCh.length },
    creator: { top: creator.slice(0, TOP).map(row), ...statsCreator },
    all: { top: th.slice(0, TOP).map(row), ...statsAll },
    fresh: th.filter((v) => v.ageH <= 24).sort((a, b) => b.views - a.views).slice(0, 30).map(row),
    channels: {
      bySubs: thCh.sort((a, b) => b.subs - a.subs).slice(0, 100),
      rising,
    },
    lao: {
      top: lo.slice(0, 50).map(row),
      ...analyse(lo),
      channels: loCh.sort((a, b) => b.subs - a.subs).slice(0, 30),
    },
    charts: { updated: charts.updated, TH: (charts.TH || []).slice(0, 30), LA: (charts.LA || []).slice(0, 30) },
    trends: { today: trends[day] || [], yesterday: trends[thaiDate(new Date(Date.now() - 864e5))] || [] },
  };
  writeJson("latest.json", latest);

  // ---- the day record (history) ----
  const dayRec = {
    day,
    updated: nowIso,
    creator: {
      top: creator.slice(0, KEEP_IN_DAY).map((v) => [v.id, v.g, v.t, v.cn, v.cat, v.d, v.themes.join(" "), v.m]),
      themes: statsCreator.themes.map(({ id, v, n, share }) => ({ id, v, n, share })),
      cats: statsCreator.cats,
      formats: statsCreator.formats,
      total: statsCreator.total,
    },
    allTotal: statsAll.total,
    lao: lo.slice(0, 50).map((v) => [v.id, v.g, v.t, v.cn, v.cat, v.d, v.themes.join(" "), v.m]),
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
  const ls = (dir) => fs.readdirSync(path.join(DATA, dir)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  writeJson("index.json", { days: ls("days"), months: ls("months"), years: ls("years"), updated: nowIso });

  const ideas = buildIdeas(latest, past);
  writeJson("ideas.json", ideas);
  log(`build: ${th.length} Thai (${creator.length} creator, ${latest.measured} measured), ${lo.length} Lao, ideas ${ideas.cards.length}`);
  return latest;
}

const MEDIA = (name) => /official|ทีวี|\btv\b|ช่อง ?\d|\bhd ?\d|news|ข่าว|records|music|workpoint|one31|ch3|gmm|pptv|thairath|ไทยรัฐ|amarin|vevo/i.test(name || "");

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
