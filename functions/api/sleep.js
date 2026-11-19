// POST /api/sleep  { day_id, hours, note }
// Sets the sleep for a day (hours are calculated on the client from bed/wake).
import { json, bad, body, ensureDay } from "./_utils.js";

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  const dayId = b.day_id;
  const hours = b.hours === "" || b.hours == null ? null : Number(b.hours);
  const note = b.note || "";

  if (!dayId) return bad("day_id is required");
  if (hours != null && (isNaN(hours) || hours < 0)) return bad("hours is invalid");

  await ensureDay(DB, dayId);
  await DB.prepare(
    "UPDATE days SET sleep_hours = ?, sleep_note = ? WHERE id = ?"
  ).bind(hours, note, dayId).run();

  return json({ ok: true });
}
