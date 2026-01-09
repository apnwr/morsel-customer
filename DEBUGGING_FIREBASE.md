# Firebase Real-time Sync Debugging Guide

## Current Issue

API is still being polled continuously despite Firebase being enabled:
```
https://us-central1-morsel-db7d8.cloudfunctions.net/app/api/v1/ordering-session/session/0BMumColetGiDW77sant
```

This guide will help you diagnose why Firebase is not connecting properly.

---

## Step 1: Check Browser Console

Open your browser's DevTools (F12) and look for Firebase logs. The logs will tell you exactly what's happening.

### 🟢 Expected Logs (Firebase Working)

If Firebase is working correctly, you should see:

```
[Firebase] 🔍 Availability check: {
  isAvailable: true,
  featureFlag: true,
  hasApiKey: true,
  hasDatabaseURL: true,
  hasProjectId: true,
  hasAppId: true
}

[Firebase] ✅ Firebase app initialized successfully
[Firebase] ✅ Firebase Realtime Database initialized
[Firebase] 🐛 Debug logging enabled

[CartContext] ✅ Valid session detected, setting up sync
[CartContext] 🔍 Firebase availability check result: true
[CartContext] 🔥 Firebase available - setting up realtime listener

[Firebase Realtime] 🔄 Subscribing to order queue: {
  sessionId: "0BMumCol...",
  path: "sessions/0BMumColetGiDW77sant/orderQueue",
  refExists: true
}

[Firebase Realtime] ✅ Queue subscription created successfully
[CartContext] 🔍 subscribeToOrderQueue returned: function
[CartContext] ✅ Firebase listener active - NO POLLING WILL BE USED

[CartContext] 📡 API CALL: ... (This is the initial sync only)
[CartContext] 🔍 Sync trigger context: {
  isUsingFirebase: true,
  hasActiveFirebaseListener: true,
  hasPollingInterval: false,
  reason: "Initial sync (Firebase active)"
}

[Firebase Realtime] 📥 Queue snapshot received: {
  hasData: true,
  dataType: "object",
  keys: 2
}
```

**After this, you should see NO MORE API CALLS. All updates come via Firebase.**

---

### 🔴 Problem 1: Firebase Feature Flag Disabled

If you see:

```
[Firebase] Firebase Realtime DB is disabled via feature flag
[CartContext] ℹ️ Firebase not available, using polling fallback
[CartContext] ⏰ Polling active (every 15 seconds)
```

**Solution:**
1. Check `.env.local` has `NEXT_PUBLIC_ENABLE_FIREBASE=true`
2. Restart your dev server (`npm run dev` or `yarn dev`)
3. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+F5)

---

### 🔴 Problem 2: Firebase Config Missing

If you see:

```
[Firebase] 🔍 Availability check: {
  isAvailable: false,
  featureFlag: true,
  hasApiKey: false,    // ⚠️ Missing!
  hasDatabaseURL: false, // ⚠️ Missing!
  hasProjectId: false,  // ⚠️ Missing!
  hasAppId: false
}
```

**Solution:**
1. Check `.env.local` exists in project root
2. Verify it contains all required variables:
   ```bash
   NEXT_PUBLIC_ENABLE_FIREBASE=true
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAvgKtn50rmAlXOFCthOa_UKHLPdIMEzto
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://morsel-db7d8-default-rtdb.europe-west1.firebasedatabase.app
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=morsel-db7d8
   NEXT_PUBLIC_FIREBASE_APP_ID=1:977474446070:web:7e4cc551c78739021042d7
   ```
3. Restart dev server (environment variables only load on startup)

---

### 🔴 Problem 3: Firebase Subscription Failed

If you see:

```
[CartContext] 🔥 Firebase available - setting up realtime listener
[Firebase Realtime] 🔄 Subscribing to order queue: ...
[CartContext] 🔍 subscribeToOrderQueue returned: null
[CartContext] ⚠️ Firebase subscription returned null, using polling
```

**Solution:**
1. Check for error messages in console
2. Common errors:
   - **Permission denied**: Firebase security rules are blocking access
   - **Network error**: Firewall or network blocking Firebase
   - **Invalid config**: API key or database URL is incorrect

---

### 🔴 Problem 4: Firebase Error After Connection

If you see:

```
[Firebase Realtime] ✅ Queue subscription created successfully
[Firebase Realtime] ❌ Error listening to queue: {
  error: "PERMISSION_DENIED: Permission denied",
  code: "PERMISSION_DENIED"
}
[CartContext] 🔥❌ Firebase error, falling back to polling
```

**Solution:**
This means Firebase security rules are blocking access. The rules require authentication:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "auth != null",  // ⚠️ Requires authentication!
        ".write": "auth != null"
      }
    }
  }
}
```

**Temporary fix for testing (NOT FOR PRODUCTION):**
1. Go to [Firebase Console](https://console.firebase.google.com/project/morsel-db7d8)
2. Click **Realtime Database** → **Rules** tab
3. Change rules to:
   ```json
   {
     "rules": {
       ".read": "true",
       ".write": "true"
     }
   }
   ```
4. Click **Publish**

**⚠️ WARNING:** This allows anyone to read/write your database. Use only for testing!

---

### 🔴 Problem 5: Backend Not Writing to Firebase

If you see:

```
[Firebase Realtime] ✅ Queue subscription created successfully
[Firebase Realtime] 📥 Queue snapshot received: {
  hasData: false,  // ⚠️ No data!
  dataType: "object",
  keys: 0
}
```

This means Firebase connected successfully, but there's no data in the database.

**Root Cause:** Backend is only writing to Firestore, NOT Firebase Realtime Database.

**Solution:** Backend needs to be updated to write to Firebase when queue updates:

```typescript
// Backend: functions/src/queue.ts
import * as admin from 'firebase-admin';

// When queue updates via POST /session/{sessionId}/queue
export async function updateQueue(sessionId: string, orderQueue: any) {
  // Write to Firestore (existing code)
  await firestore.collection('sessions').doc(sessionId).update({ orderQueue });

  // 🔥 ALSO write to Firebase Realtime DB for real-time sync
  const db = admin.database();
  const queueRef = db.ref(`sessions/${sessionId}/orderQueue`);

  const queueObject: Record<string, any> = {};
  orderQueue.forEach((q: any) => {
    queueObject[q.sessionUserId] = {
      items: q.items,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };
  });

  await queueRef.set(queueObject);
  console.log('✅ Updated Firebase Realtime DB for session:', sessionId);
}
```

---

## Step 2: Check Network Tab

1. Open DevTools → **Network** tab
2. Filter by "session"
3. Look for repeated calls to `GET /api/v1/ordering-session/session/{sessionId}`

### 🟢 Expected (Firebase Working)
- **1 API call** when page loads (initial sync)
- **WebSocket connection** to `firebaseio.com` (look for "ws://" or "wss://")
- **No more polling** after initial load

### 🔴 Problem (Firebase Not Working)
- **Repeated API calls** every 15 seconds
- **No WebSocket connection** to Firebase

---

## Step 3: Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/morsel-db7d8)
2. Click **Realtime Database**
3. Check the **Data** tab

### What You Should See

```
morsel-db7d8-default-rtdb
  └── sessions
       └── 0BMumColetGiDW77sant
            ├── status: "active"
            ├── participants: { ... }
            └── orderQueue: { ... }
```

### 🔴 If Database is Empty

This confirms the backend is NOT writing to Firebase. See "Problem 5" above.

---

## Step 4: Verify Environment Variables

Run this in your browser console:

```javascript
console.log({
  enableFirebase: process.env.NEXT_PUBLIC_ENABLE_FIREBASE,
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
```

**Expected output:**
```javascript
{
  enableFirebase: undefined,  // This is normal in browser!
  hasApiKey: undefined,       // Environment vars not accessible in browser
  // ...
}
```

**Note:** Environment variables are not accessible in browser console. They're compiled at build time.

To check if they're loaded:
1. Look at the Firebase availability logs in console (they show the config status)
2. Check `.env.local` file directly

---

## Step 5: Test Firebase Connection Manually

Add this to your browser console to test Firebase:

```javascript
// Get the current session ID from URL or localStorage
const sessionId = "0BMumColetGiDW77sant"; // Replace with actual session ID

// This will show if Firebase is trying to connect
console.log("Testing Firebase connection...");
```

Then watch the console for Firebase logs.

---

## Quick Diagnosis Checklist

Check these in order:

- [ ] `.env.local` exists with all Firebase config
- [ ] `NEXT_PUBLIC_ENABLE_FIREBASE=true` is set
- [ ] Dev server was restarted after updating `.env.local`
- [ ] Browser shows Firebase availability check logs
- [ ] `isAvailable: true` in availability check
- [ ] Firebase subscription created successfully
- [ ] `subscribeToOrderQueue returned: function` (not null)
- [ ] No "Permission denied" errors in console
- [ ] WebSocket connection appears in Network tab
- [ ] No repeated API calls after initial load
- [ ] Firebase Console shows data in Realtime Database

---

## Most Likely Issues (In Order of Probability)

### 1. Backend Not Writing to Firebase (90% likely)
**Symptoms:**
- Firebase connects successfully
- No permission errors
- But empty snapshots: `hasData: false`
- API still being polled

**Fix:** Update backend to write to Firebase (see Problem 5)

### 2. Firebase Security Rules (5% likely)
**Symptoms:**
- Permission denied errors
- Immediate fallback to polling

**Fix:** Update Firebase rules (see Problem 4)

### 3. Environment Variables Not Loaded (4% likely)
**Symptoms:**
- `isAvailable: false`
- Missing config in availability check

**Fix:** Restart dev server, verify `.env.local`

### 4. Network/Firewall Issue (1% likely)
**Symptoms:**
- Connection timeout
- No WebSocket in Network tab

**Fix:** Check firewall, try different network

---

## Next Steps

1. **Open your browser DevTools** → Console tab
2. **Refresh the page**
3. **Look for the logs** described in Step 1
4. **Identify which problem** you're seeing
5. **Follow the solution** for that specific problem

If you see:
- ✅ Firebase subscription created successfully
- ❌ But still seeing repeated API calls

Then the issue is **Backend Not Writing to Firebase** (Problem 5). This is the most common issue.

---

## Need More Help?

If you're still stuck after following this guide:

1. Copy all `[Firebase]` and `[CartContext]` logs from console
2. Check Firebase Console → Realtime Database → Data tab
3. Verify backend logs when you add items to cart
4. Share the logs to diagnose further

---

**Last Updated:** 2026-01-09
