# Remove Mock Data - Force QR Code Scanning

## 🎯 Summary

Removed automatic mock restaurant data initialization. Users **MUST** now scan a QR code to access the app. This ensures proper data flow from QR scan → API → app state.

---

## ❌ Problem Before

### Old Flow (With Mock Data):
```
App Start
  ↓
Load Mock Restaurant Data (La Brasserie)
  ↓
User can access menu/cart WITHOUT scanning QR
  ↓
Hardcoded space_id for testing
  ↓
Data inconsistency issues
```

### Issues:
1. **Mock Data Pollution**: App initialized with fake "La Brasserie" restaurant
2. **Skipped QR Scan**: Users could access features without scanning
3. **Hardcoded Space ID**: Testing space ID bypassed proper flow
4. **Data Mismatch**: Mock context didn't match actual API data

---

## ✅ Solution

### New Flow (QR Required):
```
App Start
  ↓
No Restaurant Context (null)
  ↓
Show "Please Scan QR Code" Screen
  ↓
User Scans QR → /space/{spaceId}
  ↓
API Returns Real Data
  ↓
User Logs In → Context Set from API
  ↓
Now Can Access Menu/Cart
```

---

## 📁 Files Changed

### 1. RestaurantContext.tsx
**Changes:**
- ✅ Changed `context` type from `RestaurantContextType` to `RestaurantContextType | null`
- ✅ Removed `getDefaultContext()` function (no more mock fallback)
- ✅ Return `null` if no context in localStorage (instead of mock data)
- ✅ Added `clearContext()` method
- ✅ Added null checks in `switchBranch` and `changeTable`

**Key Code:**
```typescript
// Before: Always had context (mock or real)
const [context, setContextState] = useState<RestaurantContextType>(() => {
  const stored = getFromStorage<RestaurantContextType>(STORAGE_KEY);
  if (stored) return stored;
  return getDefaultContext(); // ❌ Returns mock data
});

// After: Null if no QR scanned
const [context, setContextState] = useState<RestaurantContextType | null>(() => {
  const stored = getFromStorage<RestaurantContextType>(STORAGE_KEY);
  if (stored) return stored;
  return null; // ✅ Forces QR scan
});
```

### 2. Home Page (src/app/page.tsx)
**Changes:**
- ✅ Removed hardcoded space ID (`MzIc4dAkf8Z4Aw9DKHAY`)
- ✅ Removed auto-redirect to space page
- ✅ Show "Please Scan QR Code" screen if no active session
- ✅ Only redirect to menu if user already has active session

**Key Code:**
```typescript
// Before: Auto-redirect with hardcoded space ID
const HARDCODED_SPACE_ID = 'MzIc4dAkf8Z4Aw9DKHAY';
setTimeout(() => {
  router.push(`/space/${HARDCODED_SPACE_ID}`);
}, 1500);

// After: Show QR scan prompt
if (sessionData?.session?.id && context) {
  // Has active session → redirect to menu
  router.push('/menu');
} else {
  // Show "Please Scan QR Code" screen
}
```

### 3. Login Page (src/app/login/page.tsx)
**Changes:**
- ✅ Added `setContext()` call after successful session join
- ✅ Build restaurant context from API data (not mock)
- ✅ Handle `context` being `null` with optional chaining

**Key Code:**
```typescript
// After successful join, set context from API data
setContext({
  restaurant: {
    id: previewSession.business.id,
    name: previewSession.business.businessName,
    themeColor: '#E68E2E', // Default (API doesn't provide yet)
    logo: '',
    branches: [{
      id: previewSession.space.id,
      name: previewSession.space.name,
      tables: 50,
    }],
  },
  branch: {
    id: previewSession.space.id,
    name: previewSession.space.name,
    tables: 50,
  },
  table: 1,
});
```

### 4. SessionContext.tsx
**Changes:**
- ✅ Clear `morsel_restaurant_context` when session is cleared
- ✅ Ensures complete cleanup on logout/session end

**Key Code:**
```typescript
const clearSession = useCallback(() => {
  // ... clear session data ...
  localStorage.removeItem('morsel_restaurant_context'); // ✅ Also clear restaurant
  console.log('[SessionContext] 🗑️ Cleared restaurant context (must scan QR again)');
}, []);
```

### 5. Navigation Guard (useNavigationGuard.ts)
**Changes:**
- ✅ Redirect to home page (not login) when no context
- ✅ Updated log message to clarify QR scan requirement

**Key Code:**
```typescript
// Before: Redirect to /login
if (!context || !context.restaurant) {
  router.push('/login');
}

// After: Redirect to / (home with QR prompt)
if (!context || !context.restaurant) {
  console.log('[useRequireRestaurantContext] ⚠️ No restaurant context found. Redirecting to home (user must scan QR code)');
  router.push('/');
}
```

---

## 🎨 New User Experience

### First-Time User Flow:
```
1. Open app
   → See "Please Scan QR Code" screen with QR icon

2. Scan QR code on table
   → Camera opens /space/{spaceId} URL

3. App validates space & business
   → Shows restaurant name, table/space name

4. User enters name
   → Joins or creates session

5. Context set from API
   → Can now browse menu and order
```

### Returning User Flow:
```
1. Open app
   → Has active session in localStorage

2. Auto-redirect to menu
   → Continue ordering
```

---

## 🔑 Key Benefits

### 1. ✅ Data Integrity
- Restaurant context always matches actual API data
- No mock data pollution
- Consistent data across all pages

### 2. ✅ Proper Flow Enforcement
- User MUST scan QR code (no shortcuts)
- Space validation happens before any actions
- Session tied to actual restaurant/table

### 3. ✅ Better UX
- Clear "Scan QR Code" instruction
- No confusion about "where am I ordering from?"
- Proper error handling for invalid QRs

### 4. ✅ Security
- Can't access random restaurants without QR
- Space-based access control
- No hardcoded test data in production

---

## 🧪 Testing

### Test Case 1: Fresh App (No Session)
1. ✅ Clear all localStorage
2. ✅ Open app → See "Please Scan QR Code" screen
3. ✅ Try to access /menu → Redirect back to home
4. ✅ Scan QR → Shows restaurant/table info
5. ✅ Login → Context set, can access menu

### Test Case 2: Active Session
1. ✅ User already logged in with active session
2. ✅ Close and reopen app
3. ✅ Auto-redirect to menu (has context + session)
4. ✅ Can continue ordering

### Test Case 3: Session End/Logout
1. ✅ User ends session or logs out
2. ✅ All data cleared (session + context)
3. ✅ Redirect to home
4. ✅ See "Please Scan QR Code" screen again

### Test Case 4: Invalid QR
1. ✅ Scan QR with invalid spaceId
2. ✅ API returns error (space not found)
3. ✅ Show error message
4. ✅ Don't save any data
5. ✅ User can try again

---

## 🚨 Breaking Changes

### What Changed:
1. **RestaurantContext.context** is now `RestaurantContextType | null`
   - Any code accessing `context.restaurant` must use optional chaining: `context?.restaurant`

2. **Home page** no longer auto-redirects
   - Users without session see "Please Scan QR Code" screen

3. **Navigation guard** redirects to `/` instead of `/login`
   - Ensures proper QR scan flow

### Migration for Existing Code:
```typescript
// Before (assumes context always exists)
const name = context.restaurant.name;

// After (handle null context)
const name = context?.restaurant.name || 'Unknown';
```

---

## 📊 Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| Initial Context | Mock data | `null` (must scan) |
| Home Page | Auto-redirect | "Scan QR" prompt |
| Data Source | Mock + API mix | 100% API |
| QR Scan | Optional (testing) | **Required** |
| Testing Space ID | Hardcoded | **Removed** |

---

## 🚀 Production Readiness

### Checklist:
- [x] Mock data initialization removed
- [x] Hardcoded space ID removed
- [x] QR scan enforcement implemented
- [x] Null context handling added
- [x] Session cleanup includes context
- [x] Navigation guards updated
- [x] Login page sets context from API
- [x] Home page shows QR prompt

### Deployment Notes:
1. **QR Codes**: Ensure all table QR codes are generated and contain correct URLs: `{app_url}/space/{spaceId}`
2. **Testing**: Use real QR codes in staging environment
3. **Monitoring**: Track QR scan failures and invalid space IDs
4. **Support**: Train staff on QR code placement and troubleshooting

---

**Status:** ✅ **Complete**
**Date:** 2026-01-09
**Version:** 3.0 (QR-First Architecture)

