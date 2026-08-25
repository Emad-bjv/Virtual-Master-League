from decimal import Decimal, InvalidOperation
from django.conf import settings
from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, Player, ClubFacilities, TeamGamePlan
from .serializers import TeamSerializer, PlayerSerializer, GamePlanUpdateSerializer, ClubFacilitiesSerializer, TeamGamePlanSerializer


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
                    player.position = item['position']
                    player.is_starting = item['is_starting']
                    player.save()
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

        active_gameplan = match_gameplan if match_gameplan else default_gameplan

        if request.method == 'POST':
            tactics = request.data.get('tactics', {})
            players_data = request.data.get('players', [])

            # Update default template
            def_serializer = TeamGamePlanSerializer(default_gameplan, data=tactics, partial=True)
            if def_serializer.is_valid():
                def_serializer.save()

            # Update match gameplan
            if match_gameplan:
                mgp_serializer = MatchGamePlanSerializer(match_gameplan, data=tactics, partial=True)
                mgp_serializer.is_valid(raise_exception=True)
                from django.utils import timezone
                mgp_serializer.save(is_submitted=True, submitted_at=timezone.now(), players_data=players_data)
                active_gameplan = match_gameplan
            else:
                default_gameplan.is_submitted = True
                default_gameplan.save()
                active_gameplan = default_gameplan

            if players_data:
                for item in players_data:
                    try:
                        p_id = item.get('player_id') or item.get('id')
                        player = Player.objects.get(id=p_id, team=team)
                        if 'x_coord' in item: player.x_coord = item['x_coord']
                        if 'y_coord' in item: player.y_coord = item['y_coord']
                        if 'position' in item: player.position = item['position']
                        if 'is_starting' in item: player.is_starting = item['is_starting']
                        player.save()
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

                for m in target_broadcast_matches:
                    broadcast_match_event(m.id, {
                        'type': 'coach_tactics_submitted',
                        'match_id': m.id,
                        'team_id': team.id,
                        'team_name': team.name,
                        'is_home': m.home_team_id == team.id,
                        'formation': active_gameplan.formation,
                        'tactics': MatchGamePlanSerializer(active_gameplan).data if isinstance(active_gameplan, MatchGamePlan) else TeamGamePlanSerializer(active_gameplan).data,
                        'message': f'سرمربی تیم {team.name} ترکیب و تاکتیک جدید را برای مسابقه ارسال کرد ⚡'
                    })

                notify_admin({
                    'type': 'coach_tactics_submitted',
                    'title': f'درخواست تغییرات تاکتیکی: {team.name}',
                    'body': f'سرمربی تیم {team.name} ترکیب جدید ({active_gameplan.formation}) را برای {target_match.round_name if target_match else "مسابقه"} ارسال کرد.',
                    'team_id': team.id,
                    'team_name': team.name,
                    'formation': active_gameplan.formation,
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
                player.injury_return_date = None
            player.save()
            
            after_value = {
                'overall': int(player.overall),
                'virtual_stamina': float(player.virtual_stamina),
                'is_injured': player.is_injured,
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
    queryset = Player.objects.all().select_related('team', 'loan_owner_team')
    serializer_class = PlayerSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdminOrReadOnly]

    @action(detail=True, methods=['post'])
    def recover_stamina(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.is_staff and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای مدیریت این بازیکن را ندارید.")
            
        current_stamina = float(player.virtual_stamina)
        if current_stamina >= 100.0 and not player.is_locked:
            return Response({'error': 'استقامت بازیکن در حداکثر توان (۱۰۰٪) است.'}, status=status.HTTP_400_BAD_REQUEST)
            
        STAMINA_RECOVERY_COST = 10
        from economy.services import process_atomic_wallet_update
        wallet_res = process_atomic_wallet_update(
            team_id=player.team.id,
            amount=-STAMINA_RECOVERY_COST,
            currency='GEMS',
            transaction_type='STAMINA_RECOVERY',
            description=f"شارژ فوری استقامت بازیکن {player.name} (+۵۰٪)"
        )
        if not wallet_res.get('success'):
            return Response({
                'error': f"جم کافی نیست. هزینه شارژ استقامت: {STAMINA_RECOVERY_COST} جم. (موجودی فعلی: {player.team.gems} جم)",
                'required_gems': STAMINA_RECOVERY_COST,
                'current_gems': player.team.gems
            }, status=status.HTTP_400_BAD_REQUEST)
            
        new_stamina = min(100.0, current_stamina + 50.0)
        player.virtual_stamina = Decimal(str(new_stamina))
        if new_stamina >= 30.0:
            player.is_locked = False
        player.save(update_fields=['virtual_stamina', 'is_locked'])
        player.team.refresh_from_db(fields=['gems'])
        
        return Response({
            'status': f'استقامت {player.name} ۵۰٪ شارژ شد.',
            'new_stamina': float(player.virtual_stamina),
            'gem_cost': STAMINA_RECOVERY_COST,
            'remaining_gems': player.team.gems,
            'player': PlayerSerializer(player).data
        })

    @action(detail=True, methods=['post'])
    def heal_injury(self, request, pk=None):
        player = self.get_object()
        if not player.team:
            return Response({'error': 'بازیکن در تیمی عضو نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.is_staff and player.team.manager != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("شما دسترسی برای مدیریت این بازیکن را ندارید.")
            
        if not player.is_injured and not player.injury_return_date:
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
        player.injury_return_date = None
        player.save(update_fields=['is_injured', 'injury_return_date'])
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
