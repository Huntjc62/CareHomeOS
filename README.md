# CareHomeOS — Sign-in fixed

No Node.js required.

## Firebase setup
1. Authentication → Sign-in method → enable **Email/Password**.
2. Authentication → Settings → Authorised domains → add your GitHub Pages hostname, e.g. `yourname.github.io`.
3. Firestore Database → create database.
4. Firestore → Rules → publish the supplied `firestore.rules`.
5. Ensure the Firebase project is `carehomeos`.

If the email already exists in Firebase Authentication, do not register it again. Use Sign in. If the Auth account exists but the CareHomeOS Firestore profile is missing, the app will show the account-recovery setup.

If sign-in fails, click **Having trouble signing in?** to see the exact GitHub Pages hostname that must be added to Firebase Authentication → Authorised domains.


## Important: Save button fix

This build fixes a browser HTML issue in the previous version where JavaScript containing quotation marks was inserted directly into a quoted `onclick` attribute. That caused modal Save buttons to appear clickable but not execute their Firestore write function.

The button helper now HTML-escapes the complete JavaScript handler, so Add/Save/Edit actions execute correctly.

## If a Firebase write is rejected

The application now opens a visible Firebase error dialog rather than silently doing nothing. It also includes a **Test database** button on the Overview page.

If you see `permission-denied`, publish the included `firestore.rules` in:
Firebase Console → Firestore Database → Rules → Publish.

The authenticated user must have a member document at:
`organisations/{organisationId}/members/{uid}`

The application creates this during account setup.

## No Node.js

This package remains browser-only:
- GitHub/GitHub Pages for the frontend
- Firebase Authentication for accounts
- Cloud Firestore for data
- Firestore Security Rules for permissions

No npm, Node.js, Firebase CLI or Cloud Functions are required.


## People save fix

The People form no longer relies on inline `onclick` JavaScript for its Save button.
It now uses a real form `submit` event, disables the button while saving, waits for the Firestore write to complete, and shows the Firebase error if the write is rejected.

A successfully saved person is stored at:
`organisations/{organisationId}/people/{personId}`

The live Firestore listener then makes the new person appear across the People page and any other module that reads the People collection.


## All pages / all buttons reliability update

All shared CareHomeOS buttons now use a central delegated action system rather than inline `onclick` attributes. This covers navigation, add/edit/save actions, diagnostics, reports, audit history, team permissions and other interactive controls.

Database actions show `Saving…`, await Firestore, and display a useful error if Firebase rejects the write.

If a button still fails, the browser console will now contain the action error and the application will show a visible error dialog instead of silently doing nothing.
