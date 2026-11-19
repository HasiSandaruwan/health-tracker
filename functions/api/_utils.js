// Shared helpers for the API. Files starting with "_" are not routed by
// Cloudflare Pages, but can be imported by the route handlers.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function bad(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

// Read and parse a JSON request body. Returns {} on empty/invalid bodies.
export async function body(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch (_) {
    return {};
  }
}

// Create the day row the first time anything is logged for that date.
export async function ensureDay(DB, dayId) {
  await DB.prepare("INSERT OR IGNORE INTO days (id, notes) VALUES (?, '[]')")
    .bind(dayId)
    .run();
}
