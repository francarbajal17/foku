# Tasks: Phase 2 — Chat Module

**Input**: Design documents from `specs/002-chat-module/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · data-model.md ✅ · contracts/api.md ✅ · research.md ✅
**Tests**: Not included (not requested for Phase 2)

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[USn]**: Which user story this task belongs to
- No story label: Setup, Foundational, or Polish phase task

---

## Phase 1: Setup

**Purpose**: Add the new shared types that both frontend and backend depend on. Must complete before any implementation work.

- [x] T001 Create `shared/src/types/chat.ts` defining and exporting `ChatMessage` interface with fields: `id: string`, `fromMe: boolean`, `timestamp: number`, `contentType: 'text' | 'image' | 'audio' | 'other'`, `text?: string`, `mediaData?: string`, `mediaLabel?: string`, `authorName?: string`
- [x] T002 [P] Update `shared/src/types/connection.ts` to add two new variants to the `WSMessage` discriminated union: `{ type: 'chat_history'; jid: string; messages: ChatMessage[] }` and `{ type: 'chat_message'; jid: string; message: ChatMessage }` — import `ChatMessage` from `./chat`
- [x] T003 Update `shared/src/index.ts` to re-export `ChatMessage` from `./types/chat.js`

---

## Phase 2: Foundational

**Purpose**: Backend chat service, HTTP routes, and frontend service wiring. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `backend/src/chat/chatService.ts` skeleton: declare module-level state (`activeJid: string | null`, `sock: WASocket | null`, `broadcastFn: ((msg: WSMessage) => void) | null`); implement `initChatService(broadcast: (msg: WSMessage) => void): void` (stores broadcastFn); implement `onSocketReady(socket: WASocket): void` (stores sock — listener registrations added in later tasks); implement `getActiveJid(): string | null`; implement `closeConversation(jid: string): void` (sets `activeJid = null` if jid matches, no-op otherwise); add stub `export async function openConversation(jid: string): Promise<void> { throw new Error('not implemented') }` and stub `export async function sendMessage(jid: string, text: string): Promise<void> { throw new Error('not implemented') }` — T010 and T016 replace these stubs with real implementations
- [x] T005 [P] Create `backend/src/routes/chatRoutes.ts` implementing: `POST /api/chat/open` (validates `{ jid: string }` body, returns 503 if not connected, calls `chatService.openConversation(jid)`, returns `{ ok: true }`); `POST /api/chat/send` (validates `{ jid: string, text: string }` body with non-empty trimmed text, returns 503 if not connected, returns 409 if `jid !== chatService.getActiveJid()`, calls `chatService.sendMessage(jid, text)`, returns `{ ok: true }`); `POST /api/chat/close` (validates `{ jid: string }` body, calls `chatService.closeConversation(jid)`, returns `{ ok: true }` — idempotent)
- [x] T006 [P] Update `backend/src/whatsapp/whatsappService.ts`: add `export function getSock()` returning the current `sock` value; inside the `connection === 'open'` handler (after setting status to connected), add `chatService.onSocketReady(sock!)` call — import `chatService` from `'../chat/chatService.js'`
- [x] T007 Update `backend/index.ts` to: (1) import `chatRoutes` from `'./routes/chatRoutes.js'` and mount it at `/api` alongside existing routes; (2) import `initChatService` from `'./chat/chatService.js'` and call `initChatService(broadcast)` immediately after `createWsServer(httpServer)` — this wires the WS broadcast function into chatService so `chat_history` and `chat_message` events can reach the frontend
- [x] T008 [P] Update `frontend/src/services/ws.ts`: add `chatHistoryListeners: Set<(jid: string, messages: ChatMessage[]) => void>` and `chatMessageListeners: Set<(jid: string, message: ChatMessage) => void>` listener sets; in the `onmessage` handler, add cases for `msg.type === 'chat_history'` (notify chatHistoryListeners) and `msg.type === 'chat_message'` (notify chatMessageListeners); export `useChatHistory(callback: (jid: string, messages: ChatMessage[]) => void): void` hook (follows the existing `useContactsUpdated` pattern); export `useChatMessage(callback: (jid: string, message: ChatMessage) => void): void` hook
- [x] T009 [P] Create `frontend/src/services/chat.ts` implementing typed fetch wrappers: `openConversation(jid: string): Promise<void>` (POST `/api/chat/open`), `sendMessage(jid: string, text: string): Promise<void>` (POST `/api/chat/send`), `closeConversation(jid: string): Promise<void>` (POST `/api/chat/close`) — throw on non-2xx responses

**Checkpoint**: Shared types compiled; backend routes mounted and returning stubs; WS hooks available in frontend; chat.ts wrappers ready. User story implementation can begin.

---

## Phase 3: User Story 1 — Open a Conversation (Priority: P1) 🎯 MVP

**Goal**: "Conversar" button → popup with enabled contacts → select contact → loading state → 100-message history displayed chronologically with sent/received distinction.

**Independent Test**: `npm run dev` → Chat tab → "Conversar" button visible (when connected) → click it → popup lists only enabled contacts → click a contact → loading spinner → messages shown oldest-top/newest-bottom → fromMe messages visually distinct. "Editar lista" opens second overlay; closing returns to contact list.

- [x] T010 [US1] Implement `openConversation(jid: string): Promise<void>` in `backend/src/chat/chatService.ts` (replacing the T004 stub): sets `activeJid = jid`; calls `sock!.fetchMessageHistory(100, undefined, Date.now())` using the module-level `sock` stored by `onSocketReady` (the result arrives via `messaging-history.set` event, not as a return value) — no import from whatsappService.ts needed
- [x] T011 [US1] Add `messaging-history.set` listener registration inside `onSocketReady` in `backend/src/chat/chatService.ts`: the handler receives `{ messages, chats, contacts }` — extract `messages` array; filter to those whose normalized `key.remoteJid` matches `activeJid`; for each matching WAMessage, build a `ChatMessage` with `id = msg.key.id`, `fromMe = msg.key.fromMe ?? false`, `timestamp = Number(msg.messageTimestamp ?? 0)`, `contentType = 'text'` for `conversation`/`extendedTextMessage` messages (extract text), `contentType = 'other'` for everything else (mediaLabel = message type label — full media download added in T020); sort result oldest-first; broadcast `{ type: 'chat_history', jid: activeJid, messages }` via broadcastFn (only if activeJid is set)
- [x] T012 [P] [US1] Create `frontend/src/components/Chat/MessageBubble.tsx`: pure presentational component accepting `msg: ChatMessage`; renders a styled bubble aligned right for `fromMe`, left for received; shows `msg.text` for text messages; shows `msg.authorName` above bubble for group messages (`!msg.fromMe && msg.authorName`); shows formatted timestamp (`msg.timestamp`); for non-text types, renders a styled placeholder with `msg.mediaLabel ?? msg.contentType` (full media rendering added in T021)
- [x] T013 [P] [US1] Create `frontend/src/components/Chat/ConversarPopup.tsx`: overlay component; on mount fetches contacts via `api.getContacts()` and filters to `enabled: true`; renders a scrollable list of enabled contacts (name + isGroup indicator); "Editar lista" button sets `editarListaOpen: boolean` state to true, rendering the existing `ContactList` component as a second overlay (with toggle capability via `api.patchContactConfig`); closing the second overlay sets `editarListaOpen` to false, returning to the contact list; when a contact is tapped, calls `onContactSelect(jid: string)` prop and closes; shows empty state with "Editar lista" prompt when no enabled contacts exist; accepts `onClose` prop for closing the popup
- [x] T014 [US1] Create `frontend/src/components/Chat/ConversationView.tsx`: accepts `jid: string` and `onClose: () => void` props; on mount calls `chat.openConversation(jid)`; manages `messages: ChatMessage[]`, `isLoading: boolean` state; subscribes to `useChatHistory` hook — when history arrives for this jid, sets `messages` and clears loading; renders a scrollable message list of `<MessageBubble>` components; shows loading spinner while `isLoading`; includes a close button that calls `chat.closeConversation(jid)` then `onClose()`; auto-scrolls to bottom after initial history load (useEffect after messages first set)
- [x] T015 [US1] Update `frontend/src/components/Chat/Chat.tsx`: manage `conversarOpen: boolean` and `activeJid: string | null` state; when `status === 'connected'` and `activeJid === null`, show "Conversar" button; clicking it sets `conversarOpen = true`; render `<ConversarPopup>` when `conversarOpen` with `onContactSelect` callback (sets `activeJid`, sets `conversarOpen = false`) and `onClose` callback; render `<ConversationView>` when `activeJid !== null` with `jid={activeJid}` and `onClose` callback (clears `activeJid`); replace current connected-state UI (contact list) with this new layout — the contact list management is now accessed via "Editar lista" inside ConversarPopup

**Checkpoint**: Full Conversar → contact selection → conversation view flow works. Notes text survives tab switch (existing behavior). US1 independently verified.

---

## Phase 4: User Story 2 — Send a Text Message (Priority: P2)

**Goal**: While viewing a conversation, type text and send it. Message appears in the conversation.

**Independent Test**: Open a conversation → type "Hola!" → press Enter → input clears → message appears at bottom as a sent message → verify received on other device.

- [x] T016 [US2] Implement `sendMessage(jid: string, text: string): Promise<void>` in `backend/src/chat/chatService.ts` (replacing the T004 stub): validates `activeJid === jid` (throws if not); calls `await sock!.sendMessage(jid, { text })` using the module-level `sock` stored by `onSocketReady` — no import from whatsappService.ts needed
- [x] T017 [US2] Add text input and send button to `frontend/src/components/Chat/ConversationView.tsx`: add `inputText: string` state; render a fixed-to-bottom `<textarea>` or `<input>` for message entry; send on Enter keydown (Shift+Enter inserts newline for textarea); clicking "Enviar" or pressing Enter calls `chat.sendMessage(jid, inputText.trim())` then clears `inputText`; submit is a no-op when `inputText.trim()` is empty; show inline error indicator on the failed send attempt if an error is thrown

**Checkpoint**: Send message flow works end-to-end. Message appears via `chat_message` WS event. US2 independently verified.

---

## Phase 5: User Story 3 — Receive Real-Time Messages (Priority: P3)

**Goal**: New incoming messages appear automatically without manual action. Scroll-lock and new-message indicator.

**Independent Test**: Open a conversation → have contact send from phone → message appears within 2s. Scroll to top → contact sends message → position holds, indicator appears → tap indicator → scrolls to bottom.

- [x] T018 [US3] Add `messages.upsert` listener registration inside `onSocketReady` in `backend/src/chat/chatService.ts`: handler receives `{ messages, type }` — ignore if `type !== 'notify'`; for each message in `messages`, normalize `key.remoteJid` and check if it matches `activeJid` (skip if not); build `ChatMessage` using the same text-only mapping as T011 (media support added in T020); broadcast `{ type: 'chat_message', jid: activeJid, message }` via broadcastFn
- [x] T019 [US3] Update `frontend/src/components/Chat/ConversationView.tsx` for real-time scroll behavior: add `atBottom: boolean` ref (updated by scroll event listener: true when `scrollTop + clientHeight >= scrollHeight - 50`); add `hasNewMessage: boolean` state; subscribe to `useChatMessage` hook — when a `chat_message` arrives for this jid: append message to `messages`; if `atBottom`, auto-scroll to bottom; otherwise set `hasNewMessage = true`; render a "⬇ nuevo mensaje" indicator button (fixed inside the view, above the input) when `hasNewMessage`; tapping it scrolls to bottom and sets `hasNewMessage = false`

**Checkpoint**: Real-time messages appear. Scroll-lock respected. Indicator tappable. US3 independently verified.

---

## Phase 6: User Story 4 — View Photos and Audio Inline (Priority: P4)

**Goal**: Photos render inline, audio is playable, other media shows a type label.

**Independent Test**: Open conversation with photo + audio + document → photo visible inline → audio has play/pause → document shows "Document" label → layout unbroken.

- [x] T020 [US4] Implement `buildChatMessage(msg: WAMessage): Promise<ChatMessage>` in `backend/src/chat/chatService.ts`: detect content type from Baileys message fields (`imageMessage` → 'image', `audioMessage` → 'audio', `videoMessage`/`documentMessage`/`stickerMessage`/`locationMessage`/`contactMessage` → 'other' with appropriate label, `conversation`/`extendedTextMessage` → 'text'); for 'image' and 'audio': call `downloadMediaMessage(msg, 'buffer', {})` from `@whiskeysockets/baileys`, convert Buffer to base64, construct data URL with mimetype from message descriptor (defaults: `image/jpeg` for images, `audio/ogg` for audio); set `authorName = msg.pushName` for group non-fromMe messages; replace the inline text-only mapping in the `messaging-history.set` handler (T011) and `messages.upsert` handler (T018) with calls to `buildChatMessage(msg)`
- [x] T021 [P] [US4] Update `frontend/src/components/Chat/MessageBubble.tsx` with full media support: when `msg.contentType === 'image'`, render `<img src={msg.mediaData} alt="imagen" style={{ maxWidth: '100%' }} onError={...broken placeholder...} />`; when `msg.contentType === 'audio'`, render `<audio controls src={msg.mediaData} style={{ width: '100%' }} />`; when `msg.contentType === 'other'`, render a styled pill/label showing `msg.mediaLabel` (e.g., "📄 Document", "🎥 Video", "🖼️ Sticker"); ensure surrounding text messages remain readable and layout does not break on large images

**Checkpoint**: Media renders inline. Audio playable. Other media labeled. US4 independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Disconnection handling, error states, and quickstart validation.

- [x] T022 Add disconnection banner to `frontend/src/components/Chat/ConversationView.tsx`: subscribe to `useConnectionStatus`; when `status !== 'connected'` and `status !== 'connecting'` is false (i.e., WA goes to 'disconnected'), show a fixed inline banner at the top of the conversation ("WhatsApp desconectado. Reconectando…"); disable the send input while disconnected; any send attempt while disconnected catches the error from `chat.sendMessage` and shows an inline "Error al enviar" indicator on the message row (FR-019, FR-020)
- [x] T023 Add error and retry state to `frontend/src/components/Chat/ConversationView.tsx`: after calling `chat.openConversation(jid)`, start a 10-second timeout; if `chat_history` has not arrived when the timeout fires, clear loading state and show an error view with "No se pudo cargar el chat. Reintentar" button; tapping retry calls `chat.openConversation(jid)` again and resets the timeout
- [x] T024 [P] Add loading and error states to `frontend/src/components/Chat/ConversarPopup.tsx`: show a loading spinner while fetching contacts via `api.getContacts()`; show an error message with "Reintentar" if the fetch fails; ensure the empty-state "Editar lista" prompt works when no contacts are enabled (acceptance scenario 5)
- [ ] T025 Walk through all steps in `specs/002-chat-module/quickstart.md` end-to-end and fix any discrepancies found between the doc and the actual implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001 and T002 can run in parallel (different files).
- **Foundational (Phase 2)**: Requires Phase 1 complete. T004 first; then T005 and T006 in parallel (both depend on T004); T007 after T005; T008 and T009 parallel with everything else in Phase 2 (purely frontend, different files).
- **US1 (Phase 3)**: Requires Phase 2 complete. T010 first; T011 after T010 (same file); T012 and T013 parallel with T010–T011 and with each other (different files); T014 after T012; T015 after T013 and T014.
- **US2 (Phase 4)**: Requires Phase 2 complete. T016 and T017 can run in parallel (different files: chatService.ts vs ConversationView.tsx) — but US2 is demo-able only after US1 provides the conversation view.
- **US3 (Phase 5)**: Requires Phase 2 complete + US1 visible. T018 and T019 can run in parallel (different files). T019 extends ConversationView.tsx (T014 must exist).
- **US4 (Phase 6)**: Requires Phase 2 complete. T020 and T021 can run in parallel (different files). T021 extends MessageBubble.tsx (T012 must exist).
- **Polish (Phase 7)**: Requires all user stories complete. T022, T023, T024 are parallel (T022 and T023 modify ConversationView.tsx — sequential; T024 modifies ConversarPopup.tsx — parallel with T022/T023).

### User Story Dependencies

- **US1**: Depends only on Foundational (Phase 2) — no dependency on US2, US3, or US4
- **US2**: Depends on Foundational (Phase 2) + US1 conversation view visible (T014); backend T016 is independent of US1
- **US3**: Depends on Foundational (Phase 2) + US1 conversation view (T014, T015); T018 backend listener is independent
- **US4**: Depends on Foundational (Phase 2) + US1 MessageBubble (T012); T021 extends T012

### Key Parallel Batches

```bash
# Phase 1 parallel:
T001 chat.ts  +  T002 connection.ts

# Phase 2 parallel batch (after T004):
T005 chatRoutes.ts  +  T006 whatsappService.ts  +  T008 ws.ts  +  T009 chat.ts

# US1 parallel batch (after T004 foundational):
T010→T011 chatService.ts (sequential, same file)
T012 MessageBubble.tsx  +  T013 ConversarPopup.tsx  (parallel with each other and with T010-T011)

# US4 parallel:
T020 chatService.ts  +  T021 MessageBubble.tsx

# Polish parallel:
T022 ConversationView.tsx (disconnect)  →  T023 ConversationView.tsx (timeout)  [sequential, same file]
T024 ConversarPopup.tsx  [parallel with T022]
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Complete Phase 3 (US1 — Conversar popup + conversation view with history)
3. **STOP and validate**: Conversar button visible → popup lists enabled contacts → select contact → 100 messages shown → "Editar lista" works
4. Proceed to US2 when US1 is verified

### Incremental Delivery

1. Phase 1 + 2 → types compiled, routes mounted, WS hooks wired
2. + US1 → read-only ephemeral chat (demo-able: open and read any conversation)
3. + US2 → full two-way text messaging
4. + US3 → live chat (real-time delivery + scroll-lock)
5. + US4 → rich media (photos + audio inline)
6. + Polish → disconnection handling, error recovery, quickstart verified

---

## Notes

- [P] tasks within a phase can be started simultaneously — they touch different files
- US1 and backend portions of US2/US3/US4 can be developed in parallel after Foundational is done
- T011 and T018 both modify `chatService.ts` `onSocketReady` — T018 must come after T011 (or be done in one edit session)
- T020 replaces the text-only message mapping established in T011 and T018 — coordinate to avoid merge conflicts
- T022 and T023 both modify `ConversationView.tsx` — do them sequentially in Polish phase
- Media download in T020 can be slow for conversations with many images — this is expected; loading state covers it
