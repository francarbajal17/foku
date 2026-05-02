# Quickstart: Phase 1 — Foundation

**Branch**: `001-foundation-monorepo-setup`

---

## Prerequisites

- Node.js 20 LTS or later
- npm 10+
- A WhatsApp account accessible on a phone for QR scanning

---

## Installation

```bash
# From the project root
npm install
```

This installs dependencies for the root workspace and all packages (`frontend`, `backend`).

---

## Running in Development

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend**: `http://localhost:3001` (Express + Baileys)
- **Frontend**: `http://localhost:5173` (Vite dev server)

Open `http://localhost:5173` in your browser.

---

## First Launch (QR Scan)

1. Open `http://localhost:5173`.
2. Navigate to the **Chat** section.
3. A QR code appears within ~5 seconds.
4. Open WhatsApp on your phone → **Linked Devices** → **Link a Device**.
5. Scan the QR code.
6. The app shows "Connected" and the QR disappears.

The session is saved to `wa_auth/`. Subsequent launches skip the QR step.

---

## Verifying the Navigation Shell

After the app loads (QR scan not required for this check):

1. Click each of the four tabs: **Chat**, **Focus**, **Timer**, **Notes**.
2. Each section should render its placeholder content.
3. Typing in **Notes** and switching to another tab and back should preserve the text.

---

## Configuring the Contact List

1. Ensure WhatsApp is connected (QR scanned).
2. Open the **Chat** section.
3. Click **"Editar lista"** (or the contacts management UI).
4. Your WhatsApp contacts and groups are listed.
5. Toggle contacts on/off — changes save immediately.
6. Restart the app (`Ctrl+C`, then `npm run dev`) and verify toggles persist.

---

## Resetting WhatsApp Session

To force a new QR scan (e.g., after logging out on your phone):

```bash
rm -rf wa_auth/
npm run dev
```

---

## Environment Variables

No environment variables are required for Phase 1. All configuration is in `config.json`
(auto-created on first run) and `wa_auth/` (auto-created on first QR scan).

---

## Build (optional)

```bash
npm run build
```

Compiles the TypeScript backend and bundles the Vite frontend to `frontend/dist/`.
Not required for development.
