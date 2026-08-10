# TEST_INFRA — Virtual Master League (VML) Test Infrastructure & Architecture

## 1. Test Philosophy & Design Principles

The Virtual Master League (VML) End-to-End (E2E) Test Infrastructure is engineered to guarantee 100% functional accuracy, business logic enforcement, and backend REST API integrity across all 30 system features detailed in `PROJECT.md`.

### Core Design Principles:
1. **Opaque-Box & Requirement-Driven**: Tests interact exclusively through API contracts, HTTP endpoints, and backend service methods, mirroring exact frontend client behavior.
2. **Zero Facades / Genuine Logic**: Strict adherence to the Integrity Mandate. No mocked return values or hardcoded responses in business logic or test runners. Every test exercises real Django database state transitions, transactional updates, and REST serializers.
3. **Dual Execution Architecture**:
   - **In-Memory Django REST APIClient Engine**: High-speed, atomic test runner utilizing Django's REST Framework test client for local execution without requiring a live web server process.
   - **Live HTTP Server Mode**: Configurable target (`http://127.0.0.1:9000/api`) allowing live network testing against running Django ASGI/WSGI servers.
4. **Multi-Tiered Coverage Pyramid**: Standardized 4-tier hierarchy covering basic feature execution, boundary/corner edge cases, cross-feature interaction pipelines, and realistic multi-step user scenarios.

---

## 2. Test Architecture & Harness Structure

The test suite is built on a shared base test harness (`VMLTestHarness`) defined in `e2e_tests/harness/vml_test_harness.py`.

```
e2e_tests/
├── harness/
│   ├── __init__.py
│   └── vml_test_harness.py        # Centralized VMLTestHarness base class
├── tier1_feature_coverage/        # Tier 1: Single Feature API Contract Coverage
│   ├── test_t1_users.py
│   ├── test_t1_teams.py
│   ├── test_t1_matches.py
│   ├── test_t1_transfers.py
│   ├── test_t1_economy.py
│   ├── test_t1_gacha.py
│   └── test_t1_notifications.py
├── tier2_boundary_corner/         # Tier 2: Boundary, Edge & Failure Mode Testing
│   ├── test_t2_users_boundaries.py
│   ├── test_t2_teams_boundaries.py
│   ├── test_t2_matches_boundaries.py
│   ├── test_t2_transfers_boundaries.py
│   ├── test_t2_economy_boundaries.py
│   ├── test_t2_gacha_boundaries.py
│   └── test_t2_notifications_boundaries.py
├── tier3_cross_feature/           # Tier 3: Pairwise & Multi-Feature Interactions
│   └── test_t3_pairwise_interactions.py
├── tier4_scenarios/               # Tier 4: Real-World E2E Journeys & Scenarios
│   └── test_t4_real_world_scenarios.py
├── conftest.py                    # Pytest configuration & environment hooks
└── run_tests.py                   # Main Test Suite Runner & Structured Report Generator
```

### Key Components of `VMLTestHarness`:
- **Authentication & Headers**: Automatic JWT Bearer Token authorization header injection for client requests (`set_token`, `clear_token`).
- **HTTP Helper Wrapper**: `get()`, `post()`, `patch()`, `put()`, `delete()` with status code assertions (`assert_status_code`).
- **Data Model Helpers**: `create_user()`, `create_team()`, `create_player()`, `create_match()`, simplifying fixture setup.
- **Database Cleanup & Isolation**: Each test runs inside an atomic transaction (`TestCase` isolation) to ensure zero cross-test side-effects.

---

## 3. Feature Inventory & Tier Mapping (Features 1–30)

All 30 system features defined in `PROJECT.md` are systematically covered across Tiers 1 through 4:

| Feature # | Feature Name | Tier 1 (Contract) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Real-World Scenarios) |
|---|---|---|---|---|---|
| **F01** | User Auth & OTP | `test_t1_users.py` | `test_t2_users_boundaries.py` | Test 01, 02 | Scenario 01, 10 |
| **F02** | User Profile & Leaderboard | `test_t1_users.py` | `test_t2_users_boundaries.py` | Test 01, 05 | Scenario 01, 15 |
| **F03** | Team & Squad Management | `test_t1_teams.py` | `test_t2_teams_boundaries.py` | Test 02, 06, 21 | Scenario 01, 08, 12 |
| **F04** | eFootball GamePlan & Formations | `test_t1_teams.py` | `test_t2_teams_boundaries.py` | Test 07, 22 | Scenario 01, 02, 14 |
| **F05** | Club Facilities Upgrade | `test_t1_teams.py` | `test_t2_teams_boundaries.py` | Test 08, 23 | Scenario 06, 07 |
| **F06** | Player Growth & Virtual Stamina | `test_t1_teams.py` | `test_t2_teams_boundaries.py` | Test 09, 24 | Scenario 02, 07, 13 |
| **F07** | League Schedule & Match List | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 10, 25 | Scenario 02, 05, 14 |
| **F08** | Match Details & Event Ticker | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 11, 26 | Scenario 02, 05 |
| **F09** | Live Standings Table | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 12, 27 | Scenario 02, 05, 15 |
| **F10** | Live Substitution Requests | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 13, 28 | Scenario 05 |
| **F11** | Aparat Live Stream Binding | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 14 | Scenario 05 |
| **F12** | Transfer Market Listings | `test_t1_transfers.py` | `test_t2_transfers_boundaries.py` | Test 15, 29 | Scenario 03, 09, 11 |
| **F13** | Direct Buy & Bidding | `test_t1_transfers.py` | `test_t2_transfers_boundaries.py` | Test 16, 30 | Scenario 03, 09, 11 |
| **F14** | Caretaker Policy & Budget Rules | `test_t1_transfers.py` | `test_t2_transfers_boundaries.py` | Test 15, 29 | Scenario 03, 11 |
| **F15** | Auto-Release Overflow | `test_t1_transfers.py` | `test_t2_transfers_boundaries.py` | Test 06, 21 | Scenario 08, 12 |
| **F16** | Store Packages & Currency | `test_t1_economy.py` | `test_t2_economy_boundaries.py` | Test 04, 18 | Scenario 04, 06 |
| **F17** | ZarinPal Payment Gateway | `test_t1_economy.py` | `test_t2_economy_boundaries.py` | Test 04, 19 | Scenario 04, 10 |
| **F18** | Season Pass & Daily Claim | `test_t1_economy.py` | `test_t2_economy_boundaries.py` | Test 20 | Scenario 06 |
| **F19** | Gacha Pack System | `test_t1_gacha.py` | `test_t2_gacha_boundaries.py` | Test 03, 17 | Scenario 01, 04, 12 |
| **F20** | Gacha Pity Counter | `test_t1_gacha.py` | `test_t2_gacha_boundaries.py` | Test 03, 17 | Scenario 04 |
| **F21** | Pack Opening Logs & Reveal | `test_t1_gacha.py` | `test_t2_gacha_boundaries.py` | Test 03, 17 | Scenario 04 |
| **F22** | In-App Notification Center | `test_t1_notifications.py` | `test_t2_notifications_boundaries.py` | Test 01, 05 | Scenario 01, 02, 04 |
| **F23** | Telegram Bot Integration | `test_t1_notifications.py` | `test_t2_notifications_boundaries.py` | Test 10, 15 | Scenario 03, 04, 05 |
| **F24** | Admin Dashboard & Match Sim | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 10, 26 | Scenario 02, 07, 13 |
| **F25** | Frontend Auth Binding | `test_t1_users.py` | `test_t2_users_boundaries.py` | Test 01 | Scenario 01, 10 |
| **F26** | Frontend Team Binding | `test_t1_teams.py` | `test_t2_teams_boundaries.py` | Test 02, 22 | Scenario 01, 06 |
| **F27** | Frontend Match Binding | `test_t1_matches.py` | `test_t2_matches_boundaries.py` | Test 10, 27 | Scenario 02, 05 |
| **F28** | Frontend Transfer Binding | `test_t1_transfers.py` | `test_t2_transfers_boundaries.py` | Test 15, 30 | Scenario 03, 09, 11 |
| **F29** | Frontend Store/Gacha Binding | `test_t1_economy.py`, `test_t1_gacha.py` | `test_t2_economy_boundaries.py` | Test 04, 17 | Scenario 04 |
| **F30** | Frontend Notification Binding | `test_t1_notifications.py` | `test_t2_notifications_boundaries.py` | Test 01 | Scenario 01, 04 |

---

## 4. Tier 4 Real-World Scenario Catalog

Tier 4 tests (`e2e_tests/tier4_scenarios/test_t4_real_world_scenarios.py`) model 15 complete, end-to-end user journeys:

1. **Scenario 01: New Manager Onboarding & Squad Setup**: Full lifecycle from OTP registration, manager team allocation, $25M Silver package wallet topup, facility initializations, and initial Gacha pack opening.
2. **Scenario 02: Full Season Match Cycle & Growth Evaluation**: Simulates a 3-week league cycle with starting lineup fatigue consumption, performance rating logging, and player overall rating progression via `GrowthEngine`.
3. **Scenario 03: High-Stakes Transfer Bidding War**: Seller lists legendary player on auction; multiple rival teams place competing bids ($600 -> $750); auction finalization deducts buyer budget, transfers player, and credits seller with 5% tax deduction.
4. **Scenario 04: ZarinPal Payment Gateway & Gacha Spree**: Top-up flow simulation via ZarinPal sandbox callback, wallet balance credit verification, followed by a 10-pack Gacha opening spree verifying Pity Counter behavior.
5. **Scenario 05: Live Match Mid-Game Substitution & Event Ticker**: Active match simulation, queueing live substitution requests, validating player eligibility, applying stamina lock rules, and recording event ticker logs.
6. **Scenario 06: Club Facilities Upgrade Pipeline**: Sequential facility upgrades (Stadium, Gym, Medical, Academy), budget validation, level scaling curves (1-20), and wage cap recalculation.
7. **Scenario 07: Player Fatigue, Injury, & Medical Recovery Loop**: Match fatigue drops stamina below 30% triggering stamina lock and injury; medical facility upgrade accelerates recovery; admin injury heal action clears injury and unlocks stamina.
8. **Scenario 08: Squad Roster Overflow & Auto-Release Lifecycle**: Squad roster expands beyond 25 players to 27; auto-release system identifies lowest-rated players and releases them to free agency while logging TransferHistory.
9. **Scenario 09: Auction Expiration without Bids**: Listing player for auction with zero bids placed; auction expiration returns player to seller team and marks listing status as `EXPIRED`.
10. **Scenario 10: Authentication Token Refresh & Expiration Lifecycle**: OTP verification issues JWT access/refresh token pair; access token expiration recovery via refresh endpoint.
11. **Scenario 11: Transfer Market Self-Buy & Self-Bid Rejection**: Validates that sellers cannot buy their own fixed-price listings nor bid on their own auctions.
12. **Scenario 12: Squad Roster Cap Rejection across Direct Buy & Gacha**: Prevents direct market purchases or pack draws when team roster is already at max capacity (25 players).
13. **Scenario 13: Player Age Decay & Rust Penalty**: Simulates player aging and lack of game time (benched streak > 5 games) triggering overall rating decay.
14. **Scenario 14: GamePlan Tactical Adjustments & Validation**: Submitting interactive 11v11 pitch tactics with invalid positions or stamina-locked players triggers validation errors.
15. **Scenario 15: Global Leaderboard & Standings Synchronization**: Validates real-time rank updates in user leaderboard and league table after match results are finalized.

---

## 5. Coverage & Quality Thresholds

- **Pass Rate Threshold**: **100.0%** (All 418 tests must pass cleanly).
- **Execution Performance**: Entire 418-test suite completes in **< 20 seconds** under in-memory engine mode.
- **Regression Guard**: All core endpoints, models, serializers, services, and signals are continuously verified on every test run.
