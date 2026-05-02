# API Contracts: Phase 1 — Foundation

**Feature**: 001-foundation-monorepo-setup
**Date**: 2026-05-02
**Base URL**: `http://localhost:3001`

---

## HTTP REST API

All responses use `Content-Type: application/json`. All request bodies (where applicable)
use `Content-Type: application/json`.

---

### GET /api/status

Returns the current WhatsApp connection state.

**Response 200**:
```json
{
  "state": "connected"
}
```

**`state` values**: `"connecting"` | `"qr_pending"` | `"connected"` | `"disconnected"`

**Notes**: Does not include the QR string (QR is pushed via WebSocket only, to avoid
polling).

---

### GET /api/contacts

Returns the merged contact list: all contacts/groups known to WhatsApp, with each one's
current `enabled` state from config.

**Response 200**:
```json
{
  "contacts": [
    {
      "jid": "5491112345678@s.whatsapp.net",
      "name": "Juan García",
      "isGroup": false,
      "enabled": true
    },
    {
      "jid": "120363000000000000@g.us",
      "name": "Proyecto Alpha",
      "isGroup": true,
      "enabled": false
    }
  ]
}
```

**Response 202** (connected but contacts still syncing):
```json
{
  "status": "loading"
}
```

**Response 503** (when not connected):
```json
{
  "error": "WhatsApp not connected"
}
```

---

### GET /api/config

Returns the full application configuration.

**Response 200**:
```json
{
  "contacts": [
    { "jid": "5491112345678@s.whatsapp.net", "enabled": true }
  ],
  "notes": "",
  "pinnedVideos": []
}
```

---

### POST /api/contacts/refresh

Triggers a re-fetch of the contact list from WhatsApp without restarting the app.
Returns the updated merged contact list (same shape as `GET /api/contacts`).

**Response 200**:
```json
{
  "contacts": [
    {
      "jid": "5491112345678@s.whatsapp.net",
      "name": "Juan García",
      "isGroup": false,
      "enabled": true
    }
  ]
}
```

**Response 503** (when not connected):
```json
{
  "error": "WhatsApp not connected"
}
```

---

### PATCH /api/config/contacts

Updates the enabled/disabled state for one or more contacts. Partial updates are supported —
only the JIDs included in the request body are modified.

**Request body**:
```json
{
  "contacts": [
    { "jid": "5491112345678@s.whatsapp.net", "enabled": false },
    { "jid": "120363000000000000@g.us", "enabled": true }
  ]
}
```

**Response 200**:
```json
{
  "contacts": [
    { "jid": "5491112345678@s.whatsapp.net", "enabled": false },
    { "jid": "120363000000000000@g.us", "enabled": true }
  ]
}
```
(Returns only the updated entries, not the full list.)

**Response 400** (malformed body):
```json
{
  "error": "Invalid request body"
}
```

---

## WebSocket Protocol

**Endpoint**: `ws://localhost:3001/ws`

The frontend connects once on application load and holds the connection for the session.
The server broadcasts state changes to all connected clients (single-client app, but the
protocol supports multiple listeners).

### Server → Client Messages

All messages are JSON strings.

#### connection_status

Sent whenever the WhatsApp connection state changes.

```json
{ "type": "connection_status", "status": "connecting" }
{ "type": "connection_status", "status": "qr_pending", "qr": "<raw-qr-string>" }
{ "type": "connection_status", "status": "connected" }
{ "type": "connection_status", "status": "disconnected" }
```

- The `qr` field is present **only** when `status === "qr_pending"`.
- The QR string is the raw data (not a data URI). The frontend converts it to an image
  using the `qrcode` library.
- Multiple `qr_pending` messages may be received as the QR refreshes; each replaces the
  previous QR display.

### Client → Server Messages

No client-to-server WebSocket messages are defined in Phase 1. The WebSocket is
server-push only in this phase.

---

## Vite Dev Proxy

In development, the Vite dev server proxies backend requests to avoid CORS issues.

`frontend/vite.config.ts` proxy rules:
```
/api/*   → http://localhost:3001
/ws      → ws://localhost:3001/ws  (WebSocket upgrade)
```

The frontend uses `/api/*` and `/ws` as relative URLs; the proxy handles routing.
