@AGENTS.md

# Flamenco Studio website

- Presentation layer only. Data, business rules, auth and authorization live
  in the backend API (`TELEGRAM-BOT`, local folder `TELEGRAM BOT`; its
  `CLAUDE.md` holds the system-wide rules). Never talk to PostgreSQL directly
  and never duplicate booking, payment or balance logic here.
- Requests to the backend go from the Next.js server (`src/lib/*.ts`,
  `API_BASE_URL`). Login, registration and sign-in via the bot are server
  actions (`src/lib/authActions.ts`) that send `backendHeaders()` — keep new
  auth calls on that path so the backend gets the visitor IP for its rate limit.
- Visual design follows the Liquid Glass design system:
  `LIQUID_GLASS_DESIGN.md`. Read it before changing UI.
- Studio time zone comes from `STUDIO_TIMEZONE` (same value as the backend).
- Checks before finishing: `npx eslint src`, `npx tsc --noEmit`, `npm test`,
  `npm run build`.
- Do not commit or push unless explicitly asked.
