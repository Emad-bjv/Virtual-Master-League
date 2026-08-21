import re

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q

from django.utils import timezone
from teams.models import Team, Player
from .models import (
    LiveSubstitutionRequest, LiveInGameChangeRequest, Match, MatchEvent,
    MatchTeamStat, PlayerMatchStat, LeagueStanding, Tournament
)
from .serializers import (
    LiveSubstitutionRequestSerializer, LiveInGameChangeSerializer, MatchSerializer,
    MatchEventSerializer, PlayerMatchStatSerializer,
    MatchTeamStatSerializer, MatchDetailSerializer,
    MatchSummarySerializer, LeagueStandingSerializer
)
from realtime.events import broadcast_match_event, notify_admin


PERSIAN_ARABIC_TO_ASCII = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
ASCII_TO_PERSIAN = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def normalize_round_query(round_param):
    """
    Given '1', '۱', 'هفته 1', 'هفته ۱', or 'Quarter-Finals', returns:
    (is_gameweek: bool, round_num: int or None, exact_names: list[str])
    """
    if not round_param:
        return False, None, []

    clean = str(round_param).strip().translate(PERSIAN_ARABIC_TO_ASCII)
    digits = re.findall(r'\d+', clean)

    if digits:
        r_num = int(digits[0])
        p_num = str(r_num).translate(ASCII_TO_PERSIAN)
        exact_names = [
            f"هفته {r_num}",
            f"هفته {p_num}",
            f"هفته {r_num} ",
            f"هفته {p_num} ",
            str(r_num),
            p_num,
        ]
        return True, r_num, exact_names

    return False, None, [str(round_param).strip()]


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
        
        # Real-time notify admin of new coach sub request
        notify_admin(f"درخواست تعویض جدید توسط مربی ثبت شد.")
        if serializer.data.get('match'):
            broadcast_match_event(serializer.data.get('match'), {
                'type': 'coach_sub_request',
                'data': serializer.data
            })
            
        return Response(
            {"message": "درخواست تعویض با موفقیت ثبت شد و در انتظار تایید ادمین است.", "data": serializer.data},
            status=status.HTTP_201_CREATED, headers=headers
        )


class LiveMatchTacticsUpdateView(APIView):
    """
    API endpoint for handling live match tactical changes (formations, live subs).
    Broadcasts real-time tactical updates to Admin and Match Channel.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data
        user = request.user
        team_name = getattr(user, 'managed_team', None)
        team_name_str = team_name.name if team_name else "مربی"
        formation = data.get('formation', '')
        
        # Real-time notify admin and match room
        notify_msg = f"مربی تیم {team_name_str} ترکیب و تاکتیک خود را بروزرسانی کرد (چیدمان: {formation}) ⚡"
        notify_admin(notify_msg)
        
        # Find active match for this team if any
        match_id = data.get('match_id')
        if not match_id and team_name:
            active_m = Match.objects.filter(status='LIVE').filter(Q(home_team=team_name) | Q(away_team=team_name)).first()
            if active_m:
                match_id = active_m.id
                
        if match_id:
            broadcast_match_event(match_id, {
                'type': 'coach_tactics_updated',
                'team_name': team_name_str,
                'formation': formation,
                'data': data
            })

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

        qs = LeagueStanding.objects.filter(tournament=tournament).select_related('team')
        
        # Only seed missing standings if count doesn't match total teams (avoids 16 get_or_create queries per request)
        from teams.models import Team
        total_teams_count = Team.objects.count()
        if qs.count() < total_teams_count:
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
        player_id = request.data.get('player_id') or request.data.get('player')
        target_team_id = request.data.get('team_id') or match.home_team_id

        player_obj = None
        if player_id:
            player_obj = Player.objects.filter(id=player_id).first()
        if not player_obj and target_team_id:
            player_obj = Player.objects.filter(team_id=target_team_id).first()
        if not player_obj and match.home_team_id:
            player_obj = Player.objects.filter(team_id=match.home_team_id).first()
        if not player_obj:
            player_obj = Player.objects.first()

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if player_obj:
            data['player'] = player_obj.id

        serializer = MatchEventSerializer(data=data)
        if serializer.is_valid():
            ev = serializer.save(match=match, player=player_obj)
            event_type = ev.event_type

            # Determine target team ID
            target_team_id = ev.team_id or (ev.player.team_id if ev.player else None) or request.data.get('team_id')
            if target_team_id:
                try:
                    target_team_id = int(target_team_id)
                except (ValueError, TypeError):
                    pass

            if event_type in ['GOAL', 'PENALTY_SCORED']:
                if target_team_id == match.home_team_id:
                    match.home_score = (match.home_score or 0) + 1
                elif target_team_id == match.away_team_id:
                    match.away_score = (match.away_score or 0) + 1
                elif ev.player and ev.player.team_id == match.home_team_id:
                    match.home_score = (match.home_score or 0) + 1
                elif ev.player and ev.player.team_id == match.away_team_id:
                    match.away_score = (match.away_score or 0) + 1
                match.save(update_fields=['home_score', 'away_score'])

            elif event_type == 'OWN_GOAL':
                # Own goal awards point to the opponent!
                if target_team_id == match.home_team_id or (ev.player and ev.player.team_id == match.home_team_id):
                    match.away_score = (match.away_score or 0) + 1
                elif target_team_id == match.away_team_id or (ev.player and ev.player.team_id == match.away_team_id):
                    match.home_score = (match.home_score or 0) + 1
                match.save(update_fields=['home_score', 'away_score'])

            elif event_type in ['UNDO_GOAL', 'UNDO_EVENT'] or 'لغو' in (ev.detail or ''):
                # Revert score
                if target_team_id == match.home_team_id or (ev.player and ev.player.team_id == match.home_team_id):
                    match.home_score = max(0, (match.home_score or 0) - 1)
                elif target_team_id == match.away_team_id or (ev.player and ev.player.team_id == match.away_team_id):
                    match.away_score = max(0, (match.away_score or 0) - 1)
                match.save(update_fields=['home_score', 'away_score'])

            event_data = MatchEventSerializer(ev).data
            match_data = MatchDetailSerializer(match).data

            broadcast_match_event(match_id, {
                'type': 'new_event',
                'event': event_data,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'match': match_data
            })

            return Response({
                'event': event_data,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'match': match_data
            }, status=status.HTTP_201_CREATED)
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
                'saves': request.data.get('saves', 0),
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

            # --- Player Level System XP ---
            from teams.level_engine import grant_match_xp
            events = list(match.events.all())
            home_won = match.home_score > match.away_score
            away_won = match.away_score > match.home_score
            for stat in saved:
                if stat.rating is not None and stat.player.team_id:
                    won = (stat.player.team_id == match.home_team_id and home_won) or \
                          (stat.player.team_id == match.away_team_id and away_won)
                    player_events = [e for e in events if e.player_id == stat.player_id]
                    grant_match_xp(stat.player, match, float(stat.rating), player_events, won, stat.was_starter)

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
    Optimized with single SQL aggregation.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Count, Q
        tournament = Tournament.objects.filter(tournament_type='LEAGUE').order_by('-created_at').first()
        if not tournament:
            tournament = Tournament.objects.first()

        match_qs = Match.objects.filter(tournament=tournament) if tournament else Match.objects.all()

        aggregated_rounds = (
            match_qs
            .values('round_name')
            .annotate(
                total_matches=Count('id'),
                finished_matches=Count('id', filter=Q(status='FINISHED')),
                live_matches=Count('id', filter=Q(status='LIVE')),
                scheduled_matches=Count('id', filter=Q(status='SCHEDULED')),
            )
        )

        def extract_round_num(name):
            is_gw, r_num, _ = normalize_round_query(name)
            return r_num if (is_gw and r_num is not None) else 999

        sorted_rows = sorted(aggregated_rounds, key=lambda r: extract_round_num(r.get('round_name', '')))
        if not sorted_rows:
            sorted_rows = [{'round_name': f"هفته {i}", 'total_matches': 0, 'finished_matches': 0, 'live_matches': 0, 'scheduled_matches': 0} for i in range(1, 31)]

        gameweeks = []
        active_gameweek = None

        for row in sorted_rows:
            r_name = row.get('round_name') or 'هفته ۱'
            total = row.get('total_matches', 0)
            finished = row.get('finished_matches', 0)
            live = row.get('live_matches', 0)
            scheduled = row.get('scheduled_matches', 0)
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
        qs = Match.objects.all().select_related(
            'home_team__manager', 'away_team__manager',
            'home_team__gameplan', 'away_team__gameplan',
            'tournament'
        ).prefetch_related('gameplans').order_by('date', 'id')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if round_filter:
            is_gw, r_num, exact_names = normalize_round_query(round_filter)
            if is_gw:
                qs = qs.filter(round_name__in=exact_names)
            else:
                qs = qs.filter(round_name__iexact=str(round_filter).strip())
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

        qs = Match.objects.all().select_related(
            'home_team__manager', 'away_team__manager',
            'home_team__gameplan', 'away_team__gameplan',
            'tournament'
        ).prefetch_related('gameplans')

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
            is_gw, r_num, exact_names = normalize_round_query(round_filter)
            if is_gw:
                qs = qs.filter(round_name__in=exact_names)
            else:
                qs = qs.filter(round_name__iexact=str(round_filter).strip())

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
    - recent_finished_match: Most recently finished match data (retained for 10-min post-match recap)
    - last_finished_match: Alias for recent_finished_match
    - next_match: First upcoming scheduled match
    - time_to_kickoff_seconds: Remaining seconds until next kickoff (or 0 if reached)
    - is_within_reminder_window: True if 0 <= time_to_kickoff_seconds <= 900 (T-15 min)
    - current_server_time: Server timestamp
    - stream_url: Active stream embed URL
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.utils import timezone
        from django.db.models import Q
        now = timezone.now()
        active_match = Match.objects.filter(status='LIVE').select_related('home_team', 'away_team', 'tournament').order_by('date', 'id').first()
        next_match = Match.objects.filter(status='SCHEDULED').select_related('home_team', 'away_team', 'tournament').order_by('date', 'id').first()
        recent_finished_match = Match.objects.filter(status='FINISHED').select_related('home_team', 'away_team', 'tournament').order_by('-date', '-id').first()

        time_to_kickoff = None
        is_within_reminder = False

        if next_match and next_match.date:
            diff = (next_match.date - now).total_seconds()
            time_to_kickoff = max(0, int(diff))
            is_within_reminder = (0 <= time_to_kickoff <= 900)

        # Team-specific match calculation for the coach
        team_id = request.query_params.get('team_id')
        user_team = getattr(request.user, 'team', None) if request.user.is_authenticated else None
        if not user_team and team_id:
            try:
                user_team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                pass

        team_next_match = None
        team_recent_finished_match = None
        team_time_to_kickoff = None
        team_is_within_reminder = False

        if user_team:
            team_next_match = Match.objects.filter(
                Q(home_team=user_team) | Q(away_team=user_team),
                status='SCHEDULED'
            ).select_related('home_team', 'away_team', 'tournament').order_by('date', 'id').first()

            team_recent_finished_match = Match.objects.filter(
                Q(home_team=user_team) | Q(away_team=user_team),
                status='FINISHED'
            ).select_related('home_team', 'away_team', 'tournament').order_by('-date', '-id').first()

            if team_next_match and team_next_match.date:
                team_diff = (team_next_match.date - now).total_seconds()
                team_time_to_kickoff = max(0, int(team_diff))
                team_is_within_reminder = (0 <= team_time_to_kickoff <= 900)

        team_next_match_data = None
        if team_next_match:
            team_next_match_data = MatchSerializer(team_next_match).data
            # Verify if this specific match has a submitted lineup for this team
            from .models import MatchGamePlan
            is_sub = MatchGamePlan.objects.filter(
                match=team_next_match,
                team=user_team,
                is_submitted=True
            ).exists()
            team_next_match_data['is_lineup_submitted'] = is_sub

        data = {
            'has_active_match': active_match is not None,
            'active_match': MatchDetailSerializer(active_match).data if active_match else None,
            'recent_finished_match': MatchDetailSerializer(recent_finished_match).data if recent_finished_match else None,
            'last_finished_match': MatchDetailSerializer(recent_finished_match).data if recent_finished_match else None,
            'next_match': MatchSerializer(next_match).data if next_match else None,
            'time_to_kickoff_seconds': time_to_kickoff,
            'is_within_reminder_window': is_within_reminder,
            'team_next_match': team_next_match_data,
            'team_recent_finished_match': MatchDetailSerializer(team_recent_finished_match).data if team_recent_finished_match else None,
            'team_time_to_kickoff_seconds': team_time_to_kickoff,
            'team_is_within_reminder_window': team_is_within_reminder,
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
                target_team_id = ev.team_id or (ev.player.team_id if ev.player else None)
                if ev.event_type in ['GOAL', 'PENALTY_SCORED']:
                    if target_team_id == match.home_team_id or (ev.player and ev.player.team_id == match.home_team_id):
                        match.home_score = max(0, match.home_score - 1)
                    elif target_team_id == match.away_team_id or (ev.player and ev.player.team_id == match.away_team_id):
                        match.away_score = max(0, match.away_score - 1)
                elif ev.event_type == 'OWN_GOAL':
                    if target_team_id == match.home_team_id or (ev.player and ev.player.team_id == match.home_team_id):
                        match.away_score = max(0, match.away_score - 1)
                    elif target_team_id == match.away_team_id or (ev.player and ev.player.team_id == match.away_team_id):
                        match.home_score = max(0, match.home_score - 1)
                elif ev.event_type == 'VAR' and 'مردود' in (ev.detail or ''):
                    if target_team_id == match.home_team_id or (ev.player and ev.player.team_id == match.home_team_id):
                        match.home_score += 1
                    elif target_team_id == match.away_team_id or (ev.player and ev.player.team_id == match.away_team_id):
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

            return Response({
                'status': 'event_undone',
                'home_score': match.home_score,
                'away_score': match.away_score,
                'match': match_detail
            }, status=status.HTTP_200_OK)

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


class LiveInGameChangeListView(APIView):
    """
    Get or list all in-game change requests for a match.
    """
    permission_classes = [AllowAny]

    def get(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        team_id = request.query_params.get('team_id')
        queryset = match.in_game_changes.all().order_by('-created_at')
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        data = LiveInGameChangeSerializer(queryset, many=True).data
        return Response(data, status=status.HTTP_200_OK)


class LiveInGameChangeBatchSubmitView(APIView):
    """
    Coach submits in-game changes (substitutions, position moves, tactics, formation changes).
    Only modified items should be sent.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        team_id = request.data.get('team_id')
        if not team_id:
            # Detect team from coach
            coach_team = Team.objects.filter(manager=request.user).first()
            if coach_team:
                team_id = coach_team.id
            else:
                team_id = match.home_team_id

        team = get_object_or_404(Team, id=team_id)
        raw_changes = request.data.get('changes', [])
        if not isinstance(raw_changes, list):
            raw_changes = [request.data]

        created_objs = []
        minute = int(request.data.get('minute') or match.current_minute or 45)

        for item in raw_changes:
            category = item.get('category') or item.get('change_category') or 'TACTIC'
            title = item.get('title') or 'تغییرات حین بازی'
            detail = item.get('detail') or item.get('description') or ''
            diff_data = item.get('diff_data') or item.get('payload') or {}

            # Don't save empty items
            if not title and not detail:
                continue

            change_obj = LiveInGameChangeRequest.objects.create(
                match=match,
                team=team,
                coach=request.user,
                change_category=category,
                title=title,
                detail=detail,
                diff_data=diff_data,
                status='PENDING',
                minute=minute
            )
            created_objs.append(change_obj)

        serialized = LiveInGameChangeSerializer(created_objs, many=True).data
        match_detail = MatchDetailSerializer(match).data

        broadcast_match_event(match_id, {
            'type': 'new_in_game_change',
            'team_id': team.id,
            'team_name': team.name,
            'changes': serialized,
            'match': match_detail
        })

        return Response({
            'status': 'success',
            'count': len(created_objs),
            'changes': serialized,
            'match': match_detail
        }, status=status.HTTP_201_CREATED)


class LiveInGameChangeApplyView(APIView):
    """
    Admin checks off / marks an in-game change as APPLIED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id, change_id):
        match = get_object_or_404(Match, id=match_id)
        change = get_object_or_404(LiveInGameChangeRequest, id=change_id, match=match)

        change.status = 'APPLIED'
        change.applied_at = timezone.now()
        change.save(update_fields=['status', 'applied_at'])

        # If it's a substitution, check if we need to apply substitution on Match stats / events
        if change.change_category == 'SUBSTITUTION':
            player_out_id = change.diff_data.get('player_out_id')
            player_in_id = change.diff_data.get('player_in_id')
            minute = change.minute or match.current_minute or 45
            p_out = Player.objects.filter(id=player_out_id).first() if player_out_id else None
            p_in = Player.objects.filter(id=player_in_id).first() if player_in_id else None

            if p_out and p_in:
                # Record sub out & sub in events if not already done
                sub_out_exists = MatchEvent.objects.filter(
                    match=match, player=p_out, event_type='SUB_OUT', minute=minute
                ).exists()
                if not sub_out_exists:
                    MatchEvent.objects.create(
                        match=match, player=p_out, team=change.team, event_type='SUB_OUT',
                        minute=minute, detail=f'تعویض (خروج): {p_out.name}'
                    )
                    MatchEvent.objects.create(
                        match=match, player=p_in, team=change.team, event_type='SUB_IN',
                        minute=minute, detail=f'تعویض (ورود): {p_in.name}'
                    )

        serialized = LiveInGameChangeSerializer(change).data
        match_detail = MatchDetailSerializer(match).data

        # Broadcast confirmation to coach & referee desk
        broadcast_match_event(match_id, {
            'type': 'in_game_change_applied',
            'change_id': change.id,
            'change': serialized,
            'team_id': change.team_id,
            'team_name': change.team.name,
            'message': f'پیغام انجام شد: «{change.title}» با موفقیت توسط داور در زمین اعمال و تیک خورد ✅',
            'custom_text': f'پیغام انجام شد: «{change.title}» تایید و در زمین مسابقه اعمال گردید ✅',
            'match': match_detail
        })

        return Response({
            'status': 'applied',
            'change': serialized,
            'match': match_detail
        }, status=status.HTTP_200_OK)


class LiveInGameChangeRejectView(APIView):
    """
    Admin rejects an in-game change request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id, change_id):
        match = get_object_or_404(Match, id=match_id)
        change = get_object_or_404(LiveInGameChangeRequest, id=change_id, match=match)

        change.status = 'REJECTED'
        change.save(update_fields=['status'])

        serialized = LiveInGameChangeSerializer(change).data
        match_detail = MatchDetailSerializer(match).data

        broadcast_match_event(match_id, {
            'type': 'in_game_change_rejected',
            'change_id': change.id,
            'change': serialized,
            'team_id': change.team_id,
            'team_name': change.team.name,
            'message': f'درخواست تغییر «{change.title}» توسط داور رد شد ❌',
            'match': match_detail
        })

        return Response({
            'status': 'rejected',
            'change': serialized,
            'match': match_detail
        }, status=status.HTTP_200_OK)




