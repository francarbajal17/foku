# Implementation Plan: Phase 1 — Foundation

**Branch**: `001-foundation-monorepo-setup` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-foundation-monorepo-setup/spec.md`

---

## Summary

Establish the complete project scaffold for Foku: an npm-workspace monorepo with a React
+ Vite frontend and an Express backend, both in TypeScript. Wire up Baileys for WhatsApp
authentication via QR code with persistent session storage. Build the four-module navigation
shell that preserves in-section state across tab switches. Implement contact list retrieval
from WhatsApp and a configurable contact toggle UI backed by `config.json`.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**:
- Frontend: React 18, Vite 5, `qrcode` (QR rendering)
- Backend: Express 5, `@whiskeysockets/baileys`, `ws` (WebSocket server), `tsx` (dev runner)
- Shared (`@foku/shared`): TypeScript types that cross the HTTP/WS boundary — consumed by both frontend and backend
- Root: `concurrently` (dev script), TypeScript 5

**Storage**: `config.json` (contacts, notes stub, pinnedVideos stub) + `wa_auth/` (Baileys auth, opaque)
**Testing**: Not required for Phase 1 (scaffold phase; verified manually via quickstart.md)
**Target Platform**: macOS local dev machine, Chromium-based browser
**Project Type**: Fullstack web application (local, single-user)
**Performance Goals**: App loads in <10s; QR code displayed <10s; contact toggle persisted <1s
**Constraints**: Personal use only; no public deployment; no database; single `config.json`
**Scale/Scope**: Single user (Francisco), local machine, no concurrent sessions

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Check | Status |
|------|-------|--------|
| No database — persistence is `config.json` only | Phase 1 uses only `config.json` and `wa_auth/` | ✅ Pass |
| No message storage | No chat messages are written in Phase 1 | ✅ Pass |
| No multi-user support | Single-user local app, no auth system | ✅ Pass |
| No public deployment of Baileys | Runs on localhost only; no server/ports exposed externally | ✅ Pass |
| Exactly four modules | Navigation shell has exactly Chat, Focus, Timer, Notes | ✅ Pass |

**Post-design re-check**: All gates still pass. The WebSocket server and `config.json` service
introduce no database, no user accounts, and no external deployment surface.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-monorepo-setup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                    ← npm workspace root (workspaces: ["shared", "frontend", "backend"])
tsconfig.base.json              ← shared TS compiler options

shared/                         ← @foku/shared — types that cross the HTTP/WS boundary
├── src/
│   └── types/
│       ├── contact.ts         ← Contact, ContactConfig
│       ├── config.ts          ← AppConfig
│       └── connection.ts      ← ConnectionStatus, WSMessage (discriminated union:
│                                  connection_status | contacts_updated)
├── package.json               ← name: "@foku/shared", no runtime deps
└── tsconfig.json

backend/
├── src/
│   ├── config/
│   │   ├── configService.ts   ← config.json read/write (atomic); uses AppConfig, ContactConfig
│   │   └── contactsCache.ts   ← in-memory + disk contact cache (contacts_cache.json);
│   │                             guards against overwriting real names with phone numbers
│   ├── whatsapp/
│   │   └── whatsappService.ts ← Baileys socket, QR auth, contact retrieval; uses Contact.
│   │                             Name resolution priority: name > notify > verifiedName >
│   │                             chat.name (IConversation.name) > phone number.
│   │                             Broadcasts contacts_updated WS event on every cache change.
│   ├── ws/
│   │   └── wsServer.ts        ← WebSocket server; uses WSMessage
│   └── routes/
│       ├── statusRoutes.ts    ← GET /api/status; uses ConnectionStatus
│       ├── contactRoutes.ts   ← GET /api/contacts, PATCH /api/config/contacts; uses Contact, ContactConfig
│       └── configRoutes.ts    ← GET /api/config; uses AppConfig
├── index.ts                   ← Express app entry point
├── package.json               ← "@foku/shared": "*" in dependencies
└── tsconfig.json

frontend/
├── src/
│   ├── components/
│   │   ├── Shell/
│   │   │   └── Shell.tsx      ← Navigation bar + module visibility (display:none)
│   │   ├── Chat/
│   │   │   └── Chat.tsx       ← Chat module; re-fetches contacts on contacts_updated WS event
│   │   ├── Focus/
│   │   │   └── Focus.tsx      ← Focus module placeholder
│   │   ├── Timer/
│   │   │   └── Timer.tsx      ← Timer module placeholder
│   │   └── Notes/
│   │       └── Notes.tsx      ← Notes module placeholder
│   ├── services/
│   │   ├── api.ts             ← HTTP client; uses Contact, ContactConfig, AppConfig
│   │   └── ws.ts              ← WebSocket client; exports useConnectionStatus and
│   │                             useContactsUpdated hooks; handles both WS message types
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json               ← "@foku/shared": "*" in dependencies
├── tsconfig.json
└── vite.config.ts             ← proxy: /api/* → localhost:3001, /ws → ws://localhost:3001

config.json                    ← auto-created on first backend run
wa_auth/                       ← auto-created by Baileys on first QR scan
```

**Structure Decision**: Three-package monorepo. `shared/` is a types-only package with no
runtime dependencies — it compiles to `.d.ts` files consumed by both `backend` and `frontend`.
Any type that appears in an HTTP response body or WebSocket message lives in `shared/`; all
other types stay local to their respective package.

---

## Complexity Tracking

> No constitution violations. Section left blank intentionally.
