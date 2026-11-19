# Health and Calorie Tracker

A personal, single-user web app to log health data day by day and show it on a
dashboard. Owner's goal: weight loss, about 1,550 kcal/day.

## Stack
- Frontend: plain HTML/CSS/JS in `public/` (no framework, no build step).
- API: route handlers in `functions/api/*` (Pages-Functions style:
  `onRequestGet/Post/Delete(context)`), served by a thin Worker at
  `src/worker.js` that routes `/api/*` to them.
- Hosting: **Cloudflare Workers + Static Assets** (not Pages). `public/` is
  served as assets; anything that isn't a static file falls through to the
  Worker. Deploy command: `npx wrangler deploy`. Auto-deploys on push to `main`.
- Database: Cloudflare D1 (SQLite), binding `DB`, database name `health-db`.
  The binding is declared in `wrangler.toml` and applied automatically on
  deploy — no dashboard binding step needed.
- Auth: Cloudflare Access (configured in the Cloudflare dashboard, not in code).

Note: the dashboard merged Pages into Workers, and the git-connect flow only
offered the Workers builder (which runs `wrangler deploy`). `wrangler pages
deploy` failed there with an auth error because the build token is Workers-
scoped. Hence the Workers + Static Assets model above.

## Layout
```
src/
  worker.js         Worker entry: serves assets + routes /api/* to functions/api/*
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
  profile.js  GET    stored plan/profile JSON ({} if unset)
              POST   replaces it with the posted object
db/schema.sql also has a single-row `profile` table (id=1, data=JSON).
The plan/profile (calorie/protein/water/sleep/walk targets, meal plan, weight
goal, BMR breakdown) is edited on the Plan & Profile page and stored here.
Defaults live in app.js `DEFAULTS`; `applyProfile()` derives T/MIN/MAX/PT/PTH/
WT/GL/PLAN from the loaded profile.
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
npx wrangler dev          # serves public/ + runs src/worker.js on :8787
```
Local D1 is a separate SQLite store; `wrangler dev` and `wrangler pages dev`
use different local stores, so re-run the `--local` schema after switching.

## Deploy
- Push to `main`; Cloudflare Workers build runs `npx wrangler deploy`.
- Remote schema (run once, and after schema changes):
  `npx wrangler d1 execute health-db --remote --file=db/schema.sql`

## Do not
- Add frameworks or a build step.
- Commit secrets. The database id lives only in `wrangler.toml`.
- Break dark mode or the existing look.
