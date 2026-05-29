# Split API — Client/Server Drift

Known contract mismatches between the client TS types and the actual server response for split-related APIs. **No runtime blocker today** — everything the client currently reads exists on the server. This document captures the gaps so future features can be built on accurate types.

Last verified: 2026-05-29 against live session `1xslNJINX5ruEey1FIAJ`.

---

## Scope

Two endpoints involved:

- `POST /ordering-session/session/{sessionId}/split` — creates/updates the split
- `GET /ordering-session/session/{sessionId}` — returns persisted `splitConfig` + `splits[]`

Relevant TS types: `src/types/api/split.ts`, `src/types/api/session.ts`.

---

## 1. POST `/split` — Request (in sync)

Client sends exactly what server expects.

| Field                                       | Client sends | Server accepts |
| ------------------------------------------- | ------------ | -------------- |
| `type`                                      | ✅           | ✅             |
| `numberOfSplits`                            | ✅           | ✅             |
| `amounts[]`                                 | ✅           | ✅             |
| `itemIds[]` (`{itemId, orderId, quantity}`) | ✅           | ✅             |
| `sessionUserId` (itemized only)             | ✅           | ✅             |

---

## 2. POST `/split` — Response drift

> **Update 2026-05-29:** Most gaps cataloged below are now RESOLVED in `src/types/api/split.ts`. The "In TS type" column reflects the current types; line refs point at the resolving declarations. Fields marked present-in-TS-but-not-consumed are typed but no component reads them yet (see note after the §3 table).

### Root `data`

| Field            | In TS type            | Server returns | Consumed in UI  |
| ---------------- | --------------------- | -------------- | --------------- |
| `total`          | ✅                    | ✅             | ✅              |
| `splits[]`       | ✅                    | ✅             | ✅              |
| `allPaid`        | ✅                    | ✅             | Derived locally |
| `remainingTotal` | ✅ (split.ts:104-107) | ✅             | ❌              |
| `totalPaid`      | ✅ (split.ts:104-107) | ✅             | ❌              |

### `splits[]` entry (`SplitEntry`)

| Field                                                                    | In TS               | Server | Consumed                                  |
| ------------------------------------------------------------------------ | ------------------- | ------ | ----------------------------------------- |
| `index`, `amount`, `sessionUserId`, `paid`, `paidBy`, `paidAt`, `method` | ✅                  | ✅     | partial                                   |
| `splitId`                                                                | ✅ (split.ts:59)    | ✅     | ❌ — present-in-TS, not yet consumed      |
| `type`                                                                   | ✅ (split.ts:61)    | ✅     | ❌ — present-in-TS, not yet consumed      |
| `tax`, `charges`, `tip`                                                  | ✅ (split.ts:65-69) | ✅     | ❌ — present-in-TS, not yet consumed      |
| `items[]`                                                                | ✅                  | ✅     | ✅ (ItemizedPickerSheet claims-by-others) |

### `splits[].items[]` (`SplitItemDetail`)

| Field                                                                   | In TS                             | Server           | Status                    |
| ----------------------------------------------------------------------- | --------------------------------- | ---------------- | ------------------------- |
| `itemId`, `name`, `quantity`, `unitPrice`                               | ✅                                | ✅               | OK                        |
| `itemTotal`                                                             | ✅ (split.ts:41)                  | ✅               | Resolved                  |
| `totalPrice`                                                            | ✅ (split.ts:43, legacy)          | —                | Kept as back-compat alias |
| `variantIndex`, `variantPrice`, `addOns`, `addonsTotalPrice`, `orderId` | ✅ (split.ts:44-50)               | ✅               | Resolved                  |
| `variantName`                                                           | ✅ `string \| null` (split.ts:45) | `string \| null` | Resolved                  |

---

## 3. GET session — `splitConfig` drift

Most of these are now resolved in `SplitConfig` (`src/types/api/split.ts`).

| Server field                                         | In TS                                                               | Notes                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `type`, `numberOfSplits`, `amounts`, `itemizedSplit` | ✅                                                                  | OK                                         |
| `itemIds`                                            | ✅ union `{itemId, orderId, quantity}[] \| string[]` (split.ts:119) | Resolved — typed as the object-array union |
| `remainingItems`                                     | ✅ `SplitRemainingItem[]` (split.ts:121, type at 82-94)             | Resolved — proper type replaces `any[]`    |
| `sessionUserId`                                      | ✅ (split.ts:124)                                                   | Who initiated the itemized split           |
| `splitTaxes: { [index]: number }`                    | ✅ (split.ts:126)                                                   | Per-split tax map                          |
| `splitCharges: { [index]: number }`                  | ✅ (split.ts:127)                                                   | Per-split charges map                      |
| `splitTips: { [index]: number }`                     | ✅ (split.ts:128)                                                   | Per-split tip map                          |

---

## 4. GET session — collateral drift (not split-core, but surfaced during review)

> **Note (2026-05-29):** the §4 session-type additions below were NOT re-verified in this pass. The ✅/❌ marks here may be stale.

### `SessionDetail`

| Server field                                     | In TS | Notes                                         |
| ------------------------------------------------ | ----- | --------------------------------------------- |
| `tips: []`                                       | ❌    | Session-level tip records                     |
| `discount: null`                                 | ❌    | Session-level discount                        |
| `sessionCharges[]`                               | ❌    | Charge definitions (service %, state %, etc.) |
| `sessionTips: { [userId]: {amount, timestamp} }` | ❌    | Per-participant tip map                       |

### `SessionOrderItem`

| Server field  | In TS | Notes                                                    |
| ------------- | ----- | -------------------------------------------------------- |
| `variantName` | ❌    | Display-critical for variants                            |
| `addOns[]`    | ❌    | Defined on `SessionQueueItem` but not `SessionOrderItem` |

---

## 5. Why nothing breaks today

Grep-verified consumers of the server response:

| Consumer                                                  | Fields read                        | All present? |
| --------------------------------------------------------- | ---------------------------------- | ------------ |
| `SplitContext.tsx:112-153` (hydration)                    | `index`, `amount`, `sessionUserId` | ✅           |
| `SessionContext.tsx:73-77` (`serverSplitType` derivation) | `serverSplitConfig.type`           | ✅           |
| `SessionContext.tsx:237-242` (`isParticipantPaid`)        | `sessionUserId`, `paidBy`, `paid`  | ✅           |
| `PostOrderView.tsx:179,184`                               | `paid`, `sessionUserId`            | ✅           |
| `PaymentResultView.tsx:50-51`                             | `paid`                             | ✅           |

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

| Feature                              | Requires                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| "X is splitting the bill" banner     | `splitConfig.sessionUserId`                                        |
| "Remaining items to pay" list        | `splitConfig.remainingItems` (already on server)                   |
| Per-split tax/charges/tip in receipt | `splits[].tax/charges/tip` + `splitConfig.splitTaxes/Charges/Tips` |
| Reuse server charges in bill UI      | `sessionCharges[]` (could retire `bill.service` dependency)        |
| Per-participant tip display          | `sessionTips`                                                      |
| Checkout via `splitIdentifier`       | `splits[].splitId`                                                 |

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
    {
      "itemId": "hxIKB0fdo5ePE9WNbzT6",
      "orderId": "ompoYW9EUkSy2wbc5gdd",
      "quantity": 1
    },
    {
      "itemId": "FicZp7n9f0XoYTEIojsO",
      "orderId": "ompoYW9EUkSy2wbc5gdd",
      "quantity": 1
    }
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
    {
      "itemId": "hxIKB0fdo5ePE9WNbzT6",
      "orderId": "ompoYW9EUkSy2wbc5gdd",
      "quantity": 1
    }
  ],
  "sessionUserId": "12a0abe0-ebc0-4092-9172-a33fc396069a",
  "itemizedSplit": true,
  "remainingItems": [
    /* SessionOrderItem-like + orderId */
  ],
  "splitTaxes": { "0": 202 },
  "splitCharges": { "0": 100 },
  "splitTips": { "0": 0 }
}
```
