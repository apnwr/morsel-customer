# Firebase Path Mismatch - Complete Fix

## 🚨 Root Cause

**Backend writes to:**
```
activeSessionsBySpace/{spaceId}/sessionInfo/
```

**Frontend listens to:**
```
sessions/{sessionId}/orderQueue/
```

**Result:** Frontend never receives updates → Falls back to polling

---

## 📊 Current Firebase Structure (Backend)

```
activeSessionsBySpace/
  8ksZCIGCSsOiWlSGtTtb/     ← spaceId
    sessionInfo/
      businessId: "bgmIhzjSgWckvj2kUPxV"
      id: "0BMumColetGiDW77sant"   ← sessionId
      ordersCount: 0
      participantsCount: 3         ← Just a count!
      status: "active"
      spaceId: "8ksZCIGCSsOiWlSGtTtb"
      expiresAt: "..."
      updatedAt: "..."
```

**Missing:**
- ❌ No `orderQueue` with actual items
- ❌ No `participants` with actual user data

---

## ✅ Required Backend Changes

### 1. Add Order Queue Data

**When items are added to queue:**
```javascript
// POST /session/{sessionId}/queue
async function updateOrderQueue(sessionId, sessionUserId, items, spaceId) {
  // 1. Update primary database (existing)
  await db.collection('sessions').doc(sessionId).update({...});

  // 2. ✅ ADD: Write to Firebase at correct path
  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/orderQueue/${sessionUserId}`).set({
    sessionUserId,
    items,
    updatedAt: Date.now()
  });

  // 3. ✅ ADD: Update orderQueue count
  const snapshot = await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/orderQueue`).once('value');
  const queueData = snapshot.val() || {};
  const totalItems = Object.values(queueData).reduce((sum, user) => sum + (user.items?.length || 0), 0);

  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/sessionInfo`).update({
    ordersCount: totalItems,
    updatedAt: new Date().toISOString()
  });
}
```

### 2. Add Participants Data

**When user joins session:**
```javascript
// POST /ordering-session/start
async function joinSession(sessionId, participant, spaceId) {
  // 1. Update primary database (existing)
  await db.collection('sessions').doc(sessionId).update({...});

  // 2. ✅ ADD: Write to Firebase
  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/participants/${participant.sessionUserId}`).set({
    sessionUserId: participant.sessionUserId,
    guestName: participant.guestName,
    joinedAt: Date.now()
  });

  // 3. ✅ ADD: Update participant count
  const snapshot = await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/participants`).once('value');
  const participantsData = snapshot.val() || {};

  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/sessionInfo`).update({
    participantsCount: Object.keys(participantsData).length,
    updatedAt: new Date().toISOString()
  });
}
```

### 3. Remove from Queue on Confirm

**When order is confirmed:**
```javascript
// POST /session/{sessionId}/queue/confirm
async function confirmOrder(sessionId, sessionUserId, spaceId) {
  // 1. Remove from primary database (existing)
  await db.collection('sessions').doc(sessionId).update({...});

  // 2. ✅ ADD: Remove from Firebase
  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/orderQueue/${sessionUserId}`).remove();

  // 3. ✅ ADD: Update count
  const snapshot = await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/orderQueue`).once('value');
  const queueData = snapshot.val() || {};
  const totalItems = Object.values(queueData).reduce((sum, user) => sum + (user.items?.length || 0), 0);

  await realtimeDb.ref(`activeSessionsBySpace/${spaceId}/sessionInfo`).update({
    ordersCount: totalItems,
    updatedAt: new Date().toISOString()
  });
}
```

---

## 🔧 Expected Firebase Structure (After Backend Fix)

```
activeSessionsBySpace/
  8ksZCIGCSsOiWlSGtTtb/              ← spaceId
    sessionInfo/
      businessId: "bgmIhzjSgWckvj2kUPxV"
      id: "0BMumColetGiDW77sant"
      ordersCount: 5                  ← Total items across all users
      participantsCount: 3
      status: "active"
      spaceId: "8ksZCIGCSsOiWlSGtTtb"
      expiresAt: "..."
      updatedAt: "..."

    orderQueue/                       ← ✅ NEW
      user-A-123/
        sessionUserId: "user-A-123"
        items: [
          {
            menuItemId: "...",
            quantity: 2,
            customizations: [...]
          }
        ]
        updatedAt: 1736438500000

      user-B-456/
        sessionUserId: "user-B-456"
        items: [...]
        updatedAt: 1736438600000

    participants/                     ← ✅ NEW
      user-A-123/
        sessionUserId: "user-A-123"
        guestName: "Alice"
        joinedAt: 1736438300000

      user-B-456/
        sessionUserId: "user-B-456"
        guestName: "Bob"
        joinedAt: 1736438400000
```

---

## 📱 Frontend Changes

Once backend adds the data, update frontend to use correct path:

### Update: `src/lib/firebase/realtime.service.ts`

```typescript
// Change from:
const queueRef = ref(db, `sessions/${sessionId}/orderQueue`);

// To:
const queueRef = ref(db, `activeSessionsBySpace/${spaceId}/orderQueue`);
```

### Update: `src/contexts/CartContext.tsx`

Pass `spaceId` instead of `sessionId` to Firebase subscription:

```typescript
const unsubscribe = subscribeToOrderQueue(
  sessionData.space.id,  // ← Use spaceId, not sessionId
  (orderQueue) => {
    processOrderQueueData(orderQueue);
  },
  (error) => {
    console.error('Firebase error:', error);
    setupPolling();
  }
);
```

---

## 🧪 Testing Steps

### 1. Verify Backend Writes

After backend changes, add an item to cart and check Firebase Console:

**Expected to see:**
```
activeSessionsBySpace/
  {your-spaceId}/
    orderQueue/
      {your-userId}/
        items: [...]
```

### 2. Verify Frontend Listens

Check browser console for:
```
[Firebase Realtime] 📥 Queue snapshot received: {hasData: true, keys: 1}
[CartContext] 🔥 Firebase update received, processing data...
```

**Should NOT see:**
```
[CartContext] ⏰ Polling sync triggered  ← If you see this, Firebase isn't working
```

### 3. Verify Real-time Sync

1. Open app on Device A
2. Add item to cart on Device A
3. Open app on Device B (same session)
4. **Device B should see item within ~500ms**

---

## 🎯 Quick Verification

**Is backend writing correctly?**

Check Firebase Console at path:
```
activeSessionsBySpace/{your-current-spaceId}/orderQueue
```

- ✅ If you see data → Backend is writing correctly, update frontend
- ❌ If empty → Backend needs to add the writes shown above

**Current status:** ❌ Backend is NOT writing `orderQueue` or `participants` data

---

## 📋 Implementation Checklist

### Backend (Required):
- [ ] Add `orderQueue/{userId}` write when items added
- [ ] Add `participants/{userId}` write when user joins
- [ ] Remove from `orderQueue/{userId}` when order confirmed
- [ ] Update counts in `sessionInfo` after each change
- [ ] Test with Firebase Console - verify data appears

### Frontend (After backend fix):
- [ ] Update `subscribeToOrderQueue` to use `activeSessionsBySpace` path
- [ ] Pass `spaceId` instead of `sessionId` to subscription
- [ ] Update `subscribeToParticipants` similarly
- [ ] Test real-time updates work
- [ ] Verify polling stops (no more API calls)

---

## 🔑 Summary

**Problem:** Backend only writes session metadata, not actual data (orderQueue, participants)

**Solution:** Backend must write:
1. `activeSessionsBySpace/{spaceId}/orderQueue/{userId}` - Actual cart items
2. `activeSessionsBySpace/{spaceId}/participants/{userId}` - User details

Then frontend can listen to these paths for real-time updates.

**Priority:** Backend changes first, then frontend path update

---

**Status:** ⏳ Waiting for backend to write orderQueue and participants data
**Last Updated:** 2026-01-09
