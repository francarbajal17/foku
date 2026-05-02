# Tasks: Phase 1 — Foundation

**Input**: Design documents from `specs/001-foundation-monorepo-setup/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · data-model.md ✅ · contracts/api.md ✅ · research.md ✅
**Tests**: Not included (not requested for Phase 1 scaffold)

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[USn]**: Which user story this task belongs to
- No story label: Setup, Foundational, or Polish phase task

---

## Phase 1: Setup

**Purpose**: Initialize the three-package monorepo and configure tooling. No business logic.

- [x] T001 Create `package.json` at repo root defining npm workspaces `["shared", "frontend", "backend"]`, with `concurrently` as a dev dependency and placeholder `dev` and `build` scripts
- [x] T002 [P] Create `tsconfig.base.json` at repo root with `strict: true`, `target: ESNext`, `moduleResolution: Bundler`, and `paths` mapping `@foku/shared` to `./shared/src`
- [x] T003 [P] Create `.gitignore` at repo root covering `node_modules/`, `dist/`, `wa_auth/`, `config.json`, and `*.js` map files
- [x] T004 Create `shared/package.json` with `name: "@foku/shared"`, no runtime dependencies, `types` entry pointing to `src/index.ts`
- [x] T005 [P] Create `shared/tsconfig.json` extending `../../tsconfig.base.json`, including all files under `src/`
- [x] T006 Create `backend/package.json` with dependencies: `express`, `@whiskeysockets/baileys`, `ws`, `qrcode`; dev dependencies: `tsx`, `typescript`, `@types/express`, `@types/ws`, `@types/node`; `"@foku/shared": "*"`
- [x] T007 [P] Create `backend/tsconfig.json` extending `../tsconfig.base.json` with `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`
- [x] T008 Create `frontend/package.json` with dependencies: `react`, `react-dom`, `qrcode`; dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`; `"@foku/shared": "*"`
- [x] T009 [P] Create `frontend/tsconfig.json` extending `../tsconfig.base.json` with `jsx: react-jsx`, `lib: ["DOM", "ESNext"]`

---

## Phase 2: Foundational

**Purpose**: Shared types and core infrastructure. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T010 Create `shared/src/types/contact.ts` defining and exporting: `Contact` interface (`jid: string`, `name: string`, `isGroup: boolean`, `enabled: boolean`) and `ContactConfig` interface (`jid: string`, `enabled: boolean`)
- [x] T011 [P] Create `shared/src/types/config.ts` defining and exporting: `AppConfig` interface (`contacts: ContactConfig[]`, `notes: string`, `pinnedVideos: string[]`)
- [x] T012 [P] Create `shared/src/types/connection.ts` defining and exporting: `ConnectionStatus` type (union `'connecting' | 'qr_pending' | 'connected' | 'disconnected'`) and `WSMessage` discriminated union (`{ type: 'connection_status', status: ConnectionStatus, qr?: string }`)
- [x] T013 Create `shared/src/index.ts` re-exporting everything from `./types/contact`, `./types/config`, `./types/connection`
- [x] T014 Create `backend/src/config/configService.ts` implementing: `loadConfig(): AppConfig` (reads `config.json`, initializes defaults if missing or corrupt), `saveConfig(config: AppConfig): void` (atomic write via temp file + rename), `updateContactConfig(updates: ContactConfig[]): AppConfig` (merges partial update into existing config and saves)
- [x] T015 Create `backend/index.ts` as Express app skeleton: creates HTTP server, attaches WebSocket server on path `/ws`, registers route placeholders (`/api/status`, `/api/contacts`, `/api/config`), starts listening on port `3001`, calls `configService.loadConfig()` on startup
- [x] T016 Create `frontend/vite.config.ts` with `@vitejs/plugin-react` and server proxy rules: `/api` → `http://localhost:3001`, `/ws` → `ws://localhost:3001` (with `ws: true`)
- [x] T017 Create `frontend/index.html` with standard Vite HTML boilerplate referencing `src/main.tsx`
- [x] T018 Create `frontend/src/main.tsx` rendering `<App />` into `#root` with `React.StrictMode`

**Checkpoint**: Foundation ready — all three packages exist with types and core wiring. User story work can begin.

---

## Phase 3: User Story 1 — Four-Module Navigation Layout (Priority: P1) 🎯 MVP

**Goal**: A running app with four accessible tabs where switching preserves in-section state.

**Independent Test**: `npm run dev` → open `http://localhost:5173` → click all 4 tabs → type in Notes → switch to Timer → switch back to Notes → text is still present.

- [x] T019 [P] [US1] Create `frontend/src/components/Chat/Chat.tsx` as a placeholder functional component rendering a `<div>` with the text "Chat" and a data-testid attribute
- [x] T020 [P] [US1] Create `frontend/src/components/Focus/Focus.tsx` as a placeholder functional component rendering a `<div>` with the text "Focus"
- [x] T021 [P] [US1] Create `frontend/src/components/Timer/Timer.tsx` as a placeholder functional component rendering a `<div>` with the text "Timer"
- [x] T022 [P] [US1] Create `frontend/src/components/Notes/Notes.tsx` as a functional component with a `<textarea>` managed by `useState` — text persists across navigation because the component stays mounted
- [x] T023 [US1] Create `frontend/src/components/Shell/Shell.tsx`: renders a fixed navigation bar with four tab buttons (Chat, Focus, Timer, Notes); tracks `activeModule` in `useState`; renders all four module children simultaneously wrapped in `<div style={{ display: activeModule === X ? 'block' : 'none' }}>` so state is never lost; active tab receives a distinct CSS class
- [x] T024 [US1] Create `frontend/src/App.tsx` rendering `<Shell>` with `<Chat />`, `<Focus />`, `<Timer />`, and `<Notes />` as children in the correct slot order

**Checkpoint**: All four tabs visible and clickable. Notes textarea content survives tab switching. US1 independently verified.

---

## Phase 4: User Story 2 — WhatsApp Connection via QR Code (Priority: P2)

**Goal**: First-launch QR scan flow and persistent session that skips QR on subsequent launches.

**Independent Test**: Delete `wa_auth/` → `npm run dev` → QR appears in Chat tab within 5s → scan with phone → "Connected" shown and QR disappears → restart server → no QR shown, connected within 5s.

- [x] T025 [US2] Create `backend/src/whatsapp/whatsappService.ts` implementing:
  - `initWhatsApp(broadcast: (msg: WSMessage) => void): void` — initializes Baileys with `useMultiFileAuthState('./wa_auth')`, creates `makeWASocket`, listens to `connection.update` (relay `qr_pending`/`connected`/`disconnected` via broadcast), listens to `saveCreds` (persist credentials), implements auto-reconnect loop (up to 3 silent retries on non-logout disconnects, then broadcasts `disconnected` permanently)
  - `getConnectionStatus(): ConnectionStatus` — returns current in-memory state
- [x] T026 [US2] Create `backend/src/ws/wsServer.ts` implementing:
  - `createWsServer(server: http.Server): WebSocket.Server` — attaches ws server to Express HTTP server on path `/ws`
  - `broadcast(msg: WSMessage): void` — sends JSON-serialized message to all connected ws clients
  - On new client connection, immediately sends the current `ConnectionStatus` so the frontend never starts with a stale state
- [x] T027 [US2] Create `backend/src/routes/statusRoutes.ts` implementing `GET /api/status` returning `{ state: getConnectionStatus() }` as JSON
- [x] T028 [US2] Update `backend/index.ts` to: import and call `createWsServer(httpServer)` after server creation, import and call `initWhatsApp(broadcast)` passing the ws broadcast function, import and mount `statusRoutes` at `/api`
- [x] T029 [US2] Create `frontend/src/services/ws.ts` implementing:
  - Connects to `/ws` (proxied to backend) on module load
  - Parses incoming `WSMessage` JSON
  - Exports `useConnectionStatus(): { status: ConnectionStatus, qr?: string }` React hook backed by a module-level event emitter or `useState` + `useEffect` subscription
- [x] T030 [US2] Update `frontend/src/components/Chat/Chat.tsx` to use `useConnectionStatus()` and render:
  - `connecting`: "Connecting to WhatsApp…" text
  - `qr_pending`: QR code image generated from `qr` string using the `qrcode` npm package (render to canvas or data URL)
  - `connected`: "Connected" confirmation message (QR no longer visible)
  - `disconnected` (after 3 failed retries): inline error indicator "WhatsApp connection failed. Restart the app to try again."
  - No internet on startup (backend never reaches `connecting`): inline message "No internet connection. Check your network and restart." — other tabs remain accessible

**Checkpoint**: QR scan flow works end-to-end. Restart skips QR. Disconnection retries silently. US2 independently verified.

---

## Phase 5: User Story 3 — Configurable WhatsApp Contact List (Priority: P3)

**Goal**: Full contact list with toggle persistence and manual refresh.

**Independent Test**: Connect to WhatsApp → open Chat tab → loading spinner → full contact/group list appears → toggle a contact → restart app → toggle state preserved → click Refresh → spinner → list re-fetched.

- [x] T031 [US3] Update `backend/src/whatsapp/whatsappService.ts` to add:
  - `makeInMemoryStore()` bound to the socket to accumulate contacts via `contacts.upsert` events
  - `getContacts(): Promise<Contact[]>` — merges `store.contacts` (individual contacts) with `sock.groupFetchAllParticipating()` (groups), resolves display name (`name` > `notify` > JID), merges with enabled state from `configService`, returns sorted `Contact[]`
  - `refreshContacts(): Promise<Contact[]>` — re-runs the same retrieval and returns updated list
- [x] T032 [US3] Create `backend/src/routes/contactRoutes.ts` implementing:
  - `GET /api/contacts` → calls `getContacts()`, returns `{ contacts: Contact[] }`; returns `503 { error: 'WhatsApp not connected' }` if not connected
  - `POST /api/contacts/refresh` → calls `refreshContacts()`, returns `{ contacts: Contact[] }`; returns `503` if not connected
  - `PATCH /api/config/contacts` → validates body contains `contacts: ContactConfig[]`, calls `configService.updateContactConfig(contacts)`, returns `{ contacts: updatedEntries }`; returns `400` on malformed body
- [x] T033 [US3] Create `backend/src/routes/configRoutes.ts` implementing `GET /api/config` → returns full `AppConfig` from `configService.loadConfig()`
- [x] T034 [US3] Update `backend/index.ts` to import and mount `contactRoutes` and `configRoutes` at `/api`
- [x] T035 [US3] Create `frontend/src/services/api.ts` implementing typed fetch wrappers: `getContacts(): Promise<Contact[]>`, `refreshContacts(): Promise<Contact[]>`, `patchContactConfig(updates: ContactConfig[]): Promise<ContactConfig[]>`, `getConfig(): Promise<AppConfig>`
- [x] T036 [P] [US3] Create `frontend/src/components/Chat/ContactList.tsx` as a pure presentational component accepting props: `contacts: Contact[]`, `loading: boolean`, `onToggle: (jid: string, enabled: boolean) => void`, `onRefresh: () => void` — renders: loading spinner when `loading=true`; empty state message ("No contacts found") when list is empty; scrollable list of contact rows with name and a toggle checkbox when list has items; "Refresh" button always visible
- [x] T037 [US3] Update `frontend/src/components/Chat/Chat.tsx` to add contact list logic when `status === 'connected'`: fetch contacts on mount via `api.getContacts()` (show loading spinner during fetch), pass data and handlers to `<ContactList />`, call `api.patchContactConfig()` on toggle (optimistic UI update + async persist), call `api.refreshContacts()` on Refresh click

**Checkpoint**: Contact list loads, toggles persist across restart, Refresh re-fetches without restart. US3 independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize dev scripts and validate end-to-end quickstart flow.

- [x] T038 Update root `package.json` scripts: `"dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w frontend\""` and `"build": "npm run build -w backend && npm run build -w frontend"`; add `dev` script to `backend/package.json` as `"tsx watch src/index.ts"` and to `frontend/package.json` as `"vite"`
- [x] T039 [P] Walk through all steps in `specs/001-foundation-monorepo-setup/quickstart.md` end-to-end and fix any discrepancies found between the doc and the actual implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T002, T003, T005, T007, T009 can all run in parallel with T001/T004/T006/T008.
- **Foundational (Phase 2)**: Requires Phase 1 complete. T010, T011, T012 parallel; T013 after all three; T014–T018 after T013.
- **US1 (Phase 3)**: Requires Phase 2 complete. T019–T022 fully parallel; T023 after they exist; T024 after T023.
- **US2 (Phase 4)**: Requires Phase 2 complete (NOT Phase 3). Can start in parallel with US1 on the backend side.
- **US3 (Phase 5)**: Requires Phase 2 + US2 backend complete (T025 must exist before T031). T035 and T036 can be parallel.
- **Polish (Phase 6)**: Requires all user stories complete.

### User Story Dependencies

- **US1**: Depends only on Foundational — no dependency on US2 or US3
- **US2**: Depends only on Foundational — no dependency on US1 or US3
- **US3**: Depends on US2 backend (T025 must have `getContacts`/`refreshContacts` before T031 can extend it)

### Key Parallel Opportunities Within Stories

```bash
# Phase 1 parallel batch:
T002 tsconfig.base.json  +  T003 .gitignore
T005 shared/tsconfig.json  +  T007 backend/tsconfig.json  +  T009 frontend/tsconfig.json

# Phase 2 parallel batch:
T010 contact.ts  +  T011 config.ts  +  T012 connection.ts

# US1 parallel batch:
T019 Chat.tsx  +  T020 Focus.tsx  +  T021 Timer.tsx  +  T022 Notes.tsx

# US3 parallel batch:
T035 api.ts  +  T036 ContactList.tsx
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Complete Phase 3 (US1 — navigation shell)
3. **STOP and validate**: app loads, 4 tabs work, Notes text survives tab switch
4. Proceed to US2 when US1 is verified

### Incremental Delivery

1. Phase 1 + 2 → scaffold compiles, both servers start
2. + US1 → visible app with working navigation (demo-able)
3. + US2 → WhatsApp QR scan works (functional milestone)
4. + US3 → configurable contact list (Phase 1 feature complete)
5. + Polish → ready for Phase 2 feature work

---

## Notes

- `[P]` tasks within a phase can be started simultaneously — they touch different files
- US1 and the backend portion of US2 (T025–T028) can be developed in parallel since they don't share files
- T030 depends on T029 (`ws.ts` hook must exist before Chat uses it)
- T031 extends T025 — do not start T031 until T025 is complete
- T036 (`ContactList.tsx`) is presentational and can be built before the API is wired; wiring happens in T037
