# Changelog

All notable changes to the morsel-customer project.

Format: `[TYPE] description` where TYPE is ADD, CHANGE, FIX, or REMOVE.

---

## Unreleased

### Payment flow & split

- [ADD] Dedicated `/payment` route replacing modal-based checkout
- [ADD] `PeachCheckoutView` (full-page widget host) replaces `PeachCheckoutModal`
- [CHANGE] Pay Now navigates to `/payment` with query-param amount/tip from PostOrderView and my-tab
- [ADD] Server-first share resolution — `splitPaymentStatus` is the source of truth for per-participant amount and mode label (PostOrderView, my-tab, ParticipantsList, PaymentResultView)
- [ADD] Itemized picker cross-device awareness — claimed/paid badges per item, save-time conflict refetch, server-first hydration
- [ADD] `SplitSettingsModal` mode lock — once a server split exists, mode switching is disabled; itemized stays interactive for claiming remaining items
- [CHANGE] `syncSplitToServer` returns `Promise<void>` and rethrows on failure so UI can surface errors
- [ADD] Type definitions for new POST `/split` response — `splitId` UUID, per-split `type`/`tax`/`charges`/`tip`, `remainingTotal`/`totalPaid`; legacy `splitConfig` retained as optional fallback
- [ADD] `serverSplitType` derived selector in `SessionContext` (`splits[0].type` → `splitConfig.type` fallback)
- [CHANGE] Consumers read `serverSplitType` instead of `serverSplitConfig.type` (`SplitContext`, `SplitSettingsModal`, `ParticipantsList`, `PaymentResultView`)
- [CHANGE] `/payment` plumbs `splitId` UUID to `verifyPayment` (additive); `splitIdentifier` on `createEmbeddedCheckout` kept as legacy index-string for backward compat
- [FIX] `/payment` `refreshSessionData()` now awaited before `hasRefreshed` flips — eliminates false-positive "Split changed" guard from stale state
- [FIX] `usePeachCheckout` opt-in override that trusts Peach `result.code` regex when backend wrongly reports `success: false` (`NEXT_PUBLIC_PEACH_TRUST_CLIENT`, dev-only)

### State sync & error surfacing

- [FIX] `CartContext` rollback on POST failure now uses mutation-id counter — stale failures no longer clobber newer in-flight mutations
- [ADD] `cartSyncError` flag exposed; Header snackbar gains `sync-error` variant ("Couldn't save — try again")
- [ADD] `TipSelector` inline error message when tip sync fails
- [CHANGE] `SessionContext.clearSession` also clears `morsel_cart`, `morsel_kitchen_note`, `morsel_tip`, `morsel_menu_items_cache` to prevent leakage across sessions/flows

### Currency

- [FIX] Custom-split modal honors active locale — replaces hardcoded `$` with `getCurrencySymbol(currency)`; symbol-agnostic strip regex (`/^.*\s/`); live-tracking invisible width spacer

### Menu UI

- [CHANGE] Menu item rows flipped — image on right, info on left (`flex-row-reverse`)
- [CHANGE] No-image items hide the image element entirely; standalone Add/stepper sits in a 40%-wide centered column to match image-row centerline
- [ADD] Category header — full-bleed pink (`#FFE7EC`) band, brand-color (`#FF2F55`) chevron, count chip, full-row tap target, `aria-expanded` for screen readers
- [ADD] Menu name header — full-bleed black band with white text
- [CHANGE] Bands use viewport-anchored width (`w-screen mx-[calc(50%-50vw)]`) for symmetric edge-to-edge; `overflow-x-hidden` on menu page wrapper to clip scrollbar slop
- [ADD] `divide-y divide-gray-200` hairline separators between menu items; symmetric 28 px rhythm across all internal boundaries (item ↔ item, item ↔ category band, category ↔ menu band)
- [CHANGE] `MenuItem` owns its outer padding — `pt-4 pb-7` on image rows to compensate for floating Add-button overhang, `pt-4 pb-4` on no-image rows
- [REMOVE] Per-row `imageLoading` state and initials fallback (no-image rows render no image element at all)
- [CHANGE] "Add" CTA standardized — conditional `+` icon removed; every Add reads identically (customizable still triggers modal on tap)
- [CHANGE] Quantity-stepper `+` migrated from PNG to lucide `<Plus />` (matches existing `<Minus />`)
- [CHANGE] Category-band chevron migrated from `/icons/Chevron.png` to lucide `<ChevronRight />`
- [CHANGE] `MenuNavPopup` palette aligned with menu page — black menu-name band, pink section pills, brand-color chevron; hover effects removed for mobile-safe interaction
- [CHANGE] Hover effects dropped from category band on the menu page (kept `active:` for tap feedback) — avoids iOS Safari sticky-hover

### Branding

- [ADD] Brand favicon and apple-touch-icon at `src/app/icon.png` and `src/app/apple-icon.png` (Next.js file conventions)
- [REMOVE] Default unbranded `src/app/favicon.ico`

### Cleanup

- [REMOVE] `src/app/order-summary/page.tsx`, `src/components/cart/BillModal.tsx`, `src/components/cart/SplitSection.tsx`, `src/components/order/RunningTabs.tsx` (superseded by new payment flow)
- [REMOVE] `DebugPanel` "Order Summary" button (dead route)

### Docs

- [ADD] `docs/backend-split-schema-proposal.md` — backend upsert + schema-cleanup proposal
- [ADD] `docs/itemized-split-and-payment-flow.md` — flow diagrams (sessions, splits, picker, payment)
- [ADD] `docs/session-sync-and-payment-refactor.md` — change log for the session-sync work cycle
- [ADD] `docs/client-improvement-plan.md` — performance & robustness improvement plan (tranched roadmap + measurement)

### Pre-existing in this Unreleased cycle

- [ADD] Menu availability feature — menus can be disabled based on day/time window from API (feature-toggled off via `config.features.menuAvailabilityCheck`)
- [ADD] `subscribeToSessionInfo` Firebase listener — full sessionInfo node subscription including timezone/currency
- [CHANGE] SessionContext switched from `subscribeToParticipantsBySpace` to `subscribeToSessionInfo` for real-time timezone/currency updates
- [CHANGE] ParticipantsList switched from legacy `subscribeToParticipants` to `subscribeToParticipantsBySpace` (new Firebase path)
- [ADD] Feature toggle system in `src/lib/config.ts`
- [ADD] Merged 4 separate API YAML docs into single valid `docs/api-docs.yaml`
- [ADD] `docs/api-docs.md` — concise API reference
- [ADD] `docs/realtime-database.md` — Firebase RTDB structure and listener documentation
- [ADD] `docs/menu-availability.md` — menu availability feature documentation
- [ADD] `docs/user-journey.md` — complete user journey documentation
- [ADD] `docs/CHANGELOG.md` — this file

---

## Previous (from git history)

- [FIX] my-tab page
- [FIX] orders > fixes on orders page
- [FIX] cart + order page + performance
- [ADD] global timezone and currency support + footer fixes
- [CHANGE] orders page view change
- [ADD] Cart page changes — tips + header hamburger
- [ADD] cart page split settings UI change + footer changes
- [CHANGE] header > design change
- [ADD] single document persistency while removing all other documents
- [FIX] addons issue due to new structure change (falling back to legacy structure)
- [FIX] /menu > visible item list segregated white patch at bottom
- [FIX] UI changes for header and footer
- [FIX] addon fixes + logo fix
- [FIX] login page issue + others on customisation modal
- [FIX] total value would be item total as taxes are inclusive
- [ADD] spice levels + header footer sticky behaviour issue
- [FIX] pay for self options + add/remove approach
- [ADD] menu item whole card clickable
- [ADD] veg/non-veg support to all items + cart image sync on post order view + item addition/removal flow enhanced
- [CHANGE] items image size changes
