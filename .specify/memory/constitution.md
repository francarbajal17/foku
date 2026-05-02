<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned) → 1.0.0
Bump rationale: Initial formal versioning — MAJOR.MINOR.PATCH starts at 1.0.0 as
this is the first governed release of the constitution.

Modified sections: none (all existing content preserved as-is)
Added sections:
  - Section 14: Governance (amendment procedure, versioning policy, compliance)
  - Version/ratification footer (structured metadata replacing informal footer)
Removed sections: none

Templates reviewed:
  - .specify/templates/plan-template.md    ✅ aligned — Constitution Check placeholder
    is dynamically filled by /speckit-plan; no update required
  - .specify/templates/spec-template.md    ✅ aligned — user story / FR / SC structure
    is consistent with constitution constraints
  - .specify/templates/tasks-template.md   ✅ aligned — phase structure mirrors Section 13
    Development Phases; no update required
  - .specify/templates/constitution-template.md  ✅ reference only — not modified

Deferred TODOs: none
-->

# Foku — Constitution

> **The single source of truth for all development decisions.**
> Every line of code must trace back to this document.
> Changes to behavior or architecture must be made here first, never in code.

---

## 1. Vision

Foku is a personal focus tool that gives you a distraction-free window into two otherwise overwhelming platforms: WhatsApp and YouTube, complemented by a study timer and a persistent notes space.

The core philosophy is **ephemeral access + focused presence** — you enter, you get what you need, you stay focused. Foku never tries to replace WhatsApp or YouTube. It is a focused lens.

**The problem Foku solves:**
- You want to check if Juan sent you a message, but opening WhatsApp means seeing 30 other conversations and notifications you didn't want to deal with.
- You want to put on a lo-fi playlist to study, but opening YouTube means getting sucked into unrelated content.
- You have no single place to track your study time and keep your goals visible while you work.

---

## 2. User

- **Single user: the developer (Francisco).**
- No authentication system, no accounts, no multi-user support.
- Runs locally on Francisco's machine.
- Future public release is out of scope for v1.

---

## 3. Modules

Foku has exactly four modules:

| Module | Name | Purpose |
|---|---|---|
| 1 | **Chat** | Ephemeral WhatsApp access with real-time messages |
| 2 | **Focus** | Curated YouTube video discovery and playback |
| 3 | **Timer** | Study session stopwatch |
| 4 | **Notes** | Persistent objectives and notes |

The layout allows the user to stay in Foku during a YouTube session while accessing Timer or Notes simultaneously. The YouTube player persists across module navigation.

---

## 4. Module 1 — Chat (WhatsApp)

### 4.1 Concept

Chat is **ephemeral** — no messages are stored in any database. Every time you open a conversation, it fetches the last 100 messages fresh from WhatsApp. Once open, messages update in real-time. When you close it, nothing persists.

### 4.2 Entry Flow

1. User lands on the Chat section of Foku.
2. A single prominent **"Conversar"** button is visible.
3. Tapping it opens a **popup/overlay** with the configurable contact/group list.
4. User selects a contact or group → chat opens.

### 4.3 Configurable Contact List

- Accessible via **"Editar lista"** inside the Conversar popup.
- Shows all contacts and groups from the user's WhatsApp account (retrieved via Baileys).
- User toggles which ones appear in the Conversar popup.
- No limit on how many can be added.
- Configuration **persists** in `config.json` (the only data Foku stores, besides WhatsApp auth).

### 4.4 Chat View

When a contact or group is selected:

- Fetches the **last 100 messages** via `sock.fetchMessageHistory`.
- Messages displayed in **WhatsApp-style order**: oldest at top, newest at bottom.
- Visual distinction between sent (`fromMe`) and received messages.
- **Real-time updates**: a `messages.upsert` listener is active for that JID while the chat is open. New messages appear instantly. Listener is torn down on chat close.
- **Media support:**
  - Photos: displayed inline.
  - Audio messages: playable inline with a minimal audio player.
  - Other media (documents, video, stickers): placeholder with type label (v1).
- **Send:** user can type and send text messages from Foku.
- Loading state displayed while `fetchMessageHistory` resolves (~1–2 seconds).

### 4.5 Explicit Non-Goals (v1)

- ❌ No message persistence in any database.
- ❌ No background notification system.
- ❌ No pinned contacts on the main screen.
- ❌ No sending images or audio from Foku (text-only).
- ❌ No message status indicators (read receipts, delivered).

### 4.6 Future Considerations (not v1)

- Pinned contacts with persistent background listeners and unread badges.
- Send media (images, audio).

---

## 5. Module 2 — Focus (YouTube)

### 5.1 Concept

A curated video discovery interface. No YouTube feed, no recommendation algorithm. Three panels, always visible. Videos play embedded inside Foku — the user never leaves the app. The player persists while using other modules.

### 5.2 Three Panels

```
┌─────────────────┬─────────────────┬─────────────────┐
│   MY 5 VIDEOS   │  AI-SUGGESTED   │     SEARCH      │
│   (pinned)      │  (regenerable)  │   (on-demand)   │
│                 │                 │                  │
│  5 fixed videos │  5 suggested    │  5 search        │
│  chosen by user │  by Gemini AI   │  results        │
└─────────────────┴─────────────────┴─────────────────┘
```

### 5.3 Panel 1 — My 5 Videos (Pinned)

- User configures exactly 5 YouTube videos in Settings (paste URL or search within Foku).
- Always present. Never change unless the user edits them.
- Persisted in `config.json`.

### 5.4 Panel 2 — AI-Suggested (Regenerable)

- 5 videos generated based on the style of the user's 5 pinned videos.
- Flow:
  1. Backend reads pinned video metadata via YouTube API.
  2. Backend calls **Gemini 2.5 Flash-Lite** (free tier — 1,000 req/day, no credit card).
  3. Gemini returns 2–3 diverse, stylistically coherent YouTube search queries.
  4. Backend runs searches via YouTube Data API v3, deduplicates, returns 5 videos.
- **"Regenerar"** button: re-calls Gemini with a variation instruction → different videos, same style.
- Results **cached per session** — no re-call unless Regenerar is pressed.

### 5.5 Panel 3 — Search

- YouTube search bar inside Foku.
- Returns exactly **5 results** per query.
- Results shown in this panel only, no effect on other panels.
- New search replaces previous results.

### 5.6 Video Playback

- All videos play inside Foku via **YouTube IFrame API**.
- One video active at a time across all three panels.
- Embedded player **persists** while navigating to Timer or Notes — audio keeps playing.

### 5.7 Explicit Non-Goals (v1)

- ❌ No YouTube login or personal recommendations.
- ❌ No YouTube social features.
- ❌ No infinite scroll beyond the 3 panels.
- ❌ No watch history.

---

## 6. Module 3 — Timer

### 6.1 Concept

A minimal study session stopwatch. No Pomodoro, no intervals. Start when you begin, stop when you're done.

### 6.2 Behavior

- Single button: **Start / Pause / Resume**.
- Displays elapsed time as `HH:MM:SS`.
- **Reset** button to clear.
- State is **in-memory only** — does not persist across page reloads.
- Continues running while navigating between modules within Foku.

### 6.3 Explicit Non-Goals (v1)

- ❌ No session history or daily totals.
- ❌ No Pomodoro intervals or alerts.
- ❌ No persistence across reloads.

---

## 7. Module 4 — Notes

### 7.1 Concept

A persistent space to write study objectives and keep them visible while working. A single focused writing area, nothing more.

### 7.2 Behavior

- Single **freeform text area**.
- Content **auto-saves** to `config.json` with debounce on change.
- Always accessible. Content never lost between sessions.
- Plain text only (v1).

### 7.3 Explicit Non-Goals (v1)

- ❌ No multiple notes or history.
- ❌ No markdown or rich text.
- ❌ No tags, categories, or search.

---

## 8. Architecture

### 8.1 Overview

```
┌──────────────────────────────────────────────┐
│              Frontend (React)                │
│          Vite + TypeScript                   │
│   Chat | Focus | Timer | Notes               │
└─────────────────┬────────────────────────────┘
                  │ HTTP REST + WebSocket
┌─────────────────▼────────────────────────────┐
│            Backend (Node.js)                 │
│         Express + TypeScript                 │
├──────────────────────────────────────────────┤
│  Baileys        │ YouTube API v3 │ Gemini API │
│  (WhatsApp WS)  │  (search)      │  (free)   │
└──────────────────────────────────────────────┘
                  │
         ┌────────▼──────────┐
         │   config.json     │  contacts list
         │   wa_auth/        │  pinned videos
         └───────────────────┘  notes content
                                WA auth state
```

### 8.2 Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| WhatsApp integration | `@whiskeysockets/baileys` | Only viable option for personal WA, WebSocket-based, no browser needed |
| Real-time chat | `messages.upsert` listener per open JID via WebSocket | Lightweight, torn down on close |
| YouTube integration | YouTube Data API v3 | Official, free tier sufficient |
| AI for suggestions | Gemini 2.5 Flash-Lite (free tier) | 1,000 req/day free, no credit card, sufficient for personal use |
| No database | ✅ intentional | Ephemeral philosophy, minimal complexity |
| Persistence | Single `config.json` | Contacts, pinned videos, notes |
| WA auth persistence | `useMultiFileAuthState` → `wa_auth/` | Avoids QR scan on every restart |
| Video playback | YouTube IFrame API | Official, embedded, no scraping |
| Transport | HTTP for fetches, WebSocket for real-time chat | Clean separation |

### 8.3 Data Flow — Chat

```
1. User taps "Conversar" → popup shown
2. Selects contact → POST /api/chat/open { jid }
3. Backend: sock.fetchMessageHistory(100, ...)
4. messaging-history.set event fires → messages sent to frontend
5. Backend opens messages.upsert listener for this jid
6. New messages → pushed via WebSocket to frontend
7. User replies → POST /api/chat/send { jid, text }
8. User closes chat → POST /api/chat/close { jid }
9. Backend tears down jid listener → nothing stored
```

### 8.4 Data Flow — Focus AI Suggestions

```
1. GET /api/focus/suggestions
2. Backend reads pinned video IDs from config.json
3. Fetches video metadata via YouTube API
4. Calls Gemini 2.5 Flash-Lite with metadata
5. Gemini returns 2-3 search queries
6. YouTube searches executed, deduplicated → 5 videos returned
7. Frontend renders Panel 2
8. "Regenerar" → repeat from step 4 with variation instruction
```

---

## 9. UI/UX Principles

- **Desktop-first, responsive for mobile.**
- **Dark theme** — focus tools are used in low-light environments.
- Four modules always reachable without losing state (YouTube keeps playing, timer keeps running).
- Animations are subtle — calm, not stimulating.
- Loading states present for all async operations.
- The word "Foku" appears once.
- Frontend must follow the frontend-design skill guidelines: distinctive typography, intentional color palette, subtle motion, unexpected spatial composition. Never generic AI aesthetics.
- Before writing any frontend code, Claude Code must read .claude/skills/frontend-design/SKILL.md

---

## 10. Constraints

- Baileys is not affiliated with WhatsApp/Meta. **Personal use only.** Never deploy publicly without legal review.
- YouTube Data API v3: 10,000 units/day free. Each search = 100 units → ~100 searches/day max. Sufficient.
- Gemini free tier: 1,000 req/day (Flash-Lite). Sufficient for personal use. Cache results per session.

---

## 11. What Foku Is Not

- Not a WhatsApp replacement or full client.
- Not a YouTube platform.
- Not a productivity suite with tasks, habits, or Pomodoro.
- Not a multi-user tool.
- Not a mobile app (responsive web app).
- Not a public product (v1).

---

## 12. Glossary

| Term | Definition |
|---|---|
| **Ephemeral chat** | A chat session fetched fresh on open, discarded on close — never stored |
| **Conversar** | Button that opens the contact/group selection popup |
| **Configurable list** | The subset of WhatsApp contacts/groups shown in the Conversar popup |
| **JID** | WhatsApp internal identifier (e.g., `5491112345678@s.whatsapp.net`) |
| **Pinned videos** | The 5 YouTube videos the user permanently configures in Focus |
| **Regenerar** | Button triggering new Gemini-assisted search for 5 different but stylistically similar videos |
| **fromMe** | Baileys field: true if the message was sent by the user |
| **config.json** | Single local file storing contacts list, pinned videos, and notes |
| **wa_auth/** | Folder where Baileys stores WhatsApp authentication credentials |

---

## 13. Development Phases

### Phase 1 — Foundation
- Monorepo scaffold (React + Vite + Express + TypeScript)
- Baileys connection + QR auth flow
- WhatsApp contact and group list retrieval
- Configurable contact list (UI + config.json)
- Basic four-module navigation layout

### Phase 2 — Chat Module
- Conversar popup with configurable list
- fetchMessageHistory (100 messages)
- Chat view: text messages, WhatsApp-style layout
- Real-time updates via WebSocket + `messages.upsert`
- Photo display inline
- Audio playback inline
- Send text message

### Phase 3 — Focus Module
- Pinned videos Settings
- YouTube Data API v3 integration
- Gemini 2.5 Flash-Lite integration
- Three-panel layout
- YouTube IFrame embedded player
- Search panel
- Regenerar button
- Persistent player across module navigation

### Phase 4 — Timer + Notes
- Study stopwatch (Start / Pause / Reset)
- Notes text area with auto-save to config.json

### Phase 5 — Polish
- Responsive layout (mobile)
- Error handling and edge cases
- UI/UX refinement
- Performance optimization

---

## 14. Governance

### 14.1 Authority

This constitution is the single source of truth for all development decisions on Foku.
Francisco Carbajal is the sole author and decision-maker. No committee or review process
is required — but all deviations from this document MUST be reflected here before
they are reflected in code.

### 14.2 Amendment Procedure

1. Identify the section(s) that need to change.
2. Update this file with the new or revised content.
3. Increment `CONSTITUTION_VERSION` according to the versioning policy below.
4. Update `LAST_AMENDED_DATE` to the amendment date (ISO format YYYY-MM-DD).
5. Commit the constitution change before (or in the same commit as) the code change it governs.

**MUST NOT**: amend the constitution retroactively to justify code already written.

### 14.3 Versioning Policy

- **MAJOR** (`X.0.0`): A principle is removed, a module is removed, or a non-negotiable
  constraint is redefined (e.g., allowing a database, enabling multi-user support).
- **MINOR** (`1.X.0`): A new section is added, an existing section is materially expanded,
  or new constraints / modules are introduced.
- **PATCH** (`1.0.X`): Clarifications, wording fixes, glossary additions, or formatting
  changes with no semantic impact.

### 14.4 Non-Negotiable Rules

The following constraints are absolute. Any feature proposal that violates them
requires a MAJOR version amendment before implementation may proceed:

- No database — persistence is `config.json` only.
- No message storage — chat data MUST NOT be written to disk.
- No multi-user support — single local user only.
- No public deployment of Baileys-based functionality without legal review.
- Exactly four modules — no new modules without a constitution amendment.

### 14.5 Compliance Review

Before opening a feature spec (`/speckit-specify`), verify the proposal does not
violate Section 10 (Constraints), Section 11 (What Foku Is Not), or Section 14.4
(Non-Negotiable Rules). Document any required amendments first.

---

**Version**: 1.0.0 | **Ratified**: 2026-05-02 | **Last Amended**: 2026-05-02
*Author: Francisco Carbajal*
