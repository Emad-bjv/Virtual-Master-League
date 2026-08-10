# Project: Virtual Master League (VML)

## Architecture
- **Tech Stack**: Django REST Framework (Backend, Port 9000), PostgreSQL, Celery/Redis, React 19 + Vite 8 + Tailwind CSS v4 (Frontend, Port 5173).
- **Communication**: REST API (`/api/v1/` or `/api/`), JWT Authentication (`Authorization: Bearer <token>`).
- **Domain Apps**:
  1. `users`: Auth (OTP/JWT), User Profile, Virtual Balance, Leaderboard, Roles (User/Admin/Coach).
  2. `teams`: Team, Squad Players (18-32 cap), GamePlan/Formation (dnd-kit), Club Facilities (20-level curves), Player Growth & Stamina (Virtual Stamina <30% lock).
  3. `matches`: Tournaments, League Schedule, Live Match Events, Standings Table, Live Substitutions, Aparat Live Stream embedding.
  4. `transfers`: Market Listings, Direct Buying, Bidding System, Caretaker Policy, Auto-release Overflow.
  5. `economy`: Store Packages, ZarinPal Gateway Sandbox/Live (500k Toman weekly top-up cap), Season Pass, Daily Rewards.
  6. `gacha`: Gacha Packs, Pity Counter (guaranteed 4-star+ on 10th pull), Pack Opening Animation & Player Odds.
  7. `notifications`: In-App Notification model & endpoints, Telegram bot signals (`send_telegram_message`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | User Auth & OTP | Phone number login, OTP verification, JWT access/refresh token issue, user role management | M1 | ORIGINAL_REQUEST §1 |
| 2 | User Profile & Leaderboard | User profile view, global ranking leaderboard, virtual dollar balance sync | M1 | ORIGINAL_REQUEST §1 |
| 3 | Team & Squad Management | Team details, player roster (18-32 cap), player stats, market values | M2 | ORIGINAL_REQUEST §1,2 |
| 4 | eFootball GamePlan & Formations | Interactive 11v11 pitch tactics, formation presets, position assignments, stamina state | M2 | gemini-code-1785504060357.md |
| 5 | Club Facilities Upgrade | 20-level stadium, academy, medical, training facility curves with cost/growth formulas | M2 | review_results.md |
| 6 | Player Growth & Virtual Stamina | Stamina consumption, virtual stamina lock (<30%), natural growth logs | M2 | review_results.md |
| 7 | League Schedule & Match List | Weekly match calendar, match status (scheduled, live, completed), scores | M3 | ORIGINAL_REQUEST §1,2 |
| 8 | Match Details & Event Ticker | Live match events, goal logs, card events, possession/shots stats | M3 | ORIGINAL_REQUEST §1,2 |
| 9 | Live Standings Table | Real-time league table (PTS, W/D/L, GF, GA, GD) updated post-match | M3 | ORIGINAL_REQUEST §1,2 |
| 10 | Live Substitution Requests | Mid-match live substitution queue and verification for active matches | M3 | ORIGINAL_REQUEST §2 |
| 11 | Aparat Live Stream Binding | Integration of Aparat live stream embed URL and live stream chat/events | M3 | implementation_plan.md |
| 12 | Transfer Market Listings | Browse active player listings, filter by position/OVR/price, list player for sale | M4 | ORIGINAL_REQUEST §1,2 |
| 13 | Direct Buy & Bidding | Direct buy with balance validation, bidding system with bid history and escrow | M4 | ORIGINAL_REQUEST §1,2 |
| 14 | Caretaker Policy & Budget Rules | Coach mid-season leave policy, automated team/budget lock rules | M4 | سیاست ترک مربی.md |
| 15 | Auto-Release Overflow | Automatic player release to market if squad size exceeds 32 or under 18 | M4 | review_results.md |
| 16 | Store Packages & Currency | Virtual dollar packages, pricing, 500,000 Toman weekly top-up limit | M5 | ORIGINAL_REQUEST §1,2 |
| 17 | ZarinPal Payment Gateway | Payment request init, ZarinPal sandbox redirect, callback verification & transaction logging | M5 | ORIGINAL_REQUEST §2 |
| 18 | Season Pass & Daily Claim | 50-level season pass progression, daily login reward claim tracking | M5 | implementation_plan.md |
| 19 | Gacha Pack System | Gacha packs list, pack odds (3-star, 4-star, 5-star), pack draw endpoint | M6 | ORIGINAL_REQUEST §1,2 |
| 20 | Gacha Pity Counter | Pity counter tracking per user/pack (guaranteed legendary on 10th pull if 9 pulls miss) | M6 | review_results.md |
| 21 | Pack Opening Logs & Reveal | Pack opening log history and frontend animation reveal payload | M6 | implementation_plan.md |
| 22 | In-App Notification Center | Backend Notification model, list/unread endpoints, mark-read, clear-all | M7 | ORIGINAL_REQUEST §1,2 |
| 23 | Telegram Bot Integration | Asynchronous Telegram messages for match results, big transfers, legendary gacha pulls | M7 | gemini-code-1785504060357.md |
| 24 | Admin Dashboard & Match Sim | Admin match result input, week simulation batch job, coach registration | M3 | ORIGINAL_REQUEST §2 |
| 25 | Frontend Auth Binding | Bind AuthModal to active Django JWT endpoints, sync user token in localStorage | M1 | ORIGINAL_REQUEST §1 |
| 26 | Frontend Team Binding | Bind TeamTab, EFootballGamePlan, ClubTab to Django team REST endpoints | M2 | ORIGINAL_REQUEST §1 |
| 27 | Frontend Match Binding | Bind HomeTab schedule, LiveStreamTab, AdminDashboard match management to Django REST | M3 | ORIGINAL_REQUEST §1 |
| 28 | Frontend Transfer Binding | Bind MarketTab to Django transfer REST endpoints (list, buy, bid) | M4 | ORIGINAL_REQUEST §1 |
| 29 | Frontend Store/Gacha Binding | Bind StoreTab packages, ZarinPal callback, pack draw modal to Django economy/gacha REST | M5, M6 | ORIGINAL_REQUEST §1 |
| 30 | Frontend Notification Binding | Bind NotificationCenter & Header unread count to Django notification REST endpoints | M7 | ORIGINAL_REQUEST §1 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | User Auth & Profile | `users` app Django models/views/urls + JWT Auth + Frontend AuthModal & Profile binding | none | PLANNED |
| M2 | Team & GamePlan | `teams` app backend completion + GamePlan/Facilities API + Frontend TeamTab binding | M1 | PLANNED |
| M3 | Matches & Standings | `matches` app REST routes (standings, matches, stream, admin sim) + Frontend Match binding | M2 | PLANNED |
| M4 | Transfers & Caretaker | `transfers` app REST routes + Caretaker rules + Frontend MarketTab binding | M1, M2 | PLANNED |
| M5 | Economy & ZarinPal | `economy` app REST routes + ZarinPal payment/verification + Season Pass + Frontend StoreTab | M1 | PLANNED |
| M6 | Gacha & Pity | `gacha` app REST routes + 10th-pull Pity engine + Frontend Pack Draw modal | M1, M5 | PLANNED |
| M7 | Notifications & Telegram | `notifications` app Django model/views/urls + Telegram bot signals + NotificationCenter binding | M1 | PLANNED |
| M8 | Final E2E Integration & Hardening | Run 100% E2E test suite (Tiers 1-5), clean build/run verification, zero console errors | M1-M7 | PLANNED |

## Interface Contracts
### `users` ↔ Frontend
- `POST /api/users/auth/otp/request/`: `{ "phone_number": string }` -> `{ "message": string }`
- `POST /api/users/auth/otp/verify/`: `{ "phone_number": string, "code": string }` -> `{ "access": string, "refresh": string, "user": object }`
- `GET /api/users/me/`: Header `Authorization: Bearer <token>` -> User profile object

### `teams` ↔ Frontend
- `GET /api/teams/my-team/`: Returns user's team, roster, facilities, budget, gameplan.
- `POST /api/teams/gameplan/`: `{ "formation": string, "starting_xi": array, "substitutes": array }` -> Updated GamePlan.
- `POST /api/teams/facilities/upgrade/`: `{ "facility_type": string }` -> Updated facility levels & deducted budget.

### `matches` ↔ Frontend
- `GET /api/matches/schedule/`: List of matches for current/all weeks.
- `GET /api/matches/standings/`: Current league table.
- `POST /api/matches/substitute/`: `{ "match_id": int, "player_out_id": int, "player_in_id": int }` -> Substitution log.

### `transfers` ↔ Frontend
- `GET /api/transfers/market/`: List of players for sale with prices and seller info.
- `POST /api/transfers/buy/`: `{ "listing_id": int }` -> Purchase transaction result.
- `POST /api/transfers/bid/`: `{ "listing_id": int, "bid_amount": int }` -> Bid placement result.

### `economy` ↔ Frontend
- `POST /api/economy/zarinpal/request/`: `{ "package_id": int }` -> `{ "payment_url": string, "authority": string }`
- `GET /api/economy/zarinpal/verify/`: Query `Authority`, `Status` -> Transaction verification & balance update.

### `gacha` ↔ Frontend
- `POST /api/gacha/draw/`: `{ "pack_id": int }` -> `{ "player": object, "is_pity": bool, "pity_count": int }`

### `notifications` ↔ Frontend
- `GET /api/notifications/`: List of user notifications.
- `POST /api/notifications/mark-read/`: `{ "notification_ids": array }` -> Success response.

## Code Layout
- Backend Root: `e:\Codes\Virtual Master League\` (Django settings: `config/`)
- Backend Apps: `users/`, `teams/`, `matches/`, `transfers/`, `economy/`, `gacha/`, `notifications/`
- Frontend Root: `e:\Codes\Virtual Master League\frontend\`
- Frontend Source: `frontend/src/`
  - `services/api.js`: Centralized Axios REST client
  - `context/AuthContext.jsx`: Global authentication & user state
  - `components/`: Domain UI tabs and components
