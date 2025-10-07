# HireMe

Reverse-hiring marketplace for early-career candidates.

**Stack**
- Next.js (App Router) + TypeScript  
- Firebase (Authentication & Firestore)
- Firebase Storage (File uploads)
- PostgreSQL (via Prisma - optional)
- TailwindCSS

## Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Copy `.env.example` to `.env.local` and fill in your values:
- Firebase credentials (both client and admin)
- Database URL (if using Prisma)
- Email service credentials (Resend, Gmail, or SMTP)
- S3 credentials (if using AWS for file uploads)

3. **Run the development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Deployment to Vercel

### Prerequisites
- Vercel account
- Firebase project set up
- PostgreSQL database (Vercel Postgres, Supabase, Neon, or similar)

### Environment Variables

Set these in your Vercel project settings:

**Firebase Client (Public):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Firebase Admin (Server - keep private):**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Include the full key with `\n` for line breaks)

**Database:**
- `DATABASE_URL` (PostgreSQL connection string)

**Email Service (choose one):**
- Resend (recommended): `RESEND_API_KEY`, `EMAIL_FROM`
- Gmail: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

**Optional - AWS S3:**
- `S3_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Application URL:**
- `NEXTAUTH_URL` (Your production domain, e.g., `https://yourdomain.com`)

### Deployment Steps

1. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Connect to Vercel:**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Vercel will auto-detect Next.js

3. **Configure Build Settings:**
- Framework: Next.js (auto-detected)
- Build Command: `prisma generate && next build` (if using Prisma)
- Install Command: `npm install`

4. **Add Environment Variables:**
- In Vercel dashboard, go to Settings > Environment Variables
- Add all required variables from above
- Make sure to add them for Production, Preview, and Development environments as needed

5. **Deploy:**
- Click "Deploy"
- Vercel will build and deploy your app

### Post-Deployment

1. **Database Migration (if using Prisma):**
```bash
# Run migrations on your production database
npx prisma migrate deploy
```

2. **Test your deployment:**
- Check authentication flow
- Test file uploads
- Verify email sending
- Test all major features

### Troubleshooting

**Build fails:**
- Check that all environment variables are set correctly
- Verify Firebase credentials are valid
- Ensure DATABASE_URL is accessible from Vercel

**Authentication not working:**
- Verify Firebase Auth domain includes your Vercel domain
- Check Firebase console > Authentication > Settings > Authorized domains
- Add your Vercel domain (e.g., `yourapp.vercel.app`)

**File uploads failing:**
- Check Firebase Storage rules
- Verify storage bucket name is correct
- Ensure CORS is configured in Firebase Storage

**Emails not sending:**
- Verify email service credentials
- Check EMAIL_FROM domain is verified (for Resend/SMTP)
- In development, emails are logged to console by default

### Firebase Configuration

Make sure your Firebase project has:
1. **Authentication enabled** with Email/Password provider
2. **Firestore Database** created
3. **Storage** enabled with appropriate security rules
4. **Authorized domains** include your Vercel domain

### Security Notes

- Never commit `.env` or `.env.local` files
- Use environment variables for all sensitive data
- Firebase private key should include `\n` characters for line breaks
- Set appropriate Firestore security rules
- Configure Firebase Storage security rules

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore + PostgreSQL (Prisma)
- **Storage**: Firebase Storage
- **Email**: Resend, Gmail SMTP, or generic SMTP
- **Styling**: TailwindCSS
- **Deployment**: Vercel

## Features

- User authentication (job seekers and employers)
- Profile management
- Job posting and searching
- Messaging system
- File uploads (resumes, videos, images)
- Email notifications
- Company ratings and reviews

## npm run dev
