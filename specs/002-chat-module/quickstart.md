# Quickstart: Phase 2 — Chat Module

**Feature**: 002-chat-module
**Date**: 2026-05-04
**Prerequisite**: Phase 1 fully working (WhatsApp connected, at least one contact enabled)

---

## Prerequisites

Before testing Phase 2:

1. Phase 1 is complete and the app runs: `npm run dev` from repo root
2. WhatsApp is connected (no QR code shown in Chat tab)
3. At least two contacts are enabled in the contact list (one individual, one group recommended)
4. You have access to a second device (phone or another WhatsApp account) to send test messages

---

## Step-by-Step Manual Test

### US1 — Open a Conversation

1. Start the app: `npm run dev`
2. Open `http://localhost:5173` in Chrome
3. Click the **Chat** tab
4. Verify the **"Conversar"** button is visible (WhatsApp must be connected)
5. Click **"Conversar"**
6. **Expected**: A popup appears listing only the contacts you have enabled
7. Click any individual contact from the list
8. **Expected**: The popup closes; a loading indicator appears briefly; the conversation view opens with up to 100 messages shown (oldest at top, newest at bottom)
9. Verify sent messages (fromMe) are visually distinct from received messages
10. ✅ US1 verified

**Edge case — no enabled contacts**:
- Disable all contacts via the Phase 1 contact list toggle
- Open "Conversar"
- **Expected**: Empty state message visible with a prompt to use "Editar lista"

---

### US1 — "Editar lista" from Conversar Popup

1. Click **"Conversar"**
2. Click **"Editar lista"** inside the popup
3. **Expected**: Contact configuration opens as a second overlay on top of the Conversar popup
4. Toggle a contact on or off
5. Click the back/close button on the configuration overlay
6. **Expected**: Returns to the Conversar contact list (popup still visible); the list reflects the change just made
7. ✅ Editar lista navigation verified

---

### US2 — Send a Text Message

1. Open a conversation (follow US1 steps)
2. Type a short message in the text input at the bottom
3. Press Enter or click Send
4. **Expected**: Input field clears; your message appears at the bottom of the conversation as a sent message
5. Verify on the other device that the message was received
6. **Edge case — empty message**: Click Send without typing anything → nothing happens, no error

✅ US2 verified

---

### US3 — Receive Real-Time Messages (User at Bottom)

1. Open a conversation with the test contact
2. Scroll to the bottom of the conversation (if not already there)
3. Have the test contact send a message from their phone
4. **Expected**: Within 2 seconds, the new message appears at the bottom of the conversation; the view auto-scrolls to it
5. ✅ Real-time delivery at bottom verified

**US3 — New Message Indicator (User Scrolled Up)**:

1. Open a conversation with many messages (>20)
2. Scroll to the top of the conversation
3. Have the test contact send a message from their phone
4. **Expected**: The view stays at the current scroll position; a **"new message"** indicator appears
5. Click the indicator
6. **Expected**: View scrolls to the newest message; indicator disappears
7. ✅ Scroll behavior verified

**US3 — Listener teardown**:

1. Open a conversation
2. Close it (click back/close)
3. Have the test contact send a message
4. **Expected**: No message appears anywhere in Foku; no notification
5. ✅ Listener teardown verified

---

### US4 — View Photos and Audio Inline

**Find a test conversation** that contains at least one photo, one audio message, and one other media type (e.g., a PDF document or sticker).

1. Open that conversation via Conversar
2. Scroll through the messages
3. **Photo**: Verify the photo is displayed as an inline image within the message bubble
4. **Audio**: Verify an audio player (play/pause button) appears inline; click play and hear audio
5. **Other media**: Verify a placeholder label ("Document", "Sticker", etc.) appears instead of attempting to render the file
6. Verify surrounding text messages remain readable with no layout breaks
7. ✅ US4 verified

**Edge case — broken photo**:
- If a photo fails to load (network issue, expired URL): a broken-image placeholder appears instead of a blank space

---

### Disconnection Behavior

1. Open a conversation
2. Disconnect from the internet (or kill the backend and restart without WhatsApp connecting)
3. **Expected**: An inline disconnection banner appears at the top of the conversation view; existing messages remain readable
4. Try to send a message while disconnected
5. **Expected**: An inline error appears on that message; the message is not sent
6. The conversation view does NOT auto-close
7. ✅ Disconnection behavior verified

---

## Ephemeral Nature Verification

1. Open a conversation; note the messages shown
2. Close the conversation (back button)
3. Reopen the same conversation
4. **Expected**: A fresh history fetch occurs (loading indicator shown); the messages list is fully re-fetched from WhatsApp — no cached messages from the previous session
5. Check that no new files were created in the repo directory between open and close:
   ```bash
   ls -la   # No new .json or media files should appear
   ```
6. ✅ SC-005, SC-006 verified

---

## Success Criteria Checklist

| Criterion | Test | Expected |
|-----------|------|----------|
| SC-001: History visible <3s | Time from contact tap to first message | <3 seconds |
| SC-002: Real-time messages <2s | Stopwatch from phone send to Foku display | <2 seconds |
| SC-003: Sent message appears <2s | Stopwatch from Send tap to conversation display | <2 seconds |
| SC-004: All messages accessible | Scroll through all 100 messages | No gaps |
| SC-005: Zero disk writes | `ls -la` before and after conversation | No new files |
| SC-006: Fresh fetch on reopen | Open same conversation twice | Different loading sequence each time |
