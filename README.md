Pico Chess

A 6x6 Crazyhouse-style chess, real-time multiplayer with a bot fallback.

Local development

- Install: `npm run install-all`
- Run dev: `npm run dev`
  - Client: http://localhost:5173
  - Server: http://localhost:4000/health

Production build (single server)

- Build: `npm run build`
- Start: `npm run start`
- Open: http://localhost:4000

Deploy on Render.com

- Commit and push your repository.
- Add `render.yaml` in the repo (Infrastructure as Code).
- In Render, create New ➜ Blueprint (use your repo). It auto-detects `render.yaml`.
- The service runs:
  - Build Command: `npm run build`
  - Start Command: `npm run start`
- The URL will serve the client and Socket.IO from the same origin.

Environment variables

- `NODE_ENV=production`
- `BOT_JOIN_TIMEOUT_MS=60000` (default)
- `CLIENT_ORIGIN=*` (server CORS; safe since same-origin in prod)

Notes

- The server serves the built client from `client/dist` when `npm run start` is used.
- Bot uses a 1–5s random delay per move.
- Each turn has 30 seconds; clocks reset each turn.
- Winner gets confetti locally.


