# Debug Email Verification Issue

## Current Status
- ✅ RESEND_API_KEY is set correctly
- ✅ Firestore rules updated (supposedly)
- ❌ Still getting "Failed to create verification token"
- ❌ No activity in Resend dashboard

## The Problem

The error happens at the **Firestore write** step, before even trying to send via Resend.

---

## 🔍 Debugging Steps

### 1. Verify Firestore Rules Are Actually Published

**Go to Firebase Console:**
1. https://console.firebase.google.com
2. Your project → **Firestore Database** → **Rules** tab
3. **Check the "Last deployed" timestamp** at the top
4. Should show recent time (within last hour)
5. **Scroll down and find this section:**

```javascript
// Email Verification Tokens
match /emailVerificationTokens/{tokenId} {
  allow create: if request.auth != null;
  allow read: if true;
  allow update: if true;
  allow delete: if true;
}
```

**If you DON'T see this section, the rules didn't save!**

---

### 2. Check Browser Console for Exact Error

1. Open your browser Developer Tools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. **Clear console** (trash icon)
4. Click "Resend Verification Email"
5. **Look for red errors**
6. **Screenshot or copy the exact error message**

Especially look for:
- "Missing or insufficient permissions"
- "PERMISSION_DENIED"
- Any Firestore error codes

---

### 3. Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Click "Resend Verification Email"
3. Find the request to `/api/auth/send-verification`
4. Click on it
5. Look at the **Response** tab
6. Copy the exact error message

---

### 4. Verify Firestore Collection Access

**In Firebase Console:**
1. Go to **Firestore Database** → **Data** tab
2. Try to manually create a collection:
   - Click "Start collection"
   - Collection ID: `emailVerificationTokens`
   - Document ID: `test`
   - Field: `test` | Type: `string` | Value: `test`
   - Click Save

**Can you create it manually?**
- ✅ Yes → Rules issue
- ❌ No → Firestore setup issue

---

### 5. Check if Rules Have Right Format

Your rules should look EXACTLY like this at the top:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
```

NOT like this:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
```

The `rules_version = '2';` line is required!

---

## 🛠️ Quick Fix Attempts

### Option 1: Simplify Rules Temporarily (For Testing)

Replace your ENTIRE Firestore rules with this minimal version:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING: This allows authenticated users to read/write everything!**
**Only use for testing, then revert to proper rules.**

If this works:
- ✅ Confirms it's a rules issue
- Then go back and fix the specific rules

### Option 2: Check Firebase Authentication

1. Go to Firebase Console → **Authentication** → **Users**
2. Find your test account
3. Check if **Email verified** column shows anything
4. Note the **User UID**

### Option 3: Test Direct Firestore Access

Open browser console on your site and run:

```javascript
// Test if you can write to Firestore
const testWrite = async () => {
  try {
    const { getFirestore, collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('/lib/firebase');
    
    const result = await addDoc(collection(db, 'emailVerificationTokens'), {
      userId: 'test123',
      email: 'test@test.com',
      token: 'testtoken',
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      used: false
    });
    
    console.log('✅ Success! Document ID:', result.id);
  } catch (error) {
    console.error('❌ Error:', error.code, error.message);
  }
};

testWrite();
```

This will tell you the EXACT Firestore error.

---

## 📋 Information I Need

Please provide:

1. **Firestore Rules "Last deployed" timestamp**
2. **Exact error from browser console**
3. **Response from Network tab** (`/api/auth/send-verification`)
4. **Can you manually create the collection in Firebase?** (Yes/No)
5. **Result of the JavaScript test above**

With this info, I can pinpoint the exact issue!

---

## 🔄 If Rules Won't Update

Sometimes Firebase caches rules. Try:

1. **Hard refresh** the Firebase Console (Cmd+Shift+R)
2. **Log out and log back in** to Firebase Console
3. **Try from incognito/private window**
4. **Clear browser cache**
5. **Use a different browser**

---

## ⚡ Nuclear Option: Fresh Rules

If nothing works, try:

1. Go to Firestore Rules
2. Click "Discard" if there are any unsaved changes
3. Copy your rules to a text file as backup
4. Delete ALL text in the rules editor
5. Paste the new rules fresh
6. Click Publish
7. Wait 60 seconds
8. Hard refresh your app

---

Let me know what you find! 🔍

