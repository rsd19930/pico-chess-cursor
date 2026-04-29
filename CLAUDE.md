# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pico Chess is a 6x6 Crazyhouse-style chess variant with real-time multiplayer over Socket.IO and a bot fallback (`Kodiac`) when no human opponent is found within a configurable timeout. See `game-rules.md` for the authoritative game rules and `feature-requirements.md` for matchmaking requirements — both should be treated as the spec when changing gameplay or matchmaking logic.

## Repository layout

This is an npm monorepo with two workspaces installed independently:

- `server/` — Node + Express + Socket.IO + TypeScript (CommonJS, `ts-node-dev` for dev). Holds all game logic.
  - `src/index.ts` — HTTP/Socket.IO bootstrap, wires `matchmaking` and `gameService`, also serves the built client from `client/dist` in production.
  - `src/matchmaking/service.ts` — waiting queue, 60s bot-join timer, socket event handlers (`request_match`, `move`, `resign`, `disconnect`).
  - `src/pico/` — game domain: `types.ts`, `rules.ts` (move generation, legality, check/mate, drops, promotion), `gameService.ts` (game lifecycle, per-turn 30s clock), `simpleBot.ts` (Kodiac, 1–5s random move delay).
- `client/` — React 18 + Vite + TypeScript + Zustand + `socket.io-client`.
  - `src/main.tsx`, `src/ui/App.tsx`, `src/ui/Game.tsx`, `src/ui/components/`, `src/ui/confetti.ts`, `src/ui/styles.css`.
- Root `package.json` orchestrates both via npm `--prefix` scripts; there are no workspace declarations.

## Commands

Run all commands from the repo root unless noted.

- Install everything: `npm run install-all` (also runs as `postinstall`).
- Dev (both servers, hot reload): `npm run dev` — client at http://localhost:5173, server at http://localhost:4000 (`/health`). The client dev script injects `VITE_SERVER_URL=http://localhost:4000`.
- Dev a single side: `npm run dev:server` or `npm run dev:client`.
- Production build: `npm run build` (builds client with Vite, then compiles server with `tsc`).
- Production start: `npm run start` — runs `server/dist/index.js` with `NODE_ENV=production`; the server then statically serves `client/dist` and Socket.IO from the same origin.
- There is no test runner or lint script wired up at the root. The client has `eslint` as a devDep but no `lint` script; do not invent one.

## Environment variables

- `PORT` (server, default 4000)
- `CLIENT_ORIGIN` (server CORS, default `*`/permissive)
- `BOT_JOIN_TIMEOUT_MS` (matchmaking bot fallback, default 60000)
- `VITE_SERVER_URL` (client; set automatically in `npm run dev:client`)

## Architecture notes

- Communication is entirely Socket.IO events; there is no REST API beyond `/health`. Event contract lives between `server/src/index.ts` and the matchmaking/game services — keep client and server payload shapes in sync when changing them.
- Game state is in-memory only (no DB). A single Node process owns the queue, all rooms, and all clocks; horizontal scaling is not supported as written.
- The 6x6 board, single-piece-per-type starting setup, no-castling/no-en-passant, two-square-pawn-disabled rules, pawn-drop rank restriction, stalemate-as-loss, and turn-timeout-while-in-check loss conditions are all variant-specific — verify changes against `game-rules.md` rather than assuming standard chess.
- Per-turn clock is 30s and resets each turn (not a total game clock); timeout skips the turn unless the player is in check (then they lose).
- Deployment target is Render via `render.yaml` (Blueprint); `Procfile` mirrors the start command for other PaaS hosts.
