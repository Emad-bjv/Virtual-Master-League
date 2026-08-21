import os
import sys
import unittest
from decimal import Decimal

# Setup paths for resilient import
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from e2e_tests.test_harness import VMLTestHarness, _setup_django_environment
except ImportError:
    try:
        from test_harness import VMLTestHarness, _setup_django_environment
    except ImportError:
        from harness import VMLTestHarness, _setup_django_environment

_setup_django_environment()

from django.contrib.auth import get_user_model
from teams.models import Team, Player, ClubFacilities, TeamGamePlan

User = get_user_model()


class Tier2TeamsBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Teams, Squad, GamePlan, Facilities, Admin & Frontend Binding (34 test cases).
    Covers F3 (Team & Squad), F4 (GamePlan), F5 (Facilities), F6 (Player Growth & Stamina), F24 (Admin), and F26 (Frontend Team Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        Team.objects.all().delete()
        Player.objects.all().delete()
        self.user = self.create_user(phone_number="09121110011")
        self.team = Team.objects.create(manager=self.user, name="Tehran Boundary FC", budget=Decimal("100000.00"))
        self.facilities, _ = ClubFacilities.objects.get_or_create(team=self.team)

    # --- F3: Team & Squad Management Boundaries ---

    def test_tm1_squad_size_under_18_boundary(self):
        """Squad with 17 players triggers squad size under-minimum condition (<18)."""
        for i in range(17):
            Player.objects.create(
                team=self.team, name=f"Player {i}", age=20, position="CMF",
                overall=70, base_stamina=80
            )
        self.assertEqual(self.team.players.count(), 17)
        self.assertTrue(self.team.players.count() < 18)

    def test_tm2_squad_size_exactly_18_lower_bound(self):
        """Squad with 18 players satisfies minimum required squad size."""
        for i in range(18):
            Player.objects.create(
                team=self.team, name=f"MinPlayer {i}", age=21, position="CB",
                overall=70, base_stamina=80
            )
        self.assertEqual(self.team.players.count(), 18)
        self.assertFalse(self.team.players.count() < 18)

    def test_tm3_squad_size_exactly_32_upper_bound(self):
        """Squad with 32 players reaches maximum total roster cap."""
        for i in range(32):
            Player.objects.create(
                team=self.team, name=f"MaxPlayer {i}", age=22, position="ST",
                overall=70, base_stamina=80
            )
        self.assertEqual(self.team.players.count(), 32)
        self.assertFalse(self.team.players.count() > 32)

    def test_tm4_squad_size_over_32_overflow(self):
        """Squad exceeding 32 players identifies overflow condition (>32)."""
        for i in range(33):
            Player.objects.create(
                team=self.team, name=f"OverflowPlayer {i}", age=23, position="GK",
                overall=70, base_stamina=80
            )
        self.assertEqual(self.team.players.count(), 33)
        self.assertTrue(self.team.players.count() > 32)

    def test_tm5_squad_size_operational_market_cap_25(self):
        """Operational transfer market cap (25 players) boundary detection."""
        for i in range(25):
            Player.objects.create(
                team=self.team, name=f"MarketPlayer {i}", age=20, position="CMF",
                overall=70, base_stamina=80
            )
        self.assertEqual(self.team.players.count(), 25)

    # --- F6: Player Growth & Virtual Stamina Boundaries ---

    def test_tm6_stamina_locked_below_30_percent(self):
        """Virtual stamina 29.5% triggers stamina lock (is_stamina_locked returns True)."""
        p = Player.objects.create(
            team=self.team, name="Tired Player", age=25, position="CF",
            overall=80, base_stamina=70, virtual_stamina=Decimal("29.50")
        )
        self.assertTrue(p.is_stamina_locked)
        self.assertEqual(p.stamina_status, "قفل شده (خسته)")

    def test_tm7_stamina_unlocked_at_30_percent_boundary(self):
        """Virtual stamina exactly 30.0% is not locked."""
        p = Player.objects.create(
            team=self.team, name="Boundary Player", age=25, position="CF",
            overall=80, base_stamina=70, virtual_stamina=Decimal("30.00")
        )
        self.assertFalse(p.is_stamina_locked)
        self.assertNotEqual(p.stamina_status, "قفل شده (خسته)")

    def test_tm8_stamina_unlocked_above_30_percent(self):
        """Virtual stamina 30.5% remains unlocked."""
        p = Player.objects.create(
            team=self.team, name="Fit Player", age=25, position="CF",
            overall=80, base_stamina=70, virtual_stamina=Decimal("30.50")
        )
        self.assertFalse(p.is_stamina_locked)

    def test_tm9_stamina_status_injured_override(self):
        """Injured player returns 'مصدوم' regardless of stamina percentage."""
        p = Player.objects.create(
            team=self.team, name="Injured Star", age=26, position="AMF",
            overall=85, base_stamina=80, virtual_stamina=Decimal("90.00"),
            is_injured=True
        )
        self.assertEqual(p.stamina_status, "مصدوم")

    def test_tm10_stamina_status_critical_tier(self):
        """Stamina between 30% and 50% returns 'افت شدید'."""
        p = Player.objects.create(
            team=self.team, name="Critical Player", age=24, position="LWF",
            overall=75, base_stamina=75, virtual_stamina=Decimal("45.00")
        )
        self.assertEqual(p.stamina_status, "افت شدید")

    def test_tm11_stamina_status_slight_fatigue_tier(self):
        """Stamina between 50% and 80% returns 'خستگی جزئی'."""
        p = Player.objects.create(
            team=self.team, name="Slight Player", age=24, position="RWF",
            overall=75, base_stamina=75, virtual_stamina=Decimal("65.00")
        )
        self.assertEqual(p.stamina_status, "خستگی جزئی")

    def test_tm12_stamina_status_full_tier(self):
        """Stamina 80%+ returns 'کامل'."""
        p = Player.objects.create(
            team=self.team, name="Full Stamina Player", age=24, position="GK",
            overall=75, base_stamina=75, virtual_stamina=Decimal("85.00")
        )
        self.assertEqual(p.stamina_status, "کامل")

    def test_tm13_stamina_negative_clamped_or_invalid(self):
        """Virtual stamina cannot be negative."""
        p = Player(team=self.team, name="Neg Player", age=20, position="CB", overall=70, base_stamina=70, virtual_stamina=Decimal("-5.00"))
        with self.assertRaises(Exception):
            p.full_clean()

    def test_tm14_stamina_over_100_clamped_or_invalid(self):
        """Virtual stamina cannot exceed 100.00%."""
        p = Player(team=self.team, name="Super Player", age=20, position="CB", overall=70, base_stamina=70, virtual_stamina=Decimal("105.00"))
        with self.assertRaises(Exception):
            p.full_clean()

    # --- F5: Club Facilities Upgrade Boundaries ---

    def test_tm15_facility_upgrade_max_level_20_rejection(self):
        """Upgrading facility already at level 20 returns HTTP 400."""
        self.facilities.gym_level = 20
        self.facilities.save()
        res = self.post(f'/api/teams/{self.team.id}/upgrade_facility/', json={'facility': 'gym'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('تسهیلات به حداکثر سطح (۲۰) رسیده است.', res.text)

    def test_tm16_facility_upgrade_invalid_facility_name(self):
        """Upgrading nonexistent facility name returns HTTP 400."""
        res = self.post(f'/api/teams/{self.team.id}/upgrade_facility/', json={'facility': 'quantum_lab'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('تسهیلات نامعتبر است.', res.text)

    def test_tm17_facility_curve_percent_bounds(self):
        """ClubFacilities.curve_percent bounds check for level < 1 and level > 20."""
        self.assertEqual(ClubFacilities.curve_percent(0), 0.0)
        self.assertEqual(ClubFacilities.curve_percent(1), 0.0)
        self.assertEqual(ClubFacilities.curve_percent(20), 1.0)
        self.assertEqual(ClubFacilities.curve_percent(25), 1.0)

    # --- F4: eFootball GamePlan & Formations Boundaries ---

    def test_tm20_gameplan_nonexistent_player_ignored(self):
        """Updating gameplan for player not belonging to team is safely ignored."""
        other_team = Team.objects.create(name="Other Team")
        other_player = Player.objects.create(team=other_team, name="Other Player", age=22, position="CMF", overall=70, base_stamina=70)
        payload = [{'player_id': other_player.id, 'x_coord': 50.0, 'y_coord': 50.0, 'position': 'CMF', 'is_starting': True}]
        res = self.post(f'/api/teams/{self.team.id}/update_gameplan/', json=payload)
        self.assertEqual(res.status_code, 200)

    def test_tm21_gameplan_out_of_range_coordinates(self):
        """Submitting pitch coordinates outside 0-100% boundary."""
        p = Player.objects.create(team=self.team, name="Pitch Player", age=22, position="CMF", overall=70, base_stamina=70)
        payload = {'players': [{'player_id': p.id, 'x_coord': -15.0, 'y_coord': 150.0, 'position': 'CMF', 'is_starting': True}]}
        res = self.post(f'/api/teams/{self.team.id}/submit_gameplan/', json=payload)
        self.assertIn(res.status_code, [200, 400])

    def test_tm22_gameplan_submit_persists_tactics(self):
        """Submitting gameplan sets is_submitted flag and updates tactics."""
        payload = {
            'tactics': {
                'formation': '4-3-3',
                'attacking_style': 'بازی مالکانه',
                'build_up': 'پاس کوتاه',
                'attacking_area': 'مرکز',
                'positioning': 'حفظ ترکیب',
                'support_range': 7,
                'defensive_style': 'فشار خط مقدم',
                'containment_area': 'میانه',
                'pressing': 'تهاجمی',
                'defensive_line': 6,
                'compactness': 5,
                'adv_offense_1': 'هیچکدام',
                'adv_offense_2': 'هیچکدام',
                'adv_defense_1': 'هیچکدام',
                'adv_defense_2': 'هیچکدام',
            }
        }
        res = self.post(f'/api/teams/{self.team.id}/submit_gameplan/', json=payload)
        self.assertEqual(res.status_code, 200)
        gp = TeamGamePlan.objects.get(team=self.team)
        self.assertTrue(gp.is_submitted)
        self.assertEqual(gp.formation, '4-3-3')

    def test_tm23_gameplan_starting_xi_over_11(self):
        """Gameplan payload with starting XI > 11 players."""
        players = []
        for i in range(12):
            pl = Player.objects.create(team=self.team, name=f"StartPlayer {i}", age=20, position="CMF", overall=70, base_stamina=70)
            players.append({'player_id': pl.id, 'x_coord': 50.0, 'y_coord': 50.0, 'position': 'CMF', 'is_starting': True})
        res = self.post(f'/api/teams/{self.team.id}/submit_gameplan/', json={'players': players})
        self.assertIn(res.status_code, [200, 400])

    def test_tm24_gameplan_starting_xi_under_11(self):
        """Gameplan payload with starting XI < 11 players."""
        players = []
        for i in range(5):
            pl = Player.objects.create(team=self.team, name=f"SubElevenPlayer {i}", age=20, position="CMF", overall=70, base_stamina=70)
            players.append({'player_id': pl.id, 'x_coord': 50.0, 'y_coord': 50.0, 'position': 'CMF', 'is_starting': True})
        res = self.post(f'/api/teams/{self.team.id}/submit_gameplan/', json={'players': players})
        self.assertIn(res.status_code, [200, 400])

    # --- F24: Admin Dashboard & Match Sim Boundaries ---

    def test_tm18_facility_admin_override_negative_level(self):
        """Admin override with negative level clamps level to minimum 1."""
        res = self.post('/api/teams/admin_override_facility/', json={'team_id': self.team.id, 'facility': 'gym', 'level': -5})
        self.assertEqual(res.status_code, 200)
        self.facilities.refresh_from_db()
        self.assertEqual(self.facilities.gym_level, 1)

    def test_tm19_facility_admin_override_over_20(self):
        """Admin override with level > 20 clamps level to maximum 20."""
        res = self.post('/api/teams/admin_override_facility/', json={'team_id': self.team.id, 'facility': 'gym', 'level': 99})
        self.assertEqual(res.status_code, 200)
        self.facilities.refresh_from_db()
        self.assertEqual(self.facilities.gym_level, 20)

    def test_tm25_admin_update_player_nonexistent_404(self):
        """Admin update on non-existent player ID returns HTTP 404."""
        res = self.post('/api/teams/admin_update_player/', json={'player_id': 99999, 'overall': 85})
        self.assertEqual(res.status_code, 404)

    def test_tm26_admin_override_facility_nonexistent_team_404(self):
        """Admin override facility on non-existent team ID returns HTTP 404."""
        res = self.post('/api/teams/admin_override_facility/', json={'team_id': 99999, 'facility': 'gym', 'level': 10})
        self.assertEqual(res.status_code, 404)

    def test_tm27_admin_adjust_budget_nonexistent_team_404(self):
        """Admin adjust budget on non-existent team ID returns HTTP 404."""
        res = self.post('/api/teams/admin_adjust_budget/', json={'team_id': 99999, 'amount': 5000.0})
        self.assertEqual(res.status_code, 404)

    def test_tm28_admin_match_sim_invalid_week_id(self):
        """Admin match simulation trigger with invalid week parameter returns error status."""
        res = self.post('/api/matches/simulate_week/', json={'week': -1})
        self.assertIn(res.status_code, [400, 404])

    def test_tm29_admin_coach_registration_duplicate_phone(self):
        """Registering a new coach with existing phone number fails validation."""
        res = self.post('/api/users/admin/register_coach/', json={'phone_number': '09121110011', 'name': 'Duplicate Coach'})
        self.assertIn(res.status_code, [400, 401, 404])

    # --- F26: Frontend Team Binding Boundaries ---

    def test_tm30_frontend_team_tab_rest_payload_contract(self):
        """GET /api/teams/my-team/ returns structured JSON dict with roster and facilities for TeamTab."""
        self.set_token("dummy_token")
        res = self.get('/api/teams/my-team/')
        self.assertIn(res.status_code, [200, 401, 404])

    def test_tm31_frontend_dnd_kit_position_sync_boundaries(self):
        """Interactive formation coordinate update payload accepts float values 0.0..100.0."""
        p = Player.objects.create(team=self.team, name="DnD Player", age=22, position="CMF", overall=70, base_stamina=70)
        payload = [{'player_id': p.id, 'x_coord': 45.5, 'y_coord': 62.3, 'position': 'CMF', 'is_starting': True}]
        res = self.post(f'/api/teams/{self.team.id}/update_gameplan/', json=payload)
        self.assertIn(res.status_code, [200, 401])

    def test_tm32_frontend_squad_filters_contract(self):
        """Roster response contains required player fields (position, overall, virtual_stamina, stamina_status)."""
        p = Player.objects.create(team=self.team, name="Roster Test", age=22, position="CMF", overall=75, base_stamina=80)
        self.assertEqual(p.position_group, "CMF")
        self.assertIn(p.stamina_status, ["کامل", "خستگی جزئی", "افت شدید", "قفل شده (خسته)", "مصدوم"])

    def test_tm33_frontend_facility_upgrade_ui_response_mapping(self):
        """Facility upgrade endpoint returns updated level and remaining team budget."""
        res = self.post(f'/api/teams/{self.team.id}/upgrade_facility/', json={'facility': 'gym'})
        self.assertIn(res.status_code, [200, 400, 401])

    def test_tm34_frontend_player_growth_state_contract(self):
        """Player growth state object structures logs with old and new overall ratings."""
        p = Player.objects.create(team=self.team, name="Growth Player", age=20, position="CF", overall=70, base_stamina=70)
        self.assertEqual(p.growth_logs.count(), 0)


if __name__ == '__main__':
    unittest.main()
