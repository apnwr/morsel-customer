# Complete User Flow - Morsel Customer App

## Overview

This document shows the complete user journey from QR scan to order confirmation, highlighting the corrected session architecture with preview/active session separation.

---

## 🎯 Complete Flow Diagram

```mermaid
flowchart TD
    Start([👤 User Scans QR Code]) --> SpacePage[/space/{spaceId}]

    SpacePage --> FetchSession[📡 GET /session/space/{spaceId}]
    FetchSession --> ValidateSpace{Space Valid?}

    ValidateSpace -->|❌ No Space| ErrorNoSpace[❌ Error: Invalid QR code]
    ValidateSpace -->|❌ No Business| ErrorNoBusiness[❌ Error: Business not found]
    ValidateSpace -->|✅ Valid| CheckSession{Existing<br/>Session?}

    ErrorNoSpace --> End1([Show Error Page])
    ErrorNoBusiness --> End1

    CheckSession -->|No Session| SetPreviewNoSession[👁️ Set Preview<br/>User will CREATE session]
    CheckSession -->|Session Exists| ValidateSessionStatus{Session<br/>Status?}

    ValidateSessionStatus -->|'active'| SetPreviewWithSession[👁️ Set Preview<br/>User will JOIN session]
    ValidateSessionStatus -->|'ended'/'closed'| ErrorInactive[❌ Error: Session closed]

    ErrorInactive --> End1

    SetPreviewNoSession --> LoginPage[/login]
    SetPreviewWithSession --> LoginPage

    LoginPage --> ShowPreview[📋 Display:<br/>- Business Name<br/>- Table/Space Name<br/>- Participants Count]
    ShowPreview --> UserInput[👤 User Enters Name]
    UserInput --> UserSubmit{User Clicks<br/>Continue?}

    UserSubmit -->|Cancel| End2([User Leaves])
    UserSubmit -->|✅ Submit| ValidateInput{Name Valid?}

    ValidateInput -->|❌ Invalid| ShowError[Show Validation Error]
    ShowError --> UserInput

    ValidateInput -->|✅ Valid| StartSession[📡 POST /ordering-session/start<br/>{spaceId, guestName}]

    StartSession --> JoinResponse{Join Success?}

    JoinResponse -->|❌ Error| ShowJoinError[❌ Show Error:<br/>Could not join session]
    ShowJoinError --> End3([User Retries or Leaves])

    JoinResponse -->|✅ Success| ExtractUserId[🔍 Extract sessionUserId<br/>from participants array]

    ExtractUserId --> ValidateParticipant{User in<br/>Participants?}

    ValidateParticipant -->|❌ Not Found| ShowJoinError
    ValidateParticipant -->|✅ Found| SaveToStorage[💾 Save to localStorage:<br/>- morsel_session_user_id<br/>- morsel_customer_name<br/>- morsel_dining_type<br/>- morsel_auth_method<br/>- morsel_session_data]

    SaveToStorage --> SetActiveSession[✅ Set Active Session<br/>Context + localStorage]
    SetActiveSession --> MenuPage[/menu]

    MenuPage --> InitSync{Initialize<br/>Cart Sync}

    InitSync --> CheckFirebase{Firebase<br/>Available?}

    CheckFirebase -->|✅ Yes| SetupFirebase[🔥 Setup Firebase Listener<br/>subscribeToOrderQueue]
    CheckFirebase -->|❌ No| SetupPolling[⏰ Setup Polling<br/>15s interval]

    SetupFirebase --> FirebaseSuccess{Subscription<br/>Success?}
    FirebaseSuccess -->|✅ Yes| FirebaseActive[🔥 Firebase Active<br/>Real-time sync ~500ms]
    FirebaseSuccess -->|❌ Error| FallbackPolling[⚠️ Fallback to Polling]

    SetupPolling --> PollingActive[⏰ Polling Active<br/>Sync every 15s]
    FallbackPolling --> PollingActive

    FirebaseActive --> BrowseMenu[📖 User Browses Menu]
    PollingActive --> BrowseMenu

    BrowseMenu --> SelectItem[🍕 Select Menu Item]
    SelectItem --> Customize{Customize<br/>Item?}

    Customize -->|Yes| CustomizePage[/customize]
    Customize -->|No| AddToCart

    CustomizePage --> SelectVariant[Select Variant/Size]
    SelectVariant --> SelectAddons[Select Add-ons]
    SelectAddons --> AddToCart[➕ Add to Cart]

    AddToCart --> UpdateLocalCart[Update Local Cart<br/>+ Tag with sessionUserId]
    UpdateLocalCart --> SyncQueue[📡 POST /session/{id}/queue<br/>Sync cart to API]

    SyncQueue --> BackendWrite{Backend Writes<br/>to Firebase?}

    BackendWrite -->|✅ Yes| FirebaseUpdate[🔥 Firebase Update Event<br/>~200-500ms]
    BackendWrite -->|❌ No| WaitPolling[⏰ Wait for Next Poll<br/>~15s]

    FirebaseUpdate --> OtherDevicesUpdate[📱 Other Devices Updated<br/>See new item instantly]
    WaitPolling --> OtherDevicesUpdate

    OtherDevicesUpdate --> MoreItems{Add More<br/>Items?}

    MoreItems -->|Yes| BrowseMenu
    MoreItems -->|No| ViewCart[🛒 View Cart]

    ViewCart --> ReviewItems[📋 Review All Items<br/>From ALL Participants]
    ReviewItems --> AdjustCart{Edit Cart?}

    AdjustCart -->|Yes - Own Items| ModifyCart[✏️ Modify Quantity/Remove<br/>Only Own Items]
    AdjustCart -->|Try Other's Items| ShowEditError[❌ Can't edit others' items]
    AdjustCart -->|No| ProceedCheckout

    ModifyCart --> SyncQueue
    ShowEditError --> ReviewItems

    ProceedCheckout --> SplitSettings[/split-settings]

    SplitSettings --> ChooseSplit{Choose Split<br/>Method}

    ChooseSplit -->|Even Split| EvenSplit[Split Total Evenly]
    ChooseSplit -->|Item-Level| ItemSplit[Each User Pays<br/>Their Own Items]
    ChooseSplit -->|Custom| CustomSplit[Custom Split]

    EvenSplit --> ReviewSplit[📊 Review Split Breakdown]
    ItemSplit --> ReviewSplit
    CustomSplit --> ReviewSplit

    ReviewSplit --> Checkout[/checkout]

    Checkout --> SelectPayment[💳 Select Payment Method<br/>Cash/Card/UPI]
    SelectPayment --> ConfirmOrder[✅ Confirm Order]

    ConfirmOrder --> CreateOrder[📡 POST /session/{id}/queue/confirm<br/>{sessionUserId, paymentType}]

    CreateOrder --> OrderSuccess{Order<br/>Created?}

    OrderSuccess -->|❌ Error| ShowOrderError[❌ Order Failed<br/>Try Again]
    OrderSuccess -->|✅ Success| SaveOrderLocal[💾 Save Order to localStorage<br/>morsel_order_{orderId}]

    ShowOrderError --> End4([User Retries])

    SaveOrderLocal --> ClearCart[🗑️ Clear Local Cart]
    ClearCart --> RefreshSession[🔄 Refresh Session Data<br/>Update orders array]
    RefreshSession --> OrderStatus[/order-status/{orderId}]

    OrderStatus --> TrackOrder[📍 Track Order Status<br/>Show Preparation Progress]
    TrackOrder --> OrderComplete{Order<br/>Complete?}

    OrderComplete -->|In Progress| PollStatus[⏰ Poll Order Status]
    PollStatus --> TrackOrder

    OrderComplete -->|✅ Ready| ShowReady[🎉 Order Ready!<br/>Enjoy Your Meal]
    ShowReady --> End5([Session Continues])

    End5 --> MoreOrders{Order<br/>More?}
    MoreOrders -->|Yes| MenuPage
    MoreOrders -->|No| EndSession[🚪 End Session]

    EndSession --> CallEndAPI[📡 PUT /session/{id}/end<br/>{sessionUserId}]
    CallEndAPI --> ClearAllData[🗑️ Clear All Data<br/>localStorage + Context]
    ClearAllData --> ThankYou([👋 Thank You!])

    style Start fill:#e1f5e1
    style SetPreviewNoSession fill:#fff3cd,stroke:#ffc107,stroke-width:3px
    style SetPreviewWithSession fill:#fff3cd,stroke:#ffc107,stroke-width:3px
    style SaveToStorage fill:#d4edda,stroke:#28a745,stroke-width:3px
    style SetActiveSession fill:#d4edda,stroke:#28a745,stroke-width:3px
    style FirebaseActive fill:#cce5ff,stroke:#007bff,stroke-width:2px
    style PollingActive fill:#f8d7da,stroke:#dc3545,stroke-width:2px
    style ThankYou fill:#e1f5e1
    style ErrorNoSpace fill:#f8d7da,stroke:#dc3545
    style ErrorNoBusiness fill:#f8d7da,stroke:#dc3545
    style ErrorInactive fill:#f8d7da,stroke:#dc3545
    style ShowError fill:#f8d7da
    style ShowJoinError fill:#f8d7da
    style ShowEditError fill:#f8d7da
    style ShowOrderError fill:#f8d7da
```

---

## 🔑 Key Architectural Points

### 1. **Two Scenarios: Create OR Join**

The `/ordering-session/start` API is SMART and handles both cases:

#### Scenario A: Empty Table (No Session)
```
Customer scans QR → No active session → User enters name → CREATE new session
```
**Use Case:** First customer at the table, starting a new meal

#### Scenario B: Active Table (Existing Session)
```
Customer scans QR → Active session exists → User enters name → JOIN existing session
```
**Use Case:** Additional customers joining friends already at the table

**Key Insight:** We DON'T validate session existence in Space page!
- ✅ Validate: Space exists? Business exists?
- ❌ NOT validate: Session exists? (Empty table is perfectly valid!)
- ✅ Only block: If session exists AND is closed/ended

### 2. **Preview vs Active Session**

| Aspect | Preview Session | Active Session |
|--------|-----------------|----------------|
| **Trigger** | QR scan | User joins (enters name) |
| **Storage** | React state only | localStorage + React state |
| **Lifetime** | Until page refresh | Persists across refreshes |
| **Purpose** | Validation & display | Active participation |
| **sessionUserId** | ❌ None | ✅ Has valid sessionUserId |
| **Cart Sync** | ❌ Not active | ✅ Active |

### 2. **Data Persistence Timeline**

```
QR Scan
  ↓
Preview in Memory (ephemeral)
  ↓
User Enters Name
  ↓
API Join Call
  ↓
✅ SUCCESS
  ↓
💾 SAVE TO localStorage (persistent)
```

### 3. **Cart Sync Architecture**

```
Firebase Available?
  ├─ YES → Firebase Real-time Listener (~500ms updates)
  │         ├─ Success → Use Firebase
  │         └─ Error → Fallback to Polling
  │
  └─ NO → Polling Fallback (15s interval)
```

### 4. **Edit Permissions**

```typescript
// User can only edit/remove THEIR OWN items
if (item.sessionUserId !== currentUser.sessionUserId) {
  showError("Cannot edit other participants' items");
  return;
}
```

---

## 📊 Data Flow States

### State 1: After QR Scan (Preview)
```typescript
{
  previewSession: { /* session data */ },  // ✅ Set
  sessionData: null,                       // ❌ Not set
  localStorage: {},                        // ❌ Empty
  sessionUserId: null                      // ❌ None
}
```
**User can:** View restaurant/table info
**User cannot:** Order items, sync cart

### State 2: After Login (Active)
```typescript
{
  previewSession: { /* session data */ },  // ✅ Still set (harmless)
  sessionData: { /* session data */ },     // ✅ Set
  localStorage: {
    morsel_session_data: {...},           // ✅ Saved
    morsel_session_user_id: "user-A-123"  // ✅ Saved
  },
  sessionUserId: "user-A-123"             // ✅ Valid
}
```
**User can:** Order items, sync cart, see others' items
**User cannot:** Edit others' items

### State 3: Stale Data (Cleaned Up)
```typescript
// On app mount, if this state detected:
{
  localStorage: {
    morsel_session_data: {...},           // ⚠️ Orphaned
    morsel_session_user_id: null          // ❌ Missing!
  }
}

// Auto-cleanup runs:
localStorage.clear(); // All session data removed
```

---

## 🔄 API Calls Summary

### During Session Lifecycle

| Stage | API Call | Method | Saves to localStorage? |
|-------|----------|--------|----------------------|
| QR Scan | `/session/space/{spaceId}` | GET | ❌ No (preview only) |
| Login | `/ordering-session/start` | POST | ✅ Yes (after success) |
| Add to Cart | `/session/{id}/queue` | POST | ✅ Yes (cart updated) |
| Cart Sync | `/session/{id}` | GET | ✅ Yes (merged items) |
| Confirm Order | `/session/{id}/queue/confirm` | POST | ✅ Yes (order created) |
| End Session | `/session/{id}/end` | PUT | ❌ No (clears all) |

---

## 🧪 Test Scenarios

### Scenario 1: Empty Table (Create Session) ✅
1. User A scans QR at empty table
2. `/session/space/{spaceId}` returns: `session: null`
3. Preview set with space/business info
4. User A enters name "Alice"
5. `/ordering-session/start` → **CREATES** new session
6. localStorage saved with sessionUserId
7. User A can now order

### Scenario 2: Joining Existing Session ✅
1. User A already at table, has active session
2. User B scans same QR code
3. `/session/space/{spaceId}` returns: `session: {...}` (active)
4. Preview set showing existing session
5. User B enters name "Bob"
6. `/ordering-session/start` → **JOINS** existing session
7. Both users see each other's items in real-time

### Scenario 3: Abandoned Scan ✅
1. User scans QR → Sees preview
2. Closes app without entering name
3. Preview lost (ephemeral)
4. localStorage remains clean
5. Next user has clean slate

### Scenario 4: Stale Data Cleanup ✅
1. Corrupted state: session saved but no userId
2. App reopens → Detects stale data
3. Auto-cleanup runs
4. localStorage cleared
5. User forced to scan QR again

### Scenario 5: Closed Session ✅
1. User scans QR for closed/ended session
2. Validation detects session exists but status = 'ended'
3. Error shown immediately: "Session is ended"
4. No data saved to localStorage
5. User contacts staff or scans different table

### Scenario 6: Firebase vs Polling ✅
1. **Firebase Works:**
   - User A adds item
   - Firebase event fires ~500ms
   - User B sees update instantly

2. **Firebase Fails:**
   - Falls back to polling
   - User B sees update in ~15s
   - Still works, just slower

---

## 🎨 UI/UX Flow

### Page Progression
```
QR Scan
  ↓
/space/{spaceId}        [Loading Spinner]
  ↓
/login                   [Restaurant Name + Table]
  ↓
/menu                    [Menu Categories + Items]
  ↓
/customize              [Item Customization]
  ↓
/cart                    [Cart Review - All Participants]
  ↓
/split-settings         [Choose Split Method]
  ↓
/checkout               [Payment Selection]
  ↓
/order-status/{id}      [Order Tracking]
```

### Key UX Improvements
1. **Validation Early**: Errors shown before user commits (enters name)
2. **No Wasted Effort**: User doesn't enter name for closed/invalid sessions
3. **Clear Feedback**: Loading states, error messages, success confirmations
4. **Real-time Updates**: Other participants' actions visible instantly (Firebase)
5. **Graceful Fallback**: Polling works if Firebase unavailable

---

## 🔐 Security & Data Integrity

### Session Validation Checkpoints
1. ✅ **Before Login**: Session exists and is active
2. ✅ **After Login**: User in participants array
3. ✅ **Before Cart Ops**: User has valid sessionUserId
4. ✅ **Before Edit**: Item belongs to current user
5. ✅ **Before Order**: Cart not empty, session still active

### Data Cleanup Rules
1. ✅ Session without userId → Clear on mount
2. ✅ Corrupted JSON → Clear and force re-scan
3. ✅ After order → Clear cart only (session persists)
4. ✅ End session → Clear all data (session + cart + user)

---

## 📝 Implementation Checklist

- [x] SessionContext with preview/active separation
- [x] Space page validates session before proceeding
- [x] Login page saves only after successful join
- [x] Automatic stale data cleanup on mount
- [x] sessionUserId extracted from API (not client-generated)
- [x] Cart sync with Firebase/polling hybrid
- [x] Edit restrictions (own items only)
- [x] Comprehensive logging at each step
- [ ] Backend writes to Firebase Realtime DB
- [ ] Firebase security rules deployed
- [ ] Multi-device testing completed

---

## 🚀 Next Steps

1. **Backend Integration**: Ensure backend writes to Firebase when queue updates
2. **Firebase Rules**: Deploy security rules to Firebase Console
3. **Testing**: Test with multiple devices to verify real-time sync
4. **Monitoring**: Set up Firebase usage monitoring
5. **Documentation**: Train team on new architecture

---

**Last Updated:** 2026-01-09
**Version:** 2.0 (Corrected Architecture with Preview/Active Session Separation)
