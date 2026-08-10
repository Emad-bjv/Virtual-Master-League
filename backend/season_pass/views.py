from rest_framework import viewsets, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from .models import TeamTaskProgress, SeasonPassLevel, TeamSeasonPass
from .serializers import TeamTaskProgressSerializer, SeasonPassLevelSerializer, TeamSeasonPassSerializer
from .services import claim_task_reward, claim_level_reward
from teams.models import Team

class SeasonPassViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_team(self, request):
        return Team.objects.filter(user=request.user).first()

    @action(detail=False, methods=['get'])
    def status(self, request):
        team = self.get_team(request)
        if not team:
            return Response({'error': 'تیم یافت نشد'}, status=404)
        
        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        
        active_tasks = TeamTaskProgress.objects.filter(
            team=team,
            task__is_active=True
        ).select_related('task')

        levels = SeasonPassLevel.objects.all().order_by('level')

        return Response({
            'season_pass': TeamSeasonPassSerializer(pass_obj).data,
            'weekly_tasks': TeamTaskProgressSerializer(active_tasks, many=True).data,
            'levels': SeasonPassLevelSerializer(levels, many=True).data
        })

    @action(detail=False, methods=['post'], url_path='claim-task')
    def claim_task(self, request):
        team = self.get_team(request)
        if not team:
            return Response({'error': 'تیم یافت نشد'}, status=404)

        task_progress_id = request.data.get('task_progress_id')
        if not task_progress_id:
            return Response({'error': 'شناسه تسک نامعتبر است.'}, status=400)
            
        result = claim_task_reward(team, task_progress_id)
        if result['success']:
            return Response(result)
        return Response(result, status=400)

    @action(detail=False, methods=['post'], url_path='claim-level')
    def claim_level(self, request):
        team = self.get_team(request)
        if not team:
            return Response({'error': 'تیم یافت نشد'}, status=404)

        level = request.data.get('level')
        if not level:
            return Response({'error': 'سطح نامعتبر است.'}, status=400)

        result = claim_level_reward(team, level)
        if result['success']:
            return Response(result)
        return Response(result, status=400)
