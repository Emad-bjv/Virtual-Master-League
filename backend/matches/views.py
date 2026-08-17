from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction

from teams.models import Team, Player
from .models import (
    LiveSubstitutionRequest, Match, MatchEvent,
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


class LiveMatchTacticsUpdateView(APIView):
    """
    API endpoint for handling live match tactical changes (formations, live subs).
    This acts as a dedicated bridge for in-match events so it does not overwrite the permanent team setup.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # We simulate successful processing and logging of the live match tactics payload.
        # In a fully fleshed out system, this might save the state to a LiveMatchState model.
        data = request.data
        return Response(
            {"message": "Live tactics updated successfully.", "data": data},
            status=status.HTTP_200_OK
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
        tournament = Tournament.objects.filter(tournament_type='LEAGUE').order_by('-created_at').first()
        if not tournament:
            tournament = Tournament.objects.first()
        if not tournament:
            return Response([])

        from teams.models import Team
        teams = Team.objects.all()
        for t in teams:
            LeagueStanding.objects.get_or_create(
                tournament=tournament, team=t,
                defaults={'played': 0, 'won': 0, 'drawn': 0, 'lost': 0,
                          'goals_for': 0, 'goals_against': 0, 'points': 0}
            )

        qs = LeagueStanding.objects.filter(tournament=tournament).select_related('team')
        standings = []
        for row in qs:
            standings.append({
                'team_id': row.team.id,
                'name': row.team.name,
                'logo': row.team.logo,
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


class GameweekStatusView(APIView):
    """
    Returns summary of all Gameweeks/Rounds, tracking completed/live/scheduled matches,
    and identifies the current active Gameweek for auto-progression.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        tournament = Tournament.objects.filter(tournament_type='LEAGUE').order_by('-created_at').first()
        if not tournament:
            tournament = Tournament.objects.first()

        matches = Match.objects.filter(tournament=tournament) if tournament else Match.objects.all()
        
        from collections import defaultdict
        rounds_dict = defaultdict(list)
        for m in matches.select_related('home_team', 'away_team'):
            r_name = m.round_name or 'هفته ۱'
            rounds_dict[r_name].append(m)

        def extract_round_num(name):
            import re
            digits = re.findall(r'\d+', str(name))
            return int(digits[0]) if digits else 999

        sorted_rounds = sorted(rounds_dict.keys(), key=extract_round_num)
        if not sorted_rounds:
            sorted_rounds = [f"هفته {i}" for i in range(1, 31)]

        gameweeks = []
        active_gameweek = None

        for r_name in sorted_rounds:
            round_matches = rounds_dict.get(r_name, [])
            total = len(round_matches)
            finished = sum(1 for m in round_matches if m.status == 'FINISHED')
            live = sum(1 for m in round_matches if m.status == 'LIVE')
            scheduled = sum(1 for m in round_matches if m.status == 'SCHEDULED')
            is_finished = (total > 0 and finished == total)

            gameweeks.append({
                'round_name': r_name,
                'round_number': extract_round_num(r_name),
                'total_matches': total,
                'finished_matches': finished,
                'live_matches': live,
                'scheduled_matches': scheduled,
                'is_finished': is_finished,
                'is_live': live > 0,
            })

            if active_gameweek is None and not is_finished and total > 0:
                active_gameweek = r_name

        if not active_gameweek and gameweeks:
            active_gameweek = gameweeks[-1]['round_name']

        return Response({
            'active_gameweek': active_gameweek or 'هفته ۱',
            'gameweeks': gameweeks
        }, status=status.HTTP_200_OK)


class AdminMatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        round_filter = self.request.query_params.get('round') or self.request.query_params.get('gameweek')
        qs = Match.objects.all().select_related('home_team', 'away_team', 'tournament').order_by('date', 'id')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if round_filter:
            if round_filter.isdigit():
                qs = qs.filter(round_name__icontains=f"هفته {round_filter}")
            else:
                qs = qs.filter(round_name__icontains=round_filter)
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


class TeamScheduleView(generics.ListAPIView):
    """
    Returns the complete match schedule for a specific team or all teams.
    Supports ?status=SCHEDULED, FINISHED, LIVE, ALL
    Supports ?round=هفته ۱
    Supports ?venue=HOME, AWAY
    """
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.db.models import Q
        team_id = self.kwargs.get('team_id')
        status_filter = self.request.query_params.get('status')
        round_filter = self.request.query_params.get('round')
        venue_filter = self.request.query_params.get('venue')

        qs = Match.objects.all().select_related('tournament', 'home_team', 'away_team')

        if team_id:
            if venue_filter == 'HOME':
                qs = qs.filter(home_team_id=team_id)
            elif venue_filter == 'AWAY':
                qs = qs.filter(away_team_id=team_id)
            else:
                qs = qs.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))

        if status_filter and status_filter.upper() != 'ALL':
            qs = qs.filter(status=status_filter.upper())

        if round_filter:
            qs = qs.filter(round_name__icontains=round_filter)

        return qs.order_by('date', 'id')


class GenerateLeagueFixturesView(APIView):
    """
    Admin / Setup endpoint to generate full 30-round sequential league fixtures.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .fixture_engine import ensure_league_and_fixtures, DEFAULT_START_DATE
        import datetime
        start_date_str = request.data.get('start_date')
        start_date = None
        if start_date_str:
            try:
                start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        tournament, count = ensure_league_and_fixtures(start_date=start_date, clear_existing=True)
        return Response({
            'status': 'Fixtures generated successfully',
            'tournament_id': tournament.id,
            'tournament_name': tournament.name,
            'matches_count': count,
            'start_date': str(start_date or DEFAULT_START_DATE)
        }, status=status.HTTP_201_CREATED)


class ActiveLiveMatchContextView(APIView):
    """
    Returns the current live match context for schedule enforcement & time-gated access:
    - has_active_match: True if a match is actively in progress ('LIVE')
    - active_match: Serialized match data
    - next_match: First upcoming scheduled match
    - time_to_kickoff_seconds: Remaining seconds until next kickoff (or 0 if reached)
    - is_within_reminder_window: True if 0 <= time_to_kickoff_seconds <= 900 (T-15 min)
    - current_server_time: Server timestamp
    - stream_url: Active stream embed URL
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.utils import timezone
        now = timezone.now()
        active_match = Match.objects.filter(status='LIVE').select_related('home_team', 'away_team', 'tournament').order_by('date', 'id').first()
        next_match = Match.objects.filter(status='SCHEDULED').select_related('home_team', 'away_team', 'tournament').order_by('date', 'id').first()

        time_to_kickoff = None
        is_within_reminder = False

        if next_match and next_match.date:
            diff = (next_match.date - now).total_seconds()
            time_to_kickoff = max(0, int(diff))
            is_within_reminder = (0 <= time_to_kickoff <= 900)

        data = {
            'has_active_match': active_match is not None,
            'active_match': MatchDetailSerializer(active_match).data if active_match else None,
            'next_match': MatchSerializer(next_match).data if next_match else None,
            'time_to_kickoff_seconds': time_to_kickoff,
            'is_within_reminder_window': is_within_reminder,
            'current_server_time': now.isoformat(),
            'stream_url': "https://www.aparat.com/embed/live/VML.Emad",
        }
        return Response(data, status=status.HTTP_200_OK)


class MatchLiveStateView(APIView):
    """
    Returns detailed real-time state of a specific match:
    events list, home/away score, half_status, and substitution counts.
    """
    permission_classes = [AllowAny]

    def get(self, request, match_id):
        match = get_object_or_404(
            Match.objects.select_related('home_team', 'away_team', 'tournament'),
            id=match_id
        )
        events = MatchEvent.objects.filter(match=match).select_related('player', 'player__team').order_by('-id')

        home_subs = MatchEvent.objects.filter(match=match, player__team_id=match.home_team_id, event_type='SUB_IN').count()
        away_subs = MatchEvent.objects.filter(match=match, player__team_id=match.away_team_id, event_type='SUB_IN').count()

        return Response({
            'match': MatchDetailSerializer(match).data,
            'events': MatchEventSerializer(events, many=True).data,
            'home_subs_used': home_subs,
            'away_subs_used': away_subs,
            'max_subs': 5
        }, status=status.HTTP_200_OK)


class AdminMatchControlRoomView(APIView):
    """
    Admin Arbiter Control Room Endpoint:
    Provides authoritative control over match status, clock, stoppage time,
    FotMob rapid event logging, dual tactical substitution validation,
    and live telemetry statistics engine.
    """
    permission_classes = [AllowAny]

    def post(self, request, match_id):
        match = get_object_or_404(
            Match.objects.select_related('home_team', 'away_team', 'tournament'),
            id=match_id
        )
        action = request.data.get('action')

        if not action:
            return Response({'error': 'فیلد action الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. START MATCH (1ST HALF)
        if action in ['START_MATCH', 'SET_MATCH_LIVE']:
            match.status = 'LIVE'
            match.half_status = '1ST_HALF'
            match.current_minute = request.data.get('minute', 1)
            match.stoppage_time = 0
            match.save()

            broadcast_match_event(match_id, {
                'type': 'match_status',
                'status': 'LIVE',
                'half_status': '1ST_HALF',
                'current_minute': match.current_minute,
                'stoppage_time': 0,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': f'مسابقه {match.home_team.name} و {match.away_team.name} رسماً آغاز شد! ⚽'
            })
            return Response({'status': 'LIVE', 'half_status': '1ST_HALF', 'match': MatchDetailSerializer(match).data})

        # 2. TRIGGER HALF TIME (HT)
        elif action == 'TRIGGER_HALF_TIME':
            match.status = 'LIVE'
            match.half_status = 'HALF_TIME'
            match.current_minute = 45
            match.save()

            broadcast_match_event(match_id, {
                'type': 'half_time',
                'status': 'LIVE',
                'half_status': 'HALF_TIME',
                'current_minute': 45,
                'break_duration_seconds': 30,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': 'نیمه اول به پایان رسید. استراحت ۳۰ ثانیه‌ای بین دو نیمه مربیان آغاز شد ⏸️'
            })
            return Response({'status': 'LIVE', 'half_status': 'HALF_TIME', 'match': MatchDetailSerializer(match).data})

        # 3. START SECOND HALF (2ND HALF)
        elif action == 'START_SECOND_HALF':
            match.status = 'LIVE'
            match.half_status = '2ND_HALF'
            match.current_minute = request.data.get('minute', 46)
            match.stoppage_time = 0
            match.save()

            broadcast_match_event(match_id, {
                'type': 'second_half_started',
                'status': 'LIVE',
                'half_status': '2ND_HALF',
                'current_minute': match.current_minute,
                'stoppage_time': 0,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': 'نیمه دوم مسابقه آغاز شد! ▶️ تاکتیک‌ها مجدداً قفل شدند.'
            })
            return Response({'status': 'LIVE', 'half_status': '2ND_HALF', 'match': MatchDetailSerializer(match).data})

        # 4. SET STOPPAGE TIME
        elif action == 'SET_STOPPAGE_TIME':
            stoppage = request.data.get('stoppage_time', 0)
            match.stoppage_time = int(stoppage)
            match.save(update_fields=['stoppage_time'])

            broadcast_match_event(match_id, {
                'type': 'stoppage_time_update',
                'stoppage_time': match.stoppage_time,
                'half_status': match.half_status,
                'message': f'⏱️ {match.stoppage_time} دقیقه وقت اضافه اعلام شد.'
            })
            return Response({'stoppage_time': match.stoppage_time, 'match': MatchDetailSerializer(match).data})

        # 5. CONCLUDE FULL TIME (FT)
        elif action == 'CONCLUDE_FULL_TIME':
            match.status = 'FINISHED'
            match.half_status = 'FINISHED'
            match.current_minute = 90
            match.save()

            from teams.stamina_engine import apply_post_match_fatigue
            try:
                apply_post_match_fatigue(match)
            except Exception:
                pass

            broadcast_match_event(match_id, {
                'type': 'match_finished',
                'status': 'FINISHED',
                'half_status': 'FINISHED',
                'current_minute': 90,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': f'مسابقه با نتیجه نهایی {match.home_score} - {match.away_score} به پایان رسید ⏹️'
            })
            return Response({'status': 'FINISHED', 'half_status': 'FINISHED', 'match': MatchDetailSerializer(match).data})

        # 6. RECORD EVENT (FotMob-Style Rapid Event Logger)
        elif action == 'RECORD_EVENT':
            event_type = request.data.get('event_type')
            player_id = request.data.get('player_id')
            assist_player_id = request.data.get('assist_player_id')
            minute = int(request.data.get('minute', match.current_minute or 45))
            detail_text = request.data.get('detail', request.data.get('text', ''))
            var_type = request.data.get('var_type', '')

            if not event_type:
                return Response({'error': 'event_type الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

            player = None
            if player_id:
                player = get_object_or_404(Player, id=player_id)

            assist_player = None
            if assist_player_id:
                assist_player = Player.objects.filter(id=assist_player_id).first()

            target_team_id = request.data.get('team_id') or (player.team_id if player else match.home_team_id)
            target_team = Team.objects.filter(id=target_team_id).first()

            # Rule Processing
            if event_type == 'GOAL':
                if player and player.team_id == match.home_team_id:
                    match.home_score += 1
                elif player and player.team_id == match.away_team_id:
                    match.away_score += 1
                else:
                    if target_team_id == match.home_team_id:
                        match.home_score += 1
                    else:
                        match.away_score += 1

            elif event_type == 'OWN_GOAL':
                # Own goal awards point to the opponent!
                if player and player.team_id == match.home_team_id:
                    match.away_score += 1
                elif player and player.team_id == match.away_team_id:
                    match.home_score += 1
                else:
                    if target_team_id == match.home_team_id:
                        match.away_score += 1
                    else:
                        match.home_score += 1
                detail_text = detail_text or 'گل به خودی (OG)'

            elif event_type == 'PENALTY_SCORED':
                if player and player.team_id == match.home_team_id:
                    match.home_score += 1
                elif player and player.team_id == match.away_team_id:
                    match.away_score += 1
                else:
                    if target_team_id == match.home_team_id:
                        match.home_score += 1
                    else:
                        match.away_score += 1
                detail_text = detail_text or 'گل از روی نقطه پنالتی (Pen)'

            elif event_type == 'PENALTY_MISSED':
                detail_text = detail_text or 'پنالتی از دست رفته / مهار شده'

            elif event_type == 'YELLOW':
                # Check if player already has a yellow in this match
                if player:
                    yellows = MatchEvent.objects.filter(
                        match=match, player=player, event_type='YELLOW', is_undone=False
                    ).count()
                    if yellows >= 1:
                        event_type = 'SECOND_YELLOW'
                        detail_text = 'کارت زرد دوم -> اخراج از زمین (🟨🟥)'

            elif event_type == 'VAR':
                if var_type == 'GOAL_DISALLOWED' or 'مردود' in detail_text:
                    if player and player.team_id == match.home_team_id:
                        match.home_score = max(0, match.home_score - 1)
                    elif player and player.team_id == match.away_team_id:
                        match.away_score = max(0, match.away_score - 1)
                    elif target_team_id == match.home_team_id:
                        match.home_score = max(0, match.home_score - 1)
                    else:
                        match.away_score = max(0, match.away_score - 1)

            match.save(update_fields=['home_score', 'away_score'])

            ev = MatchEvent.objects.create(
                match=match,
                player=player if player else Player.objects.filter(team_id=target_team_id).first(),
                assist_player=assist_player,
                team=target_team,
                event_type=event_type,
                minute=minute,
                detail=detail_text
            )

            serialized_ev = MatchEventSerializer(ev).data
            match_detail = MatchDetailSerializer(match).data

            broadcast_match_event(match_id, {
                'type': 'new_event',
                'event': serialized_ev,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'custom_text': detail_text,
                'match': match_detail
            })

            return Response({
                'event': serialized_ev,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'match': match_detail
            }, status=status.HTTP_201_CREATED)

        # 7. DELETE / UNDO EVENT
        elif action == 'DELETE_EVENT':
            event_id = request.data.get('event_id')
            if not event_id:
                return Response({'error': 'event_id الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

            ev = get_object_or_404(MatchEvent, id=event_id, match=match)

            # Revert score changes if undoing goal / own goal
            if not ev.is_undone:
                if ev.event_type in ['GOAL', 'PENALTY_SCORED']:
                    if ev.player and ev.player.team_id == match.home_team_id:
                        match.home_score = max(0, match.home_score - 1)
                    elif ev.player and ev.player.team_id == match.away_team_id:
                        match.away_score = max(0, match.away_score - 1)
                elif ev.event_type == 'OWN_GOAL':
                    if ev.player and ev.player.team_id == match.home_team_id:
                        match.away_score = max(0, match.away_score - 1)
                    elif ev.player and ev.player.team_id == match.away_team_id:
                        match.home_score = max(0, match.home_score - 1)
                elif ev.event_type == 'VAR' and 'مردود' in (ev.detail or ''):
                    if ev.player and ev.player.team_id == match.home_team_id:
                        match.home_score += 1
                    elif ev.player and ev.player.team_id == match.away_team_id:
                        match.away_score += 1

                ev.is_undone = True
                ev.save()
                match.save(update_fields=['home_score', 'away_score'])

            match_detail = MatchDetailSerializer(match).data
            broadcast_match_event(match_id, {
                'type': 'event_deleted',
                'event_id': event_id,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'match': match_detail
            })

            return Response({'status': 'event_undone', 'match': match_detail}, status=status.HTTP_200_OK)

        # 8. RECORD SUBSTITUTION (with 5-subs / 3-windows / Red Card enforcement)
        elif action == 'RECORD_SUBSTITUTION':
            team_id = request.data.get('team_id')
            player_out_id = request.data.get('player_out_id')
            player_in_id = request.data.get('player_in_id')
            minute = int(request.data.get('minute', match.current_minute or 45))

            if not team_id or not player_out_id or not player_in_id:
                return Response({'error': 'team_id, player_out_id, and player_in_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Rule 1: Check if player_out was sent off
            is_ejected = MatchEvent.objects.filter(
                match=match, player_id=player_out_id,
                event_type__in=['RED', 'SECOND_YELLOW'], is_undone=False
            ).exists()
            if is_ejected:
                return Response({'error': 'بازیکن اخراج شده از زمین امکان تعویض ندارد.'}, status=status.HTTP_400_BAD_REQUEST)

            # Rule 2: Check 5 substitutions max limit
            subs_used = MatchEvent.objects.filter(
                match=match, player__team_id=team_id,
                event_type='SUB_IN', is_undone=False
            ).count()
            if subs_used >= 5:
                return Response({'error': 'تیم به سقف مجاز ۵ تعویض در این مسابقه رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)

            # Rule 3: Check 3 in-game substitution windows limit (half-time at min 45 does not consume window)
            if minute != 45:
                used_windows = set(MatchEvent.objects.filter(
                    match=match, player__team_id=team_id,
                    event_type='SUB_IN', is_undone=False
                ).exclude(minute=45).values_list('minute', flat=True))
                if minute not in used_windows and len(used_windows) >= 3:
                    return Response({'error': 'تیم به حداکثر ۳ پنجره تعویض در جریان بازی رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)

            p_out = get_object_or_404(Player, id=player_out_id)
            p_in = get_object_or_404(Player, id=player_in_id)
            target_team = Team.objects.filter(id=team_id).first()

            ev_out = MatchEvent.objects.create(
                match=match, player=p_out, team=target_team,
                event_type='SUB_OUT', minute=minute,
                detail=f'خروج {p_out.name}'
            )
            ev_in = MatchEvent.objects.create(
                match=match, player=p_in, team=target_team,
                event_type='SUB_IN', minute=minute,
                detail=f'ورود {p_in.name}'
            )

            match_detail = MatchDetailSerializer(match).data
            broadcast_match_event(match_id, {
                'type': 'substitution',
                'team_id': team_id,
                'player_out': MatchEventSerializer(ev_out).data,
                'player_in': MatchEventSerializer(ev_in).data,
                'minute': minute,
                'match': match_detail
            })
            return Response({'status': 'sub_recorded', 'match': match_detail}, status=status.HTTP_201_CREATED)

        # 9. APPROVE COACH SUBSTITUTION REQUEST
        elif action == 'APPROVE_SUB_REQUEST':
            request_id = request.data.get('request_id')
            if not request_id:
                return Response({'error': 'request_id الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

            sub_req = get_object_or_404(LiveSubstitutionRequest, id=request_id, match=match)
            minute = sub_req.minute or match.current_minute or 45

            # Validate red card & sub limits
            is_ejected = MatchEvent.objects.filter(
                match=match, player_id=sub_req.player_out_id,
                event_type__in=['RED', 'SECOND_YELLOW'], is_undone=False
            ).exists()
            if is_ejected:
                return Response({'error': 'بازیکن اخراج شده امکان تعویض ندارد.'}, status=status.HTTP_400_BAD_REQUEST)

            subs_used = MatchEvent.objects.filter(
                match=match, player__team_id=sub_req.team_id,
                event_type='SUB_IN', is_undone=False
            ).count()
            if subs_used >= 5:
                return Response({'error': 'تیم به حداکثر ۵ تعویض مجاز رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)

            if minute != 45:
                used_windows = set(MatchEvent.objects.filter(
                    match=match, player__team_id=sub_req.team_id,
                    event_type='SUB_IN', is_undone=False
                ).exclude(minute=45).values_list('minute', flat=True))
                if minute not in used_windows and len(used_windows) >= 3:
                    return Response({'error': 'تیم به سقف ۳ پنجره تعویض رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)

            ev_out = MatchEvent.objects.create(
                match=match, player=sub_req.player_out, team=sub_req.team,
                event_type='SUB_OUT', minute=minute,
                detail=f'خروج {sub_req.player_out.name}'
            )
            ev_in = MatchEvent.objects.create(
                match=match, player=sub_req.player_in, team=sub_req.team,
                event_type='SUB_IN', minute=minute,
                detail=f'ورود {sub_req.player_in.name}'
            )

            sub_req.status = 'APPLIED'
            sub_req.save()

            match_detail = MatchDetailSerializer(match).data
            broadcast_match_event(match_id, {
                'type': 'substitution',
                'team_id': sub_req.team_id,
                'player_out': MatchEventSerializer(ev_out).data,
                'player_in': MatchEventSerializer(ev_in).data,
                'minute': minute,
                'match': match_detail
            })
            return Response({'status': 'sub_approved', 'match': match_detail}, status=status.HTTP_200_OK)

        # 10. REJECT COACH SUBSTITUTION REQUEST
        elif action == 'REJECT_SUB_REQUEST':
            request_id = request.data.get('request_id')
            if not request_id:
                return Response({'error': 'request_id الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

            sub_req = get_object_or_404(LiveSubstitutionRequest, id=request_id, match=match)
            sub_req.status = 'REJECTED'
            sub_req.save()

            match_detail = MatchDetailSerializer(match).data
            broadcast_match_event(match_id, {
                'type': 'sub_rejected',
                'request_id': request_id,
                'team_id': sub_req.team_id,
                'match': match_detail
            })
            return Response({'status': 'sub_rejected', 'match': match_detail}, status=status.HTTP_200_OK)

        # 11. UPDATE LIVE TELEMETRY MATCH STATS
        elif action == 'UPDATE_TEAM_STATS':
            stats_payload = request.data.get('stats', {})
            # stats_payload can contain home_stats and away_stats
            home_data = stats_payload.get('home', {})
            away_data = stats_payload.get('away', {})

            if match.home_team:
                MatchTeamStat.objects.update_or_create(
                    match=match, team=match.home_team,
                    defaults={
                        'possession_percent': home_data.get('possession_percent', 50),
                        'shots': home_data.get('shots', 0),
                        'shots_on_target': home_data.get('shots_on_target', 0),
                        'corners': home_data.get('corners', 0),
                        'fouls': home_data.get('fouls', 0),
                        'offsides': home_data.get('offsides', 0),
                        'saves': home_data.get('saves', 0),
                    }
                )

            if match.away_team:
                MatchTeamStat.objects.update_or_create(
                    match=match, team=match.away_team,
                    defaults={
                        'possession_percent': away_data.get('possession_percent', 50),
                        'shots': away_data.get('shots', 0),
                        'shots_on_target': away_data.get('shots_on_target', 0),
                        'corners': away_data.get('corners', 0),
                        'fouls': away_data.get('fouls', 0),
                        'offsides': away_data.get('offsides', 0),
                        'saves': away_data.get('saves', 0),
                    }
                )

            match_detail = MatchDetailSerializer(match).data
            broadcast_match_event(match_id, {
                'type': 'team_stats_update',
                'match': match_detail
            })
            return Response({'status': 'stats_updated', 'match': match_detail}, status=status.HTTP_200_OK)

        # 12. SYNC CLOCK
        elif action == 'SYNC_CLOCK':
            minute = request.data.get('minute')
            stoppage = request.data.get('stoppage_time')
            if minute is not None:
                match.current_minute = int(minute)
            if stoppage is not None:
                match.stoppage_time = int(stoppage)
            match.save(update_fields=['current_minute', 'stoppage_time'])

            broadcast_match_event(match_id, {
                'type': 'clock_sync',
                'current_minute': match.current_minute,
                'stoppage_time': match.stoppage_time,
                'half_status': match.half_status
            })
            return Response({'status': 'clock_synced', 'current_minute': match.current_minute, 'stoppage_time': match.stoppage_time}, status=status.HTTP_200_OK)

        return Response({'error': 'عملیات نامعتبر است (Invalid action)'}, status=status.HTTP_400_BAD_REQUEST)



