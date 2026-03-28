# Firebase Realtime Database

**Project:** morsel-customer (Next.js 16 / React 19)
**Database URL:** `https://morsel-db7d8-default-rtdb.europe-west1.firebasedatabase.app`
**Project ID:** `morsel-db7d8`

---

## Feature Flag

Firebase is gated behind an env variable:

```
NEXT_PUBLIC_ENABLE_FIREBASE=true|false
```

When **disabled**, all consumers fall back to REST API polling.

---

## Authentication

- **Method:** Anonymous sign-in (`signInAnonymously`)
- **Provider:** `FirebaseAuthProvider` wraps the entire app in `layout.tsx`
- **Flow:** App boots -> anonymous sign-in -> auth token propagates -> listeners become active
- **No user-facing login required** — auth is invisible, only needed for DB read rules

---

## Database Structure

All real-time data lives under a single path pattern:

```
activeSessionsBySpace/
  └── {spaceId}/
      └── {sessionId}/
          └── sessionInfo/
              ├── id: string                    # Session ID
              ├── businessId: string
              ├── spaceId: string
              ├── status: "active" | "completed" | "cancelled"
              ├── expiresAt: { _seconds, _nanoseconds }
              ├── updatedAt: string             # ISO 8601
              ├── timezone?: string              # IANA timezone (e.g. "Indian/Mauritius")
              ├── currency?: string              # ISO 4217 code (e.g. "MUR")
              ├── participantsCount: number
              ├── ordersCount: number
              ├── participants: [               # Array (0-indexed)
              │     {
              │       sessionUserId: string,
              │       guestName: string,
              │       patronId?: string,
              │       joinedAt: { _seconds, _nanoseconds }
              │     }
              │   ]
              └── orderQueue: [                 # Array (0-indexed)
                    {
                      sessionUserId: string,
                      items: [
                        {
                          itemId: string,
                          name: string,
                          quantity: number,
                          variantIndex: number,
                          variantName: string,
                          variantPrice: number,
                          spiceLevel?: string,
                          addOns?: [
                            {
                              addonIndex: number,
                              addonName: string,
                              selectedOptions?: [{ name, price }],
                              optionsTotalPrice: number
                            }
                          ],
                          addonsTotalPrice?: number,
                          unitPrice: number,
                          itemTotal: number
                        }
                      ],
                      updatedAt: { _seconds, _nanoseconds }
                    }
                  ]
```

> **Note:** Firebase may store arrays as objects with numeric keys (sparse array format). All listeners handle both formats.

---

## Active Listeners

| # | Listener | Firebase Path | Consumer | What It Syncs |
|---|----------|---------------|----------|---------------|
| 1 | `subscribeToSessionInfo` | `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo` | `SessionContext.tsx` | Full sessionInfo — updates participants, participantsCount, and applies `timezone`/`currency` to `LocaleContext` (falls back to `Indian/Mauritius` if missing) |
| 2 | `subscribeToParticipantsBySpace` | `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/participants` | `ParticipantsList.tsx` | Updates participant avatars/names in the bill split UI, syncs with `SplitContext` |
| 3 | `subscribeToOrderQueue` | `activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/orderQueue` | `CartContext.tsx` | Syncs queued items from all participants into the shared cart view |

---

## Data Flow

```
Backend writes to Firebase RTDB
        │
        ▼
Firebase SDK triggers onValue callback
        │
        ▼
Listener parses data (handles array/object format)
        │
        ├──► SessionContext — updates participants + localStorage + applies timezone/currency to LocaleContext
        ├──► ParticipantsList — updates split UI, syncs to SplitContext
        └──► CartContext — processes orderQueue into cart items
                │
                ▼
        React re-renders affected components
```

---

## Fallback: REST API Polling

When Firebase is unavailable (feature flag off, auth failure, listener error):

| Consumer | Polling Interval | API Endpoint |
|----------|-----------------|--------------|
| `CartContext` | Every 15 seconds | `GET /ordering-session/session/{sessionId}` (extracts `orderQueue`) |
| `ParticipantsList` | Every 10 seconds | `GET /ordering-session/session/{sessionId}` (extracts `participants`) |
| `SessionContext` | On-demand (window focus, manual refresh) | `GET /ordering-session/session/{sessionId}` |

---

## Source Files

| File | Role |
|------|------|
| `src/lib/firebase/config.ts` | Firebase app init, anonymous auth, feature flag |
| `src/lib/firebase/realtime.service.ts` | All `subscribeTo*` listener functions, connection state management |
| `src/lib/firebase/index.ts` | Re-exports for consumers |
| `src/components/providers/FirebaseAuthProvider.tsx` | App-level auth initialization on boot |
| `src/contexts/SessionContext.tsx` | Consumes `subscribeToSessionInfo` (full sessionInfo including timezone/currency) |
| `src/contexts/CartContext.tsx` | Consumes `subscribeToOrderQueue` |
| `src/components/session/ParticipantsList.tsx` | Consumes `subscribeToParticipantsBySpace` |

---

## TypeScript Types

Defined in `src/types/api/session.ts`:

| Type | Used For |
|------|----------|
| `SessionParticipant` | `{ sessionUserId, guestName, patronId?, joinedAt? }` |
| `SessionOrderQueue` | `{ sessionUserId, items: SessionQueueItem[], updatedAt }` |
| `SessionQueueItem` | Individual item in a queue (itemId, name, qty, variant, addons, prices) |
| `SessionDetail` | Full session shape returned by API and assembled from Firebase data |
| `RealtimeSessionData` | Legacy Firebase shape (object format with Record types) — deprecated |

---

## Timezone / Currency Handling

- `sessionInfo.timezone` and `sessionInfo.currency` are read from the real-time DB by `subscribeToSessionInfo`
- On every update, `SessionContext` calls `setLocale({ timezone, currency })` on `LocaleContext`
- If `timezone` is **missing** from the DB, falls back to `DEFAULT_TIMEZONE` = `"Indian/Mauritius"`
- If `currency` is **missing**, locale keeps its current value unchanged
- The REST API (`GET /ordering-session/session/{sessionId}`) also returns `timezone`/`currency` and applies them via `refreshSessionData()` — this serves as a secondary source when Firebase is disabled

---

## Deprecated / Dead Code

| Function | Path | Status |
|----------|------|--------|
| `subscribeToSession` | `sessions/{sessionId}` | Deprecated — legacy path, not consumed |
| `subscribeToSessionBySpace` | `activeSessionsBySpace/{spaceId}/sessionInfo` | Exported but not consumed (replaced by `subscribeToSessionInfo` which takes both spaceId + sessionId) |
| `subscribeToOrderQueueBySpace` | `activeSessionsBySpace/{spaceId}/sessionInfo/orderQueue` | Exported but not consumed |
| `subscribeToParticipants` | `sessions/{sessionId}/participants` | Legacy path, no longer consumed |
| `RealtimeSessionData` interface | — | Legacy shape, not used by active listeners |

---

## Environment Variables

```env
NEXT_PUBLIC_ENABLE_FIREBASE=false          # Feature flag (set true to enable)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...     # Firebase Web API key
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://morsel-db7d8-default-rtdb.europe-west1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=morsel-db7d8
NEXT_PUBLIC_FIREBASE_APP_ID=1:977474...    # Optional
```
