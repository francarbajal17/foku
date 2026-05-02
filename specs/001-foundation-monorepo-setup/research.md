# Research: Phase 1 — Foundation

**Feature**: 001-foundation-monorepo-setup
**Date**: 2026-05-02

---

## 1. Monorepo Setup

**Decision**: npm workspaces with three packages: `shared`, `frontend`, `backend`.
Root-level `package.json` is the workspace host. A root `concurrently` script starts both
dev servers with a single command.

**`shared/` rationale**: Types that appear in HTTP response bodies or WebSocket messages
must be identical on both sides. A `@foku/shared` types-only package (no runtime deps,
compiles to `.d.ts`) is the standard solution. Both `frontend` and `backend` declare it
as `"@foku/shared": "*"` — npm workspaces resolves this to the local package automatically.
If a shared type changes (e.g., `Contact` gains a `phoneNumber` field), TypeScript fails
to compile on both sides simultaneously, catching the mismatch before runtime.

**Types that go in `shared/`** (cross the HTTP/WS boundary):
- `Contact`, `ContactConfig` — in API responses and request bodies
- `AppConfig` — returned by `GET /api/config`
- `ConnectionStatus`, `WSMessage` — WebSocket protocol

**Types that stay local**:
- Backend: Baileys internal types, Express request/response extensions, service internals
- Frontend: React component props, UI state, hook return types

**No build orchestration needed** (Turborepo, nx) — the packages build and run independently
in development; `shared/` has no build step of its own (TypeScript resolves via `paths`).

**Alternatives considered**:
- pnpm workspaces — functionally identical; npm chosen to avoid extra toolchain dependency.
- Turborepo — overkill for 3 small packages with no complex dependency graph.
- Duplicating types in both packages — breaks the single-source-of-truth principle and
  creates silent drift between frontend and backend contracts.

---

## 2. Baileys QR Auth & Session Persistence

**Decision**: Use `makeWASocket` + `useMultiFileAuthState('./wa_auth')` from
`@whiskeysockets/baileys`. Listen to `connection.update` event for QR and connected state.

**Key flow**:
1. On startup: load state from `wa_auth/` via `useMultiFileAuthState`.
2. Call `makeWASocket({ auth: state })`.
3. `connection.update` fires with `{ qr }` → relay QR string to frontend via WebSocket.
4. `connection.update` fires with `{ connection: 'open' }` → session established.
5. `saveCreds` event → persist updated credentials to `wa_auth/` immediately.

**Session expiry**: If `lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut`,
delete `wa_auth/` and restart the socket to get a fresh QR. For all other disconnects
(network, timeout), reconnect with existing credentials.

**QR expiry**: Baileys fires multiple `connection.update` events with a new `qr` each
time the QR expires (~30s window). Each new `qr` payload must be forwarded to frontend;
the frontend replaces the previous QR display.

**Alternatives considered**:
- `useSingleFileAuthState` — deprecated in current Baileys versions.
- Storing session in config.json — wrong separation; Baileys manages its own auth format.

---

## 3. Contact & Group List Retrieval

**Decision**: Use `makeInMemoryStore` bound to the socket. After `connection: 'open'`,
read `store.contacts` for individual contacts. Call `sock.groupFetchAllParticipating()`
for group chats. Merge and deduplicate by JID.

**Key nuance**: WhatsApp pushes contact data via `contacts.upsert` events after connection.
The store is not instantly populated — it fills over ~1–3 seconds. The backend MUST wait
for the initial `contacts.upsert` burst to settle before responding to `GET /api/contacts`.
A simple 2-second delay after `connection: 'open'` is acceptable for Phase 1; a more
precise approach listens for the first `contacts.upsert` event.

**Contact name resolution**: Baileys contact objects may have `name` (from phone book),
`notify` (WhatsApp push name), or neither. Display priority: `name` > `notify` > JID.

**Alternatives considered**:
- `sock.onWhatsApp([number])` — resolves individual numbers, not a bulk list.
- Manual phone book import — not applicable (personal tool, WA account is the source).

---

## 4. React Module State Preservation Across Navigation

**Decision**: Render all four module components at all times. Hide inactive modules with
`display: none` via CSS. Do NOT unmount inactive components.

**Rationale**: Unmounting would destroy timer state and Notes text. `display: none`
keeps components mounted and running (timer increments, Notes content survives) while
removing them from the visible layout. This is the standard pattern for persistent-state
tab UIs.

**Implementation**: A root `<Shell>` component renders all four children; each is wrapped
in a `<div style={{ display: activeModule === 'chat' ? 'block' : 'none' }}>`.

**Alternatives considered**:
- `visibility: hidden` — keeps layout space; wastes screen real estate.
- `React.memo` + state lifting — adds complexity with no benefit for a single-user app.
- Browser `History` / routing — adds URL-based routing; unnecessary for this app.

---

## 5. QR Code Relay: Backend → Frontend

**Decision**: Use the `ws` npm package for a lightweight WebSocket server attached to
the Express HTTP server. The backend pushes JSON messages; the frontend connects once on
mount and reacts to message types.

**Message protocol**:
```json
{ "type": "connection_status", "status": "connecting" }
{ "type": "connection_status", "status": "qr_pending", "qr": "<qr-string>" }
{ "type": "connection_status", "status": "connected" }
{ "type": "connection_status", "status": "disconnected" }
```

The `qr` field is a raw QR string that the frontend renders using the `qrcode` npm
package (converts to a canvas/SVG QR image).

**Alternatives considered**:
- socket.io — adds abstraction (rooms, namespaces) not needed for a single-client app.
- Server-Sent Events (SSE) — one-directional HTTP stream; fine for this phase but limits
  future bidirectional use (e.g., sending messages); WebSocket is a better foundation.
- Polling `GET /api/status` — introduces latency for QR display; unacceptable for UX.

---

## 6. config.json Read/Write Strategy

**Decision**: Read on startup. Write synchronously (or with a short debounce for
Notes auto-save) using `fs.writeFileSync` with a temp-file + rename pattern to prevent
data corruption on crash mid-write.

**Schema established in Phase 1**:
```json
{
  "contacts": [
    { "jid": "...", "enabled": true }
  ],
  "notes": "",
  "pinnedVideos": []
}
```

`notes` and `pinnedVideos` are initialized empty and used in later phases.

**Alternatives considered**:
- SQLite — violates the "no database" non-negotiable rule in the constitution.
- localStorage (frontend) — config must live on the backend where Baileys can read it.

---

## 7. TypeScript Configuration

**Decision**: TypeScript 5.x with `strict: true`, targeting `ESNext` modules.
- Backend: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, Node 20.
- Frontend: handled by Vite's bundler (no separate tsc compilation step for dev).
- Root `tsconfig.base.json` with shared compiler options; each package extends it.

**Node version**: Node 20 LTS.

**Alternatives considered**:
- `ts-node` for backend dev — replaced by `tsx` (faster, no config required).
- CommonJS for backend — ESM preferred for consistency with frontend conventions.
