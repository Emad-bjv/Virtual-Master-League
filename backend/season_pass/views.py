from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from .models import TeamTaskProgress, SeasonPassLevel, TeamSeasonPass, WeeklyTask
from .serializers import TeamTaskProgressSerializer, SeasonPassLevelSerializer, TeamSeasonPassSerializer, WeeklyTaskSerializer
from .services import (
    claim_task_reward, claim_level_reward, auto_assign_unique_team_legends,
    seed_balanced_season_pass_levels, seed_season_weekly_tasks,
    XP_MATCH_WIN, XP_MATCH_DRAW, XP_MATCH_LOSS, XP_PER_TASK, TOTAL_SEASON_PASS_XP
)
from teams.models import Team, Player


import logging

logger = logging.getLogger(__name__)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin']
            )
        )


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
    @action(detail=False, methods=['get'], url_path='admin-overview', permission_classes=[IsAdminRole])
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

        try:
            auto_assign_unique_team_legends()
        except Exception as e:
            logger.exception("Failed to auto assign unique team legends: %s", e)

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

    @action(detail=False, methods=['post'], url_path='admin-seed-levels', permission_classes=[IsAdminRole])
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

    @action(detail=False, methods=['post'], url_path='admin-seed-tasks', permission_classes=[IsAdminRole])
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

    @action(detail=False, methods=['post'], url_path='admin-auto-assign-legends', permission_classes=[IsAdminRole])
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

    @action(detail=False, methods=['post'], url_path='admin-assign-legend', permission_classes=[IsAdminRole])
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

    @action(detail=False, methods=['post'], url_path='admin-save-level', permission_classes=[IsAdminRole])
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

    @action(detail=False, methods=['post'], url_path='admin-reset-team-pass', permission_classes=[IsAdminRole])
    def admin_reset_team_pass(self, request):
        """
        ریست کامل سیزن پس یک تیم خاص به سطح ۱ با ۰ XP و پاکسازی جوایز دریافت شده.
        """
        team_id = request.data.get('team_id')
        pass_id = request.data.get('pass_id') or request.data.get('id')

        team = None
        pass_obj = None

        if team_id:
            try:
                team = Team.objects.get(id=team_id)
                pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
            except Team.DoesNotExist:
                return Response({'error': 'تیم مورد نظر یافت نشد.'}, status=404)
        elif pass_id:
            try:
                pass_obj = TeamSeasonPass.objects.get(id=pass_id)
                team = pass_obj.team
            except TeamSeasonPass.DoesNotExist:
                return Response({'error': 'رکورد سیزن‌پس یافت نشد.'}, status=404)
        else:
            return Response({'error': 'شناسه تیم (team_id) یا سیزن‌پس الزامی است.'}, status=400)

        with transaction.atomic():
            # If the team had claimed the legend player and it is in team roster, release it
            if pass_obj.assigned_legend_player:
                legend = pass_obj.assigned_legend_player
                if legend.team_id == team.id:
                    legend.team = None
                    legend.save(update_fields=['team'])

            pass_obj.current_xp = 0
            pass_obj.current_level = 1
            pass_obj.is_vip = False
            pass_obj.claimed_levels = []
            pass_obj.claimed_vip_levels = []
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

    @action(detail=False, methods=['post'], url_path='purchase-vip')
    def purchase_vip(self, request):
        """
        خرید اشتراک مسیر ویژه VIP سیزن‌پس با ۷۵۰ الماس (جم).
        همچنین تمام جوایز VIP مراحلی که مربی قبلاً در این فصل باز کرده به صورت آنی اعطا می‌شوند.
        """
        team = self.get_team(request)
        if not team:
            return Response({'error': 'تیم شما یافت نشد.'}, status=404)

        from decimal import Decimal
        from economy.services import process_atomic_wallet_update
        from .services import auto_assign_unique_team_legends

        VIP_COST_GEMS = 750

        with transaction.atomic():
            pass_obj, _ = TeamSeasonPass.objects.select_for_update().get_or_create(team=team)
            if pass_obj.is_vip:
                return Response({'error': 'شما قبلاً اشتراک VIP این فصل را فعال کرده‌اید.'}, status=400)

            team.refresh_from_db()
            if team.gems < VIP_COST_GEMS:
                return Response({
                    'error': f'الماس کافی نیست. برای فعال‌سازی مسیر VIP به {VIP_COST_GEMS} جم نیاز دارید. (موجودی فعلی شما: {team.gems} جم)',
                    'required_gems': VIP_COST_GEMS,
                    'current_gems': team.gems
                }, status=400)

            wallet_res = process_atomic_wallet_update(
                team_id=team.id,
                amount=Decimal(str(-VIP_COST_GEMS)),
                currency='GEMS',
                transaction_type='STORE_PURCHASE',
                description="خرید اشتراک VIP سیزن‌پس"
            )
            if not wallet_res.get('success'):
                return Response({'error': wallet_res.get('error', 'خطا در کسر الماس.')}, status=400)

            pass_obj.is_vip = True

            # Retroactively claim all unlocked VIP levels
            unclaimed_vip_levels = SeasonPassLevel.objects.filter(
                level__lte=pass_obj.current_level
            ).order_by('level')

            if pass_obj.claimed_vip_levels is None:
                pass_obj.claimed_vip_levels = []

            total_bonus_coins = Decimal('0.00')
            total_bonus_gems = 0
            legend_reward = None

            for lvl_def in unclaimed_vip_levels:
                if lvl_def.level not in pass_obj.claimed_vip_levels:
                    if lvl_def.vip_reward_coins > 0:
                        process_atomic_wallet_update(
                            team_id=team.id,
                            amount=lvl_def.vip_reward_coins,
                            currency='BUDGET',
                            transaction_type='PRIZE',
                            description=f"پاداش دلاری VIP مرحله {lvl_def.level} سیزن‌پس"
                        )
                        total_bonus_coins += lvl_def.vip_reward_coins

                    if lvl_def.vip_reward_gems > 0:
                        process_atomic_wallet_update(
                            team_id=team.id,
                            amount=Decimal(lvl_def.vip_reward_gems),
                            currency='GEMS',
                            transaction_type='PRIZE',
                            description=f"پاداش جم VIP مرحله {lvl_def.level} سیزن‌پس"
                        )
                        total_bonus_gems += lvl_def.vip_reward_gems

                    # Final level legend if reached level 20
                    if lvl_def.is_final_level and not pass_obj.legend_claimed:
                        legend_player = pass_obj.assigned_legend_player
                        if not legend_player:
                            auto_assign_unique_team_legends()
                            pass_obj.refresh_from_db()
                            legend_player = pass_obj.assigned_legend_player

                        if legend_player:
                            legend_player.team = team
                            legend_player.save(update_fields=['team'])
                            pass_obj.legend_claimed = True
                            legend_reward = legend_player.name

                    pass_obj.claimed_vip_levels.append(lvl_def.level)

            pass_obj.save(update_fields=['is_vip', 'claimed_vip_levels', 'legend_claimed'])
            team.refresh_from_db()

        bonus_msg = ""
        if total_bonus_gems > 0 or total_bonus_coins > 0:
            bonus_msg = f" همچنین +{total_bonus_gems} 💎 و +${int(total_bonus_coins):,} USD پاداش مراحل قبل به حسابتان اضافه شد."

        return Response({
            'success': True,
            'message': f'مسیر ویژه VIP سیزن‌پس با موفقیت فعال شد!{bonus_msg}',
            'is_vip': True,
            'current_gems': team.gems,
            'bonus_coins': str(total_bonus_coins),
            'bonus_gems': total_bonus_gems,
            'legend_reward': legend_reward,
            'team_pass': TeamSeasonPassSerializer(pass_obj).data
        })

    @action(detail=False, methods=['post'], url_path='admin-reset-all-team-passes', permission_classes=[IsAdminRole])
    def admin_reset_all_team_passes(self, request):
        """
        ریست کامل سیزن پس تمام تیم‌های لیگ.
        """
        with transaction.atomic():
            team_passes = TeamSeasonPass.objects.all().select_related('assigned_legend_player', 'team')
            for tp in team_passes:
                if tp.assigned_legend_player and tp.assigned_legend_player.team_id == tp.team_id:
                    legend = tp.assigned_legend_player
                    legend.team = None
                    legend.save(update_fields=['team'])
                tp.current_xp = 0
                tp.current_level = 1
                tp.is_vip = False
                tp.claimed_levels = []
                tp.claimed_vip_levels = []
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

