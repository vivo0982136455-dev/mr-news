# Mr News — สมุดครีเอเตอร์ของ Win

A self-updating "book" for Win's two creator pages (couple life "วันๆ One One" + an AI page). Thai UI, static site
(GitHub Pages) + a GitHub Actions robot. Built 2026-10-14.

## Pages
| Route | What |
|---|---|
| `#/` | Cover: today in one minute, chapters with progress, 10-minute routine |
| `#/news` | **Mr News**: Thai creator videos ranked by views gained in 24 h, themes, Shorts vs long, posting hour, YouTube categories, channels, hashtags, Google Trends TH, YouTube's own chart; views: creator / all / Lao; periods: day (+ history) / month / year |
| `#/idea` | **Mr Idea**: rising themes → one couple idea + one AI idea each (idea bank `js/shared/ideabank.js`, rotated daily) + Gemini prompt builder |
| `#/handbook` `#/human` `#/ai` | Lesson chapters (content in `js/content/*.js`, ids in `js/book.js`), figures (`figures.js`), widgets (`widgets.js`), real YouTube lessons chosen weekly |
| `#/notes` | Win's notebook — localStorage only, export JSON/CSV, import |

## Data robot (`node scripts/fetch-all.mjs`)
- Google Trends RSS geo=TH every run (10 items/read, merged per Thai day). Laos impossible (HTTP 400).
- YouTube Data API v3 once a day (when last read ≥ 20 h): 34 searches (`config/keywords.json`, Thai + Lao words,
  order=viewCount), keep videos with Thai/Lao title or channel country TH/LA, follow each video 10 days → views gained
  in 24 h are **measured** from a reading 18–40 h earlier, otherwise **estimated** (views/age×24, labelled "ประมาณ").
  `chart=mostPopular` only gives music/movies/gaming since 21 Jul 2025 → shown separately.
- Weekly: Wikipedia most-followed lists (`fetch-famous.mjs`), lesson videos + best AI videos (`fetch-learn.mjs`, `config/learn.json`).
- Quota: search.list has its own bucket of **100/day**; we use ~34 (+18 on the weekly day). Other calls ~150 of 10,000 units.
- `scripts/build.mjs` → `data/latest.json`, `data/days/<date>.json` (history, kept), `data/months`, `data/years`, `data/ideas.json`, `data/index.json`.
- Key: GitHub secret `YT_API_KEY`; on this PC `Desktop\MrNews\youtube_key.txt` (one folder ABOVE the repo). Never printed, never committed (`.gitignore` + test).
- The company network resets youtube.com / tiktok.com (googleapis.com works) → the robot runs on GitHub.

## Tests
`node tests/all.mjs` (quick: `node tests/all.mjs quick`) — content ids, data shape, real headless Edge: 8 pages × 3 widths × light/dark,
no errors, nothing wider than the screen, every chart drawn, chart/figure text inside its box, real clicks (save note, calculators, read ticks, theme, video tap).
`node tests/serve.mjs 8765` serves the site locally.

## House rules
Thai to Win · answer before acting · DO IT PERFECT (run the tests after every change) · no real people/brands/politics/religion/monarchy in ideas ·
never film the workplace or ID documents · Win posts and pays himself · facts labelled ยืนยันแล้ว / ประมาณการ / ยังไม่ยืนยัน with sources.
