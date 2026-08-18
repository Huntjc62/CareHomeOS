# CareHomeOS — GitHub + Firebase Only

This version requires **no Node.js, npm, Firebase CLI or Cloud Functions** to run the web app.

## Firebase project

The package is configured for the Firebase Web App:

- Project ID: `carehomeos`
- Auth domain: `carehomeos.firebaseapp.com`

## 1. Firebase Authentication

Firebase Console → **Authentication** → **Sign-in method** → enable **Email/Password**.

Also check **Authentication → Settings → Authorised domains** and add your GitHub Pages domain, for example:

`yourusername.github.io`

If you use a custom domain, add that domain too.

## 2. Firestore

Firebase Console → **Firestore Database** → create the database.

Then open **Firestore Database → Rules**, replace the rules with the contents of `firestore.rules`, and publish.

## 3. GitHub Pages

Create a repository and upload:

- `index.html`
- `app.js`
- `styles.css`
- `firestore.rules`
- `.gitignore`
- `README.md`

Enable GitHub Pages from **Settings → Pages → Deploy from a branch**.

## Important account/sign-in behaviour

This version fixes a common failure in browser-only Firebase prototypes:

- Account creation validates the organisation before creating the Firebase Auth account.
- If Firestore setup fails after Auth creation, the app attempts to roll back the newly-created Auth account instead of leaving an unusable account behind.
- Sign-in errors are shown instead of silently failing.
- If Auth succeeds but the Firestore workspace profile is missing, CareHomeOS shows a **Finish account setup** screen instead of immediately signing the user out.
- If the owner member record is missing but the organisation identifies the user as owner, the app repairs that member record.
- Firestore permission/setup errors are displayed with a useful explanation.

## Existing account that already registered but will not enter the dashboard

If an account already exists in Firebase Authentication but its CareHomeOS Firestore profile was not created, use the normal **Sign in** screen. The updated application will show a **Finish account setup** screen and let the authenticated account create its organisation/member records.

If the password itself is unknown, use **Forgotten password?** on the sign-in screen.

## Roles

- Account Owner — full organisation access
- Registered Manager — operational management
- Senior Care Worker — care/rota/training/incident access
- Care Worker — operational read access and incident reporting

Firestore Security Rules enforce the organisation and role boundaries. UI permissions are not the security boundary.

## Audit history

The owner can review change history. The browser writes audit entries to Firestore after successful creates/updates.

Because this is intentionally a **GitHub Pages + Firebase client-only build**, the audit writer is client-side. This is suitable for development/prototyping but is **not a tamper-proof regulatory audit trail**. A production care system should move audit generation to trusted server-side infrastructure.

## Security warning

Do not enter real service-user, health, medication, safeguarding, staff HR or other confidential data into this prototype. Production use requires a proper security architecture, MFA, least-privilege rules, secure file storage, backups, monitoring, retention controls, audit design and formal UK GDPR/regulatory review.
