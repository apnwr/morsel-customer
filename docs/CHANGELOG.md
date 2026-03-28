# Changelog

All notable changes to the morsel-customer project.

Format: `[TYPE] description` where TYPE is ADD, CHANGE, FIX, or REMOVE.

---

## Unreleased

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
