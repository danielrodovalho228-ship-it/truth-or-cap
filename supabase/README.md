# Supabase Setup

## Step 1: Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save the database password in a safe place
3. Wait ~2 min for project to provision

## Step 2: Apply schema migration

1. Open your project → **SQL Editor** → **New query**
2. Copy the entire contents of `migrations/0001_initial_schema.sql`
3. Paste into the editor and click **Run**
4. Verify success: `select count(*) from public.profiles;` should return 0

## Step 3: Apply storage buckets

1. Same SQL Editor → **New query**
2. Copy contents of `storage_setup.sql`
3. Paste and **Run**
4. Verify in **Storage** → you should see 3 buckets: `recordings`, `voice-baselines`, `avatars`

## Step 4: Get API credentials

1. Settings → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (top of "Project API keys" section, click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

## Step 5: Configure Replit Secrets

In your Repl → **Tools** → **Secrets** → add the 3 values from above plus:

- `IP_HASH_SALT` = generate a random 32-character string ([generator](https://onlinerandomtools.com/generate-random-string))
- `OPENAI_API_KEY`, `HUME_API_KEY`, `ANTHROPIC_API_KEY` (placeholder for now, real values when you reach Mission 04)

## Step 6: Verify connection

Restart the dev server and visit `/api/health`. You should see:

```json
{ "ok": true, "profiles_count": 0, "timestamp": "..." }
```

If you see an error, check that env vars are correctly set and the migration ran without errors.

## Step 7 (optional): Generate TypeScript types

If you have Supabase CLI installed locally:

```bash
supabase login
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

Or skip this — the project will work without generated types, just with looser type safety on direct table queries.

## Next step

Run **Mission 02 — Auth flow** from `/prompts/02-auth.md` in Claude Code.
