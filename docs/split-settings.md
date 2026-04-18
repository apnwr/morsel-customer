# Split Settings

Bill splitting system for dividing the total among session participants. Splits are calculated client-side for instant UI and synced to the server via `POST /ordering-session/session/{sessionId}/split`.

---

## Split Modes

| Mode | Label | Calculation | API Type | Status |
|------|-------|-------------|----------|--------|
| `even` | Split evenly | `total ÷ participants` | `equal` | Active (default) |
| `all` | Pay for everyone | Current user = full total, others = 0 | `custom` | Active |
| `self` | Pay for self | Current user = own items total, others = remainder ÷ others count | `participant` | Active |
| `custom` | Custom split | Manual editable amounts per participant, validated to sum to total | `custom` | Active |
| `items` | Pay for items | User manually selects which items to pay for via ItemizedPickerSheet | `itemized` | Active |

### Mode Details

**Even** — Default mode. Total divided equally. If total is $120 with 4 people, each pays $30.

**Pay for everyone** — Current user (identified by `morsel_session_user_id` in localStorage) pays the full amount. All others get $0.

**Pay for self** — Current user pays only for items they added to cart. The remaining amount is split evenly among other participants. Example: total $120, user's items $40, 3 others pay ($120 - $40) ÷ 3 = $26.67 each.

**Custom** — Each participant gets an editable input field. Real-time validation shows whether the sum matches the total (green = valid, orange = short/over). If invalid on save, auto-falls back to even split with an error message.

**Pay for items** — User manually picks which items from the session they want to pay for. Opens `ItemizedPickerSheet` bottom sheet showing all items from all orders. Items can be claimed by participants — claimed items show as locked. For items with quantity > 1, a stepper allows selecting partial quantities. Remaining unclaimed amount is split evenly among other participants.

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

// Additional context state:
serverSplits: SplitEntry[] | null;              // Server response (includes paid status)
itemizedSelections: Record<string, string[]>;   // participantId → itemKeys they chose
```

Persisted to `localStorage`:
- `morsel_split` — SplitBill state
- `morsel_itemized_selections` — itemized item selections

### Bill Total vs Cart Total

Split calculations use the **bill total** (from the Bill API) when available, which includes taxes, charges, and discounts. This is passed via the `totalOverride` prop on `ParticipantsList` and the `total` prop on `SplitSettingsModal`. When no bill data is available, falls back to `cart.total`.

The bill is fetched via `billService.getSessionBill(sessionId)` → `GET /ordering-session/session/{sessionId}/bill`.

### Server Sync

When the user saves split settings, the split is synced to the server via `POST /ordering-session/session/{sessionId}/split`. This is **fire-and-forget** — if the API fails, the local split still works. The server response includes `paid` status per split, stored in `serverSplits`.

**Mode → API type mapping:**

| Client Mode | API `type` | Payload |
|-------------|-----------|---------|
| `even` | `equal` | `{ numberOfSplits: participants.length }` |
| `all` | `custom` | `{ amounts: [total, 0, 0, ...] }` |
| `self` | `participant` | `{}` (server calculates per-participant) |
| `custom` | `custom` | `{ amounts: [share1, share2, ...] }` |
| `items` | `itemized` | `{ itemIds: [[keys...], [keys...], ...] }` |

### Key Functions (SplitContext)

| Function | Purpose |
|----------|---------|
| `setSplitMode(mode)` | Change the active split mode |
| `calculateSplit(total, cart?)` | Recalculate all shares based on mode. Cart needed for `self` mode |
| `updateShare(participantId, amount)` | Set a specific participant's share (used by custom and items modes) |
| `addParticipant(participant)` | Add participant to split (deduplicated by id) |
| `removeParticipant(participantId)` | Remove participant and their share |
| `setSplitForTotal(total)` | Record which total the current shares are calculated for |
| `validateSplitShares(total)` | Check if shares sum to total |
| `clearSplit()` | Reset to empty even split |
| `setItemizedSelection(participantId, itemIds)` | Set which items a participant chose to pay for |
| `clearItemizedSelections()` | Clear all itemized selections |
| `syncSplitToServer(sessionId)` | Sync current split to server (fire-and-forget) |

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
- Shows the non-active modes as selectable buttons
- Selecting "Pay for items" opens the `ItemizedPickerSheet`
- Custom mode: editable `$` inputs under each avatar with real-time validation card
- Save: commits `localMode` + `localShares` to `SplitContext`, then syncs to server
- Invalid custom split on save → auto-switches to even split with error toast

**Used in:**
| Location | Opened by |
|----------|-----------|
| `ParticipantsList.tsx` | Tapping the participants dark card or "Change" button |

### `ItemizedPickerSheet`

Bottom-sheet for selecting individual items to pay for (itemized mode).

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls sheet visibility |
| `onClose` | `() => void` | Close callback |
| `onConfirm` | `() => void` | Confirm callback (after selections saved) |
| `sessionId` | `string` | Current session ID |
| `total` | `number` | Session total for remaining amount calculation |

**Behavior:**
- Flattens all orders from `sessionData.session.orders` into a single item list
- Each item shows: name, unit price, checkbox/lock icon
- Items with `quantity > 1` show a quantity stepper (select partial quantities)
- Items claimed by other participants show as locked with claimer's name
- Running total of selected items shown at bottom
- Remaining amount displayed as info text
- "Confirm Selection" saves to `SplitContext.itemizedSelections` and updates shares

**Item states:**
| State | Visual | Interaction |
|-------|--------|-------------|
| `available` | White bg, empty checkbox | Tappable |
| `selected` | Gray bg, black checkbox with check | Tappable to deselect |
| `claimed` | Gray bg, lock icon, 60% opacity | Disabled |

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
syncSplitToServer(sessionId) fires in background
  → POST /ordering-session/session/{sessionId}/split
  → Server stores split, response saved to serverSplits
  ↓
ParticipantsList re-renders with new amounts
```

### Itemized Flow

```
User selects "Pay for items" in SplitSettingsModal
  ↓
ItemizedPickerSheet opens
  ↓
All session items displayed (from sessionData.session.orders)
  ↓
User selects/deselects items, adjusts quantities
  ↓
User clicks "Confirm Selection"
  ↓
itemizedSelections[currentUserId] updated in SplitContext
  ↓
Current user's share = sum of selected items
Remaining distributed evenly among others
  ↓
User clicks "Save" in SplitSettingsModal
  ↓
syncSplitToServer sends { type: "itemized", sessionUserId, itemIds: [...] }
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
- Identify selected items in itemized mode

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/ordering-session/session/{sessionId}/bill` | Fetch bill total with taxes/charges |
| `POST` | `/ordering-session/session/{sessionId}/split` | Sync split settings to server |

---

## Source Files

| File | Role |
|------|------|
| `src/types/cart.ts` | `SplitBill`, `Participant` types |
| `src/types/api/bill.ts` | `SessionBill`, `BillTax`, `BillCharge`, `SessionBillResponse` types |
| `src/types/api/split.ts` | `SplitCalculateRequest`, `SplitCalculateResponse`, `SplitEntry`, `SplitItemDetail` types |
| `src/services/bill.service.ts` | Fetches session bill from API (`getSessionBill`) |
| `src/services/split.service.ts` | Syncs split to server (`calculateSplit`) |
| `src/lib/api/endpoints.ts` | `endpoints.bill.getBySessionId`, `endpoints.split.calculate` |
| `src/contexts/SplitContext.tsx` | State management, calculation logic, server sync, localStorage persistence |
| `src/components/order/SplitSettingsModal.tsx` | Modal UI for mode selection and amount editing |
| `src/components/order/ItemizedPickerSheet.tsx` | Item selection UI for itemized mode |
| `src/components/session/ParticipantsList.tsx` | Participant card UI, Firebase sync, split recalculation trigger |
| `src/components/order/PostOrderView.tsx` | Post-order bill display — renders dynamic tax/charge/discount lines |
| `src/hooks/useOrdersPageState.ts` | Orders page state — fetches and polls bill data alongside session orders |
| `src/components/cart/SplitSection.tsx` | Dead code (unused) |
| `src/lib/split-utils.ts` | `isSplitApplicableForTotal()` — checks if shares match current total |
| `src/lib/validation.ts` | `sanitizeSplitAmount()` — clamps and rounds share values |
| `src/mocks/mockSplit.ts` | `calculateEvenSplit()`, `validateSplit()`, `generateMockParticipant()` |
