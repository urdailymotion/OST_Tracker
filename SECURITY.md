# SECURITY NOTICE

## Repository visibility

**Keep this repository PRIVATE.**

The migrated source is intentionally preserved from the current Google Apps Script project so application behavior does not change during the first migration.

## Why private is required right now

The application still manages vendor and administrator credentials as plain text in the `USERS` sheet, and the admin UI displays and copies those passwords. Publishing this source publicly would expose information useful for attacking the application.

The hardcoded default administrator password has been removed from `Code.gs`. The initial administrator password is now generated randomly, flagged `MUST_CHANGE`, and returned only to the script owner (`setupSystem()` / `getInitialAdminPassword()`, also stored in the `INITIAL_ADMIN_PASSWORD` script property).

Initial vendor passwords are also random. Previously they were derived from `VENDOR_CODE` and `VENDOR_NAME`, both of which the unauthenticated login screen lists via `getLoginUserOptions()`, so any visitor could compute another vendor's password.

## Known remaining risks

- Passwords are stored, returned, and displayed in plain text (`USERS.PASSWORD_HASH`, `getUsers()`); anyone with spreadsheet access can read every account credential.
- `getLoginUserOptions()` is callable without a session and enumerates all active usernames, vendor codes, and vendor names.
- Only `ADMIN` can call `changePassword()`, so vendors cannot rotate their own password.
- `doGet()` uses `XFrameOptionsMode.ALLOWALL` (required by the Vercel shell that iframes the web app), so the UI can be framed by any site.
- Vendor photos are shared on Drive as `ANYONE_WITH_LINK`; the links are stored in the sheet and in history.

## Do not commit

- `.clasprc.json` (OAuth/refresh-token material from clasp)
- `.clasp.json` (project mapping; keep local for this project)
- spreadsheet exports (`.xlsx`, `.xls`, `.csv`)
- copied user/vendor credential lists
- API keys, tokens, cookies, or session values
- production database backups

## After migration

1. Confirm the GitHub repository is **Private**.
2. Change the production administrator password from the application's admin UI.
3. Do not paste credentials into GitHub issues, README files, commits, or screenshots.
4. Before ever making this repository Public, refactor authentication so passwords are not stored or returned as plain text.

## Maintenance functions

`setupSystem`, `repairLoginSystemV6`, `rebuildOutstandingParentDatabase`, `diagnoseLoginSystemV62`, `diagnoseParentChildV7`, and `getInitialAdminPassword` are global, so they are reachable from the browser through `google.script.run`. They now require either an Apps Script editor run by the script owner or an active `ADMIN` session token (`setupSystem(token)`), and no longer return the administrator password to non-owners.
