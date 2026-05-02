# Data Model: Phase 1 — Foundation

**Feature**: 001-foundation-monorepo-setup
**Date**: 2026-05-02

---

## Entities

### Contact

Represents a WhatsApp contact or group chat that the user can add to their configurable list.

| Field      | Type      | Description |
|------------|-----------|-------------|
| `jid`      | `string`  | Unique WhatsApp identifier (e.g., `5491112345678@s.whatsapp.net` or `...@g.us` for groups) |
| `name`     | `string`  | Display name resolved from: phone book name → WhatsApp push name → JID |
| `isGroup`  | `boolean` | `true` for group chats, `false` for individual contacts |
| `enabled`  | `boolean` | Whether this contact appears in the Conversar popup |

**Validation rules**:
- `jid` MUST be non-empty and unique within the list.
- `name` may be empty if neither phone book name nor push name is known; display JID as fallback.
- `enabled` defaults to `false` for newly discovered contacts (opt-in model).

**Relationships**: Belongs to `AppConfig.contacts`.

---

### AppConfig

The single persistent configuration document. Stored as `config.json` in the project root.
Written atomically (temp file + rename) to prevent corruption.

| Field          | Type              | Description |
|----------------|-------------------|-------------|
| `contacts`     | `ContactConfig[]` | Subset of contacts with persisted enabled/disabled state |
| `notes`        | `string`          | User's freeform notes content (empty in Phase 1) |
| `pinnedVideos` | `string[]`        | YouTube video IDs for the Focus panel (empty in Phase 1) |

**ContactConfig** (the persisted slice of a Contact):

| Field     | Type      | Description |
|-----------|-----------|-------------|
| `jid`     | `string`  | WhatsApp identifier, matches `Contact.jid` |
| `enabled` | `boolean` | Persisted toggle state |

**Validation rules**:
- File MUST be valid JSON; if corrupt or missing, initialize with defaults.
- `contacts` defaults to `[]`; `notes` defaults to `""`; `pinnedVideos` defaults to `[]`.

---

### ConnectionStatus

In-memory state only — not persisted. Tracks the current WhatsApp connection lifecycle.

| Field    | Type                                                            | Description |
|----------|-----------------------------------------------------------------|-------------|
| `state`  | `'connecting' \| 'qr_pending' \| 'connected' \| 'disconnected'` | Current phase of the connection lifecycle |
| `qr`     | `string \| undefined`                                           | Raw QR string; present only when `state === 'qr_pending'` |

**State transitions**:
```
disconnected ──► connecting ──► qr_pending ──► connected
                                    │                │
                                    └────────────────┘
                                    (QR refresh loop until scanned)
        connected ──► disconnected (network loss, logout)
```

---

### WhatsApp Session (opaque)

Managed entirely by Baileys via `useMultiFileAuthState`. Persisted to `wa_auth/` directory.
Foku treats this as opaque — never reads or writes directly; only signals Baileys to delete it
on logout.

---

## Package Location

Types are split by whether they cross the network boundary:

| Type | Package | Reason |
|------|---------|--------|
| `Contact` | `@foku/shared` | Returned by `GET /api/contacts` |
| `ContactConfig` | `@foku/shared` | In `AppConfig` and `PATCH /api/config/contacts` body |
| `AppConfig` | `@foku/shared` | Returned by `GET /api/config`, written by backend |
| `ConnectionStatus` | `@foku/shared` | State enum used in `GET /api/status` and WS messages |
| `WSMessage` | `@foku/shared` | WebSocket message union (wraps `ConnectionStatus`) |
| Baileys socket types | `backend` only | Internal to whatsappService; never sent over the wire |
| React component props | `frontend` only | UI concerns; never reach the backend |

---

## Storage Layout

```
/                          ← project root
├── config.json            ← AppConfig (contacts, notes, pinnedVideos)
└── wa_auth/               ← Baileys auth state (opaque files)
    ├── creds.json
    └── ...
```

---

## Phase 1 Scope Notes

- `Contact.enabled` is always derived at runtime by merging the live Baileys contact list with
  the persisted `AppConfig.contacts`. Contacts not in config default to `enabled: false`.
- The `notes` and `pinnedVideos` fields in `AppConfig` are initialized but unused in Phase 1.
  They are included in the schema now to avoid a config migration in later phases.
