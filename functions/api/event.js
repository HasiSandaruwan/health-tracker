// DELETE /api/event  { id }           -> remove one timeline entry
//                    { meal_id }      -> remove a meal and its items
// Deleting a meal event also removes the meal and its items. Deleting a note
// is handled by { note_index, day_id }.
import { json, bad, body } from "./_utils.js";

async function deleteMeal(DB, mealId) {
  await DB.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId).run();
  await DB.prepare("DELETE FROM meals WHERE id = ?").bind(mealId).run();
  await DB.prepare("DELETE FROM events WHERE type = 'm' AND meal_id = ?").bind(mealId).run();
}

export async function onRequestDelete(context) {
  const { DB } = context.env;
  const b = await body(context.request);

  // Remove a note by its index within a day's notes array.
  if (b.note_index !== undefined && b.day_id) {
    const row = await DB.prepare("SELECT notes FROM days WHERE id = ?").bind(b.day_id).first();
    let notes = [];
    try { notes = row && row.notes ? JSON.parse(row.notes) : []; } catch (_) { notes = []; }
    const i = parseInt(b.note_index, 10);
    if (i >= 0 && i < notes.length) {
      notes.splice(i, 1);
      await DB.prepare("UPDATE days SET notes = ? WHERE id = ?")
        .bind(JSON.stringify(notes), b.day_id).run();
    }
    return json({ ok: true });
  }

  if (b.meal_id) {
    await deleteMeal(DB, parseInt(b.meal_id, 10));
    return json({ ok: true });
  }

  if (b.id) {
    const ev = await DB.prepare("SELECT * FROM events WHERE id = ?").bind(b.id).first();
    if (ev) {
      if (ev.type === "m" && ev.meal_id) {
        await deleteMeal(DB, ev.meal_id);
      } else {
        await DB.prepare("DELETE FROM events WHERE id = ?").bind(b.id).run();
      }
    }
    return json({ ok: true });
  }

  return bad("id, meal_id, or note_index is required");
}
