// GET  /api/profile  -> stored plan/profile object (or {} if never saved)
// POST /api/profile  -> replaces the stored object with the posted JSON
// Defaults live in the frontend (app.js DEFAULTS); the DB stores the full
// current profile as one JSON row.
import { json, body } from "./_utils.js";

export async function onRequestGet(context) {
  const { DB } = context.env;
  const row = await DB.prepare("SELECT data FROM profile WHERE id = 1").first();
  let data = {};
  if (row && row.data) {
    try { data = JSON.parse(row.data); } catch (_) { data = {}; }
  }
  return json(data);
}

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  await DB.prepare(
    "INSERT INTO profile (id, data) VALUES (1, ?) " +
    "ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  ).bind(JSON.stringify(b || {})).run();
  return json({ ok: true });
}
