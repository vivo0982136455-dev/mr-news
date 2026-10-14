// Daily YouTube robot for Mr News.
// 1. search Thai and Lao words (config/keywords.json) for the most viewed videos of the last 24 h / 7 days
// 2. keep only videos with a Thai / Lao title or from a channel in Thailand / Laos
// 3. re-read the view counts of every video found in the last 10 days -> "views gained in 24 h"
// 4. re-read the channels (subscribers) and YouTube's own most-popular list (music / games / trailers)
// Writes data/state/videos.json, channels.json, charts.json. Uses about 35 of 100 searches + ~150 of 10,000 units.
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson, writeJson, isoSeconds, log, isMain } from "./lib/util.mjs";
import { yt, listByIds, used, hasKey } from "./lib/yt.mjs";
import { THAI, LAO } from "../js/shared/themes.js";

const TRACK_DAYS = 10; // follow a video's views this many days after we first saw it
const MAX_SNAPS = 14;
const MAX_VIDEOS = 5000;
const MAX_CHANNELS = 3000;

const now = new Date();
const nowIso = now.toISOString();
const since = (days) => new Date(now - days * 864e5).toISOString();
const kw = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "keywords.json"), "utf8"));

async function searchIds(q, { lang, days }) {
  const params = { part: "id", type: "video", order: "viewCount", maxResults: 50, publishedAfter: since(days), q };
  if (lang === "th") Object.assign(params, { regionCode: "TH", relevanceLanguage: "th" });
  else Object.assign(params, { relevanceLanguage: "lo" });
  const j = await yt("search", params);
  return (j.items || []).map((x) => x.id.videoId).filter(Boolean);
}

function snap(list, entry) {
  list.push(entry);
  while (list.length > MAX_SNAPS) list.shift();
  return list;
}

export async function fetchYoutube() {
  if (!hasKey()) {
    log("YouTube: no key - skipped");
    return { skipped: true };
  }
  const videos = readJson("state/videos.json", {});
  const channels = readJson("state/channels.json", {});

  // ---- 1. searches ----
  const found = new Map(); // id -> language hint
  const jobs = [
    ...kw.th_week.map((q) => [q, "th", 7]),
    ...kw.th_day.map((q) => [q, "th", 1]),
    ...kw.lo_week.map((q) => [q, "lo", 7]),
  ];
  let failed = 0;
  for (const [q, lang, days] of jobs) {
    try {
      for (const id of await searchIds(q, { lang, days })) if (!found.has(id)) found.set(id, lang);
    } catch (e) {
      failed++;
      log(`search "${q}" failed: ${e.message}`);
      if (e.fatal) break; // quota used up: stop searching, still refresh what we have
    }
  }
  log(`searches: ${jobs.length - failed}/${jobs.length} ok, ${found.size} videos found`);

  // ---- 2. which ids to read: new ones + the ones we still follow ----
  const followed = Object.keys(videos).filter((id) => (now - new Date(videos[id].first)) / 864e5 <= TRACK_DAYS);
  const ids = [...new Set([...found.keys(), ...followed])];
  const items = await listByIds("videos", "snippet,statistics,contentDetails", ids);
  log(`video details: ${items.length} of ${ids.length}`);

  // channels of the new videos first: their country decides Thai / Lao
  const newChannelIds = [...new Set(items.map((v) => v.snippet.channelId))].filter((c) => !channels[c]);
  const refreshChannels = [...new Set([...newChannelIds, ...Object.keys(channels)])];
  const chItems = await listByIds("channels", "snippet,statistics", refreshChannels);
  for (const c of chItems) {
    const old = channels[c.id];
    const s = c.statistics || {};
    channels[c.id] = {
      t: c.snippet.title,
      c: c.snippet.country || "",
      img: c.snippet.thumbnails?.default?.url || "",
      h: c.snippet.customUrl || "",
      first: old?.first || nowIso,
      lang: old?.lang || "",
      s: snap(old?.s || [], [nowIso, s.hiddenSubscriberCount ? null : +s.subscriberCount || 0, +s.viewCount || 0, +s.videoCount || 0]),
    };
  }

  // ---- 3. keep Thai / Lao videos ----
  let kept = 0;
  for (const v of items) {
    const sn = v.snippet;
    const st = v.statistics || {};
    const ch = channels[sn.channelId] || {};
    const title = sn.title || "";
    let lang = videos[v.id]?.lang;
    if (!lang) {
      if (LAO.test(title) || ch.c === "LA") lang = "lo";
      else if (THAI.test(title) || ch.c === "TH") lang = "th";
    }
    if (!lang) continue; // a global video that only matched the search: not Thai or Lao content
    if (ch && !ch.lang) ch.lang = lang;
    const old = videos[v.id];
    videos[v.id] = {
      t: title,
      ch: sn.channelId,
      cn: sn.channelTitle,
      cat: +sn.categoryId || 0,
      d: isoSeconds(v.contentDetails?.duration),
      p: sn.publishedAt,
      k: (sn.tags || []).slice(0, 12).join(" ").slice(0, 240),
      lang,
      first: old?.first || nowIso,
      s: snap(old?.s || [], [nowIso, +st.viewCount || 0, +st.likeCount || 0, +st.commentCount || 0]),
    };
    kept++;
  }
  log(`kept ${kept} Thai/Lao videos`);

  // ---- 4. YouTube's own most-popular list (since 21 Jul 2025: trending music, movies, gaming) ----
  const charts = {};
  for (const region of ["TH", "LA"]) {
    try {
      const j = await yt("videos", { part: "snippet,statistics,contentDetails", chart: "mostPopular", regionCode: region, maxResults: 50 });
      charts[region] = (j.items || []).map((v) => ({
        id: v.id, t: v.snippet.title, cn: v.snippet.channelTitle, cat: +v.snippet.categoryId || 0,
        d: isoSeconds(v.contentDetails?.duration), p: v.snippet.publishedAt, v: +(v.statistics?.viewCount || 0),
      }));
    } catch (e) {
      log(`mostPopular ${region} failed: ${e.message}`);
    }
  }

  // ---- 5. tidy up: forget videos we no longer follow after 15 days, cap the sizes ----
  for (const id of Object.keys(videos)) if ((now - new Date(videos[id].first)) / 864e5 > 15) delete videos[id];
  const vIds = Object.keys(videos);
  if (vIds.length > MAX_VIDEOS) {
    vIds.sort((a, b) => (videos[b].s.at(-1)[1] || 0) - (videos[a].s.at(-1)[1] || 0));
    for (const id of vIds.slice(MAX_VIDEOS)) delete videos[id];
  }
  const used_channels = new Set(Object.values(videos).map((v) => v.ch));
  for (const id of Object.keys(channels)) if (!channels[id].lang && !used_channels.has(id)) delete channels[id]; // global channels
  const cIds = Object.keys(channels);
  if (cIds.length > MAX_CHANNELS) {
    cIds.sort((a, b) => (channels[b].s.at(-1)[1] || 0) - (channels[a].s.at(-1)[1] || 0));
    for (const id of cIds.slice(MAX_CHANNELS)) delete channels[id];
  }

  writeJson("state/videos.json", videos);
  writeJson("state/channels.json", channels);
  writeJson("state/charts.json", { updated: nowIso, ...charts });
  log(`YouTube done: ${Object.keys(videos).length} videos followed, ${Object.keys(channels).length} channels, used ${used.search} searches + ${used.units} units`);
  return { videos: Object.keys(videos).length, channels: Object.keys(channels).length, used: { ...used }, failedSearches: failed };
}

if (isMain(import.meta.url)) fetchYoutube().catch((e) => { console.error(e.message); process.exit(1); });
