# Admin Setup Guide

## How to Set Up Admin Access

### 1. **Admin Account Configuration**
The admin account is **hardcoded** to the email: `officialhiremeapp@gmail.com`

**Important:** Only this specific email address can access admin features. No other email will have admin access.

### 2. **Create Admin Account (One-Time Setup)**
1. Go to your Firebase Console → Authentication
2. Create a user with email: `officialhiremeapp@gmail.com`
3. Set a strong password
4. Verify the email address

### 3. **Access Admin Features**
1. Go to `/admin/login` (dedicated admin login page)
2. Enter credentials:
   - **Email:** officialhiremeapp@gmail.com
   - **Password:** (your admin password)
3. You'll have access to:
   - `/admin` - Main admin dashboard with real-time stats
   - `/admin/verify-companies` - Company verification panel
   - `/admin/cleanup` - System cleanup tools
   - `/admin/users` - User management (future feature)

## How Company Verification Works

### 1. **Company Registration Flow**
- Companies sign up through normal signup process
- Their account is created with `status: 'pending_verification'`
- You receive an email notification immediately

### 2. **Email Notification**
When a company registers, you'll receive an email with:
- Company details (name, contact, industry, size)
- **Two action buttons:**
  - "Review & Approve" - Takes you to admin panel
  - "View Company Profile" - Shows their full company profile

### 3. **Admin Review Process**
1. **Click email link** → Goes to admin verification panel
2. **View company profile** → See their full profile details
3. **Check their website** → Verify it's a real company
4. **Approve or Reject** → One-click decision

### 4. **Company Experience**
- **Pending:** See verification banner on dashboard
- **Approved:** Full access to employer features
- **Rejected:** Limited access (you can customize this)

## Environment Variables Needed

Add to your `.env.local`:
```bash
ADMIN_EMAIL=your-admin-email@domain.com
```

## Admin Features Available

### Company Verification (`/admin/verify-companies`)
- View all pending company registrations
- See detailed company information
- Click "View Profile" to see their full profile
- Click "Website" to visit their company website
- Approve or reject with one click

### System Cleanup (`/admin/cleanup`)
- Remove orphaned user profiles
- Clean up data from deleted accounts

### User Management (`/admin/users`)
- Manage user roles and permissions
- View all platform users

## Security Notes

- Admin access uses the same login system as regular users
- Only users with `role: 'ADMIN'` can access admin features
- All admin actions are logged with timestamps
- Company verification is required before employer features unlock

## Tips for Company Verification

1. **Check the website** - Verify it's a real, active business
2. **Look for legitimate contact info** - Phone, email, address
3. **Verify industry relevance** - Make sure it makes sense
4. **Check company size** - Ensure it matches their description
5. **Look for professional presentation** - Real companies usually have good profiles

## Email Notifications

You'll receive professional HTML emails when companies register, including:
- Company name and contact details
- Industry and company size
- Direct links to review and approve
- Link to view their full company profile

This makes the verification process quick and efficient - you can review and approve companies directly from your email!
