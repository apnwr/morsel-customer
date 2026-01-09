# Firebase Backend Integration - Required Changes

## 🚨 Current Issue

**Frontend is listening to Firebase, but backend is NOT writing to it.**

The frontend successfully creates Firebase listeners, but they never receive updates because the backend only writes to your primary database (MongoDB/Firestore), not to Firebase Realtime Database.

---

## 📊 Current State

### Frontend (✅ Working):
```typescript
// CartContext listening to Firebase
subscribeToOrderQueue(
  sessionId,
  (orderQueue) => {
    console.log('Firebase update received!'); // ❌ NEVER FIRES
    updateCart(orderQueue);
  }
);
```

### Backend (❌ Missing):
```javascript
// When queue is updated via API
POST /session/{sessionId}/queue

// Current: Only updates primary DB
await db.collection('sessions').doc(sessionId).update({
  orderQueue: newQueue
});

// Missing: Should ALSO write to Firebase Realtime DB
await admin.database()
  .ref(`sessions/${sessionId}/orderQueue`)
  .set(newQueue);
```

---

## 🔧 Required Backend Changes

### 1. Add Firebase Admin SDK

**Install:**
```bash
npm install firebase-admin
```

**Initialize (in your backend):**
```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://morsel-db7d8-default-rtdb.europe-west1.firebasedatabase.app'
});

const realtimeDb = admin.database();
```

### 2. Write to Firebase on Queue Updates

**When adding/updating items in queue:**
```javascript
// POST /session/{sessionId}/queue
async function updateOrderQueue(sessionId, sessionUserId, items) {
  // 1. Update primary database (MongoDB/Firestore) - existing code
  await db.collection('sessions').doc(sessionId).update({
    [`orderQueue.${sessionUserId}`]: {
      sessionUserId,
      items,
      updatedAt: Date.now()
    }
  });

  // 2. ✅ ALSO write to Firebase Realtime DB for real-time sync
  await realtimeDb.ref(`sessions/${sessionId}/orderQueue/${sessionUserId}`).set({
    sessionUserId,
    items,
    updatedAt: Date.now()
  });

  console.log('✅ Written to both primary DB and Firebase');
}
```

**When confirming order (removing from queue):**
```javascript
// POST /session/{sessionId}/queue/confirm
async function confirmOrder(sessionId, sessionUserId) {
  // 1. Remove from primary database
  await db.collection('sessions').doc(sessionId).update({
    [`orderQueue.${sessionUserId}`]: admin.firestore.FieldValue.delete()
  });

  // 2. ✅ Remove from Firebase Realtime DB
  await realtimeDb.ref(`sessions/${sessionId}/orderQueue/${sessionUserId}`).remove();

  console.log('✅ Removed from both primary DB and Firebase');
}
```

### 3. Write Participants Data

```javascript
// When user joins session
async function joinSession(sessionId, participant) {
  // 1. Update primary database
  await db.collection('sessions').doc(sessionId).update({
    participants: admin.firestore.FieldValue.arrayUnion(participant)
  });

  // 2. ✅ Write to Firebase
  await realtimeDb.ref(`sessions/${sessionId}/participants/${participant.sessionUserId}`).set({
    sessionUserId: participant.sessionUserId,
    guestName: participant.guestName,
    joinedAt: Date.now()
  });
}
```

---

## 📁 Expected Firebase Structure

```
sessions/
  ├── {sessionId}/
  │   ├── status: "active"
  │   ├── orderQueue/
  │   │   ├── {sessionUserId-1}/
  │   │   │   ├── sessionUserId: "user-A-123"
  │   │   │   ├── items: [...]
  │   │   │   └── updatedAt: 1736438400000
  │   │   ├── {sessionUserId-2}/
  │   │   │   ├── sessionUserId: "user-B-456"
  │   │   │   ├── items: [...]
  │   │   │   └── updatedAt: 1736438500000
  │   ├── participants/
  │   │   ├── {sessionUserId-1}/
  │   │   │   ├── sessionUserId: "user-A-123"
  │   │   │   ├── guestName: "Alice"
  │   │   │   └── joinedAt: 1736438300000
  │   └── lastUpdated: 1736438500000
```

---

## 🧪 How to Test

### 1. Check Firebase Console

Visit: https://console.firebase.google.com/project/morsel-db7d8/database

Look for:
- `sessions/{sessionId}/orderQueue`
- `sessions/{sessionId}/participants`

**If these paths are empty** → Backend is not writing

### 2. Test Flow

1. Add item to cart
2. Check Firebase Console immediately
3. Should see new entry in `sessions/{sessionId}/orderQueue/{sessionUserId}`
4. Frontend should receive Firebase update instantly (~500ms)

### 3. Frontend Logs to Expect

```
[Firebase Realtime] 📥 Queue snapshot received: {hasData: true, keys: 2}
[Firebase Realtime] 📦 Queue updated: {entries: 2, ...}
[CartContext] 🔥 Firebase update received, processing data...
```

Instead of:
```
[CartContext] ⏰ Polling sync triggered (Firebase not active)  ← Currently seeing this
[CartContext] 📡 API CALL: ...  ← Should NOT see this if Firebase works
```

---

## 🔐 Firebase Security Rules

After backend is writing data, deploy these security rules:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "orderQueue": {
          "$userId": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        },
        "participants": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

---

## ⚡ Performance Impact

### Before (Polling):
- Updates every 15 seconds
- Multiple users = multiple API calls
- High server load
- Delayed updates

### After (Firebase):
- Updates in ~500ms (real-time)
- Single WebSocket connection shared by all users
- Minimal server load
- Instant updates across all devices

---

## 🎯 Implementation Checklist

Backend Changes:
- [ ] Install `firebase-admin` SDK
- [ ] Initialize Firebase Admin with service account
- [ ] Add Firebase write in `POST /session/{id}/queue`
- [ ] Add Firebase write in `POST /session/{id}/queue/confirm`
- [ ] Add Firebase write when participants join
- [ ] Add Firebase write when session status changes

Testing:
- [ ] Verify data appears in Firebase Console
- [ ] Test with 2 devices - confirm real-time sync
- [ ] Check frontend stops polling (no more API calls)
- [ ] Verify Firebase logs show updates

Deployment:
- [ ] Deploy Firebase security rules
- [ ] Set up Firebase usage monitoring
- [ ] Update backend environment variables

---

## 📞 Current Status

✅ **Frontend**: Fully implemented and ready
❌ **Backend**: Not writing to Firebase (blocking real-time sync)
⏳ **Status**: Waiting for backend integration

Once backend writes to Firebase, frontend will automatically switch from polling to real-time updates.

---

**Last Updated:** 2026-01-09
**Status:** Backend integration required
