# Research: Phase 2 — Chat Module

**Feature**: 002-chat-module
**Date**: 2026-05-04
**Input**: Unknowns from Technical Context + dependencies from spec.md

---

## Decision 1: Message History Fetch API

**Question**: Which Baileys API to use for fetching the last 100 messages of a conversation?

**Decision**: `sock.fetchMessageHistory(count, cursor, mostRecentTimestamp)` — the method referenced in the constitution's data flow (§8.3). When called, it issues a WA proto request that the server answers by firing `messaging-history.set` on `sock.ev`. The cursor for "start from most recent" is `undefined` (no explicit cursor needed for the first/only page). `mostRecentTimestamp` is `Date.now()`.

`chatService.ts` registers its own `messaging-history.set` listener (separate from Phase 1's contact-sync handler in `whatsappService.ts`). It filters the event's `messages` array for those belonging to `activeJid` and broadcasts a `chat_history` WS event to the frontend.

**Rationale**: Matches the exact API documented in the constitution. Avoids adding a Baileys in-memory store, which would require changes to Phase 1's socket initialization.

**Alternatives considered**:
- `makeInMemoryStore()` (Baileys built-in store): Would automatically cache all messages as they arrive, making history queries trivial. Rejected because it requires changes to `whatsappService.ts`'s socket setup (Phase 1 concern), and the store only holds messages received since app start — it cannot fetch historical messages for fresh sessions.
- Direct Baileys store query (`sock.loadMessages`): Not available as a socket method in `@whiskeysockets/baileys` v6.x; the public API for server-side history fetch is `fetchMessageHistory`.

---

## Decision 2: Real-Time Message Listener Strategy

**Question**: How to wire `messages.upsert` for the active conversation, and how to survive socket reconnects?

**Decision**: `chatService.onSocketReady(sock)` is called by `whatsappService.ts` every time `connection === 'open'` fires (including reconnects). On each call, `chatService.ts` re-registers `messages.upsert` on the new socket. The handler:
1. Ignores events where `type !== 'notify'` (those are history appends, not new messages).
2. Filters messages whose `key.remoteJid` normalizes to `activeJid`.
3. For each matching message, downloads media (if applicable), constructs a `ChatMessage`, and broadcasts `{ type: 'chat_message', jid: activeJid, message }` via WS.

**Rationale**: Phase 1 already calls `onSocketReady`-style logic (event registration happens inside `connect()`). Extending this pattern is the minimal-change approach. Re-registering on reconnect ensures listeners never become orphaned on a stale socket object.

**Alternatives considered**:
- Register listener once at app start: Fails on reconnect — the new `sock` object from Phase 1's auto-reconnect loop is a different instance; old `ev.on` registrations do not carry over.
- Use a global `messages.upsert` event bus (EventEmitter): Unnecessary abstraction for a single-user, single-conversation app.

---

## Decision 3: Socket Access Pattern

**Question**: How does `chatService.ts` access the Baileys socket without circular dependencies?

**Decision**: `whatsappService.ts` exports `getSock(): WASocket | null` and calls `chatService.onSocketReady(sock)` inside `connect()` after `connection === 'open'`. `chatService.ts` imports nothing from `whatsappService.ts` for socket operations — it receives the socket via `onSocketReady` and uses it directly for `fetchMessageHistory` and `sendMessage` calls.

**Rationale**: Dependency injection avoids circular imports. `chatService.ts` → imports from `whatsappService.ts` would create `whatsappService ↔ chatService` circular dependency. Passing the socket as a parameter breaks the cycle cleanly.

**Alternatives considered**:
- Keep all Baileys operations in `whatsappService.ts` (fat service): Would make `whatsappService.ts` responsible for both connection management AND conversation management — violates single responsibility and makes Phase 1's file much larger.
- Export `sock` as a module-level `let` from `whatsappService.ts`: Works but couples consumers to the module's internal state; getter function is safer.

---

## Decision 4: Media Download and Delivery

**Question**: How to deliver photo and audio message content to the frontend?

**Decision**: On each message, check the content type. For `imageMessage` and `audioMessage`, call Baileys `downloadMediaMessage(msg, 'buffer', {})` to get a `Buffer`, convert to a base64 string, and include as a data URL (`data:<mimeType>;base64,<base64>`). The MIME type is extracted from the Baileys message descriptor (`imageMessage.mimetype`, `audioMessage.mimetype`; defaults to `image/jpeg` and `audio/ogg` respectively). The data URL is included in `ChatMessage.mediaData` and sent via WS as part of `chat_history` or `chat_message`.

For all other media types (video, document, sticker, contacts, location, etc.), no download is attempted. The content type maps to a human-readable label (`mediaLabel`) — e.g., `"Video"`, `"Document"`, `"Sticker"`, `"Location"`, `"Contact"`.

**Rationale**: Data URLs require no additional HTTP endpoint and no disk writes. For a local app with 100 messages and typical WhatsApp image/audio sizes, the total WS payload is manageable (typical WhatsApp compressed image: 50–200 KB; audio voice message: 10–100 KB). Media is held in-memory only and discarded when the conversation closes.

**Alternatives considered**:
- Serve media via a separate `GET /api/chat/media/:msgId` HTTP endpoint: Would require caching the raw message buffers in memory between the open and a potential media fetch, adding state management complexity. Benefit would be smaller initial WS payload, but the added complexity is not worth it for a personal app.
- Send media as raw binary over WebSocket (binary frames): More efficient but requires custom binary protocol framing on both ends. JSON with base64 is simpler and sufficient.

---

## Decision 5: WebSocket Protocol Extension

**Question**: How to extend the WS protocol for chat-specific server-push events without breaking Phase 1?

**Decision**: Add two new variants to `WSMessage` in `shared/src/types/connection.ts`:
- `{ type: 'chat_history'; jid: string; messages: ChatMessage[] }` — sent once after `/api/chat/open` resolves history
- `{ type: 'chat_message'; jid: string; message: ChatMessage }` — sent for each new incoming message

No client→server WS messages are added. Chat commands (open, send, close) remain HTTP POST to maintain clear request-response semantics. WS is server-push only (consistent with Phase 1 design).

The frontend `ws.ts` adds two new listener sets (`chatHistoryListeners`, `chatMessageListeners`) and two new hooks:
- `useChatHistory(callback: (jid: string, msgs: ChatMessage[]) => void): void`
- `useChatMessage(callback: (jid: string, msg: ChatMessage) => void): void`

Both hooks follow the existing pattern established for `useContactsUpdated`.

**Rationale**: Extending the discriminated union is backward-compatible — existing handlers for `connection_status` and `contacts_updated` are unaffected. Keeping commands as HTTP maintains predictable error handling (HTTP status codes, request-response pairing).

**Alternatives considered**:
- Send chat commands over WS (bi-directional WS protocol): Would require the backend to maintain per-request correlation IDs to route responses back to the correct client. HTTP already solves this problem. Not justified for a single-client app.
- Separate WS connection for chat: Over-engineered for a local single-user app.
