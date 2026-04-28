# Truth or Cap — Project

This is the Truth or Cap web app. AI-powered voice + video lie detector game.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 3.4 with custom theme
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **AI APIs:** OpenAI Whisper, Hume AI, Anthropic Claude
- **Animation:** Framer Motion 11
- **Hosting:** Replit Autoscale Deployment
- **Domain:** truthorcapapp.com

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see .env.example)
# Copy values into Replit Secrets (Tools → Secrets)

# 3. Apply Supabase migrations
# Follow instructions in /supabase/README.md

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
.
├── app/                  # Next.js App Router routes
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout with fonts + metadata
│   ├── page.tsx         # Landing page
│   └── globals.css      # Theme + utilities
├── components/          # React components
│   └── ui/             # Reusable UI primitives
├── lib/                 # Utilities and shared code
│   ├── supabase/       # Supabase clients (browser + server)
│   ├── types.ts        # Core TypeScript types
│   └── utils.ts        # Helpers (cn, formatDuration)
├── public/              # Static assets
├── supabase/            # Database migrations + storage config
└── middleware.ts        # Auth session refresh
```

## Design system

- **Aesthetic:** Forensic evidence room meets editorial brutalism
- **Background:** `#0a0a0a` (deep charcoal, not pure black)
- **Accent:** `#fef08a` (caution tape yellow) for visual punch
- **Score colors:** `#a8ff00` (acid/honest), `#fbbf24` (mustard/inconclusive), `#dc2626` (blood/sus)
- **Display font:** Fraunces (variable serif, editorial)
- **Body font:** Manrope (geometric sans)
- **Mono font:** JetBrains Mono (for data, labels, forensic feel)

## Development workflow

This project uses an iterative mission-based build approach. See `/prompts/` for execution order.

Each mission is a focused prompt for Claude Code or Replit Assistant that builds one cohesive feature.

**Current state:** Mission 00 (Project initialization) is complete.

**Next mission:** 01 — Database & Storage setup. See `/prompts/01-database.md`.

## Scripts

- `npm run dev` — start dev server (Replit-ready, binds to 0.0.0.0)
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript validation

## Deployment

Configured for Replit Autoscale Deployment via `.replit` file. To deploy:

1. Connect custom domain `truthorcapapp.com` in Replit dashboard
2. Click **Deploy** → **Autoscale Deployment** (NOT Static)
3. Confirm `npm run build` and `npm run start` are set
4. Verify env vars are set in **Secrets**
5. Click deploy

## License

Proprietary — All rights reserved.
