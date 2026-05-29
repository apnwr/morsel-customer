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

| Type                | Storage                      | Purpose                                           |
| ------------------- | ---------------------------- | ------------------------------------------------- |
| **Preview Session** | React state only (ephemeral) | Space/business info shown before user joins       |
| **Active Session**  | React state + localStorage   | Full session data after user joins via LoginModal |

### localStorage Keys

`clearSession()` (`SessionContext.tsx:172-183`) clears every key in
`SESSION_SCOPED_KEYS` (`src/lib/storage-keys.ts:53-69`) **plus** every
`morsel_split_initiator_*`-prefixed key (the prefix sweep). `morsel_order` and
`morsel_table_number` are **intentionally NOT cleared** (persistent across
sessions).

| Key                          | Set When                      | Cleared When                    |
| ---------------------------- | ----------------------------- | ------------------------------- |
| `morsel_session_data`        | LoginModal submit             | `clearSession()`                |
| `morsel_session_user_id`     | LoginModal submit             | `clearSession()`                |
| `morsel_active_order_id`     | Order placed                  | `clearSession()`                |
| `morsel_customer_name`       | LoginModal submit             | `clearSession()`                |
| `morsel_dining_type`         | Flow setup                    | `clearSession()`                |
| `morsel_auth_method`         | LoginModal submit             | `clearSession()`                |
| `morsel_flow_type`           | Flow setup                    | `clearSession()`                |
| `morsel_area_id`             | Flow setup                    | `clearSession()`                |
| `morsel_restaurant_context`  | LoginModal submit             | `clearSession()`                |
| `morsel_cart`                | Cart updates                  | `clearSession()`                |
| `morsel_kitchen_note`        | Cart kitchen note             | `clearSession()`                |
| `morsel_tip`                 | Tip selection                 | `clearSession()`                |
| `morsel_split`               | Split config                  | `clearSession()`                |
| `morsel_itemized_selections` | Itemized picker               | `clearSession()`                |
| `morsel_menu_items_cache`    | Menu load                     | `clearSession()`                |
| `morsel_split_initiator_*`   | Split initiated (per-session) | `clearSession()` (prefix sweep) |
| `morsel_order`               | Order placed                  | **Never** (persistent)          |
| `morsel_table_number`        | Debug panel                   | **Never** (persistent)          |

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
  - morsel_customer_name, morsel_auth_method
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

## Participant Sync

After joining a session, `SessionContext` keeps the participant list (and split
data) current by **polling** — there is no Firebase listener here:

- Polls `GET /ordering-session/session/{id}` every 10 seconds via `setInterval`
  (`SessionContext.tsx:461`).
- The interval is **paused when the tab is hidden** (phone locked, app
  backgrounded, another tab) using the Page Visibility API, and **resumed with
  an immediate fetch** on `visibilitychange → visible` (`SessionContext.tsx:472-486`).
- There is a `TODO` to switch to the Firebase Realtime DB once RTDB includes
  split data (`SessionContext.tsx:442`).

This keeps the participant list current when other guests join the same table.
There is no primary/fallback split — polling is the only mechanism.

---

## Key Files

| File                                    | Responsibility                                        |
| --------------------------------------- | ----------------------------------------------------- |
| `src/app/space/[spaceId]/page.tsx`      | QR landing page, space-mismatch detection             |
| `src/contexts/SessionContext.tsx`       | Session state, localStorage persistence, polling sync |
| `src/contexts/RestaurantContext.tsx`    | Restaurant/branch/table context                       |
| `src/contexts/CartContext.tsx`          | Cart state, API queue sync                            |
| `src/components/session/LoginModal.tsx` | Name entry, session join/create                       |
| `src/hooks/useSessionValidation.ts`     | Periodic session validity checks                      |
| `src/services/session.service.ts`       | Session API calls                                     |
| `src/lib/api/client.ts`                 | HTTP client                                           |

---

## Known Limitations

- **No server-side authentication.** `sessionUserId` is a plain string in localStorage, sent in request bodies. There are no JWTs or signed tokens. Firebase Anonymous Auth is initialized for Realtime Database access but is not used for API authorization.
- **No multi-tab detection.** Opening the same session in multiple tabs can cause conflicting cart state (last-write-wins on localStorage).
- **No voluntary "Leave Session" UI.** Users can only leave by scanning a different QR or waiting for session expiry.
