# Project: Virtual Master League (VML) — Referee Room & Coach Panel Upgrade

## Architecture
- **Tech Stack**: Django 6 + Django REST Framework (Backend, Port 9000), Django Channels (ASGI/Daphne, WebSocket `ws/match/<id>/`), SQLite/PostgreSQL, Celery/Redis, React 19 + Vite 8 + Tailwind CSS v4 (Frontend, Port 5173).
- **Core Domain Modules**:
  1. `matches`: Tournaments, League Schedule, Live Match Events, Standings Table, Live Substitutions, Match Team Stats, Player Match Stats, Admin Control Room.
  2. `notifications`: Smart In-App Notifications, Role Distinction (Admin vs Coach), Dismissal Persistence, Telegram Bot Signals.
  3. `realtime`: WebSocket Consumers (`MatchLiveConsumer`, `AdminChannelConsumer`), Event Broadcasting (`broadcast_match_event`), JWT Channel Auth Middleware.
  4. `teams`: Team Roster, GamePlan Formations, 14 Modern Tactics, Unified Submission (`submit_gameplan`), Club Facilities.
  5. `users`: Auth (OTP/JWT), User Profile, Role Management (Admin, Coach, User).

## Feature Inventory (Requirements R1 – R6)
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Smart Notifications & Role Distinction | Model extension (`match`, `action_url`, `target_role`, `is_dismissed`), dismissal API, role-based direct routing (Admin -> Referee Room, Coach -> Live Desk), LocalStorage + DB persistence to prevent repeated chimes on reload | M1, M2, M3 | ORIGINAL_REQUEST §R1 |
| 2 | R2: Gameweek Round Filtering Isolation | Accurate round filtering in `AdminMatchListView` & `GameweekStatusView` across weeks 1-30 via `normalize_round_query`, eliminating substring `icontains` bug where Week 1 showed matches for weeks 10-19 | M1, M2 | ORIGINAL_REQUEST §R2 |
| 3 | R3: Real-Time Zero-Refresh Match Events | Instant event broadcast (`GOAL`, `ASSIST`, `CARD`, `SUB`, `VAR`, `CLOCK_SYNC`) via WebSocket + Polling fallback, animated event cards and audio chimes in Coach Panel without page refresh | M1, M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4: Unified Tactics Submission & In-Game Changes Tab | Single unified coach submission button («ارسال ترکیب و تاکتیک به داوری») + Dedicated "In-Game Changes" tab in Referee Desk with Home/Away split, checklist approval, and instant feedback to coach | M1, M2, M3 | ORIGINAL_REQUEST §R4 |
| 5 | R5: Modular 4-Tab Referee Desk & Match Stats | 4-Tab desk (1. Live Desk & Events, 2. In-Game Changes, 3. Match Team Stats, 4. Player Ratings & Minutes) + Post-match comparative cards and rating tables in both admin and coach panels | M1, M2, M3 | ORIGINAL_REQUEST §R5 |
| 6 | R6: 3-Phase Live Match Smart Timer | 3-Phase lifecycle in Coach Panel (Phase 1: Pre-match standby countdown -> Phase 2: Live match broadcast/events -> Phase 3: 10-min post-match recap countdown with comparison cards -> auto-transition to next week standby) | M1, M3 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Engine Upgrades (R1-R6) | `notifications` model & dismissal API, `matches` round normalization (fix week 1 bug), safe channel broadcasting, team stats `'saves'` fix, live context retention | none | IN_PROGRESS |
| M2 | Frontend Referee Desk Redesign (R1, R2, R4, R5) | Admin role routing, 1-30 week tabs exact filtering, modular 4-tab match desk, in-game changes approval checklist, post-match team stats & player rating forms | M1 | PLANNED |
| M3 | Frontend Coach Panel & Live Desk (R1, R3, R4, R5, R6) | LocalStorage+DB persistent alert dismissal, unified «ارسال ترکیب و تاکتیک به داوری» button, real-time animated ticker with audio cues, 3-phase smart countdown timer | M1 | PLANNED |
| M4 | E2E Automated Test Suite & Coverage | Harness fixes, automated tests for R1-R6 in `e2e_tests/` (Tiers 1-4), 100% pass rate verification | M1, M2, M3 | PLANNED |
| M5 | Review, Adversarial Stress & Forensic Audit | 2 Reviewers + 2 Challengers + Forensic Auditor binary veto verification + Final Gate Approval | M4 | PLANNED |

## Interface Contracts

### 1. Notifications API (`notifications` ↔ Frontend)
- `GET /api/notifications/inbox/`: Returns notifications filtered by user role (`target_role`) and team. Includes `match_id`, `action_url`, `is_dismissed`.
- `POST /api/notifications/<id>/dismiss/`: Body `{}` -> Marks notification dismissed in DB (`is_dismissed=True`, `dismissed_at=now`).
- `POST /api/notifications/<id>/read/`: Body `{}` -> Marks notification read (`is_read=True`).

### 2. Match Control & Round Filtering API (`matches` ↔ Frontend)
- `GET /api/matches/admin-list/?round=<round_number>`: Exact numerical match filter for gameweek (e.g. `round=1` returns only Week 1 matches).
- `GET /api/matches/gameweeks-status/`: Returns list of 30 gameweeks with match counts, statuses, and `active_gameweek`.
- `GET /api/matches/live-context/`: Returns `{ has_active_match, active_match, next_match, time_to_kickoff_seconds, recent_finished_match }`.
- `POST /api/matches/<id>/control/`: Body `{ action: string, ...payload }` (Actions: `START_MATCH`, `TRIGGER_HALF_TIME`, `START_SECOND_HALF`, `CONCLUDE_FULL_TIME`, `RECORD_EVENT`, `DELETE_EVENT`, `APPROVE_SUB_REQUEST`, `REJECT_SUB_REQUEST`, `SUBMIT_TEAM_STATS`, `SUBMIT_PLAYER_RATINGS`, `SYNC_CLOCK`).
- `POST /api/matches/<id>/team-stats/`: Body `{ home_stats: {...}, away_stats: {...} }` with possession, shots, shots_on_target, fouls, corners, offsides, saves.
- `POST /api/matches/<id>/player-ratings/`: Body `{ ratings: [ { player_id, rating, minutes_played, was_starter } ] }`.

### 3. Coach GamePlan & In-Game Changes API (`teams` ↔ `matches` ↔ Frontend)
- `POST /api/teams/<id>/submit_gameplan/`: Body `{ tactics: {...14 fields}, players: [{ player_id, x_coord, y_coord, is_starting, position }] }` -> Atomically saves and broadcasts `coach_tactics_submitted`.
- `POST /api/matches/substitute/`: Body `{ match_id, player_out_id, player_in_id, minute }` -> Submits live sub request -> Admin approves/rejects -> Broadcasts `sub_request_approved` / `sub_request_rejected`.

### 4. Real-Time WebSocket Interface (`realtime` ↔ Frontend)
- Connection URL: `ws://127.0.0.1:9000/ws/match/<match_id>/?token=<jwt_token>`
- Event Message Payload Format:
  ```json
  {
    "type": "match_event",
    "event": {
      "type": "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "STATUS_CHANGE" | "COACH_TACTICS_SUBMITTED" | "SUB_REQUEST_APPROVED",
      "minute": 23,
      "player_id": 10,
      "player_name": "Mehdi Taremi",
      "team_id": 1,
      "team_name": "Persepolis",
      "home_score": 1,
      "away_score": 0,
      "description": "گل اول برای پرسپولیس توسط مهدی طارمی",
      "match": { ... }
    }
  }
  ```

## Code Layout
- Backend:
  - `backend/matches/`: `models.py`, `views.py`, `serializers.py`, `urls.py`, `tests.py`, `fixture_engine.py`
  - `backend/notifications/`: `models.py`, `views.py`, `serializers.py`, `urls.py`, `signals.py`
  - `backend/realtime/`: `consumers.py`, `events.py`, `routing.py`, `middleware.py`
  - `backend/teams/`: `models.py`, `views.py`, `serializers.py`
  - `backend/users/`: `models.py`, `views.py`, `serializers.py`
- Frontend:
  - `frontend/src/pages/MainDashboard.jsx`: Root dashboard layout, notification alerts, role navigation routing.
  - `frontend/src/components/admin/AdminDashboard.jsx`: Referee Control Room (Weeks 1-30 tabs, 4-Modular Match Desk, In-Game Changes review, Team Stats & Player Ratings forms, Post-match comparison).
  - `frontend/src/components/live/LiveStreamTab.jsx`: Coach Live Match Desk (3-Phase smart timer: Standby -> Live -> 10-min Post-Match recap, real-time animated event ticker, post-match comparison cards).
  - `frontend/src/components/team/TeamTab.jsx` & `EFootballGamePlan.jsx`: Unified «ارسال ترکیب و تاکتیک به داوری» CTA button.
  - `frontend/src/components/common/NotificationCenter.jsx`: In-app notification center with role-aware action routing and persistent read/dismissal.
  - `frontend/src/services/api.js`: REST API client functions for all referee and coach operations.
- E2E Tests:
  - `e2e_tests/harness/vml_test_harness.py`: Centralized test harness.
  - `e2e_tests/run_tests.py`: Test runner across Tiers 1-4.
  - `e2e_tests/tier1_feature_coverage/`: Feature-specific tests (matches, notifications, teams).
  - `e2e_tests/tier2_boundary_corner/`: Boundary & corner cases (round filtering isolation, sub limits).
  - `e2e_tests/tier3_cross_feature/`: Interaction tests (tactics submission -> admin approval -> event broadcast).
  - `e2e_tests/tier4_scenarios/`: Real-world match lifecycle scenario tests.
