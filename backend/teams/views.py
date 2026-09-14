from decimal import Decimal, InvalidOperation
from django.conf import settings
from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, Player, ClubFacilities, TeamGamePlan, ClubPenalty
from .serializers import (
    TeamSerializer, TeamListSerializer, PlayerSerializer, GamePlanUpdateSerializer, 
    ClubFacilitiesSerializer, TeamGamePlanSerializer, ClubPenaltySerializer, resolve_player_photo_url
)


class IsAdminOrDebug(permissions.BasePermission):
    """
    Locks down admin-only actions in production.

    While DEBUG is enabled (local development / the E2E test harness) the
    endpoints stay open for convenience and for the anonymous E2E suite;
    once DEBUG is off, only authenticated admins (is_staff / is_superuser
    / role='admin') may call them.
    """

    def has_permission(self, request, view):
        if getattr(settings, 'DEBUG', False):
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin')
        )

# Global Live Stream Config Storage (Default to Aparat VML.Emad)
LIVE_STREAM_CONFIG = {
    'embed_url': 'https://www.aparat.com/embed/live/VML.Emad',
    'channel_name': 'VML.Emad',
    'title': 'پخش زنده رسمی لیگ مجازی مستر لیگ',
    'is_live': True,
}

class PositionChoicesView(views.APIView):
    """
    Returns available player positions dynamically.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(dict(Player.POSITIONS))

from .permissions import IsManagerOrAdminOrReadOnly

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().select_related('manager', 'facilities', 'gameplan')
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdminOrReadOnly]

    def get_queryset(self):
        qs = Team.objects.all().select_related('manager', 'facilities', 'gameplan')
        if self.action != 'list' or self.request.query_params.get('include_players') == 'true':
            qs = qs.prefetch_related('players')
        return qs

    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('include_players') != 'true':
            return TeamListSerializer
        return TeamSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'live_stream']:
            return [permissions.AllowAny()]
        if self.action == 'submit_gameplan' and self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsManagerOrAdminOrReadOnly()]

    def get_throttles(self):
        if self.action in ['admin_adjust_budget', 'admin_override_facility', 'admin_update_player', 'admin_register_coach']:
            self.throttle_scope = 'admin_action'
        elif self.action in ['update_gameplan', 'submit_gameplan']:
            self.throttle_scope = 'substitution'
        else:
            self.throttle_scope = None
        return super().get_throttles()

    @action(detail=False, methods=['get', 'post'])
    def live_stream(self, request):
        if request.method == 'POST':
            embed_url = request.data.get('embed_url')
            if embed_url:
                LIVE_STREAM_CONFIG['embed_url'] = embed_url
            return Response({'status': 'Live stream config updated', 'config': LIVE_STREAM_CONFIG})
        return Response(LIVE_STREAM_CONFIG)
    
    @action(detail=True, methods=['post'])
    def update_gameplan(self, request, pk=None):
        team = self.get_object()
        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if not is_admin and team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای تغییر تاکتیک این تیم را ندارید.")
        serializer = GamePlanUpdateSerializer(data=request.data, many=True)
        if serializer.is_valid():
            player_ids = [item['player_id'] for item in serializer.validated_data if 'player_id' in item]
            players_map = {p.id: p for p in Player.objects.filter(id__in=player_ids, team=team)}
            to_update = []
            for item in serializer.validated_data:
                player = players_map.get(item.get('player_id'))
                if player:
                    player.x_coord = item.get('x_coord', player.x_coord)
                    player.y_coord = item.get('y_coord', player.y_coord)
                    player.is_starting = item.get('is_starting', player.is_starting)
                    to_update.append(player)
            if to_update:
                Player.objects.bulk_update(to_update, ['x_coord', 'y_coord', 'is_starting'])
            return Response({'status': 'Game plan updated successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def submit_gameplan(self, request, pk=None):
        team = self.get_object()
        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if request.method == 'POST' and not is_admin and team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای تغییر تاکتیک این تیم را ندارید.")
        
        from matches.models import Match, MatchGamePlan
        from matches.serializers import MatchGamePlanSerializer
        from django.db.models import Q

        # Discover target match (either explicitly passed or auto-discovered next match)
        match_id = request.data.get('match_id') or request.query_params.get('match_id')
        target_match = None
        if match_id:
            try:
                target_match = Match.objects.get(id=match_id)
            except Match.DoesNotExist:
                pass

        if not target_match:
            # Auto-find the team's next upcoming match
            target_match = Match.objects.filter(
                Q(home_team=team) | Q(away_team=team),
                status__in=['SCHEDULED', 'LIVE']
            ).order_by('date', 'id').first()

        # Default template gameplan
        default_gameplan, _ = TeamGamePlan.objects.get_or_create(team=team)

        # Ensure default_gameplan always has 11 valid starting players with valid calibrated coordinates
        if not default_gameplan.players_data or len(default_gameplan.players_data) < 11:
            existing_players = list(Player.objects.filter(team=team))
            if existing_players:
                from teams.lineup_services import resolve_formation_preset
                form_key = default_gameplan.formation or team.default_formation or '4-3-3 (4-2-1-3)'
                _, slots = resolve_formation_preset(form_key)

                starters = [p for p in existing_players if p.is_starting]
                if len(starters) < 11:
                    non_starters = sorted([p for p in existing_players if not p.is_starting], key=lambda p: p.overall, reverse=True)
                    needed = min(11 - len(starters), len(non_starters))
                    starters.extend(non_starters[:needed])

                starter_ids = {p.id for p in starters}
                p_list = []
                for idx, p in enumerate(starters):
                    slot = slots[idx] if idx < len(slots) else {'pos': p.position, 'x': 50.0, 'y': 50.0}
                    p_list.append({
                        'player_id': p.id,
                        'id': str(p.id),
                        'name': p.name,
                        'x_coord': p.x_coord if (p.x_coord is not None and p.x_coord > 0) else slot['x'],
                        'y_coord': p.y_coord if (p.y_coord is not None and p.y_coord > 0) else slot['y'],
                        'position': p.position or slot['pos'],
                        'naturalPosition': p.position or slot['pos'],
                        'shirt_number': p.shirt_number or (idx + 1),
                        'is_starting': True,
                    })
                for idx, p in enumerate(existing_players):
                    if p.id not in starter_ids:
                        p_list.append({
                            'player_id': p.id,
                            'id': str(p.id),
                            'name': p.name,
                            'x_coord': p.x_coord if (p.x_coord is not None and p.x_coord > 0) else 0.0,
                            'y_coord': p.y_coord if (p.y_coord is not None and p.y_coord > 0) else 0.0,
                            'position': p.position,
                            'naturalPosition': p.position,
                            'shirt_number': p.shirt_number or (12 + idx),
                            'is_starting': False,
                        })
                default_gameplan.players_data = p_list
                default_gameplan.save(update_fields=['players_data'])

        # Discover latest registered lineup across all matches or master template
        latest_submitted_mgp = MatchGamePlan.objects.filter(
            team=team,
            is_submitted=True
        ).order_by('-submitted_at', '-id').first()

        latest_source = None
        if latest_submitted_mgp and latest_submitted_mgp.players_data and len(latest_submitted_mgp.players_data) >= 11:
            latest_source = latest_submitted_mgp
        elif default_gameplan.is_submitted and default_gameplan.players_data and len(default_gameplan.players_data) >= 11:
            latest_source = default_gameplan

        # Match-scoped gameplan
        match_gameplan = None
        if target_match:
            match_gameplan, _ = MatchGamePlan.objects.get_or_create(
                match=target_match,
                team=team
            )

            # Check if this match was already explicitly submitted
            if match_gameplan.is_submitted and match_gameplan.players_data and len(match_gameplan.players_data) >= 11:
                pass  # Explicitly registered for this match!
            elif latest_source:
                # Inherit the coach's latest registered lineup for this match!
                match_gameplan.formation = latest_source.formation or team.default_formation or '4-3-3 (4-2-1-3)'
                match_gameplan.attacking_style = latest_source.attacking_style
                match_gameplan.build_up = latest_source.build_up
                match_gameplan.attacking_area = latest_source.attacking_area
                match_gameplan.positioning = latest_source.positioning
                match_gameplan.support_range = latest_source.support_range
                match_gameplan.defensive_style = latest_source.defensive_style
                match_gameplan.containment_area = latest_source.containment_area
                match_gameplan.pressing = latest_source.pressing
                match_gameplan.defensive_line = latest_source.defensive_line
                match_gameplan.compactness = latest_source.compactness
                match_gameplan.adv_offense_1 = latest_source.adv_offense_1
                match_gameplan.adv_offense_2 = latest_source.adv_offense_2
                match_gameplan.adv_defense_1 = latest_source.adv_defense_1
                match_gameplan.adv_defense_2 = latest_source.adv_defense_2
                match_gameplan.preset_name = latest_source.preset_name
                match_gameplan.has_custom_player_edits = latest_source.has_custom_player_edits
                match_gameplan.players_data = latest_source.players_data
                match_gameplan.is_submitted = True
                match_gameplan.submitted_at = getattr(latest_source, 'submitted_at', None) or getattr(latest_source, 'updated_at', None)
                match_gameplan.save()
            else:
                # Coach has never registered any lineup: Fall back to default
                match_gameplan.formation = default_gameplan.formation or team.default_formation or '4-3-3 (4-2-1-3)'
                match_gameplan.attacking_style = default_gameplan.attacking_style
                match_gameplan.build_up = default_gameplan.build_up
                match_gameplan.attacking_area = default_gameplan.attacking_area
                match_gameplan.positioning = default_gameplan.positioning
                match_gameplan.support_range = default_gameplan.support_range
                match_gameplan.defensive_style = default_gameplan.defensive_style
                match_gameplan.containment_area = default_gameplan.containment_area
                match_gameplan.pressing = default_gameplan.pressing
                match_gameplan.defensive_line = default_gameplan.defensive_line
                match_gameplan.compactness = default_gameplan.compactness
                match_gameplan.adv_offense_1 = default_gameplan.adv_offense_1
                match_gameplan.adv_offense_2 = default_gameplan.adv_offense_2
                match_gameplan.adv_defense_1 = default_gameplan.adv_defense_1
                match_gameplan.adv_defense_2 = default_gameplan.adv_defense_2
                match_gameplan.preset_name = default_gameplan.preset_name
                match_gameplan.has_custom_player_edits = default_gameplan.has_custom_player_edits
                match_gameplan.players_data = default_gameplan.players_data
                match_gameplan.is_submitted = False
                match_gameplan.save()

        active_gameplan = match_gameplan if match_gameplan else (latest_source or default_gameplan)

        if request.method == 'POST':
            raw_tactics = request.data.get('tactics')
            if isinstance(raw_tactics, dict):
                tactics = dict(raw_tactics)
            else:
                tactics = {}

            # Ensure all tactical parameters (including pressing) from request.data are captured
            for field_name in [
                'formation', 'attacking_style', 'build_up', 'attacking_area',
                'positioning', 'support_range', 'defensive_style', 'containment_area',
                'pressing', 'defensive_line', 'compactness', 'adv_offense_1',
                'adv_offense_2', 'adv_defense_1', 'adv_defense_2'
            ]:
                if field_name in request.data and field_name not in tactics:
                    tactics[field_name] = request.data[field_name]

            # Normalize pressing value
            if 'pressing' in tactics and tactics['pressing']:
                press_val = str(tactics['pressing']).strip()
                if press_val in ['محافظه کار', 'محافظه‌کار', 'conservative', 'Conservative']:
                    tactics['pressing'] = 'محافظه‌کار'
                elif press_val in ['تهاجمی', 'aggressive', 'Aggressive']:
                    tactics['pressing'] = 'تهاجمی'

            players_data = request.data.get('players', [])
            if isinstance(players_data, list):
                standardized = []
                for idx, item in enumerate(players_data):
                    if isinstance(item, dict):
                        p_dict = dict(item)
                        if 'order' not in p_dict:
                            p_dict['order'] = idx
                        standardized.append(p_dict)
                players_data = standardized

            preset_name = request.data.get('preset_name') or tactics.get('preset_name', '')
            has_custom_player_edits = request.data.get('has_custom_player_edits', False) or tactics.get('has_custom_player_edits', False)
            
            tactics['preset_name'] = preset_name
            tactics['has_custom_player_edits'] = has_custom_player_edits

            # Update default template permanently as the team's standing master gameplan
            default_gameplan.is_submitted = True
            default_gameplan.preset_name = preset_name
            default_gameplan.has_custom_player_edits = has_custom_player_edits
            if players_data:
                default_gameplan.players_data = players_data
            if 'formation' in tactics and tactics['formation']:
                default_gameplan.formation = tactics['formation']
            def_serializer = TeamGamePlanSerializer(default_gameplan, data=tactics, partial=True)
            if def_serializer.is_valid():
                def_serializer.save(is_submitted=True)
            else:
                default_gameplan.save()

            # Always save default_formation directly on Team model so it is permanently default
            if 'formation' in tactics and tactics['formation']:
                team.default_formation = tactics['formation']
                team.save(update_fields=['default_formation'])

            # Update match gameplan
            if match_gameplan:
                mgp_serializer = MatchGamePlanSerializer(match_gameplan, data=tactics, partial=True)
                mgp_serializer.is_valid(raise_exception=True)
                from django.utils import timezone
                mgp_serializer.save(is_submitted=True, submitted_at=timezone.now(), players_data=players_data)
                active_gameplan = match_gameplan
            else:
                active_gameplan = default_gameplan

            if players_data:
                p_ids = [item.get('player_id') or item.get('id') for item in players_data if item.get('player_id') or item.get('id')]
                players_map = {p.id: p for p in Player.objects.filter(id__in=p_ids, team=team)}
                to_update = []
                for item in players_data:
                    p_id = item.get('player_id') or item.get('id')
                    player = players_map.get(p_id)
                    if not player:
                        continue
                    if 'x_coord' in item and item['x_coord'] is not None:
                        player.x_coord = item['x_coord']
                    if 'y_coord' in item and item['y_coord'] is not None:
                        player.y_coord = item['y_coord']
                    if 'is_starting' in item and item['is_starting'] is not None:
                        player.is_starting = item['is_starting']
                    to_update.append(player)
                if to_update:
                    Player.objects.bulk_update(to_update, ['x_coord', 'y_coord', 'is_starting'])

            from teams.lineup_services import auto_replace_ineligible_starters
            auto_replace_ineligible_starters(team, target_match)

            try:
                from season_pass.services import increment_task_progress
                increment_task_progress(team, 'SUBMIT_LINEUP', 1)
            except Exception:
                pass

            # Broadcast tactical change to active live matches and admin
            try:
                from realtime.events import broadcast_match_event, notify_admin
                target_broadcast_matches = [target_match] if target_match else Match.objects.filter(
                    Q(home_team=team) | Q(away_team=team),
                    status__in=['LIVE', 'SCHEDULED']
                )

                preset_tag = f" (تاکتیک ساده: {active_gameplan.preset_name})" if active_gameplan.preset_name else ""
                custom_tag = " [با چیدمان دستی بازیکنان]" if active_gameplan.has_custom_player_edits else ""

                for m in target_broadcast_matches:
                    broadcast_match_event(m.id, {
                        'type': 'coach_tactics_submitted',
                        'match_id': m.id,
                        'team_id': team.id,
                        'team_name': team.name,
                        'is_home': m.home_team_id == team.id,
                        'formation': active_gameplan.formation,
                        'preset_name': active_gameplan.preset_name,
                        'has_custom_player_edits': active_gameplan.has_custom_player_edits,
                        'players': players_data,
                        'tactics': MatchGamePlanSerializer(active_gameplan).data if isinstance(active_gameplan, MatchGamePlan) else TeamGamePlanSerializer(active_gameplan).data,
                        'message': f'سرمربی تیم {team.name} ترکیب {active_gameplan.formation}{preset_tag}{custom_tag} را ارسال کرد ⚡'
                    })

                serialized_tactics_dict = MatchGamePlanSerializer(active_gameplan).data if isinstance(active_gameplan, MatchGamePlan) else TeamGamePlanSerializer(active_gameplan).data
                notify_admin({
                    'type': 'coach_tactics_submitted',
                    'title': f'درخواست تغییرات تاکتیکی: {team.name}',
                    'body': f'سرمربی تیم {team.name} ترکیب {active_gameplan.formation}{preset_tag}{custom_tag} را برای {target_match.round_name if target_match else "مسابقه"} ارسال کرد.',
                    'team_id': team.id,
                    'team_name': team.name,
                    'formation': active_gameplan.formation,
                    'preset_name': active_gameplan.preset_name,
                    'has_custom_player_edits': active_gameplan.has_custom_player_edits,
                    'players': players_data,
                    'match_id': target_match.id if target_match else None,
                    'tactics': serialized_tactics_dict,
                })
            except Exception as e:
                print("Failed to broadcast tactical change:", e)

            def get_serialized_gp(plan):
                if isinstance(plan, MatchGamePlan):
                    d = MatchGamePlanSerializer(plan).data
                    if not d.get('players_data') and default_gameplan.players_data:
                        d['players_data'] = default_gameplan.players_data
                    if not d.get('preset_name') and default_gameplan.preset_name:
                        d['preset_name'] = default_gameplan.preset_name
                    if not d.get('has_custom_player_edits') and default_gameplan.has_custom_player_edits:
                        d['has_custom_player_edits'] = default_gameplan.has_custom_player_edits
                else:
                    d = TeamGamePlanSerializer(plan).data
                    if not d.get('players_data') and default_gameplan.players_data:
                        d['players_data'] = default_gameplan.players_data

                # Enrich players_data with full player details
                p_data = d.get('players_data')
                if isinstance(p_data, list) and p_data:
                    team_p_map = {p.id: p for p in Player.objects.filter(team=team)}
                    enriched = []
                    for item in p_data:
                        if not isinstance(item, dict):
                            continue
                        item_copy = dict(item)
                        pid = item_copy.get('player_id') or item_copy.get('id')
                        try:
                            pid_int = int(pid) if pid is not None else None
                        except (ValueError, TypeError):
                            pid_int = None
                        p_obj = team_p_map.get(pid_int) if pid_int else None
                        if p_obj:
                            if not item_copy.get('name'):
                                item_copy['name'] = p_obj.name
                            if not item_copy.get('naturalPosition'):
                                item_copy['naturalPosition'] = p_obj.position
                            if not item_copy.get('shirt_number'):
                                item_copy['shirt_number'] = p_obj.shirt_number
                            if not item_copy.get('photo_url'):
                                item_copy['photo_url'] = resolve_player_photo_url(p_obj)
                            if not item_copy.get('rating'):
                                item_copy['rating'] = getattr(p_obj, 'overall', 75)
                        enriched.append(item_copy)
                    d['players_data'] = enriched

                return d

            serialized_gp = get_serialized_gp(active_gameplan)
            return Response({
                'status': 'ترکیب و تاکتیک‌ها با موفقیت در بک‌اند ثبت شد و به پنل ادمین ارسال گردید.',
                'gameplan': serialized_gp,
                'target_match_id': target_match.id if target_match else None,
                'target_match_round': target_match.round_name if target_match else None,
                'team': TeamSerializer(team).data
            })

        def get_serialized_gp(plan):
            if isinstance(plan, MatchGamePlan):
                d = MatchGamePlanSerializer(plan).data
                if not d.get('players_data') and default_gameplan.players_data:
                    d['players_data'] = default_gameplan.players_data
                if not d.get('preset_name') and default_gameplan.preset_name:
                    d['preset_name'] = default_gameplan.preset_name
                if not d.get('has_custom_player_edits') and default_gameplan.has_custom_player_edits:
                    d['has_custom_player_edits'] = default_gameplan.has_custom_player_edits
            else:
                d = TeamGamePlanSerializer(plan).data
                if not d.get('players_data') and default_gameplan.players_data:
                    d['players_data'] = default_gameplan.players_data

            # Enrich players_data with full player details
            p_data = d.get('players_data')
            if isinstance(p_data, list) and p_data:
                team_p_map = {p.id: p for p in Player.objects.filter(team=team)}
                enriched = []
                for item in p_data:
                    if not isinstance(item, dict):
                        continue
                    item_copy = dict(item)
                    pid = item_copy.get('player_id') or item_copy.get('id')
                    try:
                        pid_int = int(pid) if pid is not None else None
                    except (ValueError, TypeError):
                        pid_int = None
                    p_obj = team_p_map.get(pid_int) if pid_int else None
                    if p_obj:
                        if not item_copy.get('name'):
                            item_copy['name'] = p_obj.name
                        if not item_copy.get('naturalPosition'):
                            item_copy['naturalPosition'] = p_obj.position
                        if not item_copy.get('shirt_number'):
                            item_copy['shirt_number'] = p_obj.shirt_number
                        if not item_copy.get('photo_url'):
                            item_copy['photo_url'] = resolve_player_photo_url(p_obj)
                        if not item_copy.get('rating'):
                            item_copy['rating'] = getattr(p_obj, 'overall', 75)
                    enriched.append(item_copy)
                d['players_data'] = enriched

            return d

        serialized_gp = get_serialized_gp(active_gameplan)
        return Response({
            'gameplan': serialized_gp,
            'target_match_id': target_match.id if target_match else None,
            'target_match_round': target_match.round_name if target_match else None,
            'team': TeamSerializer(team).data
        })

    @action(detail=True, methods=['post'])
    def upgrade_facility(self, request, pk=None):
        team = self.get_object()
        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if not is_admin and team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای ارتقای تسهیلات این تیم را ندارید.")

        facility_name = request.data.get('facility')
        
        facilities, _ = ClubFacilities.objects.get_or_create(team=team)
        
        allowed_fields = [
            'training_camp_level', 'gym_level', 'medical_level', 
            'stadium_level', 'academy_level', 'pool_level'
        ]
        
        field_name = f"{facility_name}_level" if not facility_name.endswith('_level') else facility_name
        
        if field_name not in allowed_fields:
            return Response({'error': 'تسهیلات نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
        
        current_level = getattr(facilities, field_name)
        if current_level >= 20:
            return Response({'error': 'تسهیلات به حداکثر سطح (۲۰) رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Gem cost escalates with current level: e.g. lvl 0->1: 15, lvl 1->2: 30, lvl 10->11: 165
        gem_cost = 15 + (current_level * 15)
        # Apply 10% VIP discount if team has active season pass VIP
        if team.is_vip:
            gem_cost = max(1, int(round(gem_cost * 0.9)))
        
        from economy.services import process_atomic_wallet_update
        wallet_res = process_atomic_wallet_update(
            team_id=team.id,
            amount=-gem_cost,
            currency='GEMS',
            transaction_type='FACILITY_UPGRADE',
            description=f"ارتقای {field_name} به سطح {current_level + 1}"
        )
        
        if not wallet_res.get('success'):
            return Response({
                'error': f"جم کافی نیست. هزینه ارتقا: {gem_cost} جم. (موجودی فعلی: {team.gems} جم)",
                'required_gems': gem_cost,
                'current_gems': team.gems
            }, status=status.HTTP_400_BAD_REQUEST)
        
        setattr(facilities, field_name, current_level + 1)
        facilities.save()
        team.refresh_from_db(fields=['gems'])
        
        # --- Player Level System XP ---
        from .level_engine import grant_facility_xp
        grant_facility_xp(team, field_name, current_level + 1)
        
        # --- Youth Academy: Step-by-step Potential OVR Boost for U25 players (Max 90 OVR) ---
        boosted_young_count = 0
        new_level = current_level + 1
        if field_name == 'academy_level':
            from .growth_engine import sync_youth_academy_potentials
            updated_players = sync_youth_academy_potentials(team, new_level)
            boosted_young_count = len(updated_players)
            
            if boosted_young_count > 0:
                from notifications.models import Notification
                Notification.objects.create(
                    team=team,
                    category='TRANSFER',
                    title=f"🌟 ارتقای آکادمی به سطح {new_level}: افزایش سقف پتانسیل جوانان",
                    message=f"با دستیابی آکادمی جوانان به سطح {new_level}، سقف پتانسیل رشد (Potential OVR) تعداد {boosted_young_count} بازیکن زیر ۲۵ سال تیم تا سقف اورال ۹۰ افزایش یافت!"
                )
        elif field_name == 'training_camp_level':
            from notifications.models import Notification
            Notification.objects.create(
                team=team,
                category='TRANSFER',
                title=f"⚡ ارتقای کمپ تمرینی به سطح {new_level}",
                message=f"ظرفیت لیست بازیکنان تیم شما به {team.max_squad_size} بازیکن (از سقف ۳۲ نفر) افزایش یافت!"
            )
        
        return Response({
            'status': 'ارتقاء با موفقیت انجام شد',
            'facility': field_name,
            'new_level': current_level + 1,
            'gem_cost': gem_cost,
            'remaining_gems': team.gems,
            'boosted_young_count': boosted_young_count,
            'facilities': ClubFacilitiesSerializer(facilities).data,
            'team': TeamSerializer(team).data
        })

    # === ADMIN MANAGEMENT ACTIONS ===

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def admin_update_player(self, request):
        player_id = request.data.get('player_id')
        reason = request.data.get('reason', '')
        try:
            player = Player.objects.get(id=player_id)
            before_value = {
                'overall': int(player.overall),
                'virtual_stamina': float(player.virtual_stamina),
                'is_injured': player.is_injured,
                'injury_return_date': str(player.injury_return_date) if player.injury_return_date else None
            }
            if 'overall' in request.data:
                player.overall = int(request.data['overall'])
            if 'virtual_stamina' in request.data:
                player.virtual_stamina = float(request.data['virtual_stamina'])
                from teams.stamina_engine import update_lock_status
                update_lock_status(player)
            if 'heal_injury' in request.data and request.data['heal_injury']:
                player.is_injured = False
                player.injury_matches = 0
                player.injury_return_date = None
            if 'is_injured' in request.data:
                player.is_injured = bool(request.data['is_injured'])
                if not player.is_injured:
                    player.injury_matches = 0
                    player.injury_return_date = None
                elif player.injury_matches <= 0:
                    player.injury_matches = int(request.data.get('injury_matches', 2))
            if 'injury_matches' in request.data:
                try:
                    player.injury_matches = max(0, int(request.data['injury_matches']))
                    player.is_injured = player.injury_matches > 0
                except (ValueError, TypeError):
                    pass
            player.save()
            
            after_value = {
                'overall': int(player.overall),
                'virtual_stamina': float(player.virtual_stamina),
                'is_injured': player.is_injured,
                'injury_matches': player.injury_matches,
                'injury_return_date': str(player.injury_return_date) if player.injury_return_date else None
            }
            from audit.utils import log_admin_action
            log_admin_action(
                admin_user=request.user, 
                action_type='PLAYER_UPDATE', 
                target_team=player.team, 
                target_player=player,
                before_value=before_value, 
                after_value=after_value, 
                reason=reason
            )
            return Response({'status': 'Player updated by Admin', 'player': PlayerSerializer(player).data})
        except Player.DoesNotExist:
            return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def admin_override_facility(self, request):
        team_id = request.data.get('team_id', 1)
        facility_name = request.data.get('facility')
        new_level = int(request.data.get('level', 1))
        reason = request.data.get('reason', '')

        try:
            team = Team.objects.get(id=team_id)
            facilities, _ = ClubFacilities.objects.get_or_create(team=team)
            field_name = f"{facility_name}_level" if not facility_name.endswith('_level') else facility_name
            before_val = getattr(facilities, field_name)
            
            setattr(facilities, field_name, max(1, min(new_level, 20)))
            facilities.save()
            
            after_val = getattr(facilities, field_name)
            
            from audit.utils import log_admin_action
            log_admin_action(
                admin_user=request.user, 
                action_type='FACILITY_OVERRIDE', 
                target_team=team,
                before_value={field_name: before_val}, 
                after_value={field_name: after_val}, 
                reason=reason
            )
            return Response({'status': 'Facility overridden by Admin', 'facilities': ClubFacilitiesSerializer(facilities).data})
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def admin_adjust_budget(self, request):
        team_id = request.data.get('team_id', 1)
        amount = float(request.data.get('amount', 0))
        reason = request.data.get('reason', '')
        try:
            team = Team.objects.get(id=team_id)
            before_budget = float(team.budget)
            team.budget = float(team.budget) + amount
            team.save()
            
            from audit.utils import log_admin_action
            log_admin_action(
                admin_user=request.user, 
                action_type='BUDGET_ADJUST', 
                target_team=team,
                before_value={'budget': before_budget}, 
                after_value={'budget': float(team.budget)}, 
                reason=reason
            )
            return Response({'status': 'Budget adjusted', 'new_budget': team.budget})
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def admin_register_coach(self, request):
        """
        Registers a new club (team) from the admin dashboard's "Register Coach" form.
        Accepts club_name, budget, wage_cap and optionally phone_number to bind a manager.
        """
        from users.models import User

        club_name = request.data.get('club_name') or request.data.get('clubName')
        if not club_name:
            return Response({'error': 'club_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if Team.objects.filter(name=club_name).exists():
            return Response({'error': 'تیمی با این نام قبلاً ثبت شده است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            budget = Decimal(request.data.get('budget', 850000000))
            wage_cap = Decimal(request.data.get('wage_cap', 10000))
        except (TypeError, ValueError, InvalidOperation):
            budget = Decimal('850000000.00')
            wage_cap = Decimal('10000.00')

        manager = None
        username = request.data.get('username') or request.data.get('coach_username')
        password = request.data.get('password') or request.data.get('coach_password')
        if username:
            username = str(username).strip()
            manager, created = User.objects.get_or_create(
                username=username,
                defaults={'role': 'coach', 'virtual_dollars': 1000000.00}
            )
            if password:
                manager.set_password(str(password).strip())
                manager.save()
            elif created:
                manager.set_password('123456')
                manager.save()

            if hasattr(manager, 'team') and manager.team is not None:
                return Response(
                    {'error': 'این نام کاربری قبلاً برای تیم دیگری ثبت شده است.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        team = Team.objects.create(
            name=club_name,
            manager=manager,
            budget=budget,
            wage_cap=wage_cap,
        )
        ClubFacilities.objects.create(team=team)
        TeamGamePlan.objects.create(team=team)

        return Response(
            {'status': 'Coach & team registered successfully', 'team': TeamSerializer(team).data},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['put'], permission_classes=[IsAdminOrDebug])
    def assign_coach(self, request, pk=None):
        team = self.get_object()
        manager_id = request.data.get('manager_id')
        
        if manager_id is None:
            team.manager = None
            team.save()
            return Response({'status': 'Coach unassigned successfully.', 'team': TeamSerializer(team).data})

        from users.models import User
        try:
            manager = User.objects.get(id=manager_id)
            if hasattr(manager, 'team') and manager.team is not None and manager.team != team:
                return Response(
                    {'error': 'This user is already managing another team.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            team.manager = manager
            team.save()
            return Response({'status': 'Coach assigned successfully.', 'team': TeamSerializer(team).data})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrDebug])
    def toggle_active(self, request, pk=None):
        team = self.get_object()
        team.is_active = not team.is_active
        team.save(update_fields=['is_active'])
        return Response({'status': 'Team active state toggled', 'team_id': team.id, 'is_active': team.is_active})

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all().select_related('team', 'loan_owner_team').prefetch_related('transfer_history__seller_team', 'transfer_history__buyer_team')
    serializer_class = PlayerSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdminOrReadOnly]

    @action(detail=True, methods=['post'])
    def recover_stamina(self, request, pk=None):
        return Response({
            'status': 'سیستم خستگی غیرفعال است و بازیکنان همیشه ۱۰۰٪ آماده هستند.',
            'new_stamina': 100.0,
            'gem_cost': 0,
        })

    @action(detail=True, methods=['post'])
    def recharge_stamina(self, request, pk=None):
        return Response({
            'status': 'سیستم خستگی غیرفعال است و بازیکنان همیشه ۱۰۰٪ آماده هستند.',
            'new_stamina': 100.0,
            'gem_cost': 0,
        })

    @action(detail=True, methods=['post'])
    def heal_injury(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.is_staff and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای مدیریت این بازیکن را ندارید.")
            
        if not player.is_injured and not player.injury_return_date and player.injury_matches <= 0:
            return Response({'error': 'این بازیکن در حال حاضر مصدوم نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        INJURY_HEAL_COST = player.team.injury_heal_cost
        from economy.services import process_atomic_wallet_update
        wallet_res = process_atomic_wallet_update(
            team_id=player.team.id,
            amount=-INJURY_HEAL_COST,
            currency='GEMS',
            transaction_type='INJURY_HEAL',
            description=f"درمان فوری مصدومیت بازیکن {player.name}"
        )
        if not wallet_res.get('success'):
            return Response({
                'error': f"جم کافی نیست. هزینه درمان فوری با امکانات فعلی: {INJURY_HEAL_COST} جم. (موجودی فعلی: {player.team.gems} جم)",
                'required_gems': INJURY_HEAL_COST,
                'current_gems': player.team.gems
            }, status=status.HTTP_400_BAD_REQUEST)
            
        player.is_injured = False
        player.injury_matches = 0
        player.injury_return_date = None
        player.save(update_fields=['is_injured', 'injury_matches', 'injury_return_date'])
        player.team.refresh_from_db(fields=['gems'])
        
        return Response({
            'status': f'مصدومیت {player.name} با موفقیت درمان شد.',
            'gem_cost': INJURY_HEAL_COST,
            'remaining_gems': player.team.gems,
            'player': PlayerSerializer(player).data
        })

    @action(detail=True, methods=['post'])
    def gem_boost(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.is_staff and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای مدیریت این بازیکن را ندارید.")
            
        from .level_engine import grant_gem_boost
        success, message = grant_gem_boost(player, player.team)
        
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
        player.team.refresh_from_db(fields=['gems'])
        
        return Response({
            'status': message,
            'remaining_gems': player.team.gems,
            'player': PlayerSerializer(player).data
        })

    @action(detail=True, methods=['get'])
    def skills(self, request, pk=None):
        player = self.get_object()
        role = request.query_params.get('role')
        breakdown = player.get_skills_breakdown(role=role)
        return Response({
            'player_id': player.id,
            'player_name': player.name,
            'position': player.position,
            'overall': player.overall,
            'skills': breakdown,
            'remaining_gems': player.team.gems if player.team else 0
        })

    @action(detail=True, methods=['post'])
    def upgrade_skill(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.is_staff and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای مدیریت این بازیکن را ندارید.")

        skill_key = request.data.get('skill_key')
        role = request.data.get('role')
        if not skill_key:
            return Response({'error': 'شناسه مهارت (skill_key) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        from .level_engine import upgrade_player_pes_skill
        success, message, breakdown = upgrade_player_pes_skill(player, skill_key, role=role)

        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        player.team.refresh_from_db(fields=['gems'])

        return Response({
            'status': message,
            'remaining_gems': player.team.gems,
            'skills': breakdown,
            'player': PlayerSerializer(player).data
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrDebug])
    def pes_skills_overview(self, request):
        from .level_engine import admin_get_pes_skills_overview
        team_id = request.query_params.get('team_id')
        data = admin_get_pes_skills_overview(team_id=int(team_id) if team_id else None)
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def mark_pes_skill_applied(self, request):
        from .level_engine import admin_mark_pes_skill_applied
        player_id = request.data.get('player_id')
        skill_key = request.data.get('skill_key')
        all_skills = request.data.get('all_skills', False)

        if not player_id:
            return Response({'error': 'شناسه بازیکن (player_id) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        success, message = admin_mark_pes_skill_applied(player_id, skill_key=skill_key, all_skills=all_skills)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': message})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def update_player_ovr(self, request):
        from .level_engine import admin_update_player_ovr
        player_id = request.data.get('player_id')
        new_ovr = request.data.get('overall')

        if not player_id or new_ovr is None:
            return Response({'error': 'شناسه بازیکن (player_id) و اورال جدید (overall) الزامی هستند.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_ovr = int(new_ovr)
        except (ValueError, TypeError):
            return Response({'error': 'اورال باید یک عدد صحیح باشد.'}, status=status.HTTP_400_BAD_REQUEST)

        success, message = admin_update_player_ovr(player_id, new_ovr)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': message, 'overall': new_ovr})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def mark_pes_ovr_applied(self, request):
        from .level_engine import admin_mark_pes_ovr_applied
        player_id = request.data.get('player_id')
        applied = request.data.get('applied', True)

        if not player_id:
            return Response({'error': 'شناسه بازیکن (player_id) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        success, message = admin_mark_pes_ovr_applied(player_id, applied=applied)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'message': message})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrDebug])
    def reset_boosts(self, request, pk=None):
        from .level_engine import admin_reset_player_boosts
        reset_mode = request.data.get('reset_mode', 'ALL')
        success, message, refund_amount = admin_reset_player_boosts(pk, reset_mode=reset_mode)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': message,
            'refund_amount': refund_amount
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def reset_team_boosts(self, request):
        from .level_engine import admin_reset_team_boosts
        team_id = request.data.get('team_id')
        reset_mode = request.data.get('reset_mode', 'ALL')

        if not team_id:
            return Response({'error': 'شناسه تیم (team_id) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        success, message, total_refund = admin_reset_team_boosts(team_id, reset_mode=reset_mode)
        if not success:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': message,
            'total_refund': total_refund
        })

    @action(detail=True, methods=['patch', 'post'])
    def update_market_value(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)

        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if not is_admin and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای تغییر ارزش این بازیکن را ندارید.")

        market_value_input = request.data.get('market_value')
        if market_value_input is None:
            return Response({'error': 'مقدار ارزش بازار (market_value) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            val = Decimal(str(market_value_input))
            if val < Decimal('0.00'):
                return Response({'error': 'ارزش بازار نمی‌تواند منفی باشد.'}, status=status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, ValueError, TypeError):
            return Response({'error': 'مقدار وارد شده برای ارزش بازار نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)

        player.market_value = val
        player.save(update_fields=['market_value'])

        return Response({
            'status': f'ارزش پایه بازیکن «{player.name}» با موفقیت به ${int(val):,} تغییر یافت.',
            'market_value': float(player.market_value),
            'player': PlayerSerializer(player).data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def manual_transfer(self, request):
        """
        Transfers a player directly between teams or releases to Free Agent.
        Calculates and updates star ratings for both clubs, creates TransferHistory, TransferLog, and AdminAuditLog.
        """
        player_id = request.data.get('player_id')
        target_team_id = request.data.get('target_team_id')
        transfer_fee = request.data.get('transfer_fee', 0)
        transfer_type = request.data.get('transfer_type', 'PERMANENT')
        reason = request.data.get('reason', 'انتقال دستی توسط مدیریت سیستم')

        if not player_id:
            return Response({'error': 'شناسه بازیکن (player_id) الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            player = Player.objects.select_related('team').get(id=player_id)
        except Player.DoesNotExist:
            return Response({'error': 'بازیکن مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        old_team = player.team
        target_team = None

        if target_team_id and str(target_team_id) not in ['0', 'null', 'None', '']:
            try:
                target_team = Team.objects.get(id=target_team_id)
            except Team.DoesNotExist:
                return Response({'error': 'تیم مقصد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if old_team == target_team:
            return Response({'error': 'تیم مبدا و مقصد یکسان هستند.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fee_val = Decimal(str(transfer_fee or 0))
        except (InvalidOperation, ValueError, TypeError):
            fee_val = Decimal('0.00')

        # Apply Transfer
        player.team = target_team
        if target_team:
            player.is_free_agent = False
            player.pes_transfer_applied = False
            if transfer_type == 'LOAN' and old_team:
                player.loan_owner_team = old_team
                player.loan_matches_left = int(request.data.get('loan_matches', 10))
            else:
                player.loan_owner_team = None
                player.loan_matches_left = 0
        else:
            player.is_free_agent = True
            player.is_starting = False
            player.loan_owner_team = None
            player.loan_matches_left = 0

        player.save()

        # Recalculate star ratings
        if old_team:
            old_team.update_star_rating()
        if target_team:
            target_team.update_star_rating()

        # Record TransferHistory
        from transfers.models import TransferHistory, TransferLog
        TransferHistory.objects.create(
            player=player,
            seller_team=old_team,
            buyer_team=target_team,
            price_usd=fee_val,
            transfer_type=transfer_type
        )

        seller_name = old_team.name if old_team else 'بازیکن آزاد'
        buyer_name = target_team.name if target_team else 'بازیکن آزاد'

        # Record TransferLog
        TransferLog.objects.create(
            event_type='TRANSFER_FINALIZED',
            description=f"انتقال رسمی: {player.name} با مبلغ {int(fee_val):,} $ از {seller_name} به تیم {buyer_name} پیوست."
        )

        # Record AdminAuditLog
        from audit.utils import log_admin_action
        log_admin_action(
            admin_user=request.user,
            action_type='MANUAL_TRANSFER',
            target_team=target_team or old_team,
            target_player=player,
            before_value={'team_id': old_team.id if old_team else None, 'team_name': seller_name},
            after_value={'team_id': target_team.id if target_team else None, 'team_name': buyer_name, 'fee': float(fee_val)},
            reason=reason
        )

        return Response({
            'status': f'بازیکن «{player.name}» با موفقیت از {seller_name} به {buyer_name} منتقل گردید.',
            'player': PlayerSerializer(player).data,
            'old_team': TeamSerializer(old_team).data if old_team else None,
            'new_team': TeamSerializer(target_team).data if target_team else None,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrDebug])
    def upload_photo(self, request, pk=None):
        """
        Uploads and saves a custom player image.
        """
        player = self.get_object()
        uploaded_file = request.FILES.get('photo') or request.FILES.get('file') or request.FILES.get('image')

        if not uploaded_file:
            return Response({'error': 'هیچ فایلی برای آپلود ارسال نشده است.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate format
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.webp']
        import os
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in allowed_extensions:
            return Response({'error': f'فرمت فایل مجاز نیست. فرمت‌های معتبر: {", ".join(allowed_extensions)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Max 5MB
        if uploaded_file.size > 5 * 1024 * 1024:
            return Response({'error': 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.'}, status=status.HTTP_400_BAD_REQUEST)

        # Clean filename
        clean_p_name = player.name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        uploaded_file.name = f"{player.id}_{clean_p_name}{ext}"

        # If previous custom photo exists, remove it
        if player.custom_photo:
            try:
                if os.path.isfile(player.custom_photo.path):
                    os.remove(player.custom_photo.path)
            except Exception:
                pass

        player.custom_photo = uploaded_file
        player.save(update_fields=['custom_photo'])

        from audit.utils import log_admin_action
        log_admin_action(
            admin_user=request.user,
            action_type='PLAYER_PHOTO_UPLOAD',
            target_team=player.team,
            target_player=player,
            before_value=None,
            after_value={'custom_photo': player.custom_photo.url if player.custom_photo else None},
            reason=f'آپلود تصویر جدید برای بازیکن {player.name}'
        )

        return Response({
            'status': f'تصویر بازیکن «{player.name}» با موفقیت به‌روزرسانی شد.',
            'photo_url': resolve_player_photo_url(player),
            'custom_photo_url': player.custom_photo.url if player.custom_photo else None,
            'player': PlayerSerializer(player).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrDebug])
    def reset_photo(self, request, pk=None):
        """
        Resets custom photo to default.
        """
        player = self.get_object()
        if player.custom_photo:
            import os
            try:
                if os.path.isfile(player.custom_photo.path):
                    os.remove(player.custom_photo.path)
            except Exception:
                pass
            player.custom_photo = None
            player.save(update_fields=['custom_photo'])

        return Response({
            'status': f'تصویر اختصاصی حذف و تصویر پیش‌فرض بازیکن «{player.name}» بازیابی شد.',
            'photo_url': resolve_player_photo_url(player),
            'player': PlayerSerializer(player).data
        })

    @action(detail=True, methods=['patch', 'put', 'post'], permission_classes=[IsAdminOrDebug])
    def full_update(self, request, pk=None):
        """
        Comprehensive editing of all player attributes by Admin.
        """
        player = self.get_object()
        data = request.data

        before_state = {
            'name': player.name,
            'position': player.position,
            'overall': player.overall,
            'potential_ovr': player.potential_ovr,
            'market_value': float(player.market_value),
            'age': player.age,
            'wage': float(player.wage),
            'virtual_stamina': float(player.virtual_stamina),
            'shirt_number': player.shirt_number,
            'is_injured': player.is_injured,
            'suspension_matches': player.suspension_matches,
            'is_starting': player.is_starting,
        }

        rating_affected = False

        if 'name' in data and data['name']:
            player.name = str(data['name']).strip()
        if 'position' in data and data['position'] in dict(Player.POSITIONS):
            player.position = data['position']
            rating_affected = True
        if 'overall' in data:
            try:
                player.overall = max(40, min(110, int(data['overall'])))
                rating_affected = True
            except (ValueError, TypeError):
                pass
        if 'potential_ovr' in data:
            try:
                player.potential_ovr = max(40, min(110, int(data['potential_ovr'])))
            except (ValueError, TypeError):
                pass
        if 'market_value' in data:
            try:
                player.market_value = Decimal(str(data['market_value']))
            except (InvalidOperation, ValueError, TypeError):
                pass
        if 'age' in data:
            try:
                player.age = max(15, min(50, int(data['age'])))
            except (ValueError, TypeError):
                pass
        if 'wage' in data:
            try:
                player.wage = Decimal(str(data['wage']))
            except (InvalidOperation, ValueError, TypeError):
                pass
        if 'virtual_stamina' in data:
            try:
                player.virtual_stamina = Decimal(str(max(0, min(100, float(data['virtual_stamina'])))))
                from teams.stamina_engine import update_lock_status
                update_lock_status(player)
            except (InvalidOperation, ValueError, TypeError):
                pass
        if 'shirt_number' in data:
            val = data['shirt_number']
            if val in [None, '', 'null']:
                player.shirt_number = None
            else:
                try:
                    player.shirt_number = max(1, min(99, int(val)))
                except (ValueError, TypeError):
                    pass
        if 'is_injured' in data:
            player.is_injured = bool(data['is_injured'])
            if not player.is_injured:
                player.injury_matches = 0
                player.injury_return_date = None
            elif player.injury_matches <= 0:
                player.injury_matches = int(data.get('injury_matches', 2))
        if 'injury_matches' in data:
            try:
                player.injury_matches = max(0, int(data['injury_matches']))
                if player.injury_matches > 0:
                    player.is_injured = True
                else:
                    player.is_injured = False
            except (ValueError, TypeError):
                pass
        if 'suspension_matches' in data:
            try:
                player.suspension_matches = max(0, int(data['suspension_matches']))
            except (ValueError, TypeError):
                pass
        if 'is_starting' in data:
            player.is_starting = bool(data['is_starting'])
            rating_affected = True

        player.save()

        if rating_affected and player.team:
            player.team.update_star_rating()

        from audit.utils import log_admin_action
        log_admin_action(
            admin_user=request.user,
            action_type='PLAYER_FULL_UPDATE',
            target_team=player.team,
            target_player=player,
            before_value=before_state,
            after_value={
                'name': player.name,
                'position': player.position,
                'overall': player.overall,
                'market_value': float(player.market_value),
            },
            reason=data.get('reason', 'ویرایش مشخصات بازیکن توسط ادمین')
        )

        return Response({
            'status': f'مشخصات بازیکن «{player.name}» با موفقیت ذخیره شد.',
            'player': PlayerSerializer(player).data
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrDebug])
    def duplicates(self, request):
        """
        Scans all players and returns duplicate/same-name groups with comparison details.
        """
        import unicodedata
        import re

        def norm_name(s):
            if not s:
                return ''
            s = unicodedata.normalize('NFKD', str(s))
            s = ''.join(c for c in s if not unicodedata.combining(c))
            s = s.replace('.', ' ').replace('-', ' ').replace("'", '').replace('’', '')
            s = re.sub(r'\s+', ' ', s)
            return s.strip().lower()

        players = Player.objects.all().select_related('team', 'base_team').prefetch_related('transfer_history__seller_team', 'transfer_history__buyer_team')
        
        exact_groups = {}
        similar_groups = {}

        for p in players:
            n = norm_name(p.name)
            if not n:
                continue
            parts = n.split()
            exact_groups.setdefault(n, []).append(p)
            
            if len(parts) >= 2:
                sim_key = f"{parts[0][0]}_{parts[-1]}"
            else:
                sim_key = n
            similar_groups.setdefault(sim_key, []).append(p)

        processed_player_ids = set()
        duplicate_clusters = []

        # Pass 1: Exact matches (>1 players)
        for key, p_list in exact_groups.items():
            if len(p_list) > 1:
                cluster_ids = {p.id for p in p_list}
                processed_player_ids.update(cluster_ids)
                duplicate_clusters.append({
                    'cluster_id': f'exact_{key}',
                    'match_type': 'EXACT',
                    'match_label': 'نام کاملاً یکسان',
                    'canonical_name': p_list[0].name,
                    'count': len(p_list),
                    'players': [PlayerSerializer(p).data for p in p_list]
                })

        # Pass 2: Similar/Abbreviated matches (not already clustered in exact)
        for key, p_list in similar_groups.items():
            if len(p_list) > 1:
                all_ids = {p.id for p in p_list}
                if len(all_ids - processed_player_ids) > 0 and len(p_list) > 1:
                    duplicate_clusters.append({
                        'cluster_id': f'sim_{key}',
                        'match_type': 'SIMILAR',
                        'match_label': 'نام‌های مشابه یا مخفف',
                        'canonical_name': p_list[0].name,
                        'count': len(p_list),
                        'players': [PlayerSerializer(p).data for p in p_list]
                    })
                    processed_player_ids.update(all_ids)

        return Response({
            'total_duplicate_groups': len(duplicate_clusters),
            'total_duplicate_players': sum(c['count'] for c in duplicate_clusters),
            'groups': duplicate_clusters
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def merge_duplicates(self, request):
        """
        Merge a duplicate player record into a primary player record.
        Reassigns transfer history, logs, and safely deletes the duplicate.
        """
        primary_id = request.data.get('primary_player_id')
        duplicate_id = request.data.get('duplicate_player_id')

        if not primary_id or not duplicate_id or primary_id == duplicate_id:
            return Response({'error': 'شناسه بازیکن اصلی و تکراری نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            primary_player = Player.objects.get(id=primary_id)
            duplicate_player = Player.objects.get(id=duplicate_id)
        except Player.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        from transfers.models import TransferHistory, TransferListing, TransferOffer
        TransferHistory.objects.filter(player=duplicate_player).update(player=primary_player)
        TransferListing.objects.filter(player=duplicate_player).update(player=primary_player)
        TransferOffer.objects.filter(target_player=duplicate_player).update(target_player=primary_player)

        from teams.models import PlayerGrowthLog, PlayerLevelUpLog
        PlayerGrowthLog.objects.filter(player=duplicate_player).update(player=primary_player)
        PlayerLevelUpLog.objects.filter(player=duplicate_player).update(player=primary_player)

        if not primary_player.compatible_positions and duplicate_player.compatible_positions:
            primary_player.compatible_positions = duplicate_player.compatible_positions
            primary_player.save(update_fields=['compatible_positions'])

        from audit.utils import log_admin_action
        dup_name = duplicate_player.name
        dup_team = duplicate_player.team.name if duplicate_player.team else 'Free Agent'
        duplicate_player.delete()

        log_admin_action(
            admin_user=request.user,
            action_type='PLAYER_MERGE',
            target_player=primary_player,
            before_value={'deleted_duplicate': dup_name, 'deleted_id': duplicate_id, 'deleted_team': dup_team},
            after_value={'kept_primary_id': primary_player.id, 'primary_name': primary_player.name},
            reason=request.data.get('reason', 'ادغام بازیکن تکراری توسط مدیریت')
        )

        return Response({
            'status': f'بازیکن تکراری «{dup_name}» با موفقیت در «{primary_player.name}» ادغام و حذف شد.',
            'primary_player': PlayerSerializer(primary_player).data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def delete_duplicate(self, request):
        """
        Safely delete a duplicate player record.
        """
        player_id = request.data.get('player_id')
        if not player_id:
            return Response({'error': 'شناسه بازیکن الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            player = Player.objects.get(id=player_id)
        except Player.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        p_name = player.name
        p_team = player.team.name if player.team else 'Free Agent'
        player.delete()

        from audit.utils import log_admin_action
        log_admin_action(
            admin_user=request.user,
            action_type='PLAYER_DELETE',
            before_value={'deleted_name': p_name, 'deleted_id': player_id, 'team': p_team},
            reason=request.data.get('reason', 'حذف رکورد بازیکن تکراری')
        )

        return Response({'status': f'بازیکن «{p_name}» (ID: {player_id}) با موفقیت حذف شد.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrDebug])
    def initialize_base_teams(self, request):
        """
        Initialize base_team for all players who do not have it set yet.
        Uses earliest TransferHistory.seller_team or current player.team.
        """
        from transfers.models import TransferHistory
        players_to_update = Player.objects.filter(base_team__isnull=True).select_related('team')
        updated_count = 0

        for p in players_to_update:
            earliest_transfer = TransferHistory.objects.filter(player=p).order_by('transferred_at', 'id').first()
            if earliest_transfer and earliest_transfer.seller_team:
                p.base_team = earliest_transfer.seller_team
            elif p.team:
                p.base_team = p.team
            if p.base_team:
                p.save(update_fields=['base_team'])
                updated_count += 1

        return Response({
            'status': f'تیم پایه برای {updated_count} بازیکن با موفقیت ثبت و مقداردهی شد.',
            'updated_count': updated_count
        })


# ==============================================================================
# PES Transfer Hub (مرکز اختصاصی نقل‌وانتقالات بازی PES)
# ==============================================================================

def resolve_team_logo(team):
    """Safely extracts team logo string or URL regardless of model field type."""
    if not team:
        return None
    logo = getattr(team, 'logo', None)
    if not logo:
        return None
    if hasattr(logo, 'url'):
        try:
            return logo.url
        except Exception:
            return str(logo)
    return str(logo)


def get_player_trajectory(player, prefetch_histories=None):
    """
    Builds the visual trajectory breadcrumb and chain of clubs for a player:
    Step 1: base_team (مبدا اولیه در بازی PES)
    Steps 2..N: Sequential buyers from TransferHistory
    Final Step: Current team
    """
    if prefetch_histories is not None:
        transfers = [h for h in prefetch_histories if h.player_id == player.id]
    else:
        from transfers.models import TransferHistory
        transfers = list(
            TransferHistory.objects.filter(player_id=player.id)
            .select_related('seller_team', 'buyer_team')
            .order_by('transferred_at', 'id')
        )

    chain = []

    # 1. Base team (Original PES Origin)
    base = player.base_team
    if not base and transfers and transfers[0].seller_team:
        base = transfers[0].seller_team

    if base:
        chain.append({
            'club_id': base.id,
            'club_name': base.name,
            'club_logo': resolve_team_logo(base),
            'step_type': 'BASE_PES',
            'label': 'مبدا اولیه در PES'
        })

    # 2. Sequential transfers
    for t in transfers:
        if t.buyer_team:
            # Avoid duplicate adjacent hops
            if not chain or chain[-1]['club_id'] != t.buyer_team.id:
                chain.append({
                    'club_id': t.buyer_team.id,
                    'club_name': t.buyer_team.name,
                    'club_logo': resolve_team_logo(t.buyer_team),
                    'step_type': 'INTERMEDIATE',
                    'label': 'انتقال',
                    'date': t.transferred_at.strftime('%Y-%m-%d') if t.transferred_at else None,
                    'fee': float(t.price_usd or 0)
                })

    # 3. Current team guarantee at end
    curr = player.team
    if curr:
        if not chain:
            chain.append({
                'club_id': curr.id,
                'club_name': curr.name,
                'club_logo': resolve_team_logo(curr),
                'step_type': 'CURRENT',
                'label': 'تیم فعلی'
            })
        elif chain[-1]['club_id'] != curr.id:
            chain.append({
                'club_id': curr.id,
                'club_name': curr.name,
                'club_logo': resolve_team_logo(curr),
                'step_type': 'CURRENT',
                'label': 'تیم فعلی'
            })
        else:
            chain[-1]['step_type'] = 'CURRENT'
            chain[-1]['label'] = 'تیم فعلی'

    # Build human-friendly string
    if len(chain) == 1:
        trajectory_text = f"{chain[0]['club_name']} (تیم پایه و فعلی)"
    else:
        parts = [f"مبدا: {chain[0]['club_name']}"]
        for hop in chain[1:-1]:
            parts.append(hop['club_name'])
        parts.append(f"{chain[-1]['club_name']} (فعلی)")
        trajectory_text = " ➔ ".join(parts)

    return chain, trajectory_text


class AdminPESTransfersOverviewView(views.APIView):
    """
    Returns an overview of all clubs with their pending transfer counts,
    total players, and departed count for quick PES editing status.
    """
    permission_classes = [IsAdminOrDebug]

    def get(self, request):
        from django.db.models import Count
        from transfers.models import TransferHistory

        teams = Team.objects.all().order_by('name')

        # Fast aggregate queries
        pending_map = dict(
            Player.objects.filter(pes_transfer_applied=False, team__isnull=False)
            .values('team_id')
            .annotate(c=Count('id'))
            .values_list('team_id', 'c')
        )
        total_players_map = dict(
            Player.objects.filter(team__isnull=False)
            .values('team_id')
            .annotate(c=Count('id'))
            .values_list('team_id', 'c')
        )
        departures_map = dict(
            TransferHistory.objects.filter(seller_team__isnull=False)
            .values('seller_team_id')
            .annotate(c=Count('id'))
            .values_list('seller_team_id', 'c')
        )

        clubs_data = []
        total_pending_league = 0
        total_clubs_with_pending = 0

        for t in teams:
            pending_count = pending_map.get(t.id, 0)
            dep_count = departures_map.get(t.id, 0)
            tot_count = total_players_map.get(t.id, 0)

            if pending_count > 0:
                total_pending_league += pending_count
                total_clubs_with_pending += 1

            clubs_data.append({
                'id': t.id,
                'name': t.name,
                'logo': resolve_team_logo(t),
                'total_players': tot_count,
                'pending_transfers_count': pending_count,
                'departures_count': dep_count,
            })

        # Clubs with pending changes are prioritized to the front
        clubs_data.sort(key=lambda x: (-x['pending_transfers_count'], x['name']))

        return Response({
            'total_pending_league': total_pending_league,
            'total_clubs_with_pending': total_clubs_with_pending,
            'total_clubs': len(clubs_data),
            'clubs': clubs_data
        })


class AdminPESTransferClubDetailView(views.APIView):
    """
    Returns full squad of a club with complete player attributes,
    origin base team in PES, career trajectory breadcrumb, and list of departures.
    """
    permission_classes = [IsAdminOrDebug]

    def get(self, request, team_id):
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'باشگاه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        from transfers.models import TransferHistory

        squad_qs = Player.objects.filter(team=team).select_related('base_team', 'team')
        player_ids = [p.id for p in squad_qs]

        # In-memory batch transfer history query for ultra fast response
        player_transfers = list(
            TransferHistory.objects.filter(player_id__in=player_ids)
            .select_related('seller_team', 'buyer_team')
            .order_by('transferred_at', 'id')
        )

        squad_data = []
        pending_count = 0

        for p in squad_qs:
            is_pending = not p.pes_transfer_applied
            if is_pending:
                pending_count += 1

            chain, trajectory_text = get_player_trajectory(p, prefetch_histories=player_transfers)
            is_new = is_pending or (p.base_team_id and p.base_team_id != team.id) or any(t.player_id == p.id for t in player_transfers)

            squad_data.append({
                'id': p.id,
                'name': p.name,
                'photo': resolve_player_photo_url(p),
                'position': p.position,
                'overall': p.overall,
                'age': p.age,
                'nationality': p.nationality or '',
                'shirt_number': p.shirt_number,
                'pes_transfer_applied': p.pes_transfer_applied,
                'is_new_signing': is_new,
                'base_team': {
                    'id': p.base_team.id if p.base_team else None,
                    'name': p.base_team.name if p.base_team else 'نامشخص',
                    'logo': resolve_team_logo(p.base_team)
                },
                'trajectory': chain,
                'trajectory_text': trajectory_text,
            })

        # Sort: pending first, then new signings, then highest overall
        squad_data.sort(key=lambda x: (
            1 if x['pes_transfer_applied'] else 0,
            0 if x['is_new_signing'] else 1,
            -x['overall']
        ))

        # Departures (transfers where seller was this team)
        departures_qs = (
            TransferHistory.objects.filter(seller_team=team)
            .select_related('player', 'buyer_team')
            .order_by('-transferred_at', '-id')[:100]
        )
        departures_data = []
        for d in departures_qs:
            departures_data.append({
                'id': d.id,
                'player_id': d.player.id if d.player else None,
                'player_name': d.player.name if d.player else 'بازیکن حذف شده',
                'player_photo': resolve_player_photo_url(d.player) if d.player else '/players/default.png',
                'player_position': d.player.position if d.player else '',
                'player_overall': d.player.overall if d.player else 0,
                'player_nationality': d.player.nationality if d.player else '',
                'buyer_team_id': d.buyer_team.id if d.buyer_team else None,
                'buyer_team_name': d.buyer_team.name if d.buyer_team else 'بازیکن آزاد',
                'buyer_team_logo': resolve_team_logo(d.buyer_team),
                'fee': float(d.price_usd or 0),
                'transfer_type': d.transfer_type,
                'transferred_at': d.transferred_at.strftime('%Y-%m-%d %H:%M') if d.transferred_at else None
            })

        return Response({
            'club': {
                'id': team.id,
                'name': team.name,
                'logo': resolve_team_logo(team),
                'total_players': len(squad_data),
                'pending_transfers_count': pending_count,
                'departures_count': len(departures_data)
            },
            'squad': squad_data,
            'departures': departures_data
        })


class AdminPESTransferToggleView(views.APIView):
    """
    Toggles or sets the pes_transfer_applied state for a specific player,
    or batch-marks all players in a club as applied in PES.
    """
    permission_classes = [IsAdminOrDebug]

    def post(self, request):
        player_id = request.data.get('player_id')
        team_id = request.data.get('team_id')
        mark_all = request.data.get('mark_all', False)
        applied_val = request.data.get('applied')

        if mark_all and team_id:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return Response({'error': 'باشگاه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

            updated = Player.objects.filter(team=team).update(pes_transfer_applied=True)
            return Response({
                'status': f'تمام بازیکنان تیم «{team.name}» به عنوان اعمال‌شده در PES تیک خوردند.',
                'team_id': team.id,
                'updated_count': updated,
                'pending_transfers_count': 0
            })

        if not player_id:
            return Response({'error': 'شناسه بازیکن الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            player = Player.objects.get(id=player_id)
        except Player.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if applied_val is not None:
            player.pes_transfer_applied = bool(applied_val)
        else:
            player.pes_transfer_applied = not player.pes_transfer_applied

        player.save(update_fields=['pes_transfer_applied'])

        team_pending = 0
        if player.team_id:
            team_pending = Player.objects.filter(team_id=player.team_id, pes_transfer_applied=False).count()

        return Response({
            'status': 'وضعیت انتقال در PES بروزرسانی شد.',
            'player_id': player.id,
            'player_name': player.name,
            'pes_transfer_applied': player.pes_transfer_applied,
            'team_id': player.team_id,
            'team_pending_count': team_pending
        })


# ==============================================================================
# Disciplinary Committee & Club Sanctions Views
# ==============================================================================
from datetime import timedelta
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db import transaction as db_transaction
from django.db.models import Sum, Q
from economy.models import Transaction
from notifications.models import Notification
from transfers.models import TransferLog
from audit.utils import log_admin_action


STANDARD_VIOLATIONS = [
    {
        'code': 'MATCH_DELAY',
        'title': 'تاخیر در حضور برای مسابقه',
        'default_fine_usd': 50000,
        'default_fine_gems': 0,
        'default_points': 0,
        'default_ban_days': 0,
        'severity': 'LOW',
        'description': 'تاخیر غیرموجه بیش از ۱۵ دقیقه در هماهنگی یا شروع بازی رسمی.'
    },
    {
        'code': 'NO_GAMEPLAN',
        'title': 'عدم ثبت یا ارسال ترکیب قبل از مسابقه',
        'default_fine_usd': 20000,
        'default_fine_gems': 0,
        'default_points': 0,
        'default_ban_days': 0,
        'severity': 'LOW',
        'description': 'عدم تایید و ثبت ارنج یا تاکتیک تیم تا پیش از ضرب‌الاجل مقرر مسابقه.'
    },
    {
        'code': 'UNSPORTSMANLIKE',
        'title': 'توهین، الفاظ نامناسب یا رفتار غیرورزشی',
        'default_fine_usd': 100000,
        'default_fine_gems': 50,
        'default_points': 1,
        'default_ban_days': 7,
        'severity': 'MEDIUM',
        'description': 'رفتار ناشایست، بی‌احترامی به حریف یا لیدرهای لیگ در رسانه‌ها یا حین بازی.'
    },
    {
        'code': 'REFEREE_ADMIN_INSULT',
        'title': 'توهین به داور یا مسئولین برگزاری مسابقات',
        'default_fine_usd': 120000,
        'default_fine_gems': 60,
        'default_points': 1,
        'default_ban_days': 10,
        'severity': 'HIGH',
        'description': 'هرگونه الفاظ رکیک، توهین، هتک حرمت یا تهدید علیه داور و کادر اجرایی مسابقات.'
    },
    {
        'code': 'INELIGIBLE_PLAYER',
        'title': 'استفاده از بازیکن غیرمجاز یا محروم در ترکیب',
        'default_fine_usd': 200000,
        'default_fine_gems': 80,
        'default_points': 3,
        'default_ban_days': 7,
        'severity': 'HIGH',
        'description': 'بازی دادن بازیکن دارای محرومیت انضباطی، کارت قرمز، مصدومیت یا ثبت‌نشده در لیست رسمی.'
    },
    {
        'code': 'FORFEIT_RAGE_QUIT',
        'title': 'ترک بازی یکطرفه یا عدم انجام مسابقه',
        'default_fine_usd': 150000,
        'default_fine_gems': 0,
        'default_points': 3,
        'default_ban_days': 0,
        'severity': 'HIGH',
        'description': 'خروج غیرموجه در جریان بازی یا عدم شرکت در مسابقه رسمی بدون هماهنگی.'
    },
    {
        'code': 'TRANSFER_VIOLATION',
        'title': 'تخلف در بازار نقل‌وانتقالات',
        'default_fine_usd': 250000,
        'default_fine_gems': 100,
        'default_points': 0,
        'default_ban_days': 14,
        'severity': 'HIGH',
        'description': 'تخطی از قوانین معامله، دور زدن سقف دستمزد یا توافقات غیررسمی غیرمجاز.'
    },
    {
        'code': 'MATCH_FIXING_CHEATING',
        'title': 'تبانی، دستکاری نتایج یا تقلب',
        'default_fine_usd': 500000,
        'default_fine_gems': 200,
        'default_points': 6,
        'default_ban_days': 30,
        'severity': 'CRITICAL',
        'description': 'تبانی مستقیم در نتایج، استفاده از ابزارهای غیرمجاز، گل‌به‌خودی عمدی یا فساد رقابتی.'
    },
    {
        'code': 'CUSTOM',
        'title': 'سایر تخلفات (سفارشی)',
        'default_fine_usd': 0,
        'default_fine_gems': 0,
        'default_points': 0,
        'default_ban_days': 0,
        'severity': 'INFO',
        'description': 'تخلف خاص یا تصمیم موردی کمیته انضباطی با مقادیر و عناوین دلخواه مدیریت.'
    },
]


class AdminDisciplinaryOverviewView(views.APIView):
    """
    Returns summary statistics, catalog of standard violations,
    active tournaments and clubs for the admin disciplinary dashboard.
    """
    permission_classes = [IsAdminOrDebug]

    def get(self, request):
        from matches.models import Tournament
        now = timezone.now()

        total_penalties = ClubPenalty.objects.count()
        active_penalties = ClubPenalty.objects.filter(status='ACTIVE').count()
        fines_sum = ClubPenalty.objects.filter(status='ACTIVE').aggregate(
            usd=Sum('fine_budget_usd'),
            gems=Sum('fine_gems'),
            pts=Sum('points_deduction')
        )
        active_transfer_bans = Team.objects.filter(transfer_ban_until__gt=now).count()

        team_qs = Team.objects.filter(is_active=True)
        if not team_qs.exists():
            team_qs = Team.objects.all()

        teams = list(
            team_qs.values(
                'id', 'name', 'logo', 'budget', 'gems', 'transfer_ban_until'
            ).order_by('name')
        )
        for t in teams:
            ban_until = t.get('transfer_ban_until')
            t['is_transfer_banned'] = bool(ban_until and ban_until > now)

        tournaments = list(
            Tournament.objects.all().values(
                'id', 'name', 'tournament_type', 'is_active'
            ).order_by('-id')
        )
        for tour in tournaments:
            tour['status'] = 'ACTIVE' if tour.get('is_active') else 'INACTIVE'

        return Response({
            'stats': {
                'total_penalties': total_penalties,
                'active_penalties': active_penalties,
                'total_fines_usd': float(fines_sum['usd'] or 0),
                'total_fines_gems': int(fines_sum['gems'] or 0),
                'total_points_deducted': int(fines_sum['pts'] or 0),
                'active_transfer_bans': active_transfer_bans,
            },
            'standard_violations': STANDARD_VIOLATIONS,
            'teams': teams,
            'tournaments': tournaments,
        })


class AdminDisciplinaryRecordsView(views.APIView):
    """
    Returns a filtered list of club penalties.
    Supports filters: team_id, status (ACTIVE, REVOKED, EXPIRED, ALL), violation_type, search.
    """
    permission_classes = [IsAdminOrDebug]

    def get(self, request):
        qs = ClubPenalty.objects.select_related('team', 'issued_by', 'revoked_by', 'tournament').all()

        team_id = request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(team_id=team_id)

        status_filter = request.query_params.get('status', 'ALL')
        if status_filter and status_filter != 'ALL':
            qs = qs.filter(status=status_filter)

        violation = request.query_params.get('violation_type')
        if violation and violation != 'ALL':
            qs = qs.filter(violation_type=violation)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(reason__icontains=search) |
                Q(team__name__icontains=search)
            )

        serializer = ClubPenaltySerializer(qs[:150], many=True)
        return Response(serializer.data)


class AdminDisciplinaryIssueView(views.APIView):
    """
    Issues a new disciplinary penalty against a club.
    Applies financial deductions (budget/gems), points deduction on standings,
    and sets a transfer ban period (custom days or exact target date).
    """
    permission_classes = [IsAdminOrDebug]

    def post(self, request):
        data = request.data
        team_id = data.get('team_id')
        if not team_id:
            return Response({'error': 'انتخاب تیم متخلف الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'تیم مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        violation_type = data.get('violation_type', 'CUSTOM')
        title = (data.get('title') or '').strip()
        reason = (data.get('reason') or '').strip()

        if not title:
            return Response({'error': 'عنوان حکم انضباطی الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({'error': 'شرح تخلف و دلایل حکم الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fine_budget_usd = Decimal(str(data.get('fine_budget_usd', 0) or 0))
        except (ValueError, InvalidOperation):
            fine_budget_usd = Decimal('0.00')

        try:
            fine_gems = max(0, int(data.get('fine_gems', 0) or 0))
        except (ValueError, TypeError):
            fine_gems = 0

        try:
            points_deduction = max(0, int(data.get('points_deduction', 0) or 0))
        except (ValueError, TypeError):
            points_deduction = 0

        try:
            transfer_ban_days = max(0, int(data.get('transfer_ban_days', 0) or 0))
        except (ValueError, TypeError):
            transfer_ban_days = 0

        exact_ban_until = data.get('transfer_ban_until')
        tournament_id = data.get('tournament_id')
        is_warning = bool(data.get('is_warning', False))
        publish_to_newsroom = bool(data.get('publish_to_newsroom', True))
        case_number = (data.get('case_number') or '').strip()
        official_verdict_text = (data.get('official_verdict_text') or '').strip()

        now = timezone.now()
        calculated_ban_until = None

        if exact_ban_until:
            parsed = parse_datetime(str(exact_ban_until))
            if parsed and parsed > now:
                calculated_ban_until = parsed
                if transfer_ban_days == 0:
                    transfer_ban_days = max(1, (parsed - now).days)
        elif transfer_ban_days > 0:
            calculated_ban_until = now + timedelta(days=transfer_ban_days)

        with db_transaction.atomic():
            tournament_obj = None
            if tournament_id:
                from matches.models import Tournament
                tournament_obj = Tournament.objects.filter(id=tournament_id).first()

            penalty = ClubPenalty.objects.create(
                team=team,
                issued_by=request.user if request.user.is_authenticated else None,
                violation_type=violation_type,
                title=title,
                reason=reason,
                case_number=case_number,
                official_verdict_text=official_verdict_text,
                fine_budget_usd=fine_budget_usd,
                fine_gems=fine_gems,
                tournament=tournament_obj,
                points_deduction=points_deduction,
                transfer_ban_days=transfer_ban_days,
                transfer_ban_until=calculated_ban_until,
                is_warning=is_warning,
                publish_to_newsroom=publish_to_newsroom,
                status='ACTIVE'
            )

            if not penalty.case_number:
                penalty.case_number = f"VML-JD-{now.year}-{penalty.id:04d}"
                penalty.save(update_fields=['case_number'])

            # 1. Financial deduction (Negative budget allowed as club debt)
            if fine_budget_usd > 0:
                team.budget = team.budget - fine_budget_usd
                team.save(update_fields=['budget'])
                Transaction.objects.create(
                    team=team,
                    currency='BUDGET',
                    transaction_type='DISCIPLINARY_FINE',
                    amount=-fine_budget_usd,
                    status='SUCCESS',
                    description=f"جریمه کمیته انضباطی: {title}"
                )

            if fine_gems > 0:
                team.gems = max(0, team.gems - fine_gems)
                team.save(update_fields=['gems'])
                Transaction.objects.create(
                    team=team,
                    currency='GEMS',
                    transaction_type='DISCIPLINARY_FINE',
                    amount=-fine_gems,
                    status='SUCCESS',
                    description=f"جریمه جم کمیته انضباطی: {title}"
                )

            # 2. Points deduction in tournament standing
            if points_deduction > 0 and tournament_obj:
                from matches.models import LeagueStanding
                standing = LeagueStanding.objects.filter(team=team, tournament=tournament_obj).first()
                if standing:
                    standing.points_deduction += points_deduction
                    standing.points_deduction_reason = f"حکم انضباطی: {title}"
                    standing.save(update_fields=['points_deduction', 'points_deduction_reason'])

            # 3. Apply transfer ban on Team
            if calculated_ban_until:
                if not team.transfer_ban_until or calculated_ban_until > team.transfer_ban_until:
                    team.transfer_ban_until = calculated_ban_until
                    team.save(update_fields=['transfer_ban_until'])

            # 4. In-app notification to club coach
            fine_details = []
            if fine_budget_usd > 0:
                fine_details.append(f"کسر بودجه: {float(fine_budget_usd):,.0f} $")
            if fine_gems > 0:
                fine_details.append(f"کسر جم: {fine_gems} 💎")
            if points_deduction > 0:
                fine_details.append(f"کسر امتیاز در جدول: {points_deduction} امتیاز")
            if calculated_ban_until:
                fine_details.append(f"محرومیت نقل‌وانتقالات تا: {calculated_ban_until.strftime('%Y/%m/%d %H:%M')}")
            if is_warning:
                fine_details.append("اخطار رسمی کتبی درج در پرونده")

            details_str = " | ".join(fine_details) if fine_details else "بدون جریمه مضاعف"

            Notification.objects.create(
                team=team,
                category='DISCIPLINARY',
                target_role='COACH',
                title=f"⚖️ حکم کمیته انضباطی: {title}",
                message=f"باشگاه شما مشمول حکم انضباطی گردید.\nجزئیات: {details_str}\nشرح رای: {reason}"
            )

            # 5. Newsroom log with rich structured verdict payload
            if publish_to_newsroom:
                import json
                verdict_payload = {
                    'penalty_id': penalty.id,
                    'case_number': penalty.case_number,
                    'team_id': team.id,
                    'team_name': team.name,
                    'team_logo': getattr(team.logo, 'url', None) if team.logo else None,
                    'tournament_name': tournament_obj.name if tournament_obj else None,
                    'violation_type': violation_type,
                    'violation_type_display': penalty.get_violation_type_display(),
                    'title': title,
                    'reason': reason,
                    'fine_budget_usd': float(fine_budget_usd),
                    'fine_gems': fine_gems,
                    'points_deduction': points_deduction,
                    'transfer_ban_days': transfer_ban_days,
                    'transfer_ban_until': calculated_ban_until.isoformat() if calculated_ban_until else None,
                    'is_warning': is_warning,
                    'official_verdict_text': penalty.official_verdict_text,
                    'details_str': details_str,
                    'created_at': penalty.created_at.isoformat() if penalty.created_at else now.isoformat(),
                }
                TransferLog.objects.create(
                    event_type='DISCIPLINARY_ACTION',
                    description=json.dumps(verdict_payload, ensure_ascii=False)
                )

            # 6. Audit log
            try:
                log_admin_action(
                    admin_user=request.user if request.user.is_authenticated else None,
                    action_type='DISCIPLINARY_PENALTY_ISSUED',
                    target_team=team,
                    reason=f"{title}: {reason}"
                )
            except Exception:
                pass

        return Response({
            'status': 'حکم انضباطی با موفقیت صادر و اعمال شد.',
            'penalty': ClubPenaltySerializer(penalty).data
        }, status=status.HTTP_201_CREATED)


class AdminDisciplinaryRevokeView(views.APIView):
    """
    Revokes / pardons an active penalty, automatically refunding any deducted
    fines (USD/gems), restoring deducted points, and lifting the transfer ban.
    """
    permission_classes = [IsAdminOrDebug]

    def post(self, request, penalty_id):
        try:
            penalty = ClubPenalty.objects.select_related('team', 'tournament').get(id=penalty_id)
        except ClubPenalty.DoesNotExist:
            return Response({'error': 'حکم انضباطی یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if penalty.status != 'ACTIVE':
            return Response(
                {'error': f'این حکم در وضعیت فعال نیست (وضعیت فعلی: {penalty.get_status_display()}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        revoke_reason = (request.data.get('reason') or '').strip()
        team = penalty.team
        now = timezone.now()

        with db_transaction.atomic():
            # 1. Refund USD Budget
            if penalty.fine_budget_usd > 0:
                team.budget = team.budget + penalty.fine_budget_usd
                team.save(update_fields=['budget'])
                Transaction.objects.create(
                    team=team,
                    currency='BUDGET',
                    transaction_type='DISCIPLINARY_REFUND',
                    amount=penalty.fine_budget_usd,
                    status='SUCCESS',
                    description=f"استرداد جریمه انضباطی حکم #{penalty.id}: {penalty.title}"
                )

            # 2. Refund Gems
            if penalty.fine_gems > 0:
                team.gems = team.gems + penalty.fine_gems
                team.save(update_fields=['gems'])
                Transaction.objects.create(
                    team=team,
                    currency='GEMS',
                    transaction_type='DISCIPLINARY_REFUND',
                    amount=penalty.fine_gems,
                    status='SUCCESS',
                    description=f"استرداد جریمه جم حکم #{penalty.id}: {penalty.title}"
                )

            # 3. Restore Points
            if penalty.points_deduction > 0 and penalty.tournament:
                from matches.models import LeagueStanding
                standing = LeagueStanding.objects.filter(team=team, tournament=penalty.tournament).first()
                if standing:
                    standing.points_deduction = max(0, standing.points_deduction - penalty.points_deduction)
                    standing.save(update_fields=['points_deduction'])

            # 4. Check & Re-evaluate Transfer Ban
            if penalty.transfer_ban_until:
                other_active_bans = ClubPenalty.objects.filter(
                    team=team, status='ACTIVE'
                ).exclude(id=penalty.id).filter(
                    transfer_ban_until__gt=now
                ).order_by('-transfer_ban_until').first()

                if other_active_bans:
                    team.transfer_ban_until = other_active_bans.transfer_ban_until
                else:
                    team.transfer_ban_until = None
                team.save(update_fields=['transfer_ban_until'])

            # 5. Mark Penalty as Revoked
            penalty.status = 'REVOKED'
            penalty.revoked_at = now
            penalty.revoked_by = request.user if request.user.is_authenticated else None
            penalty.revoke_reason = revoke_reason or 'عفو و بخشش مدیریت کمیته انضباطی'
            penalty.save(update_fields=['status', 'revoked_at', 'revoked_by', 'revoke_reason'])

            # 6. Notify Coach
            Notification.objects.create(
                team=team,
                category='DISCIPLINARY',
                target_role='COACH',
                title=f"🟢 بخشش و لغو حکم انضباطی: {penalty.title}",
                message=f"حکم انضباطی صادره علیه باشگاه شما بخشیده شد و کلیه مبالغ و امتیازات کسر شده مسترد گردید.\nعلت بخشش: {penalty.revoke_reason}"
            )

            # 7. Audit log
            try:
                log_admin_action(
                    admin_user=request.user if request.user.is_authenticated else None,
                    action_type='DISCIPLINARY_PENALTY_REVOKED',
                    target_team=team,
                    reason=f"لغو حکم #{penalty.id}: {penalty.revoke_reason}"
                )
            except Exception:
                pass

        return Response({
            'status': 'حکم انضباطی با موفقیت بخشیده شد و جریمه‌ها مسترد گردیدند.',
            'penalty': ClubPenaltySerializer(penalty).data
        })


class AdminDisciplinaryUpdateView(views.APIView):
    """
    Updates / amends an existing active disciplinary penalty.
    Calculates deltas for USD fines, gems fines, tournament points,
    and recalculates transfer bans, adjusting club and league stats in real time.
    """
    permission_classes = [IsAdminOrDebug]

    def post(self, request, penalty_id):
        try:
            penalty = ClubPenalty.objects.select_related('team', 'tournament').get(id=penalty_id)
        except ClubPenalty.DoesNotExist:
            return Response({'error': 'حکم انضباطی یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if penalty.status != 'ACTIVE':
            return Response(
                {'error': f'فقط احکام در وضعیت فعال قابل ویرایش هستند (وضعیت فعلی: {penalty.get_status_display()}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        team = penalty.team
        now = timezone.now()

        with db_transaction.atomic():
            # 1. USD Budget Delta
            old_usd = penalty.fine_budget_usd or Decimal('0.00')
            try:
                new_usd = Decimal(str(data.get('fine_budget_usd', old_usd) or 0))
            except Exception:
                new_usd = old_usd
            if new_usd < Decimal('0.00'):
                new_usd = Decimal('0.00')

            delta_usd = new_usd - old_usd
            if delta_usd > Decimal('0.00'):
                # Deduct additional fine from team
                team.budget = team.budget - delta_usd
                team.save(update_fields=['budget'])
                Transaction.objects.create(
                    team=team,
                    currency='BUDGET',
                    transaction_type='DISCIPLINARY_FINE',
                    amount=delta_usd,
                    status='SUCCESS',
                    description=f"افزایش جریمه نقدی در بازنگری حکم انضباطی #{penalty.id}: {penalty.title}"
                )
            elif delta_usd < Decimal('0.00'):
                # Refund reduced amount
                refund_usd = abs(delta_usd)
                team.budget = team.budget + refund_usd
                team.save(update_fields=['budget'])
                Transaction.objects.create(
                    team=team,
                    currency='BUDGET',
                    transaction_type='DISCIPLINARY_REFUND',
                    amount=refund_usd,
                    status='SUCCESS',
                    description=f"استرداد و کاهش جریمه نقدی در بازنگری حکم #{penalty.id}: {penalty.title}"
                )
            penalty.fine_budget_usd = new_usd

            # 2. Gems Delta
            old_gems = penalty.fine_gems or 0
            try:
                new_gems = int(data.get('fine_gems', old_gems) or 0)
            except Exception:
                new_gems = old_gems
            if new_gems < 0:
                new_gems = 0

            delta_gems = new_gems - old_gems
            if delta_gems > 0:
                team.gems = team.gems - delta_gems
                team.save(update_fields=['gems'])
                Transaction.objects.create(
                    team=team,
                    currency='GEMS',
                    transaction_type='DISCIPLINARY_FINE',
                    amount=delta_gems,
                    status='SUCCESS',
                    description=f"افزایش جریمه جم در بازنگری حکم #{penalty.id}: {penalty.title}"
                )
            elif delta_gems < 0:
                refund_gems = abs(delta_gems)
                team.gems = team.gems + refund_gems
                team.save(update_fields=['gems'])
                Transaction.objects.create(
                    team=team,
                    currency='GEMS',
                    transaction_type='DISCIPLINARY_REFUND',
                    amount=refund_gems,
                    status='SUCCESS',
                    description=f"استرداد جریمه جم در بازنگری حکم #{penalty.id}: {penalty.title}"
                )
            penalty.fine_gems = new_gems

            # 3. Points Deduction Delta
            old_points = penalty.points_deduction or 0
            try:
                new_points = int(data.get('points_deduction', old_points) or 0)
            except Exception:
                new_points = old_points
            if new_points < 0:
                new_points = 0

            delta_points = new_points - old_points
            if delta_points != 0 and penalty.tournament:
                from matches.models import LeagueStanding
                standing = LeagueStanding.objects.filter(team=team, tournament=penalty.tournament).first()
                if standing:
                    standing.points_deduction = max(0, standing.points_deduction + delta_points)
                    standing.save(update_fields=['points_deduction'])
            penalty.points_deduction = new_points

            # 4. Transfer Ban Re-evaluation
            has_transfer_ban = data.get('has_transfer_ban')
            if has_transfer_ban is None:
                # keep existing ban if not specified
                pass
            elif not has_transfer_ban:
                penalty.transfer_ban_days = 0
                penalty.transfer_ban_until = None
            else:
                ban_mode = data.get('ban_mode', 'DAYS')
                if ban_mode == 'DAYS':
                    days = int(data.get('transfer_ban_days', 0) or 0)
                    penalty.transfer_ban_days = days
                    penalty.transfer_ban_until = now + timedelta(days=days) if days > 0 else None
                elif ban_mode == 'DATE':
                    until_str = data.get('transfer_ban_until')
                    if until_str:
                        from django.utils.dateparse import parse_datetime
                        dt = parse_datetime(until_str)
                        if dt and timezone.is_naive(dt):
                            dt = timezone.make_aware(dt)
                        penalty.transfer_ban_until = dt
                        penalty.transfer_ban_days = max(0, (dt - now).days) if dt and dt > now else 0
                    else:
                        penalty.transfer_ban_until = None
                        penalty.transfer_ban_days = 0

            # Re-evaluate team transfer ban status across all other active bans
            other_active_bans = ClubPenalty.objects.filter(
                team=team, status='ACTIVE'
            ).exclude(id=penalty.id).filter(
                transfer_ban_until__gt=now
            ).order_by('-transfer_ban_until').first()

            target_ban_until = None
            if penalty.transfer_ban_until and penalty.transfer_ban_until > now:
                target_ban_until = penalty.transfer_ban_until
            if other_active_bans and other_active_bans.transfer_ban_until:
                if target_ban_until is None or other_active_bans.transfer_ban_until > target_ban_until:
                    target_ban_until = other_active_bans.transfer_ban_until

            team.transfer_ban_until = target_ban_until
            team.save(update_fields=['transfer_ban_until'])

            # 5. Metadata and text fields
            if 'title' in data and data['title']:
                penalty.title = data['title'].strip()
            if 'reason' in data and data['reason']:
                penalty.reason = data['reason'].strip()
            if 'official_verdict_text' in data:
                penalty.official_verdict_text = (data['official_verdict_text'] or '').strip()
            if 'case_number' in data and data['case_number']:
                penalty.case_number = data['case_number'].strip()
            if 'is_warning' in data:
                penalty.is_warning = bool(data['is_warning'])

            penalty.save()

            # 6. Notify Coach
            Notification.objects.create(
                team=team,
                category='DISCIPLINARY',
                target_role='COACH',
                title=f"⚖️ بازنگری و اصلاح حکم انضباطی: {penalty.title}",
                message=f"حکم انضباطی شماره #{penalty.id} توسط مدیریت کمیته انضباطی بازنگری و اصلاح گردید.\nشرح دادنامه اصلاحی: {penalty.reason}"
            )

            # 7. Audit log
            try:
                log_admin_action(
                    admin_user=request.user if request.user.is_authenticated else None,
                    action_type='DISCIPLINARY_PENALTY_EDITED',
                    target_team=team,
                    reason=f"ویرایش حکم #{penalty.id}: {penalty.title}"
                )
            except Exception:
                pass

        return Response({
            'status': 'حکم انضباطی با موفقیت بازنگری و اصلاح گردید.',
            'penalty': ClubPenaltySerializer(penalty).data
        })


class TeamPenaltiesView(views.APIView):
    """
    Returns disciplinary penalties for a given team (or the current user's team).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id=None):
        if team_id is None:
            if not hasattr(request.user, 'team') or not request.user.team:
                return Response({'error': 'باشگاهی برای شما یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
            team = request.user.team
        else:
            try:
                team = Team.objects.get(id=team_id)
            except Team.DoesNotExist:
                return Response({'error': 'باشگاه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        penalties = ClubPenalty.objects.filter(team=team).select_related('issued_by', 'tournament').order_by('-created_at')
        serializer = ClubPenaltySerializer(penalties, many=True)
        return Response({
            'team_id': team.id,
            'team_name': team.name,
            'is_transfer_banned': team.is_transfer_banned,
            'transfer_ban_until': team.transfer_ban_until,
            'penalties': serializer.data
        })


