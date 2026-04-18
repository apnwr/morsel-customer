# Bottom Bar Pattern

Canonical approach for rendering fixed bottom CTAs and bars across the app. Ensures consistent behavior on iOS (home-indicator), Android (gesture-nav pill), and desktop without bleed-through or cropped content.

**Status:** Enforced as of 2026-04-18.
**Applies to:** every `position: fixed; bottom: 0` element that hosts user content (CTAs, search bars, action bars).

---

## 1. The primitive

```tsx
<button
  className="w-full h-[70px] box-content bg-black text-white ..."
  style={{
    bottom: 0,
    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
  }}
>
  ...content...
</button>
```

Three load-bearing pieces:

| Piece | Why |
|---|---|
| `bottom: 0` | The bar's bg extends to the **physical** viewport bottom — no transparent gap where page content or the page footer can bleed through |
| `paddingBottom: max(env(safe-area-inset-bottom, 0px), 16px)` | Respects iOS home-indicator (~34px) when present; guarantees a 16px cushion on Android gesture-nav where `env()` returns 0 |
| `box-content` | Padding is added **outside** the 70px content height instead of shrinking the tap area. Total bar height = 70px content + safe-area padding |

### Why not Tailwind for the padding?

`max(env(...), 16px)` inside a Tailwind arbitrary value works in JIT but has parser quirks with nested parens. Inline style is unambiguous and matches how `env()` is documented in MDN.

---

## 2. When the bottom element is conditional

If a bar has a conditional bottom element (e.g. `/menu`'s SearchBar, which only renders the Confirm Order CTA when the cart has items), put `paddingBottom` on **whichever element is currently last**:

```tsx
const safeAreaPadding = 'max(env(safe-area-inset-bottom, 0px), 16px)';

<div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[30px] overflow-hidden">
  <div
    className="h-[60px] box-content ..."
    style={showCTA ? undefined : { paddingBottom: safeAreaPadding }}
  >
    {/* search row */}
  </div>

  {showCTA && (
    <button
      className="h-[70px] box-content bg-black ..."
      style={{ paddingBottom: safeAreaPadding }}
    >
      {/* CTA */}
    </button>
  )}
</div>
```

The bar's bg-color behind the safe-area zone is always the same color as the element absorbing it — no color mismatch.

---

## 3. Where the pattern is used (as of 2026-04-18)

| File | Bar | Pattern location |
|---|---|---|
| `src/components/menu/SearchBar.tsx` | Search + Menu + (optional Confirm Order) | Conditional `padding-bottom` on last visible child |
| `src/components/cart/PreOrderView.tsx` | Place Order | On the button (wrapper stays `bottom: 0`) |
| `src/components/order/PostOrderView.tsx` | Pay Now / Paid | On the button |
| `src/components/order/PaymentResultView.tsx` | Get Receipt / Retry Payment | On both buttons |
| `src/app/my-tab/page.tsx` | Pay Now | Directly on the fixed button (no wrapper) |
| `src/components/order/ItemizedPickerSheet.tsx` | Pay Now (inside sheet) | On the button |

---

## 4. Anti-patterns (do not do)

### ❌ Anti-pattern A — lifting the bar with `bottom: max(env, 16px)`

```tsx
style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
```

**Problem:** the bar floats 16px above the physical viewport bottom. Whatever is in normal document flow below (page Footer, privacy links, etc.) **bleeds through the gap**. First reported on `/cart` — Footer text "By using morsel app…" visible behind the Place Order bar.

**Correct alternative:** `bottom: 0` + `paddingBottom: max(env, 16px)` on the bar's bg-colored inner element.

### ❌ Anti-pattern B — `padding-bottom` on a transparent wrapper

```tsx
<div className="fixed bottom-0" style={{ paddingBottom: safeAreaPadding }}>
  <button className="bg-black">...</button>
</div>
```

**Problem:** the wrapper is transparent, so the `paddingBottom` zone shows the page background below the black button — same visible-gap symptom as Anti-pattern A.

**Correct alternative:** put `paddingBottom` on the bg-colored element itself, with `box-content`.

### ❌ Anti-pattern C — `h-[70px]` without `box-content`

```tsx
<button className="h-[70px]" style={{ paddingBottom: safeAreaPadding }}>
```

**Problem:** Tailwind's default `box-sizing: border-box` includes padding **inside** the 70px. The content area shrinks from 70px to ~54px (or ~36px on iOS), cramping the CTA text/icons.

**Correct alternative:** add `box-content` so padding is external. Content stays 70px; total height grows to accommodate the padding.

### ❌ Anti-pattern D — `env(safe-area-inset-bottom, 0px)` without the `max(..., 16px)` fallback

```tsx
paddingBottom: 'env(safe-area-inset-bottom, 0px)'
```

**Problem:** Android Chrome gesture-nav returns `0` for this `env()` value, so the bar sits flush with the gesture pill and gets visually clipped. The `max(..., 16px)` guarantees a minimum cushion everywhere.

---

## 5. Page padding — don't forget the flip side

Any page rendering a fixed bottom bar needs enough `padding-bottom` on its content container so the last item isn't hidden behind the bar.

Current conventions (tune when bar heights change):

| Page | Bar height (content + max padding) | Page `pb-*` |
|---|---|---|
| `/menu` — cart empty | 60 + 34 = 94px | `pb-[100px]` |
| `/menu` — cart has items | 60 + 70 + 34 = 164px | `pb-[170px]` |
| `/cart` | 70 + 34 = 104px | (see `PreOrderView`) |
| `/orders` pre/post pay | 70 + 34 = 104px | (see each view) |

The value needs to exceed the bar's iOS worst case (content height + ~34px for the home indicator).

---

## 6. Checklist when adding a new bottom bar

- [ ] `position: fixed; bottom: 0; left: 0; right: 0`
- [ ] `box-content` on the element carrying the bg color
- [ ] `paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'` on the same element
- [ ] If the last element is conditional, choose which gets `paddingBottom` dynamically
- [ ] Page wrapper has `pb-*` large enough to clear the bar on iOS home-indicator devices
- [ ] `transform: translateZ(0)` + `backfaceVisibility: hidden` on the fixed element (iOS Safari fixed-positioning jitter guard)
- [ ] `z-index` high enough to sit over content but below modals (`z-20` for CTAs, `z-40` for search bars)

---

## 7. Related docs

- `docs/post-order-view-redesign.md` — original Figma plan for the Pay Now bar (historical)
- `docs/my-tab-page-architecture.md` — describes the my-tab Pay Now bar
- `docs/cart-to-payment-flow.md` — describes the cart → payment flow including the Place Order bar
- `src/app/globals.css` — `.pb-safe` / `.fixed-bottom-safe` utility classes use the same `max(env, 16px)` primitive (unused today; available if a component wants a shortcut)
