// POST /api/water  { day_id, time, ml }
// Adds a water entry (one tap = one event).
import { json, bad, body, ensureDay } from "./_utils.js";

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  const ml = parseInt(b.ml, 10);
  if (!ml || ml <= 0) return bad("ml must be a positive number");

  // Edit an existing water entry (just the amount).
  if (b.id) {
    await DB.prepare("UPDATE events SET ml = ? WHERE id = ? AND type = 'w'")
      .bind(ml, b.id).run();
    return json({ ok: true, id: b.id });
  }

  const dayId = b.day_id;
  const time = b.time || "";

  if (!dayId) return bad("day_id is required");

  await ensureDay(DB, dayId);
  const res = await DB.prepare(
    "INSERT INTO events (day_id, time, type, ml) VALUES (?, ?, 'w', ?)"
  ).bind(dayId, time, ml).run();

  return json({ ok: true, id: res.meta.last_row_id });
}
