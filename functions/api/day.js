// POST /api/day  { day_id, done?, note? }
// Creates today's page if needed, marks a day done, and/or appends a note.
import { json, bad, body, ensureDay } from "./_utils.js";

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  const dayId = b.day_id;
  if (!dayId) return bad("day_id is required");

  await ensureDay(DB, dayId);

  if (b.done !== undefined) {
    await DB.prepare("UPDATE days SET done = ? WHERE id = ?")
      .bind(b.done ? 1 : 0, dayId).run();
  }

  if (b.note !== undefined && String(b.note).trim()) {
    const row = await DB.prepare("SELECT notes FROM days WHERE id = ?").bind(dayId).first();
    let notes = [];
    try { notes = row && row.notes ? JSON.parse(row.notes) : []; } catch (_) { notes = []; }
    notes.push(String(b.note).trim());
    await DB.prepare("UPDATE days SET notes = ? WHERE id = ?")
      .bind(JSON.stringify(notes), dayId).run();
  }

  return json({ ok: true });
}
