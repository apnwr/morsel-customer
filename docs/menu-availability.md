# Menu Availability

Controls whether menus are shown as available or disabled based on day/time windows from the API.

---

## Feature Toggle

```typescript
// src/lib/config.ts
config.features.menuAvailabilityCheck: false  // currently OFF
```

- **`false`** (current): all menus treated as always available, no banners shown
- **`true`**: menus checked against availability window + timezone, unavailable menus dimmed with banner

> Toggle exists because API availability data is currently unreliable. Remove the toggle and hardcode `true` once the API is fixed.

---

## Availability Data Shape

The `availability` field on a menu can be either an **object** or a **single-element array**:

**Object format:**
```json
{
  "startTime": "09:00",
  "endTime": "21:00",
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

**Array format (pick first element):**
```json
[
  {
    "startTime": "09:00",
    "endTime": "21:00",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
]
```

**Always available:** `availability` is `undefined`, `null`, or `[]`

| Field | Type | Description |
|-------|------|-------------|
| `startTime` | `string` | `"HH:mm"` format (e.g. `"09:00"`) |
| `endTime` | `string` | `"HH:mm"` format (e.g. `"21:00"`) |
| `days` | `string[] \| string` | Lowercase day names (e.g. `["monday", "friday"]`) or `"all"` for every day |

---

## How It Works

1. **Normalize**: array → take `[0]`, object → use directly, empty/missing → always available
2. **Check day**: is today (in the session's timezone) in the `days` array?
3. **Check time**: is current time (in the session's timezone) between `startTime` and `endTime`?
4. **Result**: available if both day and time match

### Timezone Source

Timezone comes from `LocaleContext.timezone`, which is set from:
- Firebase RTDB `sessionInfo.timezone` (real-time)
- REST API `GET /ordering-session/session/{sessionId}` response (polling fallback)
- Default: `"Indian/Mauritius"` if neither source provides it

---

## Edge Cases

| Case | Behavior |
|------|----------|
| `availability` is `undefined` / `null` / `[]` | Always available |
| `days: "all"` | Expands to all 7 days |
| Invalid time format (e.g. `"May"`) | Treated as always available |
| Overnight range (`"22:00"` to `"02:00"`) | Available if `now >= 22:00 OR now < 02:00` |
| Empty `days` array after normalization | No day restriction, time-only check |

---

## UI When Unavailable

When the toggle is on and a menu is outside its window:

- **Banner**: amber box above menu items — `"Next available at 9:00 AM on Friday"`
- **Menu name**: grayed out (`text-gray-400`)
- **Items**: `opacity-50` + `pointer-events-none` (visible but non-interactive)
- Available menus render identically to before (no wrapper divs added)

---

## Source Files

| File | Role |
|------|------|
| `src/lib/config.ts` | Feature toggle (`config.features.menuAvailabilityCheck`) |
| `src/lib/menu-availability.ts` | Pure utility: `normalizeAvailability`, `isMenuCurrentlyAvailable`, `getNextAvailableSlot`, `getUnavailableMessage` |
| `src/hooks/useMenuAvailability.ts` | React hook: returns `Map<menuId, { isAvailable, unavailableMessage }>`, refreshes every 60s |
| `src/types/api/menu.ts` | `MenuAvailability` interface, `Menu.availability` union type |
| `src/app/menu/page.tsx` | Integration: hook call, props to `MenuRenderer`, disabled UI rendering |

---

## Type Definition

```typescript
// src/types/api/menu.ts
interface MenuAvailability {
  startTime: string;
  endTime: string;
  days: string[] | string;
}

interface Menu {
  // ...
  availability: MenuAvailability | MenuAvailability[] | undefined;
}
```
