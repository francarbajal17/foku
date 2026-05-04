# Implementation Plan: Phase 2 — Chat Module

**Branch**: `002-chat-module` | **Date**: 2026-05-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-chat-module/spec.md`

---

## Summary

Implement the Chat module's full conversation flow: a "Conversar" popup for selecting enabled contacts, an ephemeral conversation view with 100-message history, real-time incoming messages, text message sending, and inline photo/audio display. No message data is written to disk at any time. This phase extends the Phase 1 Baileys connection and WebSocket infrastructure with three new HTTP endpoints, a dedicated chat service module, two new shared types, and four new/updated frontend components.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**:
- Frontend: React 18, Vite 5 (existing)
- Backend: Express 5, `@whiskeysockets/baileys` (existing), `ws` (existing)
- Shared (`@foku/shared`): `ChatMessage` type (new); `WSMessage` extended with `chat_history` + `chat_message` variants
**Storage**: No new storage. `config.json` (contacts, Phase 1) remains the only file. `wa_auth/` (Baileys auth, Phase 1). No message data written to disk.
**Testing**: Not required for Phase 2 (manually verified via quickstart.md)
**Target Platform**: macOS local dev machine, Chromium-based browser
**Project Type**: Fullstack web application (local, single-user)
**Performance Goals**: Message history visible <3s after contact selection; real-time messages appear <2s; sent messages appear in conversation <2s
**Constraints**: No disk writes for messages (FR-017); single active conversation at a time; 100-message fetch limit (no pagination)
**Scale/Scope**: Single user (Francisco), local machine, no concurrent sessions

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Check | Status |
|------|-------|--------|
| No database — persistence is `config.json` only | Phase 2 adds no storage; messages are in-memory only, discarded when conversation closes | ✅ Pass |
| No message storage | Chat messages MUST NOT be written to disk at any time (FR-017); media delivered as in-memory base64, never saved | ✅ Pass |
| No multi-user support | Single-user local app, no auth system | ✅ Pass |
| No public deployment of Baileys | Runs on localhost only; no ports exposed externally | ✅ Pass |
| Exactly four modules | Chat is Module 1 per constitution §3; no new modules added | ✅ Pass |

**Post-design re-check**: All gates still pass. The chat service and new routes introduce no database, no message persistence, and no external deployment surface. Media transmitted as base64 data URLs over WebSocket and discarded on conversation close.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-chat-module/
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
shared/
└── src/
    ├── types/
    │   ├── chat.ts           ← NEW: ChatMessage interface
    │   └── connection.ts     ← UPDATED: chat_history + chat_message WSMessage variants
    └── index.ts              ← UPDATED: re-export ChatMessage

backend/
└── src/
    ├── chat/
    │   └── chatService.ts    ← NEW: active conversation state, message fetch,
    │                            listener setup/teardown, media download
    ├── routes/
    │   └── chatRoutes.ts     ← NEW: POST /api/chat/open, /send, /close
    ├── whatsapp/
    │   └── whatsappService.ts ← UPDATED: export getSock(); call
    │                             chatService.onSocketReady(sock) on connection open
    └── index.ts              ← UPDATED: mount chatRoutes at /api

frontend/
└── src/
    ├── components/
    │   └── Chat/
    │       ├── Chat.tsx              ← UPDATED: integrate ConversarPopup +
    │       │                           ConversationView; manage active JID state
    │       ├── ConversarPopup.tsx    ← NEW: overlay with enabled contact list +
    │       │                           "Editar lista" second overlay
    │       ├── ConversationView.tsx  ← NEW: message list, scroll-lock, new-message
    │       │                           indicator, text input, disconnect banner
    │       └── MessageBubble.tsx     ← NEW: text / inline image / inline audio /
    │                                   media placeholder
    └── services/
        ├── ws.ts                     ← UPDATED: handle chat_history + chat_message;
        │                               export useChatHistory + useChatMessage hooks
        └── chat.ts                   ← NEW: fetch wrappers for POST /api/chat/*
```

**Structure Decision**: Monorepo (existing). Phase 2 extends the established three-package layout. Backend chat logic is isolated in `src/chat/` to keep it separate from the WhatsApp connection management in `src/whatsapp/`. All four new frontend components live inside `components/Chat/` alongside Phase 1's `ContactList.tsx`, keeping the Chat module self-contained.

---

## Complexity Tracking

> No constitution violations. Section left blank intentionally.
