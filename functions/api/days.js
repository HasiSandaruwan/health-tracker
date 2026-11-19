// GET /api/days
// Returns every day in the same shape as the old hard-coded DAYS array, so the
// existing render code keeps working:
//   {id, label, full, done, sleep:{h,txt}, walk:{km,kcal}|null,
//    meals:[{id,t,slot,name,p,c,f,items:[[name,portion,kcal,protein]]}],
//    ev:[[time,type,value,id]], notes:[]}
// For events of type 'm', value is the index of the meal in meals.
import { json } from "./_utils.js";

const W = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WF = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const M = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MF = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-11-18" -> {label:"Wed 18 Nov", full:"Wednesday, 18 November 2026"}
function labels(id) {
  const dt = new Date(id + "T00:00:00Z");
  if (isNaN(dt)) return { label: id, full: id };
  const wd = dt.getUTCDay(), d = dt.getUTCDate();
  const mo = dt.getUTCMonth(), y = dt.getUTCFullYear();
  return {
    label: W[wd] + " " + d + " " + M[mo],
    full: WF[wd] + ", " + d + " " + MF[mo] + " " + y,
  };
}

export async function onRequestGet(context) {
  const { DB } = context.env;
  const days = (await DB.prepare("SELECT * FROM days ORDER BY id ASC").all()).results || [];
  const out = [];

  for (const row of days) {
    const meals = (await DB.prepare(
      "SELECT * FROM meals WHERE day_id = ? ORDER BY id ASC"
    ).bind(row.id).all()).results || [];

    const mealIndex = {};
    const mealsOut = [];
    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      mealIndex[m.id] = i;
      const items = (await DB.prepare(
        "SELECT * FROM meal_items WHERE meal_id = ? ORDER BY id ASC"
      ).bind(m.id).all()).results || [];
      mealsOut.push({
        id: m.id,
        t: m.time,
        slot: m.slot,
        name: m.name || m.slot,
        p: m.protein,
        c: m.carbs,
        f: m.fat,
        items: items.map((it) => [it.name, it.portion, it.kcal, it.protein]),
      });
    }

    const events = (await DB.prepare(
      "SELECT * FROM events WHERE day_id = ? ORDER BY id ASC"
    ).bind(row.id).all()).results || [];
    const ev = events
      .map((e) => {
        let val;
        if (e.type === "w") val = e.ml;
        else if (e.type === "m") val = mealIndex[e.meal_id];
        else val = e.text;
        return [e.time, e.type, val, e.id];
      })
      // Drop meal events whose meal was deleted.
      .filter((e) => !(e[1] === "m" && e[2] === undefined));

    let notes = [];
    try { notes = row.notes ? JSON.parse(row.notes) : []; } catch (_) { notes = []; }

    const l = labels(row.id);
    out.push({
      id: row.id,
      label: l.label,
      full: l.full,
      done: !!row.done,
      sleep: { h: row.sleep_hours || 0, txt: row.sleep_note || "Not logged yet" },
      walk: row.walk_km != null ? { km: row.walk_km, kcal: row.walk_kcal || 0 } : null,
      meals: mealsOut,
      ev,
      notes,
    });
  }

  return json(out);
}
