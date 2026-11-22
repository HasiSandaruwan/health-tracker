// POST /api/meal
// { day_id, time, slot, name, protein, carbs, fat,
//   items: [{ name, portion, kcal, protein }] }
// Adds a meal with its items and a matching timeline event.
import { json, bad, body, ensureDay } from "./_utils.js";

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function onRequestPost(context) {
  const { DB } = context.env;
  const b = await body(context.request);
  const dayId = b.day_id;
  const slot = b.slot || "Snack";
  const name = (b.name && String(b.name).trim()) || slot;
  const time = b.time || "";
  const items = Array.isArray(b.items) ? b.items : [];

  if (!dayId) return bad("day_id is required");
  if (!items.length) return bad("at least one item is required");

  // Edit an existing meal in place: keep its id and its timeline event, but
  // replace the meal fields and all of its items.
  if (b.meal_id) {
    const mealId = b.meal_id;
    await DB.prepare(
      "UPDATE meals SET time = ?, slot = ?, name = ? WHERE id = ?"
    ).bind(time, slot, name, mealId).run();
    await DB.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId).run();
    for (const it of items) {
      await DB.prepare(
        "INSERT INTO meal_items (meal_id, name, portion, kcal, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        mealId,
        (it.name && String(it.name).trim()) || "Item",
        it.portion || "",
        num(it.kcal) || 0,
        num(it.protein),
        num(it.carbs),
        num(it.fat)
      ).run();
    }
    await DB.prepare("UPDATE events SET time = ? WHERE meal_id = ? AND type = 'm'")
      .bind(time, mealId).run();
    return json({ ok: true, meal_id: mealId });
  }

  await ensureDay(DB, dayId);

  const meal = await DB.prepare(
    "INSERT INTO meals (day_id, time, slot, name, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(dayId, time, slot, name, num(b.protein), num(b.carbs), num(b.fat)).run();
  const mealId = meal.meta.last_row_id;

  for (const it of items) {
    await DB.prepare(
      "INSERT INTO meal_items (meal_id, name, portion, kcal, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      mealId,
      (it.name && String(it.name).trim()) || "Item",
      it.portion || "",
      num(it.kcal) || 0,
      num(it.protein),
      num(it.carbs),
      num(it.fat)
    ).run();
  }

  await DB.prepare(
    "INSERT INTO events (day_id, time, type, meal_id) VALUES (?, ?, 'm', ?)"
  ).bind(dayId, time, mealId).run();

  return json({ ok: true, meal_id: mealId });
}
