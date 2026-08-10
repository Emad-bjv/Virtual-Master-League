from django.test import TestCase
from teams.models import Team, Player, ClubFacilities

EXPECTED_TEAMS = [
    'AC Milan', 'Arsenal', 'Atlético Madrid', 'BVB Borussia Dortmund',
    'Chelsea', 'FC Barcelona', 'FC Bayern München', 'Inter',
    'Juventus', 'Liverpool', 'Manchester City', 'Manchester United',
    'Newcastle United', 'Paris Saint-Germain', 'Real Madrid', 'Tottenham Hotspur'
]

VALID_POSITIONS = {choice[0] for choice in Player.POSITIONS}


class FC26ImportTestCase(TestCase):
    def test_imported_data_integrity(self):
        from django.core.management import call_command
        call_command('import_fc26_players')

        # Check Teams count and names
        teams = Team.objects.filter(name__in=EXPECTED_TEAMS)
        self.assertEqual(teams.count(), 16, "All 16 teams should exist in database.")

        for team in teams:
            self.assertTrue(team.logo.startswith("Team Logos/"), f"Team {team.name} should have logo path")
            self.assertTrue(hasattr(team, 'facilities'), f"Team {team.name} should have facilities")

        # Check Players count
        players = Player.objects.filter(team__name__in=EXPECTED_TEAMS)
        self.assertEqual(players.count(), 474, "Should have 474 players imported across 16 teams.")

        # Check player details
        for player in players:
            self.assertIn(player.position, VALID_POSITIONS, f"Player {player.name} position {player.position} is invalid")
            self.assertGreater(player.overall, 0)
            self.assertGreater(player.potential_ovr, 0)
            self.assertGreaterEqual(player.base_stamina, 50)
            self.assertGreaterEqual(player.wage, 0)
            self.assertIn(player.rarity, ['LEGENDARY', 'EPIC', 'RARE', 'REGULAR'])
