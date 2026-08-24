from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import TeamTaskProgress, SeasonPassLevel, TeamSeasonPass, WeeklyTask
from .serializers import TeamTaskProgressSerializer, SeasonPassLevelSerializer, TeamSeasonPassSerializer, WeeklyTaskSerializer
from .services import (
    claim_task_reward, claim_level_reward, auto_assign_unique_team_legends,
    seed_balanced_season_pass_levels, seed_season_weekly_tasks,
    XP_MATCH_WIN, XP_MATCH_DRAW, XP_MATCH_LOSS, XP_PER_TASK, TOTAL_SEASON_PASS_XP
)
from teams.models import Team, Player


class SeasonPassViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_team(self, request):
        if hasattr(request.user, 'team') and request.user.team:
            return request.user.team
        return Team.objects.filter(manager=request.user).first()

    @action(detail=False, methods=['get'])
    def status(self, request):
        team = self.get_team(request)
        if not team:
            # Fallback to first team if admin or testing without assigned coach
            team = Team.objects.first()
            if not team:
                return Response({'error': 'تیم یافت نشد'}, status=404)

        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        
        # Auto-ensure unique legend assignment if missing
        if not pass_obj.assigned_legend_player:
            auto_assign_unique_team_legends()
            pass_obj.refresh_from_db()

        active_tasks = TeamTaskProgress.objects.filter(
            team=team,
            task__is_active=True
        ).select_related('task').order_by('task__week_number', 'task__id')

        levels = SeasonPassLevel.objects.all().order_by('level')

        # Auto-seed standard levels if empty
        if not levels.exists():
            seed_balanced_season_pass_levels()
            levels = SeasonPassLevel.objects.all().order_by('level')

        return Response({
            'season_pass': TeamSeasonPassSerializer(pass_obj).data,
            'weekly_tasks': TeamTaskProgressSerializer(active_tasks, many=True).data,
            'levels': SeasonPassLevelSerializer(levels, many=True).data,
            'xp_rates': {
                'win_xp': XP_MATCH_WIN,
                'draw_xp': XP_MATCH_DRAW,
                'loss_xp': XP_MATCH_LOSS,
                'task_xp': XP_PER_TASK,
                'total_xp': TOTAL_SEASON_PASS_XP,
                'target_completion_week': 17
            }
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
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='claim-level')
    def claim_level(self, request):
        team = self.get_team(request)
        if not team:
            return Response({'error': 'تیم یافت نشد'}, status=404)

        level = request.data.get('level')
        if not level:
            return Response({'error': 'سطح نامعتبر است.'}, status=400)

        result = claim_level_reward(team, int(level))
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

    # ─────────────────────────────────────────────────────────────────────────
    # ADMIN MANAGEMENT ENDPOINTS (ROLE: ADMIN ONLY)
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='admin-overview', permission_classes=[permissions.IsAdminUser])
    def admin_overview(self, request):
        """
        داشبورد مدیریتی ارشد سیزن پس و لجندهای اختصاصی تیم‌ها.
        """
        levels = SeasonPassLevel.objects.all().order_by('level')
        if not levels.exists():
            seed_balanced_season_pass_levels()
            levels = SeasonPassLevel.objects.all().order_by('level')

        # Ensure all teams have a SeasonPass row and a unique legend
        teams = Team.objects.all().order_by('id')
        for t in teams:
            TeamSeasonPass.objects.get_or_create(team=t)

        auto_assign_unique_team_legends()

        team_passes = TeamSeasonPass.objects.all().select_related('team', 'assigned_legend_player').order_by('team__id')
        tasks = WeeklyTask.objects.all().order_by('week_number', 'id')
        legend_players_pool = Player.objects.filter(rarity='LEGENDARY').order_by('name')

        return Response({
            'levels': SeasonPassLevelSerializer(levels, many=True).data,
            'team_passes': TeamSeasonPassSerializer(team_passes, many=True).data,
            'weekly_tasks': WeeklyTaskSerializer(tasks, many=True).data,
            'legend_players_pool': [
                {
                    'id': p.id,
                    'name': p.name,
                    'position': p.position,
                    'overall': p.overall,
                    'age': p.age,
                    'current_team_id': p.team_id,
                    'current_team_name': p.team.name if p.team else 'بدون تیم'
                }
                for p in legend_players_pool
            ],
            'xp_rates': {
                'win_xp': XP_MATCH_WIN,
                'draw_xp': XP_MATCH_DRAW,
                'loss_xp': XP_MATCH_LOSS,
                'task_xp': XP_PER_TASK,
                'total_xp': TOTAL_SEASON_PASS_XP,
                'target_completion_week': 17
            }
        })

    @action(detail=False, methods=['post'], url_path='admin-seed-levels', permission_classes=[permissions.IsAdminUser])
    def admin_seed_levels(self, request):
        """
        تنظیم مجدد مهندسی‌شده ۲۰ سطح صعودی سیزن پس با کلیک ادمین.
        """
        count = seed_balanced_season_pass_levels()
        levels = SeasonPassLevel.objects.all().order_by('level')
        return Response({
            'success': True,
            'message': f'{count} سطح استاندارد سیزن پس با موفقیت تنظیم شدند.',
            'levels': SeasonPassLevelSerializer(levels, many=True).data
        })

    @action(detail=False, methods=['post'], url_path='admin-seed-tasks', permission_classes=[permissions.IsAdminUser])
    def admin_seed_tasks(self, request):
        """
        تولید خودکار تسک‌های استاندارد فصل (هفته ۱ تا ۳۰).
        """
        count = seed_season_weekly_tasks()
        tasks = WeeklyTask.objects.all().order_by('week_number', 'id')
        return Response({
            'success': True,
            'message': f'{count} تسک فصلی با موفقیت تولید و بین تیم‌ها توزیع شدند.',
            'tasks': WeeklyTaskSerializer(tasks, many=True).data
        })

    @action(detail=False, methods=['post'], url_path='admin-auto-assign-legends', permission_classes=[permissions.IsAdminUser])
    def admin_auto_assign_legends(self, request):
        """
        تخصیص هوشمند و غیرتکراری بازیکنان لجند به تمام تیم‌های لیگ.
        """
        result = auto_assign_unique_team_legends()
        team_passes = TeamSeasonPass.objects.all().select_related('team', 'assigned_legend_player').order_by('team__id')
        return Response({
            **result,
            'team_passes': TeamSeasonPassSerializer(team_passes, many=True).data
        })

    @action(detail=False, methods=['post'], url_path='admin-assign-legend', permission_classes=[permissions.IsAdminUser])
    def admin_assign_legend(self, request):
        """
        انتساب دستی یا تغییر بازیکن لجند یک تیم خاص.
        بررسی عدم تکرار در میان سایر تیم‌ها به منظور جلوگیری از تعارض.
        """
        team_id = request.data.get('team_id')
        player_id = request.data.get('player_id')

        if not team_id or not player_id:
            return Response({'error': 'شناسه تیم و بازیکن لجند الزامی است.'}, status=400)

        try:
            team = Team.objects.get(id=team_id)
            player = Player.objects.get(id=player_id)
        except (Team.DoesNotExist, Player.DoesNotExist):
            return Response({'error': 'تیم یا بازیکن یافت نشد.'}, status=404)

        # Check if player is already assigned to another team
        conflict = TeamSeasonPass.objects.filter(assigned_legend_player=player).exclude(team=team).first()
        if conflict:
            return Response({
                'error': f'این بازیکن لجند قبلاً به تیم «{conflict.team.name}» اختصاص داده شده است. لطفاً بازیکن دیگری انتخاب کنید.'
            }, status=400)

        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        pass_obj.assigned_legend_player = player
        pass_obj.save(update_fields=['assigned_legend_player'])

        return Response({
            'success': True,
            'message': f'بازیکن لجند «{player.name}» با موفقیت برای تیم {team.name} ثبت شد.',
            'team_pass': TeamSeasonPassSerializer(pass_obj).data
        })

    @action(detail=False, methods=['post'], url_path='admin-save-level', permission_classes=[permissions.IsAdminUser])
    def admin_save_level(self, request):
        """
        ایجاد یا ویرایش پاداش یک سطح سیزن پس.
        """
        level_num = request.data.get('level')
        xp_required = request.data.get('xp_required')
        reward_title = request.data.get('reward_title', '')
        free_coins = request.data.get('free_reward_coins', 0)
        free_gems = request.data.get('free_reward_gems', 0)
        vip_coins = request.data.get('vip_reward_coins', 0)
        vip_gems = request.data.get('vip_reward_gems', 0)
        is_final = request.data.get('is_final_level', False)

        if not level_num or not xp_required:
            return Response({'error': 'شماره سطح و XP مورد نیاز الزامی است.'}, status=400)

        level_obj, created = SeasonPassLevel.objects.update_or_create(
            level=int(level_num),
            defaults={
                'xp_required': int(xp_required),
                'reward_title': reward_title,
                'free_reward_coins': Decimal(str(free_coins)),
                'free_reward_gems': int(free_gems),
                'vip_reward_coins': Decimal(str(vip_coins)),
                'vip_reward_gems': int(vip_gems),
                'vip_reward_player_rarity': 'LEGENDARY' if is_final else '',
                'is_final_level': bool(is_final)
            }
        )

        return Response({
            'success': True,
            'message': f'سطح {level_obj.level} با موفقیت ذخیره شد.',
            'level': SeasonPassLevelSerializer(level_obj).data
        })

    @action(detail=False, methods=['post'], url_path='admin-reset-team-pass', permission_classes=[permissions.IsAdminUser])
    def admin_reset_team_pass(self, request):
        """
        ریست کامل سیزن پس یک تیم خاص به سطح ۱ با ۰ XP و پاکسازی جوایز دریافت شده.
        """
        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'شناسه تیم (team_id) الزامی است.'}, status=400)

        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            return Response({'error': 'تیم مورد نظر یافت نشد.'}, status=404)

        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)

        # If the team had claimed the legend player and it is in team roster, release it
        if pass_obj.assigned_legend_player and pass_obj.assigned_legend_player.team == team:
            legend = pass_obj.assigned_legend_player
            legend.team = None
            legend.save(update_fields=['team'])

        pass_obj.current_xp = 0
        pass_obj.current_level = 1
        pass_obj.is_vip = False
        pass_obj.claimed_levels = []
        pass_obj.legend_claimed = False
        pass_obj.save()

        # Reset task progresses for this team
        TeamTaskProgress.objects.filter(team=team).update(
            current_value=0, is_completed=False, is_claimed=False
        )

        return Response({
            'success': True,
            'message': f'سیزن پس تیم «{team.name}» با موفقیت ریست شد.',
            'team_pass': TeamSeasonPassSerializer(pass_obj).data
        })

    @action(detail=False, methods=['post'], url_path='admin-reset-all-team-passes', permission_classes=[permissions.IsAdminUser])
    def admin_reset_all_team_passes(self, request):
        """
        ریست کامل سیزن پس تمام تیم‌های لیگ.
        """
        team_passes = TeamSeasonPass.objects.all()
        for tp in team_passes:
            if tp.assigned_legend_player and tp.assigned_legend_player.team == tp.team:
                legend = tp.assigned_legend_player
                legend.team = None
                legend.save(update_fields=['team'])
            tp.current_xp = 0
            tp.current_level = 1
            tp.is_vip = False
            tp.claimed_levels = []
            tp.legend_claimed = False
            tp.save()

        TeamTaskProgress.objects.all().update(
            current_value=0, is_completed=False, is_claimed=False
        )

        refreshed = TeamSeasonPass.objects.all().select_related('team', 'assigned_legend_player').order_by('team__id')
        return Response({
            'success': True,
            'message': 'سیزن پس تمام تیم‌های لیگ با موفقیت ریست شدند.',
            'team_passes': TeamSeasonPassSerializer(refreshed, many=True).data
        })

