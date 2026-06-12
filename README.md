# Quick Login DELIMa

A no-admin Windows login launcher for Malaysian primary school pupils. Pupils tap
their name on a name-board screen; their MOE/DELIMa email is pre-filled in Chrome
incognito, so they only type their password. No IT admin required — teachers install
it themselves using a zip and a batch file.

See [PRODUCT.md](./PRODUCT.md) for the full problem/solution brief and
[docs/superpowers/plans/2026-06-12-quick-login-delima.md](./docs/superpowers/plans/2026-06-12-quick-login-delima.md)
for the implementation plan.

**PII WARNING:** This repo is PUBLIC. Real student names and emails must NEVER be
committed. `launcher/data/roster.js` ships with fake example data only. Real rosters
are generated locally by the teacher at `quicklogin.davinhub.com/jana.html`.

**Local site preview:**

```bash
cd site && python3 -m http.server 8777
```
