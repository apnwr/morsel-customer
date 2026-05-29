# Timezone & Currency — Customer App Integration Guide

**Default: MUR (Mauritian Rupee) / Indian/Mauritius — matches `src/lib/currencies.ts`.**

This document describes the exact formats used in the Morsel admin app for timezone and currency, so the customer app can stay fully in sync.

---

## 1. Where the data lives

Both `timezone` and `currency` are stored at the **branch** level (and optionally at the business level). When a customer opens the ordering app for a specific branch, these two fields must be read from the branch object returned by the API.

### Branch API response shape (relevant fields)

```json
{
  "id": "branch_abc123",
  "businessId": "biz_xyz",
  "name": "Downtown",
  "timezone": "Indian/Mauritius",
  "currency": "MUR",
  ...
}
```

Both fields are **optional** in the API response (the branch may not have them set). The customer app defaults to `Indian/Mauritius` / `MUR` when they are absent (`src/lib/currencies.ts:64-65`, seeded into `LocaleContext.tsx:36-37`).

---

## 2. Timezone

### Format

**IANA timezone identifier string** — the standard used by JavaScript's `Intl` API and most backend date libraries.

| Example value      | Meaning                        |
| ------------------ | ------------------------------ |
| `Asia/Kolkata`     | India Standard Time (UTC+5:30) |
| `America/New_York` | Eastern Time (US & Canada)     |
| `Europe/London`    | London / Dublin / Lisbon       |
| `Asia/Dubai`       | Dubai / Abu Dhabi (UTC+4:00)   |
| `Australia/Sydney` | Sydney / Melbourne (UTC+10:00) |

Full list: `src/lib/timezones.ts` — every entry's `value` field is a valid IANA string.

### Default fallback

```
Indian/Mauritius
```

### How to use it in the customer app

**Displaying a local time for the branch:**

```ts
const date = new Date(utcTimestamp);

const formatted = new Intl.DateTimeFormat("en-US", {
  timeZone: branch.timezone ?? "Indian/Mauritius",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
}).format(date);
// → "7:30 PM"
```

**Displaying operating hours:**
Operating hours stored in the DB are plain strings (e.g. `"8 AM"`, `"10 PM"`). They are already expressed in the branch's local timezone — no conversion needed, just display them as-is.

**Checking if the branch is currently open:**

```ts
const now = new Date();

// Get current time in branch's timezone
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: branch.timezone ?? "Indian/Mauritius",
  weekday: "long",
  hour: "numeric",
  hour12: false,
}).formatToParts(now);

// Use the weekday and hour to compare against branch.operatingHours
```

---

## 3. Currency

### Format

**ISO 4217 three-letter uppercase currency code.**

| Example value | Currency          | Symbol |
| ------------- | ----------------- | ------ |
| `MUR`         | Mauritian Rupee   | Rs     |
| `INR`         | Indian Rupee      | ₹      |
| `USD`         | US Dollar         | $      |
| `EUR`         | Euro              | €      |
| `GBP`         | British Pound     | £      |
| `AED`         | UAE Dirham        | د.إ    |
| `AUD`         | Australian Dollar | A$     |
| `SAR`         | Saudi Riyal       | ﷼      |

Full list: `src/lib/currencies.ts` — every entry's `value` field is the ISO 4217 code, and `symbol` is the display symbol.

### Default fallback

```
MUR
```

### Symbol lookup

The admin app resolves a currency code to its symbol via a Map lookup. Replicate this in the customer app:

```ts
// currencies.ts (copy or share this file)

const DEFAULT_CURRENCY = "MUR";

const CURRENCIES = [
  { value: "MUR", symbol: "Rs" },
  { value: "INR", symbol: "₹" },
  { value: "USD", symbol: "$" },
  { value: "EUR", symbol: "€" },
  // ... full list from src/lib/currencies.ts
];

const symbolMap = new Map(CURRENCIES.map((c) => [c.value, c.symbol]));

export function getCurrencySymbol(code?: string): string {
  // Unknown or missing code falls back to the DEFAULT_CURRENCY symbol ("Rs"), not "$".
  if (!code) return symbolMap.get(DEFAULT_CURRENCY)!;
  return symbolMap.get(code) ?? symbolMap.get(DEFAULT_CURRENCY)!;
}
```

### Price formatting

The admin app formats prices as: **`{symbol} {amount.toFixed(2)}`**

```ts
export function formatPrice(amount: number, currencyCode?: string): string {
  return `${getCurrencySymbol(currencyCode)} ${amount.toFixed(2)}`;
}

// Examples:
formatPrice(500, "INR"); // → "₹ 500.00"
formatPrice(12.5, "USD"); // → "$ 12.50"
formatPrice(9.99, "EUR"); // → "€ 9.99"
```

Use this exact format everywhere in the customer app — item prices, cart totals, taxes, charges, order summary — so numbers look identical to the admin view.

**Modifier / addon price formatting** (e.g., in item customization):

```ts
// Admin pattern for addons with positive price:
`+${getCurrencySymbol(currencyCode)}${option.price.toFixed(0)}`;
// → "+₹50"
```

---

## 4. Full data flow (customer app)

```
1. Customer opens branch menu
        ↓
2. Fetch branch from API
   → branch.timezone  (IANA string, e.g. "Asia/Kolkata")
   → branch.currency  (ISO 4217,   e.g. "INR")
        ↓
3. Store both in app state / context
        ↓
4. Display prices using formatPrice(amount, branch.currency)
        ↓
5. Display times using Intl.DateTimeFormat with timeZone: branch.timezone
        ↓
6. Show operating hours as-is (already in branch local time)
```

---

## 5. Tax, charges & discounts on the bill

These amounts are stored as **absolute numbers** in the branch's currency. Just pass them through `formatPrice`:

```ts
// Subtotal
formatPrice(subtotal, currencyCode);

// Per-tax line
formatPrice(tax.amount, currencyCode);

// Per-charge line
formatPrice(charge.amount, currencyCode)
// Discount (prefix with minus)
`-${formatPrice(totalDiscount, currencyCode)}`;

// Grand total
formatPrice(grandTotal, currencyCode);
```

---

## 6. Key rules to stay in sync

| Rule                                      | Detail                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| Always read from `branch`, not `business` | Currency/timezone is per-branch                               |
| Never hardcode a symbol                   | Always resolve from the currency code via `getCurrencySymbol` |
| Never hardcode a timezone offset          | Always use the IANA string with `Intl`                        |
| Fallback currency                         | `MUR` — matches `src/lib/currencies.ts` default               |
| Fallback timezone                         | `Indian/Mauritius` — matches `src/lib/currencies.ts` default  |
| Price decimal places                      | Always 2 — use `.toFixed(2)`                                  |
| Price format                              | `{symbol} {amount}` with a space between symbol and number    |

---

## 7. Files to copy / reference from admin app

| File                    | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `src/lib/currencies.ts` | Full currency list + `getCurrencySymbol` + `formatPrice` |
| `src/lib/timezones.ts`  | Full IANA timezone list (for any picker UI)              |
| `src/types/business.ts` | `Branch` type definition                                 |
