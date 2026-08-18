# CareHomeOS — Firebase Full Version

This package is a database-backed SaaS foundation using Firebase Authentication + Cloud Firestore, with role-based permissions and server-side audit logging.

## What is included

- Email/password authentication
- New organisation/account creation
- Invite-code onboarding for additional users
- Multi-tenant organisation structure
- Owner / Manager / Senior Care Worker / Care Worker roles
- Firestore-backed People
- Firestore-backed Staff
- Firestore-backed Rota & Shifts
- Firestore-backed Care Plans
- Firestore-backed Incidents
- Firestore-backed Training
- Firestore-backed Compliance
- Firestore-backed Documents metadata
- Reports
- Owner-only audit history
- Owner team/permission management
- Firestore Security Rules
- Cloud Function for server-side change history
- Firebase Hosting configuration
- No Node.js required to run the front-end once deployed

## IMPORTANT: Firebase credentials

Do NOT put a service-account private key in this project.

The browser Firebase Web App config is designed to be included in the web application. Firebase Security Rules are what protect Firestore access. Never put Admin SDK/service-account credentials into `public/`.

## Setup

### 1. Create a Firebase project

Go to the Firebase Console and create a project.

Then add a **Web App** to the project.

Copy the Firebase Web App configuration.

Open:

`public/app.js`

Find:

`const firebaseConfig = { ... }`

Replace the PASTE_* values with the config from your Firebase project.

### 2. Enable Authentication

Firebase Console:

Build → Authentication → Get started → Sign-in method

Enable:

**Email/Password**

The application uses Firebase Authentication for sign-up, sign-in and password reset.

### 3. Create Firestore

Firebase Console:

Build → Firestore Database → Create database

Use the `(default)` database.

Choose the region closest to your users. For a UK care provider, choose a suitable UK/European region offered by your Firebase project.

Do NOT leave a production application using unrestricted test-mode rules.

### 4. Install Firebase CLI

Cloud Functions and Firebase deployment require Node.js. Firebase currently supports Node.js 20 and 22 for Cloud Functions.

Install Node.js 22 from nodejs.org.

Then open PowerShell in this folder:

`npm install -g firebase-tools`

Sign in:

`firebase login`

### 5. Connect this folder to your Firebase project

Run:

`firebase use --add`

Select your Firebase project.

If this creates a `.firebaserc`, that's expected.

### 6. Deploy Firestore rules

Run:

`firebase deploy --only firestore:rules`

### 7. Deploy the audit function

Run:

`cd functions`

Then:

`npm install`

Then:

`cd ..`

Then:

`firebase deploy --only functions`

The included Cloud Function listens for organisation record changes and writes audit entries to:

`organisations/{orgId}/audit`

It records create/update/delete events and attempts to identify the authenticated user from the Firebase event context.

### 8. Deploy the website

From the project root:

`firebase deploy --only hosting`

Firebase will give you a `web.app` / `firebaseapp.com` address.

### 9. Create your first account

Open the hosted application.

Click:

**Create account**

Enter:

- Your name
- Work email
- Password
- Organisation name
- Service type

The first person creating the organisation becomes the:

**Account Owner**

### 10. Add other staff

Log in as the owner.

Open:

**Team & permissions**

Click:

**Invite team member**

Choose:

- Registered Manager
- Senior Care Worker
- Care Worker

CareHomeOS creates a single-use invitation code.

Give that code to the invited user.

They choose **Create account**, use the same email address and enter the invitation code.

Their account is then attached to your organisation with the selected role.

## Roles

### Account Owner
Everything, including:
- organisation settings
- team permissions
- audit history
- all operational modules

### Registered Manager
Can manage:
- people
- staff
- rota
- care plans
- incidents
- training
- compliance
- documents
- reports

Cannot manage the owner or organisation ownership.

### Senior Care Worker
Can manage:
- people
- rota
- care plans
- incidents
- training
- reports

### Care Worker
Can:
- view operational records
- view rota
- view relevant care information
- report incidents

The exact permission model should be refined before production deployment to match the provider's service model.

## Why the rota now works differently

The rota no longer uses browser localStorage.

When a user saves a shift:

Browser
→ Firebase Authentication
→ Firestore Security Rules
→ Cloud Firestore
→ real database record

Other authorised users can then see the change.

This means the previous "open shift won't save" problem is not solved with another local JavaScript patch: the application now has a real persistence layer.

## Audit history

The account owner has an **Audit history** screen.

The backend function records:

- created
- updated
- deleted
- user
- collection
- record ID
- record label
- changed field summary
- before snapshot
- after snapshot

The Firestore rules make audit records read-only from the client.

## Security warning

This is a serious SaaS foundation, but it is NOT a completed regulated clinical production system.

Before entering real care/service-user information, commission a proper security and data-protection review. This application may process health and other special-category personal data.

For production, add:
- MFA
- email verification
- App Check
- secure file uploads via Firebase Storage
- stronger password/session controls
- formal role/least-privilege review
- backups and disaster recovery
- monitoring/alerting
- retention/deletion policies
- data export/deletion workflows
- penetration testing
- privacy notice and data-processing documentation
- formal regulatory review
- tested incident response

Also review Firestore query/index requirements as the dataset grows.

## Local development

You can deploy with Firebase Hosting or use the Firebase Emulator Suite after installing the Firebase CLI.

Do not use the local HTML file (`file://`) for the final Firebase application. Firebase Authentication and cloud resources are intended to be served through a web origin such as Firebase Hosting.
