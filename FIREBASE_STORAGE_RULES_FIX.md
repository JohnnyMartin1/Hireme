# Firebase Storage Rules Fix - Company Logo/Banner Upload

## Problem
Getting error: `Firebase Storage: User does not have permission to access 'company-logos/...'`

## Solution
Update your Firebase Storage Security Rules to allow authenticated users to upload company assets.

---

## Step-by-Step Instructions

### 1. Go to Firebase Console
- Visit: https://console.firebase.google.com
- Select your project: **hireme-app-3d386**

### 2. Navigate to Storage Rules
- Click **Storage** in the left sidebar
- Click the **Rules** tab at the top
- You'll see the current rules editor

### 3. Replace ALL existing rules with these new rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // ===== COMPANY ASSETS =====
    // Company logos - any authenticated user can upload
    match /company-logos/{fileName} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Any authenticated employer
      allow delete: if request.auth != null;
    }
    
    // Company banners - any authenticated user can upload
    match /company-banners/{fileName} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Any authenticated employer
      allow delete: if request.auth != null;
    }
    
    // ===== USER PROFILE ASSETS =====
    // Resumes - users can only upload their own
    match /resumes/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Videos - users can only upload their own
    match /videos/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profile images - users can only upload their own
    match /profile-images/{userId}/{fileName} {
      allow read: if true;  // Public read for profile pictures
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // ===== LEGACY PATHS (for backward compatibility) =====
    match /resumes/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    match /videos/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    match /profile-images/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### 4. Click "Publish" Button
- Click the blue **Publish** button in the top-right
- Wait for confirmation message: "Rules published successfully"

### 5. Test the Upload
- Go back to your app: http://localhost:3000/account/company
- Try uploading a banner or logo again
- Should work immediately after rules are published

---

## What These Rules Do

### Company Assets (Logos & Banners)
- ✅ **Anyone** can view/download (public read)
- ✅ **Any authenticated user** can upload (employers only in practice)
- ✅ **Any authenticated user** can delete their uploads

### User Profile Assets (Resumes, Videos, Profile Images)
- ✅ **Only the owner** can upload their own files
- ✅ **Only the owner** can delete their own files
- ✅ Public or authenticated read depending on file type

---

## Verification

After publishing the rules, you should see:
1. ✅ No more 403 errors in console
2. ✅ Success message: "Banner uploaded successfully!" or "Logo uploaded successfully!"
3. ✅ Image preview appears in the upload area
4. ✅ Images are saved to your Firebase Storage

---

## Troubleshooting

### If you still get errors after updating rules:

1. **Wait 30 seconds** - Rules can take a moment to propagate
2. **Clear browser cache** - Hard refresh with Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Check you're logged in** - Make sure you're authenticated as an employer
4. **Verify rules published** - In Firebase Console > Storage > Rules, check the timestamp shows recent update

### Check Firebase Console
Go to Storage > Files and verify the folders exist:
- `company-logos/`
- `company-banners/`

If they don't exist, they'll be created automatically on first upload.

---

## Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify you're using the correct Firebase project
3. Make sure your `.env.local` has the correct Firebase Storage bucket URL

