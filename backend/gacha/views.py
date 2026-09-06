from decimal import Decimal
from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db import transaction
from teams.models import Player
from audit.utils import log_admin_action
from .models import Pack, PackPlayer, PackOpeningSession
from .serializers import PackSerializer, PackPlayerSerializer, PackOpeningSessionSerializer
from .services import open_pack, pick_card, expire_all_stale_sessions


class PackListView(generics.ListAPIView):
    """
    Returns active packs available in the store for users.
    """
    serializer_class = PackSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Trigger background expiry of stale sessions when viewing packs
        try:
            expire_all_stale_sessions()
        except Exception:
            pass
        return Pack.objects.filter(is_active=True).order_by('sort_order', '-id')


class OpenPackView(views.APIView):
    """
    Phase 1: Opens a pack, selects 3 random cards, and reserves them for 5 minutes.
    """
    throttle_scope = 'gacha'
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'برای باز کردن پک باید مالک یک تیم باشید.'}, status=status.HTTP_403_FORBIDDEN)

        team_id = request.user.team.id
        pack_id = request.data.get('pack_id')
        payment_method = request.data.get('payment_method', 'GEMS')

        if not pack_id:
            return Response({'error': 'شناسه پک الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        result = open_pack(team_id=int(team_id), pack_id=int(pack_id), payment_method=payment_method)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result.get('error', 'خطا در باز کردن پک')}, status=status.HTTP_400_BAD_REQUEST)


class PickCardView(views.APIView):
    """
    Phase 2: Picks 1 player from the 3 revealed cards and adds them to the user's squad.
    """
    throttle_scope = 'gacha'
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'برای انتخاب کارت باید مالک یک تیم باشید.'}, status=status.HTTP_403_FORBIDDEN)

        team_id = request.user.team.id
        session_id = request.data.get('session_id')
        pack_player_id = (
            request.data.get('pack_player_id') or
            request.data.get('player_id') or
            request.data.get('card_id')
        )
        is_random = bool(request.data.get('is_random') or request.data.get('auto_random') or str(pack_player_id).lower() in ['random', 'auto', '0'])

        if not session_id:
            return Response({'error': 'شناسه سشن الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        if is_random or not pack_player_id:
            try:
                session = PackOpeningSession.objects.get(id=int(session_id), team_id=int(team_id))
                valid_card_ids = [cid for cid in [session.card_1_id, session.card_2_id, session.card_3_id] if cid]
                import random
                pack_player_id = random.choice(valid_card_ids)
            except PackOpeningSession.DoesNotExist:
                return Response({'error': 'سشن نامعتبر است.'}, status=status.HTTP_404_NOT_FOUND)

        result = pick_card(session_id=int(session_id), pack_player_id=int(pack_player_id), team_id=int(team_id))
        if is_random and result.get('success'):
            result['is_random_pick'] = True

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result.get('error', 'خطا در انتخاب کارت')}, status=status.HTTP_400_BAD_REQUEST)


class ExpireSessionView(views.APIView):
    """
    Called when a pack opening session times out without picking a card.
    Refunds the Gems or Budget paid by the team.
    """
    throttle_scope = 'gacha'
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'شناسه سشن الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = PackOpeningSession.objects.get(id=int(session_id))
        except PackOpeningSession.DoesNotExist:
            return Response({'error': 'سشن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_staff and session.team.manager != request.user:
            return Response({'error': 'شما دسترسی به این سشن ندارید.'}, status=status.HTTP_403_FORBIDDEN)

        refunded = expire_session(session)
        team = session.team
        team.refresh_from_db()

        return Response({
            'success': True,
            'refunded': refunded,
            'message': 'مهلت انتخاب کارت به پایان رسید و هزینه پرداختی به موجودی باشگاه عودت داده شد.',
            'remaining_gems': team.gems,
            'remaining_budget': float(team.budget)
        })


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin']
            )
        )

# =========================================================================
# Admin Views: Pack Management, Pool Management, JSON Upload & History
# =========================================================================

class AdminPackListView(views.APIView):
    """
    Admin endpoint to view all packs, stats, and create or update packs.
    """
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        packs = Pack.objects.all().order_by('sort_order', '-id')
        recent_sessions = PackOpeningSession.objects.select_related(
            'team', 'pack', 'picked_card', 'card_1', 'card_2', 'card_3'
        ).order_by('-created_at')[:40]

        return Response({
            'packs': PackSerializer(packs, many=True).data,
            'recent_sessions': PackOpeningSessionSerializer(recent_sessions, many=True).data
        })

    def post(self, request):
        pack_id = request.data.get('id')
        valid_id = None
        if pack_id is not None:
            try:
                val_str = str(pack_id).strip().lower()
                if val_str not in ('', 'null', 'undefined', 'none', '0'):
                    valid_id = int(val_str)
            except (ValueError, TypeError):
                valid_id = None

        if valid_id:
            try:
                pack = Pack.objects.get(id=valid_id)
                serializer = PackSerializer(pack, data=request.data, partial=True)
                if serializer.is_valid():
                    updated_pack = serializer.save()
                    return Response({
                        'success': True,
                        'message': f'پک «{updated_pack.name}» با موفقیت به‌روزرسانی شد.',
                        'pack': PackSerializer(updated_pack).data
                    })
                return Response({'error': 'اطلاعات وارد شده معتبر نیست.', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            except Pack.DoesNotExist:
                return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PackSerializer(data=request.data)
        if serializer.is_valid():
            pack = serializer.save()
            return Response({
                'success': True,
                'message': f'پک «{pack.name}» با موفقیت ایجاد شد.',
                'pack': PackSerializer(pack).data
            }, status=status.HTTP_201_CREATED)
        return Response({'error': 'اطلاعات وارد شده معتبر نیست.', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminPackDetailView(views.APIView):
    """
    Admin endpoint to update or delete a specific pack.
    """
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        try:
            pack = Pack.objects.get(pk=pk)
            return Response(PackSerializer(pack).data)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        return self._handle_update(request, pk)

    def patch(self, request, pk):
        return self._handle_update(request, pk)

    def post(self, request, pk):
        return self._handle_update(request, pk)

    def _handle_update(self, request, pk):
        try:
            pack = Pack.objects.get(pk=pk)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PackSerializer(pack, data=request.data, partial=True)
        if serializer.is_valid():
            updated_pack = serializer.save()
            return Response({
                'success': True,
                'message': f'پک «{updated_pack.name}» با موفقیت به‌روزرسانی شد.',
                'pack': PackSerializer(updated_pack).data
            })
        return Response({'error': 'اطلاعات وارد شده معتبر نیست.', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            pack = Pack.objects.get(pk=pk)
            pack_name = pack.name
            pack.delete()
            return Response({'success': True, 'message': f'پک «{pack_name}» حذف شد.'})
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


class AdminPackPlayersView(views.APIView):
    """
    Admin endpoint to view all players in a pack's pool and add a single player.
    """
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pack_id):
        try:
            pack = Pack.objects.get(pk=pack_id)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        players = pack.players.all().order_by('is_claimed', '-overall', 'name')
        return Response({
            'pack': PackSerializer(pack).data,
            'players': PackPlayerSerializer(players, many=True).data,
            'total_count': players.count(),
            'unclaimed_count': players.filter(is_claimed=False).count(),
            'claimed_count': players.filter(is_claimed=True).count()
        })

    def post(self, request, pack_id):
        try:
            pack = Pack.objects.get(pk=pack_id)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['pack'] = pack.id

        serializer = PackPlayerSerializer(data=data)
        if serializer.is_valid():
            player = serializer.save()
            return Response({
                'success': True,
                'message': f'بازیکن «{player.name}» به استخر بازیکنان پک «{pack.name}» اضافه شد.',
                'player': PackPlayerSerializer(player).data
            }, status=status.HTTP_201_CREATED)
        return Response({'error': 'اطلاعات وارد شده معتبر نیست.', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminPackPlayersBulkView(views.APIView):
    """
    Admin endpoint to bulk upload players to a pack's pool via JSON array.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pack_id):
        try:
            pack = Pack.objects.get(pk=pack_id)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        players_data = request.data.get('players')
        if not players_data or not isinstance(players_data, list):
            return Response({'error': 'آرایه بازیکنان (players) به عنوان لیست الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        created_players = []
        errors = []

        for idx, p in enumerate(players_data):
            name = p.get('name')
            position = p.get('position', 'CF')
            compatible_positions = p.get('compatible_positions', '')
            nationality = p.get('nationality', '')
            prime_club = p.get('prime_club', '')
            overall = p.get('overall') or p.get('ovr', 80)
            potential_ovr = p.get('potential_ovr', 99)
            age = p.get('age', 22)
            base_stamina = p.get('base_stamina', 80)
            rarity = p.get('rarity', 'REGULAR')
            wage = Decimal(str(p.get('wage', 100.0)))
            market_value = Decimal(str(p.get('market_value', 1000000.0)))

            if not name:
                errors.append(f"ردیف {idx + 1}: نام بازیکن الزامی است.")
                continue

            player_obj = PackPlayer.objects.create(
                pack=pack,
                name=name,
                position=position,
                compatible_positions=compatible_positions,
                nationality=nationality,
                prime_club=prime_club,
                overall=int(overall),
                potential_ovr=int(potential_ovr),
                age=int(age),
                base_stamina=int(base_stamina),
                rarity=rarity,
                wage=wage,
                market_value=market_value
            )
            created_players.append(player_obj)

        return Response({
            'success': True,
            'message': f'تعداد {len(created_players)} بازیکن با موفقیت به پک «{pack.name}» افزوده شدند.',
            'created_count': len(created_players),
            'errors': errors
        })


class AdminPackPlayerDetailView(views.APIView):
    """
    Admin endpoint to view, update or delete/remove a player from a pack pool.
    """
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pack_id, player_id):
        try:
            player = PackPlayer.objects.get(pk=player_id, pack_id=pack_id)
            return Response(PackPlayerSerializer(player).data)
        except PackPlayer.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pack_id, player_id):
        return self._handle_update(request, pack_id, player_id)

    def patch(self, request, pack_id, player_id):
        return self._handle_update(request, pack_id, player_id)

    def post(self, request, pack_id, player_id):
        return self._handle_update(request, pack_id, player_id)

    def _handle_update(self, request, pack_id, player_id):
        try:
            player = PackPlayer.objects.get(pk=player_id, pack_id=pack_id)
        except PackPlayer.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PackPlayerSerializer(player, data=request.data, partial=True)
        if serializer.is_valid():
            updated_player = serializer.save()
            return Response({
                'success': True,
                'message': f'اطلاعات بازیکن «{updated_player.name}» به‌روزرسانی شد.',
                'player': PackPlayerSerializer(updated_player).data
            })
        return Response({'error': 'اطلاعات وارد شده معتبر نیست.', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pack_id, player_id):
        try:
            player = PackPlayer.objects.get(pk=player_id, pack_id=pack_id)
            player_name = player.name
            player.delete()
            return Response({'success': True, 'message': f'بازیکن «{player_name}» از پک حذف شد.'})
        except PackPlayer.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


class AdminPackPlayerReturnView(views.APIView):
    """
    Admin endpoint to return a claimed player back to the pack pool,
    removing the created concrete player from the team they were added to.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pack_id, player_id):
        try:
            player = PackPlayer.objects.select_related('pack', 'claimed_by_team').get(pk=player_id, pack_id=pack_id)
        except PackPlayer.DoesNotExist:
            return Response({'error': 'بازیکن در این پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if not player.is_claimed:
            return Response({'error': 'این بازیکن دریافت نشده و هم‌اکنون در استخر پک موجود است.'}, status=status.HTTP_400_BAD_REQUEST)

        team = player.claimed_by_team
        team_name = team.name if team else 'تیم نامشخص'
        player_name = player.name

        with transaction.atomic():
            # 1. Delete concrete player created from pack session in that team
            sessions = PackOpeningSession.objects.filter(picked_card=player)
            removed_concrete = False
            for s in sessions:
                if s.created_player:
                    try:
                        p_to_del = s.created_player
                        s.created_player = None
                        s.save(update_fields=['created_player'])
                        p_to_del.delete()
                        removed_concrete = True
                    except Exception:
                        pass

            # Fallback: if no session link or player still exists in team
            if team:
                concrete_matches = Player.objects.filter(team=team, name__iexact=player.name, position=player.position)
                for cp in concrete_matches:
                    cp.delete()
                    removed_concrete = True

            # 2. Reset PackPlayer status
            player.is_claimed = False
            player.claimed_by_team = None
            player.claimed_at = None
            player.save(update_fields=['is_claimed', 'claimed_by_team', 'claimed_at'])

            # 3. Update team star rating
            if team:
                try:
                    team.update_star_rating(save=True)
                except Exception:
                    pass

            # 4. Audit log
            try:
                log_admin_action(
                    admin_user=request.user,
                    action_type='PACK_PLAYER_RETURNED',
                    target_team=team,
                    before_value=f"{player_name} claimed by {team_name}",
                    after_value=f"{player_name} returned to pack {player.pack.name}",
                    reason=f"Admin returned {player_name} from {team_name} back to {player.pack.name}"
                )
            except Exception:
                pass

        return Response({
            'success': True,
            'message': f'بازیکن «{player_name}» با موفقیت از ترکیب «{team_name}» حذف شد و به استخر پک «{player.pack.name}» بازگردانده شد.',
            'player': PackPlayerSerializer(player).data
        })


class AdminPackPlayersReturnAllView(views.APIView):
    """
    Admin endpoint to return all claimed players of a pack back to the pool,
    removing them from their respective teams.
    """
    permission_classes = [IsAdminRole]

    def post(self, request, pack_id):
        try:
            pack = Pack.objects.get(pk=pack_id)
        except Pack.DoesNotExist:
            return Response({'error': 'پک یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        claimed_players = list(pack.players.filter(is_claimed=True).select_related('claimed_by_team'))
        if not claimed_players:
            return Response({'error': 'هیچ بازیکن جذب‌شده‌ای در این پک وجود ندارد.'}, status=status.HTTP_400_BAD_REQUEST)

        returned_count = 0
        affected_teams = set()

        with transaction.atomic():
            for player in claimed_players:
                team = player.claimed_by_team
                if team:
                    affected_teams.add(team)

                sessions = PackOpeningSession.objects.filter(picked_card=player)
                for s in sessions:
                    if s.created_player:
                        try:
                            p_to_del = s.created_player
                            s.created_player = None
                            s.save(update_fields=['created_player'])
                            p_to_del.delete()
                        except Exception:
                            pass

                if team:
                    Player.objects.filter(team=team, name__iexact=player.name, position=player.position).delete()

                player.is_claimed = False
                player.claimed_by_team = None
                player.claimed_at = None
                player.save(update_fields=['is_claimed', 'claimed_by_team', 'claimed_at'])
                returned_count += 1

            for t in affected_teams:
                try:
                    t.update_star_rating(save=True)
                except Exception:
                    pass

        return Response({
            'success': True,
            'message': f'تعداد {returned_count} بازیکن جذب‌شده با موفقیت از ترکیب تیم‌ها حذف و به استخر پک «{pack.name}» بازگردانده شدند.',
            'returned_count': returned_count
        })


class AdminPackSessionsView(views.APIView):
    """
    Admin endpoint to view full history of pack opening sessions.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        pack_id = request.query_params.get('pack_id')
        status_filter = request.query_params.get('status')

        qs = PackOpeningSession.objects.select_related(
            'team', 'pack', 'picked_card', 'card_1', 'card_2', 'card_3', 'created_player'
        ).order_by('-created_at')

        if pack_id:
            qs = qs.filter(pack_id=pack_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        sessions = qs[:100]
        return Response(PackOpeningSessionSerializer(sessions, many=True).data)
