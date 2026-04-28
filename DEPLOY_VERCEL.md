# Deploy Truth or Cap to Vercel

Step-by-step. Targeted at someone who has Vercel + Supabase already
working locally.

---

## 1. Push the scaffold to GitHub

```powershell
cd "C:\Users\danie\OneDrive\Daniel\App truthorcap\truthorcap-launch-kit\truthorcap-launch-kit\scaffold"
git init
git add -A
git commit -m "Truth or Cap — initial commit"
gh repo create truth-or-cap --private --source . --push
```

If you don't have GitHub CLI: create a private repo manually at
github.com, then `git remote add origin … && git push -u origin main`.

## 2. Connect Vercel to the repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → pick `truth-or-cap`
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave default (`.`)
5. Don't deploy yet — first add the env vars

## 3. Configure environment variables

In the Vercel project settings → **Environment Variables**, add **all 11**:

```
NEXT_PUBLIC_SUPABASE_URL=https://mldaoedudfdzmldbnqhi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
IP_HASH_SALT=<32 random hex chars — DON'T regenerate after first deploy>
OPENAI_API_KEY=sk-proj-...
HUME_API_KEY=...
HUME_SECRET_KEY=...
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SITE_URL=https://truthorcapapp.com
```

Apply each to **Production**, **Preview**, **Development**.

## 4. First deploy

Click **Deploy**. Watch the build log. Common first-deploy failures:

- **"Module not found"** → run `npm install` locally and commit `package-lock.json`
- **TypeScript errors** → typecheck locally with `npx tsc --noEmit` and fix
- **OG image timeouts** → set `runtime = 'nodejs'` (already done in our files)

After success, Vercel gives you a `truth-or-cap-xxx.vercel.app` URL. Test it.

## 5. Custom domain

1. Vercel project → **Settings → Domains**
2. Add `truthorcapapp.com`
3. Add `www.truthorcapapp.com` (redirect to apex)
4. At your DNS registrar, add the records Vercel shows you (typically:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME`: `www` → `cname.vercel-dns.com`)
5. Wait 5-30 min for SSL provisioning

## 6. Update Supabase Auth URLs

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL** = `https://truthorcapapp.com`
- **Redirect URLs** add:
  - `https://truthorcapapp.com/auth/callback`
  - `https://truthorcapapp.com/auth/confirm`
- Keep the `http://localhost:3000/*` entries for local dev

## 7. Verify production

```bash
curl -s https://truthorcapapp.com/api/health
# expect: {"ok":true,"profiles_count":N,...}
```

Then run through the LAUNCH_CHECKLIST in production with a clean
browser session.

## 8. Set up cost alerts

- **OpenAI** → Settings → Billing → Usage limits → soft $50, hard $100
- **Hume** → Account → Billing → set monthly cap
- **Anthropic** → Workspaces → Billing → spend limit

Failure mode if you skip this: a viral spike could cost hundreds before
you notice. Set the alerts.

## 9. PostHog (optional but recommended)

- Sign up at posthog.com (free tier covers 1M events/month)
- Create project "Truth or Cap"
- Copy the **Project API Key** → set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel
- Redeploy
- Watch live events in the PostHog Activity tab

## 10. Day-0 sanity tests

Run on a real iPhone + a real Android device:

- [ ] `https://truthorcapapp.com` renders
- [ ] Sign up via magic link, magic link arrives, click works
- [ ] Onboarding completes (allow camera/mic when prompted)
- [ ] Record a 10s game, send it
- [ ] Open the link in incognito on another device → vote → see reveal
- [ ] Share to WhatsApp → preview shows the dynamic OG image

When all 6 pass, you're live.

---

## Common production pitfalls

| Symptom | Fix |
|---|---|
| Magic link goes to `0.0.0.0:3000` | `NEXT_PUBLIC_SITE_URL` not set in Vercel env |
| OG image returns 500 | `runtime = 'nodejs'` missing on the route OR Edge runtime can't access Supabase |
| `service_role` errors `permission denied` | Wrong key copied (check Reveal in Supabase) |
| `CORS` errors when uploading recording | Site URL not in Supabase storage CORS list (Settings → API → CORS) |
| Cold start times out at 60s | Hume batch job slow — increase `maxDuration` to 90s OR run analysis in a background queue |

---

## Rollback plan

Vercel keeps every deployment. If launch goes sideways:

1. Vercel project → **Deployments** tab
2. Find the previous green deployment
3. Click **⋯ → Promote to Production**

Takes 30 seconds. You'll know what broke from the new build's logs.
