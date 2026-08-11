from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import (
    LiveSubstitutionRequest, Match, MatchEvent, Team,
    MatchTeamStat, PlayerMatchStat, LeagueStanding, Tournament
)
from .serializers import (
    LiveSubstitutionRequestSerializer, MatchSerializer,
    MatchEventSerializer, PlayerMatchStatSerializer,
    MatchTeamStatSerializer, MatchDetailSerializer,
    MatchSummarySerializer, LeagueStandingSerializer
)
from realtime.events import broadcast_match_event


# ─────────────────────────────────────────────────────────
# EXISTING VIEWS (unchanged)
# ─────────────────────────────────────────────────────────

class LiveSubstitutionCreateView(generics.CreateAPIView):
    """
    API endpoint for managers to request a live substitution during a match.
    """
    queryset = LiveSubstitutionRequest.objects.all()
    serializer_class = LiveSubstitutionRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {"message": "درخواست تعویض با موفقیت ثبت شد و در انتظار تایید ادمین است.", "data": serializer.data},
            status=status.HTTP_201_CREATED, headers=headers
        )


class UpcomingMatchesView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Match.objects.filter(status='SCHEDULED').order_by('date')[:5]


class MatchHistoryView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Match.objects.filter(status='FINISHED').order_by('-date')[:10]


class LeagueStandingsView(generics.GenericAPIView):
    """
    Returns full league standings from the database.
    Since we don't pass a tournament ID here, we just get the most recent tournament's standings.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # Fetch standings from the most recent active tournament (or any for now)
        tournament = Tournament.objects.order_by('-start_date').first()
        if not tournament:
            return Response([])

        qs = LeagueStanding.objects.filter(tournament=tournament).select_related('team')
        standings = []
        for row in qs:
            standings.append({
                'team_id': row.team.id,
                'name': row.team.name,
                'played': row.played,
                'won': row.won,
                'drawn': row.drawn,
                'lost': row.lost,
                'gf': row.goals_for,
                'ga': row.goals_against,
                'gd': row.goal_difference,
                'points': row.points,
            })

        standings.sort(key=lambda x: (-x['points'], -x['gd'], -x['gf'], x['name']))
        for idx, row in enumerate(standings, start=1):
            row['rank'] = idx

        return Response(standings)


class MatchEventCreateView(APIView):
    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        serializer = MatchEventSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(match=match)
            event_data = serializer.data

            broadcast_match_event(match_id, {
                'type': 'new_event',
                'event': event_data
            })

            return Response(event_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApplySubstitutionView(APIView):
    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        team_id = request.data.get('team_id')

        subs_count = MatchEvent.objects.filter(match=match, player__team_id=team_id, event_type='SUB_IN').count()
        if subs_count >= 5:
            return Response({'detail': 'حداکثر ۵ تعویض مجاز است.'}, status=status.HTTP_400_BAD_REQUEST)

        player_in_id = request.data.get('player_in')
        player_out_id = request.data.get('player_out')
        minute = request.data.get('minute', 0)

        MatchEvent.objects.create(match=match, player_id=player_out_id, event_type='SUB_OUT', minute=minute)
        MatchEvent.objects.create(match=match, player_id=player_in_id, event_type='SUB_IN', minute=minute)

        broadcast_match_event(match_id, {
            'type': 'substitution',
            'team_id': team_id,
            'player_in': player_in_id,
            'player_out': player_out_id,
            'minute': minute
        })

        return Response({'detail': 'تعویض با موفقیت اعمال شد.'}, status=status.HTTP_200_OK)


class MatchStatusUpdateView(APIView):
    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        new_half_status = request.data.get('half_status')
        if new_half_status:
            match.half_status = new_half_status
            if new_half_status == 'FINISHED':
                match.status = 'FINISHED'
            elif new_half_status in ['1ST_HALF', '2ND_HALF', 'EXTRA_TIME', 'PENALTIES']:
                match.status = 'LIVE'
            match.save()

            broadcast_match_event(match_id, {
                'type': 'status_update',
                'half_status': match.half_status,
                'status': match.status
            })

            return Response({'detail': 'وضعیت بازی بروزرسانی شد.'}, status=status.HTTP_200_OK)
        return Response({'detail': 'فیلد half_status الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────
# NEW TASK C VIEWS
# ─────────────────────────────────────────────────────────

class TournamentStandingListView(generics.ListAPIView):
    """
    Returns persisted LeagueStanding rows for a tournament,
    sorted by points → goal difference → goals scored → name.
    """
    serializer_class = LeagueStandingSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        tournament_id = self.kwargs['tournament_id']
        qs = LeagueStanding.objects.filter(
            tournament_id=tournament_id
        ).select_related('team').order_by(
            '-points', '-goals_for'
        )
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        # Annotate rank
        sorted_data = sorted(
            data,
            key=lambda x: (-x['points'], -(x['gf'] - x['ga']), -x['gf'], x['name'])
        )
        for idx, row in enumerate(sorted_data, start=1):
            row['rank'] = idx
        return Response(sorted_data)


class SubmitTeamStatsView(APIView):
    """
    Admin: Create or update team-level stats for a finished match.
    POST payload: { team_id, possession_percent, shots, shots_on_target, corners, fouls, offsides }
    After saving, broadcasts a WebSocket event so connected managers see it immediately.
    """

    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        if match.status != 'FINISHED':
            return Response({'error': 'امکان ثبت آمار تنها پس از پایان بازی وجود دارد.'}, status=status.HTTP_400_BAD_REQUEST)

        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'team_id الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        team = get_object_or_404(Team, id=team_id)

        stat, created = MatchTeamStat.objects.update_or_create(
            match=match, team=team,
            defaults={
                'possession_percent': request.data.get('possession_percent', 50),
                'shots': request.data.get('shots', 0),
                'shots_on_target': request.data.get('shots_on_target', 0),
                'corners': request.data.get('corners', 0),
                'fouls': request.data.get('fouls', 0),
                'offsides': request.data.get('offsides', 0),
            }
        )

        serializer = MatchTeamStatSerializer(stat)

        # Broadcast to all watching managers
        broadcast_match_event(match_id, {
            'type': 'team_stats_update',
            'team_id': team_id,
            'stats': serializer.data
        })

        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


class SubmitPlayerRatingsView(APIView):
    """
    Admin: Create or update per-player stats and ratings for a match.
    POST payload: { players: [ {player_id, minutes_played, rating, was_starter}, ... ] }
    After saving, broadcasts a WebSocket event.
    """

    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        if match.status != 'FINISHED':
            return Response({'error': 'امکان ثبت آمار تنها پس از پایان بازی وجود دارد.'}, status=status.HTTP_400_BAD_REQUEST)

        players_data = request.data.get('players', [])

        if not players_data:
            return Response({'error': 'لیست بازیکنان الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        saved = []
        with transaction.atomic():
            for p in players_data:
                player_id = p.get('player_id')
                if not player_id:
                    continue
                stat, _ = PlayerMatchStat.objects.update_or_create(
                    match=match, player_id=player_id,
                    defaults={
                        'minutes_played': p.get('minutes_played', 0),
                        'rating': p.get('rating', None),
                        'was_starter': p.get('was_starter', False),
                    }
                )
                saved.append(stat)

        serializer = PlayerMatchStatSerializer(saved, many=True)

        broadcast_match_event(match_id, {
            'type': 'player_ratings_update',
            'count': len(saved)
        })

        return Response(serializer.data, status=status.HTTP_200_OK)


class MatchDetailView(generics.RetrieveAPIView):
    """
    Full match detail: score, events, team stats, player stats.
    Efficiently loaded with prefetch_related.
    """
    serializer_class = MatchDetailSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        match_id = self.kwargs['match_id']
        return get_object_or_404(
            Match.objects.prefetch_related(
                'events', 'team_stats', 'player_stats',
                'events__player', 'player_stats__player'
            ),
            id=match_id
        )


class TeamMatchHistoryView(generics.ListAPIView):
    """
    Returns all finished matches a team participated in, newest first.
    """
    serializer_class = MatchSummarySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        from django.db.models import Q
        return Match.objects.filter(
            Q(home_team_id=team_id) | Q(away_team_id=team_id),
            status='FINISHED'
        ).select_related('tournament', 'home_team', 'away_team').order_by('-date')[:30]


class AdminMatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        qs = Match.objects.all().select_related('home_team', 'away_team', 'tournament').order_by('-date')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class AdminMatchCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        home_team_id = request.data.get('home_team_id')
        away_team_id = request.data.get('away_team_id')
        date = request.data.get('date')
        round_name = request.data.get('round_name', 'هفته ۱')
        
        if not home_team_id or not away_team_id:
            return Response({'error': 'انتخاب هر دو تیم الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        tournament = Tournament.objects.first()

        match = Match.objects.create(
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            date=date if date else None,
            round_name=round_name,
            tournament=tournament,
            status='SCHEDULED',
            half_status='1ST_HALF'
        )
        return Response(MatchSerializer(match).data, status=status.HTTP_201_CREATED)


class AdminMatchUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def put(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        if 'home_score' in request.data:
            match.home_score = int(request.data['home_score'])
        if 'away_score' in request.data:
            match.away_score = int(request.data['away_score'])
        if 'status' in request.data:
            match.status = request.data['status']
        if 'half_status' in request.data:
            match.half_status = request.data['half_status']
        if 'round_name' in request.data:
            match.round_name = request.data['round_name']
        match.save()

        # Broadcast update to clients
        broadcast_match_event(match_id, {
            'type': 'status_update',
            'half_status': match.half_status,
            'status': match.status,
            'home_score': match.home_score,
            'away_score': match.away_score
        })

        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)

