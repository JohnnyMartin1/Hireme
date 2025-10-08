# Firebase Admin SDK Setup Instructions

## You need to add these TWO variables to your `.env.local` file:

### 1. Get the Service Account JSON

1. Go to: https://console.firebase.google.com/project/hireme-app-3d386/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. A JSON file will download (e.g., `hireme-app-3d386-firebase-adminsdk-xxxxx.json`)

### 2. Open the downloaded JSON file

It will look like this:

```json
{
  "type": "service_account",
  "project_id": "hireme-app-3d386",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@hireme-app-3d386.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 3. Add to your `.env.local` file

Open your `.env.local` file and add these lines **at the end**:

```bash
# Firebase Admin SDK (Server-side only - DO NOT use NEXT_PUBLIC_ prefix)
FIREBASE_PROJECT_ID=hireme-app-3d386
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@hireme-app-3d386.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourActualPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT:**
- Copy the `client_email` value exactly as it appears in the JSON
- Copy the `private_key` value exactly as it appears (including the `\n` characters)
- Keep the private key in **double quotes** `"..."`
- The private key should be ONE long line with `\n` as literal text (not actual line breaks)

### Example:

```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@hireme-app-3d386.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1+fWIcsVST3s5RfZEhvxwDe/MmrSU4BtNvy9Y5Lvbdwqgr\n...(many more lines)...\nkB5aViPd\n-----END PRIVATE KEY-----\n"
```

### 4. Restart the dev server

After saving `.env.local`:

```bash
pkill -f "next dev"
npm run dev
```

---

## Need Help?

If you're stuck, send me a screenshot of:
1. The Firebase Console Service Accounts page
2. The first few lines of your `.env.local` (hide the actual private key)

