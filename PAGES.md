# CareHomeOS — standalone page structure

Each navigation destination now has its own HTML file:

- `overview.html`
- `people.html`
- `staff.html`
- `rota-shifts.html`
- `care-plans.html`
- `incidents.html`
- `training.html`
- `compliance.html`
- `documents.html`
- `reports.html`
- `audit-history.html`
- `team-permissions.html`
- `settings.html`

All pages share the same `app.js` and `styles.css`, and use the existing Firebase Authentication + Firestore implementation.

The sidebar now navigates between the individual HTML files. This means each navigation destination has a real URL/file and can be opened directly from GitHub Pages.

No Node.js is required.
