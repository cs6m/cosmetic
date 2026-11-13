# Glowora → Supabase (live, real-time)

## 1. Create the backend (≈5 min)
1. Create a Supabase project. **Authentication → Providers → enable "Anonymous sign-ins"** (guests use it to place/see their own orders).
2. SQL Editor → run `supabase/01_schema_security_realtime.sql`, then `supabase/02_seed_data.sql`.
3. (Needed only to add/remove team members from the admin UI) deploy the function:
   `supabase functions deploy admin-users`
4. Change the three demo passwords (admin@glowora.com / staff@glowora.com / maya@glowora.com).

## 2. Connect the app
```
npm install            # adds @supabase/supabase-js
cp .env.example .env.local   # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Without the two variables the app runs in the old browser-only mode.

## 3. How it fits together
- `src/lib/supabaseClient.js` – client
- `src/data/supabaseMap.js` – app record <-> table row mapping (all entities)
- `src/data/supabaseSync.js` – hydrate, diff-and-save, realtime, auth, Storage uploads
- `src/data/adminDb.js` – unchanged API; `commit()` now also persists, `login()` uses Supabase Auth
- `src/services/customerService.js`, `adminService.js` – standalone CRUD + subscribe helpers
- `supabase/functions/admin-users` – creates/removes team logins (needs service role, so server-side)
