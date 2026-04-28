# Truth or Cap — Pre-Launch Checklist

Run through this **in order** before flipping the public switch on
`truthorcapapp.com`. Items marked ⚠️ are blockers — don't ship without them.

---

## 1. Database

- [ ] Migration `0001_initial_schema.sql` applied
- [ ] Migration `0002_api_cost_log.sql` applied
- [ ] Migration `0003_qotd_and_challenge.sql` applied
- [ ] `storage_setup.sql` applied (3 buckets: recordings / voice-baselines / avatars)
- [ ] Seed: today's QOTD + daily challenge are visible at `/challenge`
- [ ] Realtime publication includes the `votes` table
  *(Supabase Dashboard → Database → Replication → enable `votes`)*

## 2. Environment

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Vercel project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (treat as a secret)
- [ ] `IP_HASH_SALT` set (32 random chars, **never change after launch**)
- [ ] `OPENAI_API_KEY` with $20+ credit
- [ ] `HUME_API_KEY` and `HUME_SECRET_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` (Project key from PostHog)
- [ ] `NEXT_PUBLIC_SITE_URL=https://truthorcapapp.com`

## 3. Supabase Auth

- [ ] **Site URL** = `https://truthorcapapp.com`
- [ ] **Redirect URLs** include:
  - `https://truthorcapapp.com/auth/callback`
  - `https://truthorcapapp.com/auth/confirm`
  - (keep localhost entries for dev)
- [ ] Magic link email template customized (subject + body)
- [ ] Confirm signup email template customized

## 4. Functional smoke test (use a clean browser session)

- [ ] `/` renders — tape stripes, "Truth or Cap" headline
- [ ] `/auth/sign-up` → magic link arrives in <30s
- [ ] Magic link redirects to `/onboarding` (NOT 0.0.0.0)
- [ ] Onboarding 8 steps complete in <90s
- [ ] `/jogo/select` shows 6+ game types
- [ ] Recording on iPhone Safari works (real device)
- [ ] Recording on Android Chrome works (real device)
- [ ] Analysis completes <30s, SUS LEVEL renders
- [ ] Video player loads (signed URL via `/api/recording/url`)
- [ ] Share to WhatsApp shows custom OG image
- [ ] Anonymous voter on a shared link can vote
- [ ] Challenge-back link auto-fills question
- [ ] `/admin` only accessible to admin UUIDs
- [ ] `/api/health` returns `{ ok: true }`
- [ ] `/challenge` shows QOTD + Today's Challenge
- [ ] Bottom nav appears once signed in, hides on auth/onboarding/recorder

## 5. Performance ⚠️

- [ ] Lighthouse mobile `/` ≥ 90 perf, 100 SEO
- [ ] Lighthouse mobile `/jogo/[id]` ≥ 85 perf
- [ ] No image optimisation warnings on the home page
- [ ] First Contentful Paint < 1.5s on 3G
- [ ] No layout shift after load

## 6. Security ⚠️

- [ ] No API keys in client bundle (verify `view-source` on home)
- [ ] No PII in PostHog events
- [ ] `service_role` key never sent to client
- [ ] Rate limits in place: votes (30/h IP), analyses (10/h user), invites (50/d user)
- [ ] All `/api/*` routes have auth checks where applicable

## 7. Legal ⚠️

- [ ] Consent disclaimer (4 checkboxes) appears before recorder activates
- [ ] `/terms` reviewed by a lawyer (replace placeholder text)
- [ ] `/privacy` reviewed (mentions Hume, OpenAI, Anthropic, Supabase)
- [ ] `/cookies` reviewed
- [ ] Delete account flow tested (cascades + storage purge)
- [ ] LGPD: data export endpoint or process documented
- [ ] App Store: question pools cleared of drugs/violence/sexual content

## 8. Costs

- [ ] `api_cost_log` populating after each analysis
- [ ] Per-analysis cost ≈ $0.04 (sanity check)
- [ ] Daily cost alert configured (threshold: $50)
- [ ] Per-provider billing alerts set ($100 each at OpenAI / Hume / Anthropic)

## 9. SEO

- [ ] `sitemap.xml` accessible
- [ ] `robots.txt` blocks `/admin`, `/auth`, `/onboarding`
- [ ] Every public route has unique title + description
- [ ] OG image renders correctly on:
  - [ ] WhatsApp
  - [ ] X / Twitter
  - [ ] Facebook
  - [ ] Discord

## 10. Analytics

- [ ] PostHog events firing (test on a clean browser, watch live in PostHog)
- [ ] User identification works post-signup
- [ ] Funnel visualization shows the onboarding → first game → first invite path

## 11. Domain & DNS

- [ ] `truthorcapapp.com` points to Vercel deployment
- [ ] `www.truthorcapapp.com` redirects to apex (or vice versa)
- [ ] SSL certificate auto-provisioned (Vercel handles this)

## 12. Mobile

- [ ] Bottom nav appears on signed-in pages
- [ ] Cookie banner respects `safe-area-inset-bottom`
- [ ] PWA install prompt works on iOS Safari + Android Chrome

## 13. Day 0 communications

- [ ] Press kit ready (1-pager, screenshots, founder bio)
- [ ] Social accounts created (`@truthorcap` on TikTok / Instagram / X)
- [ ] 10+ creator partnerships locked (with sample videos in hand)
- [ ] First TikTok teaser scheduled
- [ ] ProductHunt listing drafted

---

## Deferred to V2 (post-launch)

- Live multiplayer rooms (websockets, host controls, sync state)
- Premium tier UI + Stripe integration
- Visual rebrand to rosa/roxo cartoon theme
- Dark/light mode toggle (currently dark by default)
- Streak protection cron (Supabase Edge Function)
- Group reveal aggregator
- Native iOS/Android apps via Capacitor

When K-factor hits 1.0+ for 14 days, start prioritising these.
