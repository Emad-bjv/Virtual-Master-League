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
    MatchTeamStat, PlayerMatchStat, LeagueStanding, Tournament, Season
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
        return Match.objects.filter(status='SCHEDULED').select_related('home_team', 'away_team', 'tournament').order_by('date', 'id')[:10]


class MatchHistoryView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Match.objects.filter(status='FINISHED').select_related('home_team', 'away_team', 'tournament').order_by('-date', '-id')[:10]


class LeagueStandingsView(generics.GenericAPIView):
    """
    Returns full league standings from the database.
    Since we don't pass a tournament ID here, we just get the most recent active tournament's standings.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # Fetch standings from the active tournament that has standings
        tournament = (
            Tournament.objects.filter(tournament_type='LEAGUE', is_active=True, standings__isnull=False)
            .distinct()
            .order_by('-created_at')
            .first()
        )
        if not tournament:
            tournament = Tournament.objects.filter(tournament_type='LEAGUE', is_active=True).order_by('-created_at').first()
        if not tournament:
            tournament = Tournament.objects.filter(tournament_type='LEAGUE').order_by('-created_at').first()
        if not tournament:
            tournament = Tournament.objects.first()

        if not tournament:
            tournament = Tournament.objects.create(
                name="مستر لیگ مجازی",
                tournament_type="LEAGUE",
                is_active=True
            )

        force_recalculate = request.query_params.get('recalculate') == 'true'
        has_standings = LeagueStanding.objects.filter(tournament=tournament).exists()
        active_teams_count = Team.objects.filter(is_active=True).count()
        standings_count = LeagueStanding.objects.filter(tournament=tournament, team__is_active=True).count()

        if force_recalculate or not has_standings or (active_teams_count > 0 and standings_count < active_teams_count):
            try:
                recalculate_tournament_standings(tournament.id)
            except Exception:
                pass

        qs = LeagueStanding.objects.filter(tournament=tournament, team__is_active=True).select_related('team')

        standings = []
        for row in qs:
            standings.append({
                'id': row.id,
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
                'raw_points': row.points,
                'points': row.net_points,
                'points_deduction': row.points_deduction,
                'points_deduction_reason': row.points_deduction_reason,
                'is_manually_overridden': row.is_manually_overridden,
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

            elif event_type == 'INJURY' and ev.player:
                other_injury = MatchEvent.objects.filter(
                    match=match, player=ev.player, event_type='INJURY', is_undone=False
                ).exclude(id=ev.id).first()
                if other_injury:
                    # Toggle OFF: player was already marked injured in this match
                    other_injury.is_undone = True
                    other_injury.save(update_fields=['is_undone'])
                    ev.is_undone = True
                    ev.detail = 'لغو مصدومیت'
                    ev.save(update_fields=['is_undone', 'detail'])
                    ev.player.is_injured = False
                    ev.player.injury_matches = 0
                    ev.player.save(update_fields=['is_injured', 'injury_matches'])
                else:
                    ev.player.is_injured = True
                    ev.player.injury_matches = 2
                    ev.player.save(update_fields=['is_injured', 'injury_matches'])
                    if ev.player.team:
                        from teams.lineup_services import auto_replace_ineligible_starters
                        auto_replace_ineligible_starters(ev.player.team)

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

        p_out = Player.objects.filter(id=player_out_id).first()
        p_in = Player.objects.filter(id=player_in_id).first()
        target_team = Team.objects.filter(id=team_id).first() if team_id else (p_out.team if p_out else None)

        if match and target_team and p_out and p_in:
            apply_substitution_to_match_gameplan(match, target_team, p_out, p_in)

        ev_out = MatchEvent.objects.create(match=match, player_id=player_out_id, team=target_team, event_type='SUB_OUT', minute=minute, detail=f'خروج {p_out.name if p_out else ""}')
        ev_in = MatchEvent.objects.create(match=match, player_id=player_in_id, team=target_team, event_type='SUB_IN', minute=minute, detail=f'ورود {p_in.name if p_in else ""}')

        match_detail = MatchDetailSerializer(match).data
        broadcast_match_event(match_id, {
            'type': 'substitution',
            'team_id': team_id,
            'player_in': player_in_id,
            'player_out': player_out_id,
            'player_in_data': MatchEventSerializer(ev_in).data,
            'player_out_data': MatchEventSerializer(ev_out).data,
            'minute': minute,
            'message': f'تعویض رسمی داور: ورود {p_in.name if p_in else ""} به جای {p_out.name if p_out else ""}',
            'match': match_detail
        })

        return Response({'detail': 'تعویض با موفقیت اعمال شد.', 'match': match_detail}, status=status.HTTP_200_OK)


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

def recalculate_tournament_standings(tournament_id):
    """
    Guarantees that persisted LeagueStanding records perfectly and accurately
    match the recorded match results (status='FINISHED') for the specified tournament.
    """
    from .models import Tournament, Match, LeagueStanding
    from teams.models import Team

    tournament = Tournament.objects.filter(id=tournament_id).first()
    if not tournament:
        return

    teams = Team.objects.all()
    stats = {}
    for team in teams:
        stats[team.id] = {
            'team': team,
            'played': 0,
            'won': 0,
            'drawn': 0,
            'lost': 0,
            'goals_for': 0,
            'goals_against': 0,
            'points': 0,
        }

    finished_matches = Match.objects.filter(
        tournament=tournament,
        status='FINISHED',
        home_team__isnull=False,
        away_team__isnull=False
    ).select_related('home_team', 'away_team')

    for match in finished_matches:
        h_id = match.home_team_id
        a_id = match.away_team_id
        hs = match.home_score or 0
        as_ = match.away_score or 0

        if h_id not in stats:
            stats[h_id] = {'team': match.home_team, 'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'goals_for': 0, 'goals_against': 0, 'points': 0}
        if a_id not in stats:
            stats[a_id] = {'team': match.away_team, 'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'goals_for': 0, 'goals_against': 0, 'points': 0}

        stats[h_id]['played'] += 1
        stats[a_id]['played'] += 1
        stats[h_id]['goals_for'] += hs
        stats[h_id]['goals_against'] += as_
        stats[a_id]['goals_for'] += as_
        stats[a_id]['goals_against'] += hs

        if hs > as_:
            stats[h_id]['won'] += 1
            stats[h_id]['points'] += 3
            stats[a_id]['lost'] += 1
        elif hs < as_:
            stats[a_id]['won'] += 1
            stats[a_id]['points'] += 3
            stats[h_id]['lost'] += 1
        else:
            stats[h_id]['drawn'] += 1
            stats[h_id]['points'] += 1
            stats[a_id]['drawn'] += 1
            stats[a_id]['points'] += 1

    for t_id, data in stats.items():
        existing = LeagueStanding.objects.filter(tournament=tournament, team_id=t_id).first()
        deduction = existing.points_deduction if existing else 0
        deduction_reason = existing.points_deduction_reason if existing else ''
        LeagueStanding.objects.update_or_create(
            tournament=tournament,
            team_id=t_id,
            defaults={
                'played': data['played'],
                'won': data['won'],
                'drawn': data['drawn'],
                'lost': data['lost'],
                'goals_for': data['goals_for'],
                'goals_against': data['goals_against'],
                'points': data['points'],
                'points_deduction': deduction,
                'points_deduction_reason': deduction_reason,
                'is_manually_overridden': False,
            }
        )


class TournamentStandingListView(generics.ListAPIView):
    """
    Returns persisted LeagueStanding rows for a tournament,
    sorted by points → goal difference → goals scored → name.
    """
    serializer_class = LeagueStandingSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        tournament_id = self.kwargs['tournament_id']
        try:
            recalculate_tournament_standings(tournament_id)
        except Exception:
            pass

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
    Returns summary of all Gameweeks/Rounds (both League and Cup), tracking completed/live/scheduled matches,
    and identifies the current active Gameweek for auto-progression.
    Optimized with single SQL aggregation and chronological ordering.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Count, Q, Min
        active_tourneys = Tournament.objects.filter(is_active=True, matches__isnull=False).distinct()
        if active_tourneys.exists():
            match_qs = Match.objects.filter(tournament__in=active_tourneys)
        else:
            match_qs = Match.objects.all()

        aggregated_rounds = (
            match_qs
            .values('round_name')
            .annotate(
                total_matches=Count('id'),
                finished_matches=Count('id', filter=Q(status='FINISHED')),
                live_matches=Count('id', filter=Q(status='LIVE')),
                scheduled_matches=Count('id', filter=Q(status='SCHEDULED')),
                first_match_date=Min('date'),
            )
        )

        def extract_round_num(name):
            is_gw, r_num, _ = normalize_round_query(name)
            return r_num if (is_gw and r_num is not None) else 999

        def extract_sort_key(row):
            name = row.get('round_name', '')
            dt = row.get('first_match_date')
            r_num = extract_round_num(name)
            if dt:
                return (0, dt.isoformat())
            return (1, f"{r_num:03d}_{name}")

        sorted_rows = sorted(aggregated_rounds, key=extract_sort_key)
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
                'date': row.get('first_match_date').isoformat() if row.get('first_match_date') else None,
            })

            # 1. First prioritize live matches
            if live > 0 and active_gameweek is None:
                active_gameweek = r_name
            # 2. Or the earliest incomplete gameweek that has scheduled matches
            elif active_gameweek is None and not is_finished and total > 0:
                active_gameweek = r_name

        # If still not found, default to week 1 (gameweeks[0]), or last week only if all are finished
        if not active_gameweek:
            if gameweeks:
                has_matches = any(gw['total_matches'] > 0 for gw in gameweeks)
                all_finished = has_matches and all(gw['is_finished'] for gw in gameweeks if gw['total_matches'] > 0)
                if all_finished:
                    active_gameweek = gameweeks[-1]['round_name']
                else:
                    active_gameweek = gameweeks[0]['round_name']
            else:
                active_gameweek = 'هفته ۱'

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
        tournament_id = self.request.query_params.get('tournament_id')
        tournament_type = self.request.query_params.get('tournament_type')
        is_knockout = self.request.query_params.get('is_knockout')

        qs = Match.objects.all().select_related(
            'home_team__manager', 'away_team__manager',
            'home_team__gameplan', 'away_team__gameplan',
            'tournament'
        ).prefetch_related('gameplans').order_by('date', 'id')

        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        elif tournament_type:
            qs = qs.filter(tournament__tournament_type=tournament_type.upper())

        if is_knockout is not None:
            if str(is_knockout).lower() in ['true', '1']:
                qs = qs.filter(is_knockout=True)
            elif str(is_knockout).lower() in ['false', '0']:
                qs = qs.filter(is_knockout=False)

        if status_filter:
            qs = qs.filter(status=status_filter)

        if round_filter:
            is_gw, r_num, exact_names = normalize_round_query(round_filter)
            if is_gw:
                qs = qs.filter(round_name__in=exact_names)
            else:
                rf_clean = str(round_filter).strip()
                rf_space = rf_clean.replace('\u200c', ' ')
                rf_zwnj = rf_clean.replace(' ', '\u200c')
                qs = qs.filter(
                    Q(round_name__iexact=rf_clean) |
                    Q(round_name__icontains=rf_space) |
                    Q(round_name__icontains=rf_zwnj)
                )
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
        if 'date' in request.data:
            match.date = request.data['date'] if request.data['date'] else None
        if 'home_penalties' in request.data:
            val = request.data['home_penalties']
            match.home_penalties = int(val) if val is not None and str(val).strip() != '' else None
        if 'away_penalties' in request.data:
            val = request.data['away_penalties']
            match.away_penalties = int(val) if val is not None and str(val).strip() != '' else None

        if 'forfeit_winner' in request.data:
            winner_side = request.data['forfeit_winner']
            if winner_side == 'HOME':
                match.home_score = 3
                match.away_score = 0
            elif winner_side == 'AWAY':
                match.home_score = 0
                match.away_score = 3
            match.status = 'FINISHED'
            match.half_status = 'FINISHED'

        match.save()

        advance_result = None
        if match.is_knockout and match.status == 'FINISHED':
            from .cup_engine import advance_winner
            try:
                advance_result = advance_winner(match)
            except Exception as e:
                advance_result = {'success': False, 'error': str(e)}

        if match.tournament_id and not match.is_knockout:
            try:
                recalculate_tournament_standings(match.tournament_id)
            except Exception:
                pass

        # Broadcast update to clients
        broadcast_match_event(match_id, {
            'type': 'status_update',
            'half_status': match.half_status,
            'status': match.status,
            'home_score': match.home_score,
            'away_score': match.away_score,
            'home_penalties': match.home_penalties,
            'away_penalties': match.away_penalties,
            'advance_result': advance_result
        })

        match_data = MatchSerializer(match).data
        return Response({
            'success': True,
            'match': match_data,
            'advance_result': advance_result,
            **match_data
        }, status=status.HTTP_200_OK)

    def post(self, request, match_id):
        return self.put(request, match_id)

    def patch(self, request, match_id):
        return self.put(request, match_id)


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
        tournament_id = self.request.query_params.get('tournament_id')

        if tournament_id:
            qs = Match.objects.filter(tournament_id=tournament_id)
        elif self.request.query_params.get('tournament_type'):
            t_type = self.request.query_params.get('tournament_type').upper()
            qs = Match.objects.filter(tournament__tournament_type=t_type)
        else:
            # Return all matches from active tournaments (both League and Cup)
            active_tourneys = Tournament.objects.filter(is_active=True, matches__isnull=False).distinct()
            if active_tourneys.exists():
                qs = Match.objects.filter(tournament__in=active_tourneys)
            else:
                qs = Match.objects.all()

        qs = qs.select_related(
            'home_team__manager', 'away_team__manager',
            'home_team__gameplan', 'away_team__gameplan',
            'tournament'
        ).prefetch_related('gameplans').order_by('date', 'id')

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
        active_match = Match.objects.filter(status='LIVE').select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('date', 'id').first()
        next_match = Match.objects.filter(status='SCHEDULED').select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('date', 'id').first()
        recent_finished_match = Match.objects.filter(status='FINISHED').select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('-date', '-id').first()

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

        team_active_match = None
        team_next_match = None
        team_recent_finished_match = None
        team_time_to_kickoff = None
        team_is_within_reminder = False

        if user_team:
            team_active_match = Match.objects.filter(
                Q(home_team=user_team) | Q(away_team=user_team),
                status='LIVE'
            ).select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('date', 'id').first()

            team_next_match = Match.objects.filter(
                Q(home_team=user_team) | Q(away_team=user_team),
                status='SCHEDULED'
            ).select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('date', 'id').first()

            team_recent_finished_match = Match.objects.filter(
                Q(home_team=user_team) | Q(away_team=user_team),
                status='FINISHED'
            ).select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament').order_by('-date', '-id').first()

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
            'has_team_active_match': team_active_match is not None,
            'team_active_match': MatchDetailSerializer(team_active_match).data if team_active_match else None,
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
            Match.objects.select_related('home_team', 'away_team', 'home_team__manager', 'away_team__manager', 'tournament'),
            id=match_id
        )
        events = MatchEvent.objects.filter(match=match).select_related('player', 'player__team', 'team').order_by('-id')

        home_subs = MatchEvent.objects.filter(match=match, player__team_id=match.home_team_id, event_type='SUB_IN').count()
        away_subs = MatchEvent.objects.filter(match=match, player__team_id=match.away_team_id, event_type='SUB_IN').count()

        return Response({
            'match': MatchDetailSerializer(match).data,
            'events': MatchEventSerializer(events, many=True).data,
            'home_subs_used': home_subs,
            'away_subs_used': away_subs,
            'max_subs': 5
        }, status=status.HTTP_200_OK)


def apply_substitution_to_match_gameplan(match, team, p_out, p_in):
    """
    Updates the match-specific MatchGamePlan.players_data so that p_out is moved to bench
    and p_in takes p_out's starting position and pitch coordinates.
    """
    try:
        from .models import MatchGamePlan
        mgp = MatchGamePlan.objects.filter(match=match, team=team).first()
        if not mgp:
            return
        
        players_data = list(mgp.players_data or [])
        out_id_str = str(p_out.id)
        in_id_str = str(p_in.id)
        
        out_item = None
        in_item = None
        for item in players_data:
            pid = str(item.get('player_id') or item.get('id') or '')
            if pid == out_id_str:
                out_item = item
            elif pid == in_id_str:
                in_item = item
                
        if out_item:
            coord_x = out_item.get('x_coord', 50)
            coord_y = out_item.get('y_coord', 50)
            pos = out_item.get('position', getattr(p_in, 'position', 'SUB'))
            
            out_item['is_starting'] = False
            if in_item:
                in_item['is_starting'] = True
                in_item['x_coord'] = coord_x
                in_item['y_coord'] = coord_y
                in_item['position'] = pos
            else:
                players_data.append({
                    'player_id': p_in.id,
                    'id': p_in.id,
                    'is_starting': True,
                    'x_coord': coord_x,
                    'y_coord': coord_y,
                    'position': pos,
                })
            mgp.players_data = players_data
            mgp.save(update_fields=['players_data'])
    except Exception as e:
        print("Error updating MatchGamePlan on substitution:", e)


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
            match.current_minute = 90 if match.half_status in ['1ST_HALF', '2ND_HALF', 'HALF_TIME'] else (match.current_minute or 90)
            match.save()

            from teams.stamina_engine import apply_post_match_fatigue
            try:
                apply_post_match_fatigue(match)
            except Exception:
                pass

            advance_result = None
            if match.is_knockout:
                from .cup_engine import advance_winner
                try:
                    advance_result = advance_winner(match)
                except Exception as e:
                    advance_result = {'success': False, 'error': str(e)}

            broadcast_match_event(match_id, {
                'type': 'match_finished',
                'status': 'FINISHED',
                'half_status': 'FINISHED',
                'current_minute': match.current_minute,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'home_penalties': match.home_penalties,
                'away_penalties': match.away_penalties,
                'advance_result': advance_result,
                'message': f'مسابقه با نتیجه نهایی {match.home_score} - {match.away_score} به پایان رسید ⏹️'
            })
            return Response({
                'status': 'FINISHED',
                'half_status': 'FINISHED',
                'match': MatchDetailSerializer(match).data,
                'advance_result': advance_result
            })

        # 5b. START EXTRA TIME (ET)
        elif action == 'START_EXTRA_TIME':
            match.status = 'LIVE'
            match.half_status = 'EXTRA_TIME'
            match.current_minute = int(request.data.get('minute', 91))
            match.stoppage_time = 0
            match.save()

            broadcast_match_event(match_id, {
                'type': 'extra_time_started',
                'status': 'LIVE',
                'half_status': 'EXTRA_TIME',
                'current_minute': match.current_minute,
                'stoppage_time': 0,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': 'وقت اضافه مسابقه حذفی آغاز شد! ⏱️'
            })
            return Response({'status': 'LIVE', 'half_status': 'EXTRA_TIME', 'match': MatchDetailSerializer(match).data})

        # 5c. START PENALTIES (PK)
        elif action == 'START_PENALTIES':
            match.status = 'LIVE'
            match.half_status = 'PENALTIES'
            match.current_minute = 120
            match.stoppage_time = 0
            match.save()

            broadcast_match_event(match_id, {
                'type': 'penalties_started',
                'status': 'LIVE',
                'half_status': 'PENALTIES',
                'current_minute': 120,
                'stoppage_time': 0,
                'home_score': match.home_score,
                'away_score': match.away_score,
                'message': 'ضربات پنالتی حساس آغاز شد! 🥅'
            })
            return Response({'status': 'LIVE', 'half_status': 'PENALTIES', 'match': MatchDetailSerializer(match).data})

        # 5d. RECORD PENALTY SHOOTOUT
        elif action == 'RECORD_PENALTY_SHOOTOUT':
            home_p = request.data.get('home_penalties')
            away_p = request.data.get('away_penalties')
            if home_p is not None:
                match.home_penalties = int(home_p)
            if away_p is not None:
                match.away_penalties = int(away_p)
            match.save(update_fields=['home_penalties', 'away_penalties'])

            broadcast_match_event(match_id, {
                'type': 'penalty_shootout_update',
                'home_penalties': match.home_penalties,
                'away_penalties': match.away_penalties,
                'match': MatchDetailSerializer(match).data
            })
            return Response({'status': 'penalties_updated', 'match': MatchDetailSerializer(match).data})

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

            # If red card is issued, immediately apply suspension and auto-replace starter for next match
            if event_type in ['RED', 'SECOND_YELLOW'] and player:
                suspension_add = 1 if event_type == 'SECOND_YELLOW' else 2
                player.suspension_matches += suspension_add
                player.save(update_fields=['suspension_matches'])
                if player.team:
                    from teams.lineup_services import auto_replace_ineligible_starters
                    auto_replace_ineligible_starters(player.team)

            # If injury is issued, mark player injured for 2 matches and auto-replace starter
            if event_type == 'INJURY' and player:
                player.is_injured = True
                player.injury_matches = 2
                player.save(update_fields=['is_injured', 'injury_matches'])
                if player.team:
                    from teams.lineup_services import auto_replace_ineligible_starters
                    auto_replace_ineligible_starters(player.team)

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
                elif ev.event_type == 'INJURY' and ev.player:
                    has_other_injury = MatchEvent.objects.filter(
                        match=match, player=ev.player, event_type='INJURY', is_undone=False
                    ).exclude(id=ev.id).exists()
                    if not has_other_injury:
                        ev.player.is_injured = False
                        ev.player.injury_matches = 0
                        ev.player.save(update_fields=['is_injured', 'injury_matches'])

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

            apply_substitution_to_match_gameplan(match, target_team, p_out, p_in)

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

            apply_substitution_to_match_gameplan(match, sub_req.team, sub_req.player_out, sub_req.player_in)

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
            'match_id': match.id,
            'team_id': team.id,
            'team_name': team.name,
            'changes': serialized,
            'match': match_detail
        })

        try:
            from realtime.events import notify_admin
            notify_admin({
                'type': 'new_in_game_change',
                'title': f'درخواست تغییرات حین بازی: {team.name}',
                'body': f'{len(created_objs)} مورد تغییرات جدید توسط سرمربی {team.name} ارسال شد.',
                'match_id': match.id,
                'team_id': team.id,
                'team_name': team.name,
                'changes': serialized,
            })
        except Exception:
            pass

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
                apply_substitution_to_match_gameplan(match, change.team, p_out, p_in)

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


# =====================================================================
# Comprehensive League & Knockout Cup Management Views
# =====================================================================

def parse_time_slots(raw_slots):
    """
    Parses and standardizes time slots from frontend request.
    Handles 'HH:MM' strings, [hour, minute] arrays, or tuple formats,
    sorting them chronologically.
    """
    if not raw_slots or not isinstance(raw_slots, list):
        return None
    time_slots = []
    for slot in raw_slots:
        if isinstance(slot, str) and ':' in slot:
            parts = slot.strip().split(':')
            try:
                h = int(parts[0])
                m = int(parts[1])
                time_slots.append((h, m))
            except (ValueError, IndexError):
                pass
        elif isinstance(slot, (list, tuple)) and len(slot) == 2:
            try:
                time_slots.append((int(slot[0]), int(slot[1])))
            except (ValueError, TypeError):
                pass
    if time_slots:
        time_slots.sort(key=lambda s: s[0] * 60 + s[1])
    return time_slots or None


class AdminLeagueConfigureView(APIView):
    """
    Admin endpoint to configure and generate league fixtures with full custom parameters.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        from .fixture_engine import generate_league_fixtures, DEFAULT_START_DATE
        import datetime

        league_name = request.data.get('name', 'مستر لیگ مجازی')
        start_date_str = request.data.get('start_date')
        days_between_rounds = int(request.data.get('days_between_rounds', 1))
        is_double_round_robin = request.data.get('is_double_round_robin', True)
        clear_existing = request.data.get('clear_existing', True)
        team_ids = request.data.get('team_ids')

        start_date = None
        if start_date_str:
            try:
                start_date = datetime.datetime.strptime(str(start_date_str).strip(), '%Y-%m-%d').date()
            except ValueError:
                start_date = DEFAULT_START_DATE
        else:
            start_date = DEFAULT_START_DATE

        time_slots = parse_time_slots(request.data.get('time_slots'))

        season, _ = Season.objects.get_or_create(
            is_active=True,
            defaults={'name': 'فصل ۱۴۰۵', 'started_at': timezone.now()}
        )

        tournament, _ = Tournament.objects.get_or_create(
            name=league_name,
            tournament_type='LEAGUE',
            defaults={'season': season, 'is_active': True}
        )

        if clear_existing:
            Match.objects.filter(tournament=tournament).delete()
            Match.objects.filter(is_knockout=False).delete()
            LeagueStanding.objects.filter(tournament=tournament).delete()

        if team_ids and isinstance(team_ids, list):
            teams = Team.objects.filter(id__in=team_ids, is_active=True).order_by('id')
        else:
            teams = Team.objects.filter(is_active=True).order_by('id')

        reserve_cup_days = request.data.get('reserve_cup_days', request.data.get('skip_fridays', True))
        if isinstance(reserve_cup_days, str):
            reserve_cup_days = (reserve_cup_days.lower() in ['true', '1', 'yes'])

        interval_gameweeks = int(request.data.get('interval_gameweeks', 6))

        count = generate_league_fixtures(
            tournament=tournament,
            teams=teams,
            start_date=start_date,
            days_between_rounds=days_between_rounds,
            time_slots=time_slots,
            is_double_round_robin=is_double_round_robin,
            reserve_cup_days=reserve_cup_days,
            interval_gameweeks=interval_gameweeks,
            clear_existing=clear_existing
        )

        from realtime.events import broadcast_global_event
        broadcast_global_event('league_schedule_updated', {
            'action': 'FIXTURES_GENERATED',
            'tournament_id': tournament.id,
            'matches_count': count
        })

        return Response({
            'status': 'success',
            'message': f'برنامه مسابقات لیگ با {count} مسابقه با موفقیت تولید و ذخیره شد.',
            'tournament_id': tournament.id,
            'tournament_name': tournament.name,
            'matches_count': count,
            'teams_count': teams.count(),
            'start_date': str(start_date)
        }, status=status.HTTP_201_CREATED)


class AdminLeagueResetView(APIView):
    """
    Admin endpoint to completely purge/reset all League matches, results, and standings,
    returning the system to a clean, fresh state ready for fixture re-generation.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        league_id = request.data.get('league_id')
        with transaction.atomic():
            m_qs = Match.objects.filter(is_knockout=False)
            deleted_matches_count = m_qs.count()
            m_qs.delete()
            LeagueStanding.objects.all().delete()

        from realtime.events import broadcast_global_event
        broadcast_global_event('league_schedule_updated', {
            'action': 'LEAGUE_RESET',
            'deleted_matches_count': deleted_matches_count
        })

        return Response({
            'status': 'success',
            'message': f'تمامی {deleted_matches_count} مسابقه لیگ و جدول رده‌بندی با موفقیت حذف شدند و سیستم به حالت خام بازگشت.',
            'deleted_matches_count': deleted_matches_count
        }, status=status.HTTP_200_OK)


class AdminGameweekActionView(APIView):
    """
    Admin control actions on a specific gameweek/round:
    - LOCK_TACTICS: Lock gameplan submissions
    - UNLOCK_TACTICS: Re-open gameplan submissions
    - AUTO_FORFEIT_UNSUBMITTED: Automatically award 3-0 forfeit against teams that didn't submit tactics
    - NOTIFY_COACHES: Send high-priority notification to coaches of this gameweek
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        action = request.data.get('action')
        gameweek = request.data.get('gameweek', 'هفته ۱')
        tournament_id = request.data.get('tournament_id')

        if not action or not gameweek:
            return Response({'error': 'action and gameweek are required.'}, status=status.HTTP_400_BAD_REQUEST)

        match_qs = Match.objects.filter(round_name__iexact=gameweek)
        if tournament_id:
            match_qs = match_qs.filter(tournament_id=tournament_id)

        if not match_qs.exists():
            return Response({'error': f'هیچ مسابقه‌ای برای «{gameweek}» یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        from realtime.events import broadcast_global_event

        if action == 'LOCK_TACTICS':
            # Mark gameplans as locked / freeze submissions
            for m in match_qs:
                if m.home_team and hasattr(m.home_team, 'gameplan'):
                    m.home_team.gameplan.is_submitted = True
                    m.home_team.gameplan.save(update_fields=['is_submitted'])
                if m.away_team and hasattr(m.away_team, 'gameplan'):
                    m.away_team.gameplan.is_submitted = True
                    m.away_team.gameplan.save(update_fields=['is_submitted'])
                m.gameplans.all().update(is_submitted=True)
            broadcast_global_event('league_schedule_updated', {'action': 'LOCK_TACTICS', 'gameweek': gameweek})
            return Response({'status': 'success', 'message': f'مهلت ثبت تاکتیک برای {gameweek} با موفقیت قفل شد.'})

        elif action == 'UNLOCK_TACTICS':
            for m in match_qs:
                if m.home_team and hasattr(m.home_team, 'gameplan'):
                    m.home_team.gameplan.is_submitted = False
                    m.home_team.gameplan.save(update_fields=['is_submitted'])
                if m.away_team and hasattr(m.away_team, 'gameplan'):
                    m.away_team.gameplan.is_submitted = False
                    m.away_team.gameplan.save(update_fields=['is_submitted'])
                m.gameplans.all().update(is_submitted=False)
            broadcast_global_event('league_schedule_updated', {'action': 'UNLOCK_TACTICS', 'gameweek': gameweek})
            return Response({'status': 'success', 'message': f'ارسال ترکیب برای {gameweek} مجدداً باز شد.'})

        elif action == 'NOTIFY_COACHES':
            from notifications.models import Notification
            notified_count = 0
            for m in match_qs:
                for team in [m.home_team, m.away_team]:
                    if team and team.manager:
                        Notification.objects.create(
                            user=team.manager,
                            title=f"⏰ مهلت ارسال تاکتیک {gameweek}",
                            message=f"سرمربی گرامی {team.name}، لطفاً هرچه سریع‌تر تاکتیک و ترکیب خود را برای مسابقه پیش‌رو ثبت نمایید.",
                            type='MATCH'
                        )
                        notified_count += 1
            return Response({'status': 'success', 'message': f'اعلان برای {notified_count} مربی با موفقیت ارسال شد.'})

        elif action == 'AUTO_FORFEIT_UNSUBMITTED':
            forfeited = []
            for m in match_qs.filter(status='SCHEDULED'):
                home_sub = getattr(m.home_team, 'gameplan', None)
                away_sub = getattr(m.away_team, 'gameplan', None)
                home_ready = home_sub and home_sub.is_submitted
                away_ready = away_sub and away_sub.is_submitted

                if not home_ready and away_ready:
                    m.home_score = 0
                    m.away_score = 3
                    m.status = 'FINISHED'
                    m.half_status = 'FINISHED'
                    m.save(update_fields=['home_score', 'away_score', 'status', 'half_status'])
                    forfeited.append(f"{m.home_team.name} (0-3 باخت فنی)")
                elif home_ready and not away_ready:
                    m.home_score = 3
                    m.away_score = 0
                    m.status = 'FINISHED'
                    m.half_status = 'FINISHED'
                    m.save(update_fields=['home_score', 'away_score', 'status', 'half_status'])
                    forfeited.append(f"{m.away_team.name} (3-0 باخت فنی)")

            return Response({
                'status': 'success',
                'message': f'باخت فنی برای {len(forfeited)} مسابقه ثبت شد.',
                'forfeited': forfeited
            })

        return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


class AdminCupTournamentView(APIView):
    """
    CRUD endpoint for Knockout Cup Tournaments.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        from .cup_engine import serialize_cup_bracket
        cups = Tournament.objects.filter(tournament_type='CUP').order_by('-created_at')
        res = []
        for c in cups:
            bracket_data = serialize_cup_bracket(c)
            total_matches = c.matches.count()
            finished_matches = c.matches.filter(status='FINISHED').count()
            res.append({
                'id': c.id,
                'name': c.name,
                'is_active': c.is_active,
                'created_at': c.created_at.isoformat(),
                'total_matches': total_matches,
                'finished_matches': finished_matches,
                'bracket': bracket_data
            })
        return Response(res, status=status.HTTP_200_OK)

    def post(self, request):
        from .cup_engine import generate_cup_bracket
        import datetime

        cup_name = request.data.get('name', 'جام حذفی مستر لیگ')
        start_date_str = request.data.get('start_date')
        team_ids = request.data.get('team_ids')
        days_between_rounds = int(request.data.get('days_between_rounds', 3))

        start_date = None
        if start_date_str:
            try:
                start_date = datetime.datetime.strptime(str(start_date_str).strip(), '%Y-%m-%d').date()
            except ValueError:
                start_date = datetime.date.today() + datetime.timedelta(days=1)
        else:
            start_date = datetime.date.today() + datetime.timedelta(days=1)

        season, _ = Season.objects.get_or_create(
            is_active=True,
            defaults={'name': 'فصل ۱۴۰۵', 'started_at': timezone.now()}
        )

        tournament = Tournament.objects.create(
            name=cup_name,
            tournament_type='CUP',
            season=season,
            is_active=True
        )

        if team_ids and isinstance(team_ids, list):
            teams = list(Team.objects.filter(id__in=team_ids).order_by('id'))
        else:
            # Pick top 16 or 8 teams
            all_teams = list(Team.objects.filter(is_active=True).order_by('id'))
            target_count = 16 if len(all_teams) >= 16 else (8 if len(all_teams) >= 8 else 4)
            teams = all_teams[:target_count]

        import math
        if len(teams) < 2:
            return Response({'error': 'حداقل ۲ تیم برای ایجاد جام حذفی مورد نیاز است.'}, status=status.HTTP_400_BAD_REQUEST)

        if not math.log2(len(teams)).is_integer():
            return Response(
                {'error': f'تعداد تیم‌های انتخابی ({len(teams)} تیم) باید توانی از ۲ باشد (مثلاً ۴، ۸، ۱۶ یا ۳۲ تیم).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        time_slots = parse_time_slots(request.data.get('time_slots'))
        interval_gameweeks = int(request.data.get('interval_gameweeks', request.data.get('days_between_rounds', 6)))

        bracket_result = generate_cup_bracket(
            tournament=tournament,
            teams=teams,
            start_date=start_date,
            time_slots=time_slots,
            days_between_rounds=days_between_rounds,
            clear_existing=True
        )

        # Automatically synchronize Cup dates with active League schedule (gap days)
        from .fixture_engine import interleave_cup_with_league
        active_league = (
            Tournament.objects.filter(tournament_type='LEAGUE', is_active=True, matches__isnull=False)
            .distinct()
            .order_by('-id')
            .first()
        )
        if active_league:
            try:
                interleave_cup_with_league(
                    league_tournament=active_league,
                    cup_tournament=tournament,
                    interval_gameweeks=interval_gameweeks,
                    time_slots=time_slots
                )
            except Exception:
                pass

        return Response({
            'status': 'success',
            'message': f'تورنمنت جام حذفی «{cup_name}» با موفقیت ایجاد و با لیگ سینک شد.',
            'tournament_id': tournament.id,
            'bracket_result': bracket_result
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, cup_id=None):
        target_id = cup_id or request.data.get('tournament_id')
        if not target_id:
            return Response({'error': 'tournament_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        tournament = get_object_or_404(Tournament, id=target_id, tournament_type='CUP')
        tournament.delete()
        from realtime.events import broadcast_global_event
        broadcast_global_event('league_schedule_updated', {'action': 'CUP_DELETED', 'cup_id': target_id})
        return Response({'status': 'success', 'message': 'تورنمنت جام حذفی با موفقیت حذف گردید.'}, status=status.HTTP_200_OK)


class AdminCupResetView(APIView):
    """
    Admin endpoint to completely purge/reset Knockout Cup tournament(s) and all knockout matches,
    returning the cup system to a clean, fresh state ready for re-creation.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        cup_id = request.data.get('cup_id')
        with transaction.atomic():
            if cup_id:
                cup_tourneys = Tournament.objects.filter(id=cup_id, tournament_type='CUP')
                m_qs = Match.objects.filter(tournament__in=cup_tourneys)
            else:
                cup_tourneys = Tournament.objects.filter(tournament_type='CUP')
                m_qs = Match.objects.filter(is_knockout=True)

            deleted_matches_count = m_qs.count()
            m_qs.delete()
            deleted_cups_count = cup_tourneys.count()
            cup_tourneys.delete()

        from realtime.events import broadcast_global_event
        broadcast_global_event('league_schedule_updated', {
            'action': 'CUP_RESET',
            'deleted_matches_count': deleted_matches_count,
            'deleted_cups_count': deleted_cups_count
        })

        return Response({
            'status': 'success',
            'message': f'تمامی {deleted_matches_count} مسابقه جام حذفی با موفقیت پاکسازی شدند و سیستم به حالت خام بازگشت.',
            'deleted_matches_count': deleted_matches_count,
            'deleted_cups_count': deleted_cups_count
        }, status=status.HTTP_200_OK)


class AdminCupBracketView(APIView):
    """
    Returns full visual bracket tree for a cup tournament or forces advance of a winner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, tournament_id):
        from .cup_engine import serialize_cup_bracket
        tournament = get_object_or_404(Tournament, id=tournament_id)
        data = serialize_cup_bracket(tournament)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, match_id):
        from .cup_engine import advance_winner
        match = get_object_or_404(Match, id=match_id)
        res = advance_winner(match)
        return Response(res, status=status.HTTP_200_OK if res.get('success') else status.HTTP_400_BAD_REQUEST)


class AdminSyncCupLeagueView(APIView):
    """
    Synchronizes and interleaves Cup tournament dates with League gameweek schedule.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        from .fixture_engine import interleave_cup_with_league

        league_id = request.data.get('league_id')
        cup_id = request.data.get('cup_id')
        interval = int(request.data.get('interval_gameweeks', 4))
        time_slots = parse_time_slots(request.data.get('time_slots'))

        if league_id:
            league_tourney = get_object_or_404(Tournament, id=league_id, tournament_type='LEAGUE')
        else:
            league_tourney = Tournament.objects.filter(tournament_type='LEAGUE').first()

        if cup_id:
            cup_tourney = get_object_or_404(Tournament, id=cup_id, tournament_type='CUP')
        else:
            cup_tourney = Tournament.objects.filter(tournament_type='CUP').first()

        if not league_tourney or not cup_tourney:
            return Response({'error': 'هر دو تورنمنت لیگ و جام حذفی باید موجود باشند.'}, status=status.HTTP_400_BAD_REQUEST)

        res = interleave_cup_with_league(league_tourney, cup_tourney, interval_gameweeks=interval, time_slots=time_slots)
        return Response(res, status=status.HTTP_200_OK if res.get('success') else status.HTTP_400_BAD_REQUEST)


class AdminMatchForfeitView(APIView):
    """
    Registers a 3-0 forfeit for either home or away team and auto-processes standings.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        forfeit_target = request.data.get('forfeit_team', 'home')  # 'home' or 'away'

        if forfeit_target == 'home':
            match.home_score = 0
            match.away_score = 3
        else:
            match.home_score = 3
            match.away_score = 0

        match.status = 'FINISHED'
        match.half_status = 'FINISHED'
        match.save(update_fields=['home_score', 'away_score', 'status', 'half_status'])

        if match.tournament and match.tournament.tournament_type == 'LEAGUE':
            from .views import update_standings_for_match
            update_standings_for_match(match)

        if match.is_knockout:
            from .cup_engine import advance_winner
            advance_winner(match)

        return Response({
            'status': 'success',
            'message': f'باخت فنی ۳-۰ با موفقیت برای تیم {forfeit_target} ثبت شد.',
            'match': MatchDetailSerializer(match).data
        }, status=status.HTTP_200_OK)


class AdminStandingsManualEditView(APIView):
    """
    Allows admin to directly and manually override a team's league standing row
    (played, won, drawn, lost, gf, ga, points, points_deduction, points_deduction_reason).
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        standing_id = request.data.get('standing_id')
        team_id = request.data.get('team_id')
        tournament_id = request.data.get('tournament_id')

        standing = None
        if standing_id:
            standing = LeagueStanding.objects.filter(id=standing_id).first()
        elif team_id and tournament_id:
            standing = LeagueStanding.objects.filter(team_id=team_id, tournament_id=tournament_id).first()
        elif team_id:
            # Pick the active league tournament
            tourney = Tournament.objects.filter(tournament_type='LEAGUE', is_active=True).first()
            if tourney:
                standing = LeagueStanding.objects.filter(team_id=team_id, tournament=tourney).first()

        if not standing:
            if not team_id:
                return Response({'error': 'شناسه تیم مشخص نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
            tourney = Tournament.objects.filter(id=tournament_id).first() if tournament_id else Tournament.objects.filter(tournament_type='LEAGUE', is_active=True).first()
            if not tourney:
                tourney = Tournament.objects.first()
            team = get_object_or_404(Team, id=team_id)
            standing = LeagueStanding.objects.create(tournament=tourney, team=team)

        # Update fields if provided
        if 'played' in request.data:
            standing.played = int(request.data['played'])
        if 'won' in request.data:
            standing.won = int(request.data['won'])
        if 'drawn' in request.data:
            standing.drawn = int(request.data['drawn'])
        if 'lost' in request.data:
            standing.lost = int(request.data['lost'])
        if 'gf' in request.data or 'goals_for' in request.data:
            standing.goals_for = int(request.data.get('gf') if 'gf' in request.data else request.data['goals_for'])
        if 'ga' in request.data or 'goals_against' in request.data:
            standing.goals_against = int(request.data.get('ga') if 'ga' in request.data else request.data['goals_against'])
        if 'raw_points' in request.data or 'points' in request.data:
            standing.points = int(request.data.get('raw_points') if 'raw_points' in request.data else request.data['points'])
        if 'points_deduction' in request.data:
            standing.points_deduction = max(0, int(request.data['points_deduction']))
        if 'points_deduction_reason' in request.data:
            standing.points_deduction_reason = str(request.data['points_deduction_reason']).strip()

        standing.is_manually_overridden = True
        standing.save()

        # Broadcast update to connected clients
        try:
            from realtime.events import broadcast_global_event
            broadcast_global_event('league_schedule_updated', {
                'action': 'STANDINGS_MANUAL_EDIT',
                'team_id': standing.team_id,
            })
        except Exception:
            pass

        return Response({
            'status': 'success',
            'message': f'جدول رده‌بندی برای تیم «{standing.team.name}» با موفقیت ویرایش و ذخیره شد.',
            'standing': LeagueStandingSerializer(standing).data
        }, status=status.HTTP_200_OK)


class AdminStandingsApplyPenaltyView(APIView):
    """
    Applies or updates a points deduction penalty on a specific team in the league.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        standing_id = request.data.get('standing_id')
        team_id = request.data.get('team_id')
        tournament_id = request.data.get('tournament_id')
        points_deduction = int(request.data.get('points_deduction', 0))
        points_deduction_reason = str(request.data.get('points_deduction_reason', '')).strip()

        standing = None
        if standing_id:
            standing = LeagueStanding.objects.filter(id=standing_id).first()
        elif team_id:
            tourney = Tournament.objects.filter(id=tournament_id).first() if tournament_id else Tournament.objects.filter(tournament_type='LEAGUE', is_active=True).first()
            if not tourney:
                tourney = Tournament.objects.first()
            team = get_object_or_404(Team, id=team_id)
            standing, _ = LeagueStanding.objects.get_or_create(tournament=tourney, team=team)

        if not standing:
            return Response({'error': 'رکورد جدول لیگ یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        standing.points_deduction = max(0, points_deduction)
        standing.points_deduction_reason = points_deduction_reason
        standing.save(update_fields=['points_deduction', 'points_deduction_reason'])

        try:
            from realtime.events import broadcast_global_event
            broadcast_global_event('league_schedule_updated', {
                'action': 'STANDINGS_PENALTY_UPDATED',
                'team_id': standing.team_id,
                'points_deduction': standing.points_deduction,
                'points_deduction_reason': standing.points_deduction_reason
            })
        except Exception:
            pass

        action_msg = f'جریمه کسر {standing.points_deduction} امتیاز برای تیم «{standing.team.name}» با موفقیت اعمال شد.' if standing.points_deduction > 0 else f'جریمه کسر امتیاز تیم «{standing.team.name}» با موفقیت پاک شد.'

        return Response({
            'status': 'success',
            'message': action_msg,
            'standing': LeagueStandingSerializer(standing).data
        }, status=status.HTTP_200_OK)


class AdminStandingsRecalculateView(APIView):
    """
    Recalculates league standings from actual match results while preserving active point deductions.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request):
        tournament_id = request.data.get('tournament_id')
        tournament = None
        if tournament_id:
            tournament = Tournament.objects.filter(id=tournament_id).first()
        if not tournament:
            tournament = Tournament.objects.filter(tournament_type='LEAGUE', is_active=True).first()
        if not tournament:
            tournament = Tournament.objects.filter(tournament_type='LEAGUE').first()
        if not tournament:
            tournament = Tournament.objects.first()

        if not tournament:
            return Response({'error': 'هیچ لیگ فعالی یافت نشد.'}, status=status.HTTP_400_BAD_REQUEST)

        recalculate_tournament_standings(tournament.id)

        try:
            from realtime.events import broadcast_global_event
            broadcast_global_event('league_schedule_updated', {
                'action': 'STANDINGS_RECALCULATED',
                'tournament_id': tournament.id
            })
        except Exception:
            pass

        qs = LeagueStanding.objects.filter(tournament=tournament, team__is_active=True).select_related('team')
        standings = LeagueStandingSerializer(qs, many=True).data
        standings.sort(key=lambda x: (-x['points'], -x['gd'], -x['gf'], x['name']))
        for idx, row in enumerate(standings, start=1):
            row['rank'] = idx

        return Response({
            'status': 'success',
            'message': f'جدول رده‌بندی لیگ «{tournament.name}» با موفقیت از روی نتایج واقعی تمام بازی‌ها بازسازی و محاسبه مجدد شد.',
            'standings': standings
        }, status=status.HTTP_200_OK)





