# Feature Specification: Phase 2 — Chat Module

**Feature Branch**: `002-chat-module`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "Phase 2 - Chat Module, use constitution.md file to check what must be implemented"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open a Conversation (Priority: P1)

The user opens the Chat module and sees a single "Conversar" button. Tapping it reveals a popup showing only the contacts and groups they have previously enabled in their contact list. The user selects one and a conversation view opens, showing recent message history while a loading indicator is displayed during fetch.

**Why this priority**: This is the entry point to the entire Chat feature. Without this flow, no other story is reachable. Delivering this alone already gives the user read-only access to any WhatsApp conversation, which is the core ephemeral use case.

**Independent Test**: Open the Chat module → tap "Conversar" → verify the popup lists only enabled contacts → select any contact → verify a loading state appears, then up to 100 messages are shown in chronological order (oldest top, newest bottom), with sent and received messages visually distinct.

**Acceptance Scenarios**:

1. **Given** the user is on the Chat module with WhatsApp connected, **When** they tap "Conversar", **Then** a popup opens showing only contacts and groups that have been enabled in the configuration.
2. **Given** the Conversar popup is open, **When** the user selects a contact or group, **Then** the popup closes and a conversation view opens with a loading indicator while history loads.
3. **Given** message history has loaded, **When** the conversation view is displayed, **Then** up to 100 messages appear in chronological order with the oldest at the top and newest at the bottom.
4. **Given** the conversation view is open, **When** the user's own sent messages are shown, **Then** they are visually distinct from received messages.
5. **Given** the Conversar popup is open, **When** there are no enabled contacts, **Then** the popup displays an empty state message indicating the list is empty and directing the user to "Editar lista".

---

### User Story 2 — Send a Text Message (Priority: P2)

While viewing an open conversation, the user types a text message and sends it. The message appears in the conversation immediately after sending.

**Why this priority**: Sending messages is the natural complement to reading them. Once the conversation view exists, adding send capability completes the core two-way chat experience. It is P2 because read-only access (US1) is independently valuable and must be stable first.

**Independent Test**: Open a conversation with a known contact → type a short message → submit → verify the message appears in the conversation view → verify the contact receives the message on their device (WhatsApp phone check).

**Acceptance Scenarios**:

1. **Given** a conversation is open, **When** the user types text in the input field and submits, **Then** the message appears in the conversation and the input field is cleared.
2. **Given** a conversation is open, **When** the user submits an empty message, **Then** nothing is sent and the input field remains as-is.
3. **Given** the user has sent a message, **When** the message appears in the conversation, **Then** it is visually presented as a sent message (consistent with US1's visual distinction).

---

### User Story 3 — Receive Real-Time Messages (Priority: P3)

While a conversation is open, any new messages sent by the other party appear automatically in the conversation view without the user needing to do anything.

**Why this priority**: Real-time updates transform the experience from a static history viewer into a live chat. It is P3 because it requires a stable conversation view (US1) and benefits from the full send/receive cycle (US2) to be testable end-to-end.

**Independent Test**: Open a conversation → have the contact send a message from their phone → verify the message appears in the Foku conversation view within 2 seconds without any manual action.

**Acceptance Scenarios**:

1. **Given** a conversation is open and the user is at the bottom, **When** the selected contact sends a new message, **Then** the message appears at the bottom of the conversation within 2 seconds and the view auto-scrolls to it.
2. **Given** a conversation is open and the user is scrolled up reading older messages, **When** the selected contact sends a new message, **Then** the view stays at the current scroll position and a "new message" indicator appears; tapping it scrolls to the newest message and dismisses the indicator.
3. **Given** a conversation has just been opened, **When** a new message arrives before the history has fully loaded, **Then** the new message is included when the history is displayed.
4. **Given** the user closes a conversation, **When** the contact sends a new message, **Then** the message does NOT appear anywhere in Foku (no background listener, no notification).

---

### User Story 4 — View Photos and Audio Inline (Priority: P4)

Photos received or sent in the conversation are displayed as inline images. Audio messages are shown with a play/pause control so the user can listen without leaving Foku. All other media types (documents, video files, stickers, etc.) show a text placeholder indicating the media type.

**Why this priority**: Text-only chat covers the majority of daily use. Media support significantly enriches the experience but is not blocking for the core chat flow. It is scoped to display only (no sending of media from Foku).

**Independent Test**: Find a conversation containing a photo message, an audio message, and another media type (e.g., a document) → open the conversation → verify the photo is visible inline, the audio message has a playable player, and the document shows a placeholder label.

**Acceptance Scenarios**:

1. **Given** a conversation contains a photo message, **When** the conversation view is displayed, **Then** the photo is rendered inline as an image within the message bubble.
2. **Given** a conversation contains an audio message, **When** the conversation view is displayed, **Then** a minimal audio player (play/pause) appears inline; tapping play starts audio playback.
3. **Given** a conversation contains a non-photo, non-audio media message (document, video file, sticker, etc.), **When** the conversation view is displayed, **Then** a placeholder is shown indicating the media type (e.g., "Document", "Video", "Sticker") without attempting to render it.
4. **Given** a photo or audio message, **When** it is rendered inline, **Then** the surrounding text messages remain readable and the layout does not break.

---

### Edge Cases

- What happens when WhatsApp is not connected when the user taps "Conversar"? The popup should not open; the Chat module should show the existing disconnected/connecting state from Phase 1.
- What happens if the contact list has zero enabled contacts? The Conversar popup shows an empty state and a prompt to configure contacts via "Editar lista".
- What happens if a conversation has fewer than 100 messages? All available messages are shown with no error.
- What happens if message history fails to load (network issue)? The conversation view shows an error state with a retry option instead of showing an empty conversation.
- What happens if the user sends a message and the connection drops mid-send? The user sees an error indication on the failed message (no silent failure).
- What happens with very long text messages? They wrap within the message bubble without overflowing or truncating.
- What happens when a photo fails to load? A broken-image placeholder is shown instead of a blank space.
- What happens if WhatsApp disconnects while a conversation is open? An inline disconnection banner appears at the top of the conversation view; the user can continue reading the already-loaded messages but cannot send. Any send attempt while disconnected shows an inline error on that message. The conversation does not auto-close.

---

## Clarifications

### Session 2026-05-04

- Q: If WhatsApp disconnects while a conversation is open, what should happen? → A: Show an inline disconnection banner at the top of the conversation; allow reading existing messages; block sending with an inline error on attempt (do not auto-close the conversation).
- Q: When the user taps "Editar lista" inside the Conversar popup, what is the navigation pattern? → A: Contact configuration opens as a second overlay on top of the Conversar popup; closing the configuration overlay returns the user directly to the Conversar contact list.
- Q: When a new real-time message arrives and the user is scrolled up reading older messages, what happens? → A: Auto-scroll only if the user is already at the bottom; if scrolled up, keep position and show a "new message" indicator the user can tap to jump to the bottom.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Chat module MUST display a single prominent "Conversar" button as its primary action when WhatsApp is connected.
- **FR-002**: Tapping "Conversar" MUST open an overlay popup listing only the contacts and groups the user has enabled in their configuration.
- **FR-003**: The Conversar popup MUST include an "Editar lista" option. Tapping it MUST open the contact configuration view (from Phase 1) as a second overlay on top of the Conversar popup. Closing the configuration overlay MUST return the user to the Conversar contact list.
- **FR-004**: Selecting a contact or group from the Conversar popup MUST open a conversation view for that selection.
- **FR-005**: The conversation view MUST fetch and display up to the most recent 100 messages for the selected conversation.
- **FR-006**: The conversation view MUST display a loading state while message history is being retrieved.
- **FR-007**: Messages MUST be displayed in chronological order: oldest at the top, newest at the bottom.
- **FR-008**: Messages sent by the user MUST be visually distinct from messages received from the other party.
- **FR-009**: The user MUST be able to type plain text in an input field within the conversation view and submit it as a message.
- **FR-010**: After a message is successfully sent, the input field MUST be cleared and the sent message MUST appear in the conversation.
- **FR-011**: Submitting an empty message MUST be a no-op (nothing sent, no error shown).
- **FR-012**: While a conversation is open, new incoming messages for that conversation MUST appear automatically at the bottom of the conversation without user action. If the user is already scrolled to the bottom, the view MUST auto-scroll to show the new message. If the user is scrolled up, the view MUST remain at the current position and display a "new message" indicator; tapping the indicator MUST scroll the view to the newest message and dismiss the indicator.
- **FR-013**: When a conversation is closed, the system MUST stop receiving updates for it. No message data from that conversation is retained anywhere.
- **FR-014**: Photo messages MUST be rendered as inline images within their message bubble.
- **FR-015**: Audio messages MUST be rendered with an inline play/pause control allowing playback without leaving the conversation.
- **FR-016**: Media messages that are not photos or audio (documents, video files, stickers, and any other types) MUST display a text placeholder label indicating the media type.
- **FR-017**: The system MUST NOT write any message content, conversation history, or media to disk at any time. All chat data is in-memory only and discarded when the conversation closes.
- **FR-018**: The "Conversar" button MUST NOT be shown (or MUST be disabled) when WhatsApp is not in the connected state.
- **FR-019**: If WhatsApp disconnects while a conversation is open, the conversation view MUST remain visible with all already-loaded messages readable. An inline disconnection banner MUST appear at the top of the view. The conversation MUST NOT auto-close.
- **FR-020**: While the disconnection banner is shown, any attempt to send a message MUST display an inline error on that message (no silent failure). The message MUST NOT be transmitted.

### Key Entities

- **Conversation**: An ephemeral session between the user and a selected contact or group. Has a start (open), a lifetime (active listener), and an end (close). Contains an ordered sequence of messages. Never persisted.
- **Message**: A single unit of communication within a conversation. Has a direction (sent by user or received), a timestamp, a content type (text, photo, audio, other media), and content. Never persisted.
- **Enabled Contact List**: The subset of WhatsApp contacts and groups the user has toggled on in the Phase 1 configuration. Shown inside the Conversar popup. Persisted in the app configuration (Phase 1 concern).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A conversation opens and message history is visible within 3 seconds of the user selecting a contact (measured from tap to first message displayed).
- **SC-002**: New incoming messages appear in an open conversation within 2 seconds of being sent by the other party.
- **SC-003**: A sent text message appears in the conversation view within 2 seconds of the user submitting it.
- **SC-004**: When a conversation is opened, all available messages up to 100 are accessible by scrolling (no messages silently omitted).
- **SC-005**: Zero message content is written to disk at any point during or after a conversation session (verifiable by inspecting all files on disk before and after a conversation).
- **SC-006**: Closing a conversation and reopening it with the same contact fetches a fresh history (confirms ephemeral nature — no cached messages used).

---

## Assumptions

- WhatsApp is already authenticated and connected before the user enters the Chat module (Phase 1 prerequisite — the Chat module shows the connection state from Phase 1 when not connected).
- The contact list configuration (which contacts are enabled) is fully managed by Phase 1 and is available to Phase 2 as a read-only source for the Conversar popup.
- Outgoing messages are plain text only — no image, audio, or file attachments can be sent from Foku in Phase 2.
- No message status indicators (sent, delivered, read) are required.
- No background listeners are maintained when a conversation is closed — Foku receives no notifications for messages in closed conversations.
- The 100-message limit is the full scope for Phase 2 — no infinite scroll or pagination is required.
- "Editar lista" inside the Conversar popup opens the existing Phase 1 contact toggle UI. No new contact management UI is built in Phase 2.
- The conversation view is opened exclusively through the Conversar popup — there is no other navigation path to open a chat.
- Group conversations are treated identically to individual conversations for messaging purposes (same fetch, display, and send behavior).
- Audio playback is in-app only; the user does not need to download or export audio files.
