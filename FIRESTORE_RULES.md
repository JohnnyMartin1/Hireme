# Firestore Security Rules

## Updated Rules for Companies & Invitations

Add these rules to your Firebase Console under Firestore Rules:

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
      allow create, update: if request.auth.uid == userId;
      
      // Allow company owners to delete recruiters from their company
      allow delete: if request.auth.uid == userId
        || (request.auth != null 
            && resource.data.role == 'RECRUITER' 
            && isCompanyOwner(resource.data.companyId));
    }
    
    // Companies collection
    match /companies/{companyId} {
      // Anyone can read company profiles
      allow read: if true;
      
      // Only company owners can create/update their company
      allow create: if request.auth != null 
        && request.resource.data.createdBy == request.auth.uid;
      
      allow update: if request.auth != null 
        && resource.data.createdBy == request.auth.uid;
      
      allow delete: if request.auth != null 
        && resource.data.createdBy == request.auth.uid;
    }
    
    // Company Invitations
    match /companyInvitations/{invitationId} {
      // Anyone authenticated can read (to check their invitations)
      allow read: if request.auth != null;
      
      // Only company owners can create invitations for their company
      allow create: if request.auth != null 
        && isCompanyOwner(request.resource.data.companyId);
      
      // Invited user can update their invitation (accept/decline)
      // Company owner can update/cancel their invitations
      allow update: if request.auth != null && (
        request.auth.token.email.lower() == resource.data.invitedEmail
        || isCompanyOwner(resource.data.companyId)
      );
      
      // Only company owners can delete invitations
      allow delete: if request.auth != null 
        && isCompanyOwner(resource.data.companyId);
    }
    
    // Jobs collection
    match /jobs/{jobId} {
      allow read: if true;
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
      allow read: if true;
      allow create: if true; // Public endorsement form
      allow update, delete: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## Key Changes

1. **Companies Collection**: Public read, only owners can write
2. **Company Invitations**: Authenticated users can read their invitations, owners can manage
3. **Jobs**: Recruiters linked to the company can manage jobs
4. **Helper Functions**: `isCompanyOwner()` and `belongsToCompany()` for permission checks

## Storage Rules

Update Firebase Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /resumes/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /videos/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /profile-images/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /company-logos/{companyId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /company-banners/{companyId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Deployment

1. Go to Firebase Console > Firestore Database > Rules
2. Copy and paste the Firestore rules above
3. Go to Firebase Console > Storage > Rules
4. Copy and paste the Storage rules above
5. Click "Publish" for both

## Migration Notes

For existing employers:
1. Create a company document for each employer
2. Set `companyId` on their user profile
3. Set `isCompanyOwner` to true
4. Role remains "EMPLOYER" for company owners

