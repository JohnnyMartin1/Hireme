# HireMe Platform - Complete Masterplan & Rebuild Guide

## 📋 Table of Contents
1. [Platform Overview](#platform-overview)
2. [Core Architecture](#core-architecture)
3. [Data Models](#data-models)
4. [Authentication & User Roles](#authentication--user-roles)
5. [Firebase Configuration](#firebase-configuration)
6. [Feature-by-Feature Implementation](#feature-by-feature-implementation)
7. [User Flows](#user-flows)
8. [UI/UX Components](#uiux-components)
9. [Security & Rules](#security--rules)
10. [Deployment Checklist](#deployment-checklist)

---

## Platform Overview

### Mission
HireMe is a reverse job platform where **employers initiate contact** with candidates. Candidates create comprehensive profiles, and employers/recruiters search and reach out to them with specific job opportunities.

### Key Differentiators
- **No applications** - Candidates never apply
- **Employer-initiated contact** - Companies reach out first
- **Job-linked messaging** - Every message includes a specific job posting
- **Rich candidate profiles** - Video, resume, education, skills, endorsements
- **Company/Recruiter system** - Companies can invite recruiters to their profile

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage
- **Hosting**: Vercel (recommended) or Firebase Hosting

---

## Core Architecture

### Project Structure
```
hireme/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard layouts
│   ├── account/                  # Account settings
│   │   ├── company/              # Company profile edit
│   │   ├── profile/              # Candidate profile edit
│   │   ├── security/             # Security settings
│   │   └── uploads/              # File uploads
│   ├── admin/                    # Admin panel
│   ├── api/                      # API routes
│   │   └── job/create/           # Job creation endpoint
│   ├── auth/                     # Authentication
│   │   ├── login/
│   │   └── signup/
│   │       ├── employer/
│   │       │   ├── type/         # Choose company or recruiter
│   │       │   ├── company/      # Company signup
│   │       │   └── recruiter/    # Recruiter signup
│   │       └── seeker/           # Candidate signup
│   ├── candidate/[id]/           # Candidate profile view
│   ├── company/
│   │   ├── [employerId]/         # Public company profile
│   │   ├── view/                 # Recruiter view of company
│   │   └── manage/recruiters/    # Manage recruiters
│   ├── employer/
│   │   ├── candidates/           # Contacted candidates (legacy)
│   │   ├── candidates-by-job/    # Candidates grouped by job
│   │   └── job/
│   │       ├── new/              # Create job
│   │       ├── [id]/             # View job
│   │       └── [id]/edit/        # Edit job
│   │   └── jobs/                 # All employer jobs
│   ├── home/
│   │   ├── employer/             # Employer dashboard
│   │   └── seeker/               # Candidate dashboard
│   ├── job/[id]/                 # Job details
│   ├── messages/
│   │   ├── [threadId]/           # Message thread
│   │   ├── candidate/            # Candidate messages
│   │   └── page.tsx              # Employer messages
│   ├── saved/
│   │   ├── candidates/           # Saved candidates
│   │   └── jobs/                 # Saved jobs (for candidates)
│   ├── search/
│   │   ├── candidates/           # Search candidates
│   │   └── jobs/                 # Search jobs
│   └── verify/                   # Email verification
├── components/                   # React components
│   ├── ui/                       # UI primitives
│   ├── BackButton.tsx
│   ├── CompanyProfile.tsx
│   ├── CompanyRatingDisplay.tsx
│   ├── CompanyRatingModal.tsx
│   ├── EmployerJobsList.tsx
│   ├── FileUpload.tsx
│   ├── FirebaseAuthProvider.tsx
│   ├── MessageComposer.tsx
│   ├── MultiSelectDropdown.tsx
│   ├── SearchableDropdown.tsx
│   ├── Sidebar.tsx
│   ├── SiteHeader.tsx
│   └── VideoUpload.tsx
├── lib/                          # Utilities
│   ├── auth.ts                   # Auth helpers
│   ├── constants.ts              # App constants
│   ├── email.ts                  # Email utilities
│   ├── firebase.ts               # Firebase config
│   ├── firebase-auth.ts          # Auth functions
│   ├── firebase-firestore.ts     # Database functions
│   ├── firebase-storage.ts       # Storage functions
│   ├── profile-data.ts           # Static data (schools, majors, etc.)
│   └── validations.ts            # Form validations
├── types/                        # TypeScript types
│   ├── company.ts
│   ├── job.ts
│   └── user.ts
├── public/                       # Static assets
├── middleware.ts                 # Next.js middleware
└── next.config.js                # Next.js config
```

---

## Data Models

### Firestore Collections

#### 1. `users` Collection
Primary user profile collection for all user types.

```typescript
interface UserProfile {
  // Core Identity
  id: string;                    // Firebase Auth UID
  email: string;
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'RECRUITER' | 'ADMIN';
  
  // Personal Info
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  
  // Company/Recruiter Fields
  companyId?: string;            // Links to companies collection
  companyName?: string;
  isCompanyOwner?: boolean;      // true for company creators
  
  // Candidate Fields (JOB_SEEKER only)
  headline?: string;             // e.g., "Business Student at UVA"
  bio?: string;                  // About me
  phone?: string;
  location?: string;             // City, State
  preferredLocations?: string[]; // Multiple preferred cities
  
  // Education (Array for multiple degrees)
  education?: {
    school: string;              // University name
    degree: string;              // e.g., "Bachelor's", "Master's"
    majors: string[];            // Can have multiple
    minors: string[];            // Can have multiple
    graduationYear: string;
    gpa?: string;
    honors?: string[];           // Dean's List, Cum Laude, etc.
  }[];
  
  // Legacy education fields (for backward compatibility)
  school?: string;
  major?: string;
  minor?: string;
  graduationYear?: string;
  gpa?: string;
  
  // Skills & Experience
  skills?: string[];             // Technical and soft skills
  certifications?: string[];     // Professional certifications
  languages?: string[];          // Spoken languages
  tools?: string[];              // Software/tools proficiency
  
  // Work Preferences
  workPreferences?: string[];    // Remote, Hybrid, In-person
  jobTypes?: string[];           // Full-time, Part-time, Internship
  availabilityDate?: string;
  willingToRelocate?: boolean;
  workAuthorization?: string;    // Citizen, OPT, H-1B, etc.
  
  // Experience
  experienceLevel?: string;      // Entry-level, 1-2 years, etc.
  previousCompanies?: string[];
  hasLeadershipRole?: boolean;
  portfolioUrl?: string;
  
  // Profile Assets
  resumeUrl?: string;
  videoUrl?: string;
  
  // Activity & Extracurriculars
  extracurriculars?: string[];   // Clubs, organizations, sports
  
  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastActive?: Timestamp;
  profileCompleteness?: number;  // 0-100%
}
```

#### 2. `companies` Collection
Company profiles separate from user profiles.

```typescript
interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  size?: string;                 // e.g., "1-10", "11-50", "51-200"
  website?: string;
  location?: string;             // City, State
  logoUrl?: string;
  bannerUrl?: string;
  
  // Social Links
  linkedinUrl?: string;
  twitterUrl?: string;
  
  // Metadata
  createdBy: string;             // User ID of company owner
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Stats
  averageRating?: number;
  totalRatings?: number;
}
```

#### 3. `companyInvitations` Collection
Invitations for recruiters to join companies.

```typescript
interface CompanyInvitation {
  id: string;
  companyId: string;
  companyName: string;
  invitedEmail: string;
  invitedBy: string;             // User ID of inviter
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}
```

#### 4. `jobs` Collection
Job postings created by employers/recruiters.

```typescript
interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  companyId?: string;            // Links to companies collection
  companyName?: string;
  
  // Location
  locationCity?: string;
  locationState?: string;
  location?: string;             // Legacy field
  
  // Job Details
  employment: string;            // Full-time, Part-time, Contract, Internship
  workMode: string;              // In-person, Hybrid, Remote
  
  // Compensation
  salaryMin?: number;
  salaryMax?: number;
  salaryRange?: string;
  
  // Requirements
  requiredSkills?: string[];
  preferredSkills?: string[];
  experienceLevel?: string;
  educationLevel?: string;
  
  // Metadata
  employerId: string;            // User ID of creator
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Stats
  views?: number;
  candidatesContacted?: number;
}
```

#### 5. `messageThreads` Collection
Message threads between users.

```typescript
interface MessageThread {
  id: string;
  participantIds: string[];      // Array of 2 user IDs (sorted)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  
  // Optional: could store jobId here for optimization
  // jobId?: string;
}
```

#### 6. `messages` Collection
Individual messages within threads.

```typescript
interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  
  // Job attachment (required for employer messages)
  jobDetails?: {
    jobId: string;
    jobTitle: string;
    jobDescription: string;
    employmentType: string;
    location: string;
  };
  
  // Metadata
  createdAt: Timestamp;
  read: boolean;
}
```

#### 7. `savedCandidates` Collection
Employers' saved candidate lists.

```typescript
interface SavedCandidate {
  id: string;
  employerId: string;
  candidateId: string;
  savedAt: Timestamp;
  notes?: string;
}
```

#### 8. `profileViews` Collection
Track which employers viewed which candidates.

```typescript
interface ProfileView {
  id: string;
  candidateId: string;           // Profile being viewed
  viewerId: string;              // Employer viewing
  viewedAt: Timestamp;
}
```

#### 9. `companyRatings` Collection
Candidate ratings of companies after interviews.

```typescript
interface CompanyRating {
  id: string;
  userId: string;                // Candidate who rated
  employerId: string;            // Company being rated
  jobId: string;                 // Job they were contacted about
  rating: number;                // 1-5 stars
  review?: string;
  interviewExperience?: string;
  wouldRecommend?: boolean;
  createdAt: Timestamp;
}
```

#### 10. `endorsements` Collection
Skill endorsements from others.

```typescript
interface Endorsement {
  id: string;
  userId: string;                // Candidate being endorsed
  endorserName: string;
  endorserEmail: string;
  endorserRelationship: string;  // Colleague, Manager, Professor, etc.
  skill: string;                 // Skill being endorsed
  message?: string;
  createdAt: Timestamp;
  verified: boolean;
}
```

---

## Authentication & User Roles

### User Roles

#### 1. **JOB_SEEKER** (Candidate)
- Create comprehensive profile
- Upload resume, video
- Get endorsed
- View which companies viewed profile
- Receive messages from employers
- Cannot initiate contact with employers
- Cannot apply to jobs

#### 2. **EMPLOYER** (Company Owner)
- Create company profile
- Invite recruiters
- Post jobs
- Search candidates
- Send messages (with job attachment required)
- View/edit all company jobs
- Manage recruiters

#### 3. **RECRUITER**
- Linked to a company via invitation
- Post jobs under company name
- Search candidates
- Send messages (with job attachment required)
- View own jobs + company owner's jobs
- Cannot manage other recruiters
- Cannot edit company profile (read-only access)

#### 4. **ADMIN**
- Full system access
- User management
- Content moderation

### Authentication Flow

#### Candidate Signup
1. Navigate to `/auth/signup/seeker`
2. Enter: email, password, first name, last name
3. Create Firebase Auth account
4. Create Firestore user document with role='JOB_SEEKER'
5. Redirect to `/home/seeker` after 1-second delay

#### Employer Signup (Company Owner)
1. Navigate to `/auth/signup/employer` → redirects to `/auth/signup/employer/type`
2. Select "Company Profile"
3. Navigate to `/auth/signup/employer/company`
4. Enter: email, password, first name, last name, company name, company info
5. Create Firebase Auth account
6. Create Firestore user document with role='EMPLOYER', isCompanyOwner=true
7. Create company document in `companies` collection
8. Link user to company via companyId
9. Redirect to `/home/employer` after 1-second delay

#### Recruiter Signup
1. Receive invitation email with link containing email parameter
2. Navigate to `/auth/signup/employer` → `/auth/signup/employer/type`
3. Select "Recruiter Profile"
4. Navigate to `/auth/signup/employer/recruiter`
5. Enter invitation email to verify
6. Check `companyInvitations` collection for pending invitation
7. Enter: password, first name, last name
8. Create Firebase Auth account
9. Create Firestore user document with role='RECRUITER', companyId from invitation
10. Update invitation status to 'ACCEPTED'
11. Redirect to `/home/employer` after 1-second delay

#### Login
1. Navigate to `/auth/login`
2. Enter email and password
3. Authenticate with Firebase Auth
4. Fetch user profile from Firestore
5. Redirect based on role:
   - JOB_SEEKER → `/home/seeker`
   - EMPLOYER or RECRUITER → `/home/employer`
   - ADMIN → `/admin`

---

## Firebase Configuration

### Required Environment Variables
Create `.env.local` file:

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Optional - for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Firebase Initialization (`lib/firebase.ts`)

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is company owner
    function isCompanyOwner(companyId) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isCompanyOwner == true;
    }
    
    // Helper function to check if user belongs to company
    function belongsToCompany(companyId) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      // Allow company owners to delete recruiters
      allow delete: if request.auth.uid == userId 
        || (request.auth != null && isCompanyOwner(resource.data.companyId));
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read: if true;  // Public read
      allow create: if request.auth != null 
        && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null 
        && resource.data.createdBy == request.auth.uid;
      allow delete: if request.auth != null 
        && resource.data.createdBy == request.auth.uid;
    }
    
    // Company Invitations
    match /companyInvitations/{invitationId} {
      allow read: if true;  // Allow unauthenticated reads for signup check
      allow create: if request.auth != null 
        && isCompanyOwner(request.resource.data.companyId);
      allow update: if request.auth != null && (
        request.auth.token.email.lower() == resource.data.invitedEmail
        || isCompanyOwner(resource.data.companyId)
      );
      allow delete: if request.auth != null 
        && isCompanyOwner(resource.data.companyId);
    }
    
    // Jobs collection
    match /jobs/{jobId} {
      allow read: if true;  // Public read
      allow create: if request.auth != null 
        && (request.auth.uid == request.resource.data.employerId 
            || belongsToCompany(get(/databases/$(database)/documents/users/$(request.resource.data.employerId)).data.companyId));
      allow update, delete: if request.auth != null 
        && (request.auth.uid == resource.data.employerId
            || belongsToCompany(get(/databases/$(database)/documents/users/$(resource.data.employerId)).data.companyId));
    }
    
    // Message threads
    match /messageThreads/{threadId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Saved candidates
    match /savedCandidates/{saveId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Profile views
    match /profileViews/{viewId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Company ratings
    match /companyRatings/{ratingId} {
      allow read: if true;
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
    
    // Endorsements
    match /endorsements/{endorsementId} {
      allow read: if true;  // Public read for profile display
      allow create: if true;  // Allow unauthenticated creation via shareable link
      allow update, delete: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // User uploads (resumes, profile images, videos)
    match /users/{userId}/{allPaths=**} {
      allow read: if true;  // Public read for profile assets
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Company assets (logos, banners)
    match /companies/{companyId}/{allPaths=**} {
      allow read: if true;  // Public read
      allow write: if request.auth != null;  // Any authenticated user (will verify in app)
      allow delete: if request.auth != null;
    }
    
    // Resumes (legacy path)
    match /resumes/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Videos (legacy path)
    match /videos/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Profile images (legacy path)
    match /profile-images/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### Required Firestore Indexes

Create these composite indexes in Firebase Console:

1. **messages** collection:
   - Fields: `threadId` (Ascending), `createdAt` (Ascending)
   
2. **savedCandidates** collection:
   - Fields: `employerId` (Ascending), `candidateId` (Ascending)

3. **profileViews** collection:
   - Fields: `candidateId` (Ascending), `viewedAt` (Descending)

4. **companyInvitations** collection (optional, if using multi-field queries):
   - Fields: `invitedEmail` (Ascending), `status` (Ascending)

---

## Feature-by-Feature Implementation

### 1. Candidate Profile Creation & Editing

**Location**: `/app/account/profile/page.tsx`

**Features**:
- Personal information (name, headline, bio, phone, location)
- Multiple education entries (school, degree, majors, minors, GPA, graduation year)
- Multiple preferred locations
- Skills (multiple select)
- Certifications (categorized list)
- Languages, tools
- Work preferences (remote/hybrid/in-person)
- Job types (full-time, part-time, internship, contract)
- Experience level
- Previous companies
- Portfolio URL
- Extracurriculars
- Resume upload (PDF, max 5MB)
- Video upload (max 50MB)
- Profile image upload

**Key Components**:
- `FileUpload` - Resume upload with drag-drop
- `VideoUpload` - Video file upload (no recording)
- `SearchableDropdown` - For cities, schools
- `MultiSelectDropdown` - For majors, skills, etc.

**Profile Completion Calculation**:
```typescript
const calculateProfileCompleteness = (profile: UserProfile): number => {
  let completed = 0;
  let total = 15;
  
  if (profile.firstName && profile.lastName) completed++;
  if (profile.headline) completed++;
  if (profile.bio && profile.bio.length > 50) completed++;
  if (profile.profileImageUrl) completed++;
  if (profile.resumeUrl) completed++;
  if (profile.videoUrl) completed++;
  if (profile.education && profile.education.length > 0) completed++;
  if (profile.skills && profile.skills.length >= 3) completed++;
  if (profile.preferredLocations && profile.preferredLocations.length > 0) completed++;
  if (profile.workPreferences && profile.workPreferences.length > 0) completed++;
  if (profile.jobTypes && profile.jobTypes.length > 0) completed++;
  if (profile.experienceLevel) completed++;
  if (profile.workAuthorization) completed++;
  if (profile.certifications && profile.certifications.length > 0) completed++;
  if (profile.languages && profile.languages.length > 0) completed++;
  
  return Math.round((completed / total) * 100);
};
```

### 2. Employer/Recruiter Job Posting

**Location**: `/app/employer/job/new/page.tsx`

**Features**:
- Job title
- Job description (rich text)
- Location (searchable dropdown of US cities)
- Job type (Full-time, Part-time, Contract, Internship)
- Work mode (In-person, Hybrid, Remote)
- Salary range (optional)
- Required skills (multi-select)
- Experience level
- Education requirements

**Job Creation Flow**:
1. Employer/recruiter fills out form
2. On submit, creates job document with:
   - `employerId` = current user ID
   - `companyId` = user's companyId (if applicable)
   - `companyName` = user's companyName
   - `status` = 'ACTIVE'
3. Redirects to employer dashboard

**Key Points**:
- No "Job created successfully!" alert (smooth redirect)
- Location uses `SearchableDropdown` with `LOCATIONS` from `profile-data.ts`
- Separate dropdowns for job type and work mode

### 3. Candidate Search & Filtering

**Location**: `/app/search/candidates/page.tsx`

**Features** (extensive filtering):

**Education Filters**:
- University (multi-select dropdown)
- Major (multi-select dropdown)
- Graduation year range (slider)
- Degree type (BA, BS, MBA, MS, etc.)
- GPA range (0.1 increments: 3.9-4.0, 3.8-3.9, etc.)
- Academic honors (checkbox)

**Experience Filters**:
- Experience level
- Previous companies (typeahead)
- Leadership roles (checkbox)
- Portfolio availability
- Work authorization status

**Skills Filters**:
- Primary skills (multi-select chips)
- Skill category
- Proficiency level
- Certifications (multi-select)
- Programming languages
- Tools & software

**Location & Availability**:
- Preferred locations (multi-select)
- Willing to relocate (checkbox)
- Work type preference
- Availability date

**Profile Completeness**:
- Has resume (checkbox)
- Has video (checkbox)
- Has profile photo (checkbox)
- Has bio (checkbox)
- Last active (7/30/90 days)
- Profile completion % (slider)

**Search Implementation**:
```typescript
// Fetch all candidates
const { data: allCandidates } = await getProfilesByRole('JOB_SEEKER');

// Client-side filtering
const filteredCandidates = allCandidates.filter(candidate => {
  // Apply each filter
  if (selectedUniversities.length > 0) {
    if (!candidate.education?.some(edu => 
      selectedUniversities.includes(edu.school)
    )) return false;
  }
  
  if (selectedMajors.length > 0) {
    if (!candidate.education?.some(edu => 
      edu.majors?.some(major => selectedMajors.includes(major))
    )) return false;
  }
  
  // ... more filters
  
  return true;
});
```

### 4. Messaging System

**Key Rules**:
- **Employers/recruiters MUST attach a job** when sending first message
- **Candidates cannot initiate messages**
- All messages stored in `messages` collection
- Threads track participants in `messageThreads` collection

**Message Flow (Employer → Candidate)**:
1. Employer clicks candidate profile
2. Clicks "Send Message" or "Get in Touch"
3. Dialog opens with:
   - Job selection dropdown (required)
   - Message text area
4. On send:
   ```typescript
   // Create or get thread
   const participantIds = [employerId, candidateId].sort();
   const { id: threadId } = await getOrCreateThread(participantIds);
   
   // Send message with job details
   const messageData = {
     senderId: employerId,
     senderName: employerName,
     content: messageText,
     jobDetails: {
       jobId: selectedJob.id,
       jobTitle: selectedJob.title,
       jobDescription: selectedJob.description,
       employmentType: selectedJob.employment,
       location: selectedJob.location
     }
   };
   
   await sendMessage(threadId, messageData);
   ```

**Thread View** (`/app/messages/[threadId]/page.tsx`):
- Fixed header with back button and participant name
- Scrollable message area (70vh height)
- Fixed input at bottom
- Job details displayed in first message
- Company profile sidebar (for candidates viewing employer messages)

**Functions**:
```typescript
// lib/firebase-firestore.ts

export const getOrCreateThread = async (participantIds: string[]) => {
  // Check if thread exists
  const q = query(
    collection(db, 'messageThreads'),
    where('participantIds', '==', participantIds)
  );
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, error: null };
  }
  
  // Create new thread
  return createMessageThread(participantIds);
};

export const sendMessage = async (threadId: string, messageData: any) => {
  const message = {
    ...messageData,
    threadId,
    createdAt: serverTimestamp(),
    read: false
  };
  
  const messageRef = await addDoc(collection(db, 'messages'), message);
  
  // Update thread's lastMessageAt
  await updateDocument('messageThreads', threadId, {
    lastMessageAt: serverTimestamp()
  });
  
  return { id: messageRef.id, error: null };
};
```

### 5. Company/Recruiter Management

**Company Profile Creation**:
1. During employer signup at `/auth/signup/employer/company`
2. Creates document in `companies` collection
3. Links user profile via `companyId` field

**Inviting Recruiters** (`/app/company/manage/recruiters/page.tsx`):
1. Company owner enters recruiter email
2. Creates invitation in `companyInvitations` collection:
   ```typescript
   {
     companyId: company.id,
     companyName: company.name,
     invitedEmail: recruiterEmail,
     invitedBy: ownerId,
     status: 'PENDING',
     createdAt: serverTimestamp()
   }
   ```
3. Send invitation email (optional - can just share signup link)

**Recruiter Signup Flow**:
1. Go to `/auth/signup/employer/recruiter`
2. Enter email to check for invitation
3. Query `companyInvitations` where `invitedEmail == email` and `status == 'PENDING'`
4. If found, proceed with signup
5. Create user with:
   ```typescript
   {
     role: 'RECRUITER',
     companyId: invitation.companyId,
     companyName: invitation.companyName,
     isCompanyOwner: false
   }
   ```
6. Update invitation status to 'ACCEPTED'

**Recruiter Management**:
- Company owner sees list of active recruiters
- Can remove recruiters (deletes user document from Firestore)
- Deleted Firebase Auth accounts automatically disappear from list

**Dashboard Differences**:
```typescript
// Employer Dashboard greeting
{profile.isCompanyOwner 
  ? `Welcome back, ${profile.companyName}!`
  : `Welcome back, ${profile.firstName}!`
}

// Job fetching
const { data: jobs } = profile.companyId
  ? await getCompanyJobs(profile.companyId, userId, profile.isCompanyOwner)
  : await getEmployerJobs(userId);

// Company profile button
{profile.isCompanyOwner 
  ? <Link href="/account/company">Edit Company Profile</Link>
  : <Link href="/company/view">View Company Profile</Link>
}

// Recruiter management (owners only)
{profile.isCompanyOwner && (
  <Link href="/company/manage/recruiters">Manage Recruiters</Link>
)}
```

### 6. Profile Views Tracking

**Implementation**:
```typescript
// When employer views candidate profile
export const trackProfileView = async (candidateId: string, viewerId: string) => {
  // Check if already viewed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const q = query(
    collection(db, 'profileViews'),
    where('candidateId', '==', candidateId),
    where('viewerId', '==', viewerId),
    where('viewedAt', '>=', Timestamp.fromDate(today))
  );
  
  const snapshot = await getDocs(q);
  
  // Only create new view if not viewed today
  if (snapshot.empty) {
    await createDocument('profileViews', {
      candidateId,
      viewerId,
      viewedAt: serverTimestamp()
    });
  }
};
```

**Candidate Dashboard**:
- Shows count of **unique companies** that viewed profile
- Clicking opens `/home/seeker/profile-views` with list of companies

**Get Unique Viewers**:
```typescript
export const getProfileViewers = async (candidateId: string) => {
  const { data: views } = await queryDocuments('profileViews', [
    where('candidateId', '==', candidateId)
  ]);
  
  // Get unique viewer IDs
  const uniqueViewerIds = [...new Set(views.map(v => v.viewerId))];
  
  // Fetch viewer profiles
  const viewers = await Promise.all(
    uniqueViewerIds.map(id => getDocument('users', id))
  );
  
  return {
    viewers: viewers.map(v => v.data).filter(Boolean),
    count: uniqueViewerIds.length
  };
};
```

### 7. Saved Candidates

**Saving**:
```typescript
export const saveCandidate = async (employerId: string, candidateId: string) => {
  // Check if already saved
  const { data: existing } = await queryDocuments('savedCandidates', [
    where('employerId', '==', employerId),
    where('candidateId', '==', candidateId)
  ]);
  
  if (existing.length > 0) {
    // Already saved, unsave
    await deleteDocument('savedCandidates', existing[0].id);
    return { saved: false };
  }
  
  // Save
  await createDocument('savedCandidates', {
    employerId,
    candidateId,
    savedAt: serverTimestamp()
  });
  
  return { saved: true };
};
```

**Check if Saved**:
```typescript
export const isCandidateSaved = async (employerId: string, candidateId: string) => {
  const { data } = await queryDocuments('savedCandidates', [
    where('employerId', '==', employerId),
    where('candidateId', '==', candidateId)
  ]);
  
  return { saved: data.length > 0 };
};
```

### 8. Candidates by Job Page

**Location**: `/app/employer/candidates-by-job/page.tsx`

**Purpose**: View which candidates were contacted for each specific job

**Implementation**:
1. Fetch all employer's jobs
2. Fetch all message threads
3. For each thread with a candidate:
   - Fetch thread messages
   - Find first message with `jobDetails.jobId`
   - Associate candidate with that job
4. Group candidates by job
5. Display expandable job cards with candidate lists

**Optimization Note**:
Use `Promise.all()` to fetch all data in parallel:
```typescript
const candidatePromises = threads.map(async (thread) => {
  const [candidateProfile, messages] = await Promise.all([
    getDocument('users', candidateId),
    getDocs(query(collection(db, 'messages'), where('threadId', '==', thread.id), limit(5)))
  ]);
  
  // Extract jobId from messages
  const jobId = messages.docs.find(m => m.data().jobDetails?.jobId)?.data().jobDetails?.jobId;
  
  return { candidate: candidateProfile.data, jobId };
});

const results = await Promise.all(candidatePromises);
```

### 9. Resume Viewer Modal

**Features**:
- Full-screen modal overlay
- Embedded iframe showing resume PDF
- "Download PDF" button
- "Download DOC" button (same file, different label)
- Close button (X)

**Implementation**:
```typescript
{showResumeModal && candidate.resumeUrl && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-xl font-semibold">Resume</h3>
        <div className="flex gap-2">
          <a href={candidate.resumeUrl} download className="btn-primary">
            <Download /> Download PDF
          </a>
          <a href={candidate.resumeUrl} download className="btn-secondary">
            <FileText /> Download DOC
          </a>
          <button onClick={() => setShowResumeModal(false)}>
            <X />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <iframe src={candidate.resumeUrl} className="w-full h-full" />
      </div>
    </div>
  </div>
)}
```

### 10. Endorsements System

**Public Endorsement Form** (`/app/endorsements/public/[userId]/page.tsx`):
- Accessible via shareable link: `/endorsements/public/[userId]`
- No login required
- Fields:
  - Your name
  - Your email
  - Your relationship (Colleague, Manager, Professor, Friend)
  - Skill to endorse
  - Message (optional)

**Create Endorsement**:
```typescript
export const createEndorsement = async (data: {
  userId: string;
  endorserName: string;
  endorserEmail: string;
  endorserRelationship: string;
  skill: string;
  message?: string;
}) => {
  return createDocument('endorsements', {
    ...data,
    verified: false,
    createdAt: serverTimestamp()
  });
};
```

**Display on Profile**:
```typescript
// Fetch endorsements
const { data: endorsements } = await queryDocuments('endorsements', [
  where('userId', '==', candidateId)
]);

// Group by skill
const endorsementsBySkill = endorsements.reduce((acc, e) => {
  if (!acc[e.skill]) acc[e.skill] = [];
  acc[e.skill].push(e);
  return acc;
}, {});
```

---

## User Flows

### Candidate Journey

```mermaid
graph TD
    A[Visit Site] --> B[Sign Up as Job Seeker]
    B --> C[Complete Profile]
    C --> D[Upload Resume & Video]
    D --> E[Add Skills & Education]
    E --> F[Share Endorsement Link]
    F --> G[Profile Goes Live]
    G --> H[Employers View Profile]
    H --> I[Receive Message with Job Offer]
    I --> J[Review Job & Company]
    J --> K[Respond to Employer]
    K --> L[Interview Process]
    L --> M[Rate Company Experience]
```

### Employer Journey (Company Owner)

```mermaid
graph TD
    A[Visit Site] --> B[Sign Up as Employer]
    B --> C[Create Company Profile]
    C --> D[Invite Recruiters]
    D --> E[Post Jobs]
    E --> F[Search Candidates]
    F --> G[View Candidate Profiles]
    G --> H[Save Interesting Candidates]
    H --> I[Send Message with Job]
    I --> J[Candidate Responds]
    J --> K[Continue Conversation]
    K --> L[Schedule Interview]
    L --> M[Track Candidates by Job]
```

### Recruiter Journey

```mermaid
graph TD
    A[Receive Invitation Email] --> B[Sign Up as Recruiter]
    B --> C[Link to Company Profile]
    C --> D[View Company Jobs]
    D --> E[Post New Jobs]
    E --> F[Search Candidates]
    F --> G[Contact Candidates]
    G --> H[Message with Job Offer]
    H --> I[Track Conversations]
```

---

## UI/UX Components

### Reusable Components

#### 1. SearchableDropdown
**Location**: `components/SearchableDropdown.tsx`

**Props**:
```typescript
interface SearchableDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
```

**Usage**:
```typescript
<SearchableDropdown
  label="University"
  options={UNIVERSITIES}
  value={school}
  onChange={setSchool}
  placeholder="Search universities..."
/>
```

#### 2. MultiSelectDropdown
**Location**: `components/MultiSelectDropdown.tsx`

**Props**:
```typescript
interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}
```

**Usage**:
```typescript
<MultiSelectDropdown
  label="Majors"
  options={MAJORS}
  selectedValues={majors}
  onChange={setMajors}
  placeholder="Select majors..."
/>
```

#### 3. FileUpload
**Location**: `components/FileUpload.tsx`

**Features**:
- Drag and drop
- File type validation
- Size limit (5MB for resumes)
- Progress indicator
- Preview

**Props**:
```typescript
interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  acceptedTypes: string[];
  maxSizeMB: number;
  label: string;
}
```

#### 4. VideoUpload
**Location**: `components/VideoUpload.tsx`

**Features**:
- File upload only (no recording)
- Size limit: 50MB
- Format validation (MP4, MOV, AVI)
- Thumbnail generation

**Props**:
```typescript
interface VideoUploadProps {
  onUploadComplete: (url: string) => void;
  currentVideoUrl?: string;
}
```

#### 5. BackButton
**Location**: `components/BackButton.tsx`

**Note**: Uses `router.back()` which can cause loops. For specific pages, use direct `Link` component instead:

```typescript
// Bad (can cause loops)
<BackButton fallback="/home/employer" />

// Good (direct navigation)
<Link href="/home/employer">
  <ArrowLeft /> Back
</Link>
```

#### 6. CompanyProfile
**Location**: `components/CompanyProfile.tsx`

**Features**:
- Display company logo, banner, info
- Show company ratings
- Link to company jobs
- Contact button (for non-candidates only)

**Props**:
```typescript
interface CompanyProfileProps {
  employerId: string;
  showDetails?: boolean;
  clickable?: boolean;
}
```

#### 7. FirebaseAuthProvider
**Location**: `components/FirebaseAuthProvider.tsx`

**Purpose**: Wraps app with Firebase auth context

**Provides**:
```typescript
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

**Important**: Includes 1-second delay after profile creation to allow Firestore propagation:
```typescript
// After creating profile
await createDocument('users', userId, profileData);
await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second
router.push('/home/seeker');
```

### Layout Components

#### SiteHeader
**Location**: `components/SiteHeader.tsx`

**Features**:
- Logo (links to landing page)
- Dashboard link (role-based routing)
- Sign out button

**Dashboard Routing**:
```typescript
const dashboardUrl = 
  profile?.role === 'JOB_SEEKER' ? '/home/seeker' :
  profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER' ? '/home/employer' :
  '/';
```

#### Sidebar (for dashboard layouts)
**Location**: `components/Sidebar.tsx`

**Navigation Items**:
- Candidate: Home, Search Jobs, Saved Jobs, Messages, Profile, Settings
- Employer: Home, Search Candidates, Post Job, Active Jobs, Messages, Saved Candidates, Company Profile, Settings

---

## Static Data Files

### profile-data.ts
**Location**: `lib/profile-data.ts`

**Contains**:

```typescript
// Universities (top 100+ US universities)
export const UNIVERSITIES = [
  "Harvard University",
  "Stanford University",
  "MIT",
  "University of Virginia",
  "Yale University",
  // ... more
];

// Majors
export const MAJORS = [
  "Computer Science",
  "Business Administration",
  "Economics",
  "Engineering",
  "Psychology",
  // ... more
];

// US Cities (for location selection)
export const LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Washington, DC",
  // ... all major cities
];

// Skills
export const SKILLS = [
  "JavaScript",
  "Python",
  "React",
  "Communication",
  "Leadership",
  // ... more
];

// GPA Ranges
export const GPA_RANGES = [
  "4.0",
  "3.9-4.0",
  "3.8-3.9",
  "3.7-3.8",
  "3.6-3.7",
  // ... down to 2.0
];

// Work Preferences
export const WORK_PREFERENCES = [
  "Remote",
  "Hybrid",
  "In-person"
];

// Job Types
export const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract"
];

// Experience Levels
export const EXPERIENCE_LEVELS = [
  "No experience",
  "Internship",
  "Entry-level",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5+ years"
];

// Certifications (categorized)
export const CERTIFICATIONS = {
  "Technology & Data": [
    "CompTIA A+",
    "AWS Certified Solutions Architect",
    "Google Cloud Professional",
    // ... more
  ],
  "Finance & Business": [
    "CPA", "CFA", "PMP",
    // ... more
  ],
  // ... more categories
};

// Flatten for multi-select
export const ALL_CERTIFICATIONS = Object.values(CERTIFICATIONS).flat();
```

---

## Security Considerations

### 1. Authentication
- Use Firebase Auth for user management
- Never store passwords in Firestore
- Implement email verification (optional but recommended)

### 2. Authorization
- Firestore rules enforce role-based access
- Company owners can manage their recruiters
- Candidates cannot initiate employer contact
- Employers must attach jobs to messages

### 3. Data Validation
- Client-side: Form validation before submission
- Server-side: Firestore rules validate data structure
- File uploads: Validate file types and sizes

### 4. Privacy
- Profile views are tracked but anonymous to candidate (until company sends message)
- Endorsements can be from anyone (no verification required unless you add it)
- Resumes and videos are publicly accessible via URL (consider signed URLs for production)

### 5. Rate Limiting
- Implement rate limiting on API routes
- Use Firebase App Check to prevent abuse
- Monitor Firestore usage

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set up Firebase project
- [ ] Configure Firebase Authentication
- [ ] Set up Firestore database
- [ ] Create Firestore security rules
- [ ] Set up Firebase Storage
- [ ] Create Storage security rules
- [ ] Create required Firestore indexes
- [ ] Set up environment variables
- [ ] Test all user flows
- [ ] Verify email/password requirements
- [ ] Test file uploads (resume, video, images)
- [ ] Verify Firestore rules work correctly
- [ ] Check mobile responsiveness

### Deployment

**Option 1: Vercel (Recommended)**
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

**Option 2: Firebase Hosting**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy --only hosting`

### Post-Deployment

- [ ] Test production environment
- [ ] Verify Firebase connection
- [ ] Test signup flows for all user types
- [ ] Test messaging system
- [ ] Test file uploads in production
- [ ] Monitor Firestore usage
- [ ] Set up error tracking (Sentry recommended)
- [ ] Set up analytics (Google Analytics)
- [ ] Configure custom domain
- [ ] Set up SSL certificate

---

## Common Issues & Solutions

### Issue 1: Profile not loading after signup
**Cause**: Race condition - redirect happens before Firestore write completes

**Solution**: Add 1-second delay before redirect
```typescript
await createDocument('users', userId, profileData);
await new Promise(resolve => setTimeout(resolve, 1000));
router.push('/home/seeker');
```

### Issue 2: "Missing or insufficient permissions" on invitation check
**Cause**: Firestore rules don't allow unauthenticated reads of invitations

**Solution**: Set invitation read rule to `allow read: if true;`

### Issue 3: Webpack cache errors
**Cause**: Next.js trying to access non-existent cache files

**Solution**: This is harmless. To clear: `rm -rf .next && npm run dev`

### Issue 4: Back button loops
**Cause**: Using `router.back()` which uses browser history

**Solution**: Use direct `Link` components with explicit paths:
```typescript
<Link href="/home/employer">Back to Dashboard</Link>
```

### Issue 5: Slow performance on candidates-by-job page
**Cause**: Sequential database queries for each thread

**Solution**: Use `Promise.all()` to batch fetch in parallel

### Issue 6: Company profile changes not saving
**Cause**: Using `updateDocument` on non-existent document

**Solution**: Use `setDoc` with `merge: true` (upsert pattern)

### Issue 7: Recruiter can't post jobs
**Cause**: Role check only includes 'EMPLOYER', not 'RECRUITER'

**Solution**: Update role checks to:
```typescript
if (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER') {
  // redirect
}
```

### Issue 8: Last name field autofilling with email
**Cause**: Browser password manager incorrectly identifying fields

**Solution**: Add explicit `autocomplete` attributes:
```typescript
<input
  type="text"
  name="lastName"
  autocomplete="family-name"
/>
```

---

## Key Files Reference

### Critical Configuration Files

#### 1. `package.json`
```json
{
  "name": "hireme",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "firebase": "^10.7.1",
    "lucide-react": "^0.292.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0"
  }
}
```

#### 2. `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

#### 3. `middleware.ts`
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add any middleware logic here (auth checks, redirects, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### 4. `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
    },
  },
  plugins: [],
}
```

---

## Future Enhancements

### Phase 2 Features (Not Yet Implemented)

1. **Advanced Analytics**
   - Employer dashboard: view/click stats
   - Candidate dashboard: profile view insights
   - A/B testing for job descriptions

2. **Notifications**
   - Email notifications for new messages
   - Push notifications (PWA)
   - In-app notification center

3. **Payment System**
   - Stripe integration
   - Subscription tiers for employers
   - Pay-per-contact model

4. **Video Interviews**
   - Integrated video calling
   - Recorded video interviews
   - Interview scheduling

5. **AI Matching**
   - ML-based candidate recommendations
   - Job-candidate matching score
   - Skill gap analysis

6. **Mobile App**
   - React Native iOS/Android apps
   - Push notifications
   - Optimized mobile experience

7. **Advanced Search**
   - Elasticsearch integration
   - Natural language search
   - Saved searches

8. **Team Collaboration**
   - Multiple users per company account
   - Internal notes on candidates
   - Interview feedback sharing

9. **Background Checks**
   - Integration with Checkr or similar
   - Automated reference checking
   - Education verification

10. **Applicant Tracking System (ATS)**
    - Interview pipeline management
    - Offer letter generation
    - Onboarding workflows

---

## Database Migration Script (If Needed)

### Migrating from Old to New Data Structure

```typescript
// scripts/migrate-education.ts
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateEducation() {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    
    // Check if user has old education format
    if (data.school && !data.education) {
      const education = [{
        school: data.school,
        degree: data.degree || '',
        majors: data.major ? [data.major] : [],
        minors: data.minor ? [data.minor] : [],
        graduationYear: data.graduationYear || '',
        gpa: data.gpa || ''
      }];
      
      // Update document
      await updateDoc(doc(db, 'users', userDoc.id), {
        education: education
      });
      
      console.log(`Migrated education for user ${userDoc.id}`);
    }
  }
  
  console.log('Migration complete!');
}

// Run: npx ts-node scripts/migrate-education.ts
```

---

## Testing Checklist

### User Authentication
- [ ] Candidate signup
- [ ] Employer (company owner) signup
- [ ] Recruiter signup with invitation
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout
- [ ] Password reset

### Candidate Flow
- [ ] Create profile
- [ ] Edit profile
- [ ] Upload resume
- [ ] Upload video
- [ ] Add multiple education entries
- [ ] Select multiple majors/minors
- [ ] Add multiple preferred locations
- [ ] View profile completion bar
- [ ] Share endorsement link
- [ ] View companies that viewed profile
- [ ] Receive message from employer
- [ ] Reply to message
- [ ] View company profile
- [ ] Rate company

### Employer Flow
- [ ] Create company profile
- [ ] Edit company profile
- [ ] Invite recruiter
- [ ] Post job
- [ ] Edit job
- [ ] Search candidates with filters
- [ ] View candidate profile
- [ ] Save candidate
- [ ] Unsave candidate
- [ ] Send message to candidate (with job)
- [ ] View messages
- [ ] View candidates by job
- [ ] View saved candidates
- [ ] View active jobs list

### Recruiter Flow
- [ ] Accept invitation
- [ ] Sign up as recruiter
- [ ] View company profile (read-only)
- [ ] Post job under company
- [ ] Search candidates
- [ ] Send message (with job)
- [ ] View own jobs + owner's jobs
- [ ] Cannot see other recruiters

### Edge Cases
- [ ] Handle deleted Firebase Auth accounts
- [ ] Handle missing profile images
- [ ] Handle missing resumes/videos
- [ ] Handle empty search results
- [ ] Handle no messages
- [ ] Handle no jobs
- [ ] Handle no candidates contacted
- [ ] Handle invitation already used
- [ ] Handle expired invitations
- [ ] Handle network errors
- [ ] Handle Firestore permission denials

---

## Support & Maintenance

### Monitoring

**Firebase Console**:
- Monitor authentication activity
- Check Firestore read/write usage
- Monitor Storage usage
- Review security rule logs

**Vercel Analytics** (if using Vercel):
- Track page views
- Monitor performance
- Check error rates

### Regular Maintenance Tasks

**Daily**:
- Monitor error logs
- Check user signup success rate

**Weekly**:
- Review Firestore usage
- Check Storage costs
- Review user feedback

**Monthly**:
- Security rules audit
- Performance optimization
- Cost analysis
- Feature usage analytics

### Backup Strategy

**Firestore Backups**:
```bash
# Export all collections
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)

# Schedule automated backups in Firebase Console
```

**Code Backups**:
- GitHub repository (primary)
- This MASTERPLAN.md document
- Environment variables stored securely (1Password, etc.)

---

## Contact & Documentation

### Internal Documentation
- This masterplan document
- Code comments in complex functions
- Firebase collections README in console

### External Resources
- Firebase Documentation: https://firebase.google.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs

---

## Version History

**v1.0** - Initial platform launch
- Core features: profiles, messaging, job posting, search
- User roles: Candidate, Employer, Admin

**v1.1** - Company/Recruiter system
- Company profiles
- Recruiter invitations
- Multi-user company accounts

**v1.2** - Enhanced features
- Candidates by job page
- Resume viewer modal
- Multiple education entries
- Profile completion bar
- Enhanced filtering

**v1.3** - UI/UX improvements
- Improved message threads (70vh layout)
- Dashboard navigation fixed
- Back button loops fixed
- Performance optimizations (parallel fetching)

---

## Conclusion

This masterplan provides a complete blueprint for rebuilding the HireMe platform from scratch. It includes:

✅ Complete data models  
✅ Firestore security rules  
✅ All feature implementations  
✅ User flows and journeys  
✅ Component architecture  
✅ Deployment instructions  
✅ Testing checklist  
✅ Common issues & solutions  

Keep this document updated as the platform evolves. Treat it as the single source of truth for platform architecture and implementation details.

---

**Last Updated**: October 2025  
**Platform Version**: 1.3  
**Document Maintainer**: Development Team

