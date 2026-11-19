// POST /api/walk  { day_id, km, kcal }
// Sets the walk for a day.
import { json, bad, body, ensureDay } from "./_utils.js";

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  const dayId = b.day_id;
  const km = b.km === "" || b.km == null ? null : Number(b.km);
  const kcal = b.kcal === "" || b.kcal == null ? null : parseInt(b.kcal, 10);

  if (!dayId) return bad("day_id is required");
  if (km == null || isNaN(km)) return bad("km is required");

  await ensureDay(DB, dayId);
  await DB.prepare(
    "UPDATE days SET walk_km = ?, walk_kcal = ? WHERE id = ?"
  ).bind(km, isNaN(kcal) ? null : kcal, dayId).run();

  return json({ ok: true });
}
