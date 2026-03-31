# Split Settings

Bill splitting system for dividing the total among session participants.

---

## Split Modes

| Mode | Label | Calculation | Status |
|------|-------|-------------|--------|
| `even` | Split evenly | `total ÷ participants` | Active (default) |
| `all` | Pay for everyone | Current user = full total, others = 0 | Active |
| `self` | Pay for self | Current user = own items total, others = remainder ÷ others count | Active |
| `custom` | Custom split | Manual editable amounts per participant, validated to sum to total | Active |
| `items` | Pay for items | Each participant = sum of their own ordered items (by `sessionUserId`) | Implemented (UI disabled — "Coming soon") |

### Mode Details

**Even** — Default mode. Total divided equally. If total is $120 with 4 people, each pays $30.

**Pay for everyone** — Current user (identified by `morsel_session_user_id` in localStorage) pays the full amount. All others get $0.

**Pay for self** — Current user pays only for items they added to cart. The remaining amount is split evenly among other participants. Example: total $120, user's items $40, 3 others pay ($120 - $40) ÷ 3 = $26.67 each.

**Custom** — Each participant gets an editable input field. Real-time validation shows whether the sum matches the total (green = valid, orange = short/over). If invalid on save, auto-falls back to even split with an error message.

**Pay for items** (UI disabled) — Each participant pays exactly what they ordered. Uses `cart.items` filtered by `sessionUserId` per participant. No remainder distribution — if items don't sum to total (e.g. shared charges/taxes), the difference is unaccounted. Logic is fully implemented in `SplitContext` and `SplitSettingsModal`; button is still disabled with "Coming soon" label. To enable: remove `disabled`, `opacity-40`, `cursor-not-allowed` from the button in `SplitSettingsModal.tsx` and add `onClick={() => handleModeChange('items')}`.

---

## Architecture

### State: `SplitContext`

```typescript
SplitBill {
  mode: 'even' | 'custom' | 'self' | 'all' | 'items';
  participants: Participant[];     // { id, name, avatar, isMock }
  shares: Record<string, number>;  // participantId → amount
  isValid: boolean;
  splitForTotal?: number | null;   // total these shares were calculated for
}
```

Persisted to `localStorage` key: `morsel_split`

### Bill Total vs Cart Total

Split calculations now use the **bill total** (from the Bill API) when available, which includes taxes, charges, and discounts. This is passed via the `totalOverride` prop on `ParticipantsList` and the `total` prop on `SplitSettingsModal`. When no bill data is available, falls back to `cart.total`.

The bill is fetched via `billService.getSessionBill(sessionId)` → `GET /ordering-session/session/{sessionId}/bill`.

### Key Functions (SplitContext)

| Function | Purpose |
|----------|---------|
| `setSplitMode(mode)` | Change the active split mode |
| `calculateSplit(total, cart?)` | Recalculate all shares based on mode. Cart needed for `self` and `items` modes |
| `updateShare(participantId, amount)` | Set a specific participant's share (used by custom mode) |
| `addParticipant(participant)` | Add participant to split (deduplicated by id) |
| `removeParticipant(participantId)` | Remove participant and their share |
| `setSplitForTotal(total)` | Record which total the current shares are calculated for |
| `validateSplitShares(total)` | Check if shares sum to total |
| `clearSplit()` | Reset to empty even split |

---

## Components

### `SplitSettingsModal`

Bottom-sheet modal for changing split mode and viewing/editing amounts.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls modal visibility |
| `onClose` | `() => void` | Close callback |
| `total?` | `number` | Override total (e.g. bill total with taxes/charges instead of cart total) |

**Behavior:**
- Uses **local state** (`localMode`, `localShares`) while editing — nothing commits to context until "Save" is clicked
- Resets local state from context every time modal opens
- Shows current mode at top with description + participant avatars with amounts
- Shows the 4 non-active modes as selectable buttons (+ disabled `items` button)
- Custom mode: editable `$` inputs under each avatar with real-time validation card
- Save: commits `localMode` + `localShares` to `SplitContext`
- Invalid custom split on save → auto-switches to even split with error toast

**Used in:**
| Location | Opened by |
|----------|-----------|
| `ParticipantsList.tsx` | Tapping the participants dark card or "Change" button |
| `SplitSection.tsx` | Unused (dead code) |
| `order-summary/page.tsx` | Legacy page |

### `ParticipantsList`

Dark-themed card showing participant avatars, split amounts, and mode label.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `totalOverride?` | `number` | When set, used instead of `cart.total` for split calculations (e.g. bill total with taxes/charges) |

**Data sources:**
- Participants: Firebase real-time via `subscribeToParticipantsBySpace`, synced to `SplitContext`
- Amounts: `split.shares[participantId]` from `SplitContext`
- Current user identified by `morsel_session_user_id` → shown as "You"
- Split total: `totalOverride` (bill total) when provided, otherwise `cart.total`

**Used in:**
| Location | Page |
|----------|------|
| `src/app/my-tab/page.tsx` | My Tab — passes `billTotal` from Bill API |
| `src/components/order/PostOrderView.tsx` | Cart page after order placed — passes `billTotal` |

### `SplitSection`

Standalone split component — **dead code**, exported but never imported anywhere. Safe to delete.

---

## Data Flow

### Bill Fetch Flow

```
Orders page / My Tab page mounts
  ↓
billService.getSessionBill(sessionId)
  → GET /ordering-session/session/{sessionId}/bill
  ↓
SessionBill stored in component state (useOrdersPageState / my-tab)
  ↓
bill.total passed as totalOverride to ParticipantsList
  ↓
Split calculations use bill total (taxes + charges included)
```

### Split Settings Flow

```
User opens SplitSettingsModal
  ↓
Local state initialized from SplitContext
  ↓
User selects mode / edits amounts (local only)
  ↓
User clicks "Save"
  ↓
SplitContext updated (setSplitMode + updateShare for each participant)
  ↓
localStorage persisted automatically
  ↓
ParticipantsList re-renders with new amounts
  ↓
Cart page "My Share" updates
```

### Participant Sync Flow

```
Firebase RTDB participants update
  ↓
SessionContext receives new participants
  ↓
ParticipantsList.syncParticipantsWithSplit()
  ↓
  ├── Removes stale participants from SplitContext
  └── Adds new participants to SplitContext
  ↓
calculateSplit() called → shares recalculated
  ↓
UI updates
```

---

## Current User Identification

The current user is identified by `morsel_session_user_id` from localStorage. This is used to:
- Show "You" instead of guest name
- Sort current user first in participant lists
- Calculate "Pay for self" (own items total)
- Calculate "Pay for everyone" (assign full total to self)
- Calculate "Pay for items" (each participant's own items)

---

## Source Files

| File | Role |
|------|------|
| `src/types/cart.ts` | `SplitBill`, `Participant` types |
| `src/types/api/bill.ts` | `SessionBill`, `BillTax`, `BillCharge`, `SessionBillResponse` types |
| `src/services/bill.service.ts` | Fetches session bill from API (`getSessionBill`) |
| `src/lib/api/endpoints.ts` | `endpoints.bill.getBySessionId` — bill API endpoint |
| `src/contexts/SplitContext.tsx` | State management, calculation logic, localStorage persistence |
| `src/components/order/SplitSettingsModal.tsx` | Modal UI for mode selection and amount editing |
| `src/components/session/ParticipantsList.tsx` | Participant card UI, Firebase sync, split recalculation trigger |
| `src/components/order/PostOrderView.tsx` | Post-order bill display — renders dynamic tax/charge/discount lines from `SessionBill` |
| `src/hooks/useOrdersPageState.ts` | Orders page state — fetches and polls bill data alongside session orders |
| `src/components/cart/SplitSection.tsx` | Dead code (unused) |
| `src/lib/validation.ts` | `sanitizeSplitAmount()` — clamps and rounds share values |
| `src/mocks/mockSplit.ts` | `calculateEvenSplit()`, `validateSplit()`, `generateMockParticipant()` |
