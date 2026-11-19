// Worker entry point (Workers + Static Assets model).
//
// Static files in public/ are served automatically by the platform. Any request
// that doesn't match a static asset (i.e. /api/*) reaches this Worker, which
// reuses the existing route handlers in functions/api/* by calling them with a
// Pages-style `context` object. This keeps one copy of the API logic.

import * as days from "../functions/api/days.js";
import * as water from "../functions/api/water.js";
import * as meal from "../functions/api/meal.js";
import * as sleep from "../functions/api/sleep.js";
import * as walk from "../functions/api/walk.js";
import * as day from "../functions/api/day.js";
import * as event from "../functions/api/event.js";
import * as profile from "../functions/api/profile.js";

const routes = {
  "/api/days": days,
  "/api/water": water,
  "/api/meal": meal,
  "/api/sleep": sleep,
  "/api/walk": walk,
  "/api/day": day,
  "/api/event": event,
  "/api/profile": profile,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mod = routes[url.pathname];

    if (!mod) {
      return new Response("Not found", { status: 404 });
    }

    const method = request.method.toUpperCase();
    // GET -> onRequestGet, POST -> onRequestPost, DELETE -> onRequestDelete
    const handlerName =
      "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
    const handler = mod[handlerName] || mod.onRequest;

    if (!handler) {
      return new Response("Method not allowed", { status: 405 });
    }

    const context = {
      request,
      env,
      params: {},
      waitUntil: ctx.waitUntil.bind(ctx),
      next: () => new Response("Not found", { status: 404 }),
    };

    try {
      return await handler(context);
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: String(err && err.message || err) }),
        { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
      );
    }
  },
};
