# Firestore Security Rules Update for Notification Preferences

## Problem
Users are getting "PERMISSION_DENIED" errors when trying to update their notification preferences.

## Solution
Update your Firestore security rules to allow users to update their own notification preferences.

## Steps to Fix

### 1. Go to Firebase Console
- Open https://console.firebase.google.com/
- Select your project
- Go to **Firestore Database** in the left sidebar
- Click on the **Rules** tab

### 2. Update the Rules

Find the rules for the `users` collection and update them to allow users to update their own notification preferences.

**Add or modify the `users` collection rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Allow users to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to create their own profile
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to update their own profile
      // This includes notification preferences
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Alternatively, for more granular control, you can specify which fields can be updated:
      // allow update: if request.auth != null 
      //   && request.auth.uid == userId
      //   && request.resource.data.diff(resource.data).affectedKeys()
      //     .hasOnly(['notificationPreferences', 'updatedAt', 'firstName', 'lastName', 'bio', 'skills', 'experience']);
    }
    
    // Add other collection rules here...
  }
}
```

### 3. Publish the Rules
- Click the **Publish** button in the Firebase Console
- Wait for the rules to deploy (usually takes a few seconds)

### 4. Test Again
- Go back to your app
- Refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- Try toggling a notification preference
- It should now work! ✅

## Alternative: More Restrictive Rules

If you want to be more specific and only allow updates to notification preferences (and not other fields), use this:

```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // Allow updates only to specific fields
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['notificationPreferences', 'updatedAt']);
}
```

This ensures users can ONLY update their `notificationPreferences` and `updatedAt` fields, nothing else.

## Verification

After updating the rules, you should see in the console:
```
✅ Notification preferences updated successfully
```

Instead of:
```
❌ 7 PERMISSION_DENIED: Missing or insufficient permissions.
```

## Common Issues

### Issue: "Rules are not valid"
Make sure your rules syntax is correct. The Firebase Console will show you syntax errors.

### Issue: Still getting permission denied
1. Make sure you published the rules
2. Wait 10-20 seconds for rules to propagate
3. Hard refresh your browser (Cmd+Shift+R)
4. Check that `request.auth.uid` matches the userId you're trying to update

### Issue: Other operations are affected
If you have existing rules for the `users` collection, make sure to merge them with these new rules, not replace them entirely.

## Full Example Rules File

Here's a complete example with common collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false; // Don't allow users to delete their own accounts via Firestore
    }
    
    // Jobs collection (example)
    match /jobs/{jobId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && (request.auth.token.role == 'EMPLOYER' || request.auth.token.role == 'RECRUITER');
      allow update: if request.auth != null 
        && (request.auth.token.role == 'EMPLOYER' || request.auth.token.role == 'RECRUITER')
        && resource.data.employerId == request.auth.uid;
      allow delete: if request.auth != null 
        && resource.data.employerId == request.auth.uid;
    }
    
    // Messages collection (example)
    match /messages/{messageId} {
      allow read: if request.auth != null 
        && (resource.data.senderId == request.auth.uid 
        || resource.data.recipientId == request.auth.uid);
      allow create: if request.auth != null;
    }
    
    // Add more collections as needed...
  }
}
```

## Need Help?

If you're still having issues after updating the rules, check:
1. Firebase Console → Firestore → Rules tab
2. Make sure the rules were published (green checkmark)
3. Check the Firebase Console logs for any rule evaluation errors

