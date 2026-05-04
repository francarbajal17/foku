# Data Model: Phase 2 — Chat Module

**Feature**: 002-chat-module
**Date**: 2026-05-04

---

## New Shared Types

### `ChatMessage` (`shared/src/types/chat.ts`)

Represents a single message in an ephemeral conversation. Never persisted.

```typescript
export interface ChatMessage {
  id: string            // Baileys message key ID (unique per conversation)
  fromMe: boolean       // true = sent by the user; false = received
  timestamp: number     // Unix epoch seconds
  contentType: 'text' | 'image' | 'audio' | 'other'
  text?: string         // present when contentType === 'text'
  mediaData?: string    // present when contentType === 'image' | 'audio':
                        //   base64 data URL, e.g. "data:image/jpeg;base64,..."
                        //   or "data:audio/ogg;base64,..."
  mediaLabel?: string   // present when contentType === 'other':
                        //   human-readable type, e.g. "Document", "Video",
                        //   "Sticker", "Location", "Contact"
  authorName?: string   // display name of sender for group messages (non-fromMe only);
                        // absent for individual conversations or fromMe messages
}
```

**Validation rules**:
- `id` is non-empty (sourced from Baileys `msg.key.id`).
- `timestamp` is a positive integer (sourced from Baileys `msg.messageTimestamp`, cast to `number`).
- Exactly one of `text`, `mediaData`, or `mediaLabel` is present (determined by `contentType`).
- `mediaData` format: always `data:<mimeType>;base64,<base64string>`.
- `authorName` is only set when `!fromMe` and the conversation JID ends in `@g.us` (group).

**Content type mapping from Baileys**:

| Baileys message field | `contentType` | `mediaLabel` |
|----------------------|---------------|--------------|
| `conversation` or `extendedTextMessage` | `'text'` | — |
| `imageMessage` | `'image'` | — |
| `audioMessage` | `'audio'` | — |
| `videoMessage` | `'other'` | `"Video"` |
| `documentMessage` | `'other'` | `"Document"` |
| `stickerMessage` | `'other'` | `"Sticker"` |
| `locationMessage` | `'other'` | `"Location"` |
| `contactMessage` | `'other'` | `"Contact"` |
| anything else | `'other'` | `"Media"` |

---

### `WSMessage` extension (`shared/src/types/connection.ts`)

Two new variants added to the existing discriminated union:

```typescript
export type WSMessage =
  // --- existing Phase 1 variants ---
  | { type: 'connection_status'; status: ConnectionStatus; qr?: string; pushName?: string }
  | { type: 'contacts_updated' }
  // --- new Phase 2 variants ---
  | { type: 'chat_history'; jid: string; messages: ChatMessage[] }
  | { type: 'chat_message'; jid: string; message: ChatMessage }
```

- `chat_history`: sent once by the backend after `POST /api/chat/open` resolves history from WhatsApp. `messages` is ordered oldest-first (index 0 = oldest, index n-1 = newest).
- `chat_message`: sent by the backend for each new incoming message while a conversation is open. `jid` allows the frontend to verify the message belongs to the currently displayed conversation.

---

## Backend State

### `chatService.ts` module-level state

```
activeJid: string | null
  — The JID of the currently open conversation.
  — null when no conversation is open.
  — Set by openConversation(); cleared by closeConversation().
  — Only one conversation open at a time (single-slot).

sock: WASocket | null
  — Reference to the active Baileys socket.
  — Updated via onSocketReady(sock) on every connection.open event.

broadcastFn: ((msg: WSMessage) => void) | null
  — Reference to wsServer's broadcast function.
  — Set once during initChatService().
```

### `ConversationSession` lifecycle

```
State machine: CLOSED → OPENING → OPEN → CLOSED

CLOSED:
  activeJid = null
  No messages.upsert filtering active (global listener exists but no-ops when activeJid = null)

OPENING (between POST /api/chat/open and chat_history WS event):
  activeJid = jid
  fetchMessageHistory called
  Loading state shown in frontend

OPEN (after chat_history received by frontend):
  activeJid = jid
  messages.upsert listener active for this jid
  Conversation view visible

CLOSED (after POST /api/chat/close):
  activeJid = null
  No updates forwarded to frontend
  No message data retained anywhere
```

---

## Frontend State

### `ConversationView` component state

```
messages: ChatMessage[]
  — Ordered oldest-first. Populated from chat_history WS event.
  — New messages appended from chat_message WS events.
  — Cleared on unmount.

isLoading: boolean
  — true between openConversation() call and chat_history receipt.

isDisconnected: boolean
  — true when connection_status transitions to 'disconnected'/'connecting'
    while a conversation is open.
  — Shows inline disconnection banner; blocks send.

atBottom: boolean
  — true when scroll position is within a threshold of the bottom.
  — Controls auto-scroll vs new-message indicator behavior.

hasNewMessage: boolean
  — true when a new chat_message arrives while atBottom === false.
  — Shows the "new message" indicator.
```

### `ConversarPopup` component state

```
editarListaOpen: boolean
  — Controls whether the second overlay (contact configuration) is visible.
  — false by default; set to true on "Editar lista" tap; back to false on close.
```

---

## Entities and Relationships

```
Enabled Contact List (Phase 1, config.json)
  └─── shown in ConversarPopup (read-only in Phase 2)
         │
         │ user selects one
         ▼
  ConversationSession (in-memory, chatService.ts)
  ┌─────────────────────────────────────────────┐
  │ activeJid: string                           │
  │                                             │
  │ messages.upsert listener ──► ChatMessage[]  │
  │                             (WS push)       │
  │                                             │
  │ fetchMessageHistory ──────► ChatMessage[]   │
  │                             (WS push)       │
  └─────────────────────────────────────────────┘
                 │
                 │ WS chat_history / chat_message
                 ▼
  ConversationView (frontend, in-memory React state)
  ┌─────────────────────────────────────────────┐
  │ messages: ChatMessage[]  (never persisted)  │
  └─────────────────────────────────────────────┘
                 │
                 │ unmount / close button
                 ▼
  CLOSED (all data discarded)
```
