# Deployment Checklist for Vercel

## Pre-Deployment

### 1. Environment Variables
- [ ] All Firebase client variables (NEXT_PUBLIC_*) configured
- [ ] Firebase Admin credentials configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
- [ ] Database URL configured (DATABASE_URL)
- [ ] Email service configured (RESEND_API_KEY or SMTP settings)
- [ ] NEXTAUTH_URL set to production domain
- [ ] AWS S3 credentials (if using)

### 2. Firebase Setup
- [ ] Firebase project created
- [ ] Authentication enabled with Email/Password provider
- [ ] Firestore Database created
- [ ] Firebase Storage enabled
- [ ] Security rules configured for Firestore
- [ ] Security rules configured for Storage
- [ ] Production domain added to Authorized domains in Firebase Console

### 3. Database
- [ ] PostgreSQL database provisioned (if using Prisma)
- [ ] Database accessible from Vercel
- [ ] Connection string tested
- [ ] Prisma migrations ready

### 4. Code Review
- [x] No hard-coded localhost URLs
- [x] Environment variables properly used
- [x] VERCEL_URL properly formatted with https://
- [x] File uploads use Firebase Storage (cloud-based)
- [x] API routes handle errors gracefully
- [x] Middleware configured correctly

### 5. Build Test
- [ ] Run `npm run build` locally to ensure no build errors
- [ ] Check for TypeScript errors
- [ ] Verify all dependencies are in package.json

## Deployment Steps

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project:**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `prisma generate && next build` (or just use default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Add Environment Variables:**
   Go to Settings > Environment Variables and add all variables from the list above.
   
   **Important for Firebase Private Key:**
   - Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Keep the `\n` characters as literal `\n` (Vercel will handle this)

5. **Deploy:**
   Click "Deploy" button

## Post-Deployment

### 1. Database Migration (if using Prisma)
   ```bash
   # Connect to your production database
   DATABASE_URL="your_production_db_url" npx prisma migrate deploy
   ```

### 2. Firebase Configuration
   - [ ] Add Vercel domain to Firebase Authorized domains
     - Go to Firebase Console > Authentication > Settings > Authorized domains
     - Add `yourapp.vercel.app` and your custom domain (if any)
   
   - [ ] Verify Firestore rules allow your application access
   - [ ] Verify Storage rules allow authenticated uploads

### 3. Test Core Features
   - [ ] Sign up flow works
   - [ ] Email verification works
   - [ ] Login works
   - [ ] Profile creation/editing works
   - [ ] File uploads work (resume, video, images)
   - [ ] Job posting works (for employers)
   - [ ] Search functionality works
   - [ ] Messaging system works
   - [ ] Authentication redirects work correctly

### 4. DNS & Custom Domain (if using)
   - [ ] Add custom domain in Vercel
   - [ ] Configure DNS records
   - [ ] Update NEXTAUTH_URL environment variable
   - [ ] Add custom domain to Firebase Authorized domains
   - [ ] Test with custom domain

### 5. Monitoring & Logs
   - [ ] Check Vercel deployment logs for any errors
   - [ ] Monitor Firebase Console for usage
   - [ ] Set up error tracking (optional: Sentry, LogRocket, etc.)

## Common Issues & Solutions

### Build Failures

**Issue: Firebase credentials error**
- Solution: Ensure FIREBASE_PRIVATE_KEY includes the full key with `\n` characters

**Issue: Prisma generate fails**
- Solution: Ensure DATABASE_URL is set in environment variables

**Issue: TypeScript errors**
- Solution: Run `npm run build` locally to identify and fix errors

### Runtime Issues

**Issue: Authentication not working**
- Solution: Check Firebase Authorized domains includes your Vercel domain
- Solution: Verify Firebase credentials are correct

**Issue: File uploads failing**
- Solution: Check Firebase Storage rules
- Solution: Verify Firebase Storage bucket name is correct

**Issue: Database connection fails**
- Solution: Verify DATABASE_URL is accessible from Vercel
- Solution: Check if database allows connections from Vercel IPs

**Issue: Emails not sending**
- Solution: Verify email service credentials
- Solution: Check if EMAIL_FROM is verified (for Resend/SMTP)

**Issue: API routes returning 500**
- Solution: Check Vercel Function Logs for detailed error messages
- Solution: Verify all environment variables are set

### Performance Issues

**Issue: Cold starts**
- Solution: Upgrade to Vercel Pro for better performance
- Solution: Optimize bundle size

**Issue: Database queries slow**
- Solution: Add appropriate indexes in Firestore
- Solution: Optimize Prisma queries

## Security Checklist

- [ ] Firebase Security Rules properly configured
- [ ] No sensitive data in client-side code
- [ ] Environment variables never committed to Git
- [ ] CORS configured correctly for Storage
- [ ] Rate limiting implemented for API routes (optional)
- [ ] Input validation on all forms
- [ ] XSS protection in place
- [ ] Authentication required for sensitive routes

## Verification URLs

After deployment, test these key pages:
- Homepage: `https://yourapp.vercel.app/`
- Login: `https://yourapp.vercel.app/auth/login`
- Signup: `https://yourapp.vercel.app/auth/signup`
- Job Seeker Home: `https://yourapp.vercel.app/home/seeker`
- Employer Home: `https://yourapp.vercel.app/home/employer`
- Job Search: `https://yourapp.vercel.app/search/jobs`
- Candidate Search: `https://yourapp.vercel.app/search/candidates`

## Rollback Plan

If deployment fails or issues arise:
1. Revert to previous deployment in Vercel dashboard
2. Click on "Deployments" tab
3. Find the last working deployment
4. Click "..." menu > "Promote to Production"

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase Docs: https://firebase.google.com/docs
- Prisma Docs: https://www.prisma.io/docs

## Notes

- Vercel automatically sets `VERCEL_URL` environment variable (no https:// prefix)
- The app code properly handles this with: `process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : 'http://localhost:3000'`
- First deployment may take longer (~5-10 minutes)
- Subsequent deployments are usually faster (~2-3 minutes)
- Preview deployments are created for all non-main branches

