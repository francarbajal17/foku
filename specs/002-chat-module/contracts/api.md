# API Contracts: Phase 2 — Chat Module

**Feature**: 002-chat-module
**Date**: 2026-05-04
**Base URL**: `http://localhost:3001`
**Extends**: `specs/001-foundation-monorepo-setup/contracts/api.md`

---

## New HTTP REST Endpoints

All new endpoints require WhatsApp to be in `connected` state. All return `Content-Type: application/json`.

---

### POST /api/chat/open

Opens a conversation with the specified contact or group. Triggers a message history fetch on the backend; history is delivered asynchronously via the `chat_history` WebSocket event (not in the HTTP response).

**Request body**:
```json
{ "jid": "5491112345678@s.whatsapp.net" }
```

**Response 200** (history fetch initiated):
```json
{ "ok": true }
```

**Response 400** (missing or invalid JID):
```json
{ "error": "Invalid request body" }
```

**Response 503** (WhatsApp not connected):
```json
{ "error": "WhatsApp not connected" }
```

**Notes**:
- If a conversation is already open when this is called, the previous conversation is closed first (listener torn down, `activeJid` replaced).
- The HTTP 200 response does NOT mean history has been delivered — it means the request was accepted. The frontend must await the `chat_history` WS event to populate the conversation view.

---

### POST /api/chat/send

Sends a plain text message in the currently open conversation.

**Request body**:
```json
{ "jid": "5491112345678@s.whatsapp.net", "text": "Hello!" }
```

**Response 200** (message sent successfully):
```json
{ "ok": true }
```

**Response 400** (missing/invalid body, empty text, or `jid` does not match `activeJid`):
```json
{ "error": "Invalid request body" }
```

**Response 503** (WhatsApp not connected):
```json
{ "error": "WhatsApp not connected" }
```

**Response 409** (no conversation open, or JID mismatch):
```json
{ "error": "No active conversation for this JID" }
```

**Notes**:
- `text` must be non-empty after trimming whitespace.
- The sent message will appear in the conversation via the `messages.upsert` event (same as any other message), which triggers a `chat_message` WS event. The frontend does NOT need to manually append the sent message.
- Media sending is out of scope for Phase 2.

---

### POST /api/chat/close

Closes the currently open conversation, tears down the real-time listener, and clears `activeJid`. No message data is retained.

**Request body**:
```json
{ "jid": "5491112345678@s.whatsapp.net" }
```

**Response 200**:
```json
{ "ok": true }
```

**Response 400** (missing/invalid body):
```json
{ "error": "Invalid request body" }
```

**Notes**:
- If `jid` does not match the currently active conversation, the response is still 200 (idempotent close). No error is raised for already-closed conversations.
- After this call, no further `chat_message` WS events are sent for this JID.

---

## Updated WebSocket Protocol

**Extends**: `specs/001-foundation-monorepo-setup/contracts/api.md` — WebSocket Protocol section.

### New Server → Client Messages (Phase 2 additions)

#### chat_history

Sent once after the backend resolves message history following a `POST /api/chat/open` call. Messages are ordered oldest-first.

```json
{
  "type": "chat_history",
  "jid": "5491112345678@s.whatsapp.net",
  "messages": [
    {
      "id": "3EB0123456789",
      "fromMe": false,
      "timestamp": 1746000000,
      "contentType": "text",
      "text": "Hola!"
    },
    {
      "id": "3EB0123456790",
      "fromMe": true,
      "timestamp": 1746000060,
      "contentType": "text",
      "text": "Hola, ¿cómo estás?"
    },
    {
      "id": "3EB0123456791",
      "fromMe": false,
      "timestamp": 1746000120,
      "contentType": "image",
      "mediaData": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    },
    {
      "id": "3EB0123456792",
      "fromMe": false,
      "timestamp": 1746000180,
      "contentType": "audio",
      "mediaData": "data:audio/ogg;base64,T2dnUwACAAAAA..."
    },
    {
      "id": "3EB0123456793",
      "fromMe": false,
      "timestamp": 1746000240,
      "contentType": "other",
      "mediaLabel": "Document"
    }
  ]
}
```

**Notes**:
- `messages` array is capped at 100 items (oldest 100 messages available from WhatsApp).
- `jid` allows the frontend to verify the history belongs to the conversation it opened.
- `authorName` is included in group message items where `fromMe === false`.

#### chat_message

Sent by the backend for each new incoming (or outgoing) message while a conversation is open. Follows the same `ChatMessage` shape as items in `chat_history.messages`.

```json
{
  "type": "chat_message",
  "jid": "5491112345678@s.whatsapp.net",
  "message": {
    "id": "3EB0123456794",
    "fromMe": false,
    "timestamp": 1746000300,
    "contentType": "text",
    "text": "¿Viste el partido?"
  }
}
```

**Notes**:
- Sent for BOTH received and sent messages (triggered by `messages.upsert` which fires for `fromMe: true` as well after successful delivery).
- The frontend appends this message to its in-memory list without any HTTP call.
- If `jid` does not match the conversation the frontend has open, the event is ignored.

### Client → Server Messages

No client→server WebSocket messages are added in Phase 2. All commands (open, send, close) use HTTP POST.

---

## ChatMessage Type Reference

Used in both `chat_history` and `chat_message` WS events:

```typescript
interface ChatMessage {
  id: string              // unique message ID within the conversation
  fromMe: boolean         // true = sent by user; false = received
  timestamp: number       // Unix epoch seconds
  contentType: 'text' | 'image' | 'audio' | 'other'
  text?: string           // contentType === 'text'
  mediaData?: string      // contentType === 'image' | 'audio': base64 data URL
  mediaLabel?: string     // contentType === 'other': e.g. "Document", "Video", "Sticker"
  authorName?: string     // group messages only, non-fromMe
}
```
