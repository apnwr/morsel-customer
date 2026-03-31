# Session Flow & Space Switching

How the app manages user sessions from QR scan to menu, and how it handles switching between different restaurants/spaces.

---

## Architecture Overview

### Provider Hierarchy (app/layout.tsx)

```
FirebaseAuthProvider
  └─ SessionProvider        ← session state + localStorage persistence
      └─ RestaurantProvider  ← restaurant/branch/table context
          └─ CartProvider    ← cart state + API queue sync
              └─ OrderProvider
                  └─ SplitProvider
```

### Session Types

| Type | Storage | Purpose |
|------|---------|---------|
| **Preview Session** | React state only (ephemeral) | Space/business info shown before user joins |
| **Active Session** | React state + localStorage | Full session data after user joins via LoginModal |

### localStorage Keys

| Key | Set When | Cleared When |
|-----|----------|--------------|
| `morsel_session_data` | LoginModal submit | `clearSession()` |
| `morsel_session_user_id` | LoginModal submit | `clearSession()` |
| `morsel_active_order_id` | Order placed | `clearSession()` |
| `morsel_customer_name` | LoginModal submit | `clearSession()` |
| `morsel_dining_type` | LoginModal submit | `clearSession()` |
| `morsel_auth_method` | LoginModal submit | `clearSession()` |
| `morsel_restaurant_context` | LoginModal submit | `clearSession()` |

---

## Flow: QR Scan to Menu

```
User scans QR code (e.g. https://app.morsel.com/space/abc123)
  │
  ▼
/space/[spaceId] page loads
  │
  ├─ Has active session for SAME space?
  │    └─ YES → redirect to /menu (back-button case)
  │
  ├─ Has active session for DIFFERENT space?
  │    └─ YES → endSession('left') + clearCart()
  │             → clears all localStorage keys
  │             → falls through to fetch new space ▼
  │
  ├─ No active session
  │    └─ falls through to fetch new space ▼
  │
  ▼
GET /ordering-session/space/{spaceId}
  │
  ├─ Invalid space or business → show error
  ├─ Session exists but not 'active' → show error
  │
  ▼
Store as preview session (ephemeral, not in localStorage)
Show LoginModal with restaurant branding
  │
  ▼
User enters name, taps "Continue as Guest"
  │
  ▼
POST /ordering-session/start { spaceId, guestName }
  │  (backend creates or joins existing session)
  │
  ▼
Save to localStorage:
  - morsel_session_user_id (from participants array)
  - morsel_session_data (full session object)
  - morsel_customer_name, morsel_dining_type, morsel_auth_method
  - morsel_restaurant_context (restaurant/branch/table)
  │
  ▼
router.replace('/menu')
```

---

## Space Switching (QR Re-Scan)

When a user scans a new QR code while already in an active session, the app detects whether it's the **same space** or a **different space**.

### Same Space
User is redirected to `/menu` immediately. This handles the back-button case where the user navigates back to the space page — they shouldn't see the LoginModal again.

### Different Space
The old session is cleaned up before proceeding:

1. `endSession('left')` is called
   - Calls `PUT /ordering-session/session/{id}/end` with reason `'left'`
   - Then calls `clearSession()` which wipes all localStorage keys
2. `clearCart()` empties the cart and syncs an empty queue to the API
3. The page proceeds to fetch the new space data and shows the LoginModal

### Failure Handling
If the `endSession` API call fails (e.g. network error), `clearSession()` is still called in the catch block — local data is always cleaned up. The new space flow proceeds regardless.

---

## Session Validation (Protected Pages)

Pages like `/menu`, `/cart`, and `/orders` use `useSessionValidation()` which:

- Validates the session every **30 seconds**
- Re-validates on **window focus** (user returns to tab)
- Checks: session data exists, status is `'active'`, not past `expiresAt`
- On failure: calls `endSession()` with reason `'timeout'` or `'cancelled'`, redirects to `/login`

The `/login` page is a redirect guard:
- Has active session → `/menu`
- Has preview session → `/space/[spaceId]`
- No session → `/` (home)

---

## Real-Time Participant Sync

After joining a session, `SessionContext` subscribes to participant changes:

- **Primary:** Firebase Realtime Database listener on the session path
- **Fallback:** Polling `GET /ordering-session/session/{id}` every 10 seconds

This keeps the participant list current when other guests join the same table.

---

## Key Files

| File | Responsibility |
|------|---------------|
| `src/app/space/[spaceId]/page.tsx` | QR landing page, space-mismatch detection |
| `src/contexts/SessionContext.tsx` | Session state, localStorage persistence, real-time sync |
| `src/contexts/RestaurantContext.tsx` | Restaurant/branch/table context |
| `src/contexts/CartContext.tsx` | Cart state, API queue sync |
| `src/components/session/LoginModal.tsx` | Name entry, session join/create |
| `src/hooks/useSessionValidation.ts` | Periodic session validity checks |
| `src/services/session.service.ts` | Session API calls |
| `src/lib/api/client.ts` | HTTP client |

---

## Known Limitations

- **No server-side authentication.** `sessionUserId` is a plain string in localStorage, sent in request bodies. There are no JWTs or signed tokens. Firebase Anonymous Auth is initialized for Realtime Database access but is not used for API authorization.
- **No multi-tab detection.** Opening the same session in multiple tabs can cause conflicting cart state (last-write-wins on localStorage).
- **No voluntary "Leave Session" UI.** Users can only leave by scanning a different QR or waiting for session expiry.
