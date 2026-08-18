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
