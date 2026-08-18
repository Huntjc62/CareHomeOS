# CareHomeOS — GitHub + Firebase only

This version is deliberately static. It does not require Node.js, npm, Firebase CLI, a local server or Cloud Functions.

## Services
- GitHub / GitHub Pages — static hosting
- Firebase Authentication — accounts and sign-in
- Cloud Firestore — organisation and application data

## Firebase setup
1. Open the Firebase Console and use the `carehomeos` project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create **Firestore Database** in production mode.
4. Open **Firestore Database → Rules** and paste the complete contents of `firestore.rules`, then click **Publish**.
5. Do not upload service-account JSON/private keys to GitHub.

The Firebase Web App configuration is already in `app.js`. If you use another Firebase project, replace the `firebaseConfig` object at the top.

## GitHub Pages setup
Create a GitHub repository, preferably Private while developing. Upload:
- `index.html`
- `app.js`
- `styles.css`
- `firestore.rules`

Then open **Settings → Pages** and choose **Deploy from a branch → main → /(root)**.

Open the resulting GitHub Pages URL.

In Firebase, open **Authentication → Settings → Authorised domains** and add your GitHub Pages host, for example `YOUR-USERNAME.github.io`.

## First account
Choose **Create account**. The first account creates an organisation and becomes **Account Owner**.

## Team and permissions
The owner can invite:
- Registered Manager
- Senior Care Worker
- Care Worker

The invitee creates a Firebase Authentication account with the invited email and invite code.

## Scheduling
Rota records are stored in Firestore. Add/edit operations write to the shared organisation database, so authorised users see the same records rather than browser-local copies.

## Change history
The owner has an Audit history screen containing user, action, area, record, before data, after data and summary. Entries cannot be updated or deleted through Firestore Rules.

**Important:** because this is a browser-only architecture, the change-history writer is client-side. It is not a tamper-proof server-side audit log. Do not treat it as sufficient for a real regulated care-record deployment. A production system should add a trusted backend/server-side audit mechanism.

## No Node.js
You do not need Node.js, npm, Firebase CLI, Cloud Functions, a local server or a build process. GitHub Pages serves the static files and Firebase is accessed directly from the browser through the Firebase Web SDK CDN.

## Production warning
Do not enter real service-user, health, medication, safeguarding, staff HR or other confidential information into this prototype. Before production use, formally implement and test MFA, App Check, secure file storage/Storage Rules, retention/deletion, backups/disaster recovery, monitoring, trusted audit logging, security testing, DPIA and appropriate UK GDPR/care-sector controls.
