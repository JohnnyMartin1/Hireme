# Quick Admin Setup Guide

## The Issue
The admin system isn't working because the `officialhiremeapp@gmail.com` account doesn't have the proper admin profile in Firestore.

## Quick Fix (Choose One Method)

### Method 1: Manual Firebase Setup (Recommended)

1. **Go to Firebase Console** → Authentication
2. **Find the user** with email `officialhiremeapp@gmail.com`
3. **Copy the User ID** (it looks like: `abc123def456...`)

4. **Go to Firestore Database** → `users` collection
5. **Find or create** a document with the User ID as the document ID
6. **Add these fields:**
   ```json
   {
     "id": "your-user-id-here",
     "email": "officialhiremeapp@gmail.com",
     "role": "ADMIN",
     "firstName": "Admin",
     "lastName": "User",
     "createdAt": "2024-01-01T00:00:00.000Z",
     "emailVerified": true,
     "isActive": true
   }
   ```

### Method 2: Run Setup Script

1. **Add to your `.env.local`:**
   ```bash
   ADMIN_PASSWORD=your-actual-admin-password
   ```

2. **Run the setup script:**
   ```bash
   npx ts-node scripts/setup-admin.ts
   ```

### Method 3: Create New Admin Account

1. **Delete the existing account** in Firebase Console → Authentication
2. **Create a new account** with email `officialhiremeapp@gmail.com`
3. **Run Method 1** to add the Firestore profile

## After Setup

1. **Login normally** at `/auth/login` with `officialhiremeapp@gmail.com`
2. **You should be redirected** to `/admin` (the purple admin dashboard)
3. **If not redirected**, go directly to `/admin/login`

## Test Admin Access

Once set up, you should see:
- **Purple/indigo admin dashboard** at `/admin`
- **Real-time statistics** (pending companies, etc.)
- **Company verification panel** at `/admin/verify-companies`
- **Admin tools** and cleanup options

## Troubleshooting

- **Still seeing regular dashboard?** → Check Firestore profile has `role: "ADMIN"`
- **Login not working?** → Verify Firebase Auth user exists
- **No redirect to admin?** → Clear browser cache and try again
- **Permission denied?** → Check email is exactly `officialhiremeapp@gmail.com`

The admin system is now **email-based** - no need to worry about roles in the database, just make sure the Firestore profile exists!
