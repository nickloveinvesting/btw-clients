# BTW Homework Dashboard

Built to Win homework dashboard, hosted on Railway and connected to GoHighLevel with one Private Integration key.

- `index.html`: the dashboard page (same code as the claude.ai artifact, plus a small shim that routes GoHighLevel calls to this server).
- `server.ts`: Bun server. Passcode login, signed session cookie, an allowlist of 9 GoHighLevel operations for the Built to Win course, and a file proxy limited to the Unshakable course storage.

Railway variables:
- `GHL_TOKEN`: Private Integration token for the Unshakable sub-account (scopes: courses.readonly, courses.write, opportunities.readonly).
- `SESSION_SECRET`: random string that signs login cookies. Changing it signs everyone out.
- `DASH_USERS`: `Name:passcode;Name:passcode`. Remove a name to revoke that person.
