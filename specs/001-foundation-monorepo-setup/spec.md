# Feature Specification: Phase 1 — Foundation

**Feature Branch**: `001-foundation-monorepo-setup`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Phase 1 - Foundation: monorepo scaffold with React + Vite + Express + TypeScript, Baileys WhatsApp connection with QR auth, contact list retrieval, configurable contact list with config.json persistence, and basic four-module navigation layout. See constitution.md Phase 1 for full details."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Four-Module Navigation Layout (Priority: P1)

Francisco opens the Foku app and sees a working application with four clearly labeled
sections: Chat, Focus, Timer, and Notes. He can click between them freely. Each section
shows a placeholder or initial empty state. No state is lost when switching between
sections — if he had typed something in Notes and switches to Timer, returning to Notes
shows his text unchanged.

**Why this priority**: This is the skeleton of the entire application. All other features
depend on the navigation shell being in place. Without it, nothing else is deliverable.

**Independent Test**: Launch the app, verify all four sections are accessible via the
navigation bar, click between them, confirm switching does not reset in-section state.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** Francisco opens it in a browser, **Then** he sees a navigation bar with Chat, Focus, Timer, and Notes tabs.
2. **Given** he is on any section, **When** he clicks another tab, **Then** the new section becomes active and the previous section's state is preserved.
3. **Given** he is on Notes and types text, **When** he navigates to Timer and back, **Then** the text he typed is still present.

---

### User Story 2 — WhatsApp Connection via QR Code (Priority: P2)

Francisco opens Foku for the first time. He is presented with a QR code. He scans it
with his phone's WhatsApp app. The app confirms it is connected and the QR code
disappears. The next time he opens Foku, he does not need to scan again — the connection
is already established from the previous session.

**Why this priority**: WhatsApp connectivity is the foundation of the Chat module, which
is Foku's primary value proposition. This must work before any messaging feature can
be built.

**Independent Test**: Run the app fresh (no saved session), verify QR code appears,
scan it, verify connection confirmed, restart the app, verify no QR code is shown.

**Acceptance Scenarios**:

1. **Given** no previous session exists, **When** Francisco opens the browser tab, **Then** a QR code is displayed within 10 seconds.
2. **Given** a QR code is displayed, **When** Francisco scans it with WhatsApp on his phone, **Then** the app shows a "connected" state and the QR code is no longer visible.
3. **Given** a session was established in a previous run, **When** Francisco opens the browser tab, **Then** no QR code is shown and the connection is active within 10 seconds.
4. **Given** a QR code is displayed, **When** it expires before being scanned, **Then** a new QR code is automatically generated and displayed.

---

### User Story 3 — Configurable WhatsApp Contact List (Priority: P3)

Francisco opens the contact management interface inside Foku. He sees all his WhatsApp
contacts and groups. He toggles specific ones on or off to build a curated list. When he
restarts the app, his selection is exactly as he left it — the preference persists.

**Why this priority**: The configurable list is a prerequisite for the Chat module's
"Conversar" popup. It also establishes the persistence model (`config.json`) used by
other modules (pinned videos, notes).

**Independent Test**: Open the contact management UI, toggle a contact, close the app,
reopen it, verify the toggle state is unchanged.

**Acceptance Scenarios**:

1. **Given** an active WhatsApp connection, **When** Francisco opens the contact management interface, **Then** all his WhatsApp contacts and groups are listed with their names.
2. **Given** the contact list is visible, **When** he toggles a contact on or off, **Then** the UI immediately reflects the new state.
3. **Given** he has toggled several contacts, **When** he restarts the app, **Then** every toggle state is exactly as he left it.
4. **Given** a contact has been toggled off, **When** Francisco later toggles it back on, **Then** the change is saved and persists across restarts.

---

### Edge Cases

- What happens when the app starts but has no internet connection? The app MUST display an inline error message in the WhatsApp connection area (e.g., "No internet connection. Check your network and restart.") rather than silently hanging. The rest of the app (Timer, Notes, Focus placeholders) MUST remain accessible.
- What if the saved session file becomes corrupted or invalid? The app MUST gracefully fall back to showing the QR code flow rather than crashing.
- What if the contact list is empty (brand new WhatsApp account)? The contact management interface MUST display an empty state message rather than a blank screen.
- What happens when WhatsApp disconnects while the app is already running? The app MUST automatically attempt to reconnect silently (up to 3 attempts). If all attempts fail, the app MUST display a persistent error indicator without requiring a full page reload. No user action is needed for transient disconnections.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a persistent navigation bar with exactly four sections: Chat, Focus, Timer, and Notes.
- **FR-002**: The app MUST allow navigation between all four sections without resetting in-section state (timers keep running, text fields retain content).
- **FR-003**: On first launch (no existing session), the app MUST display a WhatsApp QR code within 10 seconds of the browser tab opening.
- **FR-004**: After QR code is scanned, the app MUST confirm the connected state visually and stop displaying the QR code.
- **FR-005**: The app MUST persist the WhatsApp session so that subsequent launches do not require re-scanning the QR code. If an existing session fails to connect within 10 seconds of app start, the app MUST treat it as invalid, delete the stored session, and fall back to the QR code flow.
- **FR-006**: If the saved session is permanently invalidated (e.g., the user logged out from another device), the app MUST delete the stored session and show the QR code flow. For transient disconnections (network issues, server restarts), the app MUST retry using the existing session without showing the QR code.
- **FR-007**: When connected to WhatsApp, the app MUST display a loading indicator while the contact list is being retrieved. Once retrieval is complete, the full list of contacts and groups MUST be displayed. The loading indicator MUST NOT be shown after the list is ready. If the backend pushes a `contacts_updated` WebSocket event after the initial load (e.g., when WhatsApp sends push names asynchronously), the frontend MUST silently re-fetch and update the displayed list without showing the loading indicator again.
- **FR-008**: The user MUST be able to toggle any contact or group on or off in the configurable list.
- **FR-009**: The configured contact selection MUST be written to persistent storage immediately on change.
- **FR-010**: On every launch, the app MUST restore the contact selection exactly as it was at the end of the previous session.
- **FR-011**: When the WhatsApp connection is lost unexpectedly, the app MUST automatically attempt to reconnect silently up to 3 times. If all retries fail, it MUST display a persistent error indicator. No user-triggered "Reconnect" button is required — recovery is fully automatic.
- **FR-012**: The contact management interface MUST provide a "Refresh" action that re-fetches the contact list from WhatsApp without requiring an app restart. The loading indicator (FR-007) MUST be shown during the refresh.
- **FR-013**: When connected, the app MUST display the WhatsApp account name (push name) in the connection area — e.g., "Conectado como Francisco". The phone number MUST NOT be shown.
- **FR-014**: Contact and group names MUST display the human-readable WhatsApp name, resolved in this priority order: address-book name (`name`) → push name (`notify`) → verified name (`verifiedName`) → conversation name (`chat.name`). A raw phone number MUST only appear as a last resort when none of the above is available. A real name already stored in the cache MUST NOT be overwritten by a phone-number fallback.

### Key Entities

- **Section**: One of the four named areas of the app (Chat, Focus, Timer, Notes). Has a label and an active/inactive state. Switching sections preserves the inactive section's in-memory state.
- **WhatsApp Session**: The authentication credential that allows the app to communicate with WhatsApp. Persisted to disk after first QR scan. Loaded on startup to skip re-authentication.
- **Contact / Group**: A WhatsApp conversation participant. Has a unique identifier and a display name. Can be enabled or disabled by the user.
- **App Configuration**: The user's persistent settings. Initially contains the contact/group selection. Stored in a single local file. Loaded on startup; written on every user-triggered change.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Francisco can launch the app and navigate across all four sections within 10 seconds of the browser opening.
- **SC-002**: On first launch, the WhatsApp QR code is displayed within 10 seconds of the browser tab opening.
- **SC-003**: After one QR scan, Francisco never needs to scan again on any subsequent launch (until WhatsApp invalidates the session externally). The connection MUST be active within 10 seconds of the browser tab opening when resuming an existing session.
- **SC-004**: The contact management interface shows 100% of the contacts and groups visible in Francisco's WhatsApp account, each displayed with their human-readable name (not a raw phone number) whenever WhatsApp provides one.
- **SC-005**: A contact toggle change takes effect and is confirmed as persisted in under 1 second.
- **SC-006**: After restarting the app, the contact selection matches the state at the end of the previous session with 100% accuracy.
- **SC-007**: No action in one navigation section causes visible side effects in another section (timer does not reset, notes text does not clear).
- **SC-008**: After establishing a WhatsApp connection, the contact management interface successfully transitions from loading state to displaying the full contact and group list without errors.

---

## Assumptions

- Francisco's WhatsApp account is active and accessible on his phone for QR scanning.
- The app runs on Francisco's local machine only; no network exposure or port-forwarding is assumed.
- The app is launched via a local development server (no packaging or installer required for this phase).
- Internet connectivity is available during QR scanning and initial contact retrieval.
- A single `config.json` file at a known location is sufficient for all persistence needs in this phase; no migration strategy is required.
- The contact list does not need real-time updates in this phase — it is fetched once on connection and can be manually refreshed via a UI action (FR-012).
- WhatsApp session invalidation (e.g., logging out from another device) is an acceptable edge case that results in a graceful fallback to QR re-scan, not an error condition the app must proactively prevent.

---

## Clarifications

### Session 2026-05-02

- Q: When WhatsApp disconnects unexpectedly, should reconnection be automatic, user-triggered, or both? → A: Automatic only — silently retry up to 3 times; show persistent error indicator only after all retries fail. No user-triggered reconnect button needed.
- Q: What should the contact management UI show while contacts are loading after connection? → A: A loading spinner/indicator; display the full list only once retrieval is complete.
- Q: What UI treatment should the "no internet on startup" error state use? → A: Inline message in the WhatsApp connection area only; the rest of the app remains accessible.
- Q: Should existing-session reconnection have a defined time bound? → A: Yes — 10 seconds from browser tab opening, applied to FR-003, SC-002, SC-003, and US2 Scenarios 1 and 3. Adjustable after real-world testing.
- Q: Is manual contact list refresh a Phase 1 requirement or deferred? → A: Phase 1 — a "Refresh" action re-fetches contacts without restart (added as FR-012).
