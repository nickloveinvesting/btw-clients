# BTW Homework Dashboard

Built to Win homework dashboard, hosted on Railway and connected to GoHighLevel with one Private Integration key.

- `index.html`: the dashboard page (same code as the claude.ai artifact, plus a small shim that routes GoHighLevel calls to this server).
- `server.ts`: Bun server. Email + password login, signed session cookie, an allowlist of 11 GoHighLevel operations (Built to Win course, won BTW opportunities, Jay's two calendars, the Mastermind deal form), and a file proxy limited to the Unshakable course storage.

Railway variables:
- `GHL_TOKEN`: Private Integration token for the Unshakable sub-account (scopes: courses.readonly, courses.write, opportunities.readonly, calendars/events.readonly, surveys.readonly).
- `SESSION_SECRET`: random string that signs login cookies. Changing it signs everyone out.
- `DASH_ACCOUNTS`: `email:Name;email:Name`. Add an email to give someone access; remove it to sign them out.
- `DASH_PASSWORD`: the shared sign-in password.
