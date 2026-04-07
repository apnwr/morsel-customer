# Receipt Flow

Download receipt as HTML/PDF from the payment success screen.

---

## Flow Overview

```
User completes payment
  |
  v
PaymentResultView renders (result = 'success')
  |
  v
Bottom CTA shows "Get Receipt" button
  |
  v
User taps "Get Receipt"
  |
  v
handleGetReceipt() fires
  |
  +---> Button shows loading spinner (isReceiptLoading = true)
  |
  v
receiptService.getReceipt(sessionId, sessionUserId)
  |
  v
GET /ordering-session/session/{sessionId}/receipt?sessionUserId=xyz
  |
  +---> Server generates HTML receipt
  |     (user-specific if sessionUserId provided)
  |
  v
HTML string returned (text/html, NOT JSON)
  |
  v
Inject sticky "Download PDF" bar at top of <body>
  |
  v
Create Blob(html, 'text/html') → URL.createObjectURL()
  |
  v
window.open(blobUrl, '_blank')  →  New tab opens with receipt
  |
  v
User clicks "Download PDF" button in new tab
  |
  +---> Bar hides itself (excluded from print)
  +---> window.print() fires → browser Save as PDF dialog
  +---> Bar reappears after dialog closes
  |
  v
setTimeout(revokeObjectURL, 10s) cleans up blob
```

---

## Performance Trace

```
[User tap]
  |
  |  0ms   setState(isReceiptLoading = true)
  |         → React re-render: button shows spinner + "Loading..."
  |         → Button disabled (prevents double-tap)
  |
  |  ~1ms  fetch() starts
  |         → Single GET request to server
  |         → Raw text/html response (no JSON parse overhead)
  |         → No auth headers (public endpoint)
  |
  |  ~200-500ms  Network round-trip (server generates receipt)
  |              This is the primary latency cost — depends on:
  |              • Server-side receipt template rendering
  |              • Session data complexity (items, splits, taxes)
  |
  |  ~1ms  String manipulation: inject download button
  |         → Single regex replace on <body> tag
  |         → Negligible cost even for large HTML
  |
  |  ~1ms  Blob creation + URL.createObjectURL()
  |         → In-memory, no disk I/O
  |         → Blob stays in memory until revoked
  |
  |  ~1ms  window.open(blobUrl)
  |         → Browser opens new tab
  |         → HTML renders from in-memory blob (no network)
  |
  |  0ms   setState(isReceiptLoading = false)
  |         → Button returns to normal state
  |
  |  10s   setTimeout → URL.revokeObjectURL()
  |         → Frees blob memory
  |         → 10s delay ensures new tab has loaded
  |
  Total user-perceived latency: ~200-500ms (network-bound)
```

### Why Not `apiClient`?

The receipt endpoint returns `text/html`. The shared `apiClient` always calls `response.json()` (line 66 of `client.ts`), which would throw on HTML. The receipt service uses raw `fetch` + `response.text()` instead.

### Memory Considerations

- One Blob per receipt click — HTML receipts are typically 5-50KB
- `URL.revokeObjectURL()` called after 10s to free memory
- No caching — each tap fetches fresh from server (receipt may change if more payments come in)

### No Prefetch

The receipt is fetched on-demand only when the user taps the button. No prefetch on page load because:
1. The receipt may not be needed (user might not want it)
2. The receipt should reflect the latest payment state at time of request
3. Avoids unnecessary API load

---

## API

| Method | Endpoint | Response | Purpose |
|--------|----------|----------|---------|
| `GET` | `/ordering-session/session/{sessionId}/receipt` | `text/html` | Full session receipt |
| `GET` | `/ordering-session/session/{sessionId}/receipt?sessionUserId=xyz` | `text/html` | User-specific receipt |

### Request

No body. Optional query parameter:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionUserId` | `string` | No | Filter receipt to a specific participant |

### Response

- **200**: HTML string — complete receipt page ready to render
- **404**: Session not found

---

## Injected Download Button

A sticky bar is injected into the HTML before opening in a new tab:

```html
<div id="receipt-actions" style="position:sticky;top:0;...;background:#000;">
  <span style="color:#fff;...">Receipt</span>
  <button onclick="...hide bar → window.print() → show bar...">
    Download PDF
  </button>
</div>
```

- **Sticky**: stays at top while scrolling the receipt
- **Print-aware**: hides itself before `window.print()` so it doesn't appear in the PDF, reappears after

---

## Source Files

| File | Role |
|------|------|
| `src/services/receipt.service.ts` | `getReceipt(sessionId, sessionUserId?)` — fetches HTML via raw fetch |
| `src/lib/api/endpoints.ts` | `endpoints.receipt.generate(sessionId)` — endpoint path |
| `src/components/order/PaymentResultView.tsx` | "Get Receipt" button + `handleGetReceipt()` handler |
| `src/app/orders/page.tsx` | Parent page — renders `PaymentResultView` on payment success |
