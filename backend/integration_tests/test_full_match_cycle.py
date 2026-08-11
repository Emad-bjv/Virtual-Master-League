import os
from decimal import Decimal
from django.test import TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse

from teams.models import Team, Player, ClubFacilities
from matches.models import Season, Tournament, Match, LeagueStanding, MatchTeamStat
from economy.models import Transaction

User = get_user_model()

@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
)
class FullMatchCycleIntegrationTest(TransactionTestCase):
    """
    Simulates the full cycle: Lineup -> Match End -> Admin Stats Registration -> 
    League Standing Update -> Budget Reward -> Player Growth Log.
    """
    
    def setUp(self):
        self.client = APIClient()
        
        # Admin user
        self.admin = User.objects.create_superuser(phone_number='09999999999', password='admin')
        
        # Season and Tournament
        self.season = Season.objects.create(name='Season 1', is_active=True)
        self.tournament = Tournament.objects.create(name='Pro League', tournament_type='LEAGUE', season=self.season)
        
        # Teams
        self.home_team = Team.objects.create(name='Home FC', logo='home.png', budget=Decimal('1000.0'))
        ClubFacilities.objects.create(team=self.home_team)
        self.away_team = Team.objects.create(name='Away FC', logo='away.png', budget=Decimal('1000.0'))
        ClubFacilities.objects.create(team=self.away_team)
        
        # Players
        self.home_player = Player.objects.create(
            team=self.home_team, name='Home Striker', age=22, position='CF', 
            overall=80, base_stamina=80
        )
        self.away_player = Player.objects.create(
            team=self.away_team, name='Away Defender', age=25, position='CB', 
            overall=75, base_stamina=75
        )
        
        # League Standings
        LeagueStanding.objects.create(tournament=self.tournament, team=self.home_team)
        LeagueStanding.objects.create(tournament=self.tournament, team=self.away_team)
        
        # Match
        self.match = Match.objects.create(
            home_team=self.home_team,
            away_team=self.away_team,
            tournament=self.tournament,
            status='SCHEDULED',
            half_status='1ST_HALF'
        )

    def test_full_match_cycle(self):
        self.client.force_authenticate(user=self.admin)
        
        # 1. Register stats before match FINISHED should fail (Error Path)
        url_team_stats = reverse('match-team-stats', args=[self.match.id])
        resp = self.client.post(url_team_stats, {
            'team_id': self.home_team.id,
            'possession_percent': 60,
            'shots': 10,
            'shots_on_target': 5,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('امکان ثبت آمار تنها پس از پایان بازی وجود دارد', str(resp.data))
        
        # 2. Admin finishes the match via API
        url_status = reverse('admin-match-update', args=[self.match.id])
        resp = self.client.put(url_status, {
            'status': 'FINISHED',
            'half_status': 'FINISHED',
            'home_score': 2,
            'away_score': 1
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'FINISHED')
        self.assertEqual(self.match.home_score, 2)
        
        # 3. Submit Team Stats
        resp = self.client.post(url_team_stats, {
            'team_id': self.home_team.id,
            'possession_percent': 60,
            'shots': 10,
            'shots_on_target': 5,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        self.assertTrue(self.match.standings_processed)
        
        # 5. Check League Standing updated
        home_standing = LeagueStanding.objects.get(team=self.home_team, tournament=self.tournament)
        away_standing = LeagueStanding.objects.get(team=self.away_team, tournament=self.tournament)
        
        self.assertEqual(home_standing.points, 3) # Win
        self.assertEqual(home_standing.played, 1)
        self.assertEqual(home_standing.goals_for, 2)
        
        self.assertEqual(away_standing.points, 0) # Loss
        self.assertEqual(away_standing.played, 1)
        
        # 6. Check Budget Reward
        self.home_team.refresh_from_db()
        self.away_team.refresh_from_db()
        
        # Home team got a win (8000) + base (5000) + 2 goals (1000) = 14000
        expected_home_budget = Decimal('1000.0') + Decimal('14000.0')
        self.assertEqual(self.home_team.budget, expected_home_budget)
        
        home_transaction = Transaction.objects.filter(team=self.home_team, transaction_type='MATCH_REWARD').first()
        self.assertIsNotNone(home_transaction)
        self.assertEqual(home_transaction.amount, Decimal('14000.0'))
