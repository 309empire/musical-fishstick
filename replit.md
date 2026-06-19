# Hexed

A customizable link-in-bio platform with Discord integration, badges, premium features, shop, templates, and an admin panel.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Wouter, TanStack Query, shadcn/ui
- **Backend**: Express.js, Passport.js, express-session, helmet, express-rate-limit
- **Database**: PostgreSQL via Drizzle ORM
- **Storage**: Replit Object Storage (for avatars, backgrounds) with local `uploads/` fallback for Railway/other hosts

## Security
- **Helmet**: Sets secure HTTP headers (XSS protection, referrer policy, etc.)
- **Rate Limiting** (via express-rate-limit):
  - Auth endpoints (`/api/login`, `/api/register`): 20 requests per 15 minutes — prevents brute-force
  - Upload endpoints (`/api/upload`): 20 requests per minute — prevents upload abuse
  - Public profile endpoints (`/api/public`): 60 requests per minute — prevents scraping
  - All other API endpoints: 300 requests per 15 minutes
- Rate limiters are skipped in development mode for easier testing

## Key Architecture

### Auto-Initialization (Railway Compatible)
- `server/initDb.ts` — runs `CREATE TABLE IF NOT EXISTS` for ALL tables on every startup
- No manual migrations or `drizzle-kit push` needed
- Just set `DATABASE_URL` and the app self-initializes
- Admin account (`abdz1` / `man1`) is auto-seeded on first run

### Database Tables (auto-created)
- `users` — accounts, roles (user/admin/owner), badges, premium status, dailyStreak, lastDailyClaim, aliases (JSONB array), completedChallenges (JSONB array)
- `profiles` — one per user, display settings, avatar, bio, links config (revealEnabled defaults to true)
- `links` — individual links on a profile
- `tracks` — music tracks per user
- `badges` — badge definitions (Premium, Rich, Silver Donator, Lovely Donator + auto-generated milestone badges)
- `shop_orders` — purchase history
- `view_logs` — profile view tracking (unique per IP)
- `profile_likes` — like tracking (unique per IP per user)
- `session` — express-session persistence

### Features Updated (March 2026 - Latest)
- **Profile URL Setup Screen**: New users (Discord OAuth or registration) see a dedicated screen before the dashboard to choose their custom URL (hexed.at/username). 1-20 chars, letters/numbers/underscores, no duplicates. Real-time availability checking. Can be changed later from dashboard.
- **Discord Real Badges**: DiscordWidget now decodes `public_flags` from Lanyard API to show real Discord badges (Staff, Partner, HypeSquad houses, Early Supporter, Bug Hunter, Active Developer, etc.) with emoji and tooltip on hover.
- **Username Uniqueness & Validation**: New validation on PATCH /api/user/username — 1-20 chars, no reserved words, case-insensitive duplicate check. Dashboard URL change section also does real-time availability checking with debouncing.
- **Username Setup Routes**: GET /api/check-username (public) + POST /api/setup-username (auth required). Both enforce the same validation rules.
- **profileSetupDone DB Column**: Added `profile_setup_done` boolean to users table. Existing users auto-migrated to true. New accounts start as false and must complete URL setup before accessing dashboard.
- **Profile Box Blur Tab**: New "Blur" sub-tab inside Profile Box section with backdrop blur slider + draggable 2D spotlight position picker (boxBlurX, boxBlurY)
- **Track Enable/Disable**: Each track has a toggle switch to enable/disable it from playing; disabled tracks are filtered on the public profile
- **Fix Shine/Liquid Effects**: Converted from `body::after` CSS pseudo-elements to React overlay divs (now visible correctly)
- **3D Links**: Individual TiltBox applied to each link in stacked layout (in addition to the main box tilt)
- **Match Material Theme Colour button**: Promoted to a visible button in the Profile Theme section (always visible, not conditional)
- **File cleanup**: Removed 12 unused component files from `components/dashboard/tabs/misc/` and `TrackTab.tsx`
- **tracks schema**: Added `enabled` INTEGER column (default 1); PATCH `/api/tracks/:id` endpoint to toggle enabled state

### New Features (March 2026)
- **Multiple Aliases**: Users can add multiple aliases (up to maxAliases). POST/DELETE `/api/user/aliases`
- **Daily Reward System**: 7-day streak with rewards. Day 3 = +1 alias slot, Day 7 = "Day 7 Streak" badge. Resets if day missed
- **Profile Challenges**: 8 sequential challenges (views/likes milestones). Completing 5 → "Quester" badge
- **Auto-Badges**: View milestones (100/500/1K/5K), likes milestone (100 = "Loved by the Community"), challenges ("Quester"), daily ("Day 7 Streak")
- **Rising Profiles**: `/api/public/rising` - users <1000 views with most activity in last 24h, cached 12h, shown on Landing
- **Custom Cursor Image**: Premium users can upload/paste a cursor image URL in MiscTab → Cursor section
- **YouTube Background**: YouTube URLs accepted in backgroundVideoUrl field (MiscTab → Background section)
- **Autoplay Fix**: Music autoplays when reveal screen is disabled, regardless of trackPlayerAutoplay setting

### Deployment
- No `railway.toml` (removed). Deploy directly on Replit or any Node.js host.
- Set `DATABASE_URL` — tables are created automatically on first start.

## File Structure
- `server/initDb.ts` — auto-creates all DB tables on startup
- `server/db.ts` — PostgreSQL pool + Drizzle ORM setup
- `server/routes.ts` — all API endpoints
- `server/auth.ts` — Passport.js authentication
- `server/storage.ts` — data access layer
- `shared/schema.ts` — Drizzle schema + TypeScript types
- `client/src/pages/Landing.tsx` — landing page with community marquee
- `client/src/pages/dashboard.tsx` — user dashboard
- `client/src/pages/public-profile.tsx` — public profile view

## Default Admin Account
- Username: `abdz1`
- Password: `man1`
- Role: `owner`
