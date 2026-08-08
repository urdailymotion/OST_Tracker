# SECURITY NOTICE

## Repository visibility

**Keep this repository PRIVATE.**

The migrated source is intentionally preserved from the current Google Apps Script project so application behavior does not change during the first migration.

## Why private is required right now

The current `Code.gs` contains a default administrator credential and the current application intentionally manages vendor credentials as plain text in the `USERS` sheet. Publishing this source publicly would expose information useful for attacking the application.

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
