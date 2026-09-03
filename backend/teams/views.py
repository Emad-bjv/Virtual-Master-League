from decimal import Decimal, InvalidOperation
from django.conf import settings
from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, Player, ClubFacilities, TeamGamePlan
from .serializers import (
    TeamSerializer, PlayerSerializer, GamePlanUpdateSerializer, 
    ClubFacilitiesSerializer, TeamGamePlanSerializer, resolve_player_photo_url
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
    queryset = Team.objects.all().select_related('manager', 'facilities', 'gameplan').prefetch_related('players')
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdminOrReadOnly]

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'live_stream']:
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
            for item in serializer.validated_data:
                try:
                    player = Player.objects.get(id=item['player_id'], team=team)
                    player.x_coord = item['x_coord']
                    player.y_coord = item['y_coord']
                    player.is_starting = item['is_starting']
                    player.save(update_fields=['x_coord', 'y_coord', 'is_starting'])
                except Player.DoesNotExist:
                    continue
            return Response({'status': 'Game plan updated successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def submit_gameplan(self, request, pk=None):
        team = self.get_object()
        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if not is_admin and team.manager != request.user:
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

        # Match-scoped gameplan
        match_gameplan = None
        if target_match:
            match_gameplan, _ = MatchGamePlan.objects.get_or_create(
                match=target_match,
                team=team,
                defaults={
                    'formation': default_gameplan.formation,
                    'attacking_style': default_gameplan.attacking_style,
                    'build_up': default_gameplan.build_up,
                    'attacking_area': default_gameplan.attacking_area,
                    'positioning': default_gameplan.positioning,
                    'support_range': default_gameplan.support_range,
                    'defensive_style': default_gameplan.defensive_style,
                    'containment_area': default_gameplan.containment_area,
                    'pressing': default_gameplan.pressing,
                    'defensive_line': default_gameplan.defensive_line,
                    'compactness': default_gameplan.compactness,
                    'adv_offense_1': default_gameplan.adv_offense_1,
                    'adv_offense_2': default_gameplan.adv_offense_2,
                    'adv_defense_1': default_gameplan.adv_defense_1,
                    'adv_defense_2': default_gameplan.adv_defense_2,
                    'is_submitted': False,
                }
            )

        # If match_gameplan is not submitted yet, always inherit the latest default gameplan & formation
        if match_gameplan and not match_gameplan.is_submitted:
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

        active_gameplan = match_gameplan if match_gameplan else default_gameplan

        if request.method == 'POST':
            tactics = request.data.get('tactics', {})
            players_data = request.data.get('players', [])
            preset_name = request.data.get('preset_name') or tactics.get('preset_name', '')
            has_custom_player_edits = request.data.get('has_custom_player_edits', False) or tactics.get('has_custom_player_edits', False)
            
            tactics['preset_name'] = preset_name
            tactics['has_custom_player_edits'] = has_custom_player_edits

            # Update default template permanently as the team's standing gameplan
            default_gameplan.is_submitted = True
            default_gameplan.preset_name = preset_name
            default_gameplan.has_custom_player_edits = has_custom_player_edits
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
                for item in players_data:
                    try:
                        p_id = item.get('player_id') or item.get('id')
                        player = Player.objects.get(id=p_id, team=team)
                        update_fields = []
                        if 'x_coord' in item and item['x_coord'] is not None:
                            player.x_coord = item['x_coord']
                            update_fields.append('x_coord')
                        if 'y_coord' in item and item['y_coord'] is not None:
                            player.y_coord = item['y_coord']
                            update_fields.append('y_coord')
                        if 'is_starting' in item and item['is_starting'] is not None:
                            player.is_starting = item['is_starting']
                            update_fields.append('is_starting')
                        if update_fields:
                            player.save(update_fields=update_fields)
                    except Player.DoesNotExist:
                        continue

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
                })
            except Exception as e:
                print("Failed to broadcast tactical change:", e)

            serialized_gp = MatchGamePlanSerializer(active_gameplan).data if isinstance(active_gameplan, MatchGamePlan) else TeamGamePlanSerializer(active_gameplan).data
            return Response({
                'status': 'ترکیب و تاکتیک‌ها با موفقیت در بک‌اند ثبت شد و به پنل ادمین ارسال گردید.',
                'gameplan': serialized_gp,
                'target_match_id': target_match.id if target_match else None,
                'target_match_round': target_match.round_name if target_match else None,
                'team': TeamSerializer(team).data
            })

        serialized_gp = MatchGamePlanSerializer(active_gameplan).data if isinstance(active_gameplan, MatchGamePlan) else TeamGamePlanSerializer(active_gameplan).data
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
