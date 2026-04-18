# Split API — Client/Server Drift

Known contract mismatches between the client TS types and the actual server response for split-related APIs. **No runtime blocker today** — everything the client currently reads exists on the server. This document captures the gaps so future features can be built on accurate types.

Last verified: 2026-04-18 against live session `1xslNJINX5ruEey1FIAJ`.

---

## Scope

Two endpoints involved:

- `POST /ordering-session/session/{sessionId}/split` — creates/updates the split
- `GET /ordering-session/session/{sessionId}` — returns persisted `splitConfig` + `splits[]`

Relevant TS types: `src/types/api/split.ts`, `src/types/api/session.ts`.

---

## 1. POST `/split` — Request (in sync)

Client sends exactly what server expects.

| Field | Client sends | Server accepts |
|---|---|---|
| `type` | ✅ | ✅ |
| `numberOfSplits` | ✅ | ✅ |
| `amounts[]` | ✅ | ✅ |
| `itemIds[]` (`{itemId, orderId, quantity}`) | ✅ | ✅ |
| `sessionUserId` (itemized only) | ✅ | ✅ |

---

## 2. POST `/split` — Response drift

### Root `data`
| Field | In TS type | Server returns | Consumed in UI |
|---|---|---|---|
| `total` | ✅ | ✅ | ✅ |
| `splits[]` | ✅ | ✅ | ✅ |
| `allPaid` | ✅ | ✅ | Derived locally |
| `remainingTotal` | ❌ | ✅ | ❌ |
| `totalPaid` | ❌ | ✅ | ❌ |

### `splits[]` entry (`SplitEntry`)
| Field | In TS | Server | Consumed |
|---|---|---|---|
| `index`, `amount`, `sessionUserId`, `paid`, `paidBy`, `paidAt`, `method` | ✅ | ✅ | partial |
| `splitId` | ❌ | ✅ | ❌ — needed for checkout `splitIdentifier` |
| `tax`, `charges`, `tip` | ❌ | ✅ | ❌ — per-split breakdown |
| `items[]` | ✅ | ✅ | ❌ |

### `splits[].items[]` (`SplitItemDetail`)
| Field | In TS | Server | Status |
|---|---|---|---|
| `itemId`, `name`, `quantity`, `unitPrice` | ✅ | ✅ | OK |
| `totalPrice` | ✅ | ❌ | **Rename mismatch — server sends `itemTotal`** |
| `itemTotal` | ❌ | ✅ | Missing |
| `variantIndex`, `variantPrice`, `addonsTotalPrice`, `orderId` | ❌ | ✅ | Missing |
| `variantName` | `string?` | `string \| null` | Relax to `string \| null` |

---

## 3. GET session — `splitConfig` drift

Current type has: `type`, `numberOfSplits`, `amounts`, `itemIds` (**as `string[]`**), `itemizedSplit`, `remainingItems` (**as `any[]`**).

| Server field | In TS | Notes |
|---|---|---|
| `type`, `numberOfSplits`, `amounts`, `itemizedSplit` | ✅ | OK |
| `itemIds` | ⚠️ wrong shape | Type says `string[]`, server sends `{itemId, orderId, quantity}[]` |
| `remainingItems` | ⚠️ `any[]` | Array of `SessionOrderItem`-shaped items + `orderId` |
| `sessionUserId` | ❌ | Who initiated the itemized split |
| `splitTaxes: { [index]: number }` | ❌ | Per-split tax map |
| `splitCharges: { [index]: number }` | ❌ | Per-split charges map |
| `splitTips: { [index]: number }` | ❌ | Per-split tip map |

---

## 4. GET session — collateral drift (not split-core, but surfaced during review)

### `SessionDetail`
| Server field | In TS | Notes |
|---|---|---|
| `tips: []` | ❌ | Session-level tip records |
| `discount: null` | ❌ | Session-level discount |
| `sessionCharges[]` | ❌ | Charge definitions (service %, state %, etc.) |
| `sessionTips: { [userId]: {amount, timestamp} }` | ❌ | Per-participant tip map |

### `SessionOrderItem`
| Server field | In TS | Notes |
|---|---|---|
| `variantName` | ❌ | Display-critical for variants |
| `addOns[]` | ❌ | Defined on `SessionQueueItem` but not `SessionOrderItem` |

---

## 5. Why nothing breaks today

Grep-verified consumers of the server response:

| Consumer | Fields read | All present? |
|---|---|---|
| `SplitContext.tsx:117-124` (hydration) | `index`, `amount`, `sessionUserId` | ✅ |
| `SplitContext.tsx:110` | `serverSplitConfig.type` | ✅ |
| `SessionContext.tsx:215-216` (`isParticipantPaid`) | `sessionUserId`, `paidBy`, `paid` | ✅ |
| `PostOrderView.tsx:179,184` | `paid`, `sessionUserId` | ✅ |
| `PaymentResultView.tsx:50-51` | `paid` | ✅ |

Every field the client reads today exists in the response. Extra server fields are silently ignored by TS at runtime. `serverSplits` state is set but not currently read by any component.

---

## 6. Decision buckets

### Bucket A — Type-only patch (safe, ~30 lines, zero runtime risk)
1. `SplitConfig.itemIds` → `{itemId, orderId, quantity}[]`
2. Add `SplitConfig.sessionUserId`, `splitTaxes`, `splitCharges`, `splitTips`
3. Replace `SplitConfig.remainingItems: any[]` with a proper type
4. Add `variantName`, `addOns` to `SessionOrderItem`
5. Add `sessionCharges`, `sessionTips`, `tips`, `discount` to `SessionDetail`
6. Add `splitId`, `tax`, `charges`, `tip` to `SplitEntry`
7. Rename `SplitItemDetail.totalPrice` → `itemTotal`; add `variantIndex`, `variantPrice`, `addonsTotalPrice`, `orderId`
8. Add `remainingTotal`, `totalPaid` to `SplitCalculateResponse.data`

### Bucket B — Features the typed fields unlock
| Feature | Requires |
|---|---|
| "X is splitting the bill" banner | `splitConfig.sessionUserId` |
| "Remaining items to pay" list | `splitConfig.remainingItems` (already on server) |
| Per-split tax/charges/tip in receipt | `splits[].tax/charges/tip` + `splitConfig.splitTaxes/Charges/Tips` |
| Reuse server charges in bill UI | `sessionCharges[]` (could retire `bill.service` dependency) |
| Per-participant tip display | `sessionTips` |
| Checkout via `splitIdentifier` | `splits[].splitId` |

### Bucket C — Currently safe to ignore
`tips: []`, `discount: null` — empty in observed responses, no known consumer.

---

## 7. Sample payloads (reference)

### Request
```json
{
  "type": "itemized",
  "numberOfSplits": 2,
  "amounts": [702, 28.06],
  "itemIds": [
    { "itemId": "hxIKB0fdo5ePE9WNbzT6", "orderId": "ompoYW9EUkSy2wbc5gdd", "quantity": 1 },
    { "itemId": "FicZp7n9f0XoYTEIojsO", "orderId": "ompoYW9EUkSy2wbc5gdd", "quantity": 1 }
  ],
  "sessionUserId": "12a0abe0-ebc0-4092-9172-a33fc396069a"
}
```

### Response (trimmed)
```json
{
  "data": {
    "total": 730.06,
    "remainingTotal": 730.06,
    "totalPaid": 0,
    "allPaid": false,
    "splits": [
      {
        "splitId": "7b4a3d55-2352-4bb2-b600-acda29437b30",
        "sessionUserId": "12a0abe0-ebc0-4092-9172-a33fc396069a",
        "index": 0,
        "amount": 702,
        "tax": 202,
        "charges": 100,
        "tip": 0,
        "paid": false,
        "paidAt": null,
        "paidBy": null,
        "method": null,
        "items": [
          {
            "itemId": "hxIKB0fdo5ePE9WNbzT6",
            "name": "Mango Lassi",
            "quantity": 1,
            "variantIndex": 0,
            "variantName": null,
            "variantPrice": 150,
            "addOns": [],
            "addonsTotalPrice": 0,
            "unitPrice": 150,
            "itemTotal": 150,
            "orderId": "ompoYW9EUkSy2wbc5gdd"
          }
        ]
      }
    ]
  }
}
```

### Session `splitConfig` snapshot
```json
{
  "type": "itemized",
  "numberOfSplits": 2,
  "amounts": [702, 28.06],
  "itemIds": [
    { "itemId": "hxIKB0fdo5ePE9WNbzT6", "orderId": "ompoYW9EUkSy2wbc5gdd", "quantity": 1 }
  ],
  "sessionUserId": "12a0abe0-ebc0-4092-9172-a33fc396069a",
  "itemizedSplit": true,
  "remainingItems": [ /* SessionOrderItem-like + orderId */ ],
  "splitTaxes":   { "0": 202 },
  "splitCharges": { "0": 100 },
  "splitTips":    { "0": 0 }
}
```
