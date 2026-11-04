// BTW Homework Dashboard: hosted on Railway, connected to GoHighLevel with one Private Integration key.
// Variables: GHL_TOKEN (Private Integration token for the Unshakable sub-account), SESSION_SECRET,
// DASH_ACCOUNTS ("email:Name;email:Name"), DASH_PASSWORD (shared password), optional GHL_COURSES_VERSION.
import { createHmac, timingSafeEqual } from "node:crypto";

const PAGE = await Bun.file(import.meta.dir + "/index.html").text();

const LOCATION = "zQh0YM3EIsWgcjMDTSSC";
const PRODUCT = "98cd5237-5b95-499b-8e77-14140c996169";
const API = Bun.env.GHL_API || "https://services.leadconnectorhq.com";
const FILE_PREFIX = "https://storage.googleapis.com/revex-membership-production/memberships/" + LOCATION + "/";
const TOKEN = Bun.env.GHL_TOKEN || "";
const SECRET = Bun.env.SESSION_SECRET || "";
const COURSES_VERSION = Bun.env.GHL_COURSES_VERSION || "v3";
const PASSWORD = Bun.env.DASH_PASSWORD || "";
const ACCOUNTS = new Map<string, string>(); // lowercased email -> display name
for (const part of (Bun.env.DASH_ACCOUNTS || "").split(";")) {
  const i = part.indexOf(":");
  if (i > 0) ACCOUNTS.set(part.slice(0, i).trim().toLowerCase(), part.slice(i + 1).trim());
}
function samePw(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }

type Op = { m: "GET" | "POST" | "PUT"; p: string; v: string; q?: string[]; write?: boolean };
const C = COURSES_VERSION;
const OPS: Record<string, Op> = {
  "list-assessments": { m: "GET", p: "/courses/products/{productId}/assessments", v: C, q: ["pageNumber", "pageSize", "status"] },
  "get-assessment": { m: "GET", p: "/courses/products/{productId}/assessments/{assessmentId}", v: C },
  "review-assessment": { m: "PUT", p: "/courses/products/{productId}/assessments/{assessmentId}/review", v: C, write: true },
  "list-lessons": { m: "GET", p: "/courses/products/{productId}/lessons", v: C, q: ["categoryId"] },
  "list-categories": { m: "GET", p: "/courses/products/{productId}/categories", v: C },
  "list-completions": { m: "GET", p: "/courses/products/{productId}/completions", v: C, q: ["contactId", "pageNumber", "pageSize"] },
  "list-enrollments": { m: "GET", p: "/courses/products/{productId}/enrollments", v: C, q: ["cursor", "limit"] },
  "list-category-progress": { m: "GET", p: "/courses/products/{productId}/categories/progress", v: C, q: ["contactId"] },
  "search-opportunities-advanced": { m: "POST", p: "/opportunities/search", v: "2021-07-28" },
};
const ID = /^[A-Za-z0-9-]{1,64}$/;

// ---------- sessions ----------
const DAY = 86400;
function sign(v: string) { return createHmac("sha256", SECRET).update(v).digest("base64url"); }
function makeSession(name: string) { // name = account email
  const exp = Math.floor(Date.now() / 1000) + 30 * DAY;
  const v = Buffer.from(name).toString("base64url") + "." + exp;
  return v + "." + sign(v);
}
function readSession(req: Request): string | null {
  if (!SECRET) return null;
  const m = /(?:^|;\s*)btw_s=([^;]+)/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const [n, exp, sig] = m[1].split(".");
  if (!n || !exp || !sig) return null;
  const want = Buffer.from(sign(n + "." + exp)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const email = Buffer.from(n, "base64url").toString();
  return ACCOUNTS.get(email) || null; // removing someone from DASH_ACCOUNTS signs them out
}
const cookie = (v: string, maxAge: number) => `btw_s=${v}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;

// ---------- login throttle ----------
const fails = new Map<string, { n: number; t: number }>();
function throttled(ip: string) { const f = fails.get(ip); return !!f && f.n >= 8 && Date.now() - f.t < 10 * 60e3; }
function fail(ip: string) { const f = fails.get(ip); if (!f || Date.now() - f.t > 10 * 60e3) fails.set(ip, { n: 1, t: Date.now() }); else f.n++; }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function loginPage(msg = "", next = "/") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>BTW Homework Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&display=swap">
<style>
:root{--ground:#EDEFEA;--panel:#fff;--ink:#141614;--muted:#5C635C;--line:#E0E3DC;--bad:#AE2F25;--bad-soft:#FBE4E1;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--ground:#0E100F;--panel:#171A18;--ink:#EDEFEC;--muted:#969C95;--line:#282C29;--bad:#EF6B5F;--bad-soft:#3A1A17;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--ground);color:var(--ink);font:15px/1.45 Geist,ui-sans-serif,system-ui,-apple-system,sans-serif;padding:16px}
form{width:100%;max-width:360px;background:var(--panel);border-radius:18px;padding:28px 24px;box-shadow:0 1px 2px rgba(0,0,0,.05),0 6px 18px rgba(0,0,0,.05);display:flex;flex-direction:column;gap:14px}
.logo{display:flex;align-items:center;gap:10px}.mark{width:36px;height:36px;border-radius:10px;background:var(--ink);color:var(--panel);display:grid;place-items:center;font-weight:700;font-size:11px}
h1{margin:6px 0 0;font-size:22px;letter-spacing:-.02em}p{margin:0;color:var(--muted);font-size:14px}
label{font-size:13px;font-weight:600}input{width:100%;height:46px;border-radius:12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:0 14px;font:inherit;font-size:16px;margin-top:6px}
input:focus{outline:2px solid var(--ink);outline-offset:1px}button{height:48px;border:0;border-radius:12px;background:var(--ink);color:var(--panel);font:inherit;font-weight:600;font-size:16px;cursor:pointer}
.err{background:var(--bad-soft);color:var(--ink);padding:10px 12px;border-radius:10px;font-size:14px}
</style></head><body><form method="post" action="/login">
<div class="logo"><span class="mark">BTW</span><b>Built to Win</b></div>
<div><h1>Homework dashboard</h1><p>Sign in with your Unshakable email.</p></div>
${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ""}
<input type="hidden" name="next" value="${esc(next)}">
<label>Email<input name="email" type="email" autocomplete="username" autocapitalize="none" placeholder="you@theunshakableinvestor.com" autofocus required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Sign in</button></form></body></html>`;
}
const html = (body: string, status = 200, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "same-origin", ...extra } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// ---------- GoHighLevel ----------
async function callGhl(op: Op, params: any): Promise<{ ok: boolean; status: number; body?: any; message?: string }> {
  const path = params?.path || {};
  let url = op.p.replace("{productId}", PRODUCT);
  if (url.includes("{assessmentId}")) {
    if (!ID.test(String(path.assessmentId || ""))) return { ok: false, status: 400, message: "Bad assessment id" };
    url = url.replace("{assessmentId}", String(path.assessmentId));
  }
  if (path.productId && path.productId !== PRODUCT) return { ok: false, status: 403, message: "Only the Built to Win course is allowed" };
  const qs = new URLSearchParams();
  for (const k of op.q || []) { const v = params?.query?.[k]; if (v !== undefined && v !== null && v !== "") qs.set(k, String(v)); }
  if (op.p.startsWith("/courses")) qs.set("locationId", LOCATION);
  let body: string | undefined;
  if (op.p === "/opportunities/search") body = JSON.stringify({ ...(params?.body || {}), locationId: LOCATION });
  if (op.write) {
    const b = params?.body || {};
    if (!["processing", "passed", "failed"].includes(b.status)) return { ok: false, status: 400, message: "Bad grade status" };
    body = JSON.stringify({ status: b.status, score: Number(b.score) || 0, feedback: String(b.feedback || "").slice(0, 5000) });
  }
  const send = (version: string) => fetch(API + url + (qs.toString() ? "?" + qs : ""), {
    method: op.m,
    headers: { Authorization: "Bearer " + TOKEN, Version: version, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body,
  });
  let r = await send(op.v);
  if (r.status === 400 && op.v !== "2021-07-28") {
    const t = await r.clone().text();
    if (/version/i.test(t)) r = await send("2021-07-28");
  }
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (r.ok) return { ok: true, status: r.status, body: data };
  const msg = (data && (data.message || data.error || data.msg)) || text || "HTTP " + r.status;
  return { ok: false, status: r.status, message: (Array.isArray(msg) ? msg.join("; ") : String(msg)).slice(0, 400) };
}

// ---------- server ----------
Bun.serve({
  port: Number(Bun.env.PORT) || 3000,
  async fetch(req, server) {
    const u = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || server.requestIP(req)?.address || "?";
    if (u.pathname === "/health") return new Response("ok");
    if (u.pathname === "/login" && req.method === "GET") return html(loginPage("", u.searchParams.get("next") || "/"));
    if (u.pathname === "/login" && req.method === "POST") {
      const f = await req.formData();
      const next = String(f.get("next") || "/");
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      if (!SECRET || !ACCOUNTS.size || !PASSWORD) return html(loginPage("The dashboard isn't set up yet (missing SESSION_SECRET, DASH_ACCOUNTS or DASH_PASSWORD).", safeNext), 503);
      if (throttled(ip)) return html(loginPage("Too many tries. Wait 10 minutes, then try again.", safeNext), 429);
      const email = String(f.get("email") || "").trim().toLowerCase();
      const name = ACCOUNTS.get(email);
      if (!name || !samePw(String(f.get("password") || ""), PASSWORD)) { fail(ip); return html(loginPage("That email and password don't match. Use your @theunshakableinvestor.com email.", safeNext), 401); }
      fails.delete(ip);
      console.log(`[login] ${name} <${email}>`);
      return new Response(null, { status: 303, headers: { Location: safeNext, "Set-Cookie": cookie(makeSession(email), 30 * DAY) } });
    }
    if (u.pathname === "/logout") return new Response(null, { status: 303, headers: { Location: "/login", "Set-Cookie": cookie("", 0) } });

    const who = readSession(req);
    if (u.pathname.startsWith("/api/")) {
      if (!who) return json({ ok: false, auth: false }, 401);
      if (u.pathname === "/api/ghl" && req.method === "POST") {
        if (!(req.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, status: 415, message: "JSON only" }, 415);
        if (!TOKEN) return json({ ok: false, status: 503, message: "GoHighLevel key isn't set on the server yet (GHL_TOKEN)." });
        const { operationId, params } = await req.json().catch(() => ({} as any));
        const op = OPS[String(operationId)];
        if (!op) return json({ ok: false, status: 400, message: "Operation not allowed: " + operationId });
        try {
          const out = await callGhl(op, params);
          if (op.write) console.log(`[grade] ${who} set ${params?.path?.assessmentId} to ${params?.body?.status} -> ${out.ok ? "saved" : "FAILED " + out.status + " " + out.message}`);
          return json(out);
        } catch (e: any) {
          return json({ ok: false, status: 502, message: "Couldn't reach GoHighLevel: " + (e?.message || e) });
        }
      }
      if (u.pathname === "/api/file" && req.method === "GET") {
        const src = u.searchParams.get("u") || "";
        if (!src.startsWith(FILE_PREFIX) || src.includes("..")) return json({ ok: false, message: "File not allowed" }, 400);
        const r = await fetch(src);
        if (!r.ok) return new Response("File fetch failed", { status: 502 });
        return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") || "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
      }
      return json({ ok: false, message: "Not found" }, 404);
    }
    if (u.pathname === "/" || u.pathname === "/index.html") {
      if (!who) return new Response(null, { status: 303, headers: { Location: "/login" } });
      return html(PAGE.replace("__DASH_USER_JSON__", JSON.stringify(who).replace(/</g, "\\u003c")));
    }
    return new Response("Not found", { status: 404 });
  },
});
console.log("BTW dashboard up");
