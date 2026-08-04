from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, Player, ClubFacilities, TeamGamePlan
from .serializers import TeamSerializer, PlayerSerializer, GamePlanUpdateSerializer, ClubFacilitiesSerializer, TeamGamePlanSerializer

# Global Live Stream Config Storage (Default to Aparat VML.Emad)
LIVE_STREAM_CONFIG = {
    'embed_url': 'https://www.aparat.com/embed/live/VML.Emad',
    'channel_name': 'VML.Emad',
    'title': 'پخش زنده رسمی لیگ مجازی مستر لیگ',
    'is_live': True,
}

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

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
        gameplan, _ = TeamGamePlan.objects.get_or_create(team=team)

        if request.method == 'POST':
            tactics = request.data.get('tactics', {})
            players_data = request.data.get('players', [])

            if 'formation' in tactics:
                gameplan.formation = tactics['formation']
            if 'play_style' in tactics:
                gameplan.play_style = tactics['play_style']
            if 'defensive_press' in tactics:
                gameplan.defensive_press = tactics['defensive_press']
            if 'attacking_level' in tactics:
                gameplan.attacking_level = tactics['attacking_level']
            if 'offside_trap' in tactics:
                gameplan.offside_trap = tactics['offside_trap']
            
            gameplan.is_submitted = True
            gameplan.save()

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

            return Response({
                'status': 'ترکیب و تاکتیک‌ها با موفقیت در بک‌اند ثبت شد و به پنل ادمین ارسال گردید.',
                'gameplan': TeamGamePlanSerializer(gameplan).data,
                'team': TeamSerializer(team).data
            })

        return Response({
            'gameplan': TeamGamePlanSerializer(gameplan).data,
            'team': TeamSerializer(team).data
        })

    @action(detail=True, methods=['post'])
    def upgrade_facility(self, request, pk=None):
        team = self.get_object()
        facility_name = request.data.get('facility')
        
        facilities, _ = ClubFacilities.objects.get_or_create(team=team)
        
        allowed_fields = [
            'training_camp_level', 'gym_level', 'medical_level', 
            'stadium_level', 'academy_level', 'scouting_level', 'pool_level'
        ]
        
        field_name = f"{facility_name}_level" if not facility_name.endswith('_level') else facility_name
        
        if field_name not in allowed_fields:
            return Response({'error': 'تسهیلات نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
        
        current_level = getattr(facilities, field_name)
        if current_level >= 20:
            return Response({'error': 'تسهیلات به حداکثر سطح (۲۰) رسیده است.'}, status=status.HTTP_400_BAD_REQUEST)
        
        setattr(facilities, field_name, current_level + 1)
        facilities.save()
        
        return Response({
            'status': 'ارتقاء با موفقیت انجام شد',
            'facility': field_name,
            'new_level': current_level + 1,
            'facilities': ClubFacilitiesSerializer(facilities).data
        })

    # === ADMIN MANAGEMENT ACTIONS ===

    @action(detail=False, methods=['post'])
    def admin_update_player(self, request):
        player_id = request.data.get('player_id')
        try:
            player = Player.objects.get(id=player_id)
            if 'overall' in request.data:
                player.overall = int(request.data['overall'])
            if 'virtual_stamina' in request.data:
                player.virtual_stamina = float(request.data['virtual_stamina'])
            if 'heal_injury' in request.data and request.data['heal_injury']:
                player.is_injured = False
                player.injury_return_date = None
            player.save()
            return Response({'status': 'Player updated by Admin', 'player': PlayerSerializer(player).data})
        except Player.DoesNotExist:
            return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def admin_override_facility(self, request):
        team_id = request.data.get('team_id', 1)
        facility_name = request.data.get('facility')
        new_level = int(request.data.get('level', 1))

        try:
            team = Team.objects.get(id=team_id)
            facilities, _ = ClubFacilities.objects.get_or_create(team=team)
            field_name = f"{facility_name}_level" if not facility_name.endswith('_level') else facility_name
            setattr(facilities, field_name, max(1, min(new_level, 20)))
            facilities.save()
            return Response({'status': 'Facility overridden by Admin', 'facilities': ClubFacilitiesSerializer(facilities).data})
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def admin_adjust_budget(self, request):
        team_id = request.data.get('team_id', 1)
        amount = float(request.data.get('amount', 0))
        try:
            team = Team.objects.get(id=team_id)
            team.budget = float(team.budget) + amount
            team.save()
            return Response({'status': 'Budget adjusted', 'new_budget': team.budget})
        except Team.DoesNotExist:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
