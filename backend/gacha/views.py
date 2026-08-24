from decimal import Decimal
from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
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
        pack_player_id = request.data.get('pack_player_id')

        if not session_id or not pack_player_id:
            return Response({'error': 'شناسه سشن و شناسه کارت انتخابی الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        result = pick_card(session_id=int(session_id), pack_player_id=int(pack_player_id), team_id=int(team_id))

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result.get('error', 'خطا در انتخاب کارت')}, status=status.HTTP_400_BAD_REQUEST)


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
        if pack_id:
            try:
                pack = Pack.objects.get(id=pack_id)
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
    Admin endpoint to delete/remove a player from a pack pool.
    """
    permission_classes = [IsAdminRole]

    def delete(self, request, pack_id, player_id):
        try:
            player = PackPlayer.objects.get(pk=player_id, pack_id=pack_id)
            player_name = player.name
            player.delete()
            return Response({'success': True, 'message': f'بازیکن «{player_name}» از پک حذف شد.'})
        except PackPlayer.DoesNotExist:
            return Response({'error': 'بازیکن یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


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
