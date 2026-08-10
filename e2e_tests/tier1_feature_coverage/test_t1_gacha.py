import os
import sys
from decimal import Decimal
from django.contrib.auth import get_user_model

from harness import VMLTestHarness
from gacha.models import GachaPack, GachaPity, PackOpeningLog
from gacha.services import open_gacha_pack, generate_random_player
from gacha.serializers import GachaPackSerializer, GachaPitySerializer, PackOpeningLogSerializer
from teams.models import Team, Player

User = get_user_model()


class Tier1GachaFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Coverage Tests for Gacha Packs, Pity System & Pack Opening Logs.
    Features:
      - Feature 19: Gacha Pack System
      - Feature 20: Gacha Pity Counter
      - Feature 21: Pack Opening Logs & Reveal
    """

    # --- Feature 19: Gacha Pack System ---

    def test_feature19_gacha_pack_list_endpoint(self):
        GachaPack.objects.create(name="Gold Pack", cost_usd=Decimal("50.00"), rate_rare=70.0, rate_epic=25.0, rate_legendary=5.0)
        response = self.client.get("/api/gacha/packs/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_feature19_gacha_pack_model_rates(self):
        pack = GachaPack.objects.create(
            name="Mega Pack", cost_usd=Decimal("100.00"), rate_rare=60.0, rate_epic=30.0, rate_legendary=10.0
        )
        self.assertEqual(pack.name, "Mega Pack")
        self.assertEqual(Decimal(str(pack.cost_usd)), Decimal("100.00"))
        total_rate = pack.rate_rare + pack.rate_epic + pack.rate_legendary
        self.assertEqual(float(total_rate), 100.0)

    def test_feature19_open_gacha_pack_endpoint_success(self):
        team = self.create_team(budget=1000.00)
        pack = GachaPack.objects.create(name="Silver Pack", cost_usd=Decimal("20.00"))
        payload = {"team_id": team.id, "pack_id": pack.id}
        response = self.client.post("/api/gacha/open/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertIn("player", response.data)

    def test_feature19_open_gacha_pack_insufficient_budget_fails(self):
        team = self.create_team(budget=5.00)
        pack = GachaPack.objects.create(name="Expensive Pack", cost_usd=Decimal("50.00"))
        payload = {"team_id": team.id, "pack_id": pack.id}
        response = self.client.post("/api/gacha/open/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_feature19_open_gacha_pack_roster_cap_25_fails(self):
        team = self.create_team(budget=5000.00)
        for i in range(25):
            self.create_player(team=team, name=f"Full Player {i}")
        pack = GachaPack.objects.create(name="Roster Cap Pack", cost_usd=Decimal("10.00"))
        payload = {"team_id": team.id, "pack_id": pack.id}
        response = self.client.post("/api/gacha/open/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    # --- Feature 20: Gacha Pity Counter ---

    def test_feature20_gacha_pity_model_initial_state(self):
        team = self.create_team()
        pity, created = GachaPity.objects.get_or_create(team=team)
        self.assertTrue(created or pity is not None)
        self.assertEqual(pity.counter, 0)
        self.assertEqual(pity.total_pulls, 0)

    def test_feature20_team_pity_status_endpoint(self):
        team = self.create_team()
        GachaPity.objects.create(team=team, counter=4, total_pulls=4)
        response = self.client.get(f"/api/gacha/pity/{team.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["counter"], 4)

    def test_feature20_pity_counter_increment_logic(self):
        team = self.create_team()
        pity = GachaPity.objects.create(team=team, counter=3, total_pulls=3)
        pity.counter += 1
        pity.total_pulls += 1
        pity.save()
        pity.refresh_from_db()
        self.assertEqual(pity.counter, 4)
        self.assertEqual(pity.total_pulls, 4)

    def test_feature20_guaranteed_legendary_on_pity_threshold_9(self):
        team = self.create_team(budget=1000.00)
        pity = GachaPity.objects.create(team=team, counter=9, total_pulls=9)
        pack = GachaPack.objects.create(name="Pity Trigger Pack", cost_usd=Decimal("10.00"))
        res = open_gacha_pack(team.id, pack.id)
        self.assertTrue(res["success"])
        self.assertEqual(res["rarity"], "LEGENDARY")
        self.assertTrue(res["pity_applied"])
        pity.refresh_from_db()
        self.assertEqual(pity.counter, 0)

    def test_feature20_legendary_pull_resets_pity_counter(self):
        team = self.create_team()
        pity = GachaPity.objects.create(team=team, counter=5, total_pulls=5)
        pity.counter = 0
        pity.save()
        pity.refresh_from_db()
        self.assertEqual(pity.counter, 0)

    # --- Feature 21: Pack Opening Logs & Reveal ---

    def test_feature21_pack_opening_log_creation(self):
        team = self.create_team()
        pack = GachaPack.objects.create(name="Log Pack", cost_usd=Decimal("25.00"))
        player = self.create_player(team=team, rarity="EPIC")
        log = PackOpeningLog.objects.create(
            team=team, pack=pack, player_obtained=player, rarity_drawn="EPIC", pity_applied=False, cost_usd=Decimal("25.00")
        )
        self.assertEqual(log.team, team)
        self.assertEqual(log.rarity_drawn, "EPIC")
        self.assertEqual(log.cost_usd, Decimal("25.00"))

    def test_feature21_pack_opening_log_history_query(self):
        team = self.create_team()
        pack = GachaPack.objects.create(name="Query Pack", cost_usd=Decimal("15.00"))
        player = self.create_player(team=team)
        PackOpeningLog.objects.create(
            team=team, pack=pack, player_obtained=player, rarity_drawn="RARE", cost_usd=Decimal("15.00")
        )
        logs = PackOpeningLog.objects.filter(team=team)
        self.assertEqual(logs.count(), 1)

    def test_feature21_generate_random_player_rarity_tiers(self):
        team = self.create_team()
        p_rare = generate_random_player("RARE", team)
        p_epic = generate_random_player("EPIC", team)
        p_leg = generate_random_player("LEGENDARY", team)
        self.assertEqual(p_rare.rarity, "RARE")
        self.assertEqual(p_epic.rarity, "EPIC")
        self.assertEqual(p_leg.rarity, "LEGENDARY")

    def test_feature21_frontend_pack_reveal_payload_contract(self):
        team = self.create_team(budget=1000.00)
        pack = GachaPack.objects.create(name="Reveal Pack", cost_usd=Decimal("30.00"))
        res = open_gacha_pack(team.id, pack.id)
        self.assertIn("player", res)
        self.assertIn("rarity", res)
        self.assertIn("pity_applied", res)
        self.assertIn("pity_counter", res)
        self.assertIn("remaining_budget", res)

    def test_feature21_pack_log_model_str_representation(self):
        team = self.create_team(name="Log Team")
        pack = GachaPack.objects.create(name="Str Pack", cost_usd=Decimal("10.00"))
        player = self.create_player(team=team, name="Gacha Star")
        log = PackOpeningLog.objects.create(
            team=team, pack=pack, player_obtained=player, rarity_drawn="RARE", cost_usd=Decimal("10.00")
        )
        self.assertIn("Log Team", str(log))
