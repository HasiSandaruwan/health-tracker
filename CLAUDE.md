# Health and Calorie Tracker

A personal, single-user web app to log health data day by day and show it on a
dashboard. Owner's goal: weight loss, about 1,550 kcal/day.

## Stack
- Frontend: plain HTML/CSS/JS in `public/` (no framework, no build step).
- API: Cloudflare Pages Functions in `functions/api/`.
- Database: Cloudflare D1 (SQLite), binding `DB`, database name `health-db`.
- Hosting: Cloudflare Pages, auto-deploys on push to `main`.
- Auth: Cloudflare Access (configured in the Cloudflare dashboard, not in code).

## Layout
```
public/
  index.html        shell: loads style.css + app.js, links manifest
  style.css         all styles (design + entry-form styles)
  app.js            render (overview / dayView / plan) + API calls + forms
  manifest.json     PWA
  icon-192/512/maskable.png
functions/api/
  _utils.js   json(), bad(), body(), ensureDay() helpers (not routed; "_" prefix)
  days.js     GET    all days, shaped like the old DAYS array
  water.js    POST   { day_id, time, ml }
  meal.js     POST   { day_id, time, slot, name, protein, carbs, fat, items:[{name,portion,kcal,protein}] }
  sleep.js    POST   { day_id, hours, note }
  walk.js     POST   { day_id, km, kcal }
  day.js      POST   { day_id, done?, note? }   also creates today's page
  event.js    DELETE { id } | { meal_id } | { day_id, note_index }
db/schema.sql
wrangler.toml       database_id must be pasted in (not committed as a real secret, but keep it here only)
```

## Data shape (GET /api/days)
Array of:
`{id, label, full, done, sleep:{h,txt}, walk:{km,kcal}|null,
  meals:[{id,t,slot,name,p,c,f,items:[[name,portion,kcal,protein]]}],
  ev:[[time,type,value,id]], notes:[]}`
- `ev` type: `w` water (value = ml), `s` sleep (text), `a` activity (text),
  `m` meal (value = index of the meal in `meals`). `id` is the event row id.
- `label`/`full` are computed from the date id on the server.

## Conventions
- All API routes return JSON. Parameterized queries only (`.prepare().bind()`).
- A day row is auto-created the first time anything is logged for that date
  (`ensureDay`).
- Dates/times use Asia/Colombo and come from the browser (`todayId`, `nowLabel`
  in app.js). The API stores whatever strings it is given.
- Calorie values are estimates (~10% error) — keep the footer note.

## Local dev
```
npx wrangler d1 execute health-db --local --file=db/schema.sql
npx wrangler pages dev public
```
Local D1 is a separate SQLite store; it does not need a real `database_id`.

## Do not
- Add frameworks or a build step.
- Commit secrets. The database id lives only in `wrangler.toml`.
- Break dark mode or the existing look.
