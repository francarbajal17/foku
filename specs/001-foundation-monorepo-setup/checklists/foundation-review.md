# Requirements Review Checklist: Phase 1 — Foundation

**Purpose**: Cross-artifact requirements quality review covering spec.md, plan.md, and
contracts/api.md. Emphasis on WhatsApp connection lifecycle and navigation state
preservation requirements.
**Created**: 2026-05-02
**Reviewed**: 2026-05-02
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [contracts/api.md](../contracts/api.md)
**Depth**: Standard | **Audience**: Author (pre-task gate) | **Focus**: WA lifecycle + navigation state

---

## WhatsApp Connection Lifecycle Requirements

- [x] CHK001 - Is the UI state fully specified for the window between `connection:open` firing and the contact list finishing its async sync? → FR-007 define loading indicator; cubierto.
- [x] CHK002 - Is "the connection is immediately active" quantified with a specific time bound? → US2 Escenario 3 actualizado a 10 segundos desde apertura de pestaña.
- [x] CHK003 - Does the spec define whether reconnection after disconnection is automatic, user-triggered, or both? → FR-011: automático, hasta 3 reintentos silenciosos.
- [x] CHK004 - Is the distinction between "session expired" and "session invalid" in FR-006 defined with observable criteria? → FR-006 actualizado: loggedOut = borrar sesión y mostrar QR; errores transitorios = reintentar.
- [x] CHK005 - Are error state requirements for "no internet on first launch" specific enough? → Edge Cases: mensaje inline en área de Chat, resto de la app accesible.
- [x] CHK006 - Is the failure mode specified for QR expiry when backend can't reach WhatsApp? → Cubierto por FR-011 (disconnect dispara lógica de reintento).
- [x] CHK007 - Does the spec define a maximum wait time before falling back to QR flow for existing sessions? → FR-005: si no conecta en 10 segundos, borrar sesión y mostrar QR.
- [x] CHK008 - Are requirements defined for browser-tab lifecycle events? → wsServer.ts envía estado actual al reconectar; cubierto por diseño (T026).
- [x] CHK009 - Is there a requirement for what the frontend displays in the `connecting` state? → T030 define texto "Conectando..." durante estado connecting.
- [x] CHK010 - Does the spec define whether contact list retrieval is triggered automatically? → FR-007 voz pasiva + T037 fetch on mount; automático al conectar.

---

## Navigation State Preservation Requirements

- [x] CHK011 - Is "in-section state" defined exhaustively for each module? → Aceptable para Phase 1: placeholders tienen estado mínimo; Notes es el único stateful.
- [x] CHK012 - Are visual requirements for active vs. inactive tabs specified? → Decisión de implementación (CSS class); aceptable para tool personal.
- [x] CHK013 - Is SC-007 "no visible side effects" defined with a criterion? → display:none previene efectos visuales cross-section por diseño.
- [x] CHK014 - Is behavior specified for browser hard-refresh (F5) vs tab-switching? → Assumptions: estado in-memory; F5 = restart, aceptado explícitamente.
- [x] CHK015 - Is "immediately reflects the new state" quantified? → SC-005 cubre el bound de <1 segundo para persistencia; UI update es síncrono.
- [x] CHK016 - Are requirements defined for navigating away during an in-flight background op? → Request continúa en background; aceptable para tool personal.

---

## Requirement Completeness

- [x] CHK017 - Is the "manually refreshable" contact list backed by any functional requirement? → FR-012 y POST /api/contacts/refresh agregados.
- [x] CHK018 - Are there requirements for config.json schema validation on startup? → configService.ts (T014) inicializa defaults si falta o está corrupto.
- [x] CHK019 - Is there a functional requirement covering the @foku/shared type boundary? → plan.md define exhaustivamente qué va en shared/; suficiente para un solo dev.
- [x] CHK020 - Are error handling requirements defined for config.json write failure? → Atomic write (temp + rename) en T014; fallo silencioso aceptable para tool personal.
- [x] CHK021 - Does the spec define a requirement for displaying the WhatsApp account identity? → FR-013 agregado: mostrar nombre (push name), no número.

---

## Cross-Artifact Consistency

- [x] CHK022 - Does GET /api/contacts satisfy FR-007's "retrieve and display the user's full list"? → Lista merged con enabled state es la representación completa; consistente.
- [x] CHK023 - Does SC-004 ("100% of contacts") align with async contact population? → "100%" aplica a contactos disponibles en el store al momento de la consulta.
- [x] CHK024 - Is the 10-second QR display bound defined from the same start point? → Actualizado a 10s desde apertura de pestaña en FR-003, SC-002, SC-003, US2.
- [x] CHK025 - Does contracts/api.md define GET /api/contacts response when connected but contacts still loading? → 202 Accepted con `{ "status": "loading" }` agregado al contrato.
- [x] CHK026 - Is PATCH /api/config/contacts behavior specified for unknown JIDs? → JIDs desconocidos se aceptan silenciosamente; aceptable para tool personal.

---

## Acceptance Criteria Measurability

- [x] CHK027 - Is SC-001 measurable from a defined start point? → "10 segundos desde que el browser abre la pestaña" — claro.
- [x] CHK028 - Is SC-003 testable beyond a single restart? → Una verificación de persistencia post-restart es suficiente para tool personal.
- [x] CHK029 - Are SC-001 through SC-007 sufficient to declare Phase 1 complete? → SC-008 agregado: interfaz de contactos transiciona de loading a lista sin errores.
- [x] CHK030 - Is SC-006 "100% accuracy" testable for a large contact list? → Verificar muestra representativa (5–10 toggles) es suficiente para tool personal.

---

## Dependencies & Assumptions

- [x] CHK031 - Is the "internet connectivity" assumption connected to the edge case? → Edge Cases actualizado en clarify: inline error + resto de app accesible.
- [x] CHK032 - Is the "no migration strategy" assumption scoped to Phase 1? → Assumptions dice "in this phase" — scoped correctamente.

---

## Resultado Final

**32/32 items ✅ — Checklist completo. Listo para `/speckit-implement`.**
