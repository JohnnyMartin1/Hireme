# 🔥 Fix: Update Firestore Rules to Allow Email Verification

## The Problem

You're getting "Failed to create verification token" because the Firestore rules don't have permissions for the `emailVerificationTokens` collection.

---

## ✅ Solution: Update Firestore Rules

### Step 1: Copy the Rules

I've created a file called `UPDATED_FIRESTORE_RULES.txt` in your project folder with the complete rules.

### Step 2: Update in Firebase Console

1. **Go to Firebase Console:**
   https://console.firebase.google.com

2. **Select your project**

3. **Go to Firestore Database:**
   - Click "Firestore Database" in the left sidebar
   - Click the "Rules" tab at the top

4. **Replace ALL existing rules** with the new rules:
   - Select all text in the rules editor (Cmd+A / Ctrl+A)
   - Delete
   - Paste the new rules from `UPDATED_FIRESTORE_RULES.txt`

5. **Click "Publish"**

---

## 🆕 What's New in the Rules

Added this section for email verification:

```javascript
// Email Verification Tokens - NEW!
match /emailVerificationTokens/{tokenId} {
  // Allow anyone authenticated to create tokens (for their own email verification)
  allow create: if request.auth != null;
  
  // Allow anyone to read tokens (needed to verify email with token)
  allow read: if true;
  
  // Allow system to update tokens (mark as used)
  allow update: if true;
  
  // Allow deleting old tokens
  allow delete: if true;
}
```

This allows:
- ✅ Creating verification tokens when users sign up
- ✅ Reading tokens to verify emails
- ✅ Updating tokens when they're used
- ✅ Deleting old/expired tokens

---

## 🧪 After Updating Rules

1. **Wait 10-30 seconds** for rules to propagate
2. **Refresh your browser** (Cmd+Shift+R / Ctrl+Shift+F5)
3. **Try signing up again** or click "Resend Verification Email"
4. **Check Resend dashboard** - should show activity now!

---

## 🔍 Verify Rules Are Active

In Firebase Console:
1. Go to **Firestore Database** > **Rules**
2. Look for the "Last deployed" timestamp
3. Should show current time after publishing

---

## 🐛 Still Not Working?

### Check Browser Console:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any red errors
4. Share them with me if you see any

### Check Resend Dashboard:
1. Go to https://resend.com/emails
2. Should see emails listed if they're being sent
3. If empty, there's still an issue

### Check Firestore:
1. Go to **Firestore Database** > **Data**
2. Look for `emailVerificationTokens` collection
3. Should see documents created when you try to resend

---

## 📝 Quick Summary

**Problem:** Firestore blocked creating verification tokens
**Solution:** Add `emailVerificationTokens` rules
**Action:** Copy rules from `UPDATED_FIRESTORE_RULES.txt` → Paste in Firebase Console → Publish

That's it! After updating the rules, email verification will work. 🚀

